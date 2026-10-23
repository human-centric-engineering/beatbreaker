/**
 * `find_drummers` (11-f): BeatBreaker's drummer records, listed or searched.
 * The data layer is mocked with the real drummer model as the seed writes it
 * (`tests/helpers/lineage-tables.ts`), so these read the real records.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dataOf } from '@/tests/helpers/buddy';
import { listDrummersFromModel } from '@/tests/helpers/lineage-tables';

vi.mock('@/lib/app/lineage/data', () => ({ listDrummers: vi.fn() }));

import { FindDrummersCapability, firstSentence } from '@/lib/app/breaks/buddy/find-drummers';
import { listDrummers } from '@/lib/app/lineage/data';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';

const context = { userId: 'user-1', agentId: 'agent-1' };

async function find(args: unknown) {
  const cap = new FindDrummersCapability();
  return dataOf(await cap.execute(cap.validate(args), context)).drummers;
}

beforeEach(() => {
  vi.mocked(listDrummers).mockImplementation(listDrummersFromModel);
});

describe('find_drummers', () => {
  it('lists every built drummer, and only them, when there is no query', async () => {
    const drummers = await find({});
    const modelled = (await listDrummersFromModel()).filter(
      (d) => d.node.modelled && !d.node.candidate
    );
    // the set, not the order: the database sorts names by its own collation
    expect(drummers.map((d) => d.slug).sort()).toEqual(modelled.map((d) => d.node.slug).sort());
    expect(drummers.every((d) => d.modelled)).toBe(true);
  });

  it('finds a candidate by query, marked as one, with every candidate the query matches', async () => {
    const hits = await find({ query: 'tootie' });
    expect(hits.map((d) => d.slug)).toEqual(['albert-heath']);
    expect(hits[0]).toMatchObject({ modelled: true, candidate: true, style: null });
    // a genre's candidates are not cut to the stub limit
    const free = await find({ query: 'free jazz' });
    expect(free.filter((d) => d.candidate).length).toBeGreaterThan(10);
  });

  it("gives each one's page, years, playable style, genres, summary and a few describing words", async () => {
    const purdie = (await find({})).find((d) => d.slug === 'bernard-purdie');
    expect(purdie).toMatchObject({
      name: 'Bernard Purdie',
      page: '/drummers/bernard-purdie',
      active: '1958–',
      style: 'bernardpurdie',
    });
    expect(purdie?.genres.every((g) => !g.startsWith('style:'))).toBe(true);
    expect(purdie?.summary).toMatch(/session drummer/);
    // nine in the record, held to eight so the full list stays short
    expect(purdie?.descriptors).toHaveLength(8);
  });

  it('names a style generate_pattern can play for every drummer with a record', async () => {
    for (const d of await find({})) expect(STYLES).toHaveProperty(d.style ?? 'missing');
  });

  it('matches a signature trait, not just the name', async () => {
    const slugs = (await find({ query: 'shuffle' })).map((d) => d.slug);
    expect(slugs).toContain('bernard-purdie');
    expect(slugs).not.toContain('dave-lombardo');
  });

  it('folds accents and case, and needs every word', async () => {
    expect((await find({ query: 'HERNANDEZ' })).map((d) => d.slug)).toEqual(['horacio-hernandez']);
    expect(await find({ query: 'purdie lombardo' })).toEqual([]);
  });

  it.each(['busier funk', '村上', '—!?'])(
    'points a search that matched nothing (%s) at the full list, rather than listing everyone',
    async (query) => {
      const cap = new FindDrummersCapability();
      const data = dataOf(await cap.execute(cap.validate({ query }), context));
      expect(data.drummers).toEqual([]);
      expect(data.note).toMatch(/no query/);
    }
  );

  it('matches the start of a word, not a fragment inside one', async () => {
    expect((await find({ query: 'shuf' })).map((d) => d.slug)).toContain('bernard-purdie');
    // inside "shuffle", and the start of no word in any record
    expect(await find({ query: 'huffle' })).toEqual([]);
  });
});

describe('find_drummers and rhythmic devices (12-b)', () => {
  it('lists each drummer’s devices in one line each: kind, ratio, where, what', async () => {
    const tony = (await find({})).find((d) => d.slug === 'tony-williams');
    expect(tony?.devices).toContainEqual(expect.stringMatching(/^cross-rhythm 2:3 \(comping\): /));
    expect(tony?.devices).toContainEqual(
      expect.stringMatching(/^polymeter \(comping\): Threes over the bar line/)
    );
  });

  it('finds who plays threes over the bar by the words a drummer would use', async () => {
    expect((await find({ query: 'threes over the bar' })).map((d) => d.slug)).toContain(
      'tony-williams'
    );
  });

  it('keeps a ratio whole: 3:2 is not 2:3', async () => {
    expect((await find({ query: '2:3' })).map((d) => d.slug).sort()).toEqual([
      'ari-hoenig',
      'elvin-jones',
      'roy-haynes',
      'tony-williams',
      'travis-barker',
    ]);
    const threeTwo = (await find({ query: '3:2' })).map((d) => d.slug);
    expect(threeTwo).not.toContain('elvin-jones');
    expect(threeTwo).not.toContain('tony-williams');
  });

  it('matches where a device is played', async () => {
    const slugs = (await find({ query: 'grouping fills' })).map((d) => d.slug);
    expect(slugs).toEqual(expect.arrayContaining(['steve-gadd', 'phil-collins']));
    expect(slugs).not.toContain('michael-shrieve'); // his threes are in a solo
  });

  it('gives only the first sentence of a device; get_drummer has the rest', async () => {
    const bonham = (await find({})).find((d) => d.slug === 'john-bonham');
    expect(bonham?.devices[0]).toBe(
      'polymeter (groove): He holds a plain 4/4 while the riff runs in groups of three over it, so the two only line up every few bars.'
    );
  });

  it('finds a device by its kind', async () => {
    expect((await find({ query: 'hemiola' })).map((d) => d.slug).sort()).toEqual([
      'ari-hoenig',
      'elvin-jones',
      'josh-freese',
    ]);
    const modulation = (await find({ query: 'metric modulation' })).map((d) => d.slug);
    expect(modulation).toEqual(expect.arrayContaining(['tony-williams', 'klek-de-poitrine']));
    expect(modulation).not.toContain('ringo-starr');
  });
});

describe('firstSentence', () => {
  it('ends at a stop before a capital', () => {
    expect(firstSentence('Deep time. Steely Dan.')).toBe('Deep time.');
    expect(firstSentence('Is it a shuffle? Yes.')).toBe('Is it a shuffle?');
    expect(firstSentence('One sentence only.')).toBe('One sentence only.');
    expect(firstSentence(null)).toBeNull();
  });

  it('runs on past an initial or an abbreviation', () => {
    expect(firstSentence('J.R. Robinson is a session drummer. He played.')).toBe(
      'J.R. Robinson is a session drummer.'
    );
    expect(firstSentence('Played with Mr. Bungle and Dr. John. Later, Faith No More.')).toBe(
      'Played with Mr. Bungle and Dr. John.'
    );
    expect(firstSentence('Born c. 1940 in Ohio. Moved to New York.')).toBe('Born c. 1940 in Ohio.');
  });
});
