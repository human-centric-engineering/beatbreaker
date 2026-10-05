import { describe, expect, it } from 'vitest';

import { HAT_HEEL_DOWN, hatFootAt, isStomp } from '@/lib/app/breaks/drummer/hat-foot';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';

function chick(time: number, strength = 0.5): Hit {
  return {
    time,
    step: time,
    limb: 'hatFoot',
    lane: 'hf',
    piece: 'hat',
    contact: 'centre',
    strength,
    hat: 'closed',
    sure: true,
  };
}

describe('hatFootAt — holding the hats closed', () => {
  it('keeps the pedal down with no chick coming', () => {
    for (const now of [0, 0.3, 1.1, 2.7]) expect(hatFootAt([], now, 0.4, 1, 0).lift).toBe(0);
  });

  it('keeps the pedal down between chicks, lifting only just before one', () => {
    const chicks = [chick(1), chick(2)];
    for (let now = 1.25; now < 1.75; now += 0.05) {
      expect(hatFootAt(chicks, now, 0, 0, 0).lift).toBeCloseTo(0, 9);
    }
    expect(hatFootAt(chicks, 1.95, 0, 0, 0).lift).toBeGreaterThan(0.2);
  });

  it('has the pedal down at the instant of the chick', () => {
    const chicks = [chick(1), chick(2)];
    expect(hatFootAt(chicks, 2, 0, 0, 0).lift).toBeCloseTo(0, 6);
  });

  it('rocks the heel with the groove: down on the beat, up between', () => {
    const onBeat = hatFootAt([], 5, 0, 1, 0).stance.pitch;
    const between = hatFootAt([], 5, 0.5, 1, 0).stance.pitch;
    expect(onBeat).toBeCloseTo(HAT_HEEL_DOWN.pitch, 6);
    expect(between).toBeGreaterThan(onBeat + 0.1);
  });

  it('keeps the heel still with no groove, and while the hats are open', () => {
    expect(hatFootAt([], 5, 0.5, 0, 0).stance.pitch).toBeCloseTo(HAT_HEEL_DOWN.pitch, 6);
    expect(hatFootAt([], 5, 0.5, 1, 1).stance.pitch).toBeCloseTo(HAT_HEEL_DOWN.pitch, 6);
  });
});

describe('hatFootAt — stomped chicks', () => {
  it('stomps only a loud chick with room either side', () => {
    const close = [chick(1, 1), chick(1.2, 1)];
    expect(isStomp(close, 0)).toBe(false);
    expect(isStomp(close, 1)).toBe(false);
    for (let p = 0; p < 40; p++) expect(isStomp([chick(p * 2, 0.3)], 0)).toBe(false);
  });

  it('stomps some spaced loud chicks and not others', () => {
    const picks = Array.from({ length: 60 }, (_, p) => isStomp([chick(p * 2 + 1, 1)], 0));
    expect(picks.some(Boolean)).toBe(true);
    expect(picks.every(Boolean)).toBe(false);
  });

  it('lifts the heel into a stomp', () => {
    const t = Array.from({ length: 60 }, (_, p) => p * 2 + 1).find((x) =>
      isStomp([chick(x, 1)], 0)
    )!;
    const before = hatFootAt([chick(t, 1)], t - 0.1, 0, 0, 0).stance;
    expect(before.pitch).toBeGreaterThan(HAT_HEEL_DOWN.pitch + 0.2);
  });
});
