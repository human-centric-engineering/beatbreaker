/**
 * `mixLanes`: the lanes the mixer shows (task 5.12). Every lane either
 * section plays, so a lane only B uses can be muted or soloed too.
 *
 * @see lib/app/breaks/lanes.ts
 */

import { describe, expect, it } from 'vitest';

import { activeLanes, mixLanes } from '@/lib/app/breaks/lanes';

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
