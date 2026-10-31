/**
 * Written fills: a style's or a song's `fills`, played over the end of a bar.
 *
 * A song's fills are transcriptions, and a drummer's fill often leaves out
 * the backbeat: Dale Crover's in Floyd the Barber crash with the snare on 1,
 * 2 and 3 over a kick run and nothing on 4. The critic judges a written fill
 * as a fill, as it does a poly fill, so the song can play what the tab has
 * rather than a snare added to pass. The hands in it are still counted.
 */

import { describe, expect, it } from 'vitest';

import { HANDS_CHECK, generateGood, playability } from '@/lib/app/breaks/critic';
import { generatePattern } from '@/lib/app/breaks/generate';
import { clonePattern, keepFills } from '@/lib/app/breaks/pattern';
import { patternSchema } from '@/lib/app/breaks/schema';
import { packPattern, patternFromPacked } from '@/lib/app/breaks/share';
import type { Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const BACKBEAT = 'Every bar has a findable backbeat';

/** Floyd the Barber's section E: its last bar is the bar-25 or bar-45 fill. */
function floydChorus(seed = 1): Pattern {
  return generatePattern({
    style: testStyle('crover'),
    song: 'floyd-the-barber:E',
    seed,
    bars: 4,
    density: 50,
    ghosts: 50,
  });
}

const failed = (pat: Pattern) =>
  playability(pat, 137)
    .checks.filter((c) => !c.ok)
    .map((c) => c.label);

describe('the generator', () => {
  it('records where the written fill starts', () => {
    const pat = floydChorus();
    expect(pat.fills).toEqual([{ bar: 3, from: 0 }]);
    // the tab's fill: the snare on 1, 2 and 3 and not on 4
    expect(pat.bars[3].s.join('')).toBe('2000200020000000');
  });

  it('records nothing for a bar no written fill reached', () => {
    const pat = generatePattern({
      style: testStyle('crover'),
      song: 'floyd-the-barber:E',
      seed: 1,
      bars: 1,
      density: 50,
      ghosts: 50,
    });
    expect(pat.fills).toBeUndefined();
  });
});

describe('the critic', () => {
  it('does not miss the backbeat in a written fill', () => {
    const pat = floydChorus();
    expect(failed(pat)).toEqual([]);
    const unmarked = clonePattern(pat);
    delete unmarked.fills;
    expect(failed(unmarked)).toContain(BACKBEAT);
  });

  it('still asks for the backbeat before the fill starts', () => {
    const pat = floydChorus();
    pat.fills = [{ bar: 3, from: 8 }];
    pat.bars[3].s[4] = 0;
    expect(failed(pat)).toContain(BACKBEAT);
  });

  it('still counts the hands in it', () => {
    const pat = floydChorus();
    pat.bars[3].h[4] = 1;
    pat.bars[3].r[4] = 1;
    expect(playability(pat, 137).checks).toContainEqual({
      ok: false,
      kind: 'body',
      label: HANDS_CHECK,
    });
  });

  it('lets New serve the song as written', () => {
    const made = generateGood(
      {
        style: testStyle('crover'),
        song: 'floyd-the-barber:G',
        seed: 1,
        bars: 4,
        density: 50,
        ghosts: 50,
      },
      137
    );
    expect(made.rejected).toBe(0);
    // bar 73: the snare on 1 alone under the ride
    expect(made.pattern.bars[3].s.join('')).toBe('2000000000000000');
  });
});

describe('after an edit', () => {
  it('keeps the fill while its notes are as written', () => {
    const pat = floydChorus();
    pat.fills = [{ bar: 3, from: 8 }];
    const next = clonePattern(pat);
    // before the fill starts, and in another bar
    next.bars[3].k[2] = next.bars[3].k[2] ? 0 : 1;
    next.bars[0].s[1] = 1;
    keepFills(pat, next);
    expect(next.fills).toEqual([{ bar: 3, from: 8 }]);
  });

  it('drops the fill once a note in it changes, and the critic asks for the backbeat again', () => {
    const pat = floydChorus();
    const next = clonePattern(pat);
    next.bars[3].k[9] = next.bars[3].k[9] ? 0 : 1;
    keepFills(pat, next);
    expect(next.fills).toBeUndefined();
    expect(failed(next)).toContain(BACKBEAT);
  });

  it('does not count percussion laid round the fill', () => {
    const pat = floydChorus();
    const next = clonePattern(pat);
    next.bars[3].p1[12] = 1;
    keepFills(pat, next);
    expect(next.fills).toEqual(pat.fills);
  });
});

describe('on the wire', () => {
  it('round-trips, and a reader that drops `fl` plays the same notes', () => {
    const pat = floydChorus();
    const packed = packPattern(pat);
    expect(packed.fl).toEqual([[3, 0]]);
    const back = patternFromPacked(packed);
    expect(back.fills).toEqual(pat.fills);
    expect(patternSchema.safeParse(back).success).toBe(true);
    const { fl: _dropped, ...older } = packed;
    const old = patternFromPacked(older);
    expect(old.fills).toBeUndefined();
    expect(old.bars).toEqual(back.bars);
  });

  it('leaves out a fill that does not fit its bars', () => {
    const packed = packPattern(floydChorus());
    expect(patternFromPacked({ ...packed, fl: [[5, 0]] }).fills).toBeUndefined();
    expect(patternFromPacked({ ...packed, fl: [[3, 40]] }).fills).toBeUndefined();
  });
});
