import type { LaneKey, PercLaneKey, PercSpec, Style } from '@/lib/app/breaks/types';

/**
 * The lane roster — what a kit is, what a style brings, and how each lane is
 * named, coloured, drawn and exported.
 *
 * Five lanes are the kit every style gets. Toms and the two auxiliary
 * percussion lanes exist in every bar so they can always be drawn on and
 * played, but a pattern only *carries* the ones its style asked for — that list
 * is what the notation, the grid, the mixer, the LEDs and the export all read,
 * rather than assuming a kit.
 */

export const BASE_LANES: LaneKey[] = ['k', 's', 'h', 'r', 'c'];
export const TOM_LANES: LaneKey[] = ['t1', 't2', 't3'];
export const PERC_LANES: PercLaneKey[] = ['p1', 'p2'];
/** Hi-hat played with the left foot. */
export const FOOT_LANE: LaneKey = 'hf';
export const LANES: LaneKey[] = [...BASE_LANES, ...TOM_LANES, FOOT_LANE, ...PERC_LANES];
export const DEFAULT_PERC = ['tamb', 'shaker'];

export interface PercInst {
  label: string;
  /** General MIDI note. */
  midi: number;
  /**
   * A second note for the accented value, so a conga part reads as two drums
   * rather than one drum played harder.
   */
  hi: number;
  /** The notehead the engraver draws. */
  head: 'x' | 'tri' | 'oval';
}

/**
 * A percussion lane is a **slot, not an instrument**. The style says what
 * rhythm it plays; what is *in* the slot is yours to change, and swapping a
 * cowbell for a woodblock keeps the part.
 */
export const PERC_INSTS: Record<string, PercInst> = {
  tamb: { label: 'Tambourine', midi: 54, hi: 54, head: 'x' },
  shaker: { label: 'Shaker', midi: 82, hi: 82, head: 'x' },
  clave: { label: 'Claves', midi: 75, hi: 75, head: 'tri' },
  cowbell: { label: 'Cowbell', midi: 56, hi: 56, head: 'tri' },
  wood: { label: 'Woodblock', midi: 77, hi: 76, head: 'tri' },
  conga: { label: 'Congas', midi: 64, hi: 63, head: 'oval' },
  timbale: { label: 'Timbales', midi: 66, hi: 65, head: 'oval' },
  cascara: { label: 'Cascara', midi: 70, hi: 70, head: 'x' },
  clap: { label: 'Handclap', midi: 39, hi: 39, head: 'x' },
  agogo: { label: 'Agogo', midi: 68, hi: 67, head: 'tri' },
};
export const PERC_KEYS = Object.keys(PERC_INSTS);

export function percInst(key: string | undefined): PercInst {
  return PERC_INSTS[key ?? ''] ?? PERC_INSTS.tamb;
}

/**
 * Snare values: 1 ghost · 2 hit · 3 accent · 4 **cross-stick** — the stick laid
 * across the head with its shoulder struck on the rim.
 *
 * A cross-stick is a different sound rather than a louder or softer one, which
 * is why it is its own value and not a velocity. Everything asking "is there a
 * real note here" tests `>= 2`, so a cross-stick counts as a backbeat;
 * everything asking "may I write over this" has to test this instead of
 * `=== 3`, or the variation pass writes over the clave a style is playing.
 */
export function snareKept(v: number): boolean {
  return v === 3 || v === 4;
}

/** Where a lane sits before a style says otherwise. */
export const DEFAULT_MIX: Record<LaneKey, number> = {
  k: 1,
  s: 1,
  h: 1,
  r: 1,
  c: 1,
  t1: 1,
  t2: 1,
  t3: 1,
  hf: 0.9,
  p1: 0.85,
  p2: 0.85,
};

/**
 * Every value each lane can hold, in the order clicking a cell gets you there.
 *
 * This exists because a cross-stick was five clicks round a snare cell and an
 * open hat three round a hi-hat, and nothing on the page said so — which is the
 * same as not having them.
 */
export const LANE_VALUES: Record<LaneKey, string[]> = {
  k: ['hit', 'accent'],
  s: ['ghost', 'hit', 'accent', 'cross-stick'],
  h: ['closed', 'accent', 'open'],
  r: ['ride', 'bell'],
  c: ['crash'],
  t1: ['hit', 'accent'],
  t2: ['hit', 'accent'],
  t3: ['hit', 'accent'],
  hf: ['chick'],
  p1: ['hit', 'accent'],
  p2: ['hit', 'accent'],
};

export interface LaneDef {
  name: string;
  /** A CSS custom property — the theme owns the actual colour. */
  color: string;
  /** How many values the lane cycles through, including empty. */
  states: number;
  /** Grid glyph per value. */
  glyph: string[];
  /** Staff position for the engraver. Percussion has its own one-line staff. */
  staff?: number;
  ledger?: boolean;
  midi?: number;
  head?: 'x' | 'oval';
  tom?: boolean;
  foot?: boolean;
  perc?: boolean;
}

export const LANE_DEFS: Record<LaneKey, LaneDef> = {
  c: {
    name: 'Crash',
    color: 'var(--plum)',
    states: 2,
    glyph: ['', 'C'],
    staff: 11,
    ledger: true,
    midi: 49,
    head: 'x',
  },
  r: {
    name: 'Ride',
    color: 'var(--brass)',
    states: 3,
    glyph: ['', 'x', 'o'],
    staff: 8,
    midi: 51,
    head: 'x',
  },
  h: {
    name: 'Hi-hat',
    color: 'var(--teal)',
    states: 4,
    glyph: ['', 'x', '>', 'o'],
    staff: 9,
    midi: 42,
    head: 'x',
  },
  t1: {
    name: 'High tom',
    color: 'var(--ok)',
    states: 3,
    glyph: ['', '1', '>'],
    staff: 7,
    midi: 48,
    head: 'oval',
    tom: true,
  },
  t2: {
    name: 'Mid tom',
    color: 'var(--ok)',
    states: 3,
    glyph: ['', '2', '>'],
    staff: 6,
    midi: 45,
    head: 'oval',
    tom: true,
  },
  s: {
    name: 'Snare',
    color: 'var(--rust)',
    states: 5,
    glyph: ['', 'g', 'o', '>', 'x'],
    staff: 5,
    midi: 38,
    head: 'oval',
  },
  t3: {
    name: 'Floor tom',
    color: 'var(--ok)',
    states: 3,
    glyph: ['', '3', '>'],
    staff: 3,
    midi: 43,
    head: 'oval',
    tom: true,
  },
  k: {
    name: 'Kick',
    color: 'var(--steel)',
    states: 3,
    glyph: ['', 'o', '>'],
    staff: 1,
    midi: 36,
    head: 'oval',
  },
  hf: {
    name: 'Hi-hat foot',
    color: 'var(--teal)',
    states: 2,
    glyph: ['', 'x'],
    staff: -1,
    midi: 44,
    head: 'x',
    foot: true,
  },
  p1: { name: 'Perc 1', color: 'var(--plum)', states: 3, glyph: ['', '.', '>'], perc: true },
  p2: { name: 'Perc 2', color: 'var(--brass)', states: 3, glyph: ['', '.', '>'], perc: true },
};

/**
 * Top of the staff downwards, then the percussion band — the order everything
 * that lists lanes uses: notation legend, grid rows, mixer, LEDs.
 */
export const LANE_ORDER: LaneKey[] = ['c', 'r', 'h', 't1', 't2', 's', 't3', 'k', 'hf', 'p1', 'p2'];

/** Percussion takes its name from whatever instrument is in the slot. */
export function laneName(key: LaneKey, perc?: Partial<Record<PercLaneKey, string>>): string {
  const d = LANE_DEFS[key];
  if (!d.perc) return d.name;
  const inst = perc?.[key as PercLaneKey];
  return inst ? percInst(inst).label : d.name;
}

/** The lanes a pattern carries, in {@link LANE_ORDER}. */
export function activeLanes(lanes: LaneKey[] | undefined): LaneKey[] {
  const have = lanes ?? BASE_LANES;
  return LANE_ORDER.filter((k) => have.includes(k));
}

/**
 * The lanes a style ships with. Everything not listed is off until you turn it
 * on.
 *
 * A ride-led style writes nothing into the hand hi-hat, and for a while that
 * lane was dropped so no chart carried an empty row. That was the wrong trade:
 * an empty row is where you click to add a note. A jazz player moves to the
 * hats for a chorus, catches an open hat with the left hand, plays the ride
 * pattern on a closed hat — none of which is possible if the lane is not there.
 * **The lane stays.**
 */
export function laneRoster(st: Style | undefined): LaneKey[] {
  const out = BASE_LANES.slice();
  if (st?.toms) out.push(...TOM_LANES);
  if (st?.foot || st?.backbeatLane === FOOT_LANE) out.push(FOOT_LANE);
  (st?.perc ?? []).forEach((_, i) => {
    if (PERC_LANES[i]) out.push(PERC_LANES[i]);
  });
  return out;
}

export function percRoster(st: Style | undefined): Partial<Record<PercLaneKey, string>> {
  const out: Partial<Record<PercLaneKey, string>> = {};
  PERC_LANES.forEach((L, i) => {
    out[L] = st?.perc?.[i]?.inst ?? DEFAULT_PERC[i];
  });
  return out;
}

/**
 * What an instrument plays when the style has no opinion — the user turned the
 * lane on themselves. A style that *does* have an opinion keeps its own rhythm
 * and just swaps the sound, because changing the instrument is not changing the
 * part.
 */
export const PERC_DEFAULT_SPEC: Record<string, PercSpec> = {
  tamb: { every: 2, accentPulse: true },
  shaker: { every: 1 },
  clave: { follow: 'backbeats' },
  cowbell: { every: 2, accentPulse: true },
  wood: { every: 4 },
  conga: { every: 2, accentPulse: true },
  timbale: { every: 4 },
  cascara: { every: 2, accentPulse: true },
  clap: { follow: 'snare' },
  agogo: { every: 4, accentPulse: true },
};

/**
 * Which lane carries the pulse. In almost everything that is the snare
 * backbeat; in jazz there is no backbeat at all and the 2 and the 4 are marked
 * by the foot, so the generator stamps them there and the playability check
 * looks for them there.
 */
export function bbLaneOf(style: Style | undefined): LaneKey {
  return style?.backbeatLane ?? 's';
}

/** The value a backbeat is written at — a cross-stick, where the style plays one. */
export function bbValue(lane: LaneKey, style: Style | undefined): number {
  if (lane !== 's') return 1;
  return style?.crossStick ? 4 : 3;
}
