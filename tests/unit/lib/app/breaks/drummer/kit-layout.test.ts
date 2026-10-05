import { describe, expect, it } from 'vitest';

import {
  BELL,
  BODY,
  LANE_PIECE,
  type PieceId,
  PIECES,
  cymbalY,
  onPiece,
  strikeTarget,
} from '@/lib/app/breaks/drummer/kit-layout';
import type { LaneKey } from '@/lib/app/breaks/types';

/**
 * The kit layout: the geometry every other drummer module (sticking, timeline,
 * strokes, pose) is ultimately placed against. These tests exercise the real
 * trig and the real piece table — nothing here is mocked — so a regression in
 * the rotation formula, the cymbal profile, or a strike offset shows up here
 * rather than surfacing as "the stick floats off the cymbal" three modules away.
 */

describe('cymbalY', () => {
  it('is the bell height at the centre', () => {
    // rho = 0: cos(0) = 1, 1^0.7 = 1, so y = BELL.height exactly
    expect(cymbalY(0, 0.27)).toBeCloseTo(BELL.height, 9);
  });

  it('falls to (approximately) zero at the edge of the bell, from both sides of the piecewise boundary', () => {
    expect(cymbalY(BELL.radius, 0.27)).toBeCloseTo(0, 6);
    expect(cymbalY(BELL.radius + 1e-9, 0.27)).toBeCloseTo(0, 6);
  });

  it('reaches the bow’s full depression at the physical edge of the cymbal', () => {
    const radius = 0.27;
    // u = 1 at rho = radius, so y = -0.075 * radius * 1^1.3
    expect(cymbalY(radius, radius)).toBeCloseTo(-0.075 * radius, 9);
  });

  it('falls away monotonically from the bell to the edge', () => {
    const radius = 0.27;
    const samples = [0, 0.02, BELL.radius, 0.1, 0.18, radius * 0.74, radius];
    const ys = samples.map((rho) => cymbalY(rho, radius));
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
  });

  it('clamps rho beyond the physical radius rather than diverging', () => {
    const radius = 0.27;
    // u is clamped to 1, so going past the edge gives the same depth as the edge
    expect(cymbalY(radius * 5, radius)).toBeCloseTo(cymbalY(radius, radius), 9);
  });
});

describe('onPiece', () => {
  it('is identity-plus-translate for a piece with no tilt', () => {
    const kick = PIECES.kick; // tilt: [0, 0]
    expect(onPiece(kick, [0, 0, 0])).toEqual(kick.centre);
    const [x, y, z] = onPiece(kick, [1, 2, 3]);
    expect(x).toBeCloseTo(kick.centre[0] + 1, 9);
    expect(y).toBeCloseTo(kick.centre[1] + 2, 9);
    expect(z).toBeCloseTo(kick.centre[2] + 3, 9);
  });

  it('applies the documented rotation order — roll about z, then tilt about x — for a tilted piece', () => {
    const snare = PIECES.snare; // tilt: [0.09, -0.04]
    const [ax, az] = snare.tilt;
    const local: [number, number, number] = [0.05, 0.01, 0.2];
    const [x0, y0, z0] = local;
    const x1 = x0 * Math.cos(az) - y0 * Math.sin(az);
    const y1 = x0 * Math.sin(az) + y0 * Math.cos(az);
    const y2 = y1 * Math.cos(ax) - z0 * Math.sin(ax);
    const z2 = y1 * Math.sin(ax) + z0 * Math.cos(ax);
    const expected = [snare.centre[0] + x1, snare.centre[1] + y2, snare.centre[2] + z2];

    const [x, y, z] = onPiece(snare, local);
    expect(x).toBeCloseTo(expected[0], 9);
    expect(y).toBeCloseTo(expected[1], 9);
    expect(z).toBeCloseTo(expected[2], 9);
  });

  it('always returns the piece centre for the zero local point, whatever the tilt', () => {
    for (const id of Object.keys(PIECES) as PieceId[]) {
      const p = PIECES[id];
      const [x, y, z] = onPiece(p, [0, 0, 0]);
      expect(x).toBeCloseTo(p.centre[0], 9);
      expect(y).toBeCloseTo(p.centre[1], 9);
      expect(z).toBeCloseTo(p.centre[2], 9);
    }
  });

  it('preserves distance from the centre, since the transform is a rotation then a translation', () => {
    const locals: Array<[number, number, number]> = [
      [0.1, 0, 0],
      [0, 0.05, -0.02],
      [0.03, -0.02, 0.07],
    ];
    for (const id of ['snare', 'tom1', 'crash', 'ride'] as PieceId[]) {
      const p = PIECES[id];
      for (const local of locals) {
        const [cx, cy, cz] = p.centre;
        const [x, y, z] = onPiece(p, local);
        const dist = Math.hypot(x - cx, y - cy, z - cz);
        const len = Math.hypot(...local);
        expect(dist).toBeCloseTo(len, 9);
      }
    }
  });
});

/** Documented in kit-layout.ts: "how far above the surface the tip's centre is when it touches: the bead's radius." */
const BEAD = 0.006;

describe('strikeTarget', () => {
  describe('drums (default branch, via the zero-tilt kick)', () => {
    const r = PIECES.kick.radius;
    const [cx, cy, cz] = PIECES.kick.centre;

    it('centre contact: a little in front of centre', () => {
      const { tip, pitch } = strikeTarget('kick', 'centre');
      expect(tip[0]).toBeCloseTo(cx, 9);
      expect(tip[1]).toBeCloseTo(cy + 0.002 + BEAD, 9);
      expect(tip[2]).toBeCloseTo(cz + r * 0.18, 9);
      expect(pitch).toBeCloseTo(0.24, 9);
    });

    it('rim contact: out at the rim, almost flat', () => {
      const { tip, pitch } = strikeTarget('kick', 'rim');
      expect(tip[0]).toBeCloseTo(cx, 9);
      expect(tip[1]).toBeCloseTo(cy + 0.012 + BEAD, 9);
      expect(tip[2]).toBeCloseTo(cz + r * 0.94, 9);
      expect(pitch).toBeCloseTo(0.3, 9);
    });

    it('cross-stick contact: laid across toward the far side, off the head', () => {
      const { tip, pitch } = strikeTarget('kick', 'cross');
      expect(tip[0]).toBeCloseTo(cx + r * 0.3, 9);
      expect(tip[1]).toBeCloseTo(cy + 0.035, 9);
      expect(tip[2]).toBeCloseTo(cz - r * 0.15, 9);
      expect(pitch).toBeCloseTo(0.1, 9);
    });

    it('defaults to centre contact when none is given', () => {
      expect(strikeTarget('kick')).toEqual(strikeTarget('kick', 'centre'));
    });
  });

  describe('cymbals', () => {
    const ride = PIECES.ride;
    const r = ride.radius;

    it('bell contact is the dome, steeper pitch', () => {
      const { tip, pitch } = strikeTarget('ride', 'bell');
      const expected = onPiece(ride, [0, cymbalY(0.03, r) + BEAD, 0.03]);
      expect(tip[0]).toBeCloseTo(expected[0], 9);
      expect(tip[1]).toBeCloseTo(expected[1], 9);
      expect(tip[2]).toBeCloseTo(expected[2], 9);
      expect(pitch).toBeCloseTo(0.35, 9);
    });

    it('non-bell contact is toward the edge, flatter', () => {
      const { tip, pitch } = strikeTarget('ride', 'centre');
      const rho = r * 0.74;
      const expected = onPiece(ride, [
        -0.05,
        cymbalY(rho, r) + BEAD,
        Math.sqrt(rho * rho - 0.0025),
      ]);
      expect(tip[0]).toBeCloseTo(expected[0], 9);
      expect(tip[1]).toBeCloseTo(expected[1], 9);
      expect(tip[2]).toBeCloseTo(expected[2], 9);
      expect(pitch).toBeCloseTo(0.12, 9);
    });

    it('bell and non-bell contacts land at different pitches on the same piece', () => {
      expect(strikeTarget('crash', 'bell').pitch).not.toBe(strikeTarget('crash', 'centre').pitch);
    });
  });

  describe('hat', () => {
    const hat = PIECES.hat;
    const r = hat.radius;

    it('plays closer to centre, lower pitch, for a closed/plain contact', () => {
      const { tip, pitch } = strikeTarget('hat', 'centre');
      const rho = r * 0.55;
      const expected = onPiece(hat, [0.55 * rho, cymbalY(rho, r) + BEAD, 0.83 * rho]);
      expect(tip[0]).toBeCloseTo(expected[0], 9);
      expect(tip[1]).toBeCloseTo(expected[1], 9);
      expect(tip[2]).toBeCloseTo(expected[2], 9);
      expect(pitch).toBeCloseTo(0.2, 9);
    });

    it('plays out at the edge, flatter pitch, for an edge contact (open/accent)', () => {
      const { tip, pitch } = strikeTarget('hat', 'edge');
      const rho = r * 0.97;
      const expected = onPiece(hat, [0.55 * rho, cymbalY(rho, r) + BEAD, 0.83 * rho]);
      expect(tip[0]).toBeCloseTo(expected[0], 9);
      expect(tip[1]).toBeCloseTo(expected[1], 9);
      expect(tip[2]).toBeCloseTo(expected[2], 9);
      expect(pitch).toBeCloseTo(0.06, 9);
    });
  });

  describe('percussion', () => {
    it('plays near the top of the shell, ignoring contact', () => {
      const perc1 = PIECES.perc1;
      const expected = onPiece(perc1, [0, 0.035 + BEAD, 0.01]);
      const { tip, pitch } = strikeTarget('perc1', 'rim');
      expect(tip[0]).toBeCloseTo(expected[0], 9);
      expect(tip[1]).toBeCloseTo(expected[1], 9);
      expect(tip[2]).toBeCloseTo(expected[2], 9);
      expect(pitch).toBeCloseTo(0.25, 9);
    });
  });

  describe('the count-in air piece', () => {
    it('is exactly the piece centre, with a negative (upward-looking) pitch', () => {
      const { tip, pitch } = strikeTarget('sticks');
      expect(tip).toEqual(PIECES.sticks.centre);
      expect(pitch).toBeCloseTo(-0.3, 9);
    });
  });
});

describe('LANE_PIECE', () => {
  it('maps every lane to a piece that actually exists', () => {
    for (const lane of Object.keys(LANE_PIECE) as LaneKey[]) {
      const pieceId = LANE_PIECE[lane];
      expect(PIECES[pieceId]).toBeDefined();
    }
  });

  it('sends both hi-hat lanes (hand and foot) to the same piece', () => {
    expect(LANE_PIECE.h).toBe('hat');
    expect(LANE_PIECE.hf).toBe('hat');
  });

  it('sends the floor tom lane (t3) to the "floor" piece, not a "t3" piece', () => {
    expect(LANE_PIECE.t3).toBe('floor');
  });
});

describe('PIECES', () => {
  it('every entry’s own id matches the key it is stored under', () => {
    for (const key of Object.keys(PIECES) as PieceId[]) {
      expect(PIECES[key].id).toBe(key);
    }
  });
});

describe('BODY', () => {
  it('has positive arm segment lengths, which the IK solver depends on', () => {
    expect(BODY.upperArm).toBeGreaterThan(0);
    expect(BODY.forearm).toBeGreaterThan(0);
  });
});
