/**
 * `readSongs` / `songsFor` — a recording's unchecked JSON becomes the song
 * rows a page shows. What matters is what is left out or nulled: a track that
 * does not read, a half-scored track, a link of the wrong provider, an http
 * transcription address.
 */

import { describe, expect, it } from 'vitest';

import { readSongs, songsFor, type StoredRecording } from '@/lib/app/lineage/songs';

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const SPOTIFY = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC';

function track(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'How Soon Is Now?',
    drummer_ids: ['drummer:mike-joyce'],
    drums: { description: 'A tremolo-driven backbeat.' },
    ...extra,
  };
}

function rec(tracks: unknown, extra: Partial<StoredRecording> = {}): StoredRecording {
  return {
    id: 'rec:meat-is-murder',
    title: 'Meat Is Murder',
    artist: 'The Smiths',
    year: 1985,
    record: { tracks },
    ...extra,
  };
}

describe('readSongs', () => {
  it('takes the artist, record and year from the recording when the track gives none', () => {
    expect(readSongs(rec([track()]))).toEqual([
      {
        title: 'How Soon Is Now?',
        artist: 'The Smiths',
        record: 'Meat Is Murder',
        recordingId: 'rec:meat-is-murder',
        year: 1985,
        drums: 'A tremolo-driven backbeat.',
        drummerIds: ['drummer:mike-joyce'],
        scored: null,
        spotify: null,
        youtube: null,
        transcriptions: [],
      },
    ]);
  });

  it('prefers the track’s own artist and year', () => {
    const [row] = readSongs(rec([track({ artist: 'Guest', year: 1984 })]));
    expect(row).toMatchObject({ artist: 'Guest', year: 1984 });
  });

  it('leaves out a track that does not read and keeps the rest', () => {
    const rows = readSongs(
      rec([
        track({ title: 'Good' }),
        track({ title: '' }),
        track({ drummer_ids: [] }),
        track({ drummer_ids: ['mike-joyce'] }),
        track({ drums: {} }),
        'nonsense',
        null,
      ])
    );
    expect(rows.map((r) => r.title)).toEqual(['Good']);
  });

  it('reads nothing from a record with no tracks, or one that is not an object', () => {
    expect(readSongs(rec(undefined))).toEqual([]);
    expect(readSongs(rec('not a list'))).toEqual([]);
    expect(readSongs(rec(null, { record: 42 }))).toEqual([]);
    expect(readSongs(rec(null, { record: null }))).toEqual([]);
  });

  it('scores a track only with both style_key and song_key', () => {
    const rows = readSongs(
      rec([
        track({ title: 'Both', style_key: 'joyce', song_key: 'how-soon-is-now' }),
        track({ title: 'Style only', style_key: 'joyce' }),
        track({ title: 'Song only', song_key: 'how-soon-is-now' }),
        track({ title: 'Empty key', style_key: '', song_key: 'x' }),
      ])
    );
    expect(rows.map((r) => [r.title, r.scored])).toEqual([
      ['Both', { styleKey: 'joyce', songKey: 'how-soon-is-now' }],
      ['Style only', null],
      ['Song only', null],
      ['Empty key', null],
    ]);
  });

  it('parses links, and drops one that is not the right provider or not a link', () => {
    const [ok] = readSongs(rec([track({ youtube: YT, spotify: SPOTIFY })]));
    expect(ok.youtube).toMatchObject({
      provider: 'youtube',
      canonicalUrl: YT,
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
    expect(ok.spotify).toMatchObject({ provider: 'spotify', id: 'track/4uLU6hMCjMI75M1A2tKUQC' });

    const [swapped] = readSongs(rec([track({ youtube: SPOTIFY, spotify: YT })]));
    expect(swapped.youtube).toBeNull();
    expect(swapped.spotify).toBeNull();

    const [junk] = readSongs(rec([track({ youtube: 'not a url', spotify: 42 })]));
    expect(junk.youtube).toBeNull();
    expect(junk.spotify).toBeNull();
  });

  it('keeps a transcription’s https address and nulls any other', () => {
    const [row] = readSongs(
      rec([
        track({
          transcriptions: [
            { site: 'songsterr', url: 'https://songsterr.com/a/b' },
            { site: 'drumeo', url: 'http://drumeo.com/x' },
            { site: 'javascript', url: 'javascript:alert(1)' },
            { site: 'book' },
          ],
        }),
      ])
    );
    expect(row.transcriptions).toEqual([
      { site: 'songsterr', url: 'https://songsterr.com/a/b' },
      { site: 'drumeo', url: null },
      { site: 'javascript', url: null },
      { site: 'book', url: null },
    ]);
  });

  it('drops a malformed transcriptions list without losing the track', () => {
    const [row] = readSongs(rec([track({ transcriptions: 'nope' })]));
    expect(row.title).toBe('How Soon Is Now?');
    expect(row.transcriptions).toEqual([]);
  });
});

describe('songsFor', () => {
  const joyce = 'drummer:mike-joyce';
  const other = 'drummer:other';

  it('keeps only the songs the drummer plays on', () => {
    const rows = songsFor(joyce, [
      rec([track({ title: 'Mine' }), track({ title: 'Theirs', drummer_ids: [other] })]),
    ]);
    expect(rows.map((r) => r.title)).toEqual(['Mine']);
  });

  it('sorts by year, then scored first, then title', () => {
    const rows = songsFor(joyce, [
      rec(
        [
          track({ title: 'B unscored' }),
          track({ title: 'A unscored' }),
          track({ title: 'Z scored', style_key: 's', song_key: 'z' }),
        ],
        { id: 'rec:a', year: 1985 }
      ),
      rec([track({ title: 'Early' })], { id: 'rec:b', year: 1983 }),
    ]);
    expect(rows.map((r) => r.title)).toEqual(['Early', 'Z scored', 'A unscored', 'B unscored']);
  });
});
