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

import { amp, loudness, mix, RATE, trimHit } from '@/scripts/kits/dsp';
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
import { SOURCES, type SourceId } from '@/scripts/kits/sources';

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

interface SlotOut {
  layers: Array<{ v: number; files: string[] }>;
  trim?: number;
}

interface PackLock {
  files: Record<string, { sha256: string; bytes: number; seconds: number }>;
}

interface Lock {
  ffmpeg: string;
  sources: Record<string, { repo: string; commit: string; files: Record<string, string> }>;
  packs: Record<string, PackLock>;
}

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
      tree = await treeOf(SOURCES[id]);
      this.trees.set(id, tree);
    }
    return tree;
  }

  /** Fetch and remember a source file, returning its local path. */
  private async file(id: SourceId, path: string): Promise<string> {
    const local = await fetchFile(SOURCES[id], await this.tree(id), path);
    let files = this.used.get(id);
    if (!files) this.used.set(id, (files = new Map<string, string>()));
    files.set(path, sha256(readFileSync(local)));
    return local;
  }

  /** Every candidate stroke of a pick: mixed, trimmed and measured. */
  async measure(pick: Pick, role: Role): Promise<Map<string, { pcm: Float32Array; db: number }>> {
    const tree = await this.tree(pick.source);
    const found = candidates([...tree.keys()], pick.pattern, pick.mics, pick.exclude);
    if (!found.length) throw new Error(`${pick.source}: nothing matches ${pick.pattern}`);
    const hits = await mapLimit(found, 8, async (c) => {
      const inputs = await Promise.all(
        c.files.map(async (f) => ({
          pcm: await decode(await this.file(pick.source, f.path)),
          weight: f.weight,
        }))
      );
      const pcm = trimHit(mix(inputs), pick.tail ?? ROLE_TAIL_CAP[role]);
      return [c.id, { pcm, db: loudness(pcm) }] as const;
    });
    return new Map(hits);
  }

  /** Choose, encode and describe one slot. Returns the slot and its loudest layer's level. */
  async slot(
    pack: string,
    slotId: string,
    pick: Pick,
    role: Role,
    lock: PackLock
  ): Promise<{ slot: SlotOut; topDb: number }> {
    const measured = await this.measure(pick, role);
    const list: Measured[] = [...measured].map(([id, m]) => ({ id, db: m.db }));
    const chosen = chooseLayers(list, pick.layers, pick.rr, pick.range);
    if (!chosen.length) throw new Error(`${pack}/${slotId}: no layers chosen`);
    const vs = layerVelocities(chosen);
    const layers: SlotOut['layers'] = [];
    for (const [li, layer] of chosen.entries()) {
      const files: string[] = [];
      for (const [ri, id] of layer.ids.entries()) {
        const name = `${slotId}-${li}-${ri}.m4a`;
        const pcm = measured.get(id)?.pcm;
        if (!pcm) throw new Error(`${pack}/${slotId}: lost ${id}`);
        const out = join(KITS, pack, name);
        await encode(pcm, out);
        const bytes = readFileSync(out);
        lock.files[name] = {
          sha256: sha256(bytes),
          bytes: bytes.length,
          seconds: round(pcm.length / RATE, 3),
        };
        files.push(name);
      }
      layers.push({ v: vs[li], files });
    }
    return { slot: { layers }, topDb: chosen[chosen.length - 1].db };
  }

  async pack(recipe: Recipe): Promise<{ entry: Record<string, unknown>; lock: PackLock }> {
    const dir = join(KITS, recipe.pack);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const lock: PackLock = { files: {} };

    const slots: Record<string, SlotOut> = {};
    for (const piece of recipe.pieces) {
      let trim: number | undefined;
      for (const [slotId, pick] of Object.entries(piece.slots)) {
        const { slot, topDb } = await this.slot(recipe.pack, slotId, pick, piece.role, lock);
        // matched on the piece's first slot, and the same for all of its slots
        trim ??= round(Math.min(4, amp(REFERENCE_DB + ROLE_TARGET_DB[piece.role] - topDb)), 3);
        slots[slotId] = { ...slot, trim };
        console.log(
          `  ${recipe.pack}/${slotId}: ${slot.layers.map((l) => l.files.length).join('·')} takes, trim ${trim}`
        );
      }
    }

    let perc: Record<string, SlotOut> | undefined;
    if (recipe.perc) {
      perc = {};
      for (const [inst, { stroke, accent }] of Object.entries(recipe.perc)) {
        const a = await this.slot(recipe.pack, `perc-${inst}-a`, stroke, 'perc', lock);
        const b = await this.slot(recipe.pack, `perc-${inst}-b`, accent, 'perc', lock);
        // two strokes, not two strengths: percHit reads the first layer and
        // the second, and never their velocities
        perc[inst] = {
          layers: [
            { v: 1, files: a.slot.layers.flatMap((l) => l.files) },
            { v: 1, files: b.slot.layers.flatMap((l) => l.files) },
          ],
          trim: round(Math.min(4, amp(REFERENCE_DB + ROLE_TARGET_DB.perc - a.topDb)), 3),
        };
      }
    }

    return { entry: { sampleRate: RATE, slots, ...(perc ? { perc } : {}) }, lock };
  }

  sourcesLock(previous: Lock['sources']): Lock['sources'] {
    const out: Lock['sources'] = { ...previous };
    for (const [id, files] of this.used) {
      const source = SOURCES[id];
      const prior = previous[id]?.commit === source.commit ? previous[id].files : {};
      out[id] = {
        repo: source.repo,
        commit: source.commit,
        files: { ...prior, ...Object.fromEntries(files) },
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
        `Licence: ${source.licence}, read from ${source.repo}@${source.commit}/${source.licenceFile} on ${source.checked}.`,
        '',
        '---',
        '',
      ].join('\n');
      writeFileSync(join(dir, `${id}.txt`), head + text);
    }
  }
}

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
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

  const manifest = readJson<Record<string, unknown>>(MANIFEST, {});
  const lock = readJson<Lock>(LOCK, { ffmpeg, sources: {}, packs: {} });
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
