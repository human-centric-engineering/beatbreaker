import {
  KITS,
  RATIOS,
  SLOT_BY_ID,
  SYNTH_ONLY,
  type VoiceParams,
  kitEngine,
} from '@/lib/app/breaks/kit';

/**
 * The drum synth, and the one chain every kit plays through.
 *
 * **Cymbals are not filtered noise.** A hi-hat or ride is an inharmonic cluster
 * of partials plus a stick attack; noise on its own reads as hiss. Every cymbal
 * voice here layers a short filtered ping over the six-oscillator metal cluster
 * in {@link RATIOS} so the stick is audible.
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

export class BreakAudio {
  ctx: AudioContext | null = null;
  bus: GainNode | null = null;
  private master: GainNode | null = null;
  private shaper: WaveShaperNode | null = null;
  private lp: BiquadFilterNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private convolver: ConvolverNode | null = null;
  private wet: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private hatTail: PlayedBuffer | null = null;
  private irRoom = -1;
  private driveAt = -1;

  ready = false;
  kitKey = 'studio70';
  /** The user's tuning — a saved override of the kit's own numbers. */
  sound: Record<string, VoiceParams> | null = null;
  samples: SampleSource | null = null;

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
    this.lp.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(ctx.destination);
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

  setKit(kitKey: string, sound: Record<string, VoiceParams> | null): void {
    this.kitKey = kitKey;
    this.sound = sound;
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
    if (!SYNTH_ONLY[voice] && kitEngine(this.kitKey) !== 'synth') {
      return KITS.machine[voice as 'k'];
    }
    return this.sound?.[voice] ?? (KITS[this.kitKey] ?? KITS.studio70)[voice as 'k'];
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
    const m = this.sound?.master ?? KITS[this.kitKey].master;
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

  noiseSrc(): AudioBufferSourceNode {
    const ctx = this.ctx as AudioContext;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    // no two hits read the same bit of noise
    s.playbackRate.value = 0.85 + Math.random() * 0.3;
    return s;
  }

  mkEnv(t: number, peak: number, attack: number, decay: number): GainNode {
    const ctx = this.ctx as AudioContext;
    const g = ctx.createGain();
    const p = Math.max(0.0005, peak);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(p, t + Math.max(0.0003, attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.0006, attack) + decay);
    return g;
  }

  /** Into the bus, and into the room by however much this lane sends. */
  send(node: AudioNode, voice: string, extra?: number): void {
    const ctx = this.ctx as AudioContext;
    node.connect(this.bus as GainNode);
    const amt = this.roomOf(voice) * (extra ?? 1);
    if (amt > 0.005 && this.convolver) {
      const s = ctx.createGain();
      s.gain.value = amt;
      node.connect(s);
      s.connect(this.convolver);
    }
  }

  /** The inharmonic partial cluster every cymbal is built from. */
  metal(
    t: number,
    o: {
      base: number;
      bp: number;
      hp: number;
      q?: number;
      peak: number;
      decay: number;
      attack?: number;
      voice: string;
      noise?: { amt: number; hp: number; decay: number };
    }
  ): GainNode {
    const ctx = this.ctx as AudioContext;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = o.bp;
    bp.Q.value = o.q ?? 1.1;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = o.hp;
    bp.connect(hp);

    const g = this.mkEnv(t, o.peak, o.attack ?? 0.001, o.decay);
    hp.connect(g);
    this.send(g, o.voice);

    const jitter = 1 + (Math.random() - 0.5) * 0.05; // no two hits identical
    for (const ratio of RATIOS) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = o.base * ratio * jitter;
      osc.connect(bp);
      osc.start(t);
      osc.stop(t + o.decay + 0.08);
    }

    if (o.noise) {
      const n = this.noiseSrc();
      const nf = ctx.createBiquadFilter();
      nf.type = 'highpass';
      nf.frequency.value = o.noise.hp;
      n.connect(nf);
      const ng = this.mkEnv(t, o.peak * o.noise.amt, 0.001, o.noise.decay);
      nf.connect(ng);
      this.send(ng, o.voice);
      n.start(t);
      n.stop(t + o.noise.decay + 0.08);
    }
    return g;
  }

  /** A closing hi-hat stops the open one, because that is what the foot does. */
  chokeHats(t: number): void {
    if (this.hatTail && this.hatTail.end > t) {
      const g = this.hatTail.g.gain;
      try {
        if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
        else g.cancelScheduledValues(t);
        g.exponentialRampToValueAtTime(0.0001, t + 0.022);
      } catch {
        /* the tail had already finished */
      }
    }
    this.hatTail = null;
  }

  noteHatTail(played: PlayedBuffer): void {
    this.hatTail = played;
  }

  /* ---- sample playback: every sampled engine lands here ---- */

  playBuf(
    t: number,
    buf: AudioBuffer,
    gain: number,
    voice: string,
    rate?: number,
    offset?: number,
    shelf?: number
  ): PlayedBuffer {
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, gain), t);

    // there is nothing to tune inside a recording, so "bright" is a shelf over the top
    if (shelf) {
      const hs = ctx.createBiquadFilter();
      hs.type = 'highshelf';
      hs.frequency.value = 3000;
      hs.gain.value = clamp(shelf, -12, 12);
      src.connect(hs);
      hs.connect(g);
    } else {
      src.connect(g);
    }
    this.send(g, voice);

    const from = offset ?? 0;
    const len = (buf.duration - from) / (rate ?? 1);
    src.start(t, from);
    src.stop(t + len + 0.02);
    return { g, end: t + len };
  }

  private sampleHit(t: number, slotId: string, vel: number): boolean {
    if (!this.ctx || !this.samples) return false;
    if (!SLOT_BY_ID[slotId]) return false;
    return this.samples.hit(this, t, slotId, vel);
  }

  /* ---- voices ---- */

  kick(t: number, vel: number): void {
    if (this.sampleHit(t, 'k', vel)) return;
    const ctx = this.ctx as AudioContext;
    const P = this.P('k');

    /* Two stages, not one: a real kick drops most of an octave in the first
       20ms as the head is pushed in, then settles over the next tenth of a
       second. A single ramp reads as a synth tom. */
    const o = ctx.createOscillator();
    o.type = 'sine';
    const detune = 1 + (Math.random() - 0.5) * 0.014;
    o.frequency.setValueAtTime(P.tune * 5.2 * detune, t);
    o.frequency.exponentialRampToValueAtTime(P.tune * 1.32 * detune, t + 0.021);
    o.frequency.exponentialRampToValueAtTime(P.tune * detune, t + 0.105);
    const g = this.mkEnv(t, vel * 1.05, 0.002, P.decay);
    o.connect(g);
    this.send(g, 'k');
    o.start(t);
    o.stop(t + P.decay + 0.12);

    if (P.tone > 0.01) {
      // the beater
      const n = this.noiseSrc();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2000 + P.tone * 2800;
      bp.Q.value = 0.8;
      n.connect(bp);
      const g2 = this.mkEnv(t, vel * P.tone * 0.45, 0.0004, 0.013);
      bp.connect(g2);
      this.send(g2, 'k', 0.4);
      n.start(t);
      n.stop(t + 0.06);
    }
  }

  snare(t: number, vel: number, ghost?: boolean, cross?: boolean): void {
    if (this.sampleHit(t, cross ? 'sCross' : ghost ? 'sGhost' : 's', vel)) return;
    const ctx = this.ctx as AudioContext;
    const P = this.P('s');

    /* Cross-stick: the stick lying across the head, its shoulder struck on the
       rim. What you hear is the rim's woodblock-ish pitch and the shell under
       it — almost none of the head and none of the wires, which is why turning
       the snare down does not make one. */
    if (cross) {
      for (const [mult, peak, type] of [
        [1, 0.55, 'triangle'],
        [2.72, 0.22, 'square'],
      ] as Array<[number, number, OscillatorType]>) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = P.tune * 3.6 * mult * (1 + (Math.random() - 0.5) * 0.02);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2400;
        bp.Q.value = 1.6;
        o.connect(bp);
        const g = this.mkEnv(t, vel * peak * 0.5, 0.0006, 0.055);
        bp.connect(g);
        this.send(g, 's');
        o.start(t);
        o.stop(t + 0.16);
      }
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(P.tune * 1.1, t);
      o2.frequency.exponentialRampToValueAtTime(P.tune * 0.8, t + 0.05);
      const gs = this.mkEnv(t, vel * 0.18, 0.001, 0.045);
      o2.connect(gs);
      this.send(gs, 's');
      o2.start(t);
      o2.stop(t + 0.14);

      const n0 = this.noiseSrc();
      const hp0 = ctx.createBiquadFilter();
      hp0.type = 'highpass';
      hp0.frequency.value = 3800;
      n0.connect(hp0);
      const gn = this.mkEnv(t, vel * 0.12, 0.0004, 0.008);
      hp0.connect(gn);
      this.send(gn, 's', 0.4);
      n0.start(t);
      n0.stop(t + 0.05);
      return;
    }

    const decay = ghost ? P.decay * 0.44 : P.decay;
    const snap = P.tone;

    /* Drum head: the mode ratios of a circular membrane, not two detuned tones.
       Six of them is the difference between "a drum" and "a beep with noise on
       top". */
    for (const [mult, peak] of [
      [1, 0.9],
      [1.59, 0.4],
      [2.14, 0.2],
      [2.3, 0.14],
      [2.65, 0.09],
      [2.92, 0.06],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      const f = P.tune * mult * (1 + (Math.random() - 0.5) * 0.02);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.84, t + decay * 0.8);
      const g = this.mkEnv(
        t,
        vel * (1 - snap * 0.5) * peak * (ghost ? 0.5 : 1),
        0.001,
        decay * 0.75
      );
      o.connect(g);
      this.send(g, 's');
      o.start(t);
      o.stop(t + decay + 0.1);
    }

    // snare wires — brighter and longer the harder it is hit
    const n = this.noiseSrc();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = ghost ? 2800 : 1500;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3200 + vel * 2400;
    bp.Q.value = 0.6;
    n.connect(hp);
    hp.connect(bp);
    const gN = this.mkEnv(
      t,
      vel * (0.42 + snap * 0.5) * (ghost ? 0.5 : 1),
      0.001,
      decay * (ghost ? 0.8 : 1.3)
    );
    bp.connect(gN);
    this.send(gN, 's');
    n.start(t);
    n.stop(t + decay * 1.7 + 0.1);

    // stick crack
    const n2 = this.noiseSrc();
    const hp2 = ctx.createBiquadFilter();
    hp2.type = 'highpass';
    hp2.frequency.value = 5800;
    n2.connect(hp2);
    const g3 = this.mkEnv(t, vel * 0.3 * (ghost ? 0.35 : 1), 0.0004, 0.009);
    hp2.connect(g3);
    this.send(g3, 's', 0.5);
    n2.start(t);
    n2.stop(t + 0.05);
  }

  /**
   * `pedal` is the foot closing the hats rather than a stick hitting them:
   * shorter, duller, with the pedal's own thump under it. It chokes an open
   * hat, because that is literally what the foot is doing.
   */
  hat(t: number, vel: number, open?: boolean, pedal?: boolean): void {
    this.chokeHats(t);
    if (this.sampleHit(t, pedal ? 'hFoot' : open ? 'hOpen' : 'h', vel)) return;
    const ctx = this.ctx as AudioContext;
    const P = this.P('h');
    const dec = pedal ? Math.max(0.016, P.decay * 0.62) : open ? P.open : P.decay;
    const v = vel * (0.94 + Math.random() * 0.12);

    const g = this.metal(t, {
      base: 208 * P.tune,
      hp: P.tone * (pedal ? 0.55 : open ? 0.92 : 1),
      bp: pedal ? 6200 : 10500,
      q: pedal ? 0.8 : 1.0,
      peak: v * (pedal ? 0.34 : open ? 0.54 : 0.58),
      decay: dec,
      attack: 0.0006,
      voice: 'h',
      noise: {
        amt: pedal ? 0.34 : open ? 0.3 : 0.24,
        hp: P.tone * (pedal ? 0.5 : 1.15),
        decay: dec * 0.75,
      },
    });

    if (pedal) {
      // the board and the pull-rod, which is most of what a foot chick actually is
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 168;
      const bg = this.mkEnv(t, v * 0.1, 0.001, 0.03);
      o.connect(bg);
      this.send(bg, 'h', 0.3);
      o.start(t);
      o.stop(t + 0.09);
    }
    if (open) this.hatTail = { g, end: t + dec };
  }

  ride(t: number, vel: number, bell?: boolean): void {
    if (this.sampleHit(t, bell ? 'rBell' : 'r', vel)) return;
    const ctx = this.ctx as AudioContext;
    const P = this.P('r');
    const dec = bell ? P.decay * 0.85 : P.decay;
    const v = vel * (0.94 + Math.random() * 0.12);

    this.metal(t, {
      base: (bell ? 318 : 184) * P.tune,
      hp: bell ? P.tone * 1.1 : P.tone * 0.6,
      bp: bell ? P.tone * 1.5 : P.tone,
      q: bell ? 2.2 : 0.95,
      peak: v * (bell ? 0.26 : 0.15),
      decay: dec,
      attack: 0.0008,
      voice: 'r',
      noise: { amt: bell ? 0.1 : 0.24, hp: P.tone * 1.3, decay: dec * 0.5 },
    });

    // the stick ping — without this a ride is just a wash
    const n = this.noiseSrc();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bell ? 5000 : 3800;
    bp.Q.value = 1.5;
    n.connect(bp);
    const g = this.mkEnv(t, v * 0.26, 0.0004, bell ? 0.07 : 0.05);
    bp.connect(g);
    this.send(g, 'r', 0.5);
    n.start(t);
    n.stop(t + 0.14);

    if (bell) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 930 * P.tune;
      const g2 = this.mkEnv(t, v * 0.15, 0.002, dec * 0.8);
      o.connect(g2);
      this.send(g2, 'r');
      o.start(t);
      o.stop(t + dec + 0.1);
    }
  }

  crash(t: number, vel: number): void {
    if (this.sampleHit(t, 'c', vel)) return;
    const ctx = this.ctx as AudioContext;
    const P = this.P('c');

    // wash whose top end closes as it decays, the way a real cymbal damps
    const n = this.noiseSrc();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = P.tone * 0.8;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(14000, t);
    lp.frequency.exponentialRampToValueAtTime(3200, t + P.decay);
    n.connect(hp);
    hp.connect(lp);
    const g = this.mkEnv(t, vel * 0.24, 0.006, P.decay);
    lp.connect(g);
    this.send(g, 'c');
    n.start(t);
    n.stop(t + P.decay + 0.2);

    this.metal(t, {
      base: 152 * P.tune,
      hp: P.tone,
      bp: P.tone * 1.6,
      q: 0.9,
      peak: vel * 0.11,
      decay: P.decay * 0.85,
      attack: 0.004,
      voice: 'c',
    });
  }

  /**
   * A tom is the snare's membrane without the wires: the same mode ratios, a
   * longer decay, and a pitch that falls a little as the head relaxes. Three
   * drums off one voice — the knob tunes the floor tom and the rack toms sit
   * above it, which is how you tune a kit.
   */
  tom(t: number, vel: number, lane: string): void {
    if (this.sampleHit(t, lane, vel)) return;
    const ctx = this.ctx as AudioContext;
    const P = this.P('t');
    const mult = lane === 't1' ? 1.78 : lane === 't2' ? 1.34 : 1;
    const f0 = (P.tune || 90) * mult;
    const dec = (P.decay || 0.5) * (lane === 't3' ? 1.18 : lane === 't1' ? 0.82 : 1);

    for (const [ratio, peak] of [
      [1, 0.95],
      [1.59, 0.3],
      [2.14, 0.15],
      [2.3, 0.09],
    ]) {
      const o = ctx.createOscillator();
      o.type = ratio === 1 ? 'sine' : 'triangle';
      const f = f0 * ratio * (1 + (Math.random() - 0.5) * 0.016);
      o.frequency.setValueAtTime(f * 1.14, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.028);
      o.frequency.exponentialRampToValueAtTime(f * 0.88, t + dec * 0.9);
      const g = this.mkEnv(t, vel * peak * 0.9, 0.0015, dec);
      o.connect(g);
      this.send(g, 't');
      o.start(t);
      o.stop(t + dec + 0.12);
    }

    const stick = P.tone ?? 0.35;
    if (stick > 0.01) {
      const n = this.noiseSrc();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + stick * 3200;
      bp.Q.value = 0.9;
      n.connect(bp);
      const g = this.mkEnv(t, vel * stick * 0.3, 0.0004, 0.014);
      bp.connect(g);
      this.send(g, 't', 0.5);
      n.start(t);
      n.stop(t + 0.07);
    }
  }

  /**
   * Ten instruments off one voice.
   *
   * Wood and bells are tuned partials with a fast envelope; shakers and
   * tambourines are shaped noise; a clap is four noise bursts eight
   * milliseconds apart, which is what makes it a room full of hands rather than
   * one snare. `accent` picks the open/high stroke where the instrument has two
   * — the conga's slap, the agogô's small bell.
   */
  perc(t: number, vel: number, inst: string, accent?: boolean, slot?: string): void {
    if (slot && this.sampleHit(t, slot, vel)) return; // your own sample in that lane wins
    if (this.samples?.percHit?.(this, t, inst, vel, !!accent)) return;
    const ctx = this.ctx as AudioContext;
    const P = this.P('p');
    const pitch = P.tune ?? 1;
    const bright = P.tone ?? 1;
    const v = vel * (P.level ?? 1);

    const tone = (freq: number, peak: number, dec: number, type: OscillatorType = 'triangle') => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq * pitch;
      const g = this.mkEnv(t, peak, 0.0008, dec);
      o.connect(g);
      this.send(g, 'p');
      o.start(t);
      o.stop(t + dec + 0.06);
    };

    const hiss = (lo: number, hi: number, peak: number, dec: number, at = 0) => {
      const n = this.noiseSrc();
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = lo * bright;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = hi * bright;
      bp.Q.value = 0.7;
      n.connect(hp);
      hp.connect(bp);
      const g = this.mkEnv(t + at, peak, 0.0006, dec);
      bp.connect(g);
      this.send(g, 'p');
      n.start(t + at);
      n.stop(t + at + dec + 0.08);
    };

    const membrane = (f0: number, peak: number, dec: number) => {
      for (const [ratio, mul] of [
        [1, 1],
        [1.59, 0.22],
        [2.14, 0.1],
      ]) {
        const o = ctx.createOscillator();
        o.type = ratio === 1 ? 'sine' : 'triangle';
        const f = f0 * pitch * ratio;
        o.frequency.setValueAtTime(f * 1.1, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
        const g = this.mkEnv(t, peak * mul, 0.0012, dec);
        o.connect(g);
        this.send(g, 'p');
        o.start(t);
        o.stop(t + dec + 0.1);
      }
    };

    switch (inst) {
      case 'shaker':
        hiss(4200, 7200, v * 0.2, accent ? 0.058 : 0.038);
        break;
      case 'tamb':
        // jingles: a metal cluster you can hear the pitch of, plus the shell hit
        this.metal(t, {
          base: 620,
          hp: 5200 * bright,
          bp: 9000 * bright,
          q: 0.8,
          peak: v * 0.13,
          decay: accent ? 0.2 : 0.075,
          attack: 0.0006,
          voice: 'p',
        });
        hiss(5000, 8600, v * 0.16, accent ? 0.13 : 0.05);
        break;
      case 'clave':
        tone(2450, v * 0.34, 0.042);
        tone(3850, v * 0.12, 0.028);
        hiss(3000, 5200, v * 0.07, 0.008);
        break;
      case 'wood':
        tone(1180, v * 0.32, 0.055);
        tone(2360, v * 0.1, 0.026);
        hiss(2400, 4200, v * 0.06, 0.007);
        break;
      case 'cowbell':
        // two square partials through a narrow band — the classic detuned pair
        [540, 810].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = 'square';
          o.frequency.value = f * pitch;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 2600 * bright;
          bp.Q.value = 1.4;
          o.connect(bp);
          const g = this.mkEnv(t, v * (i ? 0.16 : 0.22), 0.001, accent ? 0.42 : 0.26);
          bp.connect(g);
          this.send(g, 'p');
          o.start(t);
          o.stop(t + 0.6);
        });
        break;
      case 'agogo':
        [accent ? 1000 : 780, accent ? 1500 : 1170].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = 'square';
          o.frequency.value = f * pitch;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 3000 * bright;
          bp.Q.value = 2.0;
          o.connect(bp);
          const g = this.mkEnv(t, v * (i ? 0.11 : 0.18), 0.001, 0.22);
          bp.connect(g);
          this.send(g, 'p');
          o.start(t);
          o.stop(t + 0.4);
        });
        break;
      case 'conga':
        membrane(accent ? 305 : 196, v * 0.55, accent ? 0.26 : 0.34);
        if (accent) hiss(2200, 4000, v * 0.16, 0.02); // the slap
        break;
      case 'timbale':
        membrane(accent ? 396 : 302, v * 0.42, 0.2);
        hiss(2600, 5200, v * 0.14, 0.03);
        break;
      case 'cascara':
        // stick on the shell: a short bright knock with metal in it
        tone(1650, v * 0.16, 0.03, 'square');
        hiss(3200, 6400, v * 0.2, accent ? 0.03 : 0.018);
        break;
      case 'clap':
        [0, 0.008, 0.016, 0.026].forEach((at, i) => {
          hiss(1400, 2100, v * (i === 3 ? 0.24 : 0.17), i === 3 ? 0.14 : 0.012, at);
        });
        break;
      default:
        hiss(4000, 7000, v * 0.18, 0.04);
    }
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
    const g = this.mkEnv(t, strong ? 0.24 : 0.14, 0.0005, 0.03);
    o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + 0.08);

    const n = this.noiseSrc();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4000;
    n.connect(hp);
    const g2 = this.mkEnv(t, strong ? 0.09 : 0.05, 0.0003, 0.006);
    hp.connect(g2);
    g2.connect(this.bus);
    n.start(t);
    n.stop(t + 0.03);
  }

  /** One-shot preview, for the kit panel and the step editor. */
  hit(voice: string, variant?: string, vel?: number): void {
    const ctx = this.init();
    if (!ctx) return;
    this.resume();
    const t = ctx.currentTime + 0.02;
    const v = vel ?? 0.95;
    if (voice === 'k') this.kick(t, v);
    else if (voice === 's') this.snare(t, v, variant === 'ghost', variant === 'cross');
    else if (voice === 'h') this.hat(t, v, variant === 'open', variant === 'pedal');
    else if (voice === 'r') this.ride(t, v, variant === 'bell');
    else if (voice === 'c') this.crash(t, v);
    else if (voice === 't') this.tom(t, v, variant ?? 't2');
    else if (voice === 'p') this.perc(t, v, variant ?? 'tamb', false);
  }
}
