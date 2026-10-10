import type { BreakAudio } from '@/lib/app/breaks/audio/engine';
import type { MidiSink } from '@/lib/app/breaks/audio/midi-out';
import { Humaniser } from '@/lib/app/breaks/humanise';
import {
  M44,
  groupAt,
  isGroupStart,
  isEighths,
  meterOf,
  pulseInfo,
  stepSeconds,
} from '@/lib/app/breaks/meter';
import { meterOfPat, patSteps } from '@/lib/app/breaks/pattern';
import { type Voice, performStep } from '@/lib/app/breaks/perform';
import type { Bar, Meter, Pattern } from '@/lib/app/breaks/types';

/**
 * The clock.
 *
 * **One step is a sixteenth note in every meter**, so the clock itself never
 * changes — what a meter decides is how many steps a bar holds. Scheduling runs
 * ahead of the audio clock by a fixed lookahead and pushes a paint event onto a
 * queue for each step; the UI drains that queue on its own animation frame, so
 * a dropped frame moves the playhead late without moving the music.
 *
 * Swing, the style's feel and Humanise are applied here, to the *scheduled
 * time only*. The metronome and the playhead deliberately stay on the grid:
 * being able to hear the gap between the click and the kit is the thing you
 * are learning.
 */

export type SectionLetter = 'A' | 'B';

/** Where the transport is, for the UI to draw. */
export interface PlayEvent {
  /** Audio-context time this step sounds at. */
  t: number;
  /** True during the count-in, when there is no bar to draw. */
  count?: boolean;
  letter?: SectionLetter;
  barIdx?: number;
  /** Index in the arrangement, or -1 when soloing a section it never calls. */
  secIdx?: number;
  slot: number;
  bar?: Bar;
  meter?: Meter;
}

/**
 * Everything the transport reads, fetched fresh on every scheduled step so that
 * moving a fader or editing a cell takes effect on the next note rather than
 * the next loop. React state stays the source of truth; the transport never
 * holds a copy.
 */
export interface TransportSnapshot {
  /** Already reduced to the current difficulty layer. */
  patterns: Record<SectionLetter, Pattern | null>;
  arrangement: SectionLetter[];
  /** `'A only'` / `'B only'` — the other section's bars are skipped, not muted. */
  solo: SectionLetter | null;
  bpm: number;
  swing: number;
  /** Off-grid feel, 0–150. */
  feel: number;
  /** Hi-hat dynamics, 0–150. */
  hats: number;
  /**
   * Humanise (Phase 9): how much, 0–100 (0 when it is Off), and the seed of
   * the performance (`humaniseSeed`). The Amount is read on every step; a new
   * seed is taken up at the start of the next pass.
   */
  humanise: { amount: number; seed: number };
  click: boolean;
  /** 4 clicks the pulse (quarters, or dotted quarters in compound time); 8 clicks every eighth. See {@link isClickStep}. */
  clickSub: number;
  /** Count-in bars. */
  countIn: number;
  /** BPM added each time the arrangement comes round. */
  ramp: number;
  ceiling: number;
  mix: Record<string, number>;
  mute: Record<string, boolean>;
  /** Lanes soloed in the mixer (D23). Any solo silences every lane not soloed. */
  laneSolo: Record<string, boolean>;
}

/**
 * The solos that count: those on a lane the pattern plays. A solo left on a
 * lane the next pattern has not got would otherwise silence every lane, with
 * no Solo button left on screen to lift it.
 */
export function soloInPlay(
  laneSolo: Record<string, boolean>,
  lanes: readonly string[]
): Record<string, boolean> {
  const have = new Set(lanes);
  return Object.fromEntries(Object.entries(laneSolo).filter(([k, on]) => on && have.has(k)));
}

/**
 * How loud a lane plays on the speakers: its fader, or nothing when it is
 * muted or another lane is soloed and it is not (D23). Mute wins over solo,
 * so a lane both soloed and muted is silent. The MIDI port does not ask: it
 * hears every lane, as it does with mute.
 */
export function laneGain(
  snap: Pick<TransportSnapshot, 'mix' | 'mute' | 'laneSolo'>,
  lane: string
): number {
  if (snap.mute[lane]) return 0;
  const soloing = Object.values(snap.laneSolo).some(Boolean);
  if (soloing && !snap.laneSolo[lane]) return 0;
  return snap.mix[lane] ?? 1;
}

/**
 * One step as the transport scheduled it, note by note — for anything that
 * draws the kit being played rather than the chart being read (the 3D
 * drummer). The notes are every voice the step plays, at the times the speakers
 * were handed them — before the mixer, as the MIDI port hears them, so a lane
 * muted or soloed out is still there: a drummer plays the whole pattern. A
 * drawing that follows these lands where the sound does: swung, felt and
 * humanised. `bar` and `next` are the grid this
 * step sits in and the bar the arrangement plays after it, which is how a
 * listener sees past the lookahead to plan its next stroke.
 */
export interface ScheduledStep {
  /** Audio-clock time of the step, on the grid. */
  t: number;
  /** Seconds per step (a sixteenth) at the tempo it was scheduled at. */
  dur: number;
  slot: number;
  /**
   * A count-in step: no notes and no bar, just the pulse. Its `next` is the
   * bar the band comes in on.
   */
  count?: boolean;
  /** On a count-in step, the steps of the count still to come, this one included. */
  countLeft?: number;
  meter: Meter;
  bar: Bar | null;
  next: Bar | null;
  notes: { voice: Voice; when: number }[];
  /** The pattern playing is played on a double pedal (its style's `doubleKick`). */
  doubleKick?: boolean;
  /** The pattern playing keeps sixteenth hats in one hand (its style's `oneHandHats`). */
  oneHandHats?: boolean;
}

interface SeqEntry {
  letter: SectionLetter;
  barIdx: number;
  secIdx: number;
}

export interface TransportCallbacks {
  getSnapshot: () => TransportSnapshot;
  /** The tempo trainer moved the tempo. */
  onBpm: (bpm: number) => void;
  /**
   * The arrangement came round for the `loops`-th time. `at` is the audio-clock
   * time the next loop starts — the boundary itself, not when it was
   * scheduled, which runs ahead of it by the lookahead. A practice session
   * (7D) measures its slots from these, never from `setTimeout`.
   */
  onLoop: (loops: number, at: number) => void;
  /**
   * Bar 1 starts, once any count-in is over: the audio-clock time of the
   * first note. Called on every `start()`, so a session's clock knows where
   * each slot begins.
   */
  onDownbeat?: (at: number) => void;
  onPaint: (ev: PlayEvent, loops: number) => void;
  /** Every step, as it is scheduled — a lookahead ahead of the audio clock. */
  onStep?: (step: ScheduledStep) => void;
  onStop: () => void;
}

/** How far ahead of the audio clock steps are scheduled. */
const LOOKAHEAD = 0.13;
/** How often the scheduler wakes. Comfortably inside the lookahead. */
const TICK_MS = 25;

/**
 * The clock counts sixteenths. In a compound meter the pulse you feel is a
 * dotted quarter — six of those sixteenths — so the clock has to run half again
 * as fast to put the music at the same speed. Swing at a quarter of 160 is 240
 * on this slider, which is why the ceiling moves with the meter rather than
 * being one number for everything. A meter written in eighths has half as many
 * steps to the beat again, which is how fast swing (Tony Williams at 360) is
 * counted at its real tempo.
 */
export function maxBpm(meterKey: string): number {
  const m = meterOf(meterKey);
  // eighth-note steps: fast swing, at the tempo it is counted in
  if (isEighths(m)) return 380;
  const pi = pulseInfo(m);
  return pi?.steps === 6 ? 300 : 190;
}

export class Transport {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextTime = 0;
  private step = 0;
  private seqIndex = 0;
  private countLeft = 0;
  private queue: PlayEvent[] = [];
  private seq: SeqEntry[] = [];
  private raf: number | null = null;
  private loops = 0;
  /** This performance's humaniser: made at Play, and again when a pass starts on a new seed. */
  private human = new Humaniser(0);

  playing = false;

  /**
   * An optional MIDI port playing alongside the kit. It is handed the time the
   * transport actually scheduled — swung, and shifted by the style's feel — so
   * the port drags exactly where the speakers drag.
   */
  midi: MidiSink | null = null;

  constructor(
    private readonly audio: BreakAudio,
    private readonly cb: TransportCallbacks
  ) {}

  start(): boolean {
    const ctx = this.audio.init();
    if (!ctx) return false;
    this.audio.resume();

    const snap = this.cb.getSnapshot();
    this.buildSeq(snap);
    this.perform(snap.humanise.seed);
    this.step = 0;
    this.seqIndex = 0;
    this.queue = [];
    this.loops = 0;
    this.countLeft = snap.countIn * patSteps(snap.patterns.A);
    this.nextTime = ctx.currentTime + 0.08;
    this.playing = true;
    if (this.countLeft === 0) this.cb.onDownbeat?.(this.nextTime);

    this.tick();
    this.paint();
    return true;
  }

  stop(): void {
    this.playing = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.raf !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.raf);
    }
    this.raf = null;
    this.queue = [];
    this.cb.onStop();
  }

  /**
   * "A only" means A only — the arrangement's B sections are **skipped** rather
   * than played into a chart that is not on screen.
   */
  private buildSeq(snap: TransportSnapshot): void {
    this.seq = [];
    snap.arrangement.forEach((letter, si) => {
      if (snap.solo && letter !== snap.solo) return;
      const pat = snap.patterns[letter];
      if (!pat) return;
      pat.bars.forEach((_, bi) => this.seq.push({ letter, barIdx: bi, secIdx: si }));
    });

    if (!this.seq.length) {
      // soloing a section the arrangement never calls: play that section on its own
      const letter = snap.solo ?? 'A';
      const pat = snap.patterns[letter];
      if (pat) pat.bars.forEach((_, bi) => this.seq.push({ letter, barIdx: bi, secIdx: -1 }));
    }
    if (!this.seq.length) this.seq.push({ letter: 'A', barIdx: 0, secIdx: 0 });
  }

  /**
   * Start the performance a seed names: the humaniser from its first note,
   * and the sampler's round-robins and wobble from the same seed, so pressing
   * Play again replays both.
   */
  private perform(seed: number): void {
    this.human = new Humaniser(seed);
    this.audio.reseed(seed);
  }

  /** The arrangement changed under a running transport — keep playing, new sequence. */
  resync(): void {
    if (!this.playing) return;
    const snap = this.cb.getSnapshot();
    const wasIndex = this.seqIndex;
    this.buildSeq(snap);
    if (this.seqIndex >= this.seq.length) this.seqIndex = Math.max(0, this.seq.length - 1);
    if (wasIndex !== this.seqIndex) this.step = Math.min(this.step, this.barSteps(snap) - 1);
  }

  /** How long a step of the pattern playing lasts: a sixteenth, or a sextuplet in 4/4-6. */
  private stepDur(snap: TransportSnapshot): number {
    const pos = this.seq[this.seqIndex];
    return stepSeconds(meterOfPat((pos && snap.patterns[pos.letter]) || snap.patterns.A), snap.bpm);
  }

  private barSteps(snap: TransportSnapshot): number {
    const pos = this.seq[this.seqIndex];
    return patSteps(pos ? snap.patterns[pos.letter] : null);
  }

  private tick = (): void => {
    const ctx = this.audio.ctx;
    if (!ctx || !this.playing) return;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      const snap = this.cb.getSnapshot();
      this.schedule(this.nextTime, snap);
      this.advance(snap);
    }
    this.timer = setTimeout(this.tick, TICK_MS);
  };

  private schedule(t: number, snap: TransportSnapshot): void {
    const dur = this.stepDur(snap);
    const pos = this.seq[this.seqIndex];
    const livePat = pos ? snap.patterns[pos.letter] : null;
    const cm = meterOfPat(livePat ?? snap.patterns.A);

    if (this.countLeft > 0) {
      const cn = patSteps(snap.patterns.A);
      const i = (snap.countIn * cn - this.countLeft) % cn;
      if (isGroupStart(cm, i)) this.audio.click(t, i === 0);
      this.queue.push({ t, count: true, slot: i, meter: cm });
      this.cb.onStep?.({
        t,
        dur,
        slot: i,
        count: true,
        countLeft: this.countLeft,
        meter: cm,
        bar: null,
        // what the band comes in on, so the drummer can be ready for it
        next: (livePat && pos && livePat.bars[pos.barIdx]) ?? null,
        notes: [],
        doubleKick: !!livePat?.attrs?.doubleKick,
        oneHandHats: !!livePat?.attrs?.oneHandHats,
      });
      return;
    }

    if (!pos || !livePat) return;
    const bar = livePat.bars[pos.barIdx];
    if (!bar) return;

    const i = this.step;
    const m = meterOfPat(livePat);
    const floor = (this.audio.ctx as AudioContext).currentTime + 0.002;

    /* Every note is voiced by `performStep` — velocity, swing, feel and
       humanise — and
       the speakers and the MIDI port play the same voice. So does the file
       export. Nothing about how a note sounds is decided in this method; add a
       subtlety to `perform.ts` and all three hear it. The click and the
       playhead stay on the grid — being able to hear the gap is the point. */
    const out = this.midi;
    const voices = performStep(livePat, bar, i, {
      swing: snap.swing,
      feel: snap.feel,
      hats: snap.hats,
      humanise: { stream: this.human, amount: snap.humanise.amount, bpm: snap.bpm },
      bpm: snap.bpm,
    });
    const whens = voices.map((v) => Math.max(floor, t + dur * v.offset));
    /* When each note's key is struck again: a flam's grace and its stroke, a
       buzz's repeats, are the same note a few milliseconds apart, and the port
       must release one before the next. An ornament is held no further than
       the end of the step, where the next step's note on that drum may be; an
       echo, which sounds steps later, a step past its own start. */
    const until = voices.map((v, n) => {
      let next = v.ornament === 'echo' ? whens[n] + dur : v.ornament ? t + dur : Infinity;
      voices.forEach((w, m) => {
        if (w.note === v.note && whens[m] > whens[n]) next = Math.min(next, whens[m]);
      });
      return Number.isFinite(next) ? next : undefined;
    });
    voices.forEach((v, n) => {
      const when = whens[n];
      /* The fader is the lane channel's level, not part of the velocity
         (D39): the voice plays what the pattern wrote, and the channel makes
         it quieter. A silent lane skips the voice rather than playing it at 0. */
      const level = laneGain(snap, v.lane);
      if (level) this.audio.playIn(v.lane, level, when, () => this.voice(v, when, v.velocity));
      /* The port hears the same note at the same velocity as the kit, before
         the mixer: a muted lane (or one a solo silences) is a lane you are playing
         yourself, and the
         whole point of sending it out is that the module plays it instead. */
      out?.hit(v.note, v.velocity, when, until[n]);
    });

    if (snap.click && isClickStep(m, i, snap.clickSub)) this.audio.click(t, i === 0);

    if (this.cb.onStep) {
      const after = this.seq[(this.seqIndex + 1) % this.seq.length];
      this.cb.onStep({
        t,
        dur,
        slot: i,
        meter: m,
        bar,
        next: (after && snap.patterns[after.letter]?.bars[after.barIdx]) ?? null,
        /* Every voice, before the mixer, as the MIDI port hears it: the
           drummer plays the whole pattern whatever is muted or soloed, since
           it plans its limbs from `bar` and `next`, which the mixer never
           touches — a lane left out is an arm wound up for a hit that never comes. */
        notes: voices.map((voice, n) => ({ voice, when: whens[n] })),
        doubleKick: !!livePat.attrs?.doubleKick,
        oneHandHats: !!livePat.attrs?.oneHandHats,
      });
    }

    this.queue.push({
      t,
      letter: pos.letter,
      barIdx: pos.barIdx,
      secIdx: pos.secIdx,
      slot: i,
      bar,
    });
  }

  /** One performed note on the speakers, by the engine voice its lane plays, at its own velocity. */
  private voice(v: Voice, when: number, vel: number): void {
    const a = this.audio;
    switch (v.lane) {
      case 'k':
        return a.kick(when, vel);
      case 'hf':
        return a.hat(when, vel, false, true);
      case 's':
        return a.snare(when, vel, v.ghost, v.cross, v.rim);
      case 'h':
        return a.hat(when, vel, v.open, false, v.half, v.ornament === 'echo');
      case 'r':
        return a.ride(when, vel, v.bell);
      case 'c':
        return a.crash(when, vel, v.cymbal);
      case 't1':
      case 't2':
      case 't3':
        return a.tom(when, vel, v.lane);
      case 'p1':
      case 'p2':
        return a.perc(when, vel, v.perc?.inst ?? '', v.perc?.accent, v.lane);
    }
  }

  private advance(snap: TransportSnapshot): void {
    this.nextTime += this.stepDur(snap);
    if (this.countLeft > 0) {
      this.countLeft--;
      if (this.countLeft === 0) this.cb.onDownbeat?.(this.nextTime);
      return;
    }
    this.step++;
    if (this.step < this.barSteps(snap)) return;

    this.step = 0;
    this.seqIndex++;
    if (this.seqIndex < this.seq.length) return;

    this.seqIndex = 0;
    this.loops++;
    // a new take, or an edit to the notes, is heard from the top of a pass, never mid-pass
    if (snap.humanise.seed !== this.human.seed) this.perform(snap.humanise.seed);
    this.cb.onLoop(this.loops, this.nextTime);
    if (snap.ramp) {
      const next = Math.min(snap.ceiling, snap.bpm + snap.ramp);
      if (next !== snap.bpm) this.cb.onBpm(next);
    }
  }

  /**
   * Drains the paint queue up to the audio clock.
   *
   * Only the *latest* due event is drawn: if a frame was dropped, the playhead
   * jumps to where the music actually is rather than replaying the steps it
   * missed behind it.
   */
  private paint = (): void => {
    if (!this.playing) return;
    const ctx = this.audio.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    let ev: PlayEvent | null = null;
    while (this.queue.length && this.queue[0].t <= now + 0.005) {
      ev = this.queue.shift() ?? null;
    }
    if (ev) this.cb.onPaint(ev, this.loops);

    if (typeof requestAnimationFrame === 'function') {
      this.raf = requestAnimationFrame(this.paint);
    }
  };
}

/**
 * Does the metronome click on this step?
 *
 * "Quarters" clicks the pulse you count, which is what `groupsOf` already
 * computes: every quarter in 3/4 or 5/4, the dotted quarter in 6/8 and 12/8, and
 * the uneven 2+2+3 in 7/8. "Eighths" clicks every eighth, which is every other
 * step because a step is a sixteenth in every meter. Dividing the bar into
 * `clickSub` equal parts only worked in 4/4: it put 3/4's clicks three
 * sixteenths apart and 6/8's on sixteenths no eighth sits on (H3).
 */
export function isClickStep(m: Meter, step: number, clickSub: number): boolean {
  return clickSub >= 8 ? step % 2 === 0 : isGroupStart(m, step);
}

/** Which beat of the bar a step falls on, 1-based — for the position readout. */
export function beatOf(pat: Pattern | null, slot: number): number {
  return groupAt(pat ? meterOfPat(pat) : M44, slot) + 1;
}
