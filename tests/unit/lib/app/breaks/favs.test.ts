/**
 * `readFavs` — what of `bb.favs` the one-time import (task 4.10) can send.
 * The key is external data, so as much of this is about what is kept back as
 * about what is sent.
 */

import { describe, expect, it } from 'vitest';

import { readFavs } from '@/lib/app/breaks/favs';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { styleAttrs } from '@/lib/app/breaks/pattern';
import { breakPayload, encodeBreak } from '@/lib/app/breaks/share';
import { testStyle, testStyles } from '@/tests/helpers/catalogue';

const STYLES = testStyles();
const lookup = (key: string) => STYLES[key];

function doc(seed: number) {
  const funk = testStyle('funk');
  const A = generatePattern({ style: funk, meter: '4/4', seed, bars: 2, density: 50, ghosts: 50 });
  return {
    bpm: 96,
    swing: 10,
    level: 4,
    arrangement: ['A', 'A', 'B', 'A'] as Array<'A' | 'B'>,
    A,
    B: deriveB(A, funk.params),
  };
}

const fav = (name: string, code: string) => ({ name, bpm: 96, style: 'funk', level: 4, code });

describe('readFavs', () => {
  it('sends each readable favourite as a current document under its name, in order', () => {
    const one = doc(1);
    const two = doc(2);
    const entries = [fav('First', encodeBreak(one)), fav('Second', encodeBreak(two))];

    const { breaks, unreadable } = readFavs(entries, lookup);

    expect(breaks.map((b) => b.input)).toEqual([
      { title: 'First', doc: breakPayload(one) },
      { title: 'Second', doc: breakPayload(two) },
    ]);
    expect(breaks.map((b) => b.entry)).toEqual(entries);
    expect(unreadable).toEqual([]);
  });

  it('gives an older code the style snapshot the catalogue has, as opening it would', () => {
    const payload = breakPayload(doc(3));
    const { sa: _sa, sv: _sv, ...A } = payload.A;
    const { sa: _sb, sv: _svb, ...B } = payload.B;
    const v3 = btoa(JSON.stringify({ ...payload, ver: 3, A, B }));

    const [sent] = readFavs([fav('Old', v3)], lookup).breaks;

    expect(sent.input.doc.ver).toBe(4);
    expect(sent.input.doc.A.sa).toEqual(styleAttrs(STYLES.funk.params));
    expect(sent.input.doc.A.sv).toBe(STYLES.funk.versionId);
  });

  it('names a blank favourite and trims a long name to the title limit', () => {
    const code = encodeBreak(doc(4));
    const titles = readFavs([fav('   ', code), fav('x'.repeat(200), code)], lookup).breaks.map(
      (b) => b.input.title
    );
    expect(titles).toEqual(['Untitled pattern', 'x'.repeat(120)]);
  });

  it('keeps back, as they were, entries whose code does not read or whose shape is wrong', () => {
    const corrupt = fav('Broken', 'not-a-real-code');
    const shapeless = { title: 'no code' };
    const good = fav('Good', encodeBreak(doc(5)));

    const { breaks, unreadable } = readFavs([corrupt, shapeless, 7, good], lookup);

    expect(breaks.map((b) => b.input.title)).toEqual(['Good']);
    expect(unreadable).toEqual([corrupt, shapeless, 7]);
  });

  it('reads nothing from a value that is not a list', () => {
    expect(readFavs({ name: 'x', code: 'y' }, lookup)).toEqual({ breaks: [], unreadable: [] });
    expect(readFavs(null, lookup)).toEqual({ breaks: [], unreadable: [] });
  });
});
