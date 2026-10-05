import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import {
  type Contact,
  type Hand,
  type Limb,
  LANE_PIECE,
  type PieceId,
} from '@/lib/app/breaks/drummer/kit-layout';
import { FAST_STEP, type StepHands, assignBar } from '@/lib/app/breaks/drummer/sticking';
import { CHINA, HALF_OPEN, PERC_INSTS, RIMSHOT } from '@/lib/app/breaks/lanes';
import { isGroupStart } from '@/lib/app/breaks/meter';
import { LEVELS, type Voice } from '@/lib/app/breaks/perform';
import type { Bar, LaneKey, Meter } from '@/lib/app/breaks/types';

/**
 * What the drummer is going to hit, and when (experiment: the drummer view).
 *
 * The transport hands over each step a lookahead (~0.13 s) before it sounds:
 * the exact notes, at the exact times the speakers were given them. That is
 * enough to *land* a stroke but not to *prepare* one — an accent needs its
 * stick up well before the note — so each step also reads ahead along the
 * grid, through the rest of its bar and the bar the arrangement plays next.
 * Those forecast strokes are on the grid (no swing, no feel); the scheduled
 * ones replace them as they arrive, and the difference is a few milliseconds
 * of where a stick that was already on its way comes down.
 */

export type HatState = 'open' | 'half' | 'closed';

export interface Hit {
  /** Audio-clock time the stick (or beater) meets the piece. */
  time: number;
  /** The grid time of the step it belongs to. */
  step: number;
  limb: Limb;
  lane: LaneKey;
  piece: PieceId;
  contact: Contact;
  /** 0–1: how big a stroke it takes, which is how high the stick goes before it. */
  strength: number;
  /** On the hat: what the pedal is doing once this note has sounded. */
  hat?: HatState;
  /** Scheduled (true), or read ahead off the grid (false). */
  sure: boolean;
}

/**
 * How big a stroke a note takes, 0–1.
 *
 * The wire values say more about this than the velocities do — a ghost and a
 * plain hit sit only a few velocity points apart, but one is played from an
 * inch and the other from a foot. So the value picks the stroke and the
 * velocity only shades it: a hat whose shaping makes the off-beats softer is
 * played with lower strokes on the off-beats, which is the down/up motion a
 * real hand makes on sixteenth hats.
 */
const BASE: Record<LaneKey, number[]> = {
  k: [0, 0.6, 0.92],
  hf: [0, 0.5],
  // ghost · hit · accent · cross-stick · rimshot · flam · drag · buzz
  s: [0, 0.1, 0.55, 0.95, 0.22, 1, 0.6, 0.55, 0.32],
  // closed · accent · open · half-open
  h: [0, 0.38, 0.8, 0.55, 0.45],
  r: [0, 0.42, 0.7],
  c: [0, 0.95, 0.95, 1, 0.75],
  t1: [0, 0.6, 0.95, 0.65],
  t2: [0, 0.6, 0.95, 0.65],
  t3: [0, 0.6, 0.95, 0.65],
  p1: [0, 0.5, 0.8],
  p2: [0, 0.5, 0.8],
};

export function strengthOf(lane: LaneKey, value: number, velocity?: number): number {
  const base = BASE[lane][value] ?? BASE[lane][1] ?? 0.5;
  const level = LEVELS[lane][value];
  if (velocity === undefined || !level) return base;
  const shade = Math.min(1.3, Math.max(0.6, velocity / level));
  return Math.min(1, base * shade * shade);
}

/** Where on the piece a value is played. */
export function contactOf(lane: LaneKey, value: number): Contact {
  if (lane === 's') return value === 4 ? 'cross' : value === RIMSHOT ? 'rim' : 'centre';
  if (lane === 'h') return value === 2 || value === 3 ? 'edge' : 'centre';
  if (lane === 'r') return value === 2 ? 'bell' : 'centre';
  if (lane === 'c') return value === CHINA ? 'edge' : 'centre';
  return 'centre';
}

function hatOf(lane: LaneKey, value: number): HatState | undefined {
  if (lane === 'hf') return 'closed';
  if (lane !== 'h') return undefined;
  return value === 3 ? 'open' : value === HALF_OPEN ? 'half' : 'closed';
}

/** A grace is a little stroke; a buzz's repeats are the stick pressed into the head. */
const GRACE_STRENGTH = 0.07;
const BUZZ_STRENGTH = 0.03;

function otherHand(limb: Limb | undefined): Hand {
  return limb === 'lead' ? 'other' : 'lead';
}

const LANES_PLAYED: LaneKey[] = ['k', 'hf', 's', 'h', 'r', 'c', 't1', 't2', 't3', 'p1', 'p2'];

/** The strokes a step of the grid takes, at its grid time: no swing, no feel, no ornaments. */
export function gridHits(
  bar: Bar,
  i: number,
  time: number,
  before?: Bar | null,
  aux: readonly LaneKey[] = [],
  fast = false
): Hit[] {
  bar = barWithout(bar, aux);
  const hands: StepHands = assignBar(bar, before && barWithout(before, aux), fast)[i] ?? {};
  const out: Hit[] = [];
  for (const lane of LANES_PLAYED) {
    const value = bar[lane][i];
    const limb = hands[lane];
    if (!value || !limb) continue;
    out.push({
      time,
      step: time,
      limb,
      lane,
      piece: LANE_PIECE[lane],
      contact: contactOf(lane, value),
      strength: strengthOf(lane, value),
      hat: hatOf(lane, value),
      sure: false,
    });
  }
  return out;
}

/** The strokes a scheduled step takes: every voice the speakers were given, on the limb that plays it. */
export function scheduledHits(
  step: ScheduledStep,
  before?: Bar | null,
  aux: readonly LaneKey[] = []
): Hit[] {
  const { bar, slot, t } = step;
  if (step.count || !bar) return countHits(step);
  const fast = step.dur < FAST_STEP;
  const hands: StepHands =
    assignBar(barWithout(bar, aux), before && barWithout(before, aux), fast)[slot] ?? {};
  const out: Hit[] = [];
  for (const { voice, when } of step.notes) {
    if (aux.includes(voice.lane)) continue;
    const hit = voiceHit(voice, when, bar[voice.lane][slot] ?? 0, hands, t);
    if (hit) out.push(hit);
  }
  return out;
}

function voiceHit(
  voice: Voice,
  when: number,
  value: number,
  hands: StepHands,
  step: number
): Hit | null {
  const { lane } = voice;
  const main = hands[lane];
  let limb: Limb | undefined = main;
  let strength = strengthOf(lane, value, voice.velocity);
  if (voice.ornament === 'grace') {
    const spare = otherHand(main);
    // a hand busy on the same step (the lead on a cymbal) does not leave it for a grace
    const busy = Object.entries(hands).some(([k, h]) => k !== 'grace' && h === spare);
    limb = hands.grace ?? (busy ? undefined : spare);
    strength = GRACE_STRENGTH;
  } else if (voice.ornament === 'buzz') {
    strength = BUZZ_STRENGTH;
  }
  if (!limb) return null;
  return {
    time: when,
    step,
    limb,
    lane,
    piece: LANE_PIECE[lane],
    contact: contactOf(lane, value),
    strength,
    hat: voice.ornament ? undefined : hatOf(lane, value),
    sure: true,
  };
}

/** Counting the band in: the sticks clicked together on each pulse. */
function countHits(step: ScheduledStep): Hit[] {
  if (!isGroupStart(step.meter, step.slot)) return [];
  return (['lead', 'other'] as const).map((limb) => ({
    time: step.t,
    step: step.t,
    limb,
    lane: 's' as const,
    piece: 'sticks' as const,
    contact: 'centre' as const,
    strength: 0.3,
    sure: true,
  }));
}

/** A percussion note's instrument, by the note it sounds as. */
const INST_BY_NOTE = new Map<number, string>();
for (const [key, inst] of Object.entries(PERC_INSTS)) {
  INST_BY_NOTE.set(inst.midi, key);
  INST_BY_NOTE.set(inst.hi, key);
}

const without = new WeakMap<Bar, Map<string, Bar>>();

/** `bar` with `lanes` emptied, the same object every time for the same pair. */
export function barWithout(bar: Bar, lanes: readonly LaneKey[]): Bar {
  if (!lanes.length) return bar;
  const key = [...lanes].sort().join();
  let byKey = without.get(bar);
  if (!byKey) without.set(bar, (byKey = new Map<string, Bar>()));
  let out = byKey.get(key);
  if (!out) {
    out = { ...bar };
    for (const lane of lanes) out[lane] = bar[lane].map(() => 0);
    byKey.set(key, out);
  }
  return out;
}

/** How far the forecast reads ahead, in steps. Two bars of 4/4. */
const FORECAST_STEPS = 32;
/** How long a scheduled stroke is kept once it has sounded. */
const KEEP_S = 3;

/** What the body sways to: the latest step, and the meter it was in. */
export interface Clock {
  t: number;
  dur: number;
  slot: number;
  meter: Meter;
}

export class StrokeTimeline {
  private sure: Hit[] = [];
  private ahead: Hit[] = [];
  private lastStep = -Infinity;
  private merged: Hit[] | null = null;
  /** The bar of the last step heard, its slot, and the bar heard before the current one. */
  private heard: { bar: Bar | null; slot: number } = { bar: null, slot: -1 };
  private before: Bar | null = null;
  /** Percussion lanes a percussionist plays, learnt from what they sound as. */
  private aux: LaneKey[] = [];
  clock: Clock | null = null;
  /**
   * The percussion pieces any bar heard so far has called for. A cowbell
   * nobody plays is only something in front of the toms; it goes up when a
   * pattern first uses it, and stays for the session.
   */
  readonly percussion = new Set<PieceId>();

  /** One scheduled step: its notes are now certain, and the grid after it is re-read. */
  ingest(step: ScheduledStep): void {
    this.clock = { t: step.t, dur: step.dur, slot: step.slot, meter: step.meter };
    this.lastStep = step.t;
    // a new bar has begun when the slot comes round (a one-bar loop is its own bar before)
    if (step.slot <= this.heard.slot || step.bar !== this.heard.bar) {
      this.before = step.slot === 0 ? this.heard.bar : null;
    }
    this.heard = { bar: step.bar, slot: step.slot };
    this.learnPercussion(step);
    this.sure.push(...scheduledHits(step, this.before, this.aux));
    const cutoff = step.t - KEEP_S;
    if (this.sure.length && this.sure[0].time < cutoff) {
      this.sure = this.sure.filter((h) => h.time >= cutoff);
    }
    this.ahead = step.count || !step.bar ? [] : forecast(step, this.before, this.aux);
    this.merged = null;
    for (const bar of [step.bar, step.next]) {
      if (bar?.p1.some(Boolean) && !this.aux.includes('p1')) this.percussion.add('perc1');
      if (bar?.p2.some(Boolean) && !this.aux.includes('p2')) this.percussion.add('perc2');
    }
  }

  /** Which percussion lanes are the drummer's, from the instrument each one sounds as. */
  private learnPercussion(step: ScheduledStep): void {
    for (const { voice } of step.notes) {
      if (voice.lane !== 'p1' && voice.lane !== 'p2') continue;
      const inst = INST_BY_NOTE.get(voice.note);
      // an instrument it cannot name stays the drummer's, as the kit always had it
      const theirs = !!inst && !PERC_INSTS[inst].kit;
      const listed = this.aux.includes(voice.lane);
      if (theirs && !listed) {
        this.aux = [...this.aux, voice.lane];
        this.percussion.delete(voice.lane === 'p1' ? 'perc1' : 'perc2');
      } else if (!theirs && listed) this.aux = this.aux.filter((l) => l !== voice.lane);
    }
  }

  reset(): void {
    this.sure = [];
    this.ahead = [];
    this.lastStep = -Infinity;
    this.merged = null;
    this.clock = null;
    this.heard = { bar: null, slot: -1 };
    this.before = null;
    this.aux = [];
  }

  /** Every stroke known, scheduled and forecast, in time order. */
  all(): Hit[] {
    if (!this.merged) {
      const last = this.lastStep;
      this.merged = [...this.sure, ...this.ahead.filter((h) => h.step > last + 1e-6)].sort(
        (a, b) => a.time - b.time
      );
    }
    return this.merged;
  }

  /** One limb's strokes, in time order. */
  forLimb(limb: Limb): Hit[] {
    return this.all().filter((h) => h.limb === limb);
  }
}

function forecast(step: ScheduledStep, before: Bar | null, aux: readonly LaneKey[]): Hit[] {
  const out: Hit[] = [];
  const { bar, next, slot, t, dur } = step;
  if (!bar) return out;
  const fast = dur < FAST_STEP;
  const n = bar.k.length;
  let k = 1;
  for (let i = slot + 1; i < n && k <= FORECAST_STEPS; i++, k++)
    out.push(...gridHits(bar, i, t + k * dur, before, aux, fast));
  if (next) {
    const m = next.k.length;
    for (let i = 0; i < m && k <= FORECAST_STEPS; i++, k++)
      out.push(...gridHits(next, i, t + k * dur, bar, aux, fast));
  }
  return out;
}
