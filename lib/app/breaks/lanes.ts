import type { Bar, LaneKey, PercLaneKey, PercSpec, Style } from '@/lib/app/breaks/types';

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
  /**
   * Whether a kit drummer plays it, mounted on the kit — a cowbell off the
   * kick, a block or claves off the hat stand, cascara on a shell. Without it
   * the part is a percussionist's (a tambourine, a shaker, congas, a clap): it
   * sounds with the break, but it does not take one of the drummer's hands.
   */
  kit?: boolean;
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
  cowbell: { label: 'Cowbell', midi: 56, hi: 56, head: 'tri', kit: true },
  wood: { label: 'Woodblock', midi: 77, hi: 76, head: 'tri', kit: true },
  conga: { label: 'Congas', midi: 64, hi: 63, head: 'oval' },
  timbale: { label: 'Timbales', midi: 66, hi: 65, head: 'oval', kit: true },
  cascara: { label: 'Cascara', midi: 70, hi: 70, head: 'x', kit: true },
  clap: { label: 'Handclap', midi: 39, hi: 39, head: 'x' },
  agogo: { label: 'Agogo', midi: 68, hi: 67, head: 'tri', kit: true },
};
export const PERC_KEYS = Object.keys(PERC_INSTS);

export function percInst(key: string | undefined): PercInst {
  return PERC_INSTS[key ?? ''] ?? PERC_INSTS.tamb;
}

/**
 * Snare values: 1 ghost · 2 hit · 3 accent · 4 **cross-stick** — the stick laid
 * across the head with its shoulder struck on the rim — then, from wire
 * version 5 (9-iv), 5 **rimshot**, 6 **flam**, 7 **drag** and 8 **buzz**.
 *
 * A cross-stick or a rimshot is a different sound rather than a louder or
 * softer one, which is why each is its own value and not a velocity; a flam,
 * drag or buzz is a hit with grace notes or repeats around it, which
 * `performStep` expands. Everything asking "is there a real note here" tests
 * `>= 2`, so all of them count as a backbeat; everything asking "may I write
 * over this" has to test this instead of `=== 3`, or the variation pass writes
 * over the clave a style is playing, or under a flam somebody wrote.
 */
export function snareKept(v: number): boolean {
  return v >= 3;
}

/** The articulations 9-iv added, by lane, so nothing has to spell the digits. */
export const RIMSHOT = 5;
export const FLAM = 6;
export const DRAG = 7;
export const BUZZ = 8;
/** On the hi-hat. */
export const HALF_OPEN = 4;
/** On the crash lane: a second crash, a china and a splash. */
export const CRASH_2 = 2;
export const CHINA = 3;
export const SPLASH = 4;
/** On a tom. */
export const TOM_FLAM = 3;

/**
 * How many grace notes a value is played with: a flam has one, a drag two.
 * The grace is on the other hand, so a step carrying one takes both hands.
 */
export function gracesOf(lane: LaneKey, v: number): number {
  if (lane === 's') return v === FLAM ? 1 : v === DRAG ? 2 : 0;
  if (lane === 't1' || lane === 't2' || lane === 't3') return v === TOM_FLAM ? 1 : 0;
  return 0;
}

/** How many hands a note takes: two for a flam or a drag, otherwise one. */
export function handsOf(lane: LaneKey, v: number): number {
  if (!v) return 0;
  return gracesOf(lane, v) ? 2 : 1;
}

/** The lanes always played with a stick: the cymbals, the snare and the toms. */
const STICK_LANES: LaneKey[] = ['h', 'r', 'c', 's', ...TOM_LANES];

/**
 * The lanes the drummer's two hands play, given what is in the percussion
 * slots: the kit's, and a percussion slot only when its instrument is on the
 * kit ({@link PercInst.kit}). A slot nobody has filled is the tambourine it
 * would sound as.
 */
export function handLanes(perc?: Partial<Record<PercLaneKey, string>>): LaneKey[] {
  return [...STICK_LANES, ...PERC_LANES.filter((L) => percInst(perc?.[L]).kit)];
}

/** How many hands a step of a bar takes, over `lanes` (see {@link handLanes}). */
export function handsAt(bar: Bar, i: number, lanes: readonly LaneKey[]): number {
  let n = 0;
  for (const L of lanes) n += handsOf(L, bar[L][i] ?? 0);
  return n;
}

/**
 * The value an articulation is written as when it is not wanted: what the
 * difficulty layers below L4 show in its place, the "plain" stroke under the
 * ornament. A rimshot is an accent played on the rim; a flam, drag or buzz is
 * a hit; a half-open hat is a closed one; every cymbal on the crash lane is
 * the crash. Values from before 9-iv are their own plain value.
 */
export function plainValue(lane: LaneKey, v: number): number {
  switch (lane) {
    case 's':
      return v === RIMSHOT ? 3 : v >= FLAM ? 2 : v;
    case 'h':
      return v === HALF_OPEN ? 1 : v;
    case 'c':
      return v ? 1 : 0;
    case 't1':
    case 't2':
    case 't3':
      return v === TOM_FLAM ? 1 : v;
    default:
      return v;
  }
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

/** Whose side the kit is heard from: sitting at it, or out front. */
export const PAN_VIEWS = ['drummer', 'audience'] as const;
export type PanView = (typeof PAN_VIEWS)[number];

/**
 * Where each lane sits, as a right-handed drummer hears the kit from the
 * stool: −1 is hard left, 1 hard right. Hats and the crash on the left, the
 * ride and the floor tom on the right, the toms stepping across in between.
 *
 * Deliberately narrow — nothing past ±0.4 — because the kit is one instrument
 * and a practice tool, not a mix with a stereo picture to sell.
 */
export const DEFAULT_PAN: Record<LaneKey, number> = {
  k: 0,
  s: -0.08,
  h: -0.3,
  hf: -0.3,
  r: 0.35,
  c: -0.38,
  t1: -0.15,
  t2: 0.1,
  t3: 0.32,
  p1: 0.25,
  p2: -0.25,
};

/**
 * A lane's pan from the given side. An audience hears the kit mirrored.
 * `pans` is a kit's own (9-v), as the drummer hears it; a lane it does not
 * name takes {@link DEFAULT_PAN}.
 */
export function panFor(
  lane: string,
  view: PanView,
  pans?: Partial<Record<string, number>>
): number {
  const p = pans?.[lane] ?? DEFAULT_PAN[lane as LaneKey] ?? 0;
  return view === 'audience' ? -p : p;
}

/**
 * Every value each lane can hold, in the order clicking a cell gets you there.
 *
 * This exists because a cross-stick was five clicks round a snare cell and an
 * open hat three round a hi-hat, and nothing on the page said so — which is the
 * same as not having them.
 */
export const LANE_VALUES: Record<LaneKey, string[]> = {
  k: ['hit', 'accent'],
  s: ['ghost', 'hit', 'accent', 'cross-stick', 'rimshot', 'flam', 'drag', 'buzz'],
  h: ['closed', 'accent', 'open', 'half-open'],
  r: ['ride', 'bell'],
  c: ['crash', 'crash 2', 'china', 'splash'],
  t1: ['hit', 'accent', 'flam'],
  t2: ['hit', 'accent', 'flam'],
  t3: ['hit', 'accent', 'flam'],
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
    states: 5,
    glyph: ['', 'C', '2', 'N', 'S'],
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
    states: 5,
    glyph: ['', 'x', '>', 'o', 'ø'],
    staff: 9,
    midi: 42,
    head: 'x',
  },
  t1: {
    name: 'High tom',
    color: 'var(--ok)',
    states: 4,
    glyph: ['', '1', '>', 'f'],
    staff: 7,
    midi: 48,
    head: 'oval',
    tom: true,
  },
  t2: {
    name: 'Mid tom',
    color: 'var(--ok)',
    states: 4,
    glyph: ['', '2', '>', 'f'],
    staff: 6,
    midi: 45,
    head: 'oval',
    tom: true,
  },
  s: {
    name: 'Snare',
    color: 'var(--rust)',
    states: 9,
    glyph: ['', 'g', 'o', '>', 'x', 'r', 'f', 'd', 'z'],
    staff: 5,
    midi: 38,
    head: 'oval',
  },
  t3: {
    name: 'Floor tom',
    color: 'var(--ok)',
    states: 4,
    glyph: ['', '3', '>', 'f'],
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
 * Every lane either section plays, in lane order — what the mixer shows, so a
 * lane only B uses can still be faded, muted or soloed.
 */
export function mixLanes(...lanes: (LaneKey[] | undefined)[]): LaneKey[] {
  const have = new Set(lanes.flatMap((l) => activeLanes(l)));
  return LANE_ORDER.filter((k) => have.has(k));
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
