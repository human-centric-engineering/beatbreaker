/**
 * The pattern model — the one shape every other module in `lib/app/breaks`
 * agrees on.
 *
 * A bar is one array per lane, as long as the meter says. **One step is a
 * sixteenth note** in every meter but sextuplet 4/4 (`4/4-6`), where it is a
 * sixteenth-note triplet, six to the beat. Whatever turns steps into time —
 * the transport, the performance's offsets, the MIDI export — asks the meter
 * (`stepsPerQuarter`) rather than assuming four. What a meter decides is how
 * many steps a bar holds and how they group.
 *
 * Lane values are deliberately small integers rather than a union type: the
 * generator, the critic and the layer reducer all do arithmetic on them
 * (`v >= 2` = "a real note", `Math.min(v, 2)` = "no louder than a hit"), and a
 * union would need a cast at every one of those sites. The legal values per
 * lane are documented on {@link LANE_VALUES} in `lanes.ts` and enforced on the
 * way in by the packed-bar schema in `schema.ts`, which is the only place
 * untrusted values enter.
 */

import type { SectionLetter, TempoRatio } from '@/lib/app/breaks/sections';

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

/**
 * Per-bar written sticking (Phase 10, D44): one character a step — `R` the
 * lead hand, `L` the other, `.` nothing written — or null for a bar with
 * none. Lower case (`r`, `l`) is the same hand with its grace notes on that
 * hand too: the single dragadiddle's drag is a diddle, not a drag from the
 * other hand. Without a letter a step is the drummer's to choose.
 */
export type Sticking = Array<string | null>;

/**
 * What a polyrhythm entry is (Phase 12, plan §3): the device, named for what
 * it is. A grouping or a polymeter is not called a polyrhythm, and a clave is
 * a timeline, not a ratio.
 */
export type PolyDevice =
  'cross-rhythm' | 'hemiola' | 'grouping' | 'polymeter' | 'timeline' | 'ostinato';

/** A hand a lane is played with: `R` the lead hand, `L` the other (D60). */
export type LaneHand = 'R' | 'L';

/**
 * A polyrhythm library entry's two streams (Phase 12, D54, D60): the pulse
 * you count and the rhythm set against it, each a set of lanes, so the layers
 * can play one without the other.
 *
 * The cross pulse is **every `beat` steps from the pattern's first step**,
 * counted across bar lines, `count` of them to a cycle. That is what the
 * chart's second count row numbers, what the click follows when you feel the
 * cross-rhythm, and, where a cycle is not a whole number of bars (a grouping,
 * a polymeter), where the chart draws its cycle lines.
 */
export interface Poly {
  device: PolyDevice;
  /** How it is named on the chart, beside its count: `3:2`, `4:3`, `3/4`, `3s`. Ten characters at most. */
  ratio: string;
  pulse: LaneKey[];
  cross: LaneKey[];
  /** Grid steps between cross pulses — or, with {@link tuplet}, the steps a group of them shares. */
  beat: number;
  /** Cross pulses to a cycle. */
  count: number;
  /**
   * A cross pulse that is a tuplet (12-d): `tuplet` even pulses in every
   * `beat` steps — the five of a 5:4 laid over a bar of sixteen. Absent, one
   * pulse every `beat` steps, on the grid.
   */
  tuplet?: number;
  /**
   * The hand each lane is played with. The library writes it into the
   * sticking too, so the drummer plays it and the chart prints it; this is
   * what labels the lanes.
   */
  hands?: Partial<Record<LaneKey, LaneHand>>;
}

/**
 * The devices a poly fill may be (Phase 12, plan §6): the ones that sit on
 * the grid, and a tuplet (12-d), written as {@link TupletSpan}s. Displacement
 * and a timeline are written and labelled as themselves, never as poly fills
 * (D56).
 */
export type PolyFillDevice = 'cross-rhythm' | 'hemiola' | 'grouping' | 'polymeter' | 'tuplet';

/**
 * A polyrhythmic fill a drummer plays (Phase 12, 12-c): one cell, written as
 * a {@link Figure}, repeated `cells` times and counted back from the bar line,
 * so the cycle comes round on the next 1 — threes of 16ths over the bar, a
 * 3/4 laid over the end of a 4/4 phrase. Written only from a device the
 * drummer's record sources (D56).
 */
export interface PolyFill {
  device: PolyFillDevice;
  /** `n:m`, the cross pulse first, for a cross-rhythm or hemiola, as the record names it. */
  ratio?: string;
  /**
   * One cell, every row as long as the others: the steps from one cell to the
   * next. A tuplet's cell is its notes, one character each, spread evenly over
   * {@link tupletSteps}.
   */
  cell: Figure;
  /**
   * A tuplet fill (12-d): the grid steps each cell's notes share — five
   * sixteenths' worth of notes in four steps is a cell of five over `4`.
   * Absent on a fill on the grid.
   */
  tupletSteps?: number;
  /** How many cells; their steps together may reach back over one bar line. */
  cells: number;
  /**
   * The lanes the cell's snare row goes round, a cell at a time — threes
   * round the toms. Absent, the cell plays where it is written.
   */
  orchestrate?: LaneKey[];
  /**
   * The cymbal keeps time under it: comping across the bar line, the hands
   * leaving only the snare and toms. Absent, it is a fill, and the hands
   * leave the cymbals too.
   */
  time?: boolean;
  /** The kick on every pulse of the span, as under Shrieve's threes; absent, the cell's own kick row, or the groove's. */
  kick?: 'pulse';
}

/**
 * Where a poly fill was written into a pattern (12-c), so the critic judges
 * it as a fill, the layers play it whole or not at all, and `fitHands` keeps
 * its accents. Ends on a bar line, and may start in the bar before.
 */
export interface PolySpan {
  /** The bar it starts in. */
  bar: number;
  /** The step it starts on. */
  at: number;
  /** Steps it covers, across a bar line if it starts in the bar before. */
  span: number;
  device: PolyFillDevice;
  ratio?: string;
  /** Steps from one cell's accent to the next. */
  every: number;
  /**
   * What the span played before the poly fill was written: the plain fill or
   * the groove, a lane's row over the span's steps, for the lanes it changed.
   * Layers below 4 play this instead of the figure.
   */
  plain: Partial<Record<LaneKey, number[]>>;
  /**
   * The hand each lane of the figure is played with, where its writer named
   * them (13-b): a cross-rhythm fill's handing. Its tuplets read it, as a
   * study's read `poly.hands` (D60). Absent on a generated poly fill.
   */
  hands?: Partial<Record<LaneKey, LaneHand>>;
}

/**
 * A tuplet (Phase 12-d, D53): `n` even notes over `span` grid steps of one
 * bar, from step `start` — five against four, a quintuplet round the toms, a
 * septuplet in a beat. One span holds every lane the figure plays, because a
 * drummer reads it as one figure: one bracket, one number. A 5:4 between the
 * hands and the feet is two figures, so two spans.
 *
 * **The span owns its cells.** On a lane it has notes for, the grid's cells
 * under it are kept at 0 by every writer and ignored by every reader, so a
 * note is never played twice. Note `j` is at step `start + j × span / n`.
 *
 * A span stays inside its bar: a bracket is not drawn across a bar line, so
 * a five across two bars is two fives.
 */
export interface TupletSpan {
  /** The bar it is in. */
  bar: number;
  /** The grid step it starts on. */
  start: number;
  /** The grid steps it covers. */
  span: number;
  /** Notes in it, 2–9. */
  n: number;
  /** Per lane, `n` values in the lane's own values (as {@link Bar}'s). */
  notes: Partial<Record<LaneKey, number[]>>;
}

export interface Pattern {
  name: string;
  /** Key of the `Style` row it was generated from. */
  style: string;
  /**
   * `StyleVersion.id` — which version of that style produced it.
   *
   * Provenance, and what a re-derivation from the seed reads. Null for a
   * pattern that did not come from the catalogue: a v3 share code whose style
   * no longer exists, or a fixture built by hand in a test.
   */
  styleVersionId: string | null;
  /**
   * The style facts playback, the critic and the MIDI export read.
   *
   * Carried **on the pattern** rather than looked up, because a pattern has to
   * stand on its own: the style that made it may since have been retuned,
   * deleted, or be private to somebody else, and none of those should change
   * how a saved break sounds or scores. This is the snapshot the wire format
   * carries as `sa`.
   *
   * What is *not* here is everything the generator reads — kick cells, weights,
   * ghost tables. Re-generating or doctoring a pattern needs the live style and
   * takes it as an argument; playing, scoring and exporting one do not.
   */
  attrs: StyleAttrs;
  /**
   * Which of the style's {@link Style.songs} wrote it, by key. Absent for a
   * style without songs. Deriving a B or doctoring the pattern lays the same
   * song over the style again; the stage names it. A section of a song written
   * in sections is the song's key and its letter: `hell-awaits:B`.
   */
  song?: string;
  /** Key into `METERS`. */
  meter: string;
  /**
   * How fast this section plays against the break's tempo, ×½ or ×2
   * (11-e-ii-g). Absent is ×1: the break's tempo, as every pattern played
   * before sections could differ.
   */
  tempoRatio?: TempoRatio;
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
  /**
   * The hands written under the notes, a rudiment's R L R R. Absent on a
   * pattern nobody wrote them for, which is almost all of them: the chart
   * then prints its own guess and the drummer chooses.
   */
  sticking?: Sticking | null;
  /**
   * Every layer plays it whole (D45): a rudiment's accents and flams are the
   * rudiment, not detail to arrive at a higher layer. Absent on everything
   * else, whose layers are derived as ever.
   */
  fixed?: boolean;
  /**
   * A polyrhythm entry's streams (Phase 12). Absent on everything else. With
   * it the layers build the figure up a stream at a time rather than thinning
   * a groove (D54).
   */
  poly?: Poly;
  /** The poly fills written into it (12-c). Absent on everything else. */
  polySpans?: PolySpan[];
  /** Its tuplets (12-d), each owning its cells. Absent on a pattern with none, which is almost all of them. */
  tuplets?: TupletSpan[];
  bars: Bar[];
}

/** A meter, in terms the grid understands. */
export interface Meter {
  label: string;
  /** Beats per bar, as notated. */
  num: number;
  /** Note value of the beat: 4 = quarter, 8 = eighth. */
  den: number;
  /** Grid steps per notated beat — 4 in simple time, 2 in compound, 6 in sextuplet 4/4. */
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
 * A bar, or the end of one, written out: per lane, a row of step values (the
 * lane's own, as on {@link Bar}), `.` for none — `k: '1.1.1.1.1.1.1.1.'`.
 *
 * A style whose idiom is a handful of known beats rather than tendencies
 * (metal: a gallop, a skank beat, a half-time with the kick running under it)
 * lists them as figures, and the generator picks among them rather than
 * building a beat a kick cell at a time. As a fill, the rows are the last
 * steps of the bar, right-aligned to its end.
 */
export type Figure = Partial<Record<LaneKey, string>>;

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
  /**
   * A timeline that never stops: a fill does not lift it, even on percussion
   * mounted on the kit. The style's fills are written for the other hand, as
   * agbekor's bell keeps going under the lead drum's calls.
   */
  held?: boolean;
}

/**
 * The part of a style that travels with a pattern.
 *
 * Eleven fields, and the list is not arbitrary — it is exactly what the transport
 * (`isSwung`, `hatShape`, `feelOffset`, `echo`), the critic (`kickFeather`,
 * `targetDensity`, `doubleKick`, `heelToe`, `singlePedalRuns`), the 3D drummer (`doubleKick`, `oneHandHats`,
 * `weight`) and the MIDI
 * export read off a style once a pattern exists.
 * Everything else a style says is an instruction to the *generator*, and is
 * spent the moment the notes are written.
 *
 * {@link Style} extends this, so a resolved style is a `StyleAttrs` wherever
 * one is wanted and no conversion is needed on the generating path.
 */
export interface StyleAttrs {
  /** Off-grid offsets per lane. See `feel.ts`. */
  feel?: Feel;
  /**
   * Which note value the swing slider moves. Defaults to 16ths.
   *
   * The union rather than `number`: `isSwung` asks whether it is 8 and treats
   * everything else as 16, so a third value would be silently ignored — and
   * now that a style is a row an admin edits, "silently ignored" is a support
   * ticket rather than a typo somebody would notice in review.
   */
  swingUnit?: 8 | 16;
  /**
   * Feathered quarters — a jazz kick played so quietly it is felt rather than
   * heard. The number is its velocity, not a probability.
   */
  kickFeather?: number;
  /** Notes per bar the style is aiming at, which is what the critic scores against. */
  targetDensity?: number;
  /** How hard this style leans on the hi-hat dynamic shape. */
  hatDepth?: number;
  /**
   * Played with a double pedal: a run of 16ths on the kick goes right foot,
   * left foot, so the generator does not thin it, the critic does not call it
   * unplayable, and the 3D drummer plays it on two pedals.
   */
  doubleKick?: boolean;
  /**
   * Sixteenths on the hats played with the lead hand alone, the other hand
   * left on the snare: Stubblefield's Funky Drummer. Without it the 3D
   * drummer plays a run of sixteenth hats hand to hand.
   */
  oneHandHats?: boolean;
  /**
   * How heavily the 3D drummer hits, 0–1: absent or 0 is a hand played from
   * the wrist and fingers, 1 is metal — every stroke taller, the forearm in
   * all of them, the backbeat from the shoulder. Rock sits between.
   */
  weight?: number;
  /**
   * Three 16ths on the kick with one foot, heel and toe: Yussef Dayes's 3,
   * 3e, 3& in Tioga Pass. The generator keeps a triple and the critic passes
   * it; four in a row is still a run, unless the style has a double pedal.
   */
  heelToe?: boolean;
  /**
   * Runs of 16ths on one pedal, heel and toe and the swivel, at the speed
   * others need two for: El Estepario Siberiano, who gave up the double
   * pedal. The generator keeps a run and the critic passes it, as with
   * `doubleKick`, but the 3D drummer plays it with one foot.
   */
  singlePedalRuns?: boolean;
  /**
   * A tape echo on part of the kit: each note in `lanes` heard once more,
   * `steps` later, at `level` of its strength. Played, not written: the
   * drummer struck one note and the machine answered it, so the grid, the
   * critic and the 3D drummer never see the repeat. On the snare only a
   * cross-stick goes through it. Copeland's Space Echo on Walking on the
   * Moon: a dotted 8th, three 16ths, on the hats and the rim.
   */
  echo?: Echo;
}

/** See {@link StyleAttrs.echo}. */
export interface Echo {
  lanes: LaneKey[];
  steps: number;
  level: number;
}

export interface Style extends StyleAttrs {
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
  /** The swing the slider is set to for this style, as the slider reads it. */
  swing: number;
  /**
   * `[min, max]`: where it has one, picking the style and each New press set
   * the slider somewhere in here instead of to {@link swing} — a shuffle is
   * not always the same shuffle. Not on a style whose triplets are its meter.
   */
  swingRange?: [number, number];
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
  /** Kick cells for bar 1, which carries the downbeat. */
  kick1: Array<Weighted<KickCell>>;
  /** Kick cells for every other beat. */
  kick: Array<Weighted<KickCell>>;
  noKick?: number[];
  forceKick?: number[];
  toms?: boolean;
  /** Steps the left foot marks. */
  foot?: number[];
  perc?: PercSpec[];
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
  /**
   * Whole bars written out (see {@link Figure}), weighted. Where a style has
   * them, and the bar is as long as their rows, the generator picks one for
   * the groove and another for a second half of the phrase, rather than
   * writing kick cells and an ostinato; the cells still serve any other meter.
   */
  figures?: Array<Weighted<Figure>>;
  /** Fills written out, right-aligned to the bar's end, weighted; in place of the generic shapes. */
  fills?: Array<Weighted<Figure>>;
  /** `'comp'` ends a phrase by saying slightly more, rather than with a fill. */
  fill?: 'comp';
  fillComps?: number;
  /**
   * Probability, 0–1, that a bar ending a pair of bars inside the phrase is
   * filled too, not only the last one: a drummer who fills two or three times
   * as often as most. Absent is 0, and at 0 the generator draws nothing for it.
   */
  midFills?: number;
  /**
   * Probability, 0–1, that the crash a bar would land on its 1 comes an 8th
   * early instead: crash and kick on the "and" of 4, tied over the bar line,
   * and nothing on the 1. Tried after each fill inside the phrase and where
   * the second half starts. Absent is 0, and at 0 nothing is drawn for it.
   */
  anticipate?: number;
  /**
   * The cymbal an anticipation lands on, as a crash-lane value: 1 the crash
   * (the default), 4 a splash. Copeland's fills end on a splash on the "and"
   * of 4.
   */
  anticipateCymbal?: number;
  /**
   * Fills grow through the phrase: inside it the generator picks among the
   * fills no longer than half a bar, and at its end leans to the longest.
   * Mitchell's fills get longer and wilder as a song goes on.
   */
  fillsGrow?: boolean;
  /**
   * The second half of the phrase says more than the first: of the two
   * figures drawn, the busier one goes second, and a phrase of four bars or
   * more is always split in two. A verse that builds into the chorus.
   */
  build?: boolean;
  /**
   * The swing follows the tempo, as a jazz drummer's does: about even at 300,
   * a triplet at 200 and below (`swingAtTempo`). The Studio derives the slider
   * from the tempo until you set it yourself. `swing` and `swingRange` still
   * say where it starts.
   */
  swingCurve?: boolean;
  /**
   * The order a generated fill goes round the toms, high to floor by default.
   * A left-hander on a right-handed kit (Ringo) leads from the floor tom:
   * `['t3', 't1', 't2']`. Written fills say their own order.
   */
  fillOrder?: LaneKey[];
  /**
   * Whether each half of the phrase is marked on its 1 with a crash, and a
   * kick under it. Both default to true. Tony Allen leaves the 1 to the
   * figure: snare there as often as kick, and almost never a crash. `crash`
   * may be a probability instead: Copeland crashes on a third of his 1s.
   */
  phraseMark?: { crash?: boolean | number; kick?: boolean };
  /**
   * Whether a varied bar may take the hand off its ostinato for a cymbal
   * accent on an off-beat 8th. Defaults to true. False is a style with no
   * cymbal in it at all: agbekor, whose ensemble has none.
   */
  cymbalAccent?: boolean;
  /**
   * Probability, 0–1, that the phrase ends on a fill (0.8, or 0.7 for a comp
   * ending, by default). Tony Allen: "I play like a machine or a loop."
   */
  fillChance?: number;
  /**
   * Accent cycles that run across the bar line ({@link CrossRhythm}): a
   * dotted-quarter rimshot every six sixteenths is three against four for
   * three bars; every fourteen eighths is 7/4 over 4/4. A one-bar figure
   * cannot hold either.
   */
  crossRhythms?: Array<Weighted<CrossRhythm>>;
  /** Probability, 0–1, that a phrase carries one of {@link crossRhythms}. Absent is 0. */
  crossRhythm?: number;
  /**
   * The poly fills the drummer plays ({@link PolyFill}), weighted, each from a
   * device the drummer's record sources (D56).
   */
  polyFills?: Array<Weighted<PolyFill>>;
  /**
   * Probability, 0–1, that a phrase ends on one of {@link polyFills}. Absent
   * is 0, and at 0 nothing is drawn for it. Drawn on a stream of its own.
   */
  polyFill?: number;
  /**
   * A famous drummer's playing rather than a genre: the style picker files it
   * under Drummers instead of Styles. Picking one is picking a style.
   */
  drummer?: boolean;
  /**
   * A drummer's main bands, the best known first: the picker prints them
   * under the name, so two Roger Taylors read apart, and a search finds them.
   */
  bands?: string[];
  /**
   * The songs a style plays, where one meter, one tempo and one feel cannot
   * hold it: a drummer who played a 3/4 jazz waltz, a slow 12/8 blues and a
   * brushed swing in the same band. Each New picks one (see `songs.ts`), and
   * the song's params are laid over the style's for that pattern.
   */
  songs?: StyleSong[];
  /**
   * The articulations (9-iv), each the probability, 0–1, that the generator
   * writes one where it may: a backbeat as a `rimshot`; a fill accent as a
   * `flam`; the ghost just before a backbeat as a `drag`; a fill hit as a
   * `buzz`; an open hat as `halfOpen`. Absent is 0, and at 0 the generator
   * writes exactly what it did before they existed.
   */
  rimshot?: number;
  flam?: number;
  drag?: number;
  buzz?: number;
  halfOpen?: number;
}

/**
 * An accent repeating every `every` steps, counted from the start of the bars
 * it covers and carried straight over their bar lines: what each lane plays on
 * it, in the lane's own values. `bars` is how many bars at the end of the
 * phrase it covers; absent, all of them.
 */
export interface CrossRhythm {
  every: number;
  lanes: Partial<Record<LaneKey, number>>;
  bars?: number;
}

/**
 * What a song may change about its style: anything the generator, the transport
 * or the controls read, bar the style's name and description, the drummer flag
 * and the song list itself.
 */
export type StyleSongParams = Partial<Omit<Style, 'label' | 'hint' | 'drummer' | 'songs'>>;

/**
 * One part of a song written in sections (11-e-ii-d): an intro, a verse, a
 * section in another meter. Its params are laid over the song's, which are
 * laid over the style's, so a section says only what changes — its meter, its
 * figures, the forced kick an intro has not got. The tempo is the song's: a
 * break has one.
 */
export interface SongSection {
  /** The section of the break it writes: A first, then B, C… in order. */
  letter: SectionLetter;
  /** What it is, in a few words: 'the intro', 'the 5/4 opening'. */
  label: string;
  /** How many bars New writes; absent, the length the pickers hold. */
  bars?: number;
  /**
   * How fast it plays against the song's tempo (11-e-ii-g): Angel of Death's
   * break at ×½. Its own `bpm` is the record's, at the speed it plays.
   */
  tempoRatio?: TempoRatio;
  /**
   * The song keys this section was before the song was written in sections
   * ('sherpa-triplets'), so a pattern saved under one still lays the same
   * grooves over its style.
   */
  aliases?: string[];
  params: StyleSongParams;
}

/**
 * One song in a style's {@link Style.songs}: its own meter, tempo, swing, kit,
 * grooves and fills, laid over the style's.
 */
export interface StyleSong {
  /** Recorded on a pattern as {@link Pattern.song}, so a slug that stays put. */
  key: string;
  /** 'Manic Depression'. */
  title: string;
  /** What it is, in a few words, for the stage: 'a fast jazz waltz in 3/4'. */
  feel: string;
  /** How often New picks it, against the style's other songs. */
  weight: number;
  params: StyleSongParams;
  /**
   * The song's parts, each a section of the break in its own meter (11-e-ii-d).
   * New writes every one; absent, the song is one part, an A and a B from it.
   */
  sections?: SongSection[];
  /** The order the sections play in; absent, each once, A to the last. */
  arrangement?: SectionLetter[];
}

/**
 * A style as the domain receives it: which catalogue row it is, and what that
 * row says.
 *
 * Nothing under `lib/app/breaks` reads a style table — the caller resolves one
 * (from the database on the server, from the Studio's catalogue in the browser)
 * and hands it over. `key` and `versionId` are what the generated pattern
 * records as provenance; `params` is what the generator actually reads.
 *
 * `versionId` is null for a style that did not come from the catalogue: a test
 * fixture, or the fallback a v3 share code resolves to when its style is gone.
 */
export interface ResolvedStyle {
  key: string;
  versionId: string | null;
  version: number;
  params: Style;
}
