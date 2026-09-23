/**
 * The break doctor's twelve moves. Undo keeps the old reference rather than
 * replaying an inverse, so the contract that matters most is that a move never
 * touches its input.
 */

import { describe, expect, it } from 'vitest';

import { DOCTOR_MOVES, type DoctorMove, doctor } from '@/lib/app/breaks/doctor';
import { generatePattern } from '@/lib/app/breaks/generate';
import { LANES } from '@/lib/app/breaks/lanes';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { testStyle } from '@/tests/helpers/catalogue';
import type { Pattern, Style } from '@/lib/app/breaks/types';

const MOVES = DOCTOR_MOVES.map((d) => d.move);

/* The doctor takes the pattern's style as an argument now — it writes new
   notes, and that needs the kick cells and ghost tables the pattern's own
   snapshot deliberately does not carry. Each shape therefore travels with the
   style it was written in, the same one the generator was given. */
type Shape = [string, Pattern, Style];

function generated(
  name: string,
  style: string,
  opts: { meter: string; seed: number; bars: number; density: number; ghosts: number }
): Shape {
  const resolved = testStyle(style);
  return [name, generatePattern({ style: resolved, ...opts }), resolved.params];
}

/* Bar shapes that exercise different paths: 4/4, compound, odd, a single bar,
   a jazz style with a ride, a clave style, and a transcription with toms. */
const SHAPES: Shape[] = [
  generated('funk 4/4 x4', 'funk', {
    meter: '4/4',
    seed: 11,
    bars: 4,
    density: 60,
    ghosts: 60,
  }),
  generated('funk 6/8 x2', 'funk', {
    meter: '6/8',
    seed: 12,
    bars: 2,
    density: 50,
    ghosts: 50,
  }),
  generated('funk 7/8 x2', 'funk', {
    meter: '7/8',
    seed: 13,
    bars: 2,
    density: 50,
    ghosts: 50,
  }),
  generated('funk 4/4 x1', 'funk', {
    meter: '4/4',
    seed: 14,
    bars: 1,
    density: 50,
    ghosts: 50,
  }),
  generated('swing 4/4 x2', 'swing', {
    meter: '4/4',
    seed: 15,
    bars: 2,
    density: 50,
    ghosts: 50,
  }),
  generated('bossa 4/4 x2', 'bossa', {
    meter: '4/4',
    seed: 16,
    bars: 2,
    density: 50,
    ghosts: 50,
  }),
  ...LIBRARY.slice(0, 6).map((item, i): Shape => {
    const style = testStyle(item.style);
    return [item.title, patternFromLibrary(item, i, style), style.params];
  }),
];

describe('doctor', () => {
  it('has twelve moves, each labelled', () => {
    expect(MOVES).toHaveLength(12);
    expect(new Set(MOVES).size).toBe(12);
    for (const d of DOCTOR_MOVES) expect(d.label.length).toBeGreaterThan(0);
  });

  it.each(MOVES)(
    '%s keeps bar count and length and leaves its input alone, on every shape',
    (move) => {
      for (const [name, pat, style] of SHAPES) {
        const before = JSON.stringify(pat);
        const out = doctor(pat, style, move, 7);
        expect(JSON.stringify(pat), `${name} input mutated`).toBe(before);
        expect(out).not.toBe(pat);
        expect(out.bars, name).toHaveLength(pat.bars.length);
        out.bars.forEach((bar, bi) => {
          for (const L of LANES)
            expect(bar[L], `${name} bar ${bi} ${L}`).toHaveLength(pat.bars[bi][L].length);
          // and never shares an array with the input
          for (const L of LANES) expect(bar[L]).not.toBe(pat.bars[bi][L]);
        });
      }
    }
  );

  it.each(MOVES)('%s is reproducible for a fixed entropy', (move) => {
    const [, pat, style] = SHAPES[0];
    expect(doctor(pat, style, move, 42)).toEqual(doctor(pat, style, move, 42));
  });

  const [, funk, funkStyle] = SHAPES[0];

  it('ghosts- removes every ghost and nothing else', () => {
    const out = doctor(funk, funkStyle, 'ghosts-', 1);
    out.bars.forEach((bar, bi) => {
      expect(bar.s).toEqual(funk.bars[bi].s.map((v) => (v === 1 ? 0 : v)));
      expect(bar.k).toEqual(funk.bars[bi].k);
      expect(bar.h).toEqual(funk.bars[bi].h);
    });
  });

  it('crash toggles a crash on the first downbeat only', () => {
    const on = doctor(funk, funkStyle, 'crash', 1);
    expect(on.bars[0].c[0]).toBe(funk.bars[0].c[0] ? 0 : 1);
    expect(doctor(on, funkStyle, 'crash', 1).bars[0].c[0]).toBe(funk.bars[0].c[0]);
    expect(on.bars.slice(1)).toEqual(funk.bars.slice(1));
  });

  it('mirror copies bar 1 onto every other bar', () => {
    const out = doctor(funk, funkStyle, 'mirror', 1);
    for (const bar of out.bars) expect(bar).toEqual(funk.bars[0]);
  });

  it('swap moves the ostinato between hats and ride and flips the voice', () => {
    const out = doctor(funk, funkStyle, 'swap', 1);
    expect(out.voice).toBe(funk.voice === 'hat' ? 'ride' : 'hat');
    funk.bars.forEach((bar, bi) => {
      for (let i = 0; i < bar.h.length; i++) {
        if (bar.h[i]) {
          expect(out.bars[bi].h[i]).toBe(0);
          expect(out.bars[bi].r[i]).toBeGreaterThan(0);
        }
      }
    });
    // swapping twice puts the notes back on the lane they came from
    const back = doctor(out, funkStyle, 'swap', 1);
    back.bars.forEach((bar, bi) => {
      for (let i = 0; i < bar.h.length; i++) expect(!!bar.h[i]).toBe(!!funk.bars[bi].h[i]);
    });
  });

  it('fill writes only into the last bar', () => {
    const out = doctor(funk, funkStyle, 'fill', 3);
    expect(out.bars.slice(0, -1)).toEqual(funk.bars.slice(0, -1));
  });

  it('opens leaves at most one open hat per bar', () => {
    const out = doctor(funk, funkStyle, 'opens', 5);
    for (const bar of out.bars) expect(bar.h.filter((v) => v === 3).length).toBeLessThanOrEqual(1);
  });

  it('reverse run twice in 4/4 gives the pattern back', () => {
    const twice = doctor(doctor(funk, funkStyle, 'reverse', 1), funkStyle, 'reverse', 1);
    expect(twice.bars).toEqual(funk.bars);
  });

  it('flatten leaves no ghosts (L2 has none)', () => {
    const out = doctor(funk, funkStyle, 'flatten', 1);
    for (const bar of out.bars) expect(bar.s.includes(1)).toBe(false);
  });

  it('ghosts+ adds ghosts without removing any note', () => {
    const out = doctor(funk, funkStyle, 'ghosts+', 9);
    let added = 0;
    out.bars.forEach((bar, bi) => {
      for (let i = 0; i < bar.s.length; i++) {
        if (funk.bars[bi].s[i]) expect(bar.s[i]).toBe(funk.bars[bi].s[i]);
        else if (bar.s[i] === 1) added++;
      }
    });
    expect(added).toBeGreaterThan(0);
  });

  it('rejects nothing silently: an unknown move returns an unchanged copy', () => {
    const out = doctor(funk, funkStyle, 'nonsense' as DoctorMove, 1);
    expect(out).toEqual(funk);
    expect(out).not.toBe(funk);
  });
});
