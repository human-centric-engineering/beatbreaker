'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BreakAudio, SourceStack } from '@/lib/app/breaks/audio/engine';
import { MidiOut } from '@/lib/app/breaks/audio/midi-out';
import { PackSource } from '@/lib/app/breaks/audio/packs';
import { UserSource } from '@/lib/app/breaks/audio/user-kit';
import {
  Transport,
  type PlayEvent,
  type SectionLetter,
  type TransportSnapshot,
  maxBpm,
} from '@/lib/app/breaks/audio/transport';
import {
  type Critique,
  type Playability,
  critique,
  generateGood,
  playability,
} from '@/lib/app/breaks/critic';
import { type DoctorMove, doctor } from '@/lib/app/breaks/doctor';
import { deriveB } from '@/lib/app/breaks/generate';
import { DEFAULT_MIX, LANES, PERC_LANES, TOM_LANES } from '@/lib/app/breaks/lanes';

import { reducePattern } from '@/lib/app/breaks/layers';
import { DEFAULT_METER } from '@/lib/app/breaks/meter';
import { buildMidi } from '@/lib/app/breaks/midi';
import { takePendingLink } from '@/lib/app/breaks/pending-link';
import {
  type CustomLanes,
  clonePattern,
  resolveLanes,
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
import { styleIn } from '@/lib/app/breaks/styles';
import type { StudioCatalogue } from '@/lib/app/breaks/catalogue/types';
import { percussionSource } from '@/lib/app/breaks/catalogue/types';
import type { LaneKey, Pattern, ResolvedStyle } from '@/lib/app/breaks/types';
import { type VoiceParams, kitEngine, kitIsPlayable, withTuning } from '@/lib/app/breaks/kit';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { logger } from '@/lib/logging';

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

export type ViewMode = 'A' | 'B' | 'both';

/** Two undo steps' worth of both sections. */
interface Snapshot {
  A: Pattern | null;
  B: Pattern | null;
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
  patterns: Record<SectionLetter, Pattern | null>;
  /** The sections as they sound and look at the current layer. */
  view: Record<SectionLetter, Pattern | null>;
  /**
   * The same sections one layer up, or `null` at the top layer. The chart
   * draws the difference faintly, so you can see what arrives next without
   * committing to playing it.
   */
  next: Record<SectionLetter, Pattern | null> | null;
  report: Critique | null;
  checks: Playability | null;
  tries: { tries: number; rejected: number } | null;

  level: number;
  setLevel: (n: number) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  editing: SectionLetter;
  setEditing: (s: SectionLetter) => void;

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
  bpmCeiling: number;
  playing: boolean;
  togglePlay: () => void;
  loops: number;
  position: PlayEvent | null;

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
  /** Play the synthesised percussion voices instead of the recordings. */
  percSamples: boolean;
  setPercSamples: (b: boolean) => void;
  /** How many percussion instruments have recordings in memory. */
  percCount: number;
  /** Your own one-shots: filename per slot. */
  userNames: Record<string, string>;
  /** Returns an empty string on success, or the sentence to show. */
  addSample: (slot: string, file: File) => Promise<string>;
  removeSample: (slot: string) => Promise<void>;
  mix: Record<string, number>;
  setLaneMix: (lane: string, v: number) => void;
  resetMix: () => void;
  mixTouched: Record<string, boolean>;
  mute: Record<string, boolean>;
  toggleMute: (lane: string) => void;

  click: boolean;
  setClick: (b: boolean) => void;
  clickSub: number;
  setClickSub: (n: number) => void;
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

  newBreak: (which?: SectionLetter | 'both') => void;
  buildBFromA: () => void;
  applyDoctor: (move: DoctorMove) => void;
  cycleCell: (
    letter: SectionLetter,
    bar: number,
    lane: LaneKey,
    step: number,
    back: boolean
  ) => void;
  /**
   * Open a library entry. With `at`, on that layer and at that tempo — where
   * it was left, when the practice history (D18) brings you back to it.
   */
  loadLibraryEntry: (id: string, at?: PracticePlace) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  /** Saved breaks, newest first. */
  favs: Fav[];
  saveFav: () => void;
  loadFav: (index: number) => boolean;
  deleteFav: (index: number) => void;

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
  midiBase64: () => string;
  /** Plays a bar of the current kit. False when there is no Web Audio. */
  auditionKit: () => boolean;
  /** The MIDI port playback is also driving, if you have opened one. */
  midiPort: string;
  openMidiOut: () => Promise<string>;
  closeMidiOut: () => void;
  audition: (voice: string, variant?: string) => void;
}

/** One saved break. The code is the whole of it; the rest is for the row. */
export interface Fav {
  name: string;
  bpm: number;
  style: string;
  level: number;
  code: string;
}

/**
 * A saved pattern the Studio opens on, loaded server-side by `/studio/[id]`.
 *
 * The payload, not a decoded `BreakDoc`: it is plain JSON, so it crosses the
 * server/client boundary as it is, and it is decoded here with the same style
 * lookup a `#b=` link gets — one decode path however a pattern arrives.
 */
export interface InitialPattern {
  id: string;
  title: string;
  payload: SharePayload;
  /** False for someone else's shared pattern, which opens as yours to copy. */
  mine: boolean;
}

/** Where a pattern was left: the layer, and the tempo it was being played at. */
export interface PracticePlace {
  level: number;
  bpm: number;
}

/** How many saved breaks are kept. Oldest fall off the end. */
const FAV_CAP = 30;

/**
 * How far below the break's own tempo each layer sits, when the tempo is
 * matched to the layer. L5 is the break as written, so it is the tempo as
 * written; everything below it is a practice speed.
 */
const LAYER_TEMPO: Record<number, number> = { 1: 0.68, 2: 0.78, 3: 0.86, 4: 0.93, 5: 1 };

export function useBreakConsole(
  catalogue: StudioCatalogue,
  initial?: InitialPattern
): BreakConsole {
  const [ready, setReady] = useState(false);
  const [noCatalogue, setNoCatalogue] = useState(false);
  const [patterns, setPatterns] = useState<Record<SectionLetter, Pattern | null>>({
    A: null,
    B: null,
  });
  const [tries, setTries] = useState<{ tries: number; rejected: number } | null>(null);

  const [level, setLevel] = useLocalStorage('bb.level', 3);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('bb.view', 'both');
  const [editing, setEditing] = useState<SectionLetter>('A');

  const [style, setStyleRaw] = useLocalStorage('bb.style', 'funk');
  const [meter, setMeterRaw] = useLocalStorage('bb.meter', DEFAULT_METER);
  /** The meter you picked yourself, handed back when a style stops imposing one. */
  const [userMeter, setUserMeter] = useLocalStorage('bb.userMeter', DEFAULT_METER);
  const [bars, setBars] = useLocalStorage('bb.bars', 2);
  const [density, setDensity] = useLocalStorage('bb.density', 55);
  const [ghosts, setGhosts] = useLocalStorage('bb.ghosts', 60);
  const [swing, setSwing] = useLocalStorage('bb.swing', 8);
  const [hats, setHats] = useLocalStorage('bb.hats', 100);
  const [feel, setFeel] = useLocalStorage('bb.feel', 100);
  const [lanesMode, setLanesModeRaw] = useLocalStorage<'style' | 'custom'>('bb.lanesMode', 'style');
  const [customLanes, setCustomLanesRaw] = useLocalStorage<CustomLanes>('bb.customLanes', {
    toms: false,
  });

  const [bpm, setBpmRaw] = useLocalStorage('bb.bpm', 94);
  const [kit, setKitRaw] = useLocalStorage('bb.kit', 'studio70');
  /**
   * The kit you picked yourself, as opposed to one a style brought with it.
   * A style that names a kit switches to it; leaving that style hands yours
   * back, so picking the jazz set for one break does not silently keep the
   * ballad's brushes on everything afterwards.
   */
  const [userKit, setUserKit] = useLocalStorage('bb.userKit', 'studio70');
  const [tuning, setTuning] = useLocalStorage<Record<string, Record<string, VoiceParams>>>(
    'bb.sound',
    {}
  );
  const [voice, setVoice] = useState('h');
  const [percSamples, setPercSamplesRaw] = useLocalStorage('bb.percSamples', true);
  const [favs, setFavs] = useLocalStorage<Fav[]>('bb.favs', []);
  const [midiPort, setMidiPort] = useState('');
  const [guides, setGuides] = useLocalStorage('bb.guides', true);
  const [sticking, setSticking] = useLocalStorage('bb.sticking', false);
  const [preview, setPreview] = useLocalStorage('bb.preview', true);
  const [size, setSizeRaw] = useLocalStorage('bb.size', 1);
  const [arrangement, setArrangement] = useLocalStorage<SectionLetter[]>('bb.arr', [
    'A',
    'A',
    'A',
    'B',
  ]);
  const [countIn, setCountIn] = useLocalStorage('bb.count', 1);
  const [ceiling, setCeiling] = useLocalStorage('bb.ceiling', 130);
  const [matchTempo, setMatchTempo] = useLocalStorage('bb.matchTempo', false);

  const [click, setClick] = useState(false);
  const [clickSub, setClickSub] = useState(4);
  const [ramp, setRamp] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loops, setLoops] = useState(0);
  const [position, setPosition] = useState<PlayEvent | null>(null);

  const [mix, setMix] = useState<Record<string, number>>({ ...DEFAULT_MIX });
  const [mixTouched, setMixTouched] = useState<Record<string, boolean>>({});
  const [mute, setMute] = useState<Record<string, boolean>>({});
  const [locks, setLocks] = useState<Record<string, boolean>>({});

  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const bpmCeiling = maxBpm(meter);

  const setSize = useCallback(
    (n: number) => setSizeRaw(clamp(Math.round(n * 100) / 100, 0.7, 1.7)),
    [setSizeRaw]
  );

  /** The tempo the break is written at — the 100% the layer match works from. */
  const [baseBpm, setBaseBpm] = useLocalStorage('bb.baseBpm', 94);

  /**
   * Set the tempo.
   *
   * With the layer match on, the number you are dragging is the speed for the
   * layer you are on, not the break's — so what is stored is what that implies
   * about the break, and the effect below puts the slider back where you left
   * it. Storing the dragged number directly instead would make practising L1
   * quietly rewrite the break as a slow break.
   */
  const setBpm = useCallback(
    (n: number) => {
      const top = maxBpm(meter);
      const v = clamp(Math.round(n), 50, top);
      setBaseBpm(matchTempo ? clamp(Math.round(v / (LAYER_TEMPO[level] ?? 1)), 50, top) : v);
      setBpmRaw(v);
    },
    [meter, matchTempo, level, setBaseBpm, setBpmRaw]
  );

  /**
   * The break's own tempo, for a pattern that arrives at `bpm` on `level`.
   *
   * A loaded pattern sets the tempo directly, and the match effect below then
   * re-derives it from `baseBpm` for the new layer — so a base left over from
   * the last session silently moved every pattern you opened with the match on.
   * A saved pattern then opened "Unsaved" and autosaved a tempo you never
   * chose. Setting the base from the pattern makes the effect land on the tempo
   * it arrived with. Unrounded on purpose: rounding here is what would move it.
   *
   * The match setting is read from storage, not from `matchTempo`: a pattern
   * loads in the first commit, before `useLocalStorage` has hydrated, so the
   * state still holds its default there and the stored `true` arrives a render
   * later — exactly when the effect below would move the tempo. Storage is
   * written synchronously by the setter, so it is never behind the state.
   */
  const baseFor = useCallback(
    (bpmAt: number, levelAt: number) => {
      let on = matchTempo;
      try {
        const raw = window.localStorage.getItem('bb.matchTempo');
        if (raw !== null) on = raw === 'true';
      } catch {
        // storage blocked — the state is all there is
      }
      return on ? bpmAt / (LAYER_TEMPO[levelAt] ?? 1) : bpmAt;
    },
    [matchTempo]
  );

  /* The layer moved, or the match was switched on: put the tempo where that
     layer should be practised, measured against the break's own tempo. */
  useEffect(() => {
    if (!matchTempo) return;
    setBpmRaw(clamp(Math.round(baseBpm * (LAYER_TEMPO[level] ?? 1)), 50, maxBpm(meter)));
  }, [matchTempo, level, meter, baseBpm, setBpmRaw]);

  /* ---- derived: the sections as they sound and look ------------------- */

  const view = useMemo(
    () => ({
      A: patterns.A ? reducePattern(patterns.A, level) : null,
      B: patterns.B ? reducePattern(patterns.B, level) : null,
    }),
    [patterns, level]
  );

  /* Layer 5 is what's stored, so there is nothing above it to preview. */
  const next = useMemo(
    () =>
      level >= 5
        ? null
        : {
            A: patterns.A ? reducePattern(patterns.A, level + 1) : null,
            B: patterns.B ? reducePattern(patterns.B, level + 1) : null,
          },
    [patterns, level]
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
  const styleParams = styleRow?.params;

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

  const toggleLock = useCallback((k: string) => {
    setLocks((prev) => ({ ...prev, [k]: !prev[k] }));
  }, []);

  /* ---- history -------------------------------------------------------- */

  const pushHistory = useCallback(() => {
    setHistory((h) => {
      const next = [
        ...h,
        { A: patterns.A && clonePattern(patterns.A), B: patterns.B && clonePattern(patterns.B) },
      ];
      return next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next;
    });
    setFuture([]);
  }, [patterns]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [...f, { A: patterns.A, B: patterns.B }]);
      setPatterns({ A: prev.A, B: prev.B });
      return h.slice(0, -1);
    });
  }, [patterns]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[f.length - 1];
      setHistory((h) => [...h, { A: patterns.A, B: patterns.B }]);
      setPatterns({ A: next.A, B: next.B });
      return f.slice(0, -1);
    });
  }, [patterns]);

  /* ---- generation ----------------------------------------------------- */

  const generate = useCallback(
    (which: SectionLetter | 'both', seed?: number) => {
      if (!styleRow) return null;
      const st = styleIn(styleRow.params, meter);
      const roster = resolveLanes(st, lanesMode === 'custom' ? customLanes : null);
      const made = generateGood(
        {
          style: styleRow,
          meter,
          bars,
          density,
          ghosts,
          seed: seed ?? Math.floor(Math.random() * 0xffffffff),
          lanes: roster.lanes,
          perc: roster.perc,
        },
        bpm
      );
      setTries({ tries: made.tries, rejected: made.rejected });

      setPatterns((prev) => {
        if (which === 'A') return { ...prev, A: made.pattern };
        if (which === 'B') return { ...prev, B: made.pattern };
        return { A: made.pattern, B: deriveB(made.pattern, styleRow.params) };
      });
      return made.pattern;
    },
    [styleRow, meter, bars, density, ghosts, bpm, lanesMode, customLanes]
  );

  const newBreak = useCallback(
    (which: SectionLetter | 'both' = 'both') => {
      pushHistory();
      generate(which);
    },
    [generate, pushHistory]
  );

  const buildBFromA = useCallback(() => {
    if (!patterns.A || !styleParams) return;
    pushHistory();
    setPatterns((prev) => (prev.A ? { ...prev, B: deriveB(prev.A, styleParams) } : prev));
  }, [patterns.A, styleParams, pushHistory]);

  /* ---- editing -------------------------------------------------------- */

  const applyDoctor = useCallback(
    (move: DoctorMove) => {
      const pat = patterns[editing];
      /* A doctor's move writes new notes, so it needs the live style rather
         than the snapshot the pattern carries. A pattern whose style is gone
         can be played, scored and exported; it cannot be doctored, and the
         panel's buttons are what say so. */
      if (!pat || !styleParams) return;
      pushHistory();
      setPatterns((prev) => ({ ...prev, [editing]: doctor(pat, styleParams, move) }));
    },
    [patterns, editing, styleParams, pushHistory]
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
      const next = clonePattern(pat);
      // edits are written against the stored break (L5), which is what a layer is a view of
      const states = LANE_STATES[lane] ?? 2;
      const shown = reducePattern(pat, level).bars[bar][lane][step];
      const v = (shown + (back ? states - 1 : 1)) % states;
      next.bars[bar][lane][step] = v;
      if (v) setPin(next, bar, lane, step, level);
      setPatterns((prev) => ({ ...prev, [letter]: next }));
    },
    [patterns, level, pushHistory]
  );

  /**
   * Blank the section being edited — every lane, every bar, and the pins with
   * them. A cleared section that still carried pins would re-derive notes the
   * moment you moved layers, which is not what "clear" means.
   */
  const clearSection = useCallback(() => {
    const pat = patterns[editing];
    if (!pat) return;
    pushHistory();
    const next = clonePattern(pat);
    for (const bar of next.bars) for (const lane of LANES) bar[lane].fill(0);
    next.pins = null;
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
        for (const letter of ['A', 'B'] as SectionLetter[]) {
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
          out[letter] = next;
        }
        return out;
      });
    },
    [catalogue.styles]
  );

  const setLanesMode = useCallback(
    (m: 'style' | 'custom') => {
      setLanesModeRaw(m);
      applyLaneChoice(m, customLanes);
    },
    [setLanesModeRaw, customLanes, applyLaneChoice]
  );

  const setCustomLanes = useCallback(
    (l: CustomLanes) => {
      setCustomLanesRaw(l);
      if (lanesMode === 'custom') applyLaneChoice('custom', l);
    },
    [setCustomLanesRaw, lanesMode, applyLaneChoice]
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
  const loadLibraryEntry = useCallback(
    (id: string, at?: PracticePlace) => {
      const entry = catalogue.libraries.flatMap((l) => l.entries).find((e) => e.id === id);
      if (!entry) return;
      pushHistory();
      const pat = patternFromPacked(entry.doc, (key) => catalogue.styles[key]);
      const params = catalogue.styles[entry.styleKey]?.params;
      const b = params ? deriveB(pat, params) : clonePattern(pat);
      b.name = `${entry.title} (B)`;
      setPatterns({ A: pat, B: b });
      setStyleRaw(entry.styleKey);
      setMeterRaw(pat.meter);
      setBars(pat.bars.length);
      if (at) {
        /* Going back to where you were is an explicit ask, so it wins over
           the tempo lock — and the base is set from it, as a loaded pattern's
           is, so the layer match lands on this tempo rather than moving it. */
        const bpmAt = clamp(Math.round(at.bpm), 50, maxBpm(pat.meter));
        setLevel(at.level);
        setBpmRaw(bpmAt);
        setBaseBpm(baseFor(bpmAt, at.level));
      } else if (!locks.bpm) setBpm(entry.bpm);
      setTries(null);
    },
    [
      catalogue,
      pushHistory,
      setStyleRaw,
      setMeterRaw,
      setBars,
      locks.bpm,
      setBpm,
      setLevel,
      setBpmRaw,
      setBaseBpm,
      baseFor,
    ]
  );

  /* ---- style and meter follow each other ------------------------------ */

  const setStyle = useCallback(
    (s: string) => {
      setStyleRaw(s);
      const st = catalogue.styles[s]?.params;
      /* A style may name its own meter and its own kit — picking one switches
         to both, and **leaving it hands yours back**. A jazz waltz in 4/4 is
         not a jazz waltz, but neither is every style after it a waltz: without
         the second half of this, picking the waltz once strands medium swing
         in 3/4 and the ballad's brushes on everything afterwards. */
      setMeterRaw(st?.meter ?? userMeter);
      /* `named.key` rather than `st.kit`: the same string, read off the row
         that was actually found, so there is nothing to assert non-null. */
      const named = st?.kit ? catalogue.kits[st.kit] : undefined;
      const wantKit = named && kitIsPlayable(named) ? named.key : userKit;
      if (kitIsPlayable(catalogue.kits[wantKit])) setKitRaw(wantKit);
      if (st && !locks.bpm) setBpm(Math.round((st.bpm[0] + st.bpm[1]) / 2));
      setMixTouched((touched) => {
        applyStyleMix(s, touched);
        return touched;
      });
    },
    [
      catalogue,
      setStyleRaw,
      setMeterRaw,
      setKitRaw,
      userMeter,
      userKit,
      locks.bpm,
      setBpm,
      applyStyleMix,
    ]
  );

  const setMeter = useCallback(
    (m: string) => {
      setMeterRaw(m);
      setUserMeter(m);
      setBpmRaw((b) => clamp(b, 50, maxBpm(m)));
    },
    [setMeterRaw, setUserMeter, setBpmRaw]
  );

  /* ---- audio ---------------------------------------------------------- */

  const audioRef = useRef<BreakAudio | null>(null);
  const transportRef = useRef<Transport | null>(null);
  const packsRef = useRef<PackSource | null>(null);
  const userRef = useRef<UserSource | null>(null);
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
    percCount: number;
    userNames: Record<string, string>;
  }>({ kitSlots: 0, percCount: 0, userNames: {} });

  const refreshSamples = useCallback(() => {
    const packs = packsRef.current;
    const user = userRef.current;
    if (!packs || !user) return;
    const row = catalogue.kits[kitRef.current];
    const pack = row?.pack;
    setSamples({
      kitSlots: kitEngine(row) === 'user' ? user.count() : pack ? packs.count(pack) : 0,
      percCount: packs.percCount(),
      userNames: { ...user.names },
    });
  }, [catalogue.kits]);

  const refreshRef = useRef(refreshSamples);
  useEffect(() => {
    refreshRef.current = refreshSamples;
  }, [refreshSamples]);
  useEffect(refreshSamples, [kit, refreshSamples]);

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
      click,
      clickSub,
      countIn,
      ramp,
      ceiling,
      mix,
      mute,
    }),
    [
      view,
      arrangement,
      viewMode,
      bpm,
      swing,
      feel,
      hats,
      click,
      clickSub,
      countIn,
      ramp,
      ceiling,
      mix,
      mute,
    ]
  );

  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
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
      setKitRaw(k);
      setUserKit(k);
    },
    [catalogue.kits, setKitRaw, setUserKit]
  );

  const setParam = useCallback(
    (v: string, key: string, value: number) => {
      setTuning((prev) => ({
        ...prev,
        [kit]: { ...prev[kit], [v]: { ...prev[kit]?.[v], [key]: value } },
      }));
    },
    [kit, setTuning]
  );

  const resetVoice = useCallback(
    (v: string) => {
      setTuning((prev) => {
        const forKit = { ...prev[kit] };
        delete forKit[v];
        return { ...prev, [kit]: forKit };
      });
    },
    [kit, setTuning]
  );

  const resetKit = useCallback(() => {
    setTuning((prev) => {
      const next = { ...prev };
      delete next[kit];
      return next;
    });
  }, [kit, setTuning]);

  const setPercSamples = useCallback(
    (b: boolean) => {
      setPercSamplesRaw(b);
      if (packsRef.current) packsRef.current.usePercSamples = b;
    },
    [setPercSamplesRaw]
  );

  /* The AudioContext is built once, in an effect with no state in its deps.
     These refs are how that effect reads the current kit and preferences
     without being torn down and rebuilt every time one of them changes. */
  const soundRef = useRef(sound);
  const kitRowRef = useRef(kitRow);
  const percussionRef = useRef(percussion);
  const percSamplesRef = useRef(percSamples);
  useEffect(() => {
    soundRef.current = sound;
    kitRowRef.current = kitRow;
    percussionRef.current = percussion;
    percSamplesRef.current = percSamples;
  }, [sound, kitRow, percussion, percSamples]);

  /* The AudioContext and the clock are created together, in an effect rather
     than during render: an AudioContext is a real resource, and constructing one
     on the server or twice under StrictMode is a leak, not a re-render. */
  useEffect(() => {
    const audio = new BreakAudio();
    /* The sampled kits are a source the synth falls through to, not a branch
       inside it — a pack still decoding, or one slot short, plays the
       synthesised voice for that hit rather than nothing. Your own one-shots
       are a second source behind the same rule, so moving between a recorded
       kit and your own needs no reload. */
    const bump = () => refreshRef.current();
    const packs = new PackSource(bump);
    const user = new UserSource(bump);
    packs.usePercSamples = percSamplesRef.current;
    packsRef.current = packs;
    userRef.current = user;
    audio.samples = new SourceStack([packs, user]);
    audioRef.current = audio;
    const midi = new MidiOut();
    midiRef.current = midi;
    const t = new Transport(audio, {
      getSnapshot: () => snapshotRef.current,
      onBpm: (n) => setBpmRaw(n),
      onLoop: (n) => setLoops(n),
      onPaint: (ev) => setPosition(ev),
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
      userRef.current = null;
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
      t.stop();
      return;
    }
    if (t.start()) setPlaying(true);
    else logger.warn('BeatBreaker: no Web Audio in this browser — notation still works');
  }, []);

  // the arrangement or the solo changed while playing — keep going, new sequence
  useEffect(() => {
    transportRef.current?.resync();
  }, [arrangement, viewMode]);

  const audition = useCallback((voice: string, variant?: string) => {
    audioRef.current?.hit(voice, variant);
  }, []);

  /** A bar of the whole kit — the only honest way to compare two of them. */
  const auditionKit = useCallback(() => audioRef.current?.demo() ?? false, []);

  /* ---- first break ----------------------------------------------------- */

  /** Put a whole decoded break on the stage — the arrival paths share this. */
  const applyDoc = (doc: BreakDoc) => {
    setPatterns({ A: doc.A, B: doc.B });
    setBpmRaw(doc.bpm);
    setBaseBpm(baseFor(doc.bpm, doc.level));
    setSwing(doc.swing);
    setLevel(doc.level);
    setArrangement(doc.arrangement);
    setStyleRaw(doc.A.style);
    setMeterRaw(doc.A.meter);
    setBars(doc.A.bars.length);
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
    const st = styleIn(styleRow.params, meter);
    const roster = resolveLanes(st, lanesMode === 'custom' ? customLanes : null);
    const made = generateGood(
      {
        style: styleRow,
        meter,
        bars,
        density,
        ghosts,
        seed: Math.floor(Math.random() * 0xffffffff),
        lanes: roster.lanes,
        perc: roster.perc,
      },
      bpm
    );
    setPatterns({ A: made.pattern, B: deriveB(made.pattern, styleRow.params) });
    setTries({ tries: made.tries, rejected: made.rejected });
    applyStyleMix(style, {});
    setReady(true);
    // deliberately once, on mount: this is the break you arrive to
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* ---- export ---------------------------------------------------------- */

  const asDoc = useCallback((): BreakDoc | null => {
    if (!patterns.A || !patterns.B) return null;
    return { bpm, swing, level, arrangement, A: patterns.A, B: patterns.B };
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
      setPatterns({ A: doc.A, B: doc.B });
      setBpmRaw(doc.bpm);
      setBaseBpm(baseFor(doc.bpm, doc.level));
      setSwing(doc.swing);
      setLevel(doc.level);
      setArrangement(doc.arrangement);
      setStyleRaw(doc.A.style);
      setMeterRaw(doc.A.meter);
      setBars(doc.A.bars.length);
      setTries(null);
    },
    [
      pushHistory,
      setBpmRaw,
      setBaseBpm,
      baseFor,
      setSwing,
      setLevel,
      setArrangement,
      setStyleRaw,
      setMeterRaw,
      setBars,
    ]
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
        const bpmAt = at ? clamp(Math.round(at.bpm), 50, maxBpm(doc.A.meter)) : doc.bpm;
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

  const midiBase64 = useCallback(() => {
    const solo = viewMode === 'both' ? null : viewMode;
    const seq = arrangement
      .filter((L) => !solo || L === solo)
      .flatMap((L) => {
        const pat = view[L];
        return pat ? pat.bars.map((_, i) => ({ pattern: pat, barIdx: i })) : [];
      });
    if (!seq.length) return '';
    return buildMidi(seq, { bpm, swing, feel, hats }).base64;
  }, [arrangement, view, viewMode, bpm, swing, feel, hats]);

  const rename = useCallback((name: string) => {
    /* The name is not the music, so it is not an undo step: undoing a note
       should not also take back the title you typed after it. */
    setPatterns((prev) =>
      prev.A ? { ...prev, A: { ...prev.A, name: name.slice(0, 120) } } : prev
    );
  }, []);

  /* ---- saved breaks ----------------------------------------------------- */

  const saveFav = useCallback(() => {
    const code = shareCode();
    const pat = patterns.A;
    if (!code || !pat) return;
    setFavs((prev) =>
      [{ name: pat.name, bpm, style: pat.style, level, code }, ...prev].slice(0, FAV_CAP)
    );
  }, [shareCode, patterns.A, bpm, level, setFavs]);

  const loadFav = useCallback(
    (index: number): boolean => {
      const fav = favs[index];
      return fav ? loadCode(fav.code) : false;
    },
    [favs, loadCode]
  );

  const deleteFav = useCallback(
    (index: number) => setFavs((prev) => prev.filter((_, i) => i !== index)),
    [setFavs]
  );

  /* ---- your own samples ------------------------------------------------- */

  const addSample = useCallback(async (slot: string, file: File): Promise<string> => {
    const audio = audioRef.current;
    const user = userRef.current;
    if (!audio || !user) return 'No audio engine yet';
    return user.add(audio, slot, file);
  }, []);

  const removeSample = useCallback(async (slot: string) => {
    await userRef.current?.remove(slot);
  }, []);

  return {
    ready,
    noCatalogue,
    patterns,
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
    setEditing,
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
    bpmCeiling,
    playing,
    togglePlay,
    loops,
    position,
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
    percSamples,
    setPercSamples,
    percCount: samples.percCount,
    userNames: samples.userNames,
    addSample,
    removeSample,
    mix,
    setLaneMix,
    resetMix,
    mixTouched,
    mute,
    toggleMute,
    click,
    setClick,
    clickSub,
    setClickSub,
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
    buildBFromA,
    applyDoctor,
    cycleCell,
    loadLibraryEntry,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    favs,
    saveFav,
    loadFav,
    deleteFav,
    clearSection,
    shareCode,
    payload,
    rename,
    shareLink,
    loadCode,
    loadPayload,
    midiBase64,
    midiPort,
    openMidiOut,
    closeMidiOut,
    audition,
    auditionKit,
  };
}

/** How many values each lane cycles through, including empty. */
const LANE_STATES: Record<string, number> = {
  k: 3,
  s: 5,
  h: 4,
  r: 3,
  c: 2,
  t1: 3,
  t2: 3,
  t3: 3,
  hf: 2,
  p1: 3,
  p2: 3,
};
