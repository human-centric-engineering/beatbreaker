/**
 * `fold`, `searchIndex`, `notScoredLine` — the search behind the picker's
 * fallback and `GET /api/v1/catalogue/index`.
 */

import { describe, expect, it } from 'vitest';

import {
  type CatalogueIndex,
  fold,
  type IndexDrummer,
  notScoredLine,
  searchIndex,
} from '@/lib/app/lineage/search';
import type { SongRow } from '@/lib/app/lineage/songs';

function drummer(slug: string, label: string, extra: Partial<IndexDrummer> = {}): IndexDrummer {
  return { slug, label, candidate: false, styleKey: slug, bands: [], ...extra };
}

function song(title: string, extra: Partial<SongRow> = {}): SongRow {
  return {
    title,
    artist: 'Someone',
    record: 'A record',
    recordingId: 'rec:r',
    year: 1980,
    drums: 'Drums.',
    drummerIds: [],
    scored: null,
    spotify: null,
    youtube: null,
    transcriptions: [],
    ...extra,
  };
}

const INDEX: CatalogueIndex = {
  drummers: [
    drummer('mike-joyce', 'Mike Joyce', { candidate: true, styleKey: null, bands: ['The Smiths'] }),
    drummer('roger-taylor', 'Roger Taylor', { bands: ['Queen'] }),
    drummer('brian-may-not', 'Queen Fan', { candidate: true, styleKey: null }),
  ],
  songs: [
    song('How Soon Is Now?', {
      artist: 'The Smiths',
      year: 1985,
      drummerIds: ['drummer:mike-joyce'],
    }),
    song("Don't Stop Me Now", {
      artist: 'Queen',
      year: 1978,
      drummerIds: ['drummer:roger-taylor'],
      scored: { styleKey: 'roger-taylor', songKey: 'dont-stop-me-now' },
    }),
  ],
};

describe('fold', () => {
  it('lowercases, strips accents, turns & into and, and collapses punctuation', () => {
    expect(fold('Beyoncé')).toBe('beyonce');
    expect(fold('  How Soon Is Now?  ')).toBe('how soon is now');
    expect(fold('Simon & Garfunkel')).toBe('simon and garfunkel');
    expect(fold("Don't--Stop")).toBe('don t stop');
    expect(fold('?!')).toBe('');
  });
});

describe('searchIndex', () => {
  it('finds a song by its folded title with its drummer, and scored null', () => {
    const r = searchIndex(INDEX, 'how soon is now');
    expect(r.songs).toEqual([
      {
        title: 'How Soon Is Now?',
        artist: 'The Smiths',
        record: 'A record',
        year: 1985,
        drummers: [{ slug: 'mike-joyce', label: 'Mike Joyce', candidate: true }],
        scored: null,
      },
    ]);
  });

  it('finds a band with its drummers, and the song by the band that recorded it', () => {
    const r = searchIndex(INDEX, 'Queen');
    expect(r.bands).toEqual([
      {
        name: 'Queen',
        drummers: [{ slug: 'roger-taylor', label: 'Roger Taylor', candidate: false }],
      },
    ]);
    expect(r.songs.map((s) => s.title)).toEqual(["Don't Stop Me Now"]);
    // a built drummer comes before a candidate of a name that also matches
    expect(r.drummers.map((d) => d.slug)).toEqual(['brian-may-not']);
  });

  it('matches word prefixes and requires every word, but not mid-word fragments', () => {
    expect(searchIndex(INDEX, 'rog tay').drummers.map((d) => d.slug)).toEqual(['roger-taylor']);
    expect(searchIndex(INDEX, 'roger smith').drummers).toEqual([]);
    expect(searchIndex(INDEX, 'oger').drummers).toEqual([]);
  });

  it('answers nothing for an empty or punctuation-only query', () => {
    for (const q of ['', '   ', '?!']) {
      expect(searchIndex(INDEX, q)).toEqual({ query: q, drummers: [], bands: [], songs: [] });
    }
  });

  it('puts built drummers before candidates, and scored songs before unscored', () => {
    const index: CatalogueIndex = {
      drummers: [
        drummer('a-cand', 'Sam Candidate', { candidate: true, styleKey: null }),
        drummer('b-built', 'Sam Candidate', {}),
      ],
      songs: [
        song('Echo', { artist: 'Early Band', year: 1970 }),
        song('Echo', {
          artist: 'Later Band',
          year: 1990,
          scored: { styleKey: 's', songKey: 'echo' },
        }),
      ],
    };
    const r = searchIndex(index, 'sam');
    expect(r.drummers.map((d) => d.slug)).toEqual(['b-built', 'a-cand']);
    expect(searchIndex(index, 'echo').songs.map((s) => s.year)).toEqual([1990, 1970]);
  });

  it('ranks a whole-name match above a prefix above an inner word', () => {
    const index: CatalogueIndex = {
      drummers: [
        drummer('c', 'John Paul Jones'),
        drummer('b', 'Paulie Walnuts'),
        drummer('a', 'Paul'),
      ],
      songs: [],
    };
    expect(searchIndex(index, 'paul').drummers.map((d) => d.slug)).toEqual(['a', 'b', 'c']);
  });

  it('limits each kind', () => {
    const index: CatalogueIndex = {
      drummers: Array.from({ length: 5 }, (_, i) => drummer(`d${i}`, `Drum ${i}`)),
      songs: Array.from({ length: 5 }, (_, i) => song(`Drum song ${i}`)),
    };
    const r = searchIndex(index, 'drum', 2);
    expect(r.drummers).toHaveLength(2);
    expect(r.songs).toHaveLength(2);
  });

  it('lists a drummer once under a band even if the band is named twice', () => {
    const index: CatalogueIndex = {
      drummers: [drummer('d', 'D', { bands: ['The Band', 'the band'] })],
      songs: [],
    };
    expect(searchIndex(index, 'band').bands).toEqual([
      { name: 'The Band', drummers: [{ slug: 'd', label: 'D', candidate: false }] },
    ]);
  });

  it('leaves a drummer id it cannot resolve off the song', () => {
    const index: CatalogueIndex = {
      drummers: [],
      songs: [song('Echo', { drummerIds: ['drummer:gone'] })],
    };
    expect(searchIndex(index, 'echo').songs[0].drummers).toEqual([]);
  });
});

describe('notScoredLine', () => {
  it('names the artist and the song', () => {
    expect(notScoredLine({ artist: 'The Smiths', title: 'How Soon Is Now?' })).toBe(
      'The Smiths: How Soon Is Now? is not scored yet'
    );
  });
});

describe('searchIndex, one hit per song', () => {
  const index: CatalogueIndex = {
    drummers: [drummer('shrieve', 'Michael Shrieve'), drummer('areas', 'Chepito Areas')],
    songs: [
      song('Oye Como Va', { artist: 'Santana', year: 1970, drummerIds: ['drummer:shrieve'] }),
      song('Oye Como Va', {
        artist: 'Santana',
        year: 1970,
        record: 'Live',
        drummerIds: ['drummer:areas', 'drummer:shrieve'],
        scored: { styleKey: 'shrieve', songKey: 'oye' },
      }),
      song('Oye Como Va', { artist: 'Tito Puente', year: 1963 }),
    ],
  };

  it('answers a song on two records once, with everyone on either, scored if either is', () => {
    const santana = searchIndex(index, 'oye como va').songs.filter((s) => s.artist === 'Santana');
    expect(santana).toHaveLength(1);
    expect(santana[0].drummers.map((d) => d.slug)).toEqual(['shrieve', 'areas']);
    expect(santana[0].scored).toEqual({ styleKey: 'shrieve', songKey: 'oye' });
  });

  it('keeps the same title by another artist as its own song', () => {
    expect(searchIndex(index, 'oye como va').songs.map((s) => s.artist)).toEqual([
      'Santana',
      'Tito Puente',
    ]);
  });

  it('finds a song by its band and title together', () => {
    expect(searchIndex(index, 'puente oye').songs.map((s) => s.artist)).toEqual(['Tito Puente']);
  });
});
