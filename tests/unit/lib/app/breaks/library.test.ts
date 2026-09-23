/**
 * The famous-breaks library: 47 hand-written transcriptions. Nothing type-checks
 * a bar string against its meter, so a typo in one entry is a silently short bar
 * until something here reads it.
 *
 * The entries are seed data now (D13) rather than a table in `lib/`, and
 * `patternFromLibrary` takes the resolved style as an argument. Both are read
 * here the way the seed reads them — the same rows, through the new arguments —
 * so a transcription typo still fails here and not in production.
 */

import { describe, expect, it } from 'vitest';

import { libraryGroups } from '@/lib/app/breaks/catalogue/types';
import { playability } from '@/lib/app/breaks/critic';
import { engrave } from '@/lib/app/breaks/engrave';
import { LANES } from '@/lib/app/breaks/lanes';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testLibrary, testStyle } from '@/tests/helpers/catalogue';

const ENTRIES = LIBRARY.map((item, index) => ({
  item,
  index,
  pat: patternFromLibrary(item, index, STYLES[item.style] ? testStyle(item.style) : undefined),
}));

describe('the famous-breaks library', () => {
  it('has 47 entries — the number the site copy quotes', () => {
    expect(LIBRARY).toHaveLength(47);
    // and every one of them reaches the catalogue the picker is built from
    expect(testLibrary().entries).toHaveLength(47);
  });

  it('names only styles and meters that exist', () => {
    for (const { item } of ENTRIES) {
      expect(STYLES[item.style], item.title).toBeDefined();
      if (item.meter) expect(METERS[item.meter], item.title).toBeDefined();
    }
  });

  it('parses every entry at its own meter’s step count', () => {
    for (const { item, pat } of ENTRIES) {
      const n = stepsOf(meterOf(item.meter ?? '4/4'));
      expect(pat.bars, item.title).toHaveLength(item.bars.length);
      for (const bar of pat.bars)
        for (const L of LANES) expect(bar[L], `${item.title} ${L}`).toHaveLength(n);
    }
  });

  it('writes every bar string at exactly the meter’s length — no silently padded bars', () => {
    for (const { item } of ENTRIES) {
      const n = stepsOf(meterOf(item.meter ?? '4/4'));
      for (const spec of item.bars) {
        for (const [lane, row] of Object.entries(spec)) {
          if (typeof row === 'string') expect(row.length, `${item.title} ${lane}`).toBe(n);
        }
      }
    }
  });

  it('carries a tom or foot lane only when an entry writes one', () => {
    for (const { item, pat } of ENTRIES) {
      for (const L of ['t1', 't2', 't3', 'hf'] as const) {
        const written = item.bars.some((b) => b[L]);
        expect(pat.lanes.includes(L), `${item.title} ${L}`).toBe(written);
      }
    }
  });

  it('engraves every entry with one anchor per step', () => {
    for (const { item, pat } of ENTRIES) {
      const out = engrave(pat, null, { scale: 1, perSystem: 2 });
      expect(out.map, item.title).toHaveLength(pat.bars.length * out.steps);
      expect(
        out.map.every((a) => Number.isFinite(a.x) && Number.isFinite(a.y)),
        item.title
      ).toBe(true);
    }
  });

  it('passes the hard playability filter except for the four that are right to fail', () => {
    const failing = ENTRIES.filter(({ item, pat }) => !playability(pat, item.bpm).hard).map(
      ({ item }) => item.title
    );
    // Recorded in 2dfe42d6: Amen's backbeat really does walk late, and Good
    // Times Bad Times really is kick triplets at 140. A change to this list is
    // either a transcription edit or a critic change — either way, look.
    expect(failing).toEqual([
      'Amen, Brother',
      'Come Together',
      'Good Times Bad Times',
      'Walk This Way',
    ]);
  });

  it('groups every entry exactly once, in table order', () => {
    /* `libraryGroups` groups the catalogue's own entries now, so the position a
       row was seeded at is its index in `entries` rather than a field on it. */
    const library = testLibrary();
    const position = new Map(library.entries.map((entry, i) => [entry.id, i]));
    const indices = libraryGroups(library).flatMap(([, rows]) =>
      rows.map((r) => position.get(r.id) ?? -1)
    );
    expect(indices.slice().sort((a, b) => a - b)).toEqual(LIBRARY.map((_, i) => i));
  });
});
