/**
 * The grip guide's lessons (`grip-guide.ts`): each grip's steps, and the arms
 * that play them — the drummer's own hands, inside their joints' ranges,
 * closing on the stick a finger at a time and ending in the grip the drummer
 * at the kit plays.
 */

import { describe, expect, it } from 'vitest';

import { armAngles, torsoOf } from '@/lib/app/breaks/drummer/anatomy/arm';
import { handSetOf } from '@/lib/app/breaks/drummer/anatomy/hand';
import { armStrain } from '@/lib/app/breaks/drummer/anatomy/rom';
import {
  GUIDE_CHOICE,
  GUIDE_GRIPS,
  guideAt,
  guideFor,
  lessonLength,
  lessonOf,
  stepStart,
} from '@/lib/app/breaks/drummer/grip-guide';
import { gripsFor } from '@/lib/app/breaks/drummer/grips';
import { poseAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';

const NONE = torsoOf({ lean: 0, yaw: 0, roll: 0 });

describe('lessonOf', () => {
  it('teaches each grip in the steps wikiHow gives, a caption for each', () => {
    const titles = (g: (typeof GUIDE_GRIPS)[number]) => lessonOf(g).steps.map((s) => s.title);
    expect(titles('american')).toEqual([
      'Make a pocket',
      'Stick under the first finger',
      'Find the balance point',
      'Thumb along the side',
      'Curl the back fingers',
      'The other hand the same',
      'Play from the wrist',
    ]);
    expect(titles('german')).toContain('Palms flat to the head');
    expect(titles('french')).toContain('Palms facing each other');
    expect(titles('traditional')).toContain('Stick in the crook');
    for (const g of GUIDE_GRIPS) {
      const lesson = lessonOf(g);
      expect(lesson.title).toMatch(/grip$/);
      for (const s of lesson.steps) {
        expect(s.caption.length).toBeGreaterThan(40);
        expect(s.seconds).toBeGreaterThan(2);
      }
    }
  });

  it('times the steps end to end', () => {
    for (const g of GUIDE_GRIPS) {
      const steps = lessonOf(g).steps;
      expect(stepStart(g, 0)).toBe(0);
      expect(stepStart(g, steps.length)).toBeCloseTo(lessonLength(g), 9);
      expect(stepStart(g, 2)).toBeCloseTo(steps[0].seconds + steps[1].seconds, 9);
    }
  });
});

describe('guideFor', () => {
  it('teaches the grip the drummer plays, traditional in both hands as traditional', () => {
    expect(guideFor('american')).toBe('american');
    expect(guideFor('german')).toBe('german');
    expect(guideFor('french')).toBe('french');
    expect(guideFor('traditional')).toBe('traditional');
    expect(guideFor('traditionalBoth')).toBe('traditional');
    for (const g of GUIDE_GRIPS) expect(guideFor(GUIDE_CHOICE[g])).toBe(g);
  });
});

describe('guideAt', () => {
  it('says which step is playing, and loops', () => {
    const second = stepStart('american', 1);
    expect(guideAt('american', second + 0.01).step).toBe(1);
    expect(guideAt('american', second - 0.01).step).toBe(0);
    expect(guideAt('american', lessonLength('american') + 0.01).step).toBe(0);
    const f = guideAt('american', second + lessonOf('american').steps[1].seconds / 2);
    expect(f.progress).toBeCloseTo(0.5, 6);
  });

  it.each(GUIDE_GRIPS)('keeps every joint of both arms inside its range (%s)', (grip) => {
    for (let t = 0; t < lessonLength(grip); t += 0.1) {
      const { arms } = guideAt(grip, t);
      for (const hand of ['lead', 'other'] as const) {
        expect(armStrain(armAngles(arms[hand], NONE, hand)), `${hand} at ${t.toFixed(1)}`).toEqual(
          {}
        );
      }
    }
  });

  it('makes the pocket with the first finger before the stick is in the hand', () => {
    const start = guideAt('american', 0.05).arms.lead;
    const pocket = guideAt('american', stepStart('american', 1) - 0.05).arms.lead;
    const first = (a: typeof start) => handSetOf(a, 1).fingers[0].bend;
    const middle = (a: typeof start) => handSetOf(a, 1).fingers[1].bend;
    // flat to begin with, then the first finger bent at its two end knuckles, the rest flat
    expect(first(start)[1]).toBeLessThan(0.2);
    expect(first(pocket)[1]).toBeGreaterThan(1.2);
    expect(middle(pocket)[1]).toBeLessThan(0.2);
    // and the stick not in it yet: held out beyond the hand
    const rest = poseAt(new StrokeTimeline(), 0, 1, gripsFor('american')).arms.lead;
    expect(pocket.tip.distanceTo(rest.tip)).toBeGreaterThan(0.2);
  });

  it('closes the thumb before the back fingers, and ends holding the stick as the drummer does', () => {
    const thumbStep = stepStart('american', 3);
    const backStep = stepStart('american', 4);
    const thumbing = guideAt('american', thumbStep + 2).arms.lead;
    expect(thumbing.unheld?.by[4]).toBeLessThan(1);
    expect(thumbing.unheld?.by[2]).toBe(1);
    const held = guideAt('american', stepStart('american', 5) - 0.01).arms.lead;
    expect(held.unheld?.by.every((b) => b < 0.05) ?? true).toBe(true);
    // the lead hand at the end is the drummer's at rest, holding the stick
    const rest = poseAt(new StrokeTimeline(), 0, 1, gripsFor('american')).arms.lead;
    expect(held.tip.distanceTo(rest.tip)).toBeLessThan(0.01);
    expect(guideAt('american', backStep + 0.5).step).toBe(4);
  });

  it('turns American into German and French grip, and plays in it', () => {
    for (const grip of ['german', 'french'] as const) {
      const lesson = lessonOf(grip);
      const play = stepStart(grip, lesson.steps.length - 1);
      const end = guideAt(grip, stepStart(grip, 2) - 0.01).arms.lead;
      const rest = poseAt(new StrokeTimeline(), 0, 1, gripsFor(grip)).arms.lead;
      expect(end.hand.angleTo(rest.hand)).toBeLessThan(0.02);
      expect(guideAt(grip, play + 1).arms.lead.held).toBe(grip);
    }
  });

  it('plays the last step of each lesson in its grip: the drummer at the kit', () => {
    for (const grip of GUIDE_GRIPS) {
      const steps = lessonOf(grip).steps;
      const play = stepStart(grip, steps.length - 1);
      // the sticks are moving: strokes, not a still pose
      const range = (hand: 'lead' | 'other') => {
        const ys = Array.from(
          { length: 60 },
          (_, i) => guideAt(grip, play + i * 0.05).arms[hand].tip.y
        );
        return Math.max(...ys) - Math.min(...ys);
      };
      expect(Math.max(range('lead'), range('other')), grip).toBeGreaterThan(0.08);
    }
    expect(guideAt('traditional', lessonLength('traditional') - 1).arms.other.held).toBe(
      'traditional'
    );
  });

  it.each(GUIDE_GRIPS)('moves smoothly from step to step, never jumping a joint (%s)', (grip) => {
    const dt = 1 / 60;
    let was = guideAt(grip, 0).arms;
    let worst = 0;
    for (let t = dt; t < lessonLength(grip); t += dt) {
      const { arms } = guideAt(grip, t);
      for (const hand of ['lead', 'other'] as const)
        for (const part of ['elbow', 'wrist'] as const)
          worst = Math.max(worst, arms[hand][part].distanceTo(was[hand][part]));
      was = arms;
    }
    // a frame's move of a few centimetres reads as a jump; the quickest strokes are well under
    expect(worst).toBeLessThan(0.025);
  });
});
