import { feelOf, feelOffset, hatShape, isSwung } from '@/lib/app/breaks/feel';
import { DEFAULT_PERC, FOOT_LANE, PERC_LANES, TOM_LANES, percInst } from '@/lib/app/breaks/lanes';
import { isGroupStart } from '@/lib/app/breaks/meter';
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

/** General MIDI drum notes, channel 10. */
export const MIDI_MAP: Record<string, number> = {
  k: 36,
  s: 38,
  sCross: 37,
  h: 42,
  hOpen: 46,
  r: 51,
  rBell: 53,
  c: 49,
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
  s: [0, 0.5, 0.78, 1, 0.82], // ghost · hit · accent · cross-stick
  h: [0, 0.86, 0.86, 0.86], // closed · accent · open — the accent comes from the shape and the band
  r: [0, 0.84, 0.95], // ride · bell
  c: [0, 0.9],
  t1: [0, 0.86, 1],
  t2: [0, 0.86, 1],
  t3: [0, 0.86, 1],
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
 * plain hat on the beat peaks at 0.86 × 1.03 wobble, under the ceiling, so the
 * band only ever lifts accents — it never flattens the groove.
 */
export const PLAIN_CYMBAL_MAX = 0.9;
export const ACCENT_CYMBAL_MIN = 0.95;

export interface PerformOptions {
  /** Swing slider, 0–100. */
  swing: number;
  /** Off-grid feel slider, 0–150. */
  feel: number;
  /** Hi-hat and ride dynamics slider, 0–150. */
  hats: number;
}

export interface Voice {
  lane: LaneKey;
  /** The General MIDI note. */
  note: number;
  /** 0–1: the speakers' gain before the mixer, and the MIDI velocity ÷ 127. */
  velocity: number;
  /** Swing plus feel, in grid steps. Negative is early. */
  offset: number;
  /** Flags the engine picks its sample or synth voice by. */
  ghost?: boolean;
  cross?: boolean;
  open?: boolean;
  bell?: boolean;
  pedal?: boolean;
  perc?: { inst: string; accent: boolean };
}

/** A 0–1 velocity as MIDI sends it. */
export function midiVelocity(v: number): number {
  return clamp(Math.round(v * 127), 1, 127);
}

function cymbal(loud: boolean, v: number): number {
  return loud ? clamp(v, ACCENT_CYMBAL_MIN, 1) : clamp(v, 0, PLAIN_CYMBAL_MAX);
}

/**
 * Every note on step `i` of `bar`, voiced. `pat` supplies the meter, the style
 * snapshot (feel, swing unit, kick feathering, hat depth) and the percussion
 * slots.
 *
 * Not pure, deliberately: the hi-hat and ride shaping carries a small random
 * wobble unless the hats slider is at 0 (`hatShape`).
 */
export function performStep(pat: Pattern, bar: Bar, i: number, opts: PerformOptions): Voice[] {
  const m = meterOfPat(pat);
  const attrs = pat.attrs;
  const feel = feelOf(attrs);
  const amt = opts.feel / 100;
  const swing = isSwung(i, m, attrs) ? (opts.swing / 100) * 0.66 : 0;
  /* The style's own feel, on top of swing. Each lane leans its own way, and a
     ghost note can lean differently from a hit on the same drum. */
  const offset = (lane: LaneKey, ghost?: boolean): number =>
    swing + (feel && amt ? amt * feelOffset(feel, lane, i, ghost) : 0);

  const out: Voice[] = [];

  if (bar.k[i]) {
    /* Feathering: a jazz kick plays all four quarters, but you are meant to feel
       them rather than hear them. Written as ordinary quarter notes, played soft
       — so the critic reads timekeeping, not syncopation. */
    const feather =
      attrs?.kickFeather && bar.k[i] === 1 && isGroupStart(m, i) ? attrs.kickFeather : 1;
    out.push({
      lane: 'k',
      note: MIDI_MAP.k,
      velocity: LEVELS.k[bar.k[i]] * feather,
      offset: offset('k'),
    });
  }
  if (bar[FOOT_LANE][i]) {
    out.push({
      lane: FOOT_LANE,
      note: MIDI_MAP.hf,
      velocity: LEVELS.hf[1],
      offset: offset('h'),
      pedal: true,
    });
  }
  if (bar.s[i]) {
    const sv = bar.s[i];
    const ghost = sv === 1;
    out.push({
      lane: 's',
      note: sv === 4 ? MIDI_MAP.sCross : MIDI_MAP.s,
      velocity: LEVELS.s[sv],
      offset: offset('s', ghost),
      ghost,
      cross: sv === 4,
    });
  }
  if (bar.h[i]) {
    const hv = bar.h[i];
    out.push({
      lane: 'h',
      note: hv === 3 ? MIDI_MAP.hOpen : MIDI_MAP.h,
      velocity: cymbal(hv === 2, LEVELS.h[hv] * hatShape(i, hv, m, attrs, opts.hats)),
      offset: offset('h'),
      open: hv === 3,
    });
  }
  if (bar.r[i]) {
    const rv = bar.r[i];
    out.push({
      lane: 'r',
      note: rv === 2 ? MIDI_MAP.rBell : MIDI_MAP.r,
      velocity: cymbal(rv === 2, LEVELS.r[rv] * hatShape(i, rv, m, attrs, opts.hats)),
      offset: offset('r'),
      bell: rv === 2,
    });
  }
  if (bar.c[i])
    out.push({ lane: 'c', note: MIDI_MAP.c, velocity: LEVELS.c[1], offset: offset('c') });

  for (const L of TOM_LANES) {
    if (bar[L][i])
      out.push({ lane: L, note: MIDI_MAP[L], velocity: LEVELS[L][bar[L][i]], offset: offset('s') });
  }
  PERC_LANES.forEach((L, li) => {
    if (!bar[L][i]) return;
    const inst = pat.perc?.[L] ?? DEFAULT_PERC[li];
    const accent = bar[L][i] === 2;
    const pi = percInst(inst);
    out.push({
      lane: L,
      note: accent ? pi.hi : pi.midi,
      velocity: LEVELS[L][bar[L][i]],
      offset: offset('s'),
      perc: { inst, accent },
    });
  });

  return out;
}

/**
 * The written value a MIDI velocity (1–127) stands for on a lane — the nearest
 * of that lane's {@link LEVELS}, or, for the hi-hat and ride, which side of the
 * band it is on. What `readMidi` reads accents and ghosts by, so a file this
 * app wrote reads back exactly, and a file from anywhere else is read against
 * the same scale the speakers play.
 *
 * Values that are separate notes rather than velocities (cross-stick, open hat,
 * ride bell, a percussion "hi" drum) are the caller's to decide from the note.
 */
export function valueForVelocity(lane: LaneKey, velocity: number): number {
  const v = velocity / 127;
  if (lane === 'h' || lane === 'r') return v >= (PLAIN_CYMBAL_MAX + ACCENT_CYMBAL_MIN) / 2 ? 2 : 1;
  const levels = LEVELS[lane];
  /* The candidates: every value but silence, and not the snare's cross-stick,
     which is a note of its own (37). */
  const candidates = levels
    .map((_, value) => value)
    .filter((value) => value > 0 && !(lane === 's' && value === 4));
  let best = candidates[0];
  for (const value of candidates) {
    if (Math.abs(levels[value] - v) < Math.abs(levels[best] - v)) best = value;
  }
  return best;
}
