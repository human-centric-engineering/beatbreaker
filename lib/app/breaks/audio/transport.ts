import type { BreakAudio } from '@/lib/app/breaks/audio/engine';
import type { MidiSink } from '@/lib/app/breaks/audio/midi-out';
import { feelOf, feelOffset, hatShape, isSwung } from '@/lib/app/breaks/feel';
import { DEFAULT_PERC, FOOT_LANE, PERC_LANES, TOM_LANES, percInst } from '@/lib/app/breaks/lanes';
import { M44, groupAt, isGroupStart, meterOf, pulseInfo } from '@/lib/app/breaks/meter';
import { MIDI_MAP } from '@/lib/app/breaks/midi';
import { meterOfPat, patSteps } from '@/lib/app/breaks/pattern';
import { STYLES } from '@/lib/app/breaks/styles';
import type { Bar, LaneKey, Meter, Pattern } from '@/lib/app/breaks/types';

/**
 * The clock.
 *
 * **One step is a sixteenth note in every meter**, so the clock itself never
 * changes — what a meter decides is how many steps a bar holds. Scheduling runs
 * ahead of the audio clock by a fixed lookahead and pushes a paint event onto a
 * queue for each step; the UI drains that queue on its own animation frame, so
 * a dropped frame moves the playhead late without moving the music.
 *
 * Swing and the style's feel are applied here, to the *scheduled time only*.
 * The metronome and the playhead deliberately stay on the grid: being able to
 * hear the gap between the click and the kit is the thing you are learning.
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
  onLoop: (loops: number) => void;
  onPaint: (ev: PlayEvent, loops: number) => void;
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
 * being one number for everything.
 */
export function maxBpm(meterKey: string): number {
  const pi = pulseInfo(meterOf(meterKey));
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
    this.step = 0;
    this.seqIndex = 0;
    this.queue = [];
    this.loops = 0;
    this.countLeft = snap.countIn * patSteps(snap.patterns.A);
    this.nextTime = ctx.currentTime + 0.08;
    this.playing = true;

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

  /** The arrangement changed under a running transport — keep playing, new sequence. */
  resync(): void {
    if (!this.playing) return;
    const snap = this.cb.getSnapshot();
    const wasIndex = this.seqIndex;
    this.buildSeq(snap);
    if (this.seqIndex >= this.seq.length) this.seqIndex = Math.max(0, this.seq.length - 1);
    if (wasIndex !== this.seqIndex) this.step = Math.min(this.step, this.barSteps(snap) - 1);
  }

  private stepDur(bpm: number): number {
    return 60 / bpm / 4;
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
    const dur = this.stepDur(snap.bpm);
    const pos = this.seq[this.seqIndex];
    const livePat = pos ? snap.patterns[pos.letter] : null;
    const cm = meterOfPat(livePat ?? snap.patterns.A);
    const style = STYLES[(livePat ?? snap.patterns.A)?.style ?? ''];

    /* Swing pushes the off-beats late — which off-beats depends on the style. A
       shuffle swings the 8ths (the "and"), everything else swings the 16ths. */
    const swung = isSwung(this.step, cm, style) ? t + dur * (snap.swing / 100) * 0.66 : t;

    if (this.countLeft > 0) {
      const cn = patSteps(snap.patterns.A);
      const i = (snap.countIn * cn - this.countLeft) % cn;
      if (isGroupStart(cm, i)) this.audio.click(t, i === 0);
      this.queue.push({ t, count: true, slot: i, meter: cm });
      return;
    }

    if (!pos || !livePat) return;
    const bar = livePat.bars[pos.barIdx];
    if (!bar) return;

    const i = this.step;
    const g = (k: string): number => (snap.mute[k] ? 0 : (snap.mix[k] ?? 1));

    /* The style's own feel, on top of swing. The click and the playhead stay on
       the grid — being able to hear the gap is the whole point. */
    const feel = feelOf(style);
    const m = meterOfPat(livePat);
    const amt = snap.feel / 100;
    const floor = (this.audio.ctx as AudioContext).currentTime + 0.002;
    const at = (lane: LaneKey, ghost?: boolean): number => {
      if (!feel || !amt) return swung;
      return Math.max(floor, swung + dur * amt * feelOffset(feel, lane, i, ghost));
    };

    /* Feathering: a jazz kick plays all four quarters, but you are meant to feel
       them rather than hear them. Written as ordinary quarter notes, played at a
       third — so the critic reads timekeeping, not syncopation. */
    /* The port hears the same note at the same velocity as the kit, before the
       mixer: a muted lane is a lane you are playing yourself, and the whole
       point of sending it out is that the module plays it instead. */
    const out = this.midi;
    const send = (note: number, vel: number, when: number): void => out?.hit(note, vel, when);

    if (bar.k[i]) {
      const feather =
        style?.kickFeather && bar.k[i] === 1 && isGroupStart(m, i) ? style.kickFeather : 1;
      const v = (bar.k[i] === 2 ? 1 : 0.9) * feather;
      if (g('k')) this.audio.kick(at('k'), v * g('k'));
      send(MIDI_MAP.k, v, at('k'));
    }

    /* A foot chick is a quiet sound. At 0.62 the sample picker reached for the
       hardest stomp in the kit and turned it down, which is a duller, thuddier
       hit than the pedal actually makes at that volume. */
    if (bar[FOOT_LANE][i]) {
      if (g(FOOT_LANE)) this.audio.hat(at('h'), 0.4 * g(FOOT_LANE), false, true);
      send(MIDI_MAP.hf, 0.55, at('h'));
    }

    if (bar.s[i]) {
      const sv = bar.s[i];
      const v = sv === 1 ? 0.5 : sv === 3 ? 1 : sv === 4 ? 0.82 : 0.78;
      if (g('s')) this.audio.snare(at('s', sv === 1), v * g('s'), sv === 1, sv === 4);
      send(sv === 4 ? MIDI_MAP.sCross : MIDI_MAP.s, v, at('s', sv === 1));
    }
    if (bar.h[i]) {
      const v = 0.86 * hatShape(i, bar.h[i], 'h', m, style, snap.hats);
      if (g('h')) this.audio.hat(at('h'), v * g('h'), bar.h[i] === 3);
      send(bar.h[i] === 3 ? MIDI_MAP.hOpen : MIDI_MAP.h, v, at('h'));
    }
    if (bar.r[i]) {
      const v = (bar.r[i] === 2 ? 0.95 : 0.84) * hatShape(i, bar.r[i], 'r', m, style, snap.hats);
      if (g('r')) this.audio.ride(at('r'), v * g('r'), bar.r[i] === 2);
      send(bar.r[i] === 2 ? MIDI_MAP.rBell : MIDI_MAP.r, v, at('r'));
    }
    if (bar.c[i]) {
      if (g('c')) this.audio.crash(at('c'), 0.9 * g('c'));
      send(MIDI_MAP.c, 0.9, at('c'));
    }

    for (const L of TOM_LANES) {
      if (!bar[L][i]) continue;
      const v = bar[L][i] === 2 ? 1 : 0.86;
      if (g(L)) this.audio.tom(at('s'), v * g(L), L);
      send(MIDI_MAP[L], v, at('s'));
    }
    PERC_LANES.forEach((L, li) => {
      if (!bar[L][i]) return;
      const inst = livePat.perc?.[L] ?? DEFAULT_PERC[li];
      const accent = bar[L][i] === 2;
      const v = accent ? 0.95 : 0.7;
      if (g(L)) this.audio.perc(at('s'), v * g(L), inst, accent, L);
      const pi = percInst(inst);
      send(accent ? pi.hi : pi.midi, v, at('s'));
    });

    if (snap.click && isClickStep(m, i, snap.clickSub)) this.audio.click(t, i === 0);

    this.queue.push({
      t,
      letter: pos.letter,
      barIdx: pos.barIdx,
      secIdx: pos.secIdx,
      slot: i,
      bar,
    });
  }

  private advance(snap: TransportSnapshot): void {
    this.nextTime += this.stepDur(snap.bpm);
    if (this.countLeft > 0) {
      this.countLeft--;
      return;
    }
    this.step++;
    if (this.step < this.barSteps(snap)) return;

    this.step = 0;
    this.seqIndex++;
    if (this.seqIndex < this.seq.length) return;

    this.seqIndex = 0;
    this.loops++;
    this.cb.onLoop(this.loops);
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
