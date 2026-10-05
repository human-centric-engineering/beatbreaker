import { describe, expect, it } from 'vitest';

import {
  type KickTechnique,
  REST_STANCE,
  RUN_GAP,
  kickPlan,
  kickStanceAt,
} from '@/lib/app/breaks/drummer/kick-foot';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';

function kick(time: number, strength = 0.6): Hit {
  return {
    time,
    step: time,
    limb: 'kickFoot',
    lane: 'k',
    piece: 'kick',
    contact: 'centre',
    strength,
    sure: true,
  };
}

/** The same figure played on many passes, each starting `every` seconds on. */
function passes(offsets: number[], every: number, count = 120): Hit[][] {
  return Array.from({ length: count }, (_, p) => offsets.map((o) => kick(p * every + o)));
}

const DOUBLE_TECHNIQUES: KickTechnique[] = ['slide', 'heelToe', 'swivel'];
const TRIPLE_TECHNIQUES: KickTechnique[] = ['heelBallToe', 'slide', 'swivel'];

describe('kickPlan — technique by what the notes ask for', () => {
  it('plays a lone note heel up or (soft and isolated) heel down', () => {
    const seen = new Set<KickTechnique>();
    for (const hits of passes([0.5], 2)) seen.add(kickPlan(hits)[0].technique);
    expect(seen).toEqual(new Set(['heelUp', 'heelDown']));
  });

  it('never plays a loud note heel down', () => {
    for (const hits of passes([0.5], 2)) {
      const loud = hits.map((h) => ({ ...h, strength: 0.95 }));
      expect(kickPlan(loud)[0].technique).toBe('heelUp');
    }
  });

  it('plays a fast double as one motion, and not always the same one', () => {
    const seen = new Set<KickTechnique>();
    for (const hits of passes([0, 0.1], 2)) {
      const plan = kickPlan(hits);
      expect(plan[0].technique).toBe(plan[1].technique);
      expect(DOUBLE_TECHNIQUES).toContain(plan[0].technique);
      seen.add(plan[0].technique);
    }
    expect(seen).toEqual(new Set(DOUBLE_TECHNIQUES));
  });

  it('plays a fast triple as one motion, heel–forefoot–toe among them', () => {
    const seen = new Set<KickTechnique>();
    for (const hits of passes([0, 0.1, 0.2], 2)) {
      const plan = kickPlan(hits);
      expect(new Set(plan.map((n) => n.technique)).size).toBe(1);
      expect(TRIPLE_TECHNIQUES).toContain(plan[0].technique);
      seen.add(plan[0].technique);
    }
    expect(seen.has('heelBallToe')).toBe(true);
  });

  it('rolls heel, forefoot, toe forward along the foot', () => {
    const hits = passes([0, 0.1, 0.2], 2).find((h) => kickPlan(h)[0].technique === 'heelBallToe')!;
    const [heel, fore, toe] = kickPlan(hits).map((n) => n.stance);
    // the heel note is toe-up, the toe note heel-high
    expect(heel.pitch).toBeLessThan(0);
    expect(fore.pitch).toBeGreaterThan(heel.pitch);
    expect(toe.pitch).toBeGreaterThan(fore.pitch);
    // and the toe note is played further up the board
    expect(toe.slide).toBeGreaterThan(fore.slide);
  });

  it('treats notes further apart than a run as separate', () => {
    for (const hits of passes([0, RUN_GAP + 0.15], 3)) {
      for (const n of kickPlan(hits)) expect(['heelUp', 'heelDown']).toContain(n.technique);
    }
  });

  it('turns the foot both ways on a swivelled run', () => {
    const hits = passes([0, 0.1, 0.2, 0.3], 2).find((h) =>
      kickPlan(h).every((n) => n.technique === 'swivel')
    )!;
    const swivels = kickPlan(hits).map((n) => n.stance.swivel);
    expect(Math.sign(swivels[0])).not.toBe(Math.sign(swivels[1]));
    expect(Math.sign(swivels[0])).toBe(Math.sign(swivels[2]));
  });

  it('gives the same plan for the same notes, so a redrawn frame does not flicker', () => {
    const hits = [kick(1), kick(1.1), kick(1.5)];
    expect(kickPlan(hits)).toEqual(kickPlan(hits.map((h) => ({ ...h, sure: false }))));
  });

  it('humanises: no two lone notes sit exactly the same', () => {
    const slides = passes([0.5], 2, 20).map((h) => kickPlan(h)[0].stance.slide);
    expect(new Set(slides).size).toBe(slides.length);
  });
});

describe('kickStanceAt', () => {
  it('waits at rest with nothing to play', () => {
    expect(kickStanceAt([], 3)).toEqual(REST_STANCE);
  });

  it('has the foot in the planned stance at the instant each note lands', () => {
    const hits = [kick(1), kick(1.1), kick(1.2), kick(2)];
    const plan = kickPlan(hits);
    hits.forEach((h, i) => {
      const at = kickStanceAt(hits, h.time, plan);
      expect(at.slide).toBeCloseTo(plan[i].stance.slide, 6);
      expect(at.pitch).toBeCloseTo(plan[i].stance.pitch, 6);
      expect(at.swivel).toBeCloseTo(plan[i].stance.swivel, 6);
    });
  });

  it('is on its way between two notes, not jumping at either', () => {
    const hits = [kick(1), kick(1.5)];
    const plan = kickPlan(hits);
    const mid = kickStanceAt(hits, 1.3, plan).slide;
    const [a, b] = [plan[0].stance.slide, plan[1].stance.slide];
    expect(mid).toBeGreaterThanOrEqual(Math.min(a, b) - 1e-9);
    expect(mid).toBeLessThanOrEqual(Math.max(a, b) + 1e-9);
  });

  it('settles back to rest long after the last note', () => {
    const hits = [kick(1)];
    expect(kickStanceAt(hits, 5)).toEqual(REST_STANCE);
  });
});
