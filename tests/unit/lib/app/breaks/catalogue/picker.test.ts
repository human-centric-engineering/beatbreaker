/**
 * What the style picker shows and searches: entries built from the real
 * catalogue, and a search that every word typed has to match.
 */

import { describe, expect, it } from 'vitest';

import {
  entryCount,
  feelLabel,
  firstSentence,
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

describe('styleSection', () => {
  it('holds every style the catalogue groups, in its groups and order', () => {
    expect(section.groups.map(([g]) => g)).toEqual(cat.styleGroups.map(([g]) => g));
    expect(keysOf(section)).toEqual(cat.styleGroups.flatMap(([, keys]) => keys));
    expect(entryCount(section)).toBe(Object.keys(cat.styles).length);
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
