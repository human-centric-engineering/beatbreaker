/**
 * The brush sweep: on a kit played with brushes, the other hand keeps its
 * brush on the snare head and sweeps it across in time between its own
 * notes. Fed through a real `StrokeTimeline` as the scheduler feeds it.
 */

import { describe, expect, it } from 'vitest';

import { PIECES, onPiece } from '@/lib/app/breaks/drummer/kit-layout';
import { poseAt, sweepAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';
import type { Bar } from '@/lib/app/breaks/types';
import { M44, emptyBar } from '@/tests/helpers/drummer-fixtures';

/** 100 bpm in sixteenths: a beat is 0.6 s. */
const DUR = 60 / 100 / 4;
const BEAT = DUR * 4;

/** Brush time: the ride on the quarters, the foot hat on 2 and 4, the kick on 1. */
function brushTime(snareOn: number[] = []): Bar {
  const bar = emptyBar(16);
  for (const i of [0, 4, 8, 12]) bar.r[i] = 1;
  for (const i of [4, 12]) bar.hf[i] = 1;
  for (const i of snareOn) bar.s[i] = 1;
  bar.k[0] = 1;
  return bar;
}

/** The timeline as it stands at `now`: every step up to it heard, from the top. */
function heardTo(now: number, bar: Bar, stopAt = Infinity): StrokeTimeline {
  const tl = new StrokeTimeline();
  for (let i = 0; ; i++) {
    const at = i * DUR;
    if (at > Math.min(now + 0.05, stopAt)) break;
    const slot = i % 16;
    const notes = (Object.keys(bar) as (keyof Bar)[])
      .filter((l) => bar[l][slot])
      .map((lane) => ({ voice: { lane, note: 60, velocity: 0.7, offset: 0 }, when: at }));
    // the last bar, when it stops: nothing after it to forecast
    const last = stopAt < Infinity;
    tl.ingest({ t: at, dur: DUR, slot, meter: M44, bar, next: last ? null : bar, notes });
  }
  return tl;
}

const sweep = (tl: StrokeTimeline, now: number) => sweepAt(tl, tl.all(), tl.forLimb('other'), now);

describe('sweepAt', () => {
  it('sweeps nothing before the music has started', () => {
    const tl = new StrokeTimeline();
    expect(sweep(tl, 0).share).toBe(0);
  });

  it('keeps the brush on the head, sweeping it across one way each beat, the other way the next', () => {
    const bar = brushTime();
    const at = (beats: number) => {
      const now = 5 * BEAT + beats * BEAT;
      return sweep(heardTo(now, bar), now);
    };
    const [a, mid, b] = [at(0), at(0.5), at(1)];
    for (const s of [a, mid, b]) expect(s.share).toBeCloseTo(1, 6);
    // on the head: the wires lying on it
    const head = onPiece(PIECES.snare, [0, 0, 0])[1];
    // (the snare is tilted toward the player, so a little either side of its middle's height)
    for (const s of [a, mid, b]) expect(Math.abs(s.target.tip.y - head)).toBeLessThan(0.01);
    // an end of the sweep on each beat, the two ends a hand's width and more apart
    expect(Math.abs(a.target.tip.x - b.target.tip.x)).toBeGreaterThan(0.12);
    // and through the middle between them, bowed toward the player
    expect(mid.target.tip.x).toBeCloseTo((a.target.tip.x + b.target.tip.x) / 2, 3);
    expect(mid.target.tip.z).not.toBeCloseTo(a.target.tip.z, 3);
    // a brush lies flatter than a stick comes down
    expect(mid.target.pitch).toBeLessThan(0.2);
  });

  it('takes two beats over each way at a fast tempo', () => {
    const bar = brushTime();
    const fast = 60 / 240 / 4;
    const tl = new StrokeTimeline();
    for (let i = 0; i * fast <= 4 + 0.05; i++) {
      const slot = i % 16;
      const notes = (Object.keys(bar) as (keyof Bar)[])
        .filter((l) => bar[l][slot])
        .map((lane) => ({ voice: { lane, note: 60, velocity: 0.7, offset: 0 }, when: i * fast }));
      tl.ingest({ t: i * fast, dur: fast, slot, meter: M44, bar, next: bar, notes });
    }
    const beat = fast * 4;
    const now = 16 * beat;
    const x = (beats: number) => sweep(tl, now + beats * beat).target.tip.x;
    // a beat on, it is in the middle; two on, at the other end
    expect(Math.abs(x(1) - (x(0) + x(2)) / 2)).toBeLessThan(0.005);
    expect(Math.abs(x(0) - x(2))).toBeGreaterThan(0.12);
  });

  it('lets the hand go to play a note of its own, and picks the sweep up after', () => {
    const bar = brushTime([2]);
    const tl = heardTo(6 * BEAT + 2 * DUR + 0.3, bar);
    const own = tl.forLimb('other').filter((h) => h.piece === 'snare');
    expect(own.length).toBeGreaterThan(0);
    const note = own[own.length - 1].time;
    expect(sweep(tl, note).share).toBe(0);
    expect(sweep(tl, note + 0.3).share).toBeCloseTo(1, 6);
  });

  it('stops sweeping when the band stops, at the end of the last bar', () => {
    const bar = brushTime();
    // the last step of the second bar
    const stop = 31 * DUR;
    const tl = heardTo(stop, bar, stop);
    expect(sweep(tl, stop + 0.2).share).toBeGreaterThan(0.9);
    expect(sweep(tl, stop + 3).share).toBe(0);
  });

  it('stops sweeping when the transport stops and the timeline is cleared', () => {
    const tl = heardTo(3, brushTime());
    expect(sweep(tl, 3).share).toBeGreaterThan(0.9);
    tl.reset();
    expect(sweep(tl, 3).share).toBe(0);
  });

  it('eases out with the groove at Stop, whatever the clock says of the notes', () => {
    const tl = heardTo(5 * BEAT, brushTime());
    const at = 5 * BEAT;
    const full = sweepAt(tl, tl.all(), tl.forLimb('other'), at).share;
    expect(full).toBeGreaterThan(0.9);
    expect(sweepAt(tl, tl.all(), tl.forLimb('other'), at, 0.5).share).toBeCloseTo(full * 0.5, 6);
    expect(sweepAt(tl, tl.all(), tl.forLimb('other'), at, 0).share).toBe(0);
  });
});

describe('poseAt with brushes', () => {
  const bar = brushTime();
  const otherTip = (now: number, brushes: boolean) =>
    poseAt(heardTo(now, bar), now, 1, undefined, undefined, brushes).arms.other.tip;

  it('has the other hand’s brush on the snare, moving across it from beat to beat', () => {
    const head = onPiece(PIECES.snare, [0, 0, 0])[1];
    const a = otherTip(5 * BEAT, true);
    const b = otherTip(6 * BEAT, true);
    for (const tip of [a, b]) expect(Math.abs(tip.y - head)).toBeLessThan(0.012);
    expect(Math.abs(a.x - b.x)).toBeGreaterThan(0.1);
  });

  it('leaves the other hand as it was with sticks', () => {
    const a = otherTip(5 * BEAT, false);
    const b = otherTip(6 * BEAT, false);
    expect(a.distanceTo(b)).toBeLessThan(0.05);
  });
});
