/**
 * The shipped sample packs.
 *
 * These are binary files under `public/`, referenced by name from a manifest
 * that `scripts/kits/build.ts` writes (Phase 9). Nothing type-checks that
 * relationship, and the failure mode is quiet: a renamed or dropped file makes
 * one lane of one kit silently fall through to the synthesised voice, which
 * sounds like a kit that is simply not very good rather than like a bug.
 *
 * The catalogue seed reads `public/kits/manifest.json` into each pack kit's
 * `samples` column, so a file named but not shipped is baked into a row.
 *
 * CI never runs the build — it needs ffmpeg and gigabytes of sources. It
 * checks what the build wrote: the files match the manifest and the lock,
 * every source has its licence and its credit, and every kit is inside
 * `sound-plan.md` §9's budgets.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { KIT_CREDITS } from '@/lib/app/breaks/kit-credits.generated';
import { type KitSampleSlot, SLOT_BY_ID, slotFiles, slotLayers } from '@/lib/app/breaks/kit';
import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import { SOURCES } from '@/scripts/kits/sources';

const ROOT = join(process.cwd(), 'public/kits');

interface Entry {
  sampleRate: number;
  slots: Record<string, KitSampleSlot>;
  perc?: Record<string, KitSampleSlot>;
}

interface Lock {
  ffmpeg: string;
  sources: Record<
    string,
    | { repo: string; commit: string; files: Record<string, string> }
    | { archive: string; sha256: string; files: Record<string, string> }
  >;
  packs: Record<
    string,
    { files: Record<string, { sha256: string; bytes: number; seconds: number }> }
  >;
}

const manifest: Record<string, Entry> = JSON.parse(
  readFileSync(join(ROOT, 'manifest.json'), 'utf8')
) as Record<string, Entry>;

const lock: Lock = JSON.parse(
  readFileSync(join(process.cwd(), 'scripts/kits/build-lock.generated.json'), 'utf8')
) as Lock;

/** Recorded once per sound: one-shots, with no second take to rotate to. */
const ONE_SHOT_PACKS = new Set(['vintage', 'trap']);

const MB = 1_000_000;
/** `sound-plan.md` §9. */
const BUDGET = {
  perKit: 3 * MB,
  firstLoad: 0.8 * MB,
  decodedPerKit: 32 * MB,
  all: 45 * MB,
};

const packDirs = readdirSync(ROOT).filter(
  (f) => f !== 'LICENSES' && statSync(join(ROOT, f)).isDirectory()
);

describe('shipped sample packs', () => {
  it('has a pack for every kit that names one', () => {
    const wanted = Object.values(KITS)
      .filter((k) => k.engine === 'pack')
      .map((k) => k.pack);
    expect(wanted.length).toBeGreaterThan(0);
    for (const pack of wanted) expect(Object.keys(manifest)).toContain(pack);
  });

  it('ships every file the manifest names, and none that it does not', () => {
    for (const [pack, entry] of Object.entries(manifest)) {
      const named = new Set<string>();
      for (const group of [entry.slots, entry.perc ?? {}]) {
        for (const spec of Object.values(group)) for (const f of slotFiles(spec)) named.add(f);
      }

      const onDisk = new Set(readdirSync(join(ROOT, pack)));
      const missing = [...named].filter((f) => !onDisk.has(f));
      const orphan = [...onDisk].filter((f) => !named.has(f));

      expect(missing, `${pack}: named in the manifest but not shipped`).toEqual([]);
      expect(orphan, `${pack}: shipped but named by nothing`).toEqual([]);
    }
  });

  it('ships files with audio in them', () => {
    for (const [pack, entry] of Object.entries(manifest)) {
      for (const [slot, spec] of Object.entries(entry.slots)) {
        for (const file of slotFiles(spec)) {
          const path = join(ROOT, pack, file);
          expect(existsSync(path)).toBe(true);
          // an empty or truncated mp3 decodes to silence, which is a lane that
          // simply never sounds — worse than an error, because nothing says so
          expect(statSync(path).size, `${pack}/${slot} ${file}`).toBeGreaterThan(512);
        }
      }
    }
  });

  it('has no folder the manifest does not name', () => {
    expect(packDirs.sort()).toEqual(Object.keys(manifest).sort());
  });

  it('names its files for what they are (A11)', () => {
    for (const [pack, entry] of Object.entries(manifest)) {
      for (const group of [entry.slots, entry.perc ?? {}]) {
        for (const spec of Object.values(group)) {
          for (const f of slotFiles(spec)) expect(f, pack).toMatch(/^[A-Za-z0-9-]+\.m4a$/);
        }
      }
    }
  });

  it('fills only slots the kit vocabulary knows', () => {
    for (const [pack, entry] of Object.entries(manifest)) {
      for (const slot of Object.keys(entry.slots))
        expect(SLOT_BY_ID[slot], `${pack}/${slot}`).toBeDefined();
    }
  });

  it('gives every slot rising velocities that reach full', () => {
    for (const [pack, entry] of Object.entries(manifest)) {
      for (const [slot, spec] of Object.entries(entry.slots)) {
        const v = slotLayers(spec).map((l) => l.v);
        // layers are picked by "the first one at or above this velocity", which
        // needs them in order
        for (let i = 1; i < v.length; i++)
          expect(v[i], `${pack}/${slot}`).toBeGreaterThan(v[i - 1]);
        expect(v[v.length - 1], `${pack}/${slot} never reaches full velocity`).toBe(1);
      }
    }
  });

  it('gives every hat, snare and ride at least two takes a layer, so a run of them is not one sample', () => {
    for (const [pack, entry] of Object.entries(manifest)) {
      if (ONE_SHOT_PACKS.has(pack)) continue;
      for (const slot of ['h', 's', 'r']) {
        const spec = entry.slots[slot];
        expect(spec, `${pack}/${slot}`).toBeDefined();
        for (const layer of slotLayers(spec))
          expect(layer.files.length, `${pack}/${slot}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('carries the recorded percussion the styles reach for', () => {
    // percussion is shared across kits, and loads from whichever pack ships it
    const withPerc = Object.entries(manifest).filter(([, e]) => e.perc);
    expect(withPerc.length).toBe(1);
    const [, entry] = withPerc[0];
    expect(Object.keys(entry.perc ?? {}).length).toBeGreaterThanOrEqual(9);
  });
});

describe('the build lock', () => {
  it('lists every shipped file with the hash and size it has on disk', () => {
    for (const [pack, entry] of Object.entries(manifest)) {
      const files = lock.packs[pack]?.files;
      expect(files, pack).toBeDefined();
      const named = [entry.slots, entry.perc ?? {}].flatMap((g) =>
        Object.values(g).flatMap(slotFiles)
      );
      expect(Object.keys(files ?? {}).sort(), pack).toEqual([...new Set(named)].sort());
      for (const [name, f] of Object.entries(files ?? {})) {
        const bytes = readFileSync(join(ROOT, pack, name));
        expect(bytes.length, `${pack}/${name}`).toBe(f.bytes);
        expect(createHash('sha256').update(bytes).digest('hex'), `${pack}/${name}`).toBe(f.sha256);
      }
    }
  });

  it('pins every source it used where sources.ts pins it', () => {
    for (const [id, used] of Object.entries(lock.sources)) {
      const source = SOURCES[id as keyof typeof SOURCES];
      expect(source, id).toBeDefined();
      if (source.kind !== 'git') {
        expect(used, id).toMatchObject({ archive: source.archive, sha256: source.sha256 });
      } else {
        expect(used, id).toMatchObject({ repo: source.repo, commit: source.commit });
      }
      expect(Object.keys(used.files).length, id).toBeGreaterThan(0);
    }
  });
});

describe('licences and credits', () => {
  const used = Object.keys(lock.sources);

  it('quotes the grant above a licence file the author has since replaced', () => {
    for (const id of used) {
      const source = SOURCES[id as keyof typeof SOURCES];
      if (!('grant' in source)) continue;
      const text = readFileSync(join(ROOT, 'LICENSES', `${id}.txt`), 'utf8');
      const [head] = text.split('\n---\n');
      expect(head, id).toContain(source.grant.quote);
      expect(head, id).toContain(source.grant.at);
    }
  });

  it("ships each source's own licence file", () => {
    expect(used.length).toBeGreaterThan(0);
    for (const id of used) {
      const path = join(ROOT, 'LICENSES', `${id}.txt`);
      expect(existsSync(path), id).toBe(true);
      expect(statSync(path).size, id).toBeGreaterThan(200);
    }
    expect(readdirSync(join(ROOT, 'LICENSES')).sort()).toEqual(
      used.map((id) => `${id}.txt`).sort()
    );
  });

  it('credits every source, in the app and in the README', () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');
    expect(KIT_CREDITS.map((c) => c.id).sort()).toEqual([...used].sort());
    for (const id of used) {
      const source = SOURCES[id as keyof typeof SOURCES];
      expect(readme, id).toContain(`[${source.title}](${source.url})`);
    }
  });

  it("prints DrumGizmo's required line once, where a DrumGizmo kit is used", () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');
    expect(readme.split('Drum samples provided by DrumGizmo.org.').length - 1).toBe(1);
  });
});

describe('budgets (sound-plan.md §9)', () => {
  const bytesOf = (pack: string, files: string[]): number =>
    files.reduce((sum, f) => sum + (lock.packs[pack]?.files[f]?.bytes ?? 0), 0);

  it.each(Object.keys(manifest))(
    '%s downloads no more than 3 MB, all takes of all slots',
    (pack) => {
      const files = Object.values(manifest[pack].slots).flatMap(slotFiles);
      expect(bytesOf(pack, files)).toBeLessThanOrEqual(BUDGET.perKit);
    }
  );

  it.each(Object.keys(manifest))('%s can play after 0.8 MB: one take of each layer', (pack) => {
    // an articulation (`late`) decodes in the idle pass, with the other takes
    const first = Object.entries(manifest[pack].slots)
      .filter(([slot]) => !SLOT_BY_ID[slot]?.late)
      .flatMap(([, spec]) => slotLayers(spec).map((l) => l.files[0]));
    expect(bytesOf(pack, first)).toBeLessThanOrEqual(BUDGET.firstLoad);
  });

  it.each(Object.keys(manifest))('%s decodes to no more than 32 MB', (pack) => {
    const seconds = Object.values(manifest[pack].slots)
      .flatMap(slotFiles)
      .reduce((sum, f) => sum + (lock.packs[pack]?.files[f]?.seconds ?? 0), 0);
    // Float32 at 44.1 kHz, which is what decodeAudioData gives back
    expect(seconds * 44100 * 4).toBeLessThanOrEqual(BUDGET.decodedPerKit);
  });

  it('keeps public/kits under 45 MB', () => {
    const total = Object.values(lock.packs).reduce(
      (sum, p) => sum + Object.values(p.files).reduce((t, f) => t + f.bytes, 0),
      0
    );
    expect(total).toBeLessThanOrEqual(BUDGET.all);
  });
});
