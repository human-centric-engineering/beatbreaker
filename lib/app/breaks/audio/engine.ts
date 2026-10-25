import { drawMachineSlot, machineGain, machineSlot } from '@/lib/app/breaks/audio/machines';
import * as voices from '@/lib/app/breaks/audio/voices';
import {
  type KitSampleSlot,
  SAMPLE_STAND_IN,
  SLOT_BY_ID,
  SYNTH_FALLBACK,
  SYNTH_ONLY,
  type ResolvedKit,
  type VoiceParams,
  kitEngine,
} from '@/lib/app/breaks/kit';
import { type PanView, panFor } from '@/lib/app/breaks/lanes';
import { HALF_OPEN_SCALE } from '@/lib/app/breaks/perform';
import { type Rng, makeRng } from '@/lib/app/breaks/rng';

/**
 * The one chain every kit plays through, and the synthesised voices played
 * live. The voices themselves are drawn in `voices.ts`, which a render of a
 * synthesised kit draws through too (`synth-source.ts`, 9-vi-d).
 *
 * The sampled engines — drum machines, recorded kits, your own one-shots — hand
 * this class an `AudioBuffer` through {@link SampleSource} and everything after
 * that is identical: mix, mute, room send, drive, glue compressor. That shared
 * tail is what makes the kits comparable rather than four separate apps, and it
 * is why a missing sample can fall through to the synthesised voice instead of
 * producing silence.
 *
 * Client-only: it touches `window` and `AudioContext`. Nothing in
 * `lib/app/breaks/*.ts` imports it, so the domain stays server-renderable.
 */

/** A played buffer, so an open hat can be choked later. */
export interface PlayedBuffer {
  g: GainNode;
  end: number;
}

/**
 * A sampled kit engine. Returns `false` when it has nothing for the slot, and
 * the synthesised voice plays instead — a half-loaded sample kit is still
 * playable, which is the whole reason this returns a boolean rather than
 * throwing or playing silence.
 */
export interface SampleSource {
  hit(engine: BreakAudio, t: number, slotId: string, vel: number): boolean;
  /**
   * Recorded percussion, which is deliberately not tied to a kit — a
   * tambourine over a synthesised set should still be a tambourine.
   */
  percHit?(engine: BreakAudio, t: number, inst: string, vel: number, accent: boolean): boolean;
  /** Called when the kit or its knobs change. */
  refresh?(engine: BreakAudio): void;
  /** Called when the engine closes: stop anything still on its way. */
  dispose?(): void;
}

/**
 * Several sample sources behind one, tried in order.
 *
 * The recorded packs and your own one-shots are different engines that answer
 * for different kits, and both have to be reachable at once — the kit picker
 * can move between them without a reload. Each source already returns `false`
 * for a slot it does not cover, so "ask the next one" is the same rule the
 * synthesised fallback uses, one level up.
 */
export class SourceStack implements SampleSource {
  constructor(private readonly sources: SampleSource[]) {}

  hit(engine: BreakAudio, t: number, slotId: string, vel: number): boolean {
    for (const s of this.sources) if (s.hit(engine, t, slotId, vel)) return true;
    return false;
  }

  percHit(engine: BreakAudio, t: number, inst: string, vel: number, accent: boolean): boolean {
    for (const s of this.sources) if (s.percHit?.(engine, t, inst, vel, accent)) return true;
    return false;
  }

  refresh(engine: BreakAudio): void {
    for (const s of this.sources) s.refresh?.(engine);
  }

  dispose(): void {
    for (const s of this.sources) s.dispose?.();
  }
}

/**
 * Soft clipping for the drive control.
 *
 * Odd length, so index `(n-1)/2` is exactly `x = 0`. An even-length curve maps
 * silence to a small non-zero value and puts a DC offset on the whole mix.
 */
export function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1025;
  // Explicitly ArrayBuffer-backed: `curve` will not accept a SharedArrayBuffer view.
  const c = new Float32Array(new ArrayBuffer(n * Float32Array.BYTES_PER_ELEMENT));
  const a = Math.max(1, amount);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * a) / Math.tanh(a);
  }
  return c;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

/**
 * What a slot's `damp` does to a recording (a strip of leather on the head):
 * how long the stroke sounds as struck (`hold`, seconds), how fast the ring
 * dies after it (`tau`, the time constant), and where its top is rolled off
 * (`lp`, Hz, from 16 kHz open down to 2 kHz at full damp). Null for an open head.
 */
export function dampOf(damp: number | undefined): { hold: number; tau: number; lp: number } | null {
  if (!damp || damp <= 0) return null;
  const d = clamp(damp, 0, 1);
  return {
    hold: 0.035 - 0.015 * d,
    tau: 0.15 * (1 - d) + 0.012,
    lp: 16000 * (2000 / 16000) ** d,
  };
}

/** −0.3 dBFS: the loudest sample the master lets through. */
export const CEILING = 0.966;
/** Where the ceiling starts to bend. Below it the signal passes untouched. */
const KNEE = 0.7;
/**
 * How far over full scale the ceiling still bends rather than clamps. A
 * `WaveShaperNode` reads its curve over −1…1 and holds the end value past it,
 * so the signal goes in at 1/{@link OVER} and the curve is drawn over
 * ±{@link OVER}: up to 6 dB over full scale is rounded off, not cut.
 */
export const OVER = 2;

/**
 * The master ceiling's curve: straight up to {@link KNEE}, then a tanh bend
 * that reaches {@link CEILING} and never passes it. The glue compressor ahead
 * of it has a fixed lookahead and automatic makeup gain, so a dense bar can
 * still put a transient over full scale; this is what stops that clipping.
 *
 * Index `i` is the input `x·OVER`, for the input scaled down by {@link OVER}.
 * Odd length, like {@link driveCurve}, so silence stays silence.
 */
export function ceilingCurve(): Float32Array<ArrayBuffer> {
  const n = 2049;
  const c = new Float32Array(new ArrayBuffer(n * Float32Array.BYTES_PER_ELEMENT));
  const room = CEILING - KNEE;
  for (let i = 0; i < n; i++) {
    const x = ((i / (n - 1)) * 2 - 1) * OVER;
    const a = Math.abs(x);
    const y = a <= KNEE ? a : KNEE + room * Math.tanh((a - KNEE) / room);
    c[i] = Math.sign(x) * y;
  }
  return c;
}

/**
 * One lane's channel: its fader and pan on the way to the bus, and the same
 * fader on its way to the room, so a lane pulled down is quieter in the
 * reverb too rather than leaving its echo at full.
 */
interface Channel {
  fader: GainNode;
  pan: StereoPannerNode | null;
  room: GainNode;
  level: number;
}

export class BreakAudio {
  ctx: AudioContext | null = null;
  bus: GainNode | null = null;
  private master: GainNode | null = null;
  private shaper: WaveShaperNode | null = null;
  private lp: BiquadFilterNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private convolver: ConvolverNode | null = null;
  private wet: GainNode | null = null;
  private ceilingIn: GainNode | null = null;
  private ceiling: WaveShaperNode | null = null;
  private noise: AudioBuffer | null = null;
  /** Where the voices draw live: built once per context, not once per hit. */
  private draw: voices.Draw | null = null;
  /** Every open hat still ringing, so a closing one chokes them all. */
  private hatTails: PlayedBuffer[] = [];
  private channels = new Map<string, Channel>();
  /** The lane the voice being played belongs to, while it is played. */
  private route: string | null = null;
  private panView: PanView = 'drummer';
  private irRoom = -1;
  private driveAt = -1;
  /** Recordings heard on their own, by URL, each fetched and decoded once ({@link preview}). */
  private previews = new Map<string, Promise<AudioBuffer | null>>();

  ready = false;
  /**
   * The kit currently loaded, as the catalogue resolved it.
   *
   * An object rather than a key, because a key would mean this module owning a
   * kit table (D13). Null until the Studio has a catalogue to pick from, which
   * is a real state now that the kits are rows fetched from the server: the
   * synthesised voices cover for it with {@link SYNTH_FALLBACK}.
   */
  kit: ResolvedKit | null = null;
  /**
   * The shared percussion recordings, and which pack's folder they sit in.
   *
   * Not part of {@link kit} because percussion is deliberately not per kit — a
   * tambourine over the Studio '70s set should be a tambourine. The Studio sets
   * it once from the catalogue, naming whichever kit row carries a `perc` map,
   * which is where the hard-coded `'virtuosity'` used to live.
   */
  percussion: { pack: string; slots: Record<string, KitSampleSlot> } | null = null;

  /** The user's tuning — a saved override of the kit's own numbers. */
  sound: Record<string, VoiceParams> | null = null;
  samples: SampleSource | null = null;

  /**
   * The stream the sample sources draw from: which round-robin plays, and the
   * small pitch and level difference on every hit. Seeded, not `Math.random`,
   * so the same performance can be played twice (Phase 9). {@link reseed}
   * starts it again.
   */
  rand: Rng = makeRng(0x5eed);

  reseed(seed: number): void {
    this.rand = makeRng(seed);
  }

  init(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext;
    if (!AC) return null;

    let ctx: AudioContext;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    this.ctx = ctx;

    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.draw = {
      ctx,
      noise: buf,
      send: (node, voice, extra) => this.send(node, voice, extra),
      rand: () => Math.random(),
    };

    // master chain: everything -> drive -> tone -> glue compressor -> out
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.9;
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = 16000;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -13;
    this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.2;
    this.master = ctx.createGain();
    this.master.gain.value = 0.82;
    this.ceilingIn = ctx.createGain();
    this.ceilingIn.gain.value = 1 / OVER;
    this.ceiling = ctx.createWaveShaper();
    this.ceiling.curve = ceilingCurve();
    this.ceiling.oversample = '2x';
    this.lp.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(this.ceilingIn);
    this.ceilingIn.connect(this.ceiling);
    this.ceiling.connect(ctx.destination);
    this.setDrive(1);

    // reverb send — the convolver feeds the bus, the bus never feeds it back
    this.convolver = ctx.createConvolver();
    this.wet = ctx.createGain();
    this.wet.gain.value = 1;
    this.convolver.connect(this.wet);
    this.wet.connect(this.bus);

    this.applyKit();
    this.ready = true;
    this.samples?.refresh?.(this);
    return ctx;
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  /**
   * Give the audio hardware back.
   *
   * An `AudioContext` is a real resource — a browser allows only a handful of
   * them per page, and a closed one cannot be reopened. Stopping the transport
   * silences the output but leaves the context running, so every client-side
   * visit to the Studio used to leave a live one behind (H7); enough visits and
   * the next `new AudioContext()` throws and the page falls back to silence.
   *
   * The engine is finished after this: the nodes are gone and `init()` builds a
   * new graph rather than reviving the old one, which is why only the component
   * that owns the engine's lifetime calls it.
   */
  close(): void {
    const ctx = this.ctx;
    this.ctx = null;
    this.bus = null;
    this.master = null;
    this.shaper = null;
    this.lp = null;
    this.comp = null;
    this.convolver = null;
    this.wet = null;
    this.ceilingIn = null;
    this.ceiling = null;
    this.noise = null;
    this.draw = null;
    this.hatTails = [];
    this.channels = new Map();
    this.route = null;
    this.irRoom = -1;
    this.driveAt = -1;
    this.previews.clear();
    this.ready = false;
    /* Already-closed contexts throw rather than no-op, and a close that races a
       navigation is not worth an unhandled rejection in the console. */
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    // nothing renders for an engine that is finished (9-vi-d)
    this.samples?.dispose?.();
  }

  setKit(kit: ResolvedKit | null, sound: Record<string, VoiceParams> | null): void {
    this.kit = kit;
    this.sound = sound;
    // a kit of yours may pan its lanes its own way (9-v)
    this.applyPans();
    if (this.ctx) {
      this.applyKit();
      this.samples?.refresh?.(this);
    }
  }

  /* ---- parameters ---- */

  /**
   * The synthesised voices below only understand Hz and seconds. A drum-machine
   * or sample kit stores 0..1 knobs, so while one of those is still loading the
   * synth stands in with the Machine kit's numbers rather than reading 0.5 as
   * 0.5 Hz.
   */
  P(voice: string): VoiceParams {
    if (!SYNTH_ONLY[voice] && kitEngine(this.kit) !== 'synth') {
      return SAMPLE_STAND_IN[voice];
    }
    return this.knobs(voice);
  }

  /**
   * A voice's own knobs, in the kit's own units: your tuning over the kit's.
   * Unlike {@link P}, never the synth's stand-in — a drum machine's are 0..1,
   * which is what its voices read.
   */
  knobs(voice: string): VoiceParams {
    return this.sound?.[voice] ?? (this.kit ?? SYNTH_FALLBACK)[voice as 'k'];
  }

  /** The reverb send is per-lane on every engine, so it reads the live kit. */
  roomOf(voice: string): number {
    const s = this.sound?.[voice];
    if (s && typeof s.room === 'number') return s.room;
    return this.P(voice).room ?? 0;
  }

  /**
   * A `WaveShaperNode`'s curve can be assigned exactly once — the spec throws
   * `InvalidStateError` on the second assignment — so changing the drive means
   * a new node spliced into the chain, not a new curve on the old one.
   */
  setDrive(amount: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus || !this.lp) return;
    if (this.driveAt === amount) return;

    const next = ctx.createWaveShaper();
    next.curve = driveCurve(amount);
    next.oversample = '2x';
    next.connect(this.lp);
    if (this.shaper) {
      try {
        this.bus.disconnect(this.shaper);
      } catch {
        try {
          this.bus.disconnect();
        } catch {
          /* already detached */
        }
      }
      try {
        this.shaper.disconnect();
      } catch {
        /* already detached */
      }
    }
    this.bus.connect(next);
    this.shaper = next;
    this.driveAt = amount;
  }

  applyKit(): void {
    const ctx = this.ctx;
    if (!ctx || !this.lp || !this.wet || !this.convolver) return;
    /* `?? SYNTH_FALLBACK.master`, where this used to index the kit table
       unguarded. With kits as rows the key can legitimately name nothing —
       a deleted kit, a catalogue that has not arrived — and the old form threw
       on the first `applyKit()` rather than playing through the default. */
    const m = this.sound?.master ?? this.kit?.master ?? SYNTH_FALLBACK.master;
    this.lp.frequency.setTargetAtTime(m.lp ?? 16000, ctx.currentTime, 0.01);
    this.setDrive(m.drive ?? 1);
    const room = m.room ?? 0;
    this.wet.gain.setTargetAtTime(room, ctx.currentTime, 0.02);
    const want = Math.round(room * 100);
    if (want !== this.irRoom) {
      this.convolver.buffer = this.makeIR(room);
      this.irRoom = want;
    }
  }

  /** A synthesised room: noise under a power-law decay, with a short pre-delay. */
  private makeIR(room: number): AudioBuffer {
    const ctx = this.ctx as AudioContext;
    const secs = 0.35 + room * 2.0;
    const n = Math.max(1, Math.floor(ctx.sampleRate * secs));
    const ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      // the two channels decorrelate by pre-delay, which is what makes it wide
      const pre = Math.floor(ctx.sampleRate * 0.008 * (ch ? 1.4 : 1));
      for (let i = 0; i < n; i++) {
        if (i < pre) {
          d[i] = 0;
          continue;
        }
        const x = (i - pre) / (n - pre);
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, 2.6);
      }
    }
    return ir;
  }

  /* ---- helpers ---- */

  /**
   * Where the voices draw while playing: this context, through {@link send},
   * with `Math.random`'s jitter. A render draws somewhere else
   * ({@link SynthSource}).
   */
  private live(): voices.Draw {
    return (
      this.draw ?? {
        ctx: this.ctx as AudioContext,
        noise: this.noise,
        send: (node, voice, extra) => this.send(node, voice, extra),
        rand: () => Math.random(),
      }
    );
  }

  /**
   * Into the bus, and into the room by however much this lane sends. While a
   * performed note is playing ({@link playIn}), both go through its lane's
   * channel; an audition from the Kit drawer goes straight to the bus.
   */
  send(node: AudioNode, voice: string, extra?: number): void {
    this.toBus(node);
    this.toRoom(node, voice, extra);
  }

  private toBus(node: AudioNode): void {
    const ch = this.route ? this.channel(this.route) : null;
    node.connect(ch ? ch.fader : (this.bus as GainNode));
  }

  private toRoom(node: AudioNode, voice: string, extra?: number): void {
    const ctx = this.ctx as AudioContext;
    const ch = this.route ? this.channel(this.route) : null;
    const amt = this.roomOf(voice) * (extra ?? 1);
    if (amt > 0.005 && this.convolver) {
      const s = ctx.createGain();
      s.gain.value = amt;
      node.connect(s);
      s.connect(ch ? ch.room : this.convolver);
    }
  }

  /* ---- lanes ---- */

  /** A lane's channel, built the first time the lane plays. */
  private channel(lane: string): Channel | null {
    const have = this.channels.get(lane);
    if (have) return have;
    const ctx = this.ctx;
    if (!ctx || !this.bus || !this.convolver) return null;

    const fader = ctx.createGain();
    const room = ctx.createGain();
    room.connect(this.convolver);
    // a browser without StereoPannerNode still plays, centred
    let pan: StereoPannerNode | null = null;
    if (typeof ctx.createStereoPanner === 'function') {
      pan = ctx.createStereoPanner();
      pan.pan.value = panFor(lane, this.panView, this.kit?.samples.pan);
      fader.connect(pan);
      pan.connect(this.bus);
    } else {
      fader.connect(this.bus);
    }
    const ch: Channel = { fader, pan, room, level: 1 };
    this.channels.set(lane, ch);
    return ch;
  }

  /**
   * Play one performed note through its lane's channel, at the fader's level.
   *
   * The fader is a level and nothing else (D39). It used to be multiplied into
   * the velocity, so pulling the snare down picked a softer sample and closed
   * the synth snare's wires: a quiet snare became a ghost note. Now it is the
   * channel's gain, set at the moment the note plays, and the voice hears the
   * velocity the pattern wrote.
   */
  playIn(lane: string, level: number, t: number, play: () => void): void {
    const ch = this.channel(lane);
    if (ch && ch.level !== level) {
      ch.fader.gain.setValueAtTime(level, t);
      ch.room.gain.setValueAtTime(level, t);
      ch.level = level;
    }
    this.route = lane;
    try {
      play();
    } finally {
      this.route = null;
    }
  }

  /**
   * Whose side the kit is heard from. `drummer` puts the hats on your left as
   * you sit at the kit; `audience` mirrors it, the way most records are mixed.
   */
  setPanView(view: PanView): void {
    this.panView = view;
    this.applyPans();
  }

  /** Move every lane built so far to its pan: the kit's own, from the side it is heard. */
  private applyPans(): void {
    const ctx = this.ctx;
    for (const [lane, ch] of this.channels) {
      if (!ch.pan) continue;
      const to = panFor(lane, this.panView, this.kit?.samples.pan);
      if (ctx) ch.pan.pan.setTargetAtTime(to, ctx.currentTime, 0.02);
      else ch.pan.pan.value = to;
    }
  }

  /**
   * A closing hi-hat stops the open one, because that is what the foot does.
   * `hat()` calls this before every hit, an open one included, so at most one
   * tail is ever still ringing here.
   */
  chokeHats(t: number): void {
    for (const tail of this.hatTails) {
      if (tail.end <= t) continue;
      const g = tail.g.gain;
      try {
        if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
        else g.cancelScheduledValues(t);
        g.exponentialRampToValueAtTime(0.0001, t + 0.022);
      } catch {
        /* the tail had already finished */
      }
    }
    this.hatTails = [];
  }

  noteHatTail(played: PlayedBuffer): void {
    this.hatTails.push(played);
  }

  /* ---- sample playback: every sampled engine lands here ---- */

  /**
   * Play one recording through the voice's lane.
   *
   * `decay` (9-v) is how much of it rings, 0.2–1: below 1 the hit holds for
   * the first half of that, fades to silence by the end of it, and stops
   * there. It shortens the gain envelope and nothing else — the pitch and the
   * attack are the recording's.
   */
  playBuf(
    t: number,
    buf: AudioBuffer,
    gain: number,
    voice: string,
    rate?: number,
    offset?: number,
    shelf?: number,
    decay?: number,
    damp?: number
  ): PlayedBuffer {
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, gain), t);

    // there is nothing to tune inside a recording, so "bright" is a shelf over the top
    let out: AudioNode = src;
    if (shelf) {
      const hs = ctx.createBiquadFilter();
      hs.type = 'highshelf';
      hs.frequency.value = 3000;
      hs.gain.value = clamp(shelf, -12, 12);
      out.connect(hs);
      out = hs;
    }
    const muffle = dampOf(damp);
    if (muffle) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = muffle.lp;
      lp.Q.value = 0.5;
      out.connect(lp);
      out = lp;
    }
    out.connect(g);
    this.send(g, voice);

    const from = offset ?? 0;
    const full = (buf.duration - from) / (rate ?? 1);
    const short = decay !== undefined && decay < 1;
    let len = short ? full * clamp(decay, 0.2, 1) : full;
    if (muffle) {
      // the stroke as struck, then the ring choked off: gone 60 dB down in seven time constants
      len = Math.min(len, muffle.hold + muffle.tau * 7);
      g.gain.setValueAtTime(Math.max(0.0001, gain), t + muffle.hold);
      g.gain.setTargetAtTime(0.0001, t + muffle.hold, muffle.tau);
    } else if (short) {
      g.gain.setValueAtTime(Math.max(0.0001, gain), t + len / 2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    }
    src.start(t, from);
    src.stop(t + len + 0.02);
    return { g, end: t + len };
  }

  /**
   * Play one rendered take of a synthesised voice (9-vi-d). A mono take is the
   * voice whose parts all send the same room, and plays as {@link playBuf}
   * does. A two-channel take is the voice dry and what it sends to the room —
   * the beater and the stick send less than the drum — split here so each
   * goes its own way. Either way it is one source node, and one gain to choke.
   */
  playTake(t: number, buf: AudioBuffer, gain: number, voice: string): PlayedBuffer {
    if (buf.numberOfChannels < 2) return this.playBuf(t, buf, gain, voice);
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, gain), t);
    src.connect(g);
    const split = ctx.createChannelSplitter(2);
    g.connect(split);
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    split.connect(dry, 0);
    split.connect(wet, 1);
    this.toBus(dry);
    this.toRoom(wet, voice);
    src.start(t);
    src.stop(t + buf.duration + 0.02);
    return { g, end: t + buf.duration };
  }

  /**
   * Draw a slot on the kit's drum machine, live (9-vi-e) — while its render
   * is on its way, or a knob is moving. False unless the kit is a machine
   * with that slot or the slot's `fall`; the synthesised voice then plays it,
   * as it does a slot a pack is missing.
   */
  private machineHit(t: number, slotId: string, vel: number): boolean {
    const kit = this.kit;
    if (!this.ctx || !kit || kitEngine(kit) !== 'drift') return false;
    const slot = SLOT_BY_ID[slotId];
    if (!slot) return false;
    const id = machineSlot(kit.machine, slotId);
    if (!id) return false;
    const P = this.knobs(slot.voice);
    const tail = drawMachineSlot(
      this.live(),
      kit.machine,
      id,
      t,
      vel * machineGain(kit.trim, P),
      P
    );
    if (tail) this.noteHatTail(tail);
    return true;
  }

  private sampleHit(t: number, slotId: string, vel: number): boolean {
    if (!this.ctx || !this.samples) return false;
    if (!SLOT_BY_ID[slotId]) return false;
    return this.samples.hit(this, t, slotId, vel);
  }

  /* ---- voices: a sample if a source has one, else drawn live (`voices.ts`) ---- */

  kick(t: number, vel: number): void {
    if (this.sampleHit(t, 'k', vel) || this.machineHit(t, 'k', vel)) return;
    voices.kick(this.live(), t, vel, this.P('k'));
  }

  snare(t: number, vel: number, ghost?: boolean, cross?: boolean, rim?: boolean): void {
    const slot = rim ? 'sRim' : cross ? 'sCross' : ghost ? 'sGhost' : 's';
    if (this.sampleHit(t, slot, vel) || this.machineHit(t, slot, vel)) return;
    const stroke = rim ? 'rim' : cross ? 'cross' : ghost ? 'ghost' : undefined;
    voices.snare(this.live(), t, vel, this.P('s'), stroke);
  }

  /**
   * `pedal` is the foot closing the hats rather than a stick hitting them. It
   * chokes an open hat, because that is literally what the foot is doing.
   */
  hat(
    t: number,
    vel: number,
    open?: boolean,
    pedal?: boolean,
    half?: boolean,
    /** A tape echo's repeat: the foot did not close anything, so nothing is choked. */
    echo?: boolean
  ): void {
    if (!echo) this.chokeHats(t);
    /* A half-open hat is sent quieter than it was written, because GM has no
       note for it and velocity is how a MIDI reader tells it from an open one
       (`HALF_OPEN_SCALE` in `perform.ts`). Here it is played as written. */
    if (half) {
      const at = Math.min(1, vel / HALF_OPEN_SCALE);
      if (this.sampleHit(t, 'hHalf', at) || this.machineHit(t, 'hHalf', at)) return;
      const tail = voices.hat(this.live(), t, at, this.P('h'), 'half');
      if (tail) this.noteHatTail(tail);
      return;
    }
    const slot = pedal ? 'hFoot' : open ? 'hOpen' : 'h';
    if (this.sampleHit(t, slot, vel) || this.machineHit(t, slot, vel)) return;
    const stroke = pedal ? 'pedal' : open ? 'open' : undefined;
    const tail = voices.hat(this.live(), t, vel, this.P('h'), stroke);
    if (tail) this.noteHatTail(tail);
  }

  ride(t: number, vel: number, bell?: boolean): void {
    const slot = bell ? 'rBell' : 'r';
    if (this.sampleHit(t, slot, vel) || this.machineHit(t, slot, vel)) return;
    voices.ride(this.live(), t, vel, this.P('r'), bell);
  }

  /** The crash lane's cymbals: the crash, a second crash, a china and a splash. */
  crash(t: number, vel: number, cymbal?: 'c2' | 'cChina' | 'cSplash'): void {
    const slot = cymbal ?? 'c';
    if (this.sampleHit(t, slot, vel) || this.machineHit(t, slot, vel)) return;
    voices.crash(this.live(), t, vel, this.P('c'), cymbal);
  }

  /** Three drums off one voice: the knob tunes the floor tom and the rack toms sit above it. */
  tom(t: number, vel: number, lane: string): void {
    if (this.sampleHit(t, lane, vel) || this.machineHit(t, lane, vel)) return;
    voices.tom(this.live(), t, vel, this.P('t'), lane);
  }

  /**
   * Ten instruments off one voice. A sample of yours in the lane wins, then
   * the recorded percussion, then the synthesised one. `accent` picks the
   * open/high stroke where the instrument has two.
   */
  perc(t: number, vel: number, inst: string, accent?: boolean, slot?: string): void {
    if (slot && this.sampleHit(t, slot, vel)) return; // your own sample in that lane wins
    if (this.samples?.percHit?.(this, t, inst, vel, !!accent)) return;
    voices.perc(this.live(), t, vel, this.P('p'), inst, accent);
  }

  /** The metronome. Deliberately straight to the bus: it never goes in the room. */
  /**
   * A bar of the kit, for comparing one against another.
   *
   * Deliberately plays every voice — kick, snare, ghost, closed and open hat,
   * ride and its bell, crash — because what separates two kits is rarely the
   * kick. Scheduled as one phrase rather than as single hits so the room and
   * the glue compressor are doing what they do when it is actually playing.
   */
  demo(): boolean {
    const ctx = this.init();
    if (!ctx) return false;
    this.resume();
    const t = ctx.currentTime + 0.05;
    const q = 0.26;
    this.kick(t, 1);
    this.hat(t, 0.8);
    this.hat(t + q * 0.5, 0.6);
    this.snare(t + q, 1);
    this.hat(t + q, 0.8);
    this.hat(t + q * 1.5, 0.6, true);
    this.kick(t + q * 2, 0.95);
    this.ride(t + q * 2, 0.9, true);
    this.ride(t + q * 2.5, 0.7);
    this.snare(t + q * 3, 0.5, true);
    this.snare(t + q * 3.5, 1);
    this.crash(t + q * 3.5, 0.9);
    return true;
  }

  click(t: number, strong?: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = strong ? 1720 : 1180;
    const d = this.live();
    const g = voices.mkEnv(d, t, strong ? 0.24 : 0.14, 0.0005, 0.03);
    o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + 0.08);

    const n = voices.noiseSrc(d);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4000;
    n.connect(hp);
    const g2 = voices.mkEnv(d, t, strong ? 0.09 : 0.05, 0.0003, 0.006);
    hp.connect(g2);
    g2.connect(this.bus);
    n.start(t);
    n.stop(t + 0.03);
  }

  /**
   * One recording, heard on its own: a piece in the kit builder, before it is
   * in the kit (9.18). The kit's sources decode a piece only once the kit
   * holds it, so this fetches and decodes the file itself, once per URL. It
   * goes straight to the bus, as any audition does. `tune` is cents, and
   * `decay` and `damp` are {@link playBuf}'s. False when there is no Web Audio or the
   * file would not load; a file that would not load is tried again next time.
   */
  async preview(
    url: string,
    voice: string,
    { gain, tune, decay, damp }: { gain: number; tune?: number; decay?: number; damp?: number }
  ): Promise<boolean> {
    const ctx = this.init();
    if (!ctx) return false;
    this.resume();
    let pending = this.previews.get(url);
    if (!pending) {
      pending = fetch(url, { redirect: 'error' })
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.arrayBuffer();
        })
        .then((bytes) => ctx.decodeAudioData(bytes))
        .catch(() => null);
      this.previews.set(url, pending);
    }
    const buf = await pending;
    if (!buf) {
      this.previews.delete(url);
      return false;
    }
    // closed while it loaded: the buffer belongs to a graph that is gone
    if (this.ctx !== ctx) return false;
    this.playBuf(
      ctx.currentTime + 0.02,
      buf,
      gain,
      voice,
      2 ** ((tune ?? 0) / 1200),
      undefined,
      undefined,
      decay,
      damp
    );
    return true;
  }

  /** One-shot preview, for the kit panel and the step editor. */
  hit(voice: string, variant?: string, vel?: number): void {
    const ctx = this.init();
    if (!ctx) return;
    this.resume();
    const t = ctx.currentTime + 0.02;
    const v = vel ?? 0.95;
    if (voice === 'k') this.kick(t, v);
    else if (voice === 's')
      this.snare(t, v, variant === 'ghost', variant === 'cross', variant === 'rim');
    else if (voice === 'h')
      this.hat(t, v, variant === 'open', variant === 'pedal', variant === 'half');
    else if (voice === 'r') this.ride(t, v, variant === 'bell');
    else if (voice === 'c')
      this.crash(
        t,
        v,
        variant === 'c2' || variant === 'cChina' || variant === 'cSplash' ? variant : undefined
      );
    else if (voice === 't') this.tom(t, v, variant ?? 't2');
    else if (voice === 'p') this.perc(t, v, variant ?? 'tamb', false);
  }
}
