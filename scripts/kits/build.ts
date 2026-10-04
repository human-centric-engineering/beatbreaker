/**
 * Build the recorded kits from their pinned sources.
 *
 *   npm run kits:build            every pack
 *   npm run kits:build -- brush   one pack (the others are left as they are)
 *
 * Needs `ffmpeg` on the PATH (`brew install ffmpeg`) and the network the first
 * time; sources are cached in `.kit-sources/`. Never run in CI: CI checks
 * what this wrote (`tests/unit/lib/app/breaks/kit-packs.test.ts`).
 *
 * For each slot of each recipe it fetches every candidate stroke, mixes its
 * mics to mono, trims it, measures it, chooses the layers and takes by
 * loudness, and encodes them. Then it writes:
 *
 * - `public/kits/<pack>/<slot>-<layer>-<take>.m4a`
 * - `public/kits/manifest.json` — the slot maps the catalogue seed reads
 * - `scripts/kits/build-lock.generated.json` — every source file's and output file's
 *   sha256, and each output's bytes and length, for the budget tests
 * - `public/kits/LICENSES/<source>.txt` — each source's own licence file
 * - the credits: `lib/app/breaks/kit-credits.generated.ts` and the README's block
 *
 * Nothing it writes carries a time, and everything is written in a fixed
 * order, so building twice from the same sources with the same ffmpeg writes
 * the same bytes.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import { channelsOf, instrumentOf, panFilter } from '@/scripts/kits/drumgizmo';
import {
  amp,
  loudness,
  mix,
  peakOf,
  RATE,
  splitGain,
  TRIM_CEILING,
  trimHit,
} from '@/scripts/kits/dsp';
import { decode, encode, ffmpegVersion } from '@/scripts/kits/ffmpeg';
import { fetchFile, mapLimit, sha256, treeOf } from '@/scripts/kits/fetch';
import { candidates } from '@/scripts/kits/pattern';
import { RECIPES } from '@/scripts/kits/recipes';
import {
  ROLE_TAIL_CAP,
  ROLE_TARGET_DB,
  type Pick,
  type Recipe,
  type Role,
} from '@/scripts/kits/recipe';
import { chooseLayers, layerVelocities, type Measured } from '@/scripts/kits/select';
import {
  renderCreditsModule,
  renderReadmeCredits,
  README_END,
  README_START,
} from '@/scripts/kits/credits';
import { pinOf, SOURCES, type SourceId } from '@/scripts/kits/sources';
import { zipFile, zipTree } from '@/scripts/kits/zip';

const ROOT = process.cwd();
const KITS = join(ROOT, 'public/kits');
const MANIFEST = join(KITS, 'manifest.json');
const LOCK = join(ROOT, 'scripts/kits/build-lock.generated.json');

/**
 * The level a kick or snare's loudest layer is brought to, in dB K-weighted
 * RMS (`dsp.ts`'s `loudness`), with the kit's own `trim` at 1. It is where
 * the five packs played before the re-cut: each one's snare, as encoded,
 * times its `kit.trim`: −16.8 to −13.5 dB, median −15.2, measured 2026-10-04. So a
 * re-cut kit is as loud as it was, and its `trim` row becomes 1.
 */
const REFERENCE_DB = -15.2;

/** One slot's chosen takes, layer by layer, before they are encoded. */
interface Choice {
  slotId: string;
  /** Each layer's takes, softest layer first. */
  pcm: Float32Array[][];
  vs: number[];
  /** The loudest layer's level, which the piece's trim is matched on. */
  topDb: number;
  /** The loudest sample among all the takes. */
  peak: number;
}

interface SlotOut {
  layers: Array<{ v: number; files: string[] }>;
  trim?: number;
}

const packLockSchema = z.object({
  files: z.record(
    z.string(),
    z.object({ sha256: z.string(), bytes: z.number(), seconds: z.number() })
  ),
});

/** Each source file used, path → sha256, under the pin it was fetched at. */
const sourceLockSchema = z.union([
  z.object({ repo: z.string(), commit: z.string(), files: z.record(z.string(), z.string()) }),
  z.object({ archive: z.string(), sha256: z.string(), files: z.record(z.string(), z.string()) }),
]);

/** The build lock, as this script writes it; read back through the schema. */
const lockSchema = z.object({
  ffmpeg: z.string(),
  sources: z.record(z.string(), sourceLockSchema),
  packs: z.record(z.string(), packLockSchema),
});

/** The manifest: one entry per pack, each rewritten whole by the pack it names. */
const manifestSchema = z.record(z.string(), z.unknown());

type PackLock = z.infer<typeof packLockSchema>;
type Lock = z.infer<typeof lockSchema>;

const round = (x: number, places: number): number => Math.round(x * 10 ** places) / 10 ** places;

/** Sort an object's keys, all the way down, so the JSON is the same every time. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, stable((value as Record<string, unknown>)[k])])
    );
  }
  return value;
}

class Builder {
  private readonly used = new Map<SourceId, Map<string, string>>();
  private readonly trees = new Map<SourceId, Map<string, string>>();

  private async tree(id: SourceId): Promise<Map<string, string>> {
    let tree = this.trees.get(id);
    if (!tree) {
      const source = SOURCES[id];
      tree = source.kind === 'zip' ? await zipTree(source) : await treeOf(source);
      this.trees.set(id, tree);
    }
    return tree;
  }

  /** Fetch and remember a source file, returning its local path. */
  private async file(id: SourceId, path: string): Promise<string> {
    const source = SOURCES[id];
    const local =
      source.kind === 'zip'
        ? await zipFile(source, path)
        : await fetchFile(source, await this.tree(id), path);
    let files = this.used.get(id);
    if (!files) this.used.set(id, (files = new Map<string, string>()));
    files.set(path, sha256(readFileSync(local)));
    return local;
  }

  /** The `pan` filter that mixes a DrumGizmo stroke's mics, from its instrument file. */
  private async channelFilter(pick: Pick, path: string): Promise<string | undefined> {
    if (!pick.channels) return undefined;
    const { xml, file } = instrumentOf(path);
    const text = readFileSync(await this.file(pick.source, xml), 'utf8');
    return panFilter(pick.channels, channelsOf(text, file));
  }

  /** Every candidate stroke of a pick: mixed, trimmed and measured. */
  async measure(pick: Pick, role: Role): Promise<Map<string, { pcm: Float32Array; db: number }>> {
    const tree = await this.tree(pick.source);
    const found = candidates([...tree.keys()], pick.pattern, pick.mics, pick.exclude);
    if (!found.length) throw new Error(`${pick.source}: nothing matches ${pick.pattern}`);
    const hits = await mapLimit(found, 8, async (c) => {
      const inputs = await Promise.all(
        c.files.map(async (f) => ({
          pcm: await decode(
            await this.file(pick.source, f.path),
            await this.channelFilter(pick, f.path)
          ),
          weight: f.weight,
        }))
      );
      const pcm = trimHit(mix(inputs), pick.tail ?? ROLE_TAIL_CAP[role]);
      return [c.id, { pcm, db: loudness(pcm) }] as const;
    });
    return new Map(hits);
  }

  /** Measure a slot's candidates and choose its layers and takes. */
  async choose(slotId: string, pick: Pick, role: Role): Promise<Choice> {
    const measured = await this.measure(pick, role);
    const list: Measured[] = [...measured].map(([id, m]) => ({ id, db: m.db }));
    const chosen = chooseLayers(list, pick.layers, pick.rr, pick.range);
    if (!chosen.length) throw new Error(`${slotId}: no layers chosen`);
    const pcm = chosen.map((layer) =>
      layer.ids.map((id) => {
        const hit = measured.get(id)?.pcm;
        if (!hit) throw new Error(`${slotId}: lost ${id}`);
        return hit;
      })
    );
    return {
      slotId,
      pcm,
      vs: layerVelocities(chosen),
      topDb: chosen[chosen.length - 1].db,
      peak: Math.max(...pcm.flat().map(peakOf)),
    };
  }

  /** Encode a chosen slot, every sample turned up by `bake`, and describe it. */
  async write(pack: string, choice: Choice, bake: number, lock: PackLock): Promise<SlotOut> {
    const layers: SlotOut['layers'] = [];
    for (const [li, takes] of choice.pcm.entries()) {
      const files: string[] = [];
      for (const [ri, hit] of takes.entries()) {
        const name = `${choice.slotId}-${li}-${ri}.m4a`;
        const out = join(KITS, pack, name);
        await encode(bake === 1 ? hit : hit.map((x) => x * bake), out);
        const bytes = readFileSync(out);
        lock.files[name] = {
          sha256: sha256(bytes),
          bytes: bytes.length,
          seconds: round(hit.length / RATE, 3),
        };
        files.push(name);
      }
      layers.push({ v: choice.vs[li], files });
    }
    return { layers };
  }

  async pack(recipe: Recipe): Promise<{ entry: Record<string, unknown>; lock: PackLock }> {
    const dir = join(KITS, recipe.pack);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const lock: PackLock = { files: {} };

    const slots: Record<string, SlotOut> = {};
    for (const piece of recipe.pieces) {
      const choices: Choice[] = [];
      for (const [slotId, pick] of Object.entries(piece.slots)) {
        choices.push(await this.choose(slotId, pick, piece.role));
      }
      // matched on the piece's first slot, or its matchOn, and the same for all of its slots
      const reference = piece.matchOn
        ? await this.choose('matchOn', piece.matchOn, piece.role)
        : choices[0];
      const needed = amp(REFERENCE_DB + ROLE_TARGET_DB[piece.role] - reference.topDb);
      const split = splitGain(needed, Math.max(...choices.map((c) => c.peak)));
      const trim = round(split.trim, 3);
      const bake = round(split.bake, 3);
      for (const choice of choices) {
        const slot = await this.write(recipe.pack, choice, bake, lock);
        slots[choice.slotId] = { ...slot, trim };
        console.log(
          `  ${recipe.pack}/${choice.slotId}: ${slot.layers.map((l) => l.files.length).join('·')} takes, trim ${trim}${bake > 1 ? `, baked ×${bake}` : ''}`
        );
      }
      if (needed > trim * bake * 1.01) {
        console.warn(
          `  ${recipe.pack}: ${piece.role} is ${round(20 * Math.log10(needed / (trim * bake)), 1)} dB under its level; its peak allows no more`
        );
      }
    }

    let perc: Record<string, SlotOut> | undefined;
    if (recipe.perc) {
      perc = {};
      for (const [inst, { stroke, accent }] of Object.entries(recipe.perc)) {
        const a = await this.choose(`perc-${inst}-a`, stroke, 'perc');
        const b = await this.choose(`perc-${inst}-b`, accent, 'perc');
        const aOut = await this.write(recipe.pack, a, 1, lock);
        const bOut = await this.write(recipe.pack, b, 1, lock);
        // two strokes, not two strengths: percHit reads the first layer and
        // the second, and never their velocities
        perc[inst] = {
          layers: [
            { v: 1, files: aOut.layers.flatMap((l) => l.files) },
            { v: 1, files: bOut.layers.flatMap((l) => l.files) },
          ],
          trim: round(Math.min(TRIM_CEILING, amp(REFERENCE_DB + ROLE_TARGET_DB.perc - a.topDb)), 3),
        };
      }
    }

    return { entry: { sampleRate: RATE, slots, ...(perc ? { perc } : {}) }, lock };
  }

  sourcesLock(previous: Lock['sources']): Lock['sources'] {
    const out: Lock['sources'] = { ...previous };
    for (const [id, files] of this.used) {
      const source = SOURCES[id];
      const before = previous[id];
      const kept = (same: boolean): Record<string, string> => ({
        // files fetched at an older pin are dropped, not carried
        ...(same && before ? before.files : {}),
        ...Object.fromEntries(files),
      });
      out[id] =
        source.kind === 'zip'
          ? {
              archive: source.archive,
              sha256: source.sha256,
              files: kept(!!before && 'sha256' in before && before.sha256 === source.sha256),
            }
          : {
              repo: source.repo,
              commit: source.commit,
              files: kept(!!before && 'commit' in before && before.commit === source.commit),
            };
    }
    return out;
  }

  /** Copy each used source's licence file, with where and when it was read. */
  async licences(ids: SourceId[]): Promise<void> {
    const dir = join(KITS, 'LICENSES');
    mkdirSync(dir, { recursive: true });
    for (const id of ids) {
      const source = SOURCES[id];
      const text = readFileSync(await this.file(id, source.licenceFile), 'utf8');
      const head = [
        `${source.title} — ${source.author}`,
        `${source.url}`,
        `Licence: ${source.licence}, read from ${source.kind === 'git' ? `${pinOf(source)}/${source.licenceFile}` : `${source.licenceFile} in ${pinOf(source)}`} on ${source.checked}.`,
        '',
        '---',
        '',
      ].join('\n');
      writeFileSync(join(dir, `${id}.txt`), head + text);
    }
  }
}

function readJson<T>(path: string, schema: z.ZodType<T>, fallback: T): T {
  return existsSync(path) ? schema.parse(JSON.parse(readFileSync(path, 'utf8'))) : fallback;
}

async function main(): Promise<void> {
  const ffmpeg = ffmpegVersion();
  if (!ffmpeg) {
    console.error('No ffmpeg on the PATH. `brew install ffmpeg`, then run this again.');
    process.exit(1);
  }

  const only = process.argv.slice(2);
  const recipes = only.length ? RECIPES.filter((r) => only.includes(r.pack)) : RECIPES;
  if (only.length && recipes.length !== only.length) {
    console.error(
      `Unknown pack in ${only.join(', ')}. Packs: ${RECIPES.map((r) => r.pack).join(', ')}`
    );
    process.exit(1);
  }

  const manifest = readJson(MANIFEST, manifestSchema, {});
  const lock = readJson(LOCK, lockSchema, { ffmpeg, sources: {}, packs: {} });
  const builder = new Builder();

  for (const recipe of recipes) {
    console.log(`${recipe.pack}`);
    const { entry, lock: packLock } = await builder.pack(recipe);
    manifest[recipe.pack] = entry;
    lock.packs[recipe.pack] = packLock;
  }

  // a source no recipe uses any more leaves the lock and the credits
  const live = new Set<SourceId>();
  for (const r of RECIPES) {
    for (const p of r.pieces) for (const pick of Object.values(p.slots)) live.add(pick.source);
    for (const p of Object.values(r.perc ?? {})) {
      live.add(p.stroke.source);
      live.add(p.accent.source);
    }
  }
  const ids = (Object.keys(SOURCES) as SourceId[]).filter((id) => live.has(id));
  await builder.licences(ids);

  lock.ffmpeg = ffmpeg;
  lock.sources = Object.fromEntries(
    Object.entries(builder.sourcesLock(lock.sources)).filter(([id]) => live.has(id as SourceId))
  );
  for (const file of readdirSync(join(KITS, 'LICENSES'))) {
    if (!ids.includes(file.replace(/\.txt$/, '') as SourceId)) rmSync(join(KITS, 'LICENSES', file));
  }

  // the manifest keeps the recipes' order; everything inside a pack is sorted
  const ordered = Object.fromEntries(
    RECIPES.filter((r) => manifest[r.pack]).map((r) => [r.pack, stable(manifest[r.pack])])
  );
  writeFileSync(MANIFEST, `${JSON.stringify(ordered, null, 2)}\n`);
  writeFileSync(LOCK, `${JSON.stringify(stable(lock), null, 2)}\n`);

  writeFileSync(join(ROOT, 'lib/app/breaks/kit-credits.generated.ts'), renderCreditsModule(ids));
  const readmePath = join(ROOT, 'README.md');
  const readme = readFileSync(readmePath, 'utf8');
  const a = readme.indexOf(README_START);
  const b = readme.indexOf(README_END);
  if (a < 0 || b < a) throw new Error(`README.md has no ${README_START} … ${README_END} block`);
  writeFileSync(
    readmePath,
    readme.slice(0, a) + renderReadmeCredits(ids) + readme.slice(b + README_END.length)
  );

  const total = Object.values(lock.packs).reduce(
    (s, p) => s + Object.values(p.files).reduce((t, f) => t + f.bytes, 0),
    0
  );
  console.log(
    `done: ${(total / 1e6).toFixed(2)} MB across ${Object.keys(lock.packs).length} packs`
  );
  console.log('Run `npm run format` for the README; nothing else it wrote is formatted.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
