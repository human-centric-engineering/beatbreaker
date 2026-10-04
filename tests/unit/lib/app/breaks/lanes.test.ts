/**
 * `mixLanes`: the lanes the mixer shows (task 5.12). Every lane either
 * section plays, so a lane only B uses can be muted or soloed too.
 *
 * @see lib/app/breaks/lanes.ts
 */

import { describe, expect, it } from 'vitest';

import { activeLanes, DEFAULT_PAN, LANES, mixLanes, panFor } from '@/lib/app/breaks/lanes';

describe('mixLanes', () => {
  it('is every lane A or B plays, once each, in lane order', () => {
    expect(mixLanes(['k', 's', 'h'], ['k', 's', 'h', 'p1'])).toEqual(
      activeLanes(['k', 's', 'h', 'p1'])
    );
    expect(mixLanes(['p1', 'k'], ['s'])).toEqual(activeLanes(['k', 's', 'p1']));
  });

  it('falls back to the base lanes for a section with none listed, as activeLanes does', () => {
    expect(mixLanes(undefined, undefined)).toEqual(activeLanes(undefined));
  });
});

describe('panFor (Phase 9)', () => {
  it('places every lane, inside a narrow spread', () => {
    for (const lane of LANES) {
      expect(DEFAULT_PAN[lane]).toBeDefined();
      expect(Math.abs(panFor(lane, 'drummer'))).toBeLessThanOrEqual(0.4);
    }
  });

  it('puts the hats left and the ride right from the stool, and mirrors them out front', () => {
    expect(panFor('h', 'drummer')).toBeLessThan(0);
    expect(panFor('r', 'drummer')).toBeGreaterThan(0);
    for (const lane of LANES) expect(panFor(lane, 'audience')).toBe(-panFor(lane, 'drummer'));
  });

  it('keeps the kick centred, and centres a lane it does not know', () => {
    expect(panFor('k', 'drummer')).toBe(0);
    expect(Math.abs(panFor('nope', 'audience'))).toBe(0);
  });

  it("takes a kit's own pan for a lane it names, mirrored the same way, and the default for the rest (9-v)", () => {
    const pans = { h: 0.7 };
    expect(panFor('h', 'drummer', pans)).toBe(0.7);
    expect(panFor('h', 'audience', pans)).toBe(-0.7);
    expect(panFor('r', 'drummer', pans)).toBe(DEFAULT_PAN.r);
  });
});
