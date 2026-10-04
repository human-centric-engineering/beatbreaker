/**
 * **What you hear, what the MIDI port sends and what the MIDI file holds are
 * one performance.** This is the guard that keeps them so.
 *
 * A pattern with every lane and every value is played through the real
 * `Transport` — swing on, a style feel on, the hats slider up, Humanise on
 * over two passes — with the engine
 * and the MIDI port faked so every call is captured. The same pattern is
 * exported with `buildMidi`. Then:
 *
 * 1. every speaker hit has a MIDI send at the same moment and the same
 *    velocity (the mixer is at unity, so gain is velocity), and
 * 2. every MIDI send is a note in the file, same note number, same velocity,
 *    same position.
 *
 * If a future change voices a note in one place and not the others — a new
 * velocity rule written into the transport, a timing tweak in the exporter —
 * this fails. The fix is to put the rule in `perform.ts`, where all three read
 * it. The companion test below fails fast if either file starts computing
 * dynamics or timing of its own.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BreakAudio } from '@/lib/app/breaks/audio/engine';
import type { MidiSink } from '@/lib/app/breaks/audio/midi-out';
import { Transport, type TransportSnapshot } from '@/lib/app/breaks/audio/transport';
import { generatePattern } from '@/lib/app/breaks/generate';
import { buildMidi } from '@/lib/app/breaks/midi';
import { meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { midiVelocity } from '@/lib/app/breaks/perform';
import type { Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const PPQ_STEP = 120; // buildMidi writes a sixteenth as 120 ticks
const START = 0.08; // where the transport puts the first downbeat

interface Heard {
  when: number;
  vel: number;
}
interface Sent extends Heard {
  note: number;
  until?: number;
}

/** Every lane and every value it has, somewhere in the bar, over a generated groove — 9-iv's too. */
function everything(meter: string): Pattern {
  const p = generatePattern({
    style: testStyle('dilla'),
    meter,
    seed: 21,
    bars: 1,
    density: 70,
    ghosts: 80,
  });
  const bar = p.bars[0];
  const n = bar.k.length;
  bar.h = bar.h.map((_, i) => (i % 4 === 3 ? 2 : i % 8 === 6 ? 3 : 1));
  bar.r = bar.r.map(() => 0);
  bar.r[1] = 1;
  bar.r[5] = 2;
  bar.s[2] = 4;
  bar.s[6] = 3;
  bar.s[7] = 1;
  bar.k[0] = 2;
  bar.c[0] = 1;
  bar.hf[4] = 1;
  bar.t1[n - 4] = 1;
  bar.t2[n - 3] = 2;
  bar.t3[n - 2] = 1;
  bar.p1[3] = 1;
  bar.p2[n - 1] = 2;
  // 9-iv: rimshot, buzz, flam and drag; half-open; crash 2, china, splash; a tom flam
  bar.s[3] = 5;
  bar.s[5] = 8;
  bar.s[9] = 6;
  bar.s[11] = 7;
  bar.h[1] = 4;
  bar.c[2] = 2;
  bar.c[6] = 3;
  bar.c[10] = 4;
  bar.t3[n - 6] = 3;
  return {
    ...p,
    lanes: ['k', 's', 'h', 'r', 'c', 't1', 't2', 't3', 'hf', 'p1', 'p2'],
    perc: { p1: 'conga', p2: 'cowbell' },
  };
}

function play(pat: Pattern, over: Partial<TransportSnapshot>, passes = 1) {
  const ctx = { currentTime: 0 };
  const heard: Heard[] = [];
  /** The fader level each lane's notes went through its channel at. */
  const levels: Array<{ lane: string; level: number }> = [];
  const hear = (when: number, vel: number) => heard.push({ when, vel });
  const audio = {
    ctx,
    init: () => ctx,
    resume: vi.fn(),
    click: vi.fn(),
    kick: vi.fn(hear),
    snare: vi.fn(hear),
    hat: vi.fn(hear),
    ride: vi.fn(hear),
    crash: vi.fn(hear),
    tom: vi.fn(hear),
    perc: vi.fn(hear),
    reseed: vi.fn(),
    playIn: (lane: string, level: number, _t: number, voice: () => void) => {
      levels.push({ lane, level });
      voice();
    },
  };
  const sent: Sent[] = [];
  const midi: MidiSink = {
    hit: (note, vel, when, until) => {
      sent.push({ note, vel, when, until });
    },
  };

  const snap: TransportSnapshot = {
    patterns: { A: pat, B: null },
    arrangement: ['A'],
    solo: null,
    bpm: 120,
    swing: 0,
    feel: 0,
    hats: 100,
    humanise: { amount: 0, seed: 1 },
    click: false,
    clickSub: 4,
    countIn: 0,
    ramp: 0,
    ceiling: 200,
    mix: {},
    mute: {},
    laneSolo: {},
    ...over,
  };
  // a structural fake of the engine's public surface — not external data
  const t = new Transport(audio as unknown as BreakAudio, {
    getSnapshot: () => snap,
    onBpm: vi.fn(),
    onLoop: vi.fn(),
    onPaint: vi.fn(),
    onStop: vi.fn(),
  });
  t.midi = midi;
  t.start();
  const dur = 60 / snap.bpm / 4;
  const steps = stepsOf(meterOf(pat.meter)) * passes;
  while (ctx.currentTime + 0.13 < START + steps * dur - dur / 2) {
    ctx.currentTime += 0.02;
    vi.advanceTimersByTime(25);
  }
  t.stop();
  const inBar = (when: number) => when < START + (steps - 0.5) * dur;
  return {
    heard: heard.filter((h) => inBar(h.when)),
    sent: sent.filter((s) => inBar(s.when)),
    levels,
    dur,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const round = (x: number) => Math.round(x * 1e9) / 1e9;
const byTime = <T extends Heard>(a: T, b: T) => a.when - b.when || a.vel - b.vel;

describe('speakers, live MIDI and the MIDI file play one performance', () => {
  for (const meter of ['4/4', '6/8', '7/8']) {
    for (const over of [
      { swing: 0, feel: 0, hats: 0, humanise: { amount: 0, seed: 1 } },
      { swing: 35, feel: 100, hats: 120, humanise: { amount: 0, seed: 1 } },
      { swing: 35, feel: 100, hats: 120, humanise: { amount: 75, seed: 0xbeef } },
    ]) {
      const passes = over.humanise.amount ? 2 : 1;
      it(`agree note for note in ${meter} at swing ${over.swing}, feel ${over.feel}, hats ${over.hats}, humanise ${over.humanise.amount} over ${passes} pass(es)`, () => {
        const pat = everything(meter);
        const { heard, sent, dur } = play(pat, over, passes);
        expect(sent.length).toBeGreaterThan(20 * passes);

        // 1. the speakers and the port: same moments, same velocities
        expect(heard.map((h) => ({ when: round(h.when), vel: round(h.vel) })).sort(byTime)).toEqual(
          sent.map((s) => ({ when: round(s.when), vel: round(s.vel) })).sort(byTime)
        );

        // 2. the port and the file: same notes, velocities and positions
        const file = buildMidi(
          Array.from({ length: passes }, () => ({ pattern: pat, barIdx: 0 })),
          { bpm: 120, ...over }
        );
        const written = parseNoteOns(file.bytes);
        const fromPort = sent.map((s) => ({
          t: Math.max(0, Math.round(((s.when - START) / dur) * PPQ_STEP)),
          note: s.note,
          vel: midiVelocity(s.vel),
        }));
        const order = (a: { t: number; note: number }, b: { t: number; note: number }) =>
          a.t - b.t || a.note - b.note;
        expect(fromPort.sort(order)).toEqual(written.sort(order));

        if (passes > 1) {
          // Humanise really moved them: the second pass is not the first again
          const perPass = stepsOf(meterOf(pat.meter)) * dur;
          const sorted = [...sent].sort(byTime);
          const half = sorted.length / 2;
          const first = sorted.slice(0, half).map((s) => round(s.when - START));
          const second = sorted.slice(half).map((s) => round(s.when - START - perPass));
          expect(second).not.toEqual(first);
        }
      });
    }
  }

  it('tells the port when each key is struck again, so a grace never releases its stroke', () => {
    const { sent } = play(everything('4/4'), {});
    const snares = sent.filter((s) => s.note === 38).sort(byTime);
    // every snare note before another, within a step, is released before it
    for (let k = 0; k + 1 < snares.length; k++) {
      const [a, b] = [snares[k], snares[k + 1]];
      if (b.when - a.when < 0.04) expect(a.until).toBeLessThanOrEqual(b.when + 1e-9);
    }
    expect(snares.some((s) => s.until !== undefined)).toBe(true);
  });

  it('lets the mixer act on the speakers only, as D23 decided', () => {
    const pat = everything('4/4');
    const { heard, sent, levels } = play(pat, { mute: { s: true }, mix: { h: 0.5 } });
    const SNARE_NOTES = [37, 38, 40]; // cross-stick, snare (and its graces and repeats), rimshot
    const snareSends = sent.filter((s) => SNARE_NOTES.includes(s.note));
    expect(snareSends.length).toBeGreaterThan(0);
    // muted on the speakers, still sent
    expect(heard.length).toBe(sent.length - snareSends.length);
    /* A half fader is the hat channel's level (D39), not half the velocity:
       every note the kit plays has the velocity the port was sent. */
    expect(levels.filter((l) => l.lane === 'h').every((l) => l.level === 0.5)).toBe(true);
    expect(levels.some((l) => l.lane === 'h')).toBe(true);
    const sentVels = sent.filter((s) => !SNARE_NOTES.includes(s.note)).map((s) => s.vel);
    const byValue = (a: number, b: number) => a - b;
    expect(heard.map((h) => h.vel).sort(byValue)).toEqual(sentVels.sort(byValue));
  });
});

/** Note-on events of a format-0 file, with absolute ticks. */
function parseNoteOns(bytes: number[]): Array<{ t: number; note: number; vel: number }> {
  const track = bytes.slice(22);
  const out: Array<{ t: number; note: number; vel: number }> = [];
  let i = 0;
  let t = 0;
  while (i < track.length) {
    let d = 0;
    let b: number;
    do {
      b = track[i++];
      d = (d << 7) | (b & 0x7f);
    } while (b & 0x80);
    t += d;
    const status = track[i++];
    if (status === 0xff) {
      i++; // type
      const len = track[i++];
      i += len;
    } else {
      const note = track[i++];
      const vel = track[i++];
      if ((status & 0xf0) === 0x90) out.push({ t, note, vel });
    }
  }
  return out;
}

describe('nothing voices a note outside perform.ts', () => {
  /* The behavioural test above catches a divergence that a pattern exercises.
     These catch the shape of the mistake before it is exercised: code reaching
     for the dynamics or timing primitives itself, which is how a second,
     private opinion about a note starts — in the transport, the exporter, or
     an output nobody has written yet (a WAV render, a new kind of MIDI out). */
  const read = (file: string): string =>
    readFileSync(path.join(process.cwd(), file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');

  for (const file of ['lib/app/breaks/audio/transport.ts', 'lib/app/breaks/midi.ts']) {
    it(`${file} takes every note from performStep`, () => {
      expect(read(file)).toMatch(/\bperformStep\(/);
    });
  }

  it('calls hatShape, feelOffset and isSwung nowhere but feel.ts and perform.ts', () => {
    const ALLOWED = new Set(['lib/app/breaks/feel.ts', 'lib/app/breaks/perform.ts']);
    const PRIMITIVE = /\b(hatShape|feelOffset|isSwung)\s*\(/;
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(entry.name)) files.push(rel);
      }
    };
    for (const root of ['lib/app', 'components/app', 'app']) walk(root);
    expect(files.length).toBeGreaterThan(50); // the walk really saw the tree

    const offenders = files.filter((f) => !ALLOWED.has(f) && PRIMITIVE.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('keeps Math.random out of the performance: Humanise is the only variation, and it is seeded', () => {
    for (const file of ['lib/app/breaks/perform.ts', 'lib/app/breaks/feel.ts']) {
      expect(read(file), file).not.toMatch(/Math\.random/);
    }
  });

  it('converts a velocity for MIDI in one place', () => {
    for (const file of ['lib/app/breaks/audio/midi-out.ts', 'lib/app/breaks/midi.ts']) {
      const src = read(file);
      expect(src, file).toMatch(/\bmidiVelocity\(/);
      expect(src, file).not.toMatch(/\*\s*127\b/);
    }
  });
});
