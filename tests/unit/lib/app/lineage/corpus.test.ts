/**
 * `parseCorpus` — the boundary where the model's JSON becomes typed. A record
 * that does not fit must stop the seed with the file named, and the fields a
 * record carries beyond the slice the app reads must survive, because the
 * whole record is what gets stored.
 */

import { describe, expect, it } from 'vitest';

import { parseCorpus } from '@/lib/app/lineage/corpus';
import { drummer } from '@/tests/helpers/lineage';

const empty = { drummers: [], recordings: [], styles: [], sources: [] };

describe('parseCorpus', () => {
  it('keeps everything a record carries, not only what it reads', () => {
    const c = parseCorpus({
      ...empty,
      drummers: [{ file: 'drummers/a.json', json: drummer('a', { pedagogy: { books: [] } }) }],
    });
    expect(c.drummers[0].record).toMatchObject({ pedagogy: { books: [] } });
  });

  it('names the file whose record does not fit', () => {
    const broken = { ...drummer('a'), identity: { name: '' } };
    expect(() =>
      parseCorpus({ ...empty, drummers: [{ file: 'drummers/a.json', json: broken }] })
    ).toThrow(/^drummers\/a\.json: /);
  });

  it('refuses an id outside the model’s namespaces', () => {
    const odd = { ...drummer('a'), meta: { id: 'person:a', schema_version: '1.5.0' } };
    expect(() =>
      parseCorpus({ ...empty, drummers: [{ file: 'drummers/a.json', json: odd }] })
    ).toThrow(/drummers\/a\.json/);
  });

  it('reads every source in every registry file, and names a bad one', () => {
    const c = parseCorpus({
      ...empty,
      sources: [
        { file: 'sources/a.json', json: [{ id: 'src:one', type: 'news', title: 'One' }] },
        { file: 'sources/b.json', json: [{ id: 'src:two', type: 'book', title: 'Two' }] },
      ],
    });
    expect(c.sources.map((s) => [s.file, s.record.id])).toEqual([
      ['sources/a.json', 'src:one'],
      ['sources/b.json', 'src:two'],
    ]);
    expect(() =>
      parseCorpus({ ...empty, sources: [{ file: 'sources/c.json', json: { not: 'an array' } }] })
    ).toThrow(/^sources\/c\.json: /);
  });

  it('refuses a recording whose performer is not a drummer', () => {
    const rec = {
      id: 'rec:r',
      title: 'R',
      artist: 'A',
      year: 1970,
      drum_performances: [{ drummer_id: 'style:funk' }],
    };
    expect(() =>
      parseCorpus({ ...empty, recordings: [{ file: 'recordings/r.json', json: rec }] })
    ).toThrow(/^recordings\/r\.json: /);
  });
});
