import { describe, expect, it } from 'vitest';

import { CAMERA_VIEWS, CAMERA_LABELS, cameraFor } from '@/lib/app/breaks/drummer/camera';

/**
 * The camera's set shots. Written for the right-handed kit; a lefty mirrors
 * every shot in x. `-0` and `0` are numerically the same position, but are
 * NOT `Object.is`-identical, so these tests compare with `toBeCloseTo` rather
 * than `toBe` wherever a mirrored x-coordinate could legitimately land on
 * zero — a `toBe(0)` there would be a false failure, not a real one.
 */

describe('cameraFor', () => {
  it('returns the shot unchanged for a right-handed kit', () => {
    const shot = cameraFor('front', false);
    expect(shot.position[0]).toBeCloseTo(1.25, 9);
    expect(shot.position[1]).toBeCloseTo(1.55, 9);
    expect(shot.position[2]).toBeCloseTo(-2.55, 9);
    expect(shot.target).toEqual([0, 0.82, -0.28]);
  });

  it('mirrors x (and only x) for a lefty, for every camera view', () => {
    for (const view of CAMERA_VIEWS) {
      const righty = cameraFor(view, false);
      const lefty = cameraFor(view, true);

      expect(lefty.position[0]).toBeCloseTo(-righty.position[0], 9);
      expect(lefty.position[1]).toBeCloseTo(righty.position[1], 9);
      expect(lefty.position[2]).toBeCloseTo(righty.position[2], 9);

      expect(lefty.target[0]).toBeCloseTo(-righty.target[0], 9);
      expect(lefty.target[1]).toBeCloseTo(righty.target[1], 9);
      expect(lefty.target[2]).toBeCloseTo(righty.target[2], 9);
    }
  });

  it('mirrors a specific non-zero shot concretely (the hands view)', () => {
    const righty = cameraFor('hands', false);
    const lefty = cameraFor('hands', true);
    expect(righty.position).toEqual([-0.62, 1.5, 0.5]);
    expect(lefty.position).toEqual([0.62, 1.5, 0.5]);
    expect(righty.target).toEqual([-0.1, 0.82, -0.22]);
    expect(lefty.target).toEqual([0.1, 0.82, -0.22]);
  });

  it('every camera view has a human-readable label', () => {
    for (const view of CAMERA_VIEWS) {
      expect(typeof CAMERA_LABELS[view]).toBe('string');
      expect(CAMERA_LABELS[view].length).toBeGreaterThan(0);
    }
  });
});
