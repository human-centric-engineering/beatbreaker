import { describe, expect, it } from 'vitest';

import { preferStyles, YOUR_STYLES_GROUP } from '@/lib/app/breaks/catalogue/prefer';
import type { CatalogueEntry, StudioCatalogue } from '@/lib/app/breaks/catalogue/types';
import { testStyle } from '@/tests/helpers/catalogue';

/**
 * `preferStyles` (Phase 7B, task 7B.8): reorders a `StudioCatalogue` around a
 * drummer's chosen styles without querying anything — pure, and a copy, since
 * the catalogue it is given is the one memoised for everyone else too.
 *
 * @see lib/app/breaks/catalogue/prefer.ts
 */

function entry(over: Partial<CatalogueEntry> & { id: string; styleKey: string }): CatalogueEntry {
  return {
    group: 'Famous breaks',
    title: over.id,
    artist: 'Someone',
    note: null,
    bpm: 100,
    styleVersionId: null,
    meter: '4/4',
    doc: { bars: [] } as unknown as CatalogueEntry['doc'],
    ...over,
  };
}

function catalogue(): StudioCatalogue {
  return {
    styles: {
      funk: testStyle('funk'),
      rock: testStyle('rock'),
      samba: testStyle('samba'),
    },
    styleGroups: [
      ['Funk and breaks', ['funk']],
      ['Rock and country', ['rock']],
      ['Afro-Latin', ['samba']],
    ],
    kits: {},
    kitGroups: [],
    libraries: [
      {
        key: 'lib1',
        title: 'Famous breaks',
        description: '',
        entries: [
          entry({ id: 'e1', styleKey: 'rock' }),
          entry({ id: 'e2', styleKey: 'funk' }),
          entry({ id: 'e3', styleKey: 'samba' }),
          entry({ id: 'e4', styleKey: 'funk' }),
        ],
      },
    ],
  };
}

describe('preferStyles', () => {
  it('puts a "Your styles" group first, in the order the styles were chosen', () => {
    const result = preferStyles(catalogue(), ['samba', 'funk']);
    expect(result.styleGroups[0]).toEqual([YOUR_STYLES_GROUP, ['samba', 'funk']]);
  });

  it('removes the chosen styles from their usual groups', () => {
    const result = preferStyles(catalogue(), ['samba']);
    const afroLatin = result.styleGroups.find(([heading]) => heading === 'Afro-Latin');
    expect(afroLatin).toBeUndefined();
    // funk and rock are untouched, in their own groups
    expect(result.styleGroups).toContainEqual(['Funk and breaks', ['funk']]);
    expect(result.styleGroups).toContainEqual(['Rock and country', ['rock']]);
  });

  it('drops a group left with nothing once your styles are pulled out of it', () => {
    const result = preferStyles(catalogue(), ['funk', 'rock', 'samba']);
    // only "Your styles" remains — every original group emptied out
    expect(result.styleGroups).toEqual([[YOUR_STYLES_GROUP, ['funk', 'rock', 'samba']]]);
  });

  it('ignores a preferred key the catalogue does not have', () => {
    const result = preferStyles(catalogue(), ['not-a-real-style', 'funk']);
    expect(result.styleGroups[0]).toEqual([YOUR_STYLES_GROUP, ['funk']]);
  });

  it('returns the same object when nothing is preferred', () => {
    const cat = catalogue();
    expect(preferStyles(cat, [])).toBe(cat);
  });

  it('returns the same object when every preferred key is unknown to the catalogue', () => {
    const cat = catalogue();
    expect(preferStyles(cat, ['not-a-real-style'])).toBe(cat);
  });

  it('does not mutate the catalogue it was given', () => {
    const cat = catalogue();
    const snapshot = JSON.parse(
      JSON.stringify({ styleGroups: cat.styleGroups, libraries: cat.libraries })
    );

    preferStyles(cat, ['samba', 'funk']);

    expect(cat.styleGroups).toEqual(snapshot.styleGroups);
    expect(JSON.parse(JSON.stringify(cat.libraries))).toEqual(snapshot.libraries);
  });

  it('lists library entries of your styles first, the rest keeping their order', () => {
    const result = preferStyles(catalogue(), ['samba']);
    expect(result.libraries[0].entries.map((e) => e.id)).toEqual(['e3', 'e1', 'e2', 'e4']);
  });

  it('keeps entries of more than one preferred style in the entries’ own order, not the styles’ order', () => {
    const result = preferStyles(catalogue(), ['samba', 'funk']);
    // funk (e2, e4) and samba (e3) both move up; among the movers, their
    // original relative order is kept — this is not a sort by which style was
    // chosen first
    expect(result.libraries[0].entries.map((e) => e.id)).toEqual(['e2', 'e3', 'e4', 'e1']);
  });
});
