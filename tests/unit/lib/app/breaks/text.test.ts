/**
 * The text notation BeatBuddy reads and writes. The contract is the round trip:
 * whatever a pattern holds, `fromText(toText(p))` gives the same notes back —
 * otherwise the model is shown one pattern and edits another.
 */

import { describe, expect, it } from 'vitest';

import { generatePattern } from '@/lib/app/breaks/generate';
import { LANES } from '@/lib/app/breaks/lanes';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { METER_KEYS } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { describeStep, fromText, toText } from '@/lib/app/breaks/text';
import { meterOf } from '@/lib/app/breaks/meter';
import type { Pattern } from '@/lib/app/breaks/types';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

function roundTrip(pat: Pattern) {
  const result = fromText(toText(pat), pat.meter);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe('toText / fromText', () => {
  it('round-trips every famous break exactly', () => {
    LIBRARY.forEach((item, index) => {
      const pat = patternFromLibrary(
        item,
        index,
        STYLES[item.style] ? testStyle(item.style) : undefined
      );
      const back = roundTrip(pat);
      expect(
        back.bars.map((b) => b.number),
        item.title
      ).toEqual(pat.bars.map((_, i) => i + 1));
      back.bars.forEach(({ bar }, bi) => {
        for (const L of LANES)
          expect(bar[L], `${item.title} bar ${bi + 1} ${L}`).toEqual(pat.bars[bi][L]);
      });
    });
  });

  it('round-trips a generated pattern, percussion included, in every meter', () => {
    for (const meter of METER_KEYS) {
      const pat = generatePattern({
        style: testStyle('samba'),
        seed: 7,
        bars: 2,
        density: 60,
        ghosts: 60,
        meter,
      });
      // make sure every lane and every value is exercised somewhere
      const last = pat.bars[1];
      last.p1[0] = 2;
      last.p2[1] = 1;
      last.hf[2] = 1;
      last.s[3] = 4;
      last.h[4] = 3;
      last.r[5] = 2;
      last.c[0] = 1;
      last.t3[6] = 2;
      const back = roundTrip(pat);
      back.bars.forEach(({ bar }, bi) => {
        for (const L of LANES)
          expect(bar[L], `${meter} bar ${bi + 1} ${L}`).toEqual(pat.bars[bi][L]);
      });
      expect(back.lanes).toEqual(expect.arrayContaining(['p1', 'p2', 'hf', 't3']));
    }
  });

  it('writes the header, the count row and one line per carried lane', () => {
    const pat = patternFromLibrary(LIBRARY[0], 0, testStyle(LIBRARY[0].style));
    const text = toText(pat, { section: 'A', bpm: 94, swing: 8 });
    const lines = text.split('\n');
    expect(lines[0]).toBe(`A · ${pat.style} · 4/4 · 94 bpm · swing 8`);
    expect(lines[1]).toMatch(/^bar 1\s+count\s+1e\+a2e\+a3e\+a4e\+a$/);
    expect(lines.filter((l) => /^\s+kick\s/.test(l))).toHaveLength(pat.bars.length);
  });

  it('keeps the count row one character a step in 12/8', () => {
    const pat = generatePattern({
      style: testStyle('funk'),
      seed: 1,
      bars: 1,
      density: 50,
      ghosts: 0,
      meter: '12/8',
    });
    const countLine = toText(pat).split('\n')[1];
    expect(countLine.trim().split(/\s+/)[3]).toHaveLength(24);
  });
});

describe('fromText', () => {
  const four = (rows: string) => `A · funk · 4/4\nbar 1\n${rows}`;

  it('reads spaces, bars and dashes as layout and rests', () => {
    const r = fromText(four('kick  X--- ..X. |X... ....\nsnare ....S... ....S...'), '4/4');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bars[0].bar.k).toEqual([1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
    expect(r.bars[0].bar.s[4]).toBe(3);
    expect(r.lanes).toEqual(['k', 's']);
  });

  it('keeps the numbers bars were written with', () => {
    const r = fromText('bar 3\nkick X...............', '4/4');
    expect(r.ok && r.bars.map((b) => b.number)).toEqual([3]);
  });

  it('accepts a lane on the bar line, and aliases for lane names', () => {
    const r = fromText('bar 1 hihat xxxxxxxxxxxxxxxx\nbass X.......X.......', '4/4');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bars[0].bar.h.every((v) => v === 1)).toBe(true);
    expect(r.bars[0].bar.k[8]).toBe(1);
  });

  it('refuses a character the lane does not have, naming bar, lane and step', () => {
    const r = fromText(four('snare ....x...........'), '4/4');
    expect(r).toEqual({ ok: false, error: expect.stringContaining('bar 1, snare: "x" on beat 2') });
    expect(!r.ok && r.error).toContain('g ghost');
  });

  it('refuses a row of the wrong length for the meter', () => {
    const r = fromText('bar 2\nkick X.......X.......', '3/4');
    expect(r).toEqual({ ok: false, error: 'bar 2, kick: 16 steps, but a bar of 3/4 has 12' });
  });

  it('refuses an unknown lane, a lane written twice, a bar written twice, and no bars', () => {
    expect(fromText(four('cowbell X...............'), '4/4')).toMatchObject({
      ok: false,
      error: expect.stringContaining('no lane called "cowbell"'),
    });
    expect(fromText(four('kick X...............\nkick X...............'), '4/4')).toMatchObject({
      ok: false,
      error: 'bar 1: kick is written twice',
    });
    expect(fromText('bar 1\nbar 1', '4/4')).toMatchObject({
      ok: false,
      error: 'bar 1 is written twice',
    });
    expect(fromText('just some words', '4/4')).toMatchObject({ ok: false });
    expect(fromText('bar 99\n', '4/4')).toMatchObject({
      ok: false,
      error: 'bar 99 is out of range',
    });
  });

  it('leaves a lane a bar does not mention empty', () => {
    const r = fromText('bar 1\nkick X...............', '4/4');
    expect(r.ok && r.bars[0].bar.s).toEqual(emptyBar(16).s);
  });
});

describe('describeStep', () => {
  it('names steps the way a drummer counts them', () => {
    const m = meterOf('4/4');
    expect(describeStep(m, 0)).toBe('beat 1');
    expect(describeStep(m, 5)).toBe("the 'e' of 2");
    expect(describeStep(m, 15)).toBe("the 'a' of 4");
    expect(describeStep(meterOf('6/8'), 1)).toBe("the '+' of 1");
  });
});
