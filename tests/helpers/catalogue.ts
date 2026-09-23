import { kitEngine } from '@/lib/app/breaks/kit';
import { kitGroups } from '@/lib/app/breaks/kit';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { packPattern } from '@/lib/app/breaks/share';
import type {
  CatalogueEntry,
  CatalogueKit,
  CatalogueLibrary,
  CatalogueStyle,
  StudioCatalogue,
} from '@/lib/app/breaks/catalogue/types';
import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { STYLES, STYLE_GROUPS } from '@/prisma/seeds/app-beatbreaker/data/styles';

/**
 * The catalogue, built from the seed data, for tests.
 *
 * Phase 2 moved styles, the famous breaks and the kits out of `lib/` and into
 * the database, seeded from `prisma/seeds/app-beatbreaker/data/`. The tests
 * follow them: this builds the same catalogue the seed writes, from the same
 * files, without a database.
 *
 * **That is deliberate, and it is what keeps the golden bytes honest.** The
 * generator, the critic, the engraver and the MIDI export all have tests that
 * assert exact output for a given style and seed. If the tests had moved to
 * hand-written fixture styles at the same moment the domain stopped importing
 * the real ones, those assertions would have quietly started testing something
 * else, and a real change in the style table would no longer show up. Feeding
 * the same data through the new arguments is the only version of this refactor
 * that the existing suite can actually check.
 *
 * What it does NOT do is read the database. A test that wants to know whether
 * the *seed* wrote the right rows is a different test.
 */

/** A stable, obviously-synthetic version id, so a test can assert provenance. */
function versionIdFor(key: string): string {
  return `sv-${key}-1`;
}

function shelfOf(key: string): string {
  for (const [group, keys] of STYLE_GROUPS) if (keys.includes(key)) return group;
  return 'Other';
}

/** One style, resolved at version 1 — what a fresh seed produces. */
export function testStyle(key: string): CatalogueStyle {
  const params = STYLES[key];
  if (!params) throw new Error(`No such style in the seed data: ${key}`);
  return { key, versionId: versionIdFor(key), version: 1, group: shelfOf(key), params };
}

export function testStyles(): Record<string, CatalogueStyle> {
  return Object.fromEntries(Object.keys(STYLES).map((key) => [key, testStyle(key)]));
}

/** Every style key in the seed data, in table order. */
export const TEST_STYLE_KEYS = Object.keys(STYLES);

export function testKit(key: string): CatalogueKit {
  const kit = KITS[key];
  if (!kit) throw new Error(`No such kit in the seed data: ${key}`);
  /* `engine` is pulled out to keep it out of `...params` — it is a column,
     not a parameter. `kitEngine` supplies the default for a row that names none. */
  const { label, hint, engine: _engine, credit, ...params } = kit;
  return {
    key,
    label,
    hint,
    engine: kitEngine(kit),
    credit,
    group: GROUP_LABELS[kitEngine(kit)],
    /* Empty rather than read from `public/kits/manifest.json`: a test that
       cares what is in a pack reads the manifest itself (kit-packs.test.ts
       does exactly that), and every other test is better off with a kit whose
       samples are plainly absent than with one that half-loads. */
    samples: {},
    ...params,
  };
}

export function testKits(): Record<string, CatalogueKit> {
  return Object.fromEntries(Object.keys(KITS).map((key) => [key, testKit(key)]));
}

const GROUP_LABELS: Record<string, string> = {
  synth: 'Synthesised',
  drift: 'Drum machines',
  pack: 'Recordings',
  user: 'Recordings',
};

/** The famous breaks, as documents — built exactly as the seed builds them. */
export function testLibrary(): CatalogueLibrary {
  const styles = testStyles();
  const entries: CatalogueEntry[] = LIBRARY.map((item, index) => {
    const style = styles[item.style];
    const doc = packPattern(patternFromLibrary(item, index, style));
    return {
      id: `entry-${index}`,
      group: item.group,
      title: item.title,
      artist: item.artist,
      note: item.note ?? null,
      bpm: item.bpm,
      styleKey: item.style,
      styleVersionId: style?.versionId ?? null,
      meter: doc.mt ?? '4/4',
      doc,
    };
  });
  return {
    key: 'famous-breaks',
    title: 'Famous breaks',
    description: 'The main groove off each record.',
    entries,
  };
}

export function testCatalogue(): StudioCatalogue {
  const styles = testStyles();
  const kits = testKits();
  return {
    styles,
    styleGroups: STYLE_GROUPS.map(([group, keys]): [string, string[]] => [
      group,
      keys.filter((k) => styles[k]),
    ]),
    kits,
    kitGroups: kitGroups(Object.values(kits)),
    libraries: [testLibrary()],
  };
}
