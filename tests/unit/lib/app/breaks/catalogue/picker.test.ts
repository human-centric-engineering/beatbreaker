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
    expect(keysOf(drummers!)).toEqual([
      'earlpalmer',
      'levonhelm',
      'djfontana',
      'jerryallison',
      'halblaine',
      'porcaro',
      'newmark',
      'stevejordan',
      'ringo',
      'watts',
      'moon',
      'kenneyjones',
      'buckler',
      'fredbelow',
      'mitchell',
      'baker',
      'fleetwood',
      'shrieve',
      'cindyblackman',
      'bonham',
      'paice',
      'rogertaylor',
      'downey',
      'rudd',
      'ghoul',
      'alexvanhalen',
      'woodmansey',
      'dennisdavis',
      'bruford',
      'nickmason',
      'collins',
      'peart',
      'carey',
      'portnoy',
      'harrison',
      'klek',
      'carlpalmer',
      'bozzio',
      'aeschliman',
      'maxweinberg',
      'hayward',
      'paulcook',
      'headon',
      'barker',
      'tommyramone',
      'earlhudson',
      'stephenmorris',
      'budgie',
      'copeland',
      'rogertaylorduran',
      'clemburke',
      'mikejoyce',
      'reni',
      'helders',
      'rowntree',
      'alanwhite',
      'grohl',
      'chadsmith',
      'selway',
      'taylorhawkins',
      'joshfreese',
      'mattcameron',
      'crover',
      'billward',
      'burr',
      'mcbrain',
      'ulrich',
      'lombardo',
      'jizmak',
      'haake',
      'jordison',
      'skinny',
      'locust',
      'davies',
      'sleeptoken',
      'stubblefield',
      'jabostarks',
      'zigaboo',
      'bernardpurdie',
      'garibaldi',
      'gadson',
      'mikeclark',
      'sheilae',
      'errico',
      'djjohnson',
      'bennybenjamin',
      'aljackson',
      'pistolallen',
      'urieljones',
      'rogerhawkins',
      'tonythompson',
      'questlove',
      'krupa',
      'buddyrich',
      'roach',
      'haynes',
      'kennyclarke',
      'blakey',
      'phillyjoe',
      'jimmycobb',
      'morello',
      'elvinjones',
      'tonywilliams',
      'dejohnette',
      'brianblade',
      'hoenig',
      'sanchez',
      'yussefdayes',
      'cobham',
      'lennywhite',
      'gadd',
      'hakim',
      'colaiuta',
      'simonphillips',
      'erskine',
      'puente',
      'changuito',
      'horaciohernandez',
      'prieto',
      'miltonbanana',
      'tonyallen',
      'koleoso',
      'amarfio',
      'carltonbarrett',
      'slydunbar',
      'santadavis',
      'estepario',
    ]);
    expect(drummers?.groups.map(([g]) => g)).toEqual([
      'Rock and roll and roots drummers',
      'Pop and session drummers',
      'British Invasion drummers',
      'Mod and mod revival drummers',
      'Blues drummers',
      'Blues and psychedelic rock drummers',
      'Latin rock drummers',
      'Hard rock drummers',
      'Glam and art rock drummers',
      'Progressive and math rock drummers',
      'Heartland and roots rock drummers',
      'Punk drummers',
      'Hardcore punk drummers',
      'Post-punk and gothic rock drummers',
      'New wave drummers',
      'Indie rock drummers',
      'Britpop drummers',
      'Alternative rock drummers',
      'Grunge drummers',
      'Heavy metal drummers',
      'Thrash metal drummers',
      'Modern and extreme metal drummers',
      'Funk drummers',
      'Soul and Motown drummers',
      'Disco drummers',
      'Hip-hop and neo-soul drummers',
      'Swing and big band drummers',
      'Bebop drummers',
      'Hard bop drummers',
      'Cool jazz drummers',
      'Modal and post-bop drummers',
      'Modern jazz drummers',
      'Fusion drummers',
      'Afro-Cuban and Latin jazz drummers',
      'Samba and Brazilian jazz drummers',
      'Afrobeat drummers',
      'Afro-rock drummers',
      'Reggae drummers',
      'YouTube drummers',
    ]);
    for (const key of keysOf(drummers!)) expect(keysOf(section)).not.toContain(key);
  });

  it("names both of a drummer's 4/4 grids on his card, sextuplets and sixteenths", () => {
    const bonzo = drummers?.groups.flatMap(([, es]) => es).find((e) => e.key === 'bonham');
    expect(bonzo?.label).toBe('John Bonham');
    expect(bonzo?.meta).toEqual([
      '4/4, 4/4 sextuplets',
      '69–178 bpm',
      '11 songs',
      'straight to swung',
      cat.kits.bigRoom.label,
    ]);
  });

  it("gives a drummer with songs every meter and tempo his songs play in, and finds him by a song's title", () => {
    const mitch = drummers?.groups.flatMap(([, es]) => es).find((e) => e.key === 'mitchell');
    expect(mitch?.label).toBe('Mitch Mitchell');
    expect(mitch?.meta).toEqual([
      '4/4, 9/8, 12/8',
      '56–230 bpm',
      '45 songs',
      'straight to swung',
      cat.kits.smdrums.label,
    ]);
    const found = searchSection(drummers!, 'manic depression');
    expect(found.groups.flatMap(([, es]) => es.map((e) => e.key))).toEqual(['mitchell']);
  });

  it("prints a drummer's bands under the name, and finds the drummer by one", () => {
    const entries = drummers!.groups.flatMap(([, es]) => es);
    const taylors = entries.filter((e) => e.label === 'Roger Taylor');
    expect(taylors.map((e) => e.subtitle)).toEqual(['Queen', 'Duran Duran']);
    expect(entries.find((e) => e.key === 'kenneyjones')?.subtitle).toBe(
      'Small Faces · Faces · The Who'
    );
    const found = searchSection(drummers!, 'the smiths');
    expect(found.groups.flatMap(([, es]) => es.map((e) => e.key))).toEqual(['mikejoyce']);
    // a style has no bands
    expect(section.groups.flatMap(([, es]) => es).every((e) => e.subtitle === undefined)).toBe(
      true
    );
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
      ['Hard rock drummers', ['ghostdrummer']],
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

  it('puts the drummers in the first tab, before the styles', () => {
    expect(pickerSections(cat.styles, cat.styleGroups, cat.kits).map((s) => s.id)).toEqual([
      'drummers',
      'styles',
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
