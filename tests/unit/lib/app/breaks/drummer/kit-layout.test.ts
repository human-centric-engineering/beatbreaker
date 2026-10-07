import { describe, expect, it } from 'vitest';

import {
  AIM_FROM,
  BELL,
  BELL_SHORT,
  BODY,
  LANE_PIECE,
  type PieceId,
  PIECES,
  CROSS_STICK,
  HOOP,
  RIM_SHOT,
  crossStick,
  rimShot,
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
      expect(pitch).toBeCloseTo(0.32, 9);
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

    it('aims a bell note at the dome from the hand, landing on the bow just short of it', () => {
      const { tip, pitch } = strikeTarget('ride', 'bell');
      const rho = BELL.radius + BELL_SHORT;
      const [dx, dz] = [ride.centre[0] - AIM_FROM.lead[0], ride.centre[2] - AIM_FROM.lead[2]];
      const a = Math.atan2(-dx, -dz);
      const expected = onPiece(ride, [
        rho * Math.sin(a),
        cymbalY(rho, r) + BEAD,
        rho * Math.cos(a),
      ]);
      expect(tip[0]).toBeCloseTo(expected[0], 9);
      expect(tip[1]).toBeCloseTo(expected[1], 9);
      expect(tip[2]).toBeCloseTo(expected[2], 9);
      expect(pitch).toBeCloseTo(0.18, 9);
    });

    it('plays the ride on the outer bow, and a crash at its edge', () => {
      const bow = (id: 'ride' | 'crash', share: number) => {
        const p = PIECES[id];
        const rho = p.radius * share;
        return onPiece(p, [-0.05, cymbalY(rho, p.radius) + BEAD, Math.sqrt(rho * rho - 0.0025)]);
      };
      const ride = strikeTarget('ride', 'centre');
      bow('ride', 0.78).forEach((x, i) => expect(ride.tip[i]).toBeCloseTo(x, 9));
      expect(ride.pitch).toBeCloseTo(0.12, 9);
      const crash = strikeTarget('crash', 'centre');
      bow('crash', 0.92).forEach((x, i) => expect(crash.tip[i]).toBeCloseTo(x, 9));
    });

    it('scatters a bell note round the bow beside the dome, never onto it', () => {
      const ride0 = PIECES.ride.centre;
      for (const sc of [
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ] as const) {
        const a = strikeTarget('ride', 'bell', sc).tip;
        const b = strikeTarget('ride', 'bell').tip;
        expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeGreaterThan(0.005);
        // in the cymbal's plane: well off the dome, on the bow close beside it
        const out = Math.hypot(a[0] - ride0[0], a[2] - ride0[2]);
        expect(out).toBeGreaterThan(BELL.radius + 0.02);
        expect(out).toBeLessThan(BELL.radius + BELL_SHORT * 1.4);
      }
    });

    it('sweeps a ride stroke further side to side than in and out', () => {
      const mark = strikeTarget('ride', 'centre').tip;
      const side = strikeTarget('ride', 'centre', [1, 0]).tip;
      const deep = strikeTarget('ride', 'centre', [0, 1]).tip;
      const dist = (a: readonly number[]) =>
        Math.hypot(a[0] - mark[0], a[1] - mark[1], a[2] - mark[2]);
      expect(dist(side)).toBeGreaterThan(0.05);
      expect(dist(side)).toBeGreaterThan(dist(deep) * 1.5);
    });

    it('moves a crash stroke off its mark by the scatter, staying on the bronze', () => {
      const mark = strikeTarget('crash', 'centre').tip;
      const off = strikeTarget('crash', 'centre', [1, -1]).tip;
      const d = Math.hypot(mark[0] - off[0], mark[1] - off[1], mark[2] - off[2]);
      expect(d).toBeGreaterThan(0.03);
      expect(d).toBeLessThan(0.06);
    });

    it('keeps the hand’s move between bow and bell short', () => {
      const a = strikeTarget('ride', 'centre').tip;
      const b = strikeTarget('ride', 'bell').tip;
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.15);
    });

    it('bell and non-bell contacts land at different pitches on the same piece', () => {
      expect(strikeTarget('crash', 'bell').pitch).not.toBe(strikeTarget('crash', 'centre').pitch);
    });
  });

  describe('hat', () => {
    const hat = PIECES.hat;
    const r = hat.radius;

    it('plays on the outer bow, steeper pitch, for a closed/plain contact', () => {
      const { tip, pitch } = strikeTarget('hat', 'centre');
      const rho = r * 0.72;
      const [x, z] = [0.55 * rho, 0.83 * rho];
      const expected = onPiece(hat, [x, cymbalY(Math.hypot(x, z), r) + BEAD, z]);
      expect(tip[0]).toBeCloseTo(expected[0], 9);
      expect(tip[1]).toBeCloseTo(expected[1], 9);
      expect(tip[2]).toBeCloseTo(expected[2], 9);
      expect(pitch).toBeCloseTo(0.2, 9);
    });

    it('plays out at the edge, flatter pitch, for an edge contact (open/accent)', () => {
      const { tip, pitch } = strikeTarget('hat', 'edge');
      const rho = r * 0.97;
      const [x, z] = [0.55 * rho, 0.83 * rho];
      const expected = onPiece(hat, [x, cymbalY(Math.hypot(x, z), r) + BEAD, z]);
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

describe('crossStick', () => {
  const snare = PIECES.snare;
  const c = snare.centre;
  const up = onPiece(snare, [0, 1, 0]).map((x, k) => x - c[k]);
  /** A point's height off the head, and how far out from its middle it is, in the head's plane. */
  const onHead = (pt: readonly number[]) => {
    const d = pt.map((x, k) => x - c[k]);
    const h = d.reduce((sum, x, k) => sum + x * up[k], 0);
    return { h, rho: Math.hypot(...d.map((x, k) => x - up[k] * h)) };
  };
  const dist = (a: readonly number[], b: readonly number[]) =>
    Math.hypot(...a.map((x, k) => x - b[k]));

  for (const hand of ['other', 'lead'] as const) {
    describe(`the ${hand} hand`, () => {
      const { grip, rim, tip } = crossStick(hand);

      it('lies the stick straight: fulcrum, hoop and tip on one line, held near the butt', () => {
        expect(dist(grip, rim) + dist(rim, tip)).toBeCloseTo(dist(grip, tip), 9);
        // (measured along the level: the stick's slight rise adds a twentieth of a millimetre)
        expect(dist(grip, tip)).toBeCloseTo(CROSS_STICK.reach, 3);
        expect(dist(rim, tip)).toBeCloseTo(CROSS_STICK.over, 3);
      });

      it('rests the shaft on top of the far hoop, the tip just past it', () => {
        const at = onHead(rim);
        expect(at.rho).toBeCloseTo(snare.radius + HOOP.out, 3);
        expect(at.h).toBeCloseTo(HOOP.rise + HOOP.tube + CROSS_STICK.rest, 3);
        expect(onHead(tip).rho).toBeGreaterThan(snare.radius + HOOP.out + 0.04);
      });

      it('has the hand down on the near half of the head, the stick just off it under the palm', () => {
        const at = onHead(grip);
        expect(at.h).toBeCloseTo(CROSS_STICK.grip, 3);
        expect(at.rho).toBeLessThan(snare.radius - 0.03);
        // nearer the drummer than the middle of the head
        expect(grip[2]).toBeGreaterThan(c[2] + 0.05);
        // and rising a little from there to the hoop
        expect(rim[1]).toBeGreaterThan(grip[1]);
      });

      it('runs the stick, seen from above, from where the hand aims from', () => {
        const [fx, , fz] = AIM_FROM[hand];
        const toTip = Math.atan2(tip[0] - fx, tip[2] - fz);
        const toGrip = Math.atan2(grip[0] - fx, grip[2] - fz);
        expect(Math.abs(toTip - toGrip)).toBeLessThan(0.02);
      });
    });
  }
});

describe('rimShot', () => {
  const snare = PIECES.snare;
  const c = snare.centre;
  const up = onPiece(snare, [0, 1, 0]).map((x, k) => x - c[k]);
  const onHead = (pt: readonly number[]) => {
    const d = pt.map((x, k) => x - c[k]);
    const h = d.reduce((sum, x, k) => sum + x * up[k], 0);
    return { h, rho: Math.hypot(...d.map((x, k) => x - up[k] * h)) };
  };

  for (const hand of ['other', 'lead'] as const) {
    describe(`the ${hand} hand`, () => {
      const { tip, rim, pitch } = rimShot(hand);

      it('lands the bead on the head, near the middle', () => {
        const at = onHead(tip);
        expect(at.h).toBeCloseTo(0.006, 4);
        expect(at.rho).toBeLessThan(0.06);
      });

      it('lays the shaft on the near hoop at the same instant', () => {
        const at = onHead(rim);
        expect(at.rho).toBeCloseTo(snare.radius + HOOP.out, 3);
        expect(at.h).toBeCloseTo(HOOP.rise + HOOP.tube + RIM_SHOT.shaft, 3);
        // the hoop on the drummer's side
        expect(rim[2]).toBeGreaterThan(c[2] + 0.1);
        // and the pitch is the line from one to the other
        const run = Math.hypot(tip[0] - rim[0], tip[2] - rim[2]);
        expect(Math.atan2(rim[1] - tip[1], run)).toBeCloseTo(pitch, 9);
      });

      it('comes in far flatter than a stroke on the head', () => {
        expect(Math.abs(pitch)).toBeLessThan(0.1);
        expect(strikeTarget('snare').pitch).toBeGreaterThan(0.25);
      });

      it('comes in, seen from above, from where the hand aims from', () => {
        const [fx, , fz] = AIM_FROM[hand];
        const toTip = Math.atan2(tip[0] - fx, tip[2] - fz);
        const toRim = Math.atan2(rim[0] - fx, rim[2] - fz);
        expect(Math.abs(toTip - toRim)).toBeLessThan(0.02);
      });
    });
  }
});
