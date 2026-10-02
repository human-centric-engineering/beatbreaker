/**
 * **What you hear, what the MIDI port sends and what the MIDI file holds are
 * one performance.** This is the guard that keeps them so.
 *
 * A pattern with every lane and every value is played through the real
 * `Transport` — swing on, a style feel on, the hats slider up — with the engine
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
}

/** Every lane and every value it has, somewhere in the bar, over a generated groove. */
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
  return {
    ...p,
    lanes: ['k', 's', 'h', 'r', 'c', 't1', 't2', 't3', 'hf', 'p1', 'p2'],
    perc: { p1: 'conga', p2: 'cowbell' },
  };
}

function play(pat: Pattern, over: Partial<TransportSnapshot>) {
  const ctx = { currentTime: 0 };
  const heard: Heard[] = [];
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
  };
  const sent: Sent[] = [];
  const midi: MidiSink = {
    hit: (note, vel, when) => {
      sent.push({ note, vel, when });
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
  const steps = stepsOf(meterOf(pat.meter));
  while (ctx.currentTime + 0.13 < START + steps * dur - dur / 2) {
    ctx.currentTime += 0.02;
    vi.advanceTimersByTime(25);
  }
  t.stop();
  const inBar = (when: number) => when < START + (steps - 0.5) * dur;
  return {
    heard: heard.filter((h) => inBar(h.when)),
    sent: sent.filter((s) => inBar(s.when)),
    dur,
  };
}

/** A fixed wobble, so the two runs of the hats slider's randomness roll the same. */
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.37);
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
      { swing: 0, feel: 0, hats: 0 },
      { swing: 35, feel: 100, hats: 120 },
    ]) {
      it(`agree note for note in ${meter} at swing ${over.swing}, feel ${over.feel}, hats ${over.hats}`, () => {
        const pat = everything(meter);
        const { heard, sent, dur } = play(pat, over);
        expect(sent.length).toBeGreaterThan(20);

        // 1. the speakers and the port: same moments, same velocities
        expect(heard.map((h) => ({ when: round(h.when), vel: round(h.vel) })).sort(byTime)).toEqual(
          sent.map((s) => ({ when: round(s.when), vel: round(s.vel) })).sort(byTime)
        );

        // 2. the port and the file: same notes, velocities and positions
        const file = buildMidi([{ pattern: pat, barIdx: 0 }], { bpm: 120, ...over });
        const written = parseNoteOns(file.bytes);
        const fromPort = sent.map((s) => ({
          t: Math.max(0, Math.round(((s.when - START) / dur) * PPQ_STEP)),
          note: s.note,
          vel: midiVelocity(s.vel),
        }));
        const order = (a: { t: number; note: number }, b: { t: number; note: number }) =>
          a.t - b.t || a.note - b.note;
        expect(fromPort.sort(order)).toEqual(written.sort(order));
      });
    }
  }

  it('lets the mixer act on the speakers only, as D23 decided', () => {
    const pat = everything('4/4');
    const { heard, sent } = play(pat, { mute: { s: true }, mix: { h: 0.5 } });
    const snareSends = sent.filter((s) => s.note === 38 || s.note === 37);
    expect(snareSends.length).toBeGreaterThan(0);
    // muted on the speakers, still sent; and a half fader halves only what is heard
    expect(heard.length).toBe(sent.length - snareSends.length);
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

  it('converts a velocity for MIDI in one place', () => {
    for (const file of ['lib/app/breaks/audio/midi-out.ts', 'lib/app/breaks/midi.ts']) {
      const src = read(file);
      expect(src, file).toMatch(/\bmidiVelocity\(/);
      expect(src, file).not.toMatch(/\*\s*127\b/);
    }
  });
});
