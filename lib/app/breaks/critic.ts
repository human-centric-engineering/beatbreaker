import {
  FOOT_LANE,
  HALF_OPEN,
  LANES,
  TOM_LANES,
  gracesOf,
  handLanes,
  handsAt,
  handsOf,
} from '@/lib/app/breaks/lanes';
import { STEPS, isGroupStart, stepsPerQuarter } from '@/lib/app/breaks/meter';
import { generatePattern, type GenerateOptions } from '@/lib/app/breaks/generate';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import { clamp, makeRng } from '@/lib/app/breaks/rng';
import type { Bar, LaneKey, Pattern } from '@/lib/app/breaks/types';

/**
 * The hard playability filter and the 0–100 score.
 *
 * Two different questions, deliberately kept apart. **Playability** asks
 * whether a human with four limbs can play this at all; it is a pass/fail gate.
 * **Critique** asks whether it is any good; it is an opinion, and a low score is
 * a suggestion rather than a rejection.
 *
 * Both run the same on the server as in the browser — no DOM, no audio — which
 * is what lets a model-authored grid patch be checked before it is ever shown
 * to anyone.
 */

export interface Check {
  ok: boolean;
  label: string;
}

export interface Playability {
  checks: Check[];
  /** False if the pattern fails a rule no tempo or taste can excuse. */
  hard: boolean;
}

export function playability(pat: Pattern, bpm: number): Playability {
  let rideClash = false;
  let kickRun = false;
  let snareRun = false;
  let noBackbeat = false;
  let doubleStrain = 0;
  let airless = false;
  let graceClash = false;
  let threeHands = false;
  const hands = handLanes(pat.perc);
  // on a double pedal a run of kicks is two feet's: no run is too long, and the kick is not the air
  const doubleKick = !!pat.attrs?.doubleKick;

  const nSteps = pat.bars[0] ? pat.bars[0].k.length : STEPS;
  /* A quarter of the bar, and never less than three sixteenths' worth: in a
     bar of eighths (4/4-8) that is two steps, not three of eight. */
  const airFloor = Math.max(
    Math.round((3 * stepsPerQuarter(meterOfPat(pat))) / 4),
    Math.round(nSteps / 4)
  );

  for (const b of pat.bars) {
    for (let i = 0; i < nSteps; i++) {
      if (b.h[i] && b.r[i]) rideClash = true;
      if (i < nSteps - 2 && b.k[i] && b.k[i + 1] && b.k[i + 2]) kickRun = true;
      if (i < nSteps - 3 && b.s[i] && b.s[i + 1] && b.s[i + 2] && b.s[i + 3]) snareRun = true;
      if (i < nSteps - 1 && b.k[i] && b.k[i + 1]) doubleStrain++;
      // a flam's step is the grace check's to report, not this one's twice over —
      // that step only, so a three-hand step elsewhere is still named
      if (graceTooMany(b, i)) graceClash = true;
      else if (handsAt(b, i, hands) > 2) threeHands = true;
    }

    /* A tom carrying the fill is still a backbeat arriving, and in jazz the 2
       and the 4 are the foot rather than the snare. */
    const hit = backbeatProbe(b, pat.bbLane);
    const ok = pat.backbeats.every(
      (s) => s >= nSteps || hit(s) || (s > 0 && hit(s - 1)) || (s + 1 < nSteps && hit(s + 1)) // displacement counts
    );
    if (!ok) noBackbeat = true;

    let empties = 0;
    for (let i = 0; i < nSteps; i++) if ((doubleKick || !b.k[i]) && !b.s[i]) empties++;
    if (empties < airFloor) airless = true;
  }

  if (doubleKick) kickRun = false;
  /* The tempo a double is played at, in sixteenths: a sextuplet double is half
     again as quick as a sixteenth one at the same quarter. */
  const doubleBpm = (bpm * stepsPerQuarter(meterOfPat(pat))) / 4;
  const fastDoubles =
    !doubleKick && doubleStrain > 0 && doubleBpm > 132 && doubleStrain > pat.bars.length;

  const checks: Check[] = [
    { ok: !rideClash, label: 'One cymbal at a time — no ride under a hi-hat' },
    {
      ok: !kickRun,
      label: doubleKick ? 'Kick runs go to the double pedal' : 'No triple 16ths on the kick',
    },
    { ok: !snareRun, label: 'Snare never runs four 16ths without a break' },
    {
      ok: !noBackbeat,
      label:
        pat.bbLane === FOOT_LANE
          ? 'Every bar marks 2 and 4 with the foot'
          : 'Every bar has a findable backbeat',
    },
    {
      ok: !airless,
      label: doubleKick
        ? 'At least a quarter of every bar is air above the kick'
        : 'At least a quarter of every bar is air',
    },
    { ok: !fastDoubles, label: `Kick doubles are sane for ${Math.round(bpm)} BPM` },
  ];
  /* Only shown where it can fail: every pattern written before 9-iv passes it,
     and a list that grows a line nobody can trip is noise. */
  if (graceClash) checks.push({ ok: false, label: GRACE_CHECK });
  if (threeHands) checks.push({ ok: false, label: HANDS_CHECK });

  return {
    checks,
    hard: !(rideClash || kickRun || snareRun || noBackbeat || airless || graceClash || threeHands),
  };
}

/**
 * Only shown where it fails, like the grace check: what the drummer's two hands
 * play on one step — the kit, and percussion only when it is mounted on the
 * kit (`handLanes`). A tambourine or a shaker is someone else's.
 */
export const HANDS_CHECK = 'Two hands — never three things for the sticks at once';

export const GRACE_CHECK =
  'A flam or drag takes both hands — nothing else in the hands on that step';

/** The lanes played with a stick. */
const HAND_LANES: LaneKey[] = LANES.filter((L) => L !== 'k' && L !== FOOT_LANE);

/**
 * A flam or drag is two hands — the grace is the other one — so on its step
 * there is no hand left for a hi-hat, a ride, a crash or another drum.
 */
function graceTooMany(b: Bar, i: number): boolean {
  if (!HAND_LANES.some((L) => gracesOf(L, b[L][i]))) return false;
  let hands = 0;
  for (const L of HAND_LANES) hands += handsOf(L, b[L][i]);
  return hands > 2;
}

/** "Did a backbeat arrive at this step?", for whichever lane carries the pulse. */
function backbeatProbe(b: Bar, bbLane: LaneKey): (i: number) => boolean {
  const lane = bbLane || 's';
  if (lane === 's') {
    return (i) => b.s[i] >= 2 || TOM_LANES.some((L) => !!b[L]?.[i]);
  }
  return (i) => !!b[lane]?.[i];
}

export interface Dimension {
  key: string;
  /** 0–1. */
  v: number;
  /** What to print beside the meter. */
  read: string;
}

export interface Critique {
  /** 0–100. */
  score: number;
  dims: Dimension[];
  verdict: string;
  stats: { kicks: number; ghosts: number; opens: number; cym: number };
}

export function critique(pat: Pattern, _bpm?: number): Critique {
  const nbars = pat.bars.length;
  const m = meterOfPat(pat);
  const nSteps = pat.bars[0] ? pat.bars[0].k.length : STEPS;
  const scale = nSteps / 16;

  /* A feathered kick is timekeeping, not syncopation: it plays the quarters on
     purpose. Reading "square" off it would be reading the wrong hand, so where
     a style feathers, syncopation is measured across the comping instead.

     Read off the pattern's own snapshot rather than a style table: a break
     shared by someone whose style you cannot see must still score, and it must
     score the same for them and for you. */
  const feathered = !!pat.attrs?.kickFeather;

  let kicks = 0,
    syncK = 0,
    comps = 0,
    syncC = 0;
  let ghosts = 0,
    accents = 0,
    cym = 0,
    opens = 0,
    air = 0;

  for (const b of pat.bars) {
    for (let i = 0; i < nSteps; i++) {
      if (b.k[i]) {
        kicks++;
        if (!isGroupStart(m, i)) syncK++;
      }
      if (feathered && b.s[i]) {
        comps++;
        if (!isGroupStart(m, i)) syncC++;
      }
      if (b.s[i] === 1) ghosts++;
      if (b.s[i] >= 2) accents++;
      if (b.h[i] || b.r[i]) cym++;
      if (b.h[i] === 3 || b.h[i] === HALF_OPEN || b.r[i] === 2) opens++;
      if (!b.k[i] && !b.s[i]) air++;
    }
  }

  const perBar = (n: number): number => n / nbars;
  const syncRatio = feathered ? (comps ? syncC / comps : 0) : kicks ? syncK / kicks : 0;
  const lowerDensity = perBar(kicks + accents + ghosts);

  // each dimension scores 0..1
  const b0 = pat.bars[0];
  const hit0 = backbeatProbe(b0, pat.bbLane);
  const sBack = pat.backbeats.every(
    (s) => s >= nSteps || hit0(s) || (s > 0 && hit0(s - 1)) || (s + 1 < nSteps && hit0(s + 1))
  )
    ? 1
    : 0.2;

  // syncopation is asymmetric: square is a fault, very off-grid is a style
  const sSync =
    syncRatio <= 0.45 ? syncRatio / 0.45 : clamp(1 - Math.max(0, syncRatio - 0.78) / 0.45, 0, 1);

  /* A one drop is not a failed funk break. Sparse styles say what they are
     aiming at, or the rejection sampler quietly picks the busiest candidate
     every time. */
  const target = (pat.attrs?.targetDensity ?? 12) * scale;
  const sDens = 1 - Math.min(1, Math.abs(lowerDensity - target) / (10 * scale));

  const gpb = perBar(ghosts);
  const sGhost =
    gpb === 0 ? 0.75 : gpb <= 6 * scale ? 1 : clamp(1 - (gpb - 6 * scale) / (4 * scale), 0, 1);
  const sAir = clamp(perBar(air) / (5 * scale), 0, 1);

  let sVar = 1;
  if (nbars > 1) {
    let same = 0;
    for (let i = 1; i < nbars; i++) if (barEq(pat.bars[i], pat.bars[0])) same++;
    const ratio = same / (nbars - 1);
    sVar = ratio === 1 ? 0.45 : ratio === 0 ? 0.7 : 1;
  }

  const score = Math.round(
    sBack * 26 + sSync * 20 + sDens * 18 + sGhost * 12 + sAir * 12 + sVar * 12
  );

  const dims: Dimension[] = [
    { key: 'Backbeat', v: sBack, read: sBack > 0.9 ? 'planted' : 'floating' },
    {
      key: 'Syncopation',
      v: sSync,
      read: syncRatio > 0.6 ? 'off-grid' : syncRatio < 0.2 ? 'square' : 'funky',
    },
    { key: 'Density', v: sDens, read: `${lowerDensity.toFixed(1)}/bar` },
    { key: 'Ghosts', v: sGhost, read: `${perBar(ghosts).toFixed(1)}/bar` },
    { key: 'Air', v: sAir, read: `${perBar(air).toFixed(0)} rests` },
    { key: 'Phrasing', v: sVar, read: nbars === 1 ? 'one bar' : sVar < 0.5 ? 'flat' : 'moves' },
  ];

  return {
    score,
    dims,
    verdict: verdictFor(score, dims, { syncRatio, ghosts, lowerDensity, downbeatKick: !!b0.k[8] }),
    stats: { kicks, ghosts, opens, cym },
  };
}

/** Lead with the weakest useful thing to say. */
function verdictFor(
  score: number,
  dims: Dimension[],
  ctx: { syncRatio: number; ghosts: number; lowerDensity: number; downbeatKick: boolean }
): string {
  const weakest = dims.slice().sort((a, b) => a.v - b.v)[0];

  if (score >= 84) {
    return `Sits up on its own. The kick answers the snare instead of doubling it, and there is room to breathe on beat ${ctx.downbeatKick ? '4' : '3'}.`;
  }
  switch (weakest.key) {
    case 'Syncopation':
      return ctx.syncRatio < 0.2
        ? 'The kick is sitting on the beat. Push one of them a 16th late and it will start to lean.'
        : 'Almost everything is off the grid — give the ear one downbeat kick to hold on to.';
    case 'Air':
      return 'Busy. Take out a kick somewhere in bar 1 and the backbeat gets louder without you hitting it harder.';
    case 'Ghosts':
      return ctx.ghosts === 0
        ? 'No ghost notes — fine at this layer, but the groove will flatten at slow tempos.'
        : 'Heavy on ghosts. Thin them and keep the two either side of the backbeat.';
    case 'Phrasing':
      return 'Every bar is the same. A single moved kick in the last bar is enough to make it a phrase.';
    case 'Density':
      return ctx.lowerDensity > 14
        ? 'A lot of notes for one bar. Strip it to Layer 2 and see what is actually load-bearing.'
        : 'Sparse. That is a feel, not a fault — just know you are choosing it.';
    default:
      return 'Playable and honest. Nothing clever going on, which at the right tempo is the point.';
  }
}

export function barEq(a: Bar, b: Bar): boolean {
  for (const L of LANES) {
    for (let i = 0; i < a[L].length; i++) if (a[L][i] !== b[L][i]) return false;
  }
  return true;
}

/** How many candidates the rejection sampler draws before picking one. */
export const CANDIDATES = 16;

export interface GeneratedBreak {
  pattern: Pattern;
  tries: number;
  /** How many of those failed the hard filter. */
  rejected: number;
}

/**
 * How far under the best candidate's score another may be and still be the
 * one kept. Keeping only the very best made every press of New land on the
 * same shape: the score has a taste — it likes the kick a little off the
 * beat, and the density the style aims at — and the same few candidates win
 * it every time. Anything this close is as good a break, so one of them is
 * picked.
 */
export const NEAR_BEST = 10;

/**
 * Rejection sampling: generate, filter, keep one of the best.
 *
 * An unplayable candidate can only win if nothing else survives the filter,
 * which is what the 45-point penalty buys — it is large enough that no playable
 * candidate ever loses to an unplayable one, and small enough that the least-bad
 * unplayable candidate still wins when they all fail. Among what is left, any
 * candidate within {@link NEAR_BEST} of the top score may be the one kept,
 * chosen from the seed, so the same seed still gives the same break.
 */
export function generateGood(opts: GenerateOptions, bpm: number): GeneratedBreak {
  const drawn: Array<{ pattern: Pattern; eff: number; hard: boolean }> = [];
  let rejected = 0;

  for (let n = 0; n < CANDIDATES; n++) {
    const p = generatePattern({ ...opts, seed: (opts.seed + n * 2654435761) >>> 0 });
    const checks = playability(p, bpm);
    const c = critique(p, bpm);
    if (!checks.hard) rejected++;
    drawn.push({ pattern: p, eff: checks.hard ? c.score : c.score - 45, hard: checks.hard });
  }

  // only the playable ones, if any are
  const eligible = drawn.some((d) => d.hard) ? drawn.filter((d) => d.hard) : drawn;
  const top = Math.max(...eligible.map((d) => d.eff));
  const near = eligible.filter((d) => d.eff >= top - NEAR_BEST);
  const pick = near[Math.floor(makeRng((opts.seed ^ 0x6a09e667) >>> 0)() * near.length)];

  /* CANDIDATES is a positive constant, so the loop always runs and `pick` is
     always set — but the compiler cannot see that, and an exception here would
     be far easier to diagnose than a null reaching the engraver. */
  if (!pick) throw new Error('generateGood produced no candidate');
  return { pattern: pick.pattern, tries: CANDIDATES, rejected };
}
