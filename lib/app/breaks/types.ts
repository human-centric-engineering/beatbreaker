/**
 * The pattern model — the one shape every other module in `lib/app/breaks`
 * agrees on.
 *
 * A bar is one array per lane, as long as the meter says. **One step is always
 * a sixteenth note**, whatever the meter, which is what lets the transport, the
 * swing and the MIDI export stay ignorant of which meter is running. What a
 * meter decides is how many steps a bar holds and how they group.
 *
 * Lane values are deliberately small integers rather than a union type: the
 * generator, the critic and the layer reducer all do arithmetic on them
 * (`v >= 2` = "a real note", `Math.min(v, 2)` = "no louder than a hit"), and a
 * union would need a cast at every one of those sites. The legal values per
 * lane are documented on {@link LANE_VALUES} in `lanes.ts` and enforced on the
 * way in by the packed-bar schema in `schema.ts`, which is the only place
 * untrusted values enter.
 */

/** Lanes every style gets. */
export type BaseLaneKey = 'k' | 's' | 'h' | 'r' | 'c';
/** Toms, high to floor. */
export type TomLaneKey = 't1' | 't2' | 't3';
/** The two auxiliary percussion slots. */
export type PercLaneKey = 'p1' | 'p2';
/** Hi-hat played with the left foot. */
export type FootLaneKey = 'hf';

export type LaneKey = BaseLaneKey | TomLaneKey | FootLaneKey | PercLaneKey;

/**
 * One bar: every lane is present and full-length even when the pattern does not
 * *carry* it, so turning a lane on never has to reshape a bar.
 *
 * Values, per lane:
 * - `k`  kick   — 0 none · 1 hit · 2 accent
 * - `s`  snare  — 0 none · 1 ghost · 2 hit · 3 accent · 4 cross-stick
 * - `h`  hat    — 0 none · 1 closed · 2 accent · 3 open
 * - `r`  ride   — 0 none · 1 ride · 2 bell
 * - `c`  crash  — 0 none · 1 crash
 * - `t1`–`t3`   — 0 none · 1 hit · 2 accent
 * - `hf` foot   — 0 none · 1 chick
 * - `p1`, `p2`  — 0 none · 1 hit · 2 open/high stroke
 */
export type Bar = Record<LaneKey, number[]>;

/** Which hand the style's cymbal ostinato is in. */
export type CymbalVoice = 'hat' | 'ride';

/**
 * Per-bar, per-lane record of the layer a note was placed at.
 *
 * Layers are a *derived view*: the break is stored full (L5) and each layer is
 * re-derived, which is what lets you drop to L2 and back without losing
 * anything. The catch was that a note added while looking at L2 got derived
 * straight back out — you drew a ghost note and heard nothing, because ghosts
 * do not exist below L4. A pin records the layer a note was placed at and the
 * reduction leaves it alone from that layer up. `0` means unpinned.
 */
export type Pins = Array<Partial<Record<LaneKey, number[]>> | undefined>;

export interface Pattern {
  name: string;
  /** Key into `STYLES`. */
  style: string;
  /** Key into `METERS`. */
  meter: string;
  /** Seed the generator ran from — what makes a break reproducible. */
  seed: number;
  /** Which cymbal carries the ostinato. */
  voice: CymbalVoice;
  /**
   * The lanes this pattern actually carries. Every other array exists but is
   * empty; the notation, the grid, the mixer, the LEDs and the export all read
   * this list rather than assuming a kit.
   */
  lanes: LaneKey[];
  /**
   * What is sitting in each percussion slot. A percussion lane is a slot, not
   * an instrument — the style says what rhythm it plays, and swapping a cowbell
   * for a woodblock keeps the part.
   */
  perc: Partial<Record<PercLaneKey, string>>;
  /** Steps carrying the pulse — the backbeat in almost everything. */
  backbeats: number[];
  /**
   * Which lane carries the pulse. Almost always the snare; in jazz there is no
   * backbeat at all and 2 and 4 are marked by the foot.
   */
  bbLane: LaneKey;
  hasRide: boolean;
  hasHat: boolean;
  pins: Pins | null;
  bars: Bar[];
}

/** A meter, in terms the grid understands. */
export interface Meter {
  label: string;
  /** Beats per bar, as notated. */
  num: number;
  /** Note value of the beat: 4 = quarter, 8 = eighth. */
  den: number;
  /** Grid steps per notated beat — 4 in simple time, 2 in compound. */
  sub: number;
  /**
   * Pulse grouping in notated beats. 6/8 is `[3, 3]` — two dotted-quarter
   * pulses — and not six separate beats. Every beam, rest merge, kick cell and
   * hi-hat accent works in these groups, which is how a compound bar beams in
   * threes without anything being told about compound time.
   */
  group: number[];
  hint: string;
}

/** A pulse group, in grid steps. */
export interface Group {
  start: number;
  size: number;
}

/* ---- styles -------------------------------------------------------- */

/**
 * A weighted choice: `[value, weight]`. Used wherever a style expresses a
 * preference rather than a rule.
 */
export type Weighted<T> = [T, number];

/** A four-step kick cell, as a bit string — `'1010'` is hits on 1 and 3. */
export type KickCell = string;

/**
 * How far off the grid one lane sits, as a fraction of a 16th. Positive is
 * late. A pair alternates by step parity, which is how hats lean one way on the
 * beats and the other way between them.
 */
export type FeelValue = number | [number, number];

/**
 * Feel is a property of the **style**, not of the grid — a per-lane offset
 * table in fractions of a 16th, so the feel travels with the tempo. The
 * metronome and the playhead stay on the grid on purpose: the gap between them
 * and the kit is the thing you are learning to hear.
 */
export type Feel = Partial<Record<LaneKey, FeelValue>> & {
  label: string;
  /** Ghost notes lean differently from struck ones. */
  sGhost?: number;
  /**
   * A repeating wobble rather than random jitter — a drummer who leans is
   * consistent about it, and randomness just sounds like a bad clock.
   */
  jitter?: number;
};

/**
 * What a percussion slot plays. One of: explicit `steps`, an ostinato `every`
 * n steps, or `follow` — the clave the cross-stick is already playing, or every
 * snare accent, which is how a clap gets layered onto a backbeat.
 */
export interface PercSpec {
  /** Key into `PERC_INSTS`. */
  inst?: string;
  steps?: number[];
  every?: number;
  from?: number;
  follow?: 'backbeats' | 'snare';
  accents?: number[];
  /** Accent the top of every pulse, where no explicit accents are given. */
  accentPulse?: boolean;
  /** Probability of dropping any given hit, for a part that breathes. */
  drop?: number;
}

export interface Style {
  label: string;
  hint: string;
  /**
   * Where this style's faders start. The reason a style pushes a lane down is
   * almost never that the lane is busy — it is that something else is the music
   * and the lane is sitting on top of it.
   */
  mix?: Partial<Record<LaneKey, number>>;
  /** 8 or 16 — the cymbal ostinato's subdivision. */
  hats: number;
  /** `[min, max]` tempo range the style is written for. */
  bpm: [number, number];
  swing: number;
  /** Which note value the swing slider moves. Defaults to 16ths. */
  swingUnit?: number;
  ghostBias: number;
  /** Where ghosts want to land, as step → weight. */
  ghostWeights?: Record<number, number>;
  /** Probability a ghost is struck rather than left out. */
  ghostHit?: number;
  /** Ghosts written into the style rather than rolled for. */
  snareGhosts?: number[];
  opens: number;
  openSlots?: number[];
  backbeats?: number[];
  /** Defaults to the snare; jazz marks 2 and 4 with the foot instead. */
  backbeatLane?: LaneKey;
  targetDensity?: number;
  /** How hard this style leans on the hi-hat dynamic shape. */
  hatDepth?: number;
  /** Kick cells for bar 1, which carries the downbeat. */
  kick1: Array<Weighted<KickCell>>;
  /** Kick cells for every other beat. */
  kick: Array<Weighted<KickCell>>;
  noKick?: number[];
  forceKick?: number[];
  /**
   * Feathered quarters — a jazz kick played so quietly it is felt rather than
   * heard. The number is its velocity, not a probability.
   */
  kickFeather?: number;
  toms?: boolean;
  /** Steps the left foot marks. */
  foot?: number[];
  perc?: PercSpec[];
  feel?: Feel;
  /** The meter this style is written in. Defaults to 4/4. */
  meter?: string;
  /** A kit the style asks for — picking the style switches to it. */
  kit?: string;
  /** A written-out cymbal pattern, where deriving one will not do. */
  ride?: { steps?: number[]; bell?: number[] };
  hat?: { steps?: number[]; accents?: number[]; opens?: number[] };
  /** The backbeat is a rim click rather than a struck snare. */
  crossStick?: boolean;
  /** The snare figure *is* the groove — do not write over it. */
  clave?: boolean;
  /** No two limbs at once. */
  linear?: boolean;
  /** Probability the backbeat is displaced late in the phrase. */
  displace?: number;
  /** `'comp'` ends a phrase by saying slightly more, rather than with a fill. */
  fill?: 'comp';
  fillComps?: number;
}
