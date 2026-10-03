/**
 * `performStep` — the one place a written note becomes a sound. Everything that
 * plays a pattern (speakers, live MIDI, the MIDI file) voices from it, so these
 * are the rules all three follow: the accent bands, the shaping, the ride
 * shaped as the hats are, feathering, swing and feel, Humanise, and the
 * inverse the MIDI reader uses.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { generatePattern } from '@/lib/app/breaks/generate';
import { Humaniser } from '@/lib/app/breaks/humanise';
import { LANES } from '@/lib/app/breaks/lanes';
import { METER_KEYS } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';
import {
  ACCENT_CYMBAL_MIN,
  LEVELS,
  MIDI_MAP,
  PLAIN_CYMBAL_MAX,
  midiVelocity,
  performStep,
  valueForVelocity,
} from '@/lib/app/breaks/perform';
import type { Bar, Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const FLAT = { swing: 0, feel: 0, hats: 100 };

function patternWith(meter: string, fill: (bar: Bar) => void, style = 'funk'): Pattern {
  const p = generatePattern({
    style: testStyle(style),
    meter,
    seed: 5,
    bars: 1,
    density: 50,
    ghosts: 0,
  });
  const bar = emptyBar(p.bars[0].k.length);
  fill(bar);
  return { ...p, bars: [bar] };
}

const voicesOf = (p: Pattern, opts = FLAT) =>
  p.bars[0].k.map((_, i) => performStep(p, p.bars[0], i, opts));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the hi-hat and ride bands', () => {
  it('keeps every written accent and ride bell on the loud side, and every plain note on the quiet side', () => {
    for (const meter of METER_KEYS) {
      const p = patternWith(meter, (bar) => {
        bar.h = bar.h.map((_, i) => (i % 2 ? 2 : i % 4 ? 1 : 3));
        bar.r = bar.r.map((_, i) => (i % 3 ? 1 : 2));
      });
      for (const hats of [0, 50, 100, 150]) {
        for (let run = 0; run < 5; run++) {
          voicesOf(p, { ...FLAT, hats }).forEach((voices, i) => {
            for (const v of voices) {
              const loud = (v.lane === 'h' && p.bars[0].h[i] === 2) || v.bell;
              const where = `${meter} hats ${hats} step ${i} ${v.lane}`;
              if (loud) expect(v.velocity, where).toBeGreaterThanOrEqual(ACCENT_CYMBAL_MIN);
              else if (v.lane === 'h' || v.lane === 'r')
                expect(v.velocity, where).toBeLessThanOrEqual(PLAIN_CYMBAL_MAX);
            }
          });
        }
      }
    }
  });

  it('never flattens a plain hat: the band only lifts accents', () => {
    const p = patternWith('4/4', (bar) => {
      bar.h = bar.h.map(() => 1);
    });
    for (const hats of [0, 100, 150]) {
      for (let run = 0; run < 20; run++) {
        for (const [v] of voicesOf(p, { ...FLAT, hats })) {
          expect(v.velocity).toBeLessThan(PLAIN_CYMBAL_MAX);
        }
      }
    }
  });
});

describe('the shaping', () => {
  it('shapes plain hats by where they fall in the beat, and is machine-even at 0', () => {
    const p = patternWith('4/4', (bar) => {
      bar.h = bar.h.map(() => 1);
    });
    const v = voicesOf(p).map(([x]) => x.velocity);
    expect(v[0]).toBeGreaterThan(v[2]); // beat 1 over its "+"
    expect(v[2]).toBeGreaterThan(v[1]); // the "+" over the "e"
    expect(new Set(voicesOf(p, { ...FLAT, hats: 0 }).map(([x]) => x.velocity)).size).toBe(1);
  });

  it('shapes the ride exactly as it shapes the hats', () => {
    for (const meter of ['4/4', '6/8', '7/8']) {
      const p = patternWith(meter, (bar) => {
        bar.h = bar.h.map(() => 1);
        bar.r = bar.r.map(() => 1);
      });
      for (const hats of [50, 100, 150]) {
        for (const voices of voicesOf(p, { ...FLAT, hats })) {
          const h = voices.find((v) => v.lane === 'h');
          const r = voices.find((v) => v.lane === 'r');
          // the same shape on each, so the ratio is the two base levels, on every step
          expect((r?.velocity ?? 0) / (h?.velocity ?? 1)).toBeCloseTo(LEVELS.r[1] / LEVELS.h[1], 9);
        }
      }
    }
  });

  it('feathers a plain kick on the pulse, and leaves an accent alone', () => {
    const p = patternWith('4/4', (bar) => {
      bar.k[0] = 1;
      bar.k[2] = 1;
      bar.k[4] = 2;
    });
    p.attrs = { ...p.attrs, kickFeather: 0.35 };
    const [[onPulse], , [offPulse], , [accent]] = voicesOf(p);
    expect(onPulse.velocity).toBeCloseTo(LEVELS.k[1] * 0.35, 9);
    expect(offPulse.velocity).toBe(LEVELS.k[1]);
    expect(accent.velocity).toBe(LEVELS.k[2]);
  });
});

describe('timing', () => {
  it('swings the off-beats by the slider, and leaves the beat on the grid', () => {
    const p = patternWith('4/4', (bar) => {
      bar.k = bar.k.map(() => 1);
    });
    p.attrs = {};
    const v = voicesOf(p, { ...FLAT, swing: 50 }).map(([x]) => x.offset);
    expect(v[0]).toBe(0);
    expect(v[1]).toBeCloseTo(0.5 * 0.66, 9);
  });

  it('adds the style feel per lane, scaled by the feel slider', () => {
    const p = patternWith(
      '4/4',
      (bar) => {
        bar.s[4] = 2;
        bar.k[4] = 1;
      },
      'dilla'
    );
    const at100 = performStep(p, p.bars[0], 4, { ...FLAT, feel: 100 });
    const at0 = performStep(p, p.bars[0], 4, { ...FLAT, feel: 0 });
    const snare = at100.find((v) => v.lane === 's');
    const kick = at100.find((v) => v.lane === 'k');
    expect(snare?.offset).toBeGreaterThan(0); // Dilla's snare sits behind
    expect(snare?.offset).not.toBe(kick?.offset);
    expect(at0.every((v) => v.offset === 0)).toBe(true);
  });
});

describe('notes and flags', () => {
  it('voices every lane and value with its GM note and the engine flags', () => {
    const p = patternWith('4/4', (bar) => {
      bar.s[0] = 1;
      bar.s[1] = 4;
      bar.h[2] = 3;
      bar.r[3] = 2;
      bar.hf[4] = 1;
      bar.p1[5] = 2;
    });
    const all = voicesOf(p).flat();
    expect(all.find((v) => v.ghost)?.note).toBe(MIDI_MAP.s);
    expect(all.find((v) => v.cross)?.note).toBe(MIDI_MAP.sCross);
    expect(all.find((v) => v.open)?.note).toBe(MIDI_MAP.hOpen);
    expect(all.find((v) => v.bell)?.note).toBe(MIDI_MAP.rBell);
    expect(all.find((v) => v.pedal)?.velocity).toBe(LEVELS.hf[1]);
    expect(all.find((v) => v.perc)?.perc?.accent).toBe(true);
  });
});

describe('humanise', () => {
  /** Every lane, every value, over a 4/4 bar. */
  const everyValue = () =>
    patternWith('4/4', (bar) => {
      bar.k = bar.k.map((_, i) => (i % 4 === 0 ? 1 + (i % 8 ? 1 : 0) : 0));
      bar.s = bar.s.map((_, i) => [0, 1, 2, 3, 4][i % 5]);
      bar.h = bar.h.map((_, i) => 1 + (i % 3));
      bar.r = bar.r.map((_, i) => (i % 2 ? 1 + ((i >> 1) % 2) : 0));
      bar.c[0] = 1;
      bar.hf = bar.hf.map((_, i) => (i % 4 === 2 ? 1 : 0));
      for (const t of ['t1', 't2', 't3'] as const) bar[t] = bar[t].map((_, i) => (i % 2) + 1);
      bar.p1 = bar.p1.map((_, i) => (i % 2) + 1);
      bar.p2 = bar.p2.map((_, i) => ((i + 1) % 2) + 1);
    });

  it('is exactly the grid at Amount 0', () => {
    const p = everyValue();
    const humanise = { stream: new Humaniser(9), amount: 0, bpm: 100 };
    expect(voicesOf(p, { ...FLAT, humanise })).toEqual(voicesOf(p));
  });

  it('never moves a note out of its value: a ghost stays a ghost, an accent an accent', () => {
    const p = everyValue();
    const bar = p.bars[0];
    const humanise = { stream: new Humaniser(10), amount: 100, bpm: 100 };
    let moved = 0;
    for (let pass = 0; pass < 200; pass++) {
      voicesOf(p, { ...FLAT, humanise }).forEach((voices, i) => {
        const grid = performStep(p, bar, i, FLAT);
        voices.forEach((v, n) => {
          if (v.velocity !== grid[n].velocity) moved++;
          const where = `pass ${pass} step ${i} ${v.lane}`;
          if (v.lane === 's' && v.cross) return; // a note of its own
          const written = v.lane === 'h' && bar.h[i] === 3 ? 1 : bar[v.lane][i];
          expect(valueForVelocity(v.lane, midiVelocity(v.velocity)), where).toBe(
            v.lane === 'h' || v.lane === 'r' ? (written === 2 ? 2 : 1) : written
          );
        });
      });
    }
    expect(moved).toBeGreaterThan(1000); // it did vary them
  });

  it('turns milliseconds into steps at the tempo', () => {
    const p = patternWith('4/4', (bar) => {
      bar.k[0] = 1;
    });
    const at = (bpm: number) =>
      performStep(p, p.bars[0], 0, {
        ...FLAT,
        humanise: { stream: new Humaniser(3), amount: 100, bpm },
      })[0].offset;
    const ms = new Humaniser(3).next('k', 100).ms;
    expect(at(120)).toBeCloseTo(ms / 125, 10); // a sixteenth at 120 is 125 ms
    expect(at(60)).toBeCloseTo(ms / 250, 10);
  });
});

describe('valueForVelocity — the reader’s inverse', () => {
  it('reads every level each lane plays back as the value that played it', () => {
    for (const lane of LANES) {
      if (lane === 'h' || lane === 'r') continue;
      LEVELS[lane].forEach((level, value) => {
        if (value === 0 || (lane === 's' && value === 4)) return;
        expect(valueForVelocity(lane, midiVelocity(level)), `${lane} ${value}`).toBe(value);
      });
    }
  });

  it('reads a hi-hat by which side of the band it is on', () => {
    expect(valueForVelocity('h', midiVelocity(PLAIN_CYMBAL_MAX))).toBe(1);
    expect(valueForVelocity('h', midiVelocity(ACCENT_CYMBAL_MIN))).toBe(2);
    expect(valueForVelocity('h', 40)).toBe(1);
  });

  it('reads a feathered kick as a kick, not as nothing', () => {
    expect(valueForVelocity('k', midiVelocity(LEVELS.k[1] * 0.35))).toBe(1);
  });
});
