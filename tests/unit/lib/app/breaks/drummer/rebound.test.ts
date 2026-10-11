import { describe, expect, it } from 'vitest';

import {
  type ReboundSpec,
  SIM_MAX,
  clickFlick,
  flight,
  flightTime,
  impactSpeed,
  reboundAt,
  restitution,
  simulate,
  wristLead,
} from '@/lib/app/breaks/drummer/rebound';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';

/**
 * The stick bouncing in the hand. No mocks: every number is the simulation's
 * own, checked against what the physics (and the sources in
 * `.context/app/planning/rebound-research.md`) say it must do.
 */

function on(piece: Hit['piece'], extra: Partial<Hit> = {}): Hit {
  return {
    time: 0,
    step: 0,
    limb: 'lead',
    lane: 's',
    piece,
    contact: 'centre',
    strength: 0.5,
    sure: true,
    ...extra,
  };
}

/** A stretch after a stroke at `v0` m/s, the plan holding the tip at `wait` metres after a short rise. */
function spec(over: Partial<ReboundSpec> = {}, wait = 0.15): ReboundSpec {
  const v0 = over.v0 ?? 3;
  return {
    t0: 0,
    v0,
    f0: 0.12,
    e: restitution(on('snare'), v0),
    plan: (t) => wait * Math.min(1, Math.max(0, t / 0.12)),
    fingers: () => 0.12,
    caught: 0.12,
    tight: 0,
    ...over,
  };
}

describe('restitution', () => {
  it('gives a tom about the 0.73 measured at 6.3 m/s', () => {
    expect(restitution(on('tom1'), 6.3)).toBeCloseTo(0.73, 1);
  });

  it('is livelier on a tight snare than a tom, and on a tom than a slack floor tom', () => {
    const at = (p: Hit['piece']) => restitution(on(p), 3);
    expect(at('snare')).toBeGreaterThan(at('tom1'));
    expect(at('tom1')).toBeGreaterThan(at('floor'));
  });

  it('gives back least on a crash, which swings away, and on a rim, which rings the stick', () => {
    const crash = restitution(on('crash'), 3);
    expect(crash).toBeLessThan(restitution(on('ride'), 3));
    expect(restitution(on('snare', { contact: 'rim' }), 3)).toBeLessThan(
      restitution(on('snare'), 3)
    );
  });

  it('gives less off open hats than closed', () => {
    expect(restitution(on('hat', { hat: 'open' }), 3)).toBeLessThan(
      restitution(on('hat', { hat: 'closed' }), 3)
    );
  });

  it('falls off as the blow gets harder, and never to nothing', () => {
    expect(restitution(on('snare'), 6)).toBeLessThan(restitution(on('snare'), 1));
    expect(restitution(on('floor'), 100)).toBeGreaterThan(0);
  });
});

describe('impactSpeed', () => {
  it('meets the head at forte speed from a foot up, and slowly from an inch', () => {
    expect(impactSpeed(0.3)).toBeGreaterThan(4);
    expect(impactSpeed(0.3)).toBeLessThan(6);
    expect(impactSpeed(0.025)).toBeLessThan(1.5);
  });

  it('grows with height, and is nothing from the head', () => {
    expect(impactSpeed(0.2)).toBeGreaterThan(impactSpeed(0.1));
    expect(impactSpeed(0)).toBe(0);
  });
});

describe('flight', () => {
  it('reaches its top in the time flightTime gives for it', () => {
    const v = 2;
    const top = flight(v);
    // the top: the time to reach it is the time to stop
    expect(flightTime(v, top)).toBeCloseTo(flightTime(v, top * 10), 9);
    // part way up comes sooner than the top
    expect(flightTime(v, top / 2)).toBeLessThan(flightTime(v, top));
  });

  it('slows a loose stick at the tip by about g: its weight about the fulcrum', () => {
    const v = 1;
    const decel = v / flightTime(v, flight(v));
    expect(decel).toBeGreaterThan(6);
    expect(decel).toBeLessThan(12);
  });
});

describe('clickFlick', () => {
  it('rings a clicked stick up and back, and lets it go quiet', () => {
    expect(clickFlick(3, 0.5, 0)).toBe(0);
    expect(clickFlick(3, 0.5, -0.01)).toBe(0);
    expect(clickFlick(3, 0.5, 0.012)).toBeGreaterThan(0.005);
    expect(clickFlick(6, 0.5, 0.012)).toBeGreaterThan(clickFlick(3, 0.5, 0.012));
    expect(Math.abs(clickFlick(3, 0.5, 0.2))).toBeLessThan(0.0005);
  });
});

describe('wristLead', () => {
  it('runs the wrist further ahead the slower the notes, up to a limit', () => {
    expect(wristLead(0.5)).toBeGreaterThan(wristLead(0.1));
    expect(wristLead(10)).toBe(wristLead(20));
    expect(wristLead(Infinity)).toBe(0);
  });
});

describe('simulate', () => {
  it('sends the tip up off the head at the head’s share of the speed it came in with', () => {
    const s = spec();
    const r = simulate(s);
    const rate = (reboundAt(r, 0.003).lift - reboundAt(r, 0.001).lift) / 0.002;
    // (a little more as the wrist stops following through, and the fulcrum with it)
    expect(rate).toBeGreaterThan(s.e * s.v0 * 0.9);
    expect(rate).toBeLessThan(s.e * s.v0 * 1.15);
  });

  it('leaves the hand where it struck while the stick leaps in the fingers', () => {
    const r = simulate(spec());
    const at = reboundAt(r, 0.03);
    expect(at.lift).toBeGreaterThan(0.05);
    // the blow does not reach the hand: it has hardly moved
    expect(Math.abs(at.hand)).toBeLessThan(at.lift / 4);
  });

  it('brings the hand up after the stick, to the height the plan waits at', () => {
    const r = simulate(spec());
    const late = reboundAt(r, 0.5);
    expect(late.hand).toBeGreaterThan(0.1);
    expect(late.lift).toBeCloseTo(0.15, 1);
  });

  it('throws the stick onto the next note: on the head as it sounds, coming down at its speed', () => {
    const next = { t1: 0.5, fall: 0.1, v1: 3, f1: 0.12 };
    const r = simulate(spec({ next }));
    expect(reboundAt(r, 0.5).lift).toBeLessThan(0.001);
    const rate = (reboundAt(r, 0.499).lift - reboundAt(r, 0.495).lift) / 0.004;
    expect(rate).toBeLessThan(-next.v1 * 0.8);
  });

  it('stops a downstroke low: a closed grip gives back less of the rebound than an open one', () => {
    const peak = (tight: number) => {
      const r = simulate(spec({ v0: 4.5, tight }, 0.03));
      let top = 0;
      for (let t = 0; t < 0.3; t += 0.002) top = Math.max(top, reboundAt(r, t).lift);
      return top;
    };
    expect(peak(1)).toBeLessThan(peak(0) * 0.6);
    // closed a moment after the head, then eased once the rebound is stopped
    const grip = simulate(spec({ tight: 1 })).grip;
    expect(Math.max(...grip)).toBeCloseTo(1, 6);
    expect(grip.at(-1)).toBeCloseTo(0, 6);
  });

  it('turns the wrist down before the tip on the throw: the stick follows like a whip', () => {
    // waiting low, then prepared: lifted for the next note before it is thrown
    const next = { t1: 0.8, fall: 0.12, v1: 4, f1: 0.12 };
    const prepared = (t: number) => 0.08 + 0.17 * Math.min(1, Math.max(0, (t - 0.4) / 0.28)) ** 2;
    const r = simulate(spec({ next, plan: (t) => (t < 0.12 ? (0.08 * t) / 0.12 : prepared(t)) }));
    let handTop = { t: 0, y: -Infinity };
    let tipTop = { t: 0, y: -Infinity };
    for (let t = 0.4; t < 0.8; t += 0.002) {
      const at = reboundAt(r, t);
      if (at.hand > handTop.y) handTop = { t, y: at.hand };
      if (at.lift > tipTop.y) tipTop = { t, y: at.lift };
    }
    expect(tipTop.t).toBeGreaterThan(handTop.t);
  });

  it('is the same every time for the same stroke', () => {
    const a = simulate(spec({ next: { t1: 0.4, fall: 0.08, v1: 3, f1: 0.2 } }));
    const b = simulate(spec({ next: { t1: 0.4, fall: 0.08, v1: 3, f1: 0.2 } }));
    expect(Array.from(a.lift)).toEqual(Array.from(b.lift));
  });

  it('with nothing coming, hands over to the plan once the rebound is long settled', () => {
    const s = spec();
    const r = simulate(s);
    const t = SIM_MAX + 0.5;
    expect(reboundAt(r, t).lift).toBeCloseTo(s.plan(t), 9);
  });

  it('simulates only the rebound and the throw of a long wait, and leaves the plan the middle', () => {
    const plan = () => 0.12;
    const next = { t1: 4, fall: 0.1, v1: 3, f1: 0.12 };
    const r = simulate(spec({ next, plan }));
    expect(r.throwAt).toBeDefined();
    expect(reboundAt(r, 2.5).lift).toBeCloseTo(0.12, 6);
    expect(reboundAt(r, 4).lift).toBeLessThan(0.001);
  });
});
