'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BreakAudio } from '@/lib/app/breaks/audio/engine';
import { PackSource } from '@/lib/app/breaks/audio/packs';
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
import { DEFAULT_MIX } from '@/lib/app/breaks/lanes';
import { LIBRARY, patternFromLibrary } from '@/lib/app/breaks/library';
import { reducePattern } from '@/lib/app/breaks/layers';
import { DEFAULT_METER } from '@/lib/app/breaks/meter';
import { buildMidi } from '@/lib/app/breaks/midi';
import { type CustomLanes, clonePattern, resolveLanes, setPin } from '@/lib/app/breaks/pattern';
import { clamp } from '@/lib/app/breaks/rng';
import { type BreakDoc, decodeBreak, encodeBreak } from '@/lib/app/breaks/share';
import { STYLES, styleIn } from '@/lib/app/breaks/styles';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';
import { KITS, kitDefaults } from '@/lib/app/breaks/kit';
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
  patterns: Record<SectionLetter, Pattern | null>;
  /** The sections as they sound and look at the current layer. */
  view: Record<SectionLetter, Pattern | null>;
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

  arrangement: SectionLetter[];
  setArrangement: (a: SectionLetter[]) => void;
  locks: Record<string, boolean>;
  toggleLock: (k: string) => void;

  guides: boolean;
  setGuides: (b: boolean) => void;
  sticking: boolean;
  setSticking: (b: boolean) => void;

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
  loadLibraryItem: (index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  shareCode: () => string;
  loadCode: (code: string) => boolean;
  midiBase64: () => string;
  audition: (voice: string, variant?: string) => void;
}

export function useBreakConsole(): BreakConsole {
  const [ready, setReady] = useState(false);
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
  const [bars, setBars] = useLocalStorage('bb.bars', 2);
  const [density, setDensity] = useLocalStorage('bb.density', 55);
  const [ghosts, setGhosts] = useLocalStorage('bb.ghosts', 60);
  const [swing, setSwing] = useLocalStorage('bb.swing', 8);
  const [hats, setHats] = useLocalStorage('bb.hats', 100);
  const [feel, setFeel] = useLocalStorage('bb.feel', 100);
  const [lanesMode, setLanesMode] = useLocalStorage<'style' | 'custom'>('bb.lanesMode', 'style');
  const [customLanes, setCustomLanes] = useLocalStorage<CustomLanes>('bb.customLanes', {
    toms: false,
  });

  const [bpm, setBpmRaw] = useLocalStorage('bb.bpm', 94);
  const [kit, setKitRaw] = useLocalStorage('bb.kit', 'studio70');
  const [guides, setGuides] = useLocalStorage('bb.guides', true);
  const [sticking, setSticking] = useLocalStorage('bb.sticking', false);
  const [arrangement, setArrangement] = useLocalStorage<SectionLetter[]>('bb.arr', [
    'A',
    'A',
    'A',
    'B',
  ]);
  const [countIn, setCountIn] = useLocalStorage('bb.count', 1);
  const [ceiling, setCeiling] = useLocalStorage('bb.ceiling', 130);

  const [click, setClick] = useState(false);
  const [clickSub, setClickSub] = useState(4);
  const [ramp, setRamp] = useState(0);
  const [playing, setPlaying] = useState(false);
  /** Bumped when a pack finishes decoding, so the kit panel can say so. */
  const [, setSamplesVersion] = useState(0);
  const [loops, setLoops] = useState(0);
  const [position, setPosition] = useState<PlayEvent | null>(null);

  const [mix, setMix] = useState<Record<string, number>>({ ...DEFAULT_MIX });
  const [mixTouched, setMixTouched] = useState<Record<string, boolean>>({});
  const [mute, setMute] = useState<Record<string, boolean>>({});
  const [locks, setLocks] = useState<Record<string, boolean>>({});

  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const bpmCeiling = maxBpm(meter);

  const setBpm = useCallback(
    (n: number) => setBpmRaw(clamp(Math.round(n), 50, maxBpm(meter))),
    [meter, setBpmRaw]
  );

  /* ---- derived: the sections as they sound and look ------------------- */

  const view = useMemo(
    () => ({
      A: patterns.A ? reducePattern(patterns.A, level) : null,
      B: patterns.B ? reducePattern(patterns.B, level) : null,
    }),
    [patterns, level]
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
  const applyStyleMix = useCallback((styleKey: string, touched: Record<string, boolean>) => {
    const m = STYLES[styleKey]?.mix ?? {};
    setMix((prev) => {
      const next = { ...prev };
      for (const lane of Object.keys(DEFAULT_MIX) as LaneKey[]) {
        if (touched[lane]) continue;
        next[lane] = m[lane] ?? DEFAULT_MIX[lane];
      }
      return next;
    });
  }, []);

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
      const st = styleIn(style, meter);
      const roster = resolveLanes(st, lanesMode === 'custom' ? customLanes : null);
      const made = generateGood(
        {
          style,
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
        return { A: made.pattern, B: deriveB(made.pattern) };
      });
      return made.pattern;
    },
    [style, meter, bars, density, ghosts, bpm, lanesMode, customLanes]
  );

  const newBreak = useCallback(
    (which: SectionLetter | 'both' = 'both') => {
      pushHistory();
      generate(which);
    },
    [generate, pushHistory]
  );

  const buildBFromA = useCallback(() => {
    if (!patterns.A) return;
    pushHistory();
    setPatterns((prev) => (prev.A ? { ...prev, B: deriveB(prev.A) } : prev));
  }, [patterns.A, pushHistory]);

  /* ---- editing -------------------------------------------------------- */

  const applyDoctor = useCallback(
    (move: DoctorMove) => {
      const pat = patterns[editing];
      if (!pat) return;
      pushHistory();
      setPatterns((prev) => ({ ...prev, [editing]: doctor(pat, move) }));
    },
    [patterns, editing, pushHistory]
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

  const loadLibraryItem = useCallback(
    (index: number) => {
      const item = LIBRARY[index];
      if (!item) return;
      pushHistory();
      const pat = patternFromLibrary(item, index);
      const b = deriveB(pat);
      b.name = `${item.title} (B)`;
      setPatterns({ A: pat, B: b });
      setStyleRaw(item.style);
      setMeterRaw(pat.meter);
      setBars(pat.bars.length);
      if (!locks.bpm) setBpm(item.bpm);
      setTries(null);
    },
    [pushHistory, setStyleRaw, setMeterRaw, setBars, locks.bpm, setBpm]
  );

  /* ---- style and meter follow each other ------------------------------ */

  const setStyle = useCallback(
    (s: string) => {
      setStyleRaw(s);
      const st = STYLES[s];
      /* A style may name its own meter and its own kit — picking one switches
         to both. The meter and kit you chose yourself are remembered
         separately, so the waltz does not strand medium swing in 3/4. */
      if (st?.meter) setMeterRaw(st.meter);
      if (st?.kit) setKitRaw(st.kit);
      if (st && !locks.bpm) setBpm(Math.round((st.bpm[0] + st.bpm[1]) / 2));
      setMixTouched((touched) => {
        applyStyleMix(s, touched);
        return touched;
      });
    },
    [setStyleRaw, setMeterRaw, setKitRaw, locks.bpm, setBpm, applyStyleMix]
  );

  const setMeter = useCallback(
    (m: string) => {
      setMeterRaw(m);
      setBpmRaw((b) => clamp(b, 50, maxBpm(m)));
    },
    [setMeterRaw, setBpmRaw]
  );

  /* ---- audio ---------------------------------------------------------- */

  const audioRef = useRef<BreakAudio | null>(null);
  const transportRef = useRef<Transport | null>(null);
  const kitRef = useRef(kit);
  useEffect(() => {
    kitRef.current = kit;
  }, [kit]);

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

  useEffect(() => {
    audioRef.current?.setKit(kit, kitDefaults(kit));
  }, [kit]);

  const setKit = useCallback(
    (k: string) => {
      if (!KITS[k]) return;
      setKitRaw(k);
    },
    [setKitRaw]
  );

  /* The AudioContext and the clock are created together, in an effect rather
     than during render: an AudioContext is a real resource, and constructing one
     on the server or twice under StrictMode is a leak, not a re-render. */
  useEffect(() => {
    const audio = new BreakAudio();
    /* The sampled kits are a source the synth falls through to, not a branch
       inside it — a pack still decoding, or one slot short, plays the
       synthesised voice for that hit rather than nothing. */
    audio.samples = new PackSource(() => setSamplesVersion((n) => n + 1));
    audioRef.current = audio;
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
    transportRef.current = t;
    audio.setKit(kitRef.current, kitDefaults(kitRef.current));
    return () => {
      t.stop();
      transportRef.current = null;
      audioRef.current = null;
    };
  }, [setBpmRaw]);

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

  /* ---- first break ----------------------------------------------------- */

  useEffect(() => {
    if (ready) return;
    const st = styleIn(style, meter);
    const roster = resolveLanes(st, lanesMode === 'custom' ? customLanes : null);
    const made = generateGood(
      {
        style,
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
    setPatterns({ A: made.pattern, B: deriveB(made.pattern) });
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

  const loadCode = useCallback(
    (code: string): boolean => {
      try {
        const doc = decodeBreak(code);
        pushHistory();
        setPatterns({ A: doc.A, B: doc.B });
        setBpmRaw(doc.bpm);
        setSwing(doc.swing);
        setLevel(doc.level);
        setArrangement(doc.arrangement);
        setStyleRaw(doc.A.style);
        setMeterRaw(doc.A.meter);
        setBars(doc.A.bars.length);
        setTries(null);
        return true;
      } catch (error) {
        logger.warn('BeatBreaker: could not read that break code', { error });
        return false;
      }
    },
    [pushHistory, setBpmRaw, setSwing, setLevel, setArrangement, setStyleRaw, setMeterRaw, setBars]
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

  return {
    ready,
    patterns,
    view,
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
    arrangement,
    setArrangement,
    locks,
    toggleLock,
    guides,
    setGuides,
    sticking,
    setSticking,
    newBreak,
    buildBFromA,
    applyDoctor,
    cycleCell,
    loadLibraryItem,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    shareCode,
    loadCode,
    midiBase64,
    audition,
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
