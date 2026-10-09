import { feelOf, feelOffset, hatShape, isSwung } from '@/lib/app/breaks/feel';
import { type Humaniser, limbOf, otherHand } from '@/lib/app/breaks/humanise';
import {
  CHINA,
  CRASH_2,
  DEFAULT_PERC,
  FOOT_LANE,
  HALF_OPEN,
  PERC_LANES,
  RIMSHOT,
  SPLASH,
  TOM_LANES,
  BUZZ,
  gracesOf,
  percInst,
} from '@/lib/app/breaks/lanes';
import { isGroupStart, stepsPerQuarter } from '@/lib/app/breaks/meter';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import { clamp } from '@/lib/app/breaks/rng';
import type { Bar, LaneKey, Pattern } from '@/lib/app/breaks/types';

/**
 * The performance — the one place a written note becomes a sound: which drum,
 * how hard, and how far off the grid.
 *
 * **Everything that plays a pattern voices it from here**: the speakers (the
 * transport, through the engine), the live MIDI port (the transport again, the
 * same velocity × 127), and the MIDI file (`buildMidi`, the same velocity × 127
 * at the same offset). Reading a file back (`readMidi`) classifies velocities
 * against the same levels. So what you hear, what a drum module plays and what
 * a DAW opens are one performance, and a new subtlety — a ghost that leans
 * later, a softer ride on the "e" — is added **here** and reaches all of them,
 * or it reaches none. A test plays a pattern through the real transport and
 * holds the speakers, the port and the file to each other note for note, and
 * another fails if the transport or the exporter start computing dynamics or
 * timing of their own.
 *
 * The speakers are the reference: these levels are what the kit was tuned to.
 * The one thing that differs by output is the mixer — faders and mutes act on
 * the speakers only, because a muted lane is one you are playing yourself and
 * the port exists to hand it to a module (D23).
 */

/**
 * General MIDI drum notes, channel 10.
 *
 * GM has no half-open hat, so `hHalf` is the open hat's 46 sent below the
 * open band (see {@link HALF_OPEN_MAX}); a flam, drag or buzz is the snare's
 * 38 with its grace notes or repeats around it.
 */
export const MIDI_MAP: Record<string, number> = {
  k: 36,
  s: 38,
  sCross: 37,
  sRim: 40,
  h: 42,
  hOpen: 46,
  hHalf: 46,
  r: 51,
  rBell: 53,
  c: 49,
  c2: 57,
  cChina: 52,
  cSplash: 55,
  t1: 48,
  t2: 45,
  t3: 43,
  hf: 44,
};

/**
 * How hard each written value is played, lane by lane, before the hi-hat and
 * ride shaping. Index 0 is silence. The speakers play these; MIDI sends them
 * × 127. `h` and `r` are the base the shape multiplies.
 */
export const LEVELS: Record<LaneKey, number[]> = {
  k: [0, 0.9, 1],
  /* A foot chick is a quiet sound. At 0.62 the sample picker reached for the
     hardest stomp in the kit and turned it down, which is a duller, thuddier hit
     than the pedal actually makes at that volume. */
  hf: [0, 0.4],
  // ghost · hit · accent · cross-stick · rimshot · flam · drag · buzz
  s: [0, 0.5, 0.78, 1, 0.82, 1, 0.9, 0.82, 0.7],
  // closed · accent · open · half-open — the accent comes from the shape and the band
  h: [0, 0.86, 0.86, 0.86, 0.86],
  r: [0, 0.84, 0.95], // ride · bell
  c: [0, 0.9, 0.9, 0.85, 0.8], // crash · crash 2 · china · splash
  t1: [0, 0.86, 1, 0.95], // hit · accent · flam
  t2: [0, 0.86, 1, 0.95],
  t3: [0, 0.86, 1, 0.95],
  p1: [0, 0.7, 0.95],
  p2: [0, 0.7, 0.95],
};

/**
 * The hi-hat and ride bands. The shape (the hats slider) makes an accent on
 * the "a" quieter than a plain hat on the beat — right for the ear, wrong for
 * anyone telling accents from plain notes by velocity, which is the only way
 * MIDI can. So a shaped plain note is held at or below {@link PLAIN_CYMBAL_MAX}
 * and a written accent (or ride bell) at or above {@link ACCENT_CYMBAL_MIN}.
 * The shape still moves every note; it never moves one across the line. A
 * plain hat on the beat peaks at 0.86, under the ceiling, so the band only ever
 * lifts accents — it never flattens the groove. Humanise is held to the same
 * bands.
 */
export const PLAIN_CYMBAL_MAX = 0.9;
export const ACCENT_CYMBAL_MIN = 0.95;

/**
 * The half-open hat and the open hat share GM's note 46, so they are told
 * apart by velocity: a half-open hat is sent at {@link HALF_OPEN_SCALE} of
 * what an open one would be, never above {@link HALF_OPEN_MAX}, and an open
 * hat never below {@link OPEN_HAT_MIN}. The floor is where `hatShape` already
 * bottoms out at the extreme sliders (0.55 × 0.86), so it moves nothing that
 * played before 9-iv. The engine plays a half-open hat at the velocity divided
 * by the scale again, so the speakers hear it as loud as it was written.
 */
export const HALF_OPEN_SCALE = 0.5;
export const HALF_OPEN_MAX = 0.45;
export const OPEN_HAT_MIN = 0.47;

/**
 * Grace notes and buzz repeats.
 *
 * A flam's grace is {@link GRACE_MS} ahead of its note, or {@link GRACE_STEP}
 * of a step when that is less, so at 400 bpm it still quantises to the same
 * sixteenth when a MIDI file is read back. A drag's two graces are two thirds
 * of that gap apart, both inside it. A grace plays at {@link GRACE_LEVEL} of
 * its note and never above {@link GRACE_MAX} of it; a buzz is
 * {@link BUZZ_REPEATS}, each a quarter of a step after the last.
 */
export const GRACE_MS = 25;
export const GRACE_STEP = 0.3;
export const GRACE_LEVEL = 0.35;
export const GRACE_MAX = 0.6;
export const BUZZ_REPEATS = [0.45, 0.35, 0.25];

export interface PerformOptions {
  /** Swing slider, 0–100. */
  swing: number;
  /** Off-grid feel slider, 0–150. */
  feel: number;
  /** Hi-hat and ride dynamics slider, 0–150. */
  hats: number;
  /** Humanise (Phase 9). Absent, or at Amount 0, every note is where the feel puts it. */
  humanise?: HumanisePlay | null;
  /**
   * The tempo, which turns a grace note's milliseconds into steps. Absent, the
   * humaniser's tempo, else 100.
   */
  bpm?: number;
}

/** A humaniser, how much of it to apply, and the tempo its milliseconds are converted to steps at. */
export interface HumanisePlay {
  stream: Humaniser;
  /** 0–100. */
  amount: number;
  bpm: number;
}

export interface Voice {
  lane: LaneKey;
  /** The General MIDI note. */
  note: number;
  /** 0–1: the speakers' gain before the mixer, and the MIDI velocity ÷ 127. */
  velocity: number;
  /** Swing plus feel plus humanise, in grid steps. Negative is early. */
  offset: number;
  /** Flags the engine picks its sample or synth voice by. */
  ghost?: boolean;
  cross?: boolean;
  rim?: boolean;
  open?: boolean;
  /** A half-open hat: sent at {@link HALF_OPEN_SCALE} of its strength, see there. */
  half?: boolean;
  bell?: boolean;
  /** Which cymbal on the crash lane, when it is not the crash. */
  cymbal?: 'c2' | 'cChina' | 'cSplash';
  pedal?: boolean;
  perc?: { inst: string; accent: boolean };
  /** A flam's or drag's grace note, or a buzz's repeat — played as a soft stroke of its drum. */
  ornament?: 'grace' | 'buzz';
}

/** A 0–1 velocity as MIDI sends it. */
export function midiVelocity(v: number): number {
  return clamp(Math.round(v * 127), 1, 127);
}

function cymbal(loud: boolean, v: number): number {
  return loud ? clamp(v, ACCENT_CYMBAL_MIN, 1) : clamp(v, 0, PLAIN_CYMBAL_MAX);
}

/** One MIDI velocity step, the margin a band keeps from the line between two values. */
const MIDI_STEP = 1 / 127;

type Band = readonly [number, number];

const CYMBAL_PLAIN: Band = [MIDI_STEP, PLAIN_CYMBAL_MAX];
const CYMBAL_ACCENT: Band = [ACCENT_CYMBAL_MIN, 1];
const OPEN_HAT: Band = [OPEN_HAT_MIN, PLAIN_CYMBAL_MAX];
const HALF_HAT: Band = [MIDI_STEP, HALF_OPEN_MAX];
const ANY: Band = [MIDI_STEP, 1];

/** The slot each crash-lane value plays; the crash itself is `c`. */
const CRASH_SLOT: Record<number, Voice['cymbal']> = {
  [CRASH_2]: 'c2',
  [CHINA]: 'cChina',
  [SPLASH]: 'cSplash',
};

/**
 * Whether a value is told from its lane's others by velocity alone. The
 * snare's cross-stick and rimshot are notes of their own (37, 40), and a flam,
 * drag or buzz is read by its grace notes or repeats; the same goes for the
 * tom flam. On the crash lane every cymbal is its own note.
 */
function byVelocity(lane: LaneKey, value: number): boolean {
  if (lane === 's') return value <= 3;
  if (lane === 'c') return value === 1;
  if (lane === 't1' || lane === 't2' || lane === 't3') return value <= 2;
  return true;
}

/**
 * The velocities a written value may be humanised across: up to the midpoint
 * with each neighbouring level, less a MIDI step, so {@link valueForVelocity}
 * still reads the note as the value it was written as. A ghost stays a ghost
 * and an accent stays above a plain hit. A value that is not told by velocity
 * (the cross-stick, a flam) is not one of its lane's neighbours and has no
 * band of its own.
 */
function bandOf(lane: LaneKey, value: number): Band {
  if (!byVelocity(lane, value)) return ANY;
  const levels = LEVELS[lane];
  const own = levels[value];
  let lo = MIDI_STEP;
  let hi = 1;
  levels.forEach((level, i) => {
    if (i === 0 || i === value || !byVelocity(lane, i)) return;
    if (level < own) lo = Math.max(lo, (level + own) / 2 + MIDI_STEP);
    else hi = Math.min(hi, (level + own) / 2 - MIDI_STEP);
  });
  return [lo, hi];
}

/**
 * Every note on step `i` of `bar`, voiced. `pat` supplies the meter, the style
 * snapshot (feel, swing unit, kick feathering, hat depth) and the percussion
 * slots.
 *
 * With `opts.humanise`, each note draws its nudge from the stream, in the order
 * the notes are listed here — so two callers that make a humaniser from one
 * seed and voice the same steps in the same order hear the same performance.
 * Without it, the same arguments always give the same voices.
 */
export function performStep(pat: Pattern, bar: Bar, i: number, opts: PerformOptions): Voice[] {
  const m = meterOfPat(pat);
  const attrs = pat.attrs;
  const feel = feelOf(attrs);
  const amt = opts.feel / 100;
  /* Swing is two thirds of a sixteenth at 100. Where a step is an eighth (fast
     swing written in eighths) the same distance is a third of a step, so 100
     is still a triplet: it scales with steps to the quarter, as feel does. */
  const swing = isSwung(i, m, attrs) ? ((opts.swing / 100) * 0.66 * stepsPerQuarter(m)) / 4 : 0;
  /* The style's own feel, on top of swing. Each lane leans its own way, and a
     ghost note can lean differently from a hit on the same drum. A feel is
     written in sixteenths; where a step is a sextuplet, there are more steps
     to the same distance. */
  const spq = stepsPerQuarter(m);
  const offset = (lane: LaneKey, ghost?: boolean): number =>
    swing + (feel && amt ? (amt * feelOffset(feel, lane, i, ghost) * spq) / 4 : 0);

  const out: Voice[] = [];
  /** Each voice's band, by index, for humanise to stay inside. */
  const bands: Band[] = [];
  const add = (voice: Voice, band: Band): void => {
    out.push(voice);
    bands.push(band);
  };

  if (bar.k[i]) {
    /* Feathering: a jazz kick plays all four quarters, but you are meant to feel
       them rather than hear them. Written as ordinary quarter notes, played soft
       — so the critic reads timekeeping, not syncopation. */
    const feather =
      attrs?.kickFeather && bar.k[i] === 1 && isGroupStart(m, i) ? attrs.kickFeather : 1;
    add(
      {
        lane: 'k',
        note: MIDI_MAP.k,
        velocity: LEVELS.k[bar.k[i]] * feather,
        offset: offset('k'),
      },
      bandOf('k', bar.k[i])
    );
  }
  if (bar[FOOT_LANE][i]) {
    add(
      {
        lane: FOOT_LANE,
        note: MIDI_MAP.hf,
        velocity: LEVELS.hf[1],
        offset: offset('h'),
        pedal: true,
      },
      bandOf(FOOT_LANE, 1)
    );
  }
  if (bar.s[i]) {
    const sv = bar.s[i];
    const ghost = sv === 1;
    const voice: Voice = {
      lane: 's',
      note: sv === 4 ? MIDI_MAP.sCross : sv === RIMSHOT ? MIDI_MAP.sRim : MIDI_MAP.s,
      velocity: LEVELS.s[sv],
      offset: offset('s', ghost),
      ghost,
      cross: sv === 4,
    };
    if (sv === RIMSHOT) voice.rim = true;
    add(voice, bandOf('s', sv));
  }
  if (bar.h[i]) {
    const hv = bar.h[i];
    const open = hv === 3 || hv === HALF_OPEN;
    // a half-open hat is shaped as an open one is: a struck note, not a tick
    const shaped = LEVELS.h[hv] * hatShape(i, open ? 3 : hv, m, attrs, opts.hats);
    const voice: Voice = {
      lane: 'h',
      note: hv === HALF_OPEN ? MIDI_MAP.hHalf : open ? MIDI_MAP.hOpen : MIDI_MAP.h,
      velocity:
        hv === HALF_OPEN
          ? clamp(shaped * HALF_OPEN_SCALE, MIDI_STEP, HALF_OPEN_MAX)
          : hv === 3
            ? clamp(shaped, OPEN_HAT_MIN, PLAIN_CYMBAL_MAX)
            : cymbal(hv === 2, shaped),
      offset: offset('h'),
      open,
    };
    if (hv === HALF_OPEN) voice.half = true;
    add(
      voice,
      hv === 2 ? CYMBAL_ACCENT : hv === 3 ? OPEN_HAT : hv === HALF_OPEN ? HALF_HAT : CYMBAL_PLAIN
    );
  }
  if (bar.r[i]) {
    const rv = bar.r[i];
    add(
      {
        lane: 'r',
        note: rv === 2 ? MIDI_MAP.rBell : MIDI_MAP.r,
        velocity: cymbal(rv === 2, LEVELS.r[rv] * hatShape(i, rv, m, attrs, opts.hats)),
        offset: offset('r'),
        bell: rv === 2,
      },
      rv === 2 ? CYMBAL_ACCENT : CYMBAL_PLAIN
    );
  }
  if (bar.c[i]) {
    const cv = bar.c[i];
    const which = CRASH_SLOT[cv];
    const voice: Voice = {
      lane: 'c',
      note: MIDI_MAP[which ?? 'c'],
      velocity: LEVELS.c[cv] ?? LEVELS.c[1],
      offset: offset('c'),
    };
    if (which) voice.cymbal = which;
    add(voice, ANY);
  }

  for (const L of TOM_LANES) {
    if (bar[L][i])
      add(
        { lane: L, note: MIDI_MAP[L], velocity: LEVELS[L][bar[L][i]], offset: offset('s') },
        bandOf(L, bar[L][i])
      );
  }
  PERC_LANES.forEach((L, li) => {
    if (!bar[L][i]) return;
    const inst = pat.perc?.[L] ?? DEFAULT_PERC[li];
    const accent = bar[L][i] === 2;
    const pi = percInst(inst);
    add(
      {
        lane: L,
        note: accent ? pi.hi : pi.midi,
        velocity: LEVELS[L][bar[L][i]],
        offset: offset('s'),
        perc: { inst, accent },
      },
      bandOf(L, bar[L][i])
    );
  });

  const h = opts.humanise;
  /* A sixteenth is 15000 / bpm ms (a sextuplet two thirds of that). Every note
     draws, whatever the Amount, so the stream stays in step with the notes. */
  const stepsPerMs = ((opts.bpm ?? h?.bpm ?? 100) * spq) / 60000;
  const played = h
    ? out.map((voice, n) => {
        const nudge = h.stream.next(voice.lane, h.amount);
        if (nudge.ms === 0 && nudge.gain === 1) return voice;
        const [lo, hi] = bands[n];
        return {
          ...voice,
          velocity: clamp(voice.velocity * nudge.gain, lo, hi),
          offset: voice.offset + nudge.ms * stepsPerMs,
        };
      })
    : out;

  /* The ornaments come last, off the notes as played, so a step without one
     draws exactly what it drew before 9-iv and every existing performance is
     unchanged. */
  for (const note of played.slice()) {
    const v = bar[note.lane][i];
    const graces = gracesOf(note.lane, v);
    if (graces) played.push(...gracesFor(note, graces, stepsPerMs, h));
    else if (note.lane === 's' && v === BUZZ) played.push(...buzzFor(note));
  }
  return played;
}

/**
 * A flam's or drag's grace notes, ahead of the note as it was played. A grace
 * is the other hand's, so it draws its Humanise nudge from that hand's
 * stream; its timing moves at most a quarter of the gap either way, so a loose
 * take never plays it after its note or the two of a drag out of order.
 */
function gracesFor(
  note: Voice,
  graces: number,
  stepsPerMs: number,
  h: HumanisePlay | null | undefined
): Voice[] {
  const gap = Math.min(GRACE_MS * stepsPerMs, GRACE_STEP);
  const at = graces === 2 ? [gap, gap / 3] : [gap];
  return at.map((ahead) => {
    let velocity = note.velocity * GRACE_LEVEL;
    let offset = note.offset - ahead;
    if (h) {
      const nudge = h.stream.next(note.lane, h.amount, otherHand(limbOf(note.lane)));
      velocity *= nudge.gain;
      offset += clamp(nudge.ms * stepsPerMs, -gap / 4, gap / 4);
    }
    return {
      lane: note.lane,
      note: note.note,
      velocity: clamp(velocity, MIDI_STEP, note.velocity * GRACE_MAX),
      offset,
      ghost: true,
      ornament: 'grace' as const,
    };
  });
}

/** A buzz's repeats: the same hand bouncing, so they follow the note and draw nothing. */
function buzzFor(note: Voice): Voice[] {
  return BUZZ_REPEATS.map((level, k) => ({
    lane: note.lane,
    note: note.note,
    velocity: Math.max(MIDI_STEP, note.velocity * level),
    offset: note.offset + (k + 1) / 4,
    ghost: true,
    ornament: 'buzz' as const,
  }));
}

/**
 * The written value a MIDI velocity (1–127) stands for on a lane — the nearest
 * of that lane's {@link LEVELS}, or, for the hi-hat and ride, which side of the
 * band it is on. What `readMidi` reads accents and ghosts by, so a file this
 * app wrote reads back exactly, and a file from anywhere else is read against
 * the same scale the speakers play.
 *
 * Values that are separate notes rather than velocities (cross-stick, rimshot,
 * open hat, ride bell, the crash lane's cymbals, a percussion "hi" drum) are
 * the caller's to decide from the note, and a flam, drag or buzz from the
 * notes around it.
 */
export function valueForVelocity(lane: LaneKey, velocity: number): number {
  const v = velocity / 127;
  if (lane === 'h' || lane === 'r') return v >= (PLAIN_CYMBAL_MAX + ACCENT_CYMBAL_MIN) / 2 ? 2 : 1;
  const levels = LEVELS[lane];
  /* The candidates: every value but silence that is told by velocity — not
     the snare's cross-stick or rimshot, which are notes of their own (37, 40),
     nor a flam, drag or buzz, which are read by what is around them. */
  const candidates = levels
    .map((_, value) => value)
    .filter((value) => value > 0 && byVelocity(lane, value));
  let best = candidates[0];
  for (const value of candidates) {
    if (Math.abs(levels[value] - v) < Math.abs(levels[best] - v)) best = value;
  }
  return best;
}

/**
 * Note 46 is the open hat and the half-open one: the half-open is the one
 * under the midpoint between {@link HALF_OPEN_MAX} and {@link OPEN_HAT_MIN}.
 */
export function openHatValue(velocity: number): number {
  return velocity / 127 < (HALF_OPEN_MAX + OPEN_HAT_MIN) / 2 ? HALF_OPEN : 3;
}
