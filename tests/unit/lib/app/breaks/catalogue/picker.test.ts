/**
 * What the style picker shows and searches: entries built from the real
 * catalogue, and a search that every word typed has to match.
 */

import { describe, expect, it } from 'vitest';

import {
  drummerSection,
  entryCount,
  feelLabel,
  firstSentence,
  pickerSections,
  searchSection,
  spineOf,
  styleSection,
} from '@/lib/app/breaks/catalogue/picker';
import { testCatalogue } from '@/tests/helpers/catalogue';

const cat = testCatalogue();
const section = styleSection(cat.styles, cat.styleGroups, cat.kits);
const keysOf = (s: typeof section) => s.groups.flatMap(([, es]) => es.map((e) => e.key));

describe('firstSentence', () => {
  it('stops at the first full stop that ends a sentence', () => {
    expect(firstSentence('Sparse and heavy. Hats on 8ths.')).toBe('Sparse and heavy.');
    expect(firstSentence('Was it 1.5 bars? No.')).toBe('Was it 1.5 bars?');
  });

  it('keeps the whole text when there is no sentence end', () => {
    expect(firstSentence('  no stop at all  ')).toBe('no stop at all');
  });
});

describe('feelLabel', () => {
  const params = (key: string) => cat.styles[key].params;

  it('calls a style written in a compound meter triplets', () => {
    expect(feelLabel(params('swing'))).toBe('triplets');
  });

  it('reads a range as a shuffle when the 8ths swing, and as a swing when the 16ths do', () => {
    const [lo, hi] = params('rockabilly').swingRange ?? [0, 0];
    expect(feelLabel(params('rockabilly'))).toBe(`shuffle ${lo}–${hi}%`);
    const [flo, fhi] = params('funk').swingRange ?? [0, 0];
    expect(feelLabel(params('funk'))).toBe(`swing ${flo}–${fhi}%`);
  });

  it('calls no swing at all straight, and one value that value', () => {
    expect(feelLabel(params('metal'))).toBe('straight');
    expect(feelLabel({ ...params('funk'), swingRange: [0, 0] })).toBe('straight');
    expect(feelLabel({ ...params('funk'), swingRange: [12, 12] })).toBe('swing 12%');
    expect(feelLabel({ ...params('funk'), swingRange: undefined, swing: 9 })).toBe('swing 9%');
  });
});

const isDrummer = (key: string) => cat.styles[key]?.params.drummer === true;

describe('styleSection', () => {
  it('holds every style the catalogue groups, bar the drummers, in its groups and order', () => {
    const groups = cat.styleGroups
      .map(([g, keys]): [string, string[]] => [g, keys.filter((k) => !isDrummer(k))])
      .filter(([, keys]) => keys.length);
    expect(section.groups.map(([g]) => g)).toEqual(groups.map(([g]) => g));
    expect(keysOf(section)).toEqual(groups.flatMap(([, keys]) => keys));
    expect(entryCount(section)).toBe(Object.keys(cat.styles).filter((k) => !isDrummer(k)).length);
  });

  it('puts the meter, the tempo, the feel and the kit a style asks for on its card', () => {
    const bop = section.groups.flatMap(([, es]) => es).find((e) => e.key === 'hardbop');
    expect(bop?.meta).toEqual(['12/8', '195–300 bpm', 'triplets', cat.kits.virtuosity.label]);
    expect(bop?.blurb).toBe(firstSentence(cat.styles.hardbop.params.hint));
  });

  it('keeps a grouped key it has no row for, under the key, as the old list did', () => {
    const s = styleSection(cat.styles, [['Gone', ['nope']], ...cat.styleGroups], cat.kits);
    expect(s.groups[0]).toEqual([
      'Gone',
      [{ key: 'nope', label: 'nope', group: 'Gone', blurb: '', meta: [], haystack: 'nope' }],
    ]);
  });

  it('leaves out a group with nothing in it', () => {
    const s = styleSection(cat.styles, [['Empty', []], ...cat.styleGroups], cat.kits);
    expect(s.groups.map(([g]) => g)).not.toContain('Empty');
  });
});

describe('drummerSection', () => {
  const drummers = drummerSection(cat.styles, cat.styleGroups, cat.kits);

  it('holds the drummers, in their own groups, and nothing the Styles tab shows', () => {
    expect(drummers).not.toBeNull();
    expect(drummers?.id).toBe('drummers');
    expect(keysOf(drummers!)).toEqual(['mitchell', 'bonham', 'stubblefield', 'tonywilliams']);
    expect(drummers?.groups.map(([g]) => g)).toEqual([
      'Rock drummers',
      'Funk drummers',
      'Jazz drummers',
    ]);
    for (const key of keysOf(drummers!)) expect(keysOf(section)).not.toContain(key);
  });

  it("names both of a drummer's 4/4 grids on his card, sextuplets and sixteenths", () => {
    const bonzo = drummers?.groups.flatMap(([, es]) => es).find((e) => e.key === 'bonham');
    expect(bonzo?.label).toBe('John Bonham');
    expect(bonzo?.meta).toEqual([
      '4/4 sextuplets, 4/4',
      '70–178 bpm',
      '11 songs',
      'straight to swung',
      cat.kits.bigrusty.label,
    ]);
  });

  it("gives a drummer with songs every meter and tempo his songs play in, and finds him by a song's title", () => {
    const mitch = drummers?.groups.flatMap(([, es]) => es).find((e) => e.key === 'mitchell');
    expect(mitch?.label).toBe('Mitch Mitchell');
    expect(mitch?.meta).toEqual([
      '4/4, 9/8, 12/8',
      '56–225 bpm',
      '45 songs',
      'straight to swung',
      cat.kits.smdrums.label,
    ]);
    const found = searchSection(drummers!, 'manic depression');
    expect(found.groups.flatMap(([, es]) => es.map((e) => e.key))).toEqual(['mitchell']);
  });

  it('follows a drummer moved into Your styles, as a drummer', () => {
    const moved = drummerSection(
      cat.styles,
      [['Your styles', ['funk', 'bonham']], ...cat.styleGroups],
      cat.kits
    );
    expect(moved?.groups[0]).toEqual([
      'Your drummers',
      [expect.objectContaining({ key: 'bonham' })],
    ]);
  });

  it("calls a drummer filed under the seed's catch-all group Other drummers", () => {
    const other = drummerSection(cat.styles, [['Other', ['funk', 'mitchell']]], cat.kits);
    expect(other?.groups.map(([g]) => g)).toEqual(['Other drummers']);
    expect(styleSection(cat.styles, [['Other', ['funk', 'mitchell']]], cat.kits).groups).toEqual([
      ['Other', [expect.objectContaining({ key: 'funk' })]],
    ]);
  });

  it('files a drummer whose row did not load by its group, not under Styles', () => {
    const groups: Array<[string, string[]]> = [
      ['Funk', ['funk']],
      ['Rock drummers', ['ghostdrummer']],
    ];
    expect(keysOf(drummerSection(cat.styles, groups, cat.kits)!)).toEqual(['ghostdrummer']);
    expect(keysOf(styleSection(cat.styles, groups, cat.kits))).toEqual(['funk']);
  });

  it('is null when the catalogue has no drummers, and the picker shows Styles alone', () => {
    const none = cat.styleGroups.map(([g, keys]): [string, string[]] => [
      g,
      keys.filter((k) => !isDrummer(k)),
    ]);
    expect(drummerSection(cat.styles, none, cat.kits)).toBeNull();
    expect(pickerSections(cat.styles, none, cat.kits).map((s) => s.id)).toEqual(['styles']);
  });

  it('puts the drummers in a second tab, after the styles', () => {
    expect(pickerSections(cat.styles, cat.styleGroups, cat.kits).map((s) => s.id)).toEqual([
      'styles',
      'drummers',
    ]);
  });
});

describe('searchSection', () => {
  it('leaves everything for an empty search', () => {
    expect(searchSection(section, '  ')).toBe(section);
  });

  it('finds a style by a word of its name, its group, its meter or its description', () => {
    expect(keysOf(searchSection(section, 'rockabilly'))).toEqual(['rockabilly']);
    expect(keysOf(searchSection(section, 'metal'))).toContain('doom');
    expect(keysOf(searchSection(section, '12/8'))).toContain('slowblues');
    expect(keysOf(searchSection(section, 'Stubblefield'))).toContain('funk');
  });

  it('finds a style by its key, however its name is spelled', () => {
    expect(keysOf(searchSection(section, 'boombap'))).toEqual(['boombap']);
  });

  it('wants every word typed', () => {
    const both = keysOf(searchSection(section, 'shuffle texas'));
    expect(both).toEqual(['texasshuffle']);
  });

  it('puts a name that starts with the search ahead of one that only mentions it', () => {
    // New Orleans comes first in the catalogue, but only its description says "swing"
    const early = searchSection(section, 'swing').groups.find(
      ([g]) => g === 'Early jazz and swing'
    );
    expect(early?.[1].map((e) => e.key)).toEqual(['swingera', 'neworleans']);
  });

  it('leaves no groups when nothing matches', () => {
    expect(searchSection(section, 'zzzz').groups).toEqual([]);
  });
});

describe('spineOf', () => {
  it('gives a group the same palette colour every time', () => {
    expect(spineOf('Jazz')).toBe(spineOf('Jazz'));
    for (const [g] of cat.styleGroups)
      expect(['brass', 'rust', 'steel', 'teal', 'plum', 'ok', 'warn']).toContain(spineOf(g));
  });
});
