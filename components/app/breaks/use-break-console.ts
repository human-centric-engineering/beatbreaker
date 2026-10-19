'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BreakAudio, SourceStack } from '@/lib/app/breaks/audio/engine';
import { MidiOut } from '@/lib/app/breaks/audio/midi-out';
import { PackSource } from '@/lib/app/breaks/audio/packs';
import { SynthSource } from '@/lib/app/breaks/audio/synth-source';
import { YourSampleSource } from '@/lib/app/breaks/audio/your-samples';
import {
  Transport,
  type PlayEvent,
  type ScheduledStep,
  type SectionLetter,
  type TransportSnapshot,
  maxBpm,
  maxBpmOf,
  minBpmOf,
  playableSlots,
  skipSlot,
  soloInPlay,
} from '@/lib/app/breaks/audio/transport';
import {
  type Critique,
  type Playability,
  barEq,
  critique,
  playability,
} from '@/lib/app/breaks/critic';
import type { Visibility } from '@/lib/app/breaks/community/visibility';
import { type CrossRhythmSpec, crossRhythm } from '@/lib/app/breaks/cross-rhythm';
import { type DoctorMove, doctor } from '@/lib/app/breaks/doctor';
import { deriveB } from '@/lib/app/breaks/generate';
import {
  CREATIVITY,
  SIZE,
  SIZE_MAX,
  SIZE_MIN,
  VIEW,
  type VIEW_MODES,
} from '@/lib/app/breaks/browser-keys';
import {
  DEFAULT_MIX,
  LANES,
  LANE_VALUES,
  PERC_LANES,
  type PanView,
  TOM_LANES,
  bbValue,
  mixLanes,
} from '@/lib/app/breaks/lanes';

import { reducePattern } from '@/lib/app/breaks/layers';
import {
  MAX_ARRANGEMENT,
  MAX_BREAK_BARS,
  type MaybeSections,
  type Sections,
  type TempoRatio,
  hasTempoRatios,
  lettersOf,
  nextLetter,
  patternsOf,
  ratioOf,
  totalBars,
} from '@/lib/app/breaks/sections';
import type { StoredLink } from '@/lib/app/breaks/links';
import {
  HUMANISE_AMOUNT,
  type HumaniseMode,
  type HumaniseSetting,
  humaniseAmount,
  humaniseSeed,
} from '@/lib/app/breaks/humanise';
import { buildMidi, type MidiFile } from '@/lib/app/breaks/midi';
import { takePendingLink } from '@/lib/app/breaks/pending-link';
import {
  type CustomLanes,
  type WrittenHand,
  clonePattern,
  meterOfPat,
  resolveLanes,
  stickingAt,
  setPin,
  writePerc,
} from '@/lib/app/breaks/pattern';
import { clamp, makeRng } from '@/lib/app/breaks/rng';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { readScratch } from '@/lib/app/breaks/scratch';
import {
  type BreakDoc,
  breakDocFromPayload,
  breakPayload,
  decodeBreak,
  encodeBreak,
  patternFromPacked,
} from '@/lib/app/breaks/share';
import { songBreak, writePart } from '@/lib/app/breaks/song-break';
import {
  pickSong,
  songMeter,
  songPaces,
  songOf,
  songTempo,
  withSong,
} from '@/lib/app/breaks/songs';
import { styleIn, swingAtTempo, swingFor } from '@/lib/app/breaks/styles';
import { useStoredSetting } from '@/lib/app/breaks/use-stored-setting';
import { type Twist, creativeBreak } from '@/lib/app/breaks/creativity';
import {
  alternateHands,
  barHands,
  clearBarHands,
  dropHandsIn,
  keepHands,
  writeHand,
} from '@/lib/app/breaks/hands';
import { clearPlainAt, dropPolySpansAt, keepPolySpans, plainAt } from '@/lib/app/breaks/poly-fill';
import {
  addDouble,
  addTuplet,
  keepTuplets,
  ownedBy,
  removeTuplet,
  setTupletNote,
  tupletsIn,
  twoAStep,
} from '@/lib/app/breaks/tuplets';
import { groupAt, groupsOf } from '@/lib/app/breaks/meter';
import type { StudioCatalogue } from '@/lib/app/breaks/catalogue/types';
import { percussionSource } from '@/lib/app/breaks/catalogue/types';
import type { LaneKey, Pattern, ResolvedStyle, Style, TupletSpan } from '@/lib/app/breaks/types';
import { type VoiceParams, kitEngine, kitIsPlayable, withTuning } from '@/lib/app/breaks/kit';
import { useStudioSettings } from '@/components/app/breaks/use-studio-settings';
import { logger } from '@/lib/logging';
import { DEFAULT_STUDIO_SETTINGS, type StudioSettings } from '@/lib/validations/studio-settings';

/** The span two to a step (13-a) a lane's step is in, if it is in one: a double. */
function doubleAt(p: Pattern, bar: number, lane: LaneKey, step: number): TupletSpan | undefined {
  const span = ownedBy(tupletsIn(p, bar), lane, step);
  return span && twoAStep(span) ? span : undefined;
}

/**
 * All of the console's state, and every action that changes it.
 *
 * The prototype kept one module-global `state` object and re-rendered the page
 * by hand. Here React owns it, and the transport is handed a `getSnapshot`
 * callback that reads the *current* values on every scheduled step — so moving
 * a fader or editing a cell lands on the next note rather than the next loop,
 * without the transport holding a stale copy or re-subscribing.
 *
 * Patterns are stored at **layer 5** and reduced for display and playback.
 * That is what lets you drop to L2 and back without losing anything.
 */

export type ViewMode = (typeof VIEW_MODES)[number];

/**
 * The section the grid and the Doctor work on (E11) — one choice, not two.
 * A section when that is the choice. With All (`'both'`, its stored name from
 * when there were two), the section under the playhead while it moves, so the
 * section you hear is the one you see; during the count-in and when stopped,
 * whichever you last chose or edited.
 */
export function editingSection(
  viewMode: ViewMode,
  playhead: PlayEvent | null,
  touched: SectionLetter
): SectionLetter {
  if (viewMode !== 'both') return viewMode;
  return playhead && !playhead.count && playhead.letter ? playhead.letter : touched;
}

/**
 * The section choice as it applies to the break on the stage: a section the
 * break does not have (C, kept in the browser from another break) is All.
 */
export function viewIn(viewMode: ViewMode, sections: MaybeSections): ViewMode {
  return viewMode === 'both' || sections[viewMode] ? viewMode : 'both';
}

/**
 * The arrangement, kept to the sections there are: a slot naming one that has
 * gone is dropped, and an arrangement left empty plays A.
 */
export function arrangementIn(
  arrangement: readonly SectionLetter[],
  sections: MaybeSections
): SectionLetter[] {
  const kept = arrangement.filter((L) => !!sections[L]);
  return kept.length ? kept : ['A'];
}

/** The arrangement the Studio opens with, and comes back to when it has no other of yours. */
export const DEFAULT_ARRANGEMENT: readonly SectionLetter[] = ['A', 'A', 'A', 'B'];

function sameOrder(a: readonly SectionLetter[], b: readonly SectionLetter[]): boolean {
  return a.length === b.length && a.every((L, i) => L === b[i]);
}

/**
 * The arrangement after a whole New, and yours to come back to.
 *
 * A song in sections brings its own order (`next`), and the order it replaces
 * is put aside as yours. A New of anything else gives yours back, kept to the
 * sections there are — unless you changed the song's order while it played,
 * which makes it yours. "The song's" is the order of the song in sections on
 * the stage (`playing`), still as it set it; that holds after an Undo too,
 * which is why it is read off the stage rather than remembered. With nothing
 * of yours put aside, yours is the Studio's own.
 */
export function arrangementForNew(o: {
  current: readonly SectionLetter[];
  playing: readonly SectionLetter[] | null;
  own: readonly SectionLetter[] | null;
  next: readonly SectionLetter[] | null;
  sections: MaybeSections;
}): { arrangement: SectionLetter[]; own: SectionLetter[] | null } {
  const songs = !!o.playing && sameOrder(o.current, o.playing);
  const yours = songs ? (o.own ?? DEFAULT_ARRANGEMENT) : o.current;
  return o.next
    ? { arrangement: [...o.next], own: [...yours] }
    : { arrangement: arrangementIn(yours, o.sections), own: null };
}

/** Every section of a decoded break, as the Studio holds them. */
function sectionsOfDoc(doc: Sections): MaybeSections {
  const out: MaybeSections = {};
  for (const L of lettersOf(doc)) out[L] = doc[L];
  return out;
}

/** Every section reduced to a layer — how they sound and look there. */
function reduceSections(sections: MaybeSections, level: number, feelCross = false): MaybeSections {
  const out: MaybeSections = {};
  for (const L of lettersOf(sections)) {
    const p = sections[L];
    if (p) out[L] = reducePattern(p, level, feelCross);
  }
  return out;
}

/** A copy of every section, for the undo stack. */
function cloneSections(sections: MaybeSections): MaybeSections {
  const out: MaybeSections = {};
  for (const L of lettersOf(sections)) {
    const p = sections[L];
    if (p) out[L] = clonePattern(p);
  }
  return out;
}

/** Two undo steps' worth of every section. */
interface Snapshot {
  sections: MaybeSections;
  /**
   * Tempo, swing, layer and arrangement — carried only by an entry whose
   * change moved them (one of BeatBuddy's), so one Undo puts those back too.
   * Every other edit changes notes alone, and an undo of it leaves your tempo
   * where you have since put it.
   */
  playback?: Playback;
}

interface Playback {
  bpm: number;
  baseBpm: number;
  swing: number;
  /** Whether that swing was set by hand rather than by the style. */
  swingYours: boolean;
  level: number;
  arrangement: SectionLetter[];
}

/** Cells that changed in the last change BeatBuddy made, keyed `bar:lane:step`, per section. */
export interface Flash {
  cells: Partial<Record<SectionLetter, ReadonlySet<string>>>;
  /** Moves on with every change, so the same cells can flash twice in a row. */
  seq: number;
}

/** How long changed cells stay lit. */
const FLASH_MS = 1600;

/** `bar:lane:step` for every cell that differs between two versions of a section. */
function changedCells(
  before: Pattern | null | undefined,
  after: Pattern | null | undefined
): Set<string> {
  const out = new Set<string>();
  if (!after) return out;
  after.bars.forEach((bar, b) => {
    for (const lane of LANES) {
      const row = bar[lane];
      for (let i = 0; i < row.length; i++) {
        if ((before?.bars[b]?.[lane]?.[i] ?? 0) !== row[i]) out.add(`${b}:${lane}:${i}`);
      }
    }
  });
  return out;
}

const HISTORY_CAP = 40;

export interface BreakConsole {
  ready: boolean;
  /**
   * There is no catalogue to write a break from.
   *
   * Distinct from `!ready`, which means "still working". This one never
   * resolves: the styles arrive server-side with the page, so an empty set at
   * mount stays empty, and the generator has nothing to start from. It happens
   * on an install whose seed has not run, and — the one worth naming — when
   * every style row fails `styleParamsSchema` and is dropped, which the log
   * records one line at a time while the screen says nothing.
   *
   * Without this the Studio sat on "Writing you a break…" for ever.
   */
  noCatalogue: boolean;
  /** Every section, A to Z, as stored (layer 5). A and B are null only before the first break. */
  patterns: MaybeSections;
  /** The letters the break has, in order: A, B and any added. */
  letters: SectionLetter[];
  /** The sections as they sound and look at the current layer. */
  view: MaybeSections;
  /**
   * The same sections one layer up, or `null` at the top layer. The chart
   * draws the difference faintly, so you can see what arrives next without
   * committing to playing it.
   */
  next: MaybeSections | null;
  report: Critique | null;
  checks: Playability | null;
  tries: { tries: number; rejected: number } | null;

  level: number;
  setLevel: (n: number) => void;
  /**
   * The one section choice (E11): what the chart shows and plays, and the grid
   * edits — a section, or All (`'both'`). Never a section the break has not got.
   */
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  /**
   * The section the grid shows and the Doctor works on — never chosen on its
   * own. The section when that is the choice; with All, the section under the
   * playhead while playing, and otherwise the last one you touched.
   */
  editing: SectionLetter;

  style: string;
  setStyle: (s: string) => void;
  meter: string;
  setMeter: (m: string) => void;
  bars: number;
  setBars: (n: number) => void;
  density: number;
  setDensity: (n: number) => void;
  ghosts: number;
  setGhosts: (n: number) => void;
  swing: number;
  setSwing: (n: number) => void;
  /** Whether you set the swing yourself (New keeps it) rather than the style. */
  swingYours: boolean;
  hats: number;
  setHats: (n: number) => void;
  feel: number;
  setFeel: (n: number) => void;
  lanesMode: 'style' | 'custom';
  setLanesMode: (m: 'style' | 'custom') => void;
  customLanes: CustomLanes;
  setCustomLanes: (c: CustomLanes) => void;

  bpm: number;
  setBpm: (n: number) => void;
  /**
   * Play at a percentage of the pattern's own tempo — of the layer's, with the
   * match on — without changing what the pattern's own tempo is (E5). 100 is
   * back where it was written.
   */
  quickTempo: (pct: number) => void;
  bpmCeiling: number;
  /** The lowest tempo the break may take: 50, or 100 with a section at ×½ (11-e-ii-g). */
  bpmFloor: number;
  playing: boolean;
  /** Play, or Pause while playing: Play again carries on from the top of the section it stopped in. */
  togglePlay: () => void;
  /** Stop, and go back to the top: the next Play starts the arrangement from its first slot. */
  stopToTop: () => void;
  /**
   * The arrangement slot the next Play starts from — where Pause stopped, or
   * where a skip left it while stopped. Null is the top. A new break clears it.
   */
  cue: number | null;
  /** Skip a section forward or back, as a media player skips a track (`skipSlot`). */
  skip: (delta: 1 | -1) => void;
  /** Go to the top of an arrangement slot: now, while playing, or for the next Play. */
  seekSlot: (slot: number) => void;
  loops: number;
  position: PlayEvent | null;

  /* ---- what a practice session (7D) drives ---------------------------- */
  /** Start the transport, with the count-in. False when there is no Web Audio. */
  play: () => boolean;
  /** Stop the transport, if it is playing. */
  stopPlaying: () => void;
  /**
   * Open and wake the audio inside a click. A session starts its transport
   * later, after its pattern loads, and some browsers (Safari) only let sound
   * start from a user gesture — so _Start_ and _Resume_ call this first.
   */
  primeAudio: () => void;
  /**
   * Play at this tempo without changing the pattern's own (as the tempo
   * trainer does). Held between 40 and the meter's ceiling.
   */
  playAt: (bpm: number) => void;
  /** The audio clock now, in seconds — what a session's Pause and Skip are timed by. */
  audioNow: () => number;
  /**
   * How far behind the audio clock the speakers are, in seconds: a note
   * scheduled for `t` is heard at `audioNow() === t + audioLatency()`. What
   * a drawing of the kit being played waits, to strike when you hear it.
   */
  audioLatency: () => number;
  /** Hear each loop boundary and each downbeat, on the audio clock. Null to stop. */
  setClockListener: (listener: ClockListener | null) => void;
  /**
   * Hear every step as the transport schedules it, note by note (the 3D
   * drummer). Returns the unsubscribe. Called from the scheduler, outside
   * React: a listener keeps what it hears in a ref, never in state.
   */
  subscribeSteps: (listener: (step: ScheduledStep) => void) => () => void;
  /**
   * While a session runs: the trainer's ramp and _match tempo_ are held off,
   * so an item's tempo is the tempo you hear. Your settings are not changed —
   * releasing the hold brings both back as they were.
   */
  sessionHold: boolean;
  setSessionHold: (on: boolean) => void;

  kit: string;
  setKit: (k: string) => void;
  /**
   * The live voice parameters — the kit's own numbers with your tuning on top.
   * This is what the engine is playing, not what the table ships.
   */
  sound: Record<string, VoiceParams>;
  /** Which voice the kit panel is editing. */
  voice: string;
  setVoice: (v: string) => void;
  setParam: (voice: string, key: string, value: number) => void;
  resetVoice: (voice: string) => void;
  resetKit: () => void;
  /** Whether this kit is carrying any tuning of yours, so "reset" can say so. */
  kitTuned: boolean;
  /** How many of this kit's slots have decoded; 0 when it is not a sampled kit. */
  kitSlots: number;
  /** How many of your kit's samples would not load; 0 for any other kit. */
  kitFailed: number;
  /** Play the synthesised percussion voices instead of the recordings. */
  percSamples: boolean;
  setPercSamples: (b: boolean) => void;
  /** Whose side the kit is panned from. */
  panView: PanView;
  setPanView: (v: PanView) => void;
  /** Humanise (Phase 9): Off, Subtle or Loose, its Amount and its take. */
  humanise: HumaniseSetting;
  /** Off, Subtle or Loose. Subtle and Loose set the Amount to theirs. */
  setHumaniseMode: (mode: HumaniseMode) => void;
  setHumaniseAmount: (amount: number) => void;
  /** 🎲 Roll another performance, heard from the next pass. */
  newTake: () => void;
  /** How many percussion instruments have recordings in memory. */
  percCount: number;
  mix: Record<string, number>;
  setLaneMix: (lane: string, v: number) => void;
  resetMix: () => void;
  mixTouched: Record<string, boolean>;
  mute: Record<string, boolean>;
  toggleMute: (lane: string) => void;
  /** Lanes soloed in the mixer (D23): any solo silences the rest; mute still wins. */
  laneSolo: Record<string, boolean>;
  toggleSolo: (lane: string) => void;

  click: boolean;
  setClick: (b: boolean) => void;
  clickSub: number;
  setClickSub: (n: number) => void;
  /** A polyrhythm counted in its cross-rhythm: layer 1 and the click follow it (D54). */
  feelCross: boolean;
  setFeelCross: (b: boolean) => void;
  countIn: number;
  setCountIn: (n: number) => void;
  ramp: number;
  setRamp: (n: number) => void;
  ceiling: number;
  setCeiling: (n: number) => void;
  /** Drop the tempo to suit the layer you are on, and put it back at L5. */
  matchTempo: boolean;
  setMatchTempo: (b: boolean) => void;

  arrangement: SectionLetter[];
  setArrangement: (a: SectionLetter[]) => void;
  locks: Record<string, boolean>;
  toggleLock: (k: string) => void;

  guides: boolean;
  setGuides: (b: boolean) => void;
  sticking: boolean;
  setSticking: (b: boolean) => void;
  preview: boolean;
  setPreview: (b: boolean) => void;
  /** Chart zoom. 1 is the reference size the engraver is drawn at. */
  size: number;
  setSize: (n: number) => void;

  /**
   * False, and nothing done, for a new section whose style is not in the
   * catalogue (a rudiment, or a style since deleted). A whole new pattern
   * always rolls, and has an A and a B again.
   */
  newBreak: (which?: SectionLetter | 'both', opts?: NewBreakOptions) => boolean;
  /**
   * How far a whole New strays from its song or style, 0–100 (`creativity.ts`).
   * A browser setting: the slider beside New break.
   */
  creativity: number;
  setCreativity: (n: number) => void;
  /** What the twist on the break on the stage changed, where New put one on it. */
  twist: Twist | null;
  /**
   * A whole new pattern in `style`, without making it your starting style —
   * how a drummer's Play arrives (`/studio?style=`). False, and nothing done,
   * when the catalogue does not have it.
   */
  newBreakIn: (style: string) => boolean;
  /** If playing: start again from the top, with a count-in, once the next break is on the stage. */
  restartFromTop: () => void;
  /**
   * A different take of the section being edited, in its own style and song.
   * False, and nothing written, when that style is no longer in the catalogue.
   */
  regenerate: () => boolean;
  /** False, and nothing done, when A's style is not in the catalogue. */
  buildBFromA: () => boolean;
  /**
   * Add a section (11-e-ii): the next free letter, written as a New of it
   * would be — in the pickers' style, meter and length — and played once at
   * the end of the arrangement. The chart turns to it. False, and nothing
   * done, when all 26 letters are used, the break's bars would pass
   * {@link MAX_BREAK_BARS}, or the style is not in the catalogue.
   */
  addSection: () => boolean;
  /** Whether {@link addSection} can add one now, and if not, why not. */
  addSectionBlocked: string | null;
  /**
   * Delete a section past B, and every slot of the arrangement that plays it.
   * A and B stay: every break has them. One Undo puts it back, slots and all.
   */
  deleteSection: (letter: SectionLetter) => boolean;
  /**
   * Play a section at half, the same or double the break's tempo (11-e-ii-g).
   * One Undo, the tempo with it: a ratio that lowers the break's ceiling
   * brings the tempo down to it. False, and nothing done, when the section is
   * not there or already plays at that ratio.
   */
  setSectionTempo: (letter: SectionLetter, ratio: TempoRatio | 1) => boolean;
  /** False, and nothing done, when the section's style is not in the catalogue. */
  applyDoctor: (move: DoctorMove) => boolean;
  /**
   * Write a cross-rhythm into the section being edited (13-b): a study of the
   * whole section, or a fill at the end of a bar. Returns why it could not, or
   * null when it was written.
   */
  writeCrossRhythm: (spec: CrossRhythmSpec) => string | null;
  cycleCell: (
    letter: SectionLetter,
    bar: number,
    lane: LaneKey,
    step: number,
    back: boolean
  ) => void;
  /**
   * Set one cell to a value (task 5.15): a tap, a choice in the value picker,
   * or one cell of a drag. A drag is one stroke, so one undo step: its first
   * cell is `start` (the default) and the rest `continue`, which do not push.
   */
  setCell: (
    letter: SectionLetter,
    bar: number,
    lane: LaneKey,
    step: number,
    value: number,
    stroke?: 'start' | 'continue'
  ) => void;
  /**
   * Write a tuplet by hand (12-d): `make` cuts the beat holding `step` into
   * `n` even notes on `lane`, joining a span already there with as many;
   * `unmake` gives the lane's cells back to the grid; `note` sets note `j`
   * of the span that owns the cell. One undo step each. False, and nothing
   * done, where it cannot be.
   */
  editTuplet: (
    letter: SectionLetter,
    bar: number,
    lane: LaneKey,
    step: number,
    edit: TupletEdit
  ) => boolean;
  /** Write the hands under the notes (Phase 14): see `editHands`. */
  editHands: (letter: SectionLetter, bar: number, step: number, edit: HandEdit) => boolean;
  /**
   * Open a library entry. With `at`, on that layer and at that tempo — where
   * it was left, when the practice history (D18) brings you back to it.
   */
  loadLibraryEntry: (id: string, at?: PracticePlace) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  /** Empty every lane of the section being edited. */
  clearSection: () => void;
  /** Name the pattern — what a saved one is called in your list. */
  rename: (name: string) => void;

  shareCode: () => string;
  /** The break as its wire payload — what a save sends. Null until there is one. */
  payload: () => SharePayload | null;
  /** The same code as a URL, so a link carries the break. */
  shareLink: () => string;
  loadCode: (code: string) => boolean;
  /**
   * Put a saved pattern on the stage without a page load — what `/studio/[id]`
   * does on arrival, for a pattern opened from inside the Studio. The row's
   * title names it; `at` overrides the layer and tempo the document carries.
   * False when it does not decode.
   */
  loadPayload: (payload: SharePayload, title: string, at?: PracticePlace) => boolean;
  /**
   * Put BeatBuddy's document on the stage (7.13), tempo and all. With `push`,
   * the current state goes on the undo stack first — the first change of a
   * turn. Later changes in the same turn replace it in place, so one Undo
   * takes the whole turn back. The payload has already passed
   * `sharePayloadSchema`. Returns what is now on the stage.
   */
  applyAssistant: (payload: SharePayload, push: boolean) => BreakDoc;
  /** The cells BeatBuddy's last change touched, while they are lit. */
  flash: Flash | null;
  /**
   * The arrangement as a Standard MIDI File — only the section on show, when
   * one is. _Played_ (the default) writes it humanised as you hear it;
   * _Quantised_ writes it without Humanise. Null when there is nothing to play.
   */
  midi: (played?: boolean) => MidiFile | null;
  /** Plays a bar of the current kit. False when there is no Web Audio. */
  auditionKit: () => boolean;
  /** The MIDI port playback is also driving, if you have opened one. */
  midiPort: string;
  openMidiOut: () => Promise<string>;
  closeMidiOut: () => void;
  audition: (voice: string, variant?: string) => void;
  /**
   * Play one recording on its own, through the master: a piece in the kit
   * builder before it is in the kit (9.18). False when it could not play.
   */
  previewSample: (
    url: string,
    voice: string,
    opts: { gain: number; tune?: number; decay?: number }
  ) => Promise<boolean>;
}

/**
 * A saved pattern the Studio opens on, loaded server-side by `/studio/[id]`.
 *
 * The payload, not a decoded `BreakDoc`: it is plain JSON, so it crosses the
 * server/client boundary as it is, and it is decoded here with the same style
 * lookup a `#b=` link gets — one decode path however a pattern arrives.
 */
/**
 * What a saved pattern says about itself beyond its notes: a description and
 * its reference links. Held beside the document, never inside it — `doc` is
 * the share-code wire format, and a pasted code must not be able to put a URL
 * on someone's screen.
 */
export interface PatternDetails {
  description: string;
  links: StoredLink[];
}

/**
 * Who can open a saved pattern, and whom it is credited to (Phase 6). Held
 * beside the document for the reason {@link PatternDetails} is.
 */
export interface PatternSharing {
  visibility: Visibility;
  /** Its public address, `/p/<slug>` — null until it first leaves private. */
  slug: string | null;
  /** The credit line on a copy, while the pattern it came from is published. */
  basedOn: { title: string; username: string; slug: string } | null;
  /**
   * Its notes are fixed (D26): it has been published, now or before. An edit
   * to it is a variation — saved through the copy route, never onto the row.
   * Left out means not fixed.
   */
  fixed?: boolean;
}

export interface InitialPattern {
  id: string;
  title: string;
  payload: SharePayload;
  /** False for someone else's shared pattern, which opens as yours to copy. */
  mine: boolean;
  /** What the row says about it (task 4.11) — none when left out. */
  details?: PatternDetails;
  /** Who can open it (Phase 6) — private and uncredited when left out. */
  sharing?: PatternSharing;
  /** When the row was made (ISO), for `pattern_opened`'s day count (8.8). */
  createdAt?: string;
}

/** Where a pattern was left: the layer, and the tempo it was being played at. */
/** What a practice session listens to from the transport (7D), as audio-clock times. */
export interface ClockListener {
  onLoop?: (at: number) => void;
  onDownbeat?: (at: number) => void;
}

/**
 * A hand written under the notes (Phase 14): one step's (null unwrites it),
 * the bar hand to hand from a step (D69), or the bar's hands cleared.
 */
export type HandEdit =
  | { kind: 'hand'; hand: WrittenHand | null }
  | { kind: 'alternate'; hand: 'R' | 'L' }
  | { kind: 'clear' };

/** A hand edit of a tuplet (12-d): see `editTuplet`. */
export type TupletEdit =
  | { kind: 'make'; n: number }
  | { kind: 'double' }
  | { kind: 'unmake'; j?: number }
  | { kind: 'note'; j: number; value: number };

export interface PracticePlace {
  level: number;
  bpm: number;
}

/** What the generator writes with: a style, a meter, a length and the tempo it is judged at. */
/** What a whole New may be asked for beyond the pickers: which song, and how creatively. */
export interface NewBreakOptions {
  /** One of the style's songs, by key, rather than one picked at random. */
  song?: string;
  /** Overrides the creativity setting for this New: a drummer's Play arrives faithful. */
  creativity?: number;
}

interface Setup {
  style: string;
  meter: string;
  bars: number;
  bpm: number;
  /** Which of the style's songs, where it has them. */
  song?: string;
  /** The section's tempo ratio; absent, a song section's own (11-e-ii-g). */
  tempoRatio?: TempoRatio | 1;
  /** A whole New's creativity, 0–100: the twist laid over the break once it is written. */
  creativity?: number;
}

/**
 * How far below the break's own tempo each layer sits, when the tempo is
 * matched to the layer. L5 is the break as written, so it is the tempo as
 * written; everything below it is a practice speed.
 */
const LAYER_TEMPO: Record<number, number> = { 1: 0.68, 2: 0.78, 3: 0.86, 4: 0.93, 5: 1 };

/** What the console is told beyond the catalogue and the pattern it opens on. */
export interface ConsoleOptions {
  /**
   * Your settings, as the page read them server-side (D19). Left out, the
   * console starts from the defaults a new account has.
   */
  settings?: StudioSettings;
  /**
   * Whether the pattern on the stage is a saved one. Asked when a style,
   * meter, length or tempo is changed: only a new, unsaved pattern moves your
   * starting values (D21). The console does not know about saving, so the
   * provider, which holds the document, answers. Left out, every pattern is new.
   */
  stageSaved?: () => boolean;
}

/** How many seeds a regenerate tries for a take unlike the one it replaces. */
const REGENERATE_TRIES = 8;

/** Whether two patterns play the same notes, bar for bar. */
function samePattern(a: Pattern, b: Pattern): boolean {
  return a.bars.length === b.bars.length && a.bars.every((bar, i) => barEq(bar, b.bars[i]));
}

export function useBreakConsole(
  catalogue: StudioCatalogue,
  initial?: InitialPattern,
  options: ConsoleOptions = {}
): BreakConsole {
  const [ready, setReady] = useState(false);
  const [noCatalogue, setNoCatalogue] = useState(false);
  const [patterns, setPatterns] = useState<MaybeSections>({ A: null, B: null });
  const letters = useMemo(() => lettersOf(patterns), [patterns]);
  const [tries, setTries] = useState<{ tries: number; rejected: number } | null>(null);

  /* ---- your settings (D19) --------------------------------------------
     How you play, from your account: seeded from what the page read and
     written back debounced. Each setter below writes its field; a load never
     does, because opening something is not choosing a setting. */
  const { settings, update } = useStudioSettings(options.settings ?? DEFAULT_STUDIO_SETTINGS);
  const {
    kit,
    userKit,
    sound: tuning,
    percSamples,
    panView,
    humanise,
    countIn,
    ceiling,
    matchTempo,
    density,
    ghosts,
    hats,
    feel,
    lanesMode,
    customLanes,
    userMeter,
    guides,
    sticking,
    preview,
  } = settings;
  const stageSaved = options.stageSaved;

  /* A practice session holds the ramp and the layer match off while it runs
     (7D). Kept beside the settings rather than written into them, so a page
     closed mid-session leaves your settings as they were. */
  const [sessionHold, setSessionHold] = useState(false);
  const matchOn = matchTempo && !sessionHold;

  /* ---- the pattern's own values ----------------------------------------
     Tempo, swing, layer and arrangement are the open pattern's, and its
     document is their only record: plain state, set by whatever put the
     pattern on the stage. Style, meter and bars are what the generator writes
     with — the open pattern's, until you pick others. None is kept in the
     browser; a pattern that was never saved is kept whole in `bb.scratch`.

     A new pattern starts from your starting values (D21), and changing one of
     these while the pattern on the stage is new and unsaved moves them. */
  // the layer a new pattern opens at; your ability sets it (7B)
  const [level, setLevel] = useState(settings.startLevel);
  const [viewChoice, setViewModeRaw] = useStoredSetting(VIEW);
  /** The section last chosen or edited — what All edits when nothing is playing. */
  const [touched, setTouched] = useState<SectionLetter>('A');
  const setViewMode = useCallback(
    (v: ViewMode) => {
      setViewModeRaw(v);
      if (v !== 'both') setTouched(v);
    },
    [setViewModeRaw]
  );

  const [style, setStyleRaw] = useState(settings.startStyle);
  const [meter, setMeterRaw] = useState(settings.startMeter);
  const [bars, setBarsRaw] = useState(settings.startBars);
  /* The style sets the swing — somewhere in its range, freshly on each New —
     until you move the slider yourself, which holds your value until you
     pick a style. Starts in the middle of the style's range, not at a random
     point in it, so the server and the browser render the same slider. */
  const [swingSet, setSwingRaw] = useState(() =>
    swingFor(catalogue.styles[settings.startStyle]?.params, settings.startMeter, () => 0.5)
  );
  // a ref for the callbacks to read, and state for the slider to say whose it is
  const swingHeld = useRef(false);
  const [swingYours, setSwingYours] = useState(false);
  const holdSwing = useCallback((held: boolean) => {
    swingHeld.current = held;
    setSwingYours(held);
  }, []);
  const setSwing = useCallback(
    (n: number) => {
      holdSwing(true);
      setSwingRaw(n);
    },
    [holdSwing]
  );
  /** Hand the swing back to the style, as a pattern opening or a style picked does. */
  const swingFromStyle = useCallback(
    (key: string, meterKey: string) => {
      holdSwing(false);
      setSwingRaw(swingFor(catalogue.styles[key]?.params, meterKey));
    },
    [catalogue.styles, holdSwing]
  );
  const [bpm, setBpmRaw] = useState(() =>
    clamp(settings.startBpm, 50, maxBpm(settings.startMeter))
  );
  /* A style whose swing follows the tempo (Tony Williams: near even at 300,
     a triplet by 200 and below) has it derived here rather than stored, so
     every tempo change — a layer, a ramp, the slider — moves it, until you set
     the swing yourself. Read off the pattern on the stage, with its song. */
  const stageParams = patterns.A ? catalogue.styles[patterns.A.style]?.params : undefined;
  /* The order of the song in sections on the stage, where that is what it is:
     what a New after it gives your arrangement back from. */
  const stageSongArrangement = useMemo((): SectionLetter[] | null => {
    const song = songOf(stageParams, patterns.A?.song);
    if (!song?.sections) return null;
    return song.arrangement ?? song.sections.map((x) => x.letter);
  }, [stageParams, patterns.A?.song]);
  const swingCurved = !!(stageParams && withSong(stageParams, patterns.A?.song).swingCurve);
  const swing = swingCurved && !swingYours ? swingAtTempo(bpm) : swingSet;
  /** The tempo the break is written at — the 100% the layer match works from. */
  const [baseBpm, setBaseBpm] = useState(bpm);
  const [arrangement, setArrangement] = useState<SectionLetter[]>([...DEFAULT_ARRANGEMENT]);
  /* Your arrangement, put aside while a song in sections plays its own
     (`arrangementForNew`). */
  const ownArrangement = useRef<SectionLetter[] | null>(null);

  /**
   * Whether a change of style, meter, bars or tempo should move the starting
   * values: only while the pattern on the stage has never been saved. Opening
   * or editing a saved pattern never does (D21). Asked at the moment of the
   * change, from the document the provider keeps.
   */
  const settingUpNew = useCallback(() => !(stageSaved?.() ?? false), [stageSaved]);

  /**
   * Style, meter and bars picked since the last pattern was opened. What
   * _New pattern_ opens with is your starting values, whatever you have opened
   * since — except for anything you picked for the next one while looking at
   * something saved, which moved the pickers but not the starting values.
   * _New pattern_ uses them up, and picking the same thing again on a new
   * pattern (which moves the starting value) drops it.
   */
  const chosen = useRef<{ style?: string; meter?: string; bars?: number }>({});

  const setDensity = useCallback((n: number) => update({ density: n }), [update]);
  const setGhosts = useCallback((n: number) => update({ ghosts: n }), [update]);
  const setHats = useCallback((n: number) => update({ hats: n }), [update]);
  const setFeel = useCallback((n: number) => update({ feel: n }), [update]);
  const setGuides = useCallback((b: boolean) => update({ guides: b }), [update]);
  const setSticking = useCallback((b: boolean) => update({ sticking: b }), [update]);
  const setPreview = useCallback((b: boolean) => update({ preview: b }), [update]);
  const setCountIn = useCallback((n: number) => update({ countIn: n }), [update]);
  const setCeiling = useCallback((n: number) => update({ ceiling: n }), [update]);
  const setMatchTempo = useCallback((b: boolean) => update({ matchTempo: b }), [update]);

  const [voice, setVoice] = useState('h');
  const [midiPort, setMidiPort] = useState('');
  const [size, setSizeRaw] = useStoredSetting(SIZE);

  const [click, setClick] = useState(false);
  const [clickSub, setClickSub] = useState(4);
  /* A polyrhythm felt the other way round (Phase 12, D54): its cross-rhythm
     is the pulse you count, so layer 1 plays it alone and the click follows
     it. Nothing on any other pattern reads it. */
  const [feelCross, setFeelCross] = useState(false);
  const [ramp, setRamp] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loops, setLoops] = useState(0);
  const [position, setPosition] = useState<PlayEvent | null>(null);
  const [creativity, setCreativityRaw] = useStoredSetting(CREATIVITY);
  const setCreativity = useCallback(
    (n: number) => setCreativityRaw(Math.max(0, Math.min(100, Math.round(n)))),
    [setCreativityRaw]
  );
  /* The twist New laid over the break, kept by the seed it was laid on: an
     edit keeps the seed and the twist with it, and any other break — opened,
     undone back to, or a new one — has a seed of its own. */
  const [twistOn, setTwistOn] = useState<{ seed: number; twist: Twist } | null>(null);
  const twist = twistOn && twistOn.seed === patterns.A?.seed ? twistOn.twist : null;
  const [cueAt, setCue] = useState<number | null>(null);
  /* A cue is a place in this break: a new one (a new seed on A) goes back to
     the top, and a slot the arrangement has lost since is no place at all. */
  const [cueSeed, setCueSeed] = useState(patterns.A?.seed);
  if (cueSeed !== patterns.A?.seed) {
    setCueSeed(patterns.A?.seed);
    setCue(null);
  }
  const cue = cueAt !== null && cueAt < arrangement.length ? cueAt : null;

  /* The section choice, held to the sections there are. */
  const viewMode = viewIn(viewChoice, patterns);
  /* A section deleted since it was last touched is no longer one to edit. */
  const editingAt = editingSection(viewMode, playing ? position : null, touched);
  const editing: SectionLetter = patterns[editingAt] ? editingAt : 'A';

  const [mix, setMix] = useState<Record<string, number>>({ ...DEFAULT_MIX });
  const [mixTouched, setMixTouched] = useState<Record<string, boolean>>({});
  const [mute, setMute] = useState<Record<string, boolean>>({});
  const [laneSolo, setLaneSolo] = useState<Record<string, boolean>>({});
  const [locks, setLocks] = useState<Record<string, boolean>>({});

  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  /* The top tempo is the meter picker's, as it always was — a style picked
     for the next New brings its tempo with it, past what the pattern still on
     the stage would take. A break whose sections are in different meters is
     held to the lowest of theirs instead: one tempo plays them all, so a B in
     4/4 holds an A in eighths to 190. */
  const sectionMeters = [...new Set(patternsOf(patterns).map((p) => p.meter))];
  /* A section at a tempo ratio holds it the same way: a B at ×2 holds the
     break to half B's ceiling (11-e-ii-g). */
  const mixedTop =
    sectionMeters.length > 1 || hasTempoRatios(patterns) ? maxBpmOf(patternsOf(patterns)) : null;
  const bpmCeiling = mixedTop ?? maxBpm(meter);
  /* And the bottom: a section at ×½ plays at half the break's tempo, so the
     break goes no lower than twice the floor, or that section would play
     slower than anything else the Studio does. */
  const bpmFloor = minBpmOf(patternsOf(patterns));

  const setSize = useCallback(
    (n: number) => setSizeRaw(clamp(Math.round(n * 100) / 100, SIZE_MIN, SIZE_MAX)),
    [setSizeRaw]
  );

  /**
   * Set the tempo.
   *
   * With the layer match on, the number you are dragging is the speed for the
   * layer you are on, not the break's — so what is stored is what that implies
   * about the break, and the effect below puts the slider back where you left
   * it. Storing the dragged number directly instead would make practising L1
   * quietly rewrite the break as a slow break.
   *
   * On a new pattern the break's tempo is also your starting tempo (D21).
   */
  const placeTempo = useCallback(
    (n: number) => {
      const top = bpmCeiling;
      const v = clamp(Math.round(n), bpmFloor, top);
      const base = matchOn ? clamp(Math.round(v / (LAYER_TEMPO[level] ?? 1)), bpmFloor, top) : v;
      setBaseBpm(base);
      setBpmRaw(v);
      return base;
    },
    [bpmCeiling, bpmFloor, matchOn, level]
  );

  const setBpm = useCallback(
    (n: number) => {
      const base = placeTempo(n);
      if (settingUpNew()) update({ startBpm: base });
    },
    [placeTempo, settingUpNew, update]
  );

  /* A practice speed, not a new tempo for the break: the base stays where it
     is, so 100% finds it again, and your starting tempo is not moved either.
     The console used to take these from the style's slowest tempo, so "Back to
     100%" went somewhere the pattern had never been. */
  const quickTempo = useCallback(
    (pct: number) => {
      const written = matchOn ? baseBpm * (LAYER_TEMPO[level] ?? 1) : baseBpm;
      setBpmRaw(clamp(Math.round((written * pct) / 100), bpmFloor, bpmCeiling));
    },
    [matchOn, baseBpm, level, bpmCeiling, bpmFloor]
  );

  /**
   * The break's own tempo, for a pattern that arrives at `bpm` on `level`.
   *
   * A loaded pattern sets the tempo directly, and the match effect below then
   * re-derives it from `baseBpm` for the new layer — so a base left over from
   * the last pattern would move every pattern you opened with the match on,
   * and a saved one would then open "Unsaved" and autosave a tempo you never
   * chose. Deriving the base from the pattern makes the effect land on the
   * tempo it arrived with, which is also why a scratch pattern needs no base
   * of its own kept beside it. Unrounded on purpose: rounding here is what
   * would move it.
   */
  const baseFor = useCallback(
    (bpmAt: number, levelAt: number) => (matchOn ? bpmAt / (LAYER_TEMPO[levelAt] ?? 1) : bpmAt),
    [matchOn]
  );

  /* The layer moved, or the match was switched on: put the tempo where that
     layer should be practised, measured against the break's own tempo. */
  useEffect(() => {
    if (!matchOn) return;
    setBpmRaw(clamp(Math.round(baseBpm * (LAYER_TEMPO[level] ?? 1)), bpmFloor, bpmCeiling));
  }, [matchOn, level, bpmCeiling, bpmFloor, baseBpm, setBpmRaw]);

  /* A section set to ×½ under a tempo below the floor brings the tempo up to
     it, as one set to ×2 brings it down to the ceiling. One Undo of the ratio
     puts the tempo back with it (`setSectionTempo` records both). Only when
     the floor rises: a practice session may play under 50 on purpose. */
  const lastFloor = useRef(bpmFloor);
  useEffect(() => {
    const rose = bpmFloor > lastFloor.current;
    lastFloor.current = bpmFloor;
    if (!rose) return;
    if (bpm < bpmFloor) setBpmRaw(bpmFloor);
    if (baseBpm < bpmFloor) setBaseBpm(bpmFloor);
  }, [bpm, baseBpm, bpmFloor, setBpmRaw]);

  /**
   * The tempo a break in two meters brought down to its ceiling, and the base
   * it was brought down to. A section written in a slower meter (a new B in
   * 4/4 under an A in eighths at 300) has to lower the tempo — a locked one
   * too, since nothing plays past the ceiling — but it is kept here, and comes
   * back when the meters match again (undo, or a New B back in A's), unless
   * you moved the tempo yourself in between.
   */
  /** `top` is the ceiling it was capped under: the cap lifts only when the ceiling rises past it. */
  const capped = useRef<{ base: number; baseAt: number; top: number } | null>(null);
  useEffect(() => {
    const cap = capped.current;
    if (mixedTop !== null && (bpm > mixedTop || baseBpm > mixedTop)) {
      const baseAt = Math.min(baseBpm, mixedTop);
      capped.current = { base: cap?.base ?? baseBpm, baseAt, top: mixedTop };
      setBpmRaw(Math.min(bpm, mixedTop));
      setBaseBpm(baseAt);
      return;
    }
    if (!cap) return;
    if (baseBpm !== cap.baseAt) {
      capped.current = null;
      return;
    }
    /* Only a ceiling that has risen since — the meters matching again — puts
       it back. A base that was already under the ceiling it was capped to
       (only the played tempo was over) is no reason to move anything. */
    if (bpmCeiling > cap.top) {
      capped.current = null;
      // the break's own tempo comes back; with the match on, the layer's follows from it
      const base = Math.min(cap.base, bpmCeiling);
      setBaseBpm(base);
      if (!matchOn) setBpmRaw(base);
    }
  }, [mixedTop, bpmCeiling, bpm, baseBpm, matchOn]);

  /**
   * Style, meter and length picked for the next New, which the pickers keep
   * until a New uses them or a pattern is opened. Until then they follow the
   * section on the stage, as the grid and the Doctor do: editing B in 7/8 and
   * four bars shows 7/8 and four bars, and a New B is written in them.
   */
  const pickedForNext = useRef(false);
  const stage = patterns[editing];
  const stageStyle = stage?.style;
  const stageMeter = stage?.meter;
  const stageBars = stage?.bars.length;
  useEffect(() => {
    if (pickedForNext.current || !stageStyle || !stageMeter || !stageBars) return;
    setStyleRaw(stageStyle);
    setMeterRaw(stageMeter);
    setBarsRaw(stageBars);
  }, [editing, stageStyle, stageMeter, stageBars]);

  /* ---- derived: the sections as they sound and look ------------------- */

  const view = useMemo(
    () => reduceSections(patterns, level, feelCross),
    [patterns, level, feelCross]
  );

  /* Layer 5 is what's stored, so there is nothing above it to preview. */
  const next = useMemo(
    () => (level >= 5 ? null : reduceSections(patterns, level + 1, feelCross)),
    [patterns, level, feelCross]
  );

  /* ---- the catalogue, resolved ---------------------------------------
     Styles and kits are rows now, so a key on its own is not enough to
     generate, doctor or play with — every one of those takes the resolved row.
     These three are that resolution, done once per render instead of at each
     of the dozen call sites below.

     `?? first` rather than a compiled-in default: a saved key can name a style
     that has since been deleted, and falling back to whatever the catalogue
     does have is the only answer that does not invent content. */
  const styleRow: ResolvedStyle | undefined = useMemo(
    () => catalogue.styles[style] ?? Object.values(catalogue.styles)[0],
    [catalogue.styles, style]
  );

  const report = useMemo(() => (view.A ? critique(view.A, bpm) : null), [view.A, bpm]);
  const checks = useMemo(() => (view.A ? playability(view.A, bpm) : null), [view.A, bpm]);

  /* ---- the style's opinions, applied when it changes ------------------ */

  /**
   * A style's mix is a property of the style, and the rule for setting it is
   * not "is this lane busy" but "is this lane sitting on top of the thing that
   * *is* the groove". A fader you have moved yourself is yours until you hand
   * it back.
   */
  const applyStyleMix = useCallback(
    (styleKey: string, touched: Record<string, boolean>) => {
      const m = catalogue.styles[styleKey]?.params.mix ?? {};
      setMix((prev) => {
        const next = { ...prev };
        for (const lane of Object.keys(DEFAULT_MIX) as LaneKey[]) {
          if (touched[lane]) continue;
          next[lane] = m[lane] ?? DEFAULT_MIX[lane];
        }
        return next;
      });
    },
    [catalogue.styles]
  );

  /**
   * Switch to the kit a style (or a style with its song laid over it) asks
   * for, and back to yours when it asks for none: picking the waltz once must
   * not leave every style after it on brushes, and neither must one song.
   */
  const followKit = useCallback(
    (st: Style | undefined) => {
      /* `named.key` rather than `st.kit`: the same string, read off the row
         that was actually found, so there is nothing to assert non-null. */
      const named = st?.kit ? catalogue.kits[st.kit] : undefined;
      const wantKit = named && kitIsPlayable(named) ? named.key : userKit;
      if (wantKit !== kit && kitIsPlayable(catalogue.kits[wantKit])) update({ kit: wantKit });
    },
    [catalogue.kits, userKit, kit, update]
  );

  const setLaneMix = useCallback((lane: string, v: number) => {
    setMix((prev) => ({ ...prev, [lane]: v }));
    setMixTouched((prev) => ({ ...prev, [lane]: true }));
  }, []);

  const resetMix = useCallback(() => {
    setMixTouched({});
    applyStyleMix(style, {});
  }, [applyStyleMix, style]);

  const toggleMute = useCallback((lane: string) => {
    setMute((prev) => ({ ...prev, [lane]: !prev[lane] }));
  }, []);

  const toggleSolo = useCallback((lane: string) => {
    setLaneSolo((prev) => ({ ...prev, [lane]: !prev[lane] }));
  }, []);

  const toggleLock = useCallback((k: string) => {
    setLocks((prev) => ({ ...prev, [k]: !prev[k] }));
  }, []);

  /* ---- history -------------------------------------------------------- */

  const playbackNow = useCallback(
    (): Playback => ({ bpm, baseBpm, swing, swingYours, level, arrangement }),
    [bpm, baseBpm, swing, swingYours, level, arrangement]
  );

  const restorePlayback = useCallback(
    (p: Playback) => {
      setBpmRaw(p.bpm);
      setBaseBpm(p.baseBpm);
      setSwingRaw(p.swing);
      // whose the swing was comes back with it, or the next New would keep or drop the wrong one
      holdSwing(p.swingYours);
      setLevel(p.level);
      setArrangement(p.arrangement);
    },
    [holdSwing]
  );

  /** @param withPlayback the change about to be made moves tempo, swing, layer or arrangement too. */
  const pushHistory = useCallback(
    (withPlayback = false) => {
      setHistory((h) => {
        const next: Snapshot[] = [
          ...h,
          {
            sections: cloneSections(patterns),
            ...(withPlayback ? { playback: playbackNow() } : {}),
          },
        ];
        return next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next;
      });
      setFuture([]);
    },
    [patterns, playbackNow]
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [
        ...f,
        { sections: patterns, ...(prev.playback ? { playback: playbackNow() } : {}) },
      ]);
      setPatterns(prev.sections);
      if (prev.playback) restorePlayback(prev.playback);
      return h.slice(0, -1);
    });
  }, [patterns, playbackNow, restorePlayback]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[f.length - 1];
      setHistory((h) => [
        ...h,
        { sections: patterns, ...(next.playback ? { playback: playbackNow() } : {}) },
      ]);
      setPatterns(next.sections);
      if (next.playback) restorePlayback(next.playback);
      return f.slice(0, -1);
    });
  }, [patterns, playbackNow, restorePlayback]);

  /* ---- generation ----------------------------------------------------- */

  const generate = useCallback(
    (which: SectionLetter | 'both', setup: Setup, unlike?: Pattern) => {
      /* Only in the style asked for. Writing in whatever the picker would fall
         back to puts a groove in a style nobody chose over the stage: a
         rudiment's New A would become the first style's. */
      const row = catalogue.styles[setup.style];
      if (!row) return null;
      /* A whole New is an A and a B, or every section of a song written in
         sections, each in its own meter, and the order the song plays them. */
      if (which === 'both') {
        const made = songBreak({
          style: row,
          song: setup.song,
          meter: setup.meter,
          bars: setup.bars,
          density,
          ghosts,
          seed: Math.floor(Math.random() * 0xffffffff),
          bpm: setup.bpm,
          custom: lanesMode === 'custom' ? customLanes : null,
        });
        setTries({ tries: made.tries, rejected: made.rejected });
        const twisted = setup.creativity
          ? creativeBreak({
              sections: made.sections,
              style: row,
              styles: catalogue.styles,
              creativity: setup.creativity,
              seed: made.sections.A.seed,
              density,
              ghosts,
              bpm: setup.bpm,
            })
          : { sections: made.sections, twist: null };
        setTwistOn(twisted.twist ? { seed: twisted.sections.A.seed, twist: twisted.twist } : null);
        setPatterns(twisted.sections);
        const next = arrangementForNew({
          current: arrangement,
          playing: stageSongArrangement,
          own: ownArrangement.current,
          next: made.arrangement,
          sections: made.sections,
        });
        ownArrangement.current = next.own;
        setArrangement(next.arrangement);
        return twisted.sections.A;
      }
      const roll = () =>
        writePart({
          style: row,
          song: setup.song,
          meter: setup.meter,
          bars: setup.bars,
          density,
          ghosts,
          seed: Math.floor(Math.random() * 0xffffffff),
          bpm: setup.bpm,
          tempoRatio: setup.tempoRatio,
          custom: lanesMode === 'custom' ? customLanes : null,
        });
      /* A regenerate has to come out different: a style of a few written
         figures can roll the same bars again, so it rolls again (a few times,
         and then takes what it has rather than spin). */
      let made = roll();
      for (let t = 0; unlike && t < REGENERATE_TRIES && samePattern(made.pattern, unlike); t++)
        made = roll();
      setTries({ tries: made.tries, rejected: made.rejected });

      setPatterns((prev) => ({ ...prev, [which]: made.pattern }));
      return made.pattern;
    },
    [catalogue.styles, density, ghosts, lanesMode, customLanes, arrangement, stageSongArrangement]
  );

  /**
   * Roll a new pattern, or a new A or B.
   *
   * A new section is an edit to the pattern on the stage, so it is written
   * with that pattern's style, meter, length and tempo. A whole new pattern
   * opens at your starting values (D21) — whatever you have opened since —
   * with anything you picked for it while looking at a saved pattern on top,
   * and the tempo left alone when it is locked.
   */
  const newBreak = useCallback(
    (which: SectionLetter | 'both' = 'both', opts: NewBreakOptions = {}): boolean => {
      if (which !== 'both') {
        // only in the stage's own style: a rudiment has none to write a section in
        if (!catalogue.styles[style]) return false;
        pushHistory();
        // a new A or B is the same song as the pattern it belongs to
        const stage = patterns[which] ?? patterns.A;
        const song = stage?.style === style ? stage.song : undefined;
        /* Judged at the tempo it will play at: beside the other sections, the
           break is held to the lowest of their meters' ceilings, each over its
           tempo ratio. The section keeps its own ratio. */
        const others = lettersOf(patterns)
          .filter((L) => L !== which)
          .map((L) => patterns[L]);
        const tempoRatio = patterns[which]?.tempoRatio ?? 1;
        const pace = tempoRatio === 1 ? meter : { meter, tempoRatio };
        const at = Math.min(bpm, maxBpmOf([pace, ...others]));
        /* Held to the bars the break has room for: the other sections keep
           theirs, so a new section no longer than this keeps it within
           MAX_BREAK_BARS, which a save and a share code are held to. Never
           shorter than one bar — the section it replaces had at least that. */
        const room = MAX_BREAK_BARS - (totalBars(patterns) - (patterns[which]?.bars.length ?? 0));
        // used up: the section they were picked for is this one
        pickedForNext.current = false;
        generate(which, {
          style,
          meter,
          bars: Math.max(1, Math.min(bars, room)),
          bpm: at,
          song,
          tempoRatio,
        });
        return true;
      }
      /* A whole new pattern always rolls: in the style you chose, or, where
         that has left the catalogue since, in whatever it does have. */
      const wanted = chosen.current.style ?? settings.startStyle;
      const styleKey = catalogue.styles[wanted] ? wanted : (styleRow?.key ?? wanted);
      /* A style with songs plays one of them, and the song sets the meter and
         the tempo: Manic Depression is a fast 9/8, Little Wing a slow 4/4.
         Those win over your starting values here, because a song at
         somebody else's tempo and meter is not that song. A locked tempo
         stays locked. */
      const params = catalogue.styles[styleKey]?.params;
      // the song asked for, where the style has it; else one at random, as ever
      const asked = opts.song ? params?.songs?.find((sg) => sg.key === opts.song) : undefined;
      const song = asked ?? (params ? pickSong(params, Math.random) : undefined);
      /* A whole new pattern is an A and a B, so any sections past B go, and
         with them their slots in the arrangement — which one Undo puts back.
         A song in sections brings its own arrangement, and a New after one
         gives yours back (`arrangementForNew`), so those go into it too. */
      pushHistory(letters.length > 2 || !!song?.sections || !!stageSongArrangement);
      const next = {
        style: styleKey,
        meter:
          params && song ? songMeter(params, song) : (chosen.current.meter ?? settings.startMeter),
        bars: chosen.current.bars ?? settings.startBars,
        song: song?.key,
      };
      // used up: the pattern they were picked for is this one
      chosen.current = {};
      pickedForNext.current = false;
      // a song in sections plays at a tempo its slowest meter allows
      const top = params && song ? maxBpmOf(songPaces(params, song)) : maxBpm(next.meter);
      const start = params && song ? songTempo(params, song, Math.random) : settings.startBpm;
      const base = locks.bpm ? baseBpm : clamp(start, 50, top);
      const at = matchOn ? Math.round(base * (LAYER_TEMPO[level] ?? 1)) : base;
      const bpmAt = locks.bpm ? clamp(bpm, 50, top) : clamp(at, 50, top);
      setStyleRaw(next.style);
      setMeterRaw(next.meter);
      setBarsRaw(next.bars);
      setBaseBpm(base);
      setBpmRaw(bpmAt);
      // a fresh swing in the style's (or the song's) range, unless you have set your own
      const merged = params ? withSong(params, song?.key) : undefined;
      if (!swingHeld.current) setSwingRaw(swingFor(merged, next.meter));
      if (params?.songs) followKit(merged);
      if (next.style !== style) {
        setMixTouched((touched) => {
          applyStyleMix(next.style, touched);
          return touched;
        });
      }
      generate('both', { ...next, bpm: bpmAt, creativity: opts.creativity ?? creativity });
      return true;
    },
    [
      stageSongArrangement,
      pushHistory,
      generate,
      style,
      meter,
      bars,
      bpm,
      baseBpm,
      settings,
      locks.bpm,
      matchOn,
      level,
      applyStyleMix,
      catalogue.styles,
      styleRow,
      patterns,
      letters,
      followKit,
      creativity,
    ]
  );

  const newBreakIn = useCallback(
    (key: string): boolean => {
      const params = catalogue.styles[key]?.params;
      if (!params) return false;
      /* Picked for this New only, as a pick on a saved pattern is: nothing is
         written to your settings. New follows a song's kit itself; a style
         without songs asks for its kit here, as picking it would. */
      chosen.current = {
        ...chosen.current,
        style: key,
        meter: params.meter ?? chosen.current.meter,
      };
      if (!params.songs) followKit(params);
      // a drummer's Play is the drummer as they played: no twist on the first look
      return newBreak('both', { creativity: 0 });
    },
    [catalogue.styles, followKit, newBreak]
  );

  /**
   * A new take of the section you are editing: the same style, song, meter and
   * length as the one on the stage (not the style picked for the next New),
   * different notes.
   */
  const regenerate = useCallback((): boolean => {
    const stage = patterns[editing];
    /* Only in the section's own style: one that has left the catalogue would
       otherwise be written in whatever the picker holds. */
    if (!stage || !catalogue.styles[stage.style]) return false;
    pushHistory();
    generate(
      editing,
      {
        style: stage.style,
        meter: stage.meter,
        bars: stage.bars.length,
        bpm,
        song: stage.song,
        // a new take plays at the speed the section did
        tempoRatio: stage.tempoRatio ?? 1,
      },
      stage
    );
    return true;
  }, [patterns, editing, catalogue.styles, pushHistory, generate, bpm]);

  const buildBFromA = useCallback((): boolean => {
    // in A's own style, as the doctor is: never one the picker fell back to
    const params = patterns.A && catalogue.styles[patterns.A.style]?.params;
    if (!patterns.A || !params) return false;
    pushHistory();
    setPatterns((prev) => (prev.A ? { ...prev, B: deriveB(prev.A, params) } : prev));
    return true;
  }, [patterns.A, catalogue.styles, pushHistory]);

  /* ---- sections past B (11-e-ii) --------------------------------------- */

  const addSectionBlocked = useMemo((): string | null => {
    if (!nextLetter(patterns)) return 'A break has 26 sections at most';
    if (totalBars(patterns) + bars > MAX_BREAK_BARS) {
      return `A break holds ${MAX_BREAK_BARS} bars across its sections — shorten one, or add a shorter one`;
    }
    if (!catalogue.styles[style]) return 'Pick a style to write the new section in';
    return null;
  }, [patterns, bars, catalogue.styles, style]);

  const addSection = useCallback((): boolean => {
    const letter = nextLetter(patterns);
    if (!letter || addSectionBlocked) return false;
    // the arrangement changes too, so one Undo takes both back
    pushHistory(true);
    // the same song as the section on the stage, when it is in the same style
    const stage = patterns[editing];
    const song = stage?.style === style ? stage.song : undefined;
    /* At the pace the stage's section plays, where it is that song's part;
       at the break's tempo otherwise — never a ratio from the catalogue you
       took off the stage (11-e-ii-g). */
    const tempoRatio = song ? ratioOf(stage) : 1;
    const pace = tempoRatio === 1 ? meter : { meter, tempoRatio };
    const at = Math.min(bpm, maxBpmOf([pace, ...patternsOf(patterns)]));
    pickedForNext.current = false;
    generate(letter, { style, meter, bars, bpm: at, song, tempoRatio });
    setArrangement((a) => (a.length < MAX_ARRANGEMENT ? [...a, letter] : a));
    setViewMode(letter);
    setTouched(letter);
    return true;
  }, [
    patterns,
    addSectionBlocked,
    pushHistory,
    editing,
    style,
    meter,
    bars,
    bpm,
    generate,
    setViewMode,
  ]);

  const deleteSection = useCallback(
    (letter: SectionLetter): boolean => {
      if (letter === 'A' || letter === 'B' || !patterns[letter]) return false;
      pushHistory(true);
      setPatterns((prev) => {
        const out = { ...prev };
        delete out[letter];
        return out;
      });
      setArrangement((a) => {
        const kept = a.filter((L) => L !== letter);
        return kept.length ? kept : ['A'];
      });
      return true;
    },
    [patterns, pushHistory]
  );

  const setSectionTempo = useCallback(
    (letter: SectionLetter, ratio: TempoRatio | 1): boolean => {
      const pat = patterns[letter];
      if (!pat || ratioOf(pat) === ratio) return false;
      // the tempo may come down to a new ceiling, so one Undo takes both back
      pushHistory(true);
      setPatterns((prev) => {
        const p = prev[letter];
        if (!p) return prev;
        const next = clonePattern(p);
        if (ratio === 1) delete next.tempoRatio;
        else next.tempoRatio = ratio;
        return { ...prev, [letter]: next };
      });
      return true;
    },
    [patterns, pushHistory]
  );

  /* ---- editing -------------------------------------------------------- */

  const applyDoctor = useCallback(
    (move: DoctorMove): boolean => {
      const pat = patterns[editing];
      /* A doctor's move writes new notes, so it needs the live style rather
         than the snapshot the pattern carries — the section's own, as
         Regenerate does, not whichever the picker fell back to. A pattern
         whose style is gone (or never was one: a rudiment, D45) can be
         played, scored and exported; it cannot be doctored, and the panel
         says so. */
      const params = pat && catalogue.styles[pat.style]?.params;
      if (!pat || !params) return false;
      pushHistory();
      setPatterns((prev) => ({ ...prev, [editing]: doctor(pat, params, move) }));
      return true;
    },
    [patterns, editing, catalogue.styles, pushHistory]
  );

  const writeCrossRhythm = useCallback(
    (spec: CrossRhythmSpec): string | null => {
      const pat = patterns[editing];
      if (!pat) return `there is no section ${editing} to write it in`;
      // a fill on a clave style keeps its clave, as a poly fill does (12-c)
      const params = catalogue.styles[pat.style]?.params;
      const result = crossRhythm(
        pat,
        spec,
        params?.clave ? { clave: true, claveValue: bbValue('s', params) } : {}
      );
      if (!result.ok) return result.reason;
      pushHistory();
      setTouched(editing);
      setPatterns((prev) => ({ ...prev, [editing]: result.pattern }));
      return null;
    },
    [patterns, editing, catalogue.styles, pushHistory]
  );

  /**
   * Cycle one cell.
   *
   * The note is **pinned to the layer you are looking at**, so the reduction
   * stops taking it back out — a ghost written at L2 is a ghost L2 keeps, and
   * it is still there at L3, L4 and L5. Without the pin you would draw a ghost
   * note and hear nothing, because ghosts do not exist below L4.
   */
  const cycleCell = useCallback(
    (letter: SectionLetter, bar: number, lane: LaneKey, step: number, back: boolean) => {
      const pat = patterns[letter];
      if (!pat) return;
      pushHistory();
      setTouched(letter);
      const next = clonePattern(pat);
      // edits are written against the stored break (L5), which is what a layer is a view of
      const states = LANE_STATES[lane] ?? 2;
      const shown = reducePattern(pat, level, feelCross).bars[bar][lane][step];
      const v = (shown + (back ? states - 1 : 1)) % states;
      next.bars[bar][lane][step] = v;
      if (v) setPin(next, bar, lane, step, level);
      keepHands(next, bar);
      // a poly fill whose accent you changed is not the drummer's figure any more (12-c)
      keepPolySpans(pat, next);
      // below 4 a poly fill's span plays its plain rows, and a note cleared there is cleared from them
      if (!v && level <= 3) clearPlainAt(next, bar, lane, step);
      setPatterns((prev) => ({ ...prev, [letter]: next }));
    },
    [patterns, level, feelCross, pushHistory]
  );

  const setCell = useCallback(
    (
      letter: SectionLetter,
      bar: number,
      lane: LaneKey,
      step: number,
      value: number,
      stroke: 'start' | 'continue' = 'start'
    ) => {
      const pat = patterns[letter];
      if (!pat) return;
      /* Clearing what is already empty is no edit: no undo step, nothing
         touched. Below 4 a poly fill's span shows its plain rows, so a note
         there may be in them rather than on the bars. */
      const empty = (p: Pattern) =>
        !p.bars[bar]?.[lane]?.[step] && !(level <= 3 && plainAt(p, bar, lane, step));
      if (!value && empty(pat)) return;
      if (stroke === 'start') pushHistory();
      setTouched(letter);
      /* From the latest state, not this render's: a drag sets cells faster
         than the Studio re-renders, and each must land on the one before. */
      setPatterns((prev) => {
        const pat = prev[letter];
        /* An equal value is still written when it is a note: it may be one
           the layer reduces out, and setting it here is what pins it. */
        if (!pat || (!value && empty(pat))) return prev;
        const next = clonePattern(pat);
        next.bars[bar][lane][step] = value;
        if (value) setPin(next, bar, lane, step, level);
        keepHands(next, bar);
        // a poly fill whose accent you changed is not the drummer's figure any more (12-c)
        keepPolySpans(pat, next);
        if (!value && level <= 3) clearPlainAt(next, bar, lane, step);
        return { ...prev, [letter]: next };
      });
    },
    [patterns, level, pushHistory]
  );

  const editTuplet = useCallback(
    (letter: SectionLetter, bar: number, lane: LaneKey, step: number, edit: TupletEdit) => {
      const pat = patterns[letter];
      if (!pat?.bars[bar]) return false;
      const next = clonePattern(pat);
      let done = false;
      /** The beat a tuplet is made over or given back: its hands go with it. */
      let beat: { start: number; span: number } | null = null;
      if (edit.kind === 'make') {
        const m = meterOfPat(pat);
        const g = groupsOf(m)[groupAt(m, step)];
        done = !!g && addTuplet(next, bar, lane, g.start, g.size, edit.n);
        if (g) beat = { start: g.start, span: g.size };
      } else if (edit.kind === 'double') {
        done = addDouble(next, bar, lane, step);
        /* a double is one hand's (13-a): the hand written on its step, else
           the lead hand, written so the drummer and the chart play it so */
        if (done && !stickingAt(next.sticking, bar, step)) writeHand(next, bar, step, 'R');
      } else if (edit.kind === 'unmake') {
        // a double gives back the step of the note the picker is on, not its whole run
        const double = doubleAt(pat, bar, lane, step);
        const at = double && edit.j !== undefined ? double.start + Math.floor(edit.j / 2) : step;
        const span = double ? undefined : ownedBy(tupletsIn(pat, bar), lane, at);
        done = removeTuplet(next, bar, lane, at);
        if (span) beat = { start: span.start, span: span.span };
      } else done = setTupletNote(next, bar, lane, step, edit.j, edit.value);
      if (!done) return false;
      pushHistory();
      setTouched(letter);
      /* the hands written for the beat's old notes are not the tuplet's, which
         go hand to hand: they go, and the rest of the bar keeps its own (D64).
         A double keeps its step's note and its hand (13-a). */
      if (beat) {
        dropHandsIn(next, bar, beat.start, beat.span);
        keepHands(next, bar);
      }
      keepPolySpans(pat, next);
      // a figure's tuplet made or unmade is not that figure, whatever its accents say
      if (edit.kind !== 'note') dropPolySpansAt(next, bar, step);
      setPatterns((prev) => ({ ...prev, [letter]: next }));
      return true;
    },
    [patterns, pushHistory]
  );

  /**
   * Write the hands under a section's notes, as one undo step. False, and
   * nothing touched, where the edit changes nothing or a hand cannot be
   * written there.
   */
  const editHands = useCallback(
    (letter: SectionLetter, bar: number, step: number, edit: HandEdit) => {
      const pat = patterns[letter];
      if (!pat?.bars[bar]) return false;
      const next = clonePattern(pat);
      // "alternate" runs over the notes the layer you are on shows, not a ghost it hides
      const shownHands = barHands(reducePattern(pat, level, feelCross), bar);
      const done =
        edit.kind === 'hand'
          ? writeHand(next, bar, step, edit.hand)
          : edit.kind === 'alternate'
            ? alternateHands(next, bar, step, edit.hand, (i) => shownHands.writable[i])
            : clearBarHands(next, bar);
      if (!done) return false;
      pushHistory();
      setTouched(letter);
      setPatterns((prev) => ({ ...prev, [letter]: next }));
      return true;
    },
    [patterns, level, feelCross, pushHistory]
  );

  /**
   * Blank the section being edited — every lane, every bar, and the pins,
   * written hands and fixed flag with them. A cleared section that still
   * carried pins would re-derive notes the moment you moved layers, which is
   * not what "clear" means.
   */
  const clearSection = useCallback(() => {
    const pat = patterns[editing];
    if (!pat) return;
    pushHistory();
    const next = clonePattern(pat);
    for (const bar of next.bars) for (const lane of LANES) bar[lane].fill(0);
    next.pins = null;
    delete next.sticking;
    // whatever is drawn next is not the rudiment or the polyrhythm, so its layers derive as ever
    delete next.fixed;
    delete next.poly;
    delete next.polySpans;
    delete next.tuplets;
    setPatterns((prev) => ({ ...prev, [editing]: next }));
  }, [patterns, editing, pushHistory]);

  /**
   * Turning a lane on or off should not throw the break away.
   *
   * The kit lanes keep what they had; the percussion parts are **rewritten**,
   * because those are the style's figure rather than anything you played. A
   * lane that has just gone away is emptied, so switching back and forth does
   * not leave notes on a lane nothing draws.
   */
  const applyLaneChoice = useCallback(
    (mode: 'style' | 'custom', lanes: CustomLanes) => {
      setPatterns((prev) => {
        const out = { ...prev };
        for (const letter of lettersOf(prev)) {
          const pat = prev[letter];
          if (!pat) continue;
          /* The pattern's own style, not the one selected: A and B can be from
           different styles after a library load, and a lane roster belongs to
           the style that wrote the notes. */
          const params = catalogue.styles[pat.style]?.params;
          if (!params) continue;
          const st = styleIn(params, pat.meter);
          const roster = resolveLanes(st, mode === 'custom' ? lanes : null);
          const next = clonePattern(pat);
          next.lanes = roster.lanes.slice();
          next.perc = { ...roster.perc };
          for (const bar of next.bars) for (const L of PERC_LANES) bar[L].fill(0);
          if (!next.lanes.includes('t1')) {
            for (const bar of next.bars) for (const L of TOM_LANES) bar[L].fill(0);
          }
          writePerc(next, st, makeRng(pat.seed ^ 0x2545f491));
          // a poly fill on the toms just emptied is not there to play any more
          keepPolySpans(pat, next);
          // nor is a tuplet on a lane the roster dropped (12-d)
          for (const t of next.tuplets ?? []) {
            for (const L of Object.keys(t.notes) as LaneKey[]) {
              if (!next.lanes.includes(L)) delete t.notes[L];
            }
          }
          keepTuplets(next);
          out[letter] = next;
        }
        return out;
      });
    },
    [catalogue.styles]
  );

  const setLanesMode = useCallback(
    (m: 'style' | 'custom') => {
      update({ lanesMode: m });
      applyLaneChoice(m, customLanes);
    },
    [update, customLanes, applyLaneChoice]
  );

  const setCustomLanes = useCallback(
    (l: CustomLanes) => {
      update({ customLanes: l });
      if (lanesMode === 'custom') applyLaneChoice('custom', l);
    },
    [update, lanesMode, applyLaneChoice]
  );

  /**
   * Load one of the famous breaks.
   *
   * By entry id rather than by index into a compiled-in array: the library is
   * rows now, and an index into a list the server sent is a number that means
   * something different after the next admin edit.
   *
   * The entry's `doc` is a packed pattern, so opening it is the same unpack a
   * pasted share code goes through — no bar-string parser in the client at all.
   * The B section is derived where the style is still known, and is simply the
   * A section again where it is not; an entry whose style was deleted is still
   * worth opening.
   */
  /** The arrangement a metric modulation's A–B took the place of (12-d), until the next entry. */
  const beforeModulation = useRef<SectionLetter[] | null>(null);
  const loadLibraryEntry = useCallback(
    (id: string, at?: PracticePlace) => {
      const entry = catalogue.libraries.flatMap((l) => l.entries).find((e) => e.id === id);
      if (!entry) return;
      /* a famous break is an A and a B: sections past B go, and their slots
         with them; after a song in sections, your arrangement comes back */
      const dropping = letters.length > 2 || !!stageSongArrangement;
      pushHistory(dropping);
      const pat = patternFromPacked(entry.doc, (key) => catalogue.styles[key]);
      const params = catalogue.styles[entry.styleKey]?.params;
      /* A metric modulation (12-d) carries its B, at its tempo ratio: A then
         B, and round to A again, is there and back. The arrangement you had
         comes back with the next entry that is not one. */
      const then = entry.doc.th
        ? patternFromPacked(entry.doc.th, (key) => catalogue.styles[key])
        : null;
      const b = then ?? (params ? deriveB(pat, params) : clonePattern(pat));
      if (!then) b.name = `${entry.title} (B)`;
      setPatterns({ A: pat, B: b });
      if (then) {
        /* only an arrangement of A and B is kept: one naming sections this
           entry drops would come back pointing at nothing */
        if (!beforeModulation.current && !dropping) beforeModulation.current = arrangement;
        setArrangement(['A', 'B']);
      } else {
        const saved = beforeModulation.current;
        beforeModulation.current = null;
        // and only over the modulation's own A–B, not one an undo or an edit has since replaced
        const untouched = arrangement.length === 2 && arrangement.join('') === 'AB';
        if (saved && !dropping && untouched) setArrangement(saved);
      }
      if (dropping && !then) {
        const next = arrangementForNew({
          current: arrangement,
          playing: stageSongArrangement,
          own: ownArrangement.current,
          next: null,
          sections: { A: pat, B: b },
        });
        ownArrangement.current = next.own;
        setArrangement(next.arrangement);
      }
      chosen.current = {};
      pickedForNext.current = false;
      // a polyrhythm opens counted the usual way: the ladder climbs pulse, cross, full
      setFeelCross(false);
      setStyleRaw(entry.styleKey);
      setMeterRaw(pat.meter);
      setBarsRaw(pat.bars.length);
      if (at) {
        /* Going back to where you were is an explicit ask, so it wins over
           the tempo lock — and the base is set from it, as a loaded pattern's
           is, so the layer match lands on this tempo rather than moving it. */
        const bpmAt = clamp(Math.round(at.bpm), 50, maxBpm(pat.meter));
        setLevel(at.level);
        setBpmRaw(bpmAt);
        setBaseBpm(baseFor(bpmAt, at.level));
      } else if (!locks.bpm) placeTempo(entry.bpm);
      setTries(null);
    },
    [
      catalogue,
      letters,
      pushHistory,
      locks.bpm,
      placeTempo,
      baseFor,
      arrangement,
      stageSongArrangement,
    ]
  );

  /* ---- style and meter follow each other ------------------------------ */

  /**
   * Pick a style. On a new pattern it is also your starting style, with the
   * meter and tempo it brings (D21); on a saved one it is what the next new
   * pattern is written in.
   */
  const setStyle = useCallback(
    (s: string) => {
      setStyleRaw(s);
      pickedForNext.current = true;
      const st = catalogue.styles[s]?.params;
      const nextMeter = st?.meter ?? userMeter;
      /* A style may name its own meter and its own kit — picking one switches
         to both, and **leaving it hands yours back**. A jazz waltz in 4/4 is
         not a jazz waltz, but neither is every style after it a waltz: without
         the second half of this, picking the waltz once strands medium swing
         in 3/4 and the ballad's brushes on everything afterwards. */
      setMeterRaw(nextMeter);
      if (settingUpNew()) {
        update({ startStyle: s, startMeter: nextMeter });
        chosen.current = { bars: chosen.current.bars };
      } else chosen.current = { ...chosen.current, style: s, meter: nextMeter };
      followKit(st);
      if (st && !locks.bpm) setBpm(Math.round((st.bpm[0] + st.bpm[1]) / 2));
      /* On a new pattern the style is the one on the stage, so its swing goes on
         the slider. On a saved one it is only what the next New is written in:
         the saved pattern keeps its swing, and that New rolls the style's. */
      if (settingUpNew()) swingFromStyle(s, nextMeter);
      setMixTouched((touched) => {
        applyStyleMix(s, touched);
        return touched;
      });
    },
    [
      catalogue,
      userMeter,
      followKit,
      settingUpNew,
      update,
      locks.bpm,
      setBpm,
      swingFromStyle,
      applyStyleMix,
    ]
  );

  const setMeter = useCallback(
    (m: string) => {
      setMeterRaw(m);
      pickedForNext.current = true;
      if (settingUpNew()) {
        update({ userMeter: m, startMeter: m });
        chosen.current = { style: chosen.current.style, bars: chosen.current.bars };
      } else {
        update({ userMeter: m });
        chosen.current = { ...chosen.current, meter: m };
      }
      setBpmRaw((b) => clamp(b, 50, maxBpm(m)));
    },
    [settingUpNew, update]
  );

  /** How many bars a new pattern is written with. On a new pattern, your starting length too. */
  const setBars = useCallback(
    (n: number) => {
      setBarsRaw(n);
      pickedForNext.current = true;
      if (settingUpNew()) {
        update({ startBars: n });
        chosen.current = { style: chosen.current.style, meter: chosen.current.meter };
      } else chosen.current = { ...chosen.current, bars: n };
    },
    [settingUpNew, update]
  );

  /* ---- audio ---------------------------------------------------------- */

  const audioRef = useRef<BreakAudio | null>(null);
  const transportRef = useRef<Transport | null>(null);
  /** A practice session's ear on the clock (7D) — read by the transport's callbacks. */
  const clockListener = useRef<ClockListener | null>(null);
  const stepListeners = useRef(new Set<(step: ScheduledStep) => void>());
  const packsRef = useRef<PackSource | null>(null);
  const yoursRef = useRef<YourSampleSource | null>(null);
  const midiRef = useRef<MidiOut | null>(null);
  const kitRef = useRef(kit);
  useEffect(() => {
    kitRef.current = kit;
  }, [kit]);

  /**
   * What has decoded so far, for the kit panel to report.
   *
   * Copied out into state rather than read off the sources at render time: a
   * decode finishes inside a promise, long after the render that started it,
   * and a ref read during render is exactly the value React is entitled not to
   * re-run for. The sources call `bump` when they land; so does a kit change.
   */
  const [samples, setSamples] = useState<{
    kitSlots: number;
    kitFailed: number;
    percCount: number;
  }>({ kitSlots: 0, kitFailed: 0, percCount: 0 });

  const refreshSamples = useCallback(() => {
    const packs = packsRef.current;
    const yours = yoursRef.current;
    if (!packs || !yours) return;
    const row = catalogue.kits[kitRef.current];
    const user = kitEngine(row) === 'user';
    setSamples({
      // a kit of yours may hold pieces as well as samples (9-v)
      kitSlots: (user ? yours.count(row) : 0) + packs.count(row),
      kitFailed: user ? yours.failedCount(row) : 0,
      percCount: packs.percCount(),
    });
  }, [catalogue.kits]);

  const refreshRef = useRef(refreshSamples);
  useEffect(() => {
    refreshRef.current = refreshSamples;
  }, [refreshSamples]);
  useEffect(refreshSamples, [kit, refreshSamples]);

  /* Only a solo on a lane this pattern plays counts (`soloInPlay`). */
  const soloNow = useMemo(
    () => soloInPlay(laneSolo, mixLanes(...patternsOf(view).map((p) => p.lanes))),
    [laneSolo, view]
  );

  /* Humanise's seed is the full sections' notes and your take — not the
     layer on show, so changing layer or tempo does not re-roll it. */
  const humanisePlay = useMemo(
    () => ({
      amount: humaniseAmount(humanise),
      seed: humaniseSeed(patternsOf(patterns), humanise.take),
    }),
    [humanise, patterns]
  );

  /**
   * What the transport reads on every scheduled step.
   *
   * Held in a ref and refreshed after each render rather than passed in at
   * `start()`: the transport must see the CURRENT tempo, mix and grid, or a
   * fader move would not land until the next loop — but it must not re-subscribe
   * on every keystroke either. A ref updated in an effect is exactly that, and
   * keeps the render itself pure.
   */
  const snapshot: TransportSnapshot = useMemo(
    () => ({
      patterns: view,
      arrangement,
      solo: viewMode === 'both' ? null : viewMode,
      bpm,
      swing,
      feel,
      hats,
      humanise: humanisePlay,
      click,
      clickSub,
      feelCross,
      countIn,
      ramp: sessionHold ? 0 : ramp,
      ceiling,
      mix,
      mute,
      laneSolo: soloNow,
    }),
    [
      view,
      arrangement,
      viewMode,
      bpm,
      swing,
      feel,
      hats,
      humanisePlay,
      click,
      clickSub,
      feelCross,
      countIn,
      ramp,
      sessionHold,
      ceiling,
      mix,
      mute,
      soloNow,
    ]
  );

  const snapshotRef = useRef(snapshot);
  /* A restart waiting for the pattern it is for (see `restartFromTop`): the A
     it was asked over, so it fires once a different one is on the stage. */
  const restartOver = useRef<Pattern | null | undefined>(undefined);
  useEffect(() => {
    snapshotRef.current = snapshot;
    /* Here, once the transport can see the new pattern, and not when it was
       asked for: started then, it would count into the old one. */
    const t = transportRef.current;
    if (restartOver.current === undefined || snapshot.patterns.A === restartOver.current) return;
    restartOver.current = undefined;
    if (!t?.playing) return;
    t.stop();
    if (t.start({ countIn: Math.max(1, snapshot.countIn) })) setPlaying(true);
  }, [snapshot]);

  /* ---- the kit, and your tuning of it --------------------------------- */

  /** What the engine is actually playing: the kit's numbers, your knobs on top. */
  /* The kit as the catalogue resolved it — an object, not a key. Playback,
     the sample loaders and the tuning all take the row. */
  const kitRow = useMemo(() => catalogue.kits[kit], [catalogue.kits, kit]);
  /* Percussion is not per kit — a tambourine over the Studio '70s set should be
     a tambourine — so it is found once, by looking for the kit row that ships a
     `perc` map rather than by naming one. */
  const percussion = useMemo(() => percussionSource(catalogue.kits), [catalogue.kits]);
  const sound = useMemo(() => withTuning(kitRow, tuning[kit]), [kitRow, kit, tuning]);
  const kitTuned = Object.keys(tuning[kit] ?? {}).length > 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    /* A sampled kit needs a context to decode into. Picking one is a gesture,
       so this is the moment to have it — rather than the first note, which
       would arrive synthesised while the decode caught up behind it. */
    audio.percussion = percussion;
    if (kitEngine(kitRow) !== 'synth') audio.init();
    audio.setKit(kitRow ?? null, sound);
  }, [kitRow, sound, percussion]);

  const setKit = useCallback(
    (k: string) => {
      /* An unported engine would not error — it would fall through to the
         synthesised voices with another kit's parameters, so picking TR-909
         would quietly hand you the Machine kit. Refuse instead. */
      const row = catalogue.kits[k];
      if (!row || !kitIsPlayable(row)) return;
      update({ kit: k, userKit: k });
    },
    [catalogue.kits, update]
  );

  /* Tuning is sent a kit at a time — `sound` merges by kit — so a change
     carries only the kit it touches, and another device's tuning of a
     different kit is not written back over. A reset is the kit with no
     overrides. */
  const setParam = useCallback(
    (v: string, key: string, value: number) => {
      update(({ sound: prev }) => ({
        sound: { [kit]: { ...prev[kit], [v]: { ...prev[kit]?.[v], [key]: value } } },
      }));
    },
    [kit, update]
  );

  const resetVoice = useCallback(
    (v: string) => {
      update(({ sound: prev }) => {
        const forKit = { ...prev[kit] };
        delete forKit[v];
        return { sound: { [kit]: forKit } };
      });
    },
    [kit, update]
  );

  const resetKit = useCallback(() => {
    update({ sound: { [kit]: {} } });
  }, [kit, update]);

  const setPercSamples = useCallback(
    (b: boolean) => {
      update({ percSamples: b });
      if (packsRef.current) packsRef.current.usePercSamples = b;
    },
    [update]
  );

  const setPanView = useCallback(
    (v: PanView) => {
      update({ panView: v });
      audioRef.current?.setPanView(v);
    },
    [update]
  );

  const setHumaniseMode = useCallback(
    (mode: HumaniseMode) => {
      update(({ humanise: h }) => ({
        humanise: { ...h, mode, amount: mode === 'off' ? h.amount : HUMANISE_AMOUNT[mode] },
      }));
    },
    [update]
  );

  const setHumaniseAmount = useCallback(
    (amount: number) => {
      update(({ humanise: h }) => ({ humanise: { ...h, amount } }));
    },
    [update]
  );

  const newTake = useCallback(() => {
    update(({ humanise: h }) => ({ humanise: { ...h, take: (h.take + 1) % 0x7fffffff } }));
  }, [update]);

  /* The AudioContext is built once, in an effect with no state in its deps.
     These refs are how that effect reads the current kit and preferences
     without being torn down and rebuilt every time one of them changes. */
  const soundRef = useRef(sound);
  const kitRowRef = useRef(kitRow);
  const percussionRef = useRef(percussion);
  const percSamplesRef = useRef(percSamples);
  const panViewRef = useRef(panView);
  useEffect(() => {
    soundRef.current = sound;
    kitRowRef.current = kitRow;
    percussionRef.current = percussion;
    percSamplesRef.current = percSamples;
    panViewRef.current = panView;
  }, [sound, kitRow, percussion, percSamples, panView]);

  /* The AudioContext and the clock are created together, in an effect rather
     than during render: an AudioContext is a real resource, and constructing one
     on the server or twice under StrictMode is a leak, not a re-render. */
  useEffect(() => {
    const audio = new BreakAudio();
    /* The sampled kits are a source the synth falls through to, not a branch
       inside it — a pack still decoding, or one slot short, plays the
       synthesised voice for that hit rather than nothing. Your own kits are a
       second source behind the same rule, so moving between a recorded kit and
       one of yours needs no reload. */
    const bump = () => refreshRef.current();
    const packs = new PackSource(bump);
    const yours = new YourSampleSource(bump);
    packs.usePercSamples = percSamplesRef.current;
    packsRef.current = packs;
    yoursRef.current = yours;
    /* A synthesised kit is a third, rendered ahead (9-vi-d): its voices play
       live until their renders land. */
    audio.samples = new SourceStack([packs, yours, new SynthSource()]);
    audio.setPanView(panViewRef.current);
    audioRef.current = audio;
    const midi = new MidiOut();
    midiRef.current = midi;
    const t = new Transport(audio, {
      getSnapshot: () => snapshotRef.current,
      onBpm: (n) => setBpmRaw(n),
      onLoop: (n, at) => {
        setLoops(n);
        clockListener.current?.onLoop?.(at);
      },
      onDownbeat: (at) => clockListener.current?.onDownbeat?.(at),
      onPaint: (ev) => setPosition(ev),
      onStep: (step) => stepListeners.current.forEach((listener) => listener(step)),
      onStop: () => {
        setPlaying(false);
        setPosition(null);
      },
    });
    t.midi = midi;
    transportRef.current = t;
    audio.percussion = percussionRef.current;
    audio.setKit(kitRowRef.current, soundRef.current);
    return () => {
      t.stop();
      midi.disconnect();
      /* Stopping the transport only silences the output; the AudioContext stays
         open, and the browser allows a page only a handful of them (H7). The
         provider that owns this effect is mounted once by the Studio frame, so
         this runs when the Studio is left, not between renders. */
      audio.close();
      transportRef.current = null;
      audioRef.current = null;
      packsRef.current = null;
      yoursRef.current = null;
      midiRef.current = null;
    };
  }, [setBpmRaw]);

  /* ---- MIDI out -------------------------------------------------------- */

  const openMidiOut = useCallback(async (): Promise<string> => {
    const midi = midiRef.current;
    if (!midi) return 'No transport yet';
    const { name, error } = await midi.connect();
    if (error) return error;
    // the offset between the two clocks can only be measured against a live one
    midi.ctx = audioRef.current?.init() ?? null;
    setMidiPort(name);
    return '';
  }, []);

  const closeMidiOut = useCallback(() => {
    midiRef.current?.disconnect();
    setMidiPort('');
  }, []);

  /* An event handler, so reading the ref here is the normal case rather than a
     render-time access — the transport instance is never captured in a closure. */
  const togglePlay = useCallback(() => {
    const t = transportRef.current;
    if (!t) return;
    if (t.playing) {
      // a pause: Play comes back in at the top of the section it was in
      const at = t.cursor();
      t.stop();
      if (at && at.slot >= 0) setCue(at.slot);
      return;
    }
    if (t.start({ from: cue ?? undefined })) {
      setPlaying(true);
      setCue(null);
    } else logger.warn('BeatBreaker: no Web Audio in this browser — notation still works');
  }, [cue]);

  const stopToTop = useCallback(() => {
    const t = transportRef.current;
    if (t?.playing) t.stop();
    setCue(null);
  }, []);

  const skip = useCallback((delta: 1 | -1) => {
    const t = transportRef.current;
    const snap = snapshotRef.current;
    const slots = playableSlots(snap.arrangement, snap.patterns, snap.solo);
    const at = t?.cursor();
    if (t && at) {
      t.seekSlot(skipSlot(slots, at.slot, at.barIdx, delta));
      return;
    }
    setCue((was) => skipSlot(slots, was ?? slots[0] ?? 0, 0, delta));
  }, []);

  const seekSlot = useCallback((slot: number) => {
    const t = transportRef.current;
    if (t?.playing) t.seekSlot(slot);
    else setCue(slot);
  }, []);

  /* ---- what a practice session drives (7D) ----------------------------- */

  const play = useCallback(() => {
    const t = transportRef.current;
    if (!t) return false;
    if (t.playing) return true;
    if (!t.start()) {
      logger.warn('BeatBreaker: no Web Audio in this browser — notation still works');
      return false;
    }
    setPlaying(true);
    return true;
  }, []);

  const stopPlaying = useCallback(() => {
    const t = transportRef.current;
    if (t?.playing) t.stop();
  }, []);

  /**
   * When the break on the stage changes next, and only if it is playing: go
   * back to the top and count in again (a bar at least), rather than carry on
   * mid-bar in somebody else's groove. Picking a style asks for this.
   */
  const restartFromTop = useCallback(() => {
    if (!transportRef.current?.playing) return;
    restartOver.current = patterns.A;
  }, [patterns.A]);

  /* A practice tempo, as the trainer's ramp sets it: the pattern's own tempo
     (`baseBpm`) is not moved. Down to 40, the slowest a session plays. */
  const playAt = useCallback(
    (n: number) => setBpmRaw(clamp(Math.round(n), 40, bpmCeiling)),
    [bpmCeiling]
  );

  const audioNow = useCallback(() => audioRef.current?.ctx?.currentTime ?? 0, []);

  const audioLatency = useCallback(() => {
    const ctx = audioRef.current?.ctx;
    if (!ctx) return 0;
    const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    return Number.isFinite(latency) ? Math.min(Math.max(latency, 0), 0.5) : 0;
  }, []);

  const primeAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio?.init()) audio.resume();
  }, []);

  const setClockListener = useCallback((listener: ClockListener | null) => {
    clockListener.current = listener;
  }, []);

  const subscribeSteps = useCallback((listener: (step: ScheduledStep) => void) => {
    const listeners = stepListeners.current;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // the arrangement or the solo changed while playing — keep going, new sequence
  useEffect(() => {
    transportRef.current?.resync();
  }, [arrangement, viewMode]);

  const audition = useCallback((voice: string, variant?: string) => {
    audioRef.current?.hit(voice, variant);
  }, []);

  const previewSample = useCallback(
    (url: string, voice: string, opts: { gain: number; tune?: number; decay?: number }) =>
      audioRef.current?.preview(url, voice, opts) ?? Promise.resolve(false),
    []
  );

  /** A bar of the whole kit — the only honest way to compare two of them. */
  const auditionKit = useCallback(() => audioRef.current?.demo() ?? false, []);

  /* ---- first break ----------------------------------------------------- */

  /** Put a whole decoded break on the stage — the arrival paths share this. */
  const applyDoc = (doc: BreakDoc) => {
    setPatterns(sectionsOfDoc(doc));
    setBpmRaw(doc.bpm);
    setBaseBpm(baseFor(doc.bpm, doc.level));
    setSwingRaw(doc.swing);
    holdSwing(false);
    setLevel(doc.level);
    setArrangement(doc.arrangement);
    // the pickers show the section on the stage
    const on = doc[editing] ?? doc.A;
    setStyleRaw(on.style);
    setMeterRaw(on.meter);
    setBarsRaw(on.bars.length);
    chosen.current = {};
    pickedForNext.current = false;
    applyStyleMix(doc.A.style, {});
  };

  useEffect(() => {
    if (ready) return;
    /* A saved pattern the page loaded is the one you asked for by its address,
       so it wins over everything below — including a stashed link, which is
       left in storage for the next plain `/studio` visit rather than consumed
       here and lost. */
    if (initial) {
      try {
        const doc = breakDocFromPayload(initial.payload, (key) => catalogue.styles[key]);
        /* The row's title, not the name inside the document: a rename is a
           PATCH of the title alone, so after one the two differ, and the title
           is what the owner last called it. */
        applyDoc({ ...doc, A: { ...doc.A, name: initial.title } });
        setReady(true);
        return;
      } catch (error) {
        // the row passed the server's schema, so this is a decoder bug, not bad data
        logger.error('BeatBreaker: a saved pattern would not decode', {
          error,
          breakId: initial.id,
        });
      }
    }
    /* A link opened while signed out had its fragment stashed on the way to
       the login page (H5). Put it back in the URL before reading it, so the
       break arrives and the address bar is the link that was sent. */
    if (typeof window !== 'undefined' && !window.location.hash.startsWith('#b=')) {
      let pending: string | null = null;
      try {
        pending = takePendingLink(window.localStorage);
      } catch {
        // storage blocked — nothing was stashed, then
      }
      if (pending) {
        const { pathname, search } = window.location;
        window.history.replaceState(null, '', `${pathname}${search}${pending}`);
      }
    }
    /* A shared link puts the break in the fragment. Arriving on one should
       land you on that break rather than on a fresh one that is then replaced
       — so this is checked before anything is generated. */
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#b=')) {
      try {
        /* The lookup is what lets a v3 code — one written before styles had
           versions — find its style and rebuild the snapshot a v4 code
           carries. Without it the break still opens, with default feel. */
        applyDoc(decodeBreak(window.location.hash.slice(3), (key) => catalogue.styles[key]));
        setReady(true);
        return;
      } catch (error) {
        logger.warn('BeatBreaker: the link carried a break that would not read', { error });
      }
    }
    /* The pattern you had on the stage before a reload, if it was never saved.
       After a link, because a link is something you just asked for; before
       generating, because rolling a new one over it is what used to lose it. */
    if (typeof window !== 'undefined') {
      let scratch: SharePayload | null = null;
      try {
        scratch = readScratch(window.localStorage);
      } catch {
        // storage blocked — nothing kept, then
      }
      if (scratch) {
        try {
          applyDoc(breakDocFromPayload(scratch, (key) => catalogue.styles[key]));
          setReady(true);
          return;
        } catch (error) {
          logger.warn('BeatBreaker: the kept scratch pattern would not read', { error });
        }
      }
    }
    if (!styleRow) {
      /* Nothing to generate from, and nothing that will arrive later. Say so
         rather than leaving `ready` false, which the stage renders as work in
         progress. */
      setNoCatalogue(true);
      return;
    }
    /* The break you arrive to plays one of the style's songs too, at the
       song's meter and tempo, as New would. */
    const song = pickSong(styleRow.params, Math.random);
    const merged = withSong(styleRow.params, song?.key);
    const atMeter = song ? songMeter(styleRow.params, song) : meter;
    /* A locked tempo stays, held under the song meter's ceiling as New holds
       it, and stays the base tempo it was. */
    const top = song ? maxBpmOf(songPaces(styleRow.params, song)) : maxBpm(atMeter);
    const atBpm =
      song && !locks.bpm
        ? clamp(songTempo(styleRow.params, song, Math.random), 50, top)
        : clamp(bpm, 50, top);
    if (song) {
      setMeterRaw(atMeter);
      setBpmRaw(atBpm);
      if (!locks.bpm) setBaseBpm(atBpm);
      followKit(merged);
    }
    const made = songBreak({
      style: styleRow,
      song: song?.key,
      meter: atMeter,
      bars,
      density,
      ghosts,
      seed: Math.floor(Math.random() * 0xffffffff),
      bpm: atBpm,
      custom: lanesMode === 'custom' ? customLanes : null,
    });
    setPatterns(made.sections);
    /* Every slot names a section the break has: a link or scratch pattern that
       failed to load partway may have left an arrangement of its own. */
    setArrangement((a) => made.arrangement ?? arrangementIn(a, made.sections));
    setTries({ tries: made.tries, rejected: made.rejected });
    setSwingRaw(swingFor(merged, atMeter));
    applyStyleMix(style, {});
    setReady(true);
    // deliberately once, on mount: this is the break you arrive to
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* ---- export ---------------------------------------------------------- */

  const asDoc = useCallback((): BreakDoc | null => {
    const { A, B } = patterns;
    if (!A || !B) return null;
    const doc: BreakDoc = {
      bpm,
      swing,
      level,
      arrangement: arrangementIn(arrangement, patterns),
      A,
      B,
    };
    for (const L of lettersOf(patterns)) {
      const p = patterns[L];
      if (p && L !== 'A' && L !== 'B') doc[L] = p;
    }
    return doc;
  }, [patterns, bpm, swing, level, arrangement]);

  const shareCode = useCallback(() => {
    const doc = asDoc();
    return doc ? encodeBreak(doc) : '';
  }, [asDoc]);

  const payload = useCallback(() => {
    const doc = asDoc();
    return doc ? breakPayload(doc) : null;
  }, [asDoc]);

  /**
   * The code as a link. The break rides in the fragment rather than the query
   * string on purpose: a fragment is never sent to the server, so sharing a
   * break does not put it in anyone's access log.
   */
  const shareLink = useCallback(() => {
    const code = shareCode();
    if (!code || typeof window === 'undefined') return '';
    const { origin, pathname } = window.location;
    return `${origin}${pathname}#b=${code}`;
  }, [shareCode]);

  /** Put a decoded pattern on the stage, as an edit undo can take back. */
  const putDoc = useCallback(
    (doc: BreakDoc) => {
      pushHistory();
      setPatterns(sectionsOfDoc(doc));
      setBpmRaw(doc.bpm);
      setBaseBpm(baseFor(doc.bpm, doc.level));
      setSwingRaw(doc.swing);
      holdSwing(false);
      setLevel(doc.level);
      setArrangement(doc.arrangement);
      const on = doc[editing] ?? doc.A;
      setStyleRaw(on.style);
      setMeterRaw(on.meter);
      setBarsRaw(on.bars.length);
      chosen.current = {};
      pickedForNext.current = false;
      setFeelCross(false);
      setTries(null);
    },
    [pushHistory, baseFor, holdSwing, editing]
  );

  const [flash, setFlash] = useState<Flash | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

  const applyAssistant = useCallback(
    (stored: SharePayload, push: boolean): BreakDoc => {
      const doc = breakDocFromPayload(stored, (key) => catalogue.styles[key]);
      if (push) pushHistory(true);
      const cells: Flash['cells'] = {};
      for (const L of lettersOf(doc)) cells[L] = changedCells(patterns[L], doc[L]);
      setFlash((prev) => ({ cells, seq: (prev?.seq ?? 0) + 1 }));
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);

      setPatterns(sectionsOfDoc(doc));
      setBpmRaw(doc.bpm);
      setBaseBpm(baseFor(doc.bpm, doc.level));
      setSwingRaw(doc.swing);
      holdSwing(false);
      setLevel(doc.level);
      setArrangement(doc.arrangement);
      const on = doc[editing] ?? doc.A;
      setStyleRaw(on.style);
      setMeterRaw(on.meter);
      setBarsRaw(on.bars.length);
      chosen.current = {};
      pickedForNext.current = false;
      setTries(null);
      return doc;
    },
    [catalogue, pushHistory, patterns, baseFor, holdSwing, editing]
  );

  const loadCode = useCallback(
    (code: string): boolean => {
      try {
        // people paste the link, not the code inside it
        const at = code.indexOf('#b=');
        putDoc(decodeBreak(at >= 0 ? code.slice(at + 3) : code.trim()));
        return true;
      } catch (error) {
        logger.warn('BeatBreaker: could not read that break code', { error });
        return false;
      }
    },
    [putDoc]
  );

  const loadPayload = useCallback(
    (stored: SharePayload, title: string, at?: PracticePlace): boolean => {
      try {
        const doc = breakDocFromPayload(stored, (key) => catalogue.styles[key]);
        const bpmAt = at ? clamp(Math.round(at.bpm), 50, maxBpmOf(patternsOf(doc))) : doc.bpm;
        // the row's title, for the reason the arrival path gives
        putDoc({
          ...doc,
          ...(at ? { level: at.level, bpm: bpmAt } : {}),
          A: { ...doc.A, name: title },
        });
        return true;
      } catch (error) {
        logger.error('BeatBreaker: a saved pattern would not decode', { error });
        return false;
      }
    },
    [catalogue, putDoc]
  );

  const midi = useCallback(
    (played = true): MidiFile | null => {
      const solo = viewMode === 'both' ? null : viewMode;
      const seq = arrangement
        .filter((L) => !solo || L === solo)
        .flatMap((L) => {
          const pat = view[L];
          return pat ? pat.bars.map((_, i) => ({ pattern: pat, barIdx: i })) : [];
        });
      if (!seq.length) return null;
      return buildMidi(seq, {
        bpm,
        swing,
        feel,
        hats,
        ...(played ? { humanise: humanisePlay } : {}),
      });
    },
    [arrangement, view, viewMode, bpm, swing, feel, hats, humanisePlay]
  );

  const rename = useCallback((name: string) => {
    /* The name is not the music, so it is not an undo step: undoing a note
       should not also take back the title you typed after it. */
    setPatterns((prev) =>
      prev.A ? { ...prev, A: { ...prev.A, name: name.slice(0, 120) } } : prev
    );
  }, []);

  return {
    ready,
    noCatalogue,
    patterns,
    letters,
    view,
    next,
    report,
    checks,
    tries,
    level,
    setLevel,
    viewMode,
    setViewMode,
    editing,
    style,
    setStyle,
    meter,
    setMeter,
    bars,
    setBars,
    density,
    setDensity,
    ghosts,
    setGhosts,
    swing,
    setSwing,
    swingYours,
    hats,
    setHats,
    feel,
    setFeel,
    lanesMode,
    setLanesMode,
    customLanes,
    setCustomLanes,
    bpm,
    setBpm,
    quickTempo,
    bpmCeiling,
    bpmFloor,
    creativity,
    setCreativity,
    twist,
    playing,
    togglePlay,
    stopToTop,
    cue,
    skip,
    seekSlot,
    loops,
    position,
    play,
    stopPlaying,
    primeAudio,
    playAt,
    audioNow,
    audioLatency,
    setClockListener,
    subscribeSteps,
    sessionHold,
    setSessionHold,
    kit,
    setKit,
    sound,
    voice,
    setVoice,
    setParam,
    resetVoice,
    resetKit,
    kitTuned,
    kitSlots: samples.kitSlots,
    kitFailed: samples.kitFailed,
    percSamples,
    setPercSamples,
    panView,
    setPanView,
    humanise,
    setHumaniseMode,
    setHumaniseAmount,
    newTake,
    percCount: samples.percCount,
    mix,
    setLaneMix,
    resetMix,
    mixTouched,
    mute,
    toggleMute,
    laneSolo,
    toggleSolo,
    click,
    setClick,
    clickSub,
    setClickSub,
    feelCross,
    setFeelCross,
    countIn,
    setCountIn,
    ramp,
    setRamp,
    ceiling,
    setCeiling,
    matchTempo,
    setMatchTempo,
    arrangement,
    setArrangement,
    locks,
    toggleLock,
    guides,
    setGuides,
    sticking,
    setSticking,
    preview,
    setPreview,
    size,
    setSize,
    newBreak,
    newBreakIn,
    restartFromTop,
    regenerate,
    buildBFromA,
    addSection,
    addSectionBlocked,
    deleteSection,
    setSectionTempo,
    applyDoctor,
    writeCrossRhythm,
    cycleCell,
    setCell,
    editTuplet,
    editHands,
    loadLibraryEntry,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    clearSection,
    shareCode,
    payload,
    rename,
    shareLink,
    loadCode,
    loadPayload,
    applyAssistant,
    flash,
    midi,
    midiPort,
    openMidiOut,
    closeMidiOut,
    audition,
    previewSample,
    auditionKit,
  };
}

/** How many values each lane cycles through, including empty: every value it has. */
const LANE_STATES: Record<string, number> = Object.fromEntries(
  Object.entries(LANE_VALUES).map(([lane, values]) => [lane, values.length + 1])
);
