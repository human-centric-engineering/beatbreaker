/**
 * What a recipe says: which recordings make which slot of a pack.
 *
 * A recipe never names a velocity layer or a round-robin. It names the
 * candidate hits — every stroke of one articulation, as a path pattern — and
 * how many layers and takes it wants. The build mixes and measures every
 * candidate and chooses by loudness (`select.ts`). Each library names its
 * samples its own way (`vl`/`rr`, numbered strokes, numbered samples), and
 * loudness reads all of them alike.
 */

import type { SourceId } from '@/scripts/kits/sources';

/** What a piece is, for level matching. Targets are in `ROLE_TARGET_DB`. */
export type Role = 'kick' | 'snare' | 'tom' | 'hat' | 'ride' | 'crash' | 'perc';

/**
 * Each role's level against the kick, in dB (`sound-plan.md` §6). A snare
 * swapped in from another library lands where the old one sat.
 */
export const ROLE_TARGET_DB: Record<Role, number> = {
  kick: 0,
  snare: 0,
  tom: -2,
  hat: -6,
  ride: -7,
  crash: -5,
  perc: -8,
};

/** The longest a role's sample may ring before it is faded, in seconds. */
export const ROLE_TAIL_CAP: Record<Role, number> = {
  kick: 1.2,
  snare: 1.2,
  tom: 1.2,
  hat: 1.5,
  ride: 3,
  crash: 4,
  perc: 1.2,
};

export interface Pick {
  source: SourceId;
  /**
   * The candidates, as a path in the source with `*` for the part that varies
   * between strokes and `{mic}` for the part that varies between mics:
   * `Samples/{mic}/snare/{mic}_snare_center_vl*.flac`.
   */
  pattern: string;
  /** Each mic's weight in the mono mix. A pattern without `{mic}` has `{ '': 1 }`. */
  mics: Record<string, number>;
  /**
   * For a source that keeps every mic in one file (DrumGizmo): each mic's
   * channel, by its name in the instrument file, and its weight. `mics` is
   * then `{ '': 1 }`.
   */
  channels?: Record<string, number>;
  /** How many velocity layers to keep. */
  layers: number;
  /** How many takes to keep in each. */
  rr: number;
  /**
   * Which candidates are in play, in dB below the loudest: `[0, 14]` is the
   * top 14 dB. The layers are spread evenly across it.
   */
  range?: [number, number];
  /** Candidates to leave out, by path. */
  exclude?: RegExp;
  /** The longest it may ring, in seconds, where the role's cap is wrong for it. */
  tail?: number;
}

/** One instrument from one source, and the slots it fills. */
export interface Piece {
  role: Role;
  /** Slot id → its recordings. The first slot is the one the level is matched on. */
  slots: Record<string, Pick>;
  /**
   * Match the level on this instead of the first slot: measured, never
   * shipped. A brush kit that borrows the stick kit's foot hat gives it the
   * stick kit's closed hat here, so the foot sits as it does there rather
   * than turned up with the brushes.
   */
  matchOn?: Pick;
}

/**
 * A shared percussion instrument: its normal stroke and its accent, which for
 * the congas and the agogô is a different drum or bell rather than the same
 * one hit harder. `percHit` reads them as the slot's first and second layer.
 */
export interface PercPiece {
  stroke: Pick;
  accent: Pick;
}

export interface Recipe {
  /** The folder under `public/kits/`, and the kit row's `pack`. */
  pack: string;
  pieces: Piece[];
  perc?: Record<string, PercPiece>;
}
