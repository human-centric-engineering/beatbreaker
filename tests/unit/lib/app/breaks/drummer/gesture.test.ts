/**
 * The waiting drummer's show (`gesture.ts`): a stick passed between the
 * hands, a wave or a thumbs-up from the free one, the stick taken back —
 * read through the anatomy, frame by frame, from real `poseAt()` poses.
 */

import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { armAngles, torsoOf } from '@/lib/app/breaks/drummer/anatomy/arm';
import { ROM, beyond } from '@/lib/app/breaks/drummer/anatomy/rom';
import {
  BEATS,
  type GestureKind,
  SHOW_LENGTH,
  type Show,
  showAt,
  showOverlaps,
} from '@/lib/app/breaks/drummer/gesture';
import type { Hand } from '@/lib/app/breaks/drummer/kit-layout';
import { gripsFor, poseAt, twirlAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';
import { stepWithHit } from '@/tests/helpers/drummer-fixtures';

const AUDIENCE = new Vector3(0.4, 1.35, -1.6);

/** The first show of each kind from each hand, found by walking the clock. */
function shows(): Show[] {
  const seen = new Map<string, Show>();
  for (let now = 0; now < 2000 && seen.size < 4; now += 0.5) {
    const s = showAt(now, 0);
    if (s) seen.set(`${s.show.kind}:${s.show.giver}`, s.show);
  }
  return [...seen.values()];
}

const ALL = shows();
const idle = new StrokeTimeline();

describe('showAt', () => {
  it('comes now and then, as every kind from either hand', () => {
    const kinds = new Set(ALL.map((s) => `${s.kind}:${s.giver}`));
    for (const kind of ['wave', 'thumbsUp'] as GestureKind[]) {
      for (const hand of ['lead', 'other'] as Hand[])
        expect(kinds.has(`${kind}:${hand}`)).toBe(true);
    }
  });

  it('is the same show whenever it is asked for: seeded from the clock', () => {
    const s = ALL[0];
    const a = showAt(s.start + 1, 0)!;
    const b = showAt(s.start + 1, 0)!;
    expect(a.show).toEqual(b.show);
    expect(a.t).toBeCloseTo(1, 9);
  });

  it('never plays once the groove is in, and fades as it comes in', () => {
    const s = ALL[0];
    expect(showAt(s.start + 2, 1)).toBeNull();
    const coming = showAt(s.start + 2, 0.05)!;
    expect(coming.fade).toBeGreaterThan(0);
    expect(coming.fade).toBeLessThan(1);
  });

  it('never plays with a note anywhere near it', () => {
    const s = ALL[0];
    const busy = new StrokeTimeline();
    busy.ingest(stepWithHit({ lane: 's', value: 1, at: s.start + SHOW_LENGTH + 0.5 }));
    const hits = busy.all().filter((h) => h.limb === 'lead' || h.limb === 'other');
    expect(hits.length).toBeGreaterThan(0);
    expect(showAt(s.start + 2, 0, hits)).toBeNull();
  });

  it('leaves the stick twirls be for a show a note keeps off', () => {
    const s = ALL[0];
    const busy = new StrokeTimeline();
    busy.ingest(stepWithHit({ lane: 's', value: 1, at: s.start + 2 }));
    const hits = busy.all().filter((h) => h.limb === 'lead' || h.limb === 'other');
    expect(showOverlaps(s.start + 1, s.start + 2)).toBe(true);
    expect(showOverlaps(s.start + 1, s.start + 2, hits)).toBe(false);
  });

  it('keeps the stick twirls out of its way', () => {
    for (const s of ALL) {
      expect(showOverlaps(s.start + 1, s.start + 2)).toBe(true);
      for (let t = 0; t <= SHOW_LENGTH; t += 0.1) {
        const tw = twirlAt(s.start + t, 0);
        expect(tw.lead.amount + tw.other.amount).toBe(0);
      }
    }
  });
});

describe('the show, read through the anatomy', () => {
  for (const show of ALL) {
    const keeper: Hand = show.giver === 'lead' ? 'other' : 'lead';
    const label = `${show.kind} from the ${show.giver} hand`;

    it(`keeps every joint of both arms inside its limits: ${label}`, () => {
      for (let t = 0; t <= SHOW_LENGTH; t += 0.02) {
        const pose = poseAt(idle, show.start + t, 0, undefined, AUDIENCE);
        const torso = torsoOf(pose);
        for (const hand of ['lead', 'other'] as const) {
          const a = armAngles(pose.arms[hand], torso, hand);
          const at = `${hand} at ${t.toFixed(2)}`;
          expect(beyond(a.flexion, ROM.elbowFlexion.hard), at).toBe(0);
          expect(beyond(a.pronation, ROM.pronation.hard), at).toBe(0);
          expect(beyond(a.wristFlexion, ROM.wristFlexion.hard), at).toBe(0);
          expect(beyond(a.deviation, ROM.deviation.hard), at).toBe(0);
          expect(beyond(a.rotation, ROM.shoulderRotation.hard), at).toBe(0);
          expect(beyond(a.elevation, ROM.shoulderElevation.hard), at).toBe(0);
        }
      }
    });

    it(`moves smoothly — no stick, wrist or elbow jumps, even as the stick changes hands: ${label}`, () => {
      let was = poseAt(idle, show.start - 0.2, 0, undefined, AUDIENCE);
      for (let t = -0.195; t <= SHOW_LENGTH + 0.2; t += 0.005) {
        const pose = poseAt(idle, show.start + t, 0, undefined, AUDIENCE);
        for (const hand of ['lead', 'other'] as const) {
          for (const part of ['tip', 'wrist', 'elbow'] as const) {
            // 1.6 m/s at most: quick, but a hand's speed, not a cut
            expect(
              pose.arms[hand][part].distanceTo(was.arms[hand][part]),
              `${hand} ${part} at ${t}`
            ).toBeLessThan(0.008);
          }
        }
        was = pose;
      }
    });

    it(`gives the keeper both sticks while the other hand is free: ${label}`, () => {
      const t = (BEATS.gesture[0] + BEATS.gesture[1]) / 2;
      const pose = poseAt(idle, show.start + t, 0, undefined, AUDIENCE);
      const keep = pose.arms[keeper];
      const free = pose.arms[show.giver];
      // the keeper holds its own stick as it always does, and the passed one beside it, side by
      // side the same way, its butt end in the keeper's palm
      expect(keep.grip.distanceTo(keep.wrist)).toBeLessThan(0.15);
      expect(free.stick.dot(keep.stick)).toBeGreaterThan(0.99);
      const butt = free.tip.clone().addScaledVector(free.stick, -0.406);
      const toLine = keep.grip.clone().sub(butt);
      const offLine = toLine.clone().addScaledVector(free.stick, -toLine.dot(free.stick)).length();
      expect(offLine).toBeLessThan(0.025);
      expect(toLine.dot(free.stick)).toBeGreaterThan(0);
      expect(toLine.dot(free.stick)).toBeLessThan(0.06);
      // and the free hand nowhere near its stick, making its gesture
      expect(free.grip.distanceTo(free.wrist)).toBeGreaterThan(0.25);
      expect(free.shape?.then?.kind).toBe(show.kind);
      expect(free.shape?.then?.amount).toBeCloseTo(1, 6);
    });

    it(`looks out at whoever is watching while it gestures, and settles home after: ${label}`, () => {
      const mid = poseAt(
        idle,
        show.start + (BEATS.gesture[0] + BEATS.gesture[1]) / 2,
        0,
        undefined,
        AUDIENCE
      );
      expect(mid.glance.look).toBeCloseTo(1, 6);
      const after = poseAt(idle, show.start + SHOW_LENGTH + 0.01, 0, undefined, AUDIENCE);
      const before = poseAt(idle, show.start - 0.01, 0, undefined, AUDIENCE);
      for (const hand of ['lead', 'other'] as const) {
        expect(after.arms[hand].shape).toBeUndefined();
        // home: the stick back in its own hand, about where it waited before the show
        expect(after.arms[hand].tip.distanceTo(before.arms[hand].tip)).toBeLessThan(0.1);
      }
    });
  }

  it('hands the stick back as Play cuts a show short, smoothly, not leaving it in the wrong hand', () => {
    for (const show of ALL) {
      const at = show.start + (BEATS.gesture[0] + BEATS.gesture[1]) / 2;
      let was = poseAt(idle, at, 0, undefined, AUDIENCE);
      // the groove coming in over a few frames, with the show at its middle
      for (let g = 0.002; g <= 0.2; g += 0.002) {
        const pose = poseAt(idle, at, g, undefined, AUDIENCE);
        for (const hand of ['lead', 'other'] as const) {
          expect(
            pose.arms[hand].tip.distanceTo(was.arms[hand].tip),
            `${hand} at groove ${g}`
          ).toBeLessThan(0.03);
        }
        was = pose;
      }
      // and once it is in, the show is put away: every stick back in its own hand, no shape left
      expect(showAt(at, 0.15)).toBeNull();
      const after = poseAt(idle, at, 0.15, undefined, AUDIENCE);
      for (const hand of ['lead', 'other'] as const) {
        expect(after.arms[hand].shape).toBeUndefined();
        expect(after.arms[hand].grip.distanceTo(after.arms[hand].wrist)).toBeLessThan(0.15);
      }
    }
  });

  it('holds the pass in matched grip, whatever grip the hands play in, and goes back to it after', () => {
    for (const show of ALL) {
      const mid = poseAt(idle, show.start + 3, 0, gripsFor('both'), AUDIENCE);
      expect(mid.arms.lead.held).toBe('matched');
      expect(mid.arms.other.held).toBe('matched');
      const before = poseAt(idle, show.start - 0.5, 0, gripsFor('both'), AUDIENCE);
      expect(before.arms.lead.held).toBe('military');
      expect(before.arms.other.held).toBe('military');
    }
  });

  it('waves with the hand up by the head, and holds a thumbs-up out in front, fist closed', () => {
    for (const show of ALL) {
      const t = (BEATS.gesture[0] + BEATS.gesture[1]) / 2;
      const pose = poseAt(idle, show.start + t, 0, undefined, AUDIENCE);
      const free = pose.arms[show.giver];
      if (show.kind === 'wave') {
        // the hand above the shoulder, the forearm up
        expect(free.wrist.y - free.shoulder.y).toBeGreaterThan(0.18);
        expect(free.wrist.y).toBeGreaterThan(free.elbow.y + 0.15);
      } else {
        // the fist out in front of the shoulder, below it, the forearm level-ish
        expect(free.shoulder.z - free.wrist.z).toBeGreaterThan(0.2);
        expect(free.wrist.y).toBeLessThan(free.shoulder.y);
        // and the thumb straight up: the hand's thumb side faces the sky
        const thumb = new Vector3(show.giver === 'lead' ? 1 : -1, 0, 0).applyQuaternion(free.hand);
        expect(thumb.y).toBeGreaterThan(0.85);
      }
    }
  });
});
