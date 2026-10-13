import { RATIOS, type VoiceParams } from '@/lib/app/breaks/kit';

/**
 * The synthesised voices, drawn into a destination they are given (9-vi-d).
 *
 * The same code plays live, into `BreakAudio`'s context and a lane's channel,
 * and renders ahead, into an `OfflineAudioContext` whose destination is the
 * render ({@link SynthSource}). Nothing here knows which: a voice builds its
 * graph on `d.ctx`, takes its randomness from `d.rand`, and hands each output
 * to `d.send` with the voice it belongs to.
 *
 * **Cymbals are not filtered noise.** A hi-hat or ride is an inharmonic cluster
 * of partials plus a stick attack; noise on its own reads as hiss. Every cymbal
 * voice here layers a short filtered ping over the six-oscillator metal cluster
 * in {@link RATIOS} so the stick is audible.
 *
 * Client-only, like the engine: it builds Web Audio nodes.
 */

/** Where a voice draws. */
export interface Draw {
  ctx: BaseAudioContext;
  /** Two seconds of white noise, looped by every noise source. */
  noise: AudioBuffer | null;
  /** Into the output, and `extra` times the voice's room send. */
  send(node: AudioNode, voice: string, extra?: number): void;
  /** The jitter on every hit: `Math.random` live, a seeded stream in a render. */
  rand(): number;
}

/** A hat that rings until the next one chokes it. */
export interface Tail {
  g: GainNode;
  end: number;
}

/** How each of the crash lane's other cymbals is made from the crash voice's knobs. */
const CYMBAL_SHAPE: Record<'c2' | 'cChina' | 'cSplash', { size: number; ring: number }> = {
  c2: { size: 1.16, ring: 0.82 },
  cChina: { size: 1.05, ring: 0.62 },
  cSplash: { size: 1.55, ring: 0.36 },
};

export function noiseSrc(d: Draw): AudioBufferSourceNode {
  const s = d.ctx.createBufferSource();
  s.buffer = d.noise;
  s.loop = true;
  // no two hits read the same bit of noise
  s.playbackRate.value = 0.85 + d.rand() * 0.3;
  return s;
}

export function mkEnv(d: Draw, t: number, peak: number, attack: number, decay: number): GainNode {
  const g = d.ctx.createGain();
  const p = Math.max(0.0005, peak);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(p, t + Math.max(0.0003, attack));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.0006, attack) + decay);
  return g;
}

/** The inharmonic partial cluster every cymbal is built from. */
export function metal(
  d: Draw,
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
  const ctx = d.ctx;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = o.bp;
  bp.Q.value = o.q ?? 1.1;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = o.hp;
  bp.connect(hp);

  const g = mkEnv(d, t, o.peak, o.attack ?? 0.001, o.decay);
  hp.connect(g);
  d.send(g, o.voice);

  const jitter = 1 + (d.rand() - 0.5) * 0.05; // no two hits identical
  for (const ratio of RATIOS) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = o.base * ratio * jitter;
    osc.connect(bp);
    osc.start(t);
    osc.stop(t + o.decay + 0.08);
  }

  if (o.noise) {
    const n = noiseSrc(d);
    const nf = ctx.createBiquadFilter();
    nf.type = 'highpass';
    nf.frequency.value = o.noise.hp;
    n.connect(nf);
    const ng = mkEnv(d, t, o.peak * o.noise.amt, 0.001, o.noise.decay);
    nf.connect(ng);
    d.send(ng, o.voice);
    n.start(t);
    n.stop(t + o.noise.decay + 0.08);
  }
  return g;
}

export function kick(d: Draw, t: number, vel: number, P: VoiceParams): void {
  const ctx = d.ctx;

  /* Two stages, not one: a real kick drops most of an octave in the first
     20ms as the head is pushed in, then settles over the next tenth of a
     second. A single ramp reads as a synth tom. */
  const o = ctx.createOscillator();
  o.type = 'sine';
  const detune = 1 + (d.rand() - 0.5) * 0.014;
  o.frequency.setValueAtTime(P.tune * 5.2 * detune, t);
  o.frequency.exponentialRampToValueAtTime(P.tune * 1.32 * detune, t + 0.021);
  o.frequency.exponentialRampToValueAtTime(P.tune * detune, t + 0.105);
  const g = mkEnv(d, t, vel * 1.05, 0.002, P.decay);
  o.connect(g);
  d.send(g, 'k');
  o.start(t);
  o.stop(t + P.decay + 0.12);

  if (P.tone > 0.01) {
    // the beater
    const n = noiseSrc(d);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000 + P.tone * 2800;
    bp.Q.value = 0.8;
    n.connect(bp);
    const g2 = mkEnv(d, t, vel * P.tone * 0.45, 0.0004, 0.013);
    bp.connect(g2);
    d.send(g2, 'k', 0.4);
    n.start(t);
    n.stop(t + 0.06);
  }
}

export function snare(
  d: Draw,
  t: number,
  vel: number,
  P: VoiceParams,
  stroke?: 'ghost' | 'cross' | 'rim'
): void {
  const ctx = d.ctx;

  /* Rimshot: the stick hits the head and the rim together. It is the snare,
     louder and with more ring, and a hard, bright crack from the rim on top —
     not the cross-stick's wood, and not a louder hit. */
  if (stroke === 'rim') {
    snare(d, t, vel * 0.92, P);
    for (const [mult, peak] of [
      [4.1, 0.34],
      [6.3, 0.16],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = P.tune * mult * (1 + (d.rand() - 0.5) * 0.02);
      const g = mkEnv(d, t, vel * peak, 0.0004, P.decay * 0.9);
      o.connect(g);
      d.send(g, 's');
      o.start(t);
      o.stop(t + P.decay + 0.1);
    }
    const n = noiseSrc(d);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;
    n.connect(hp);
    const gn = mkEnv(d, t, vel * 0.42, 0.0003, 0.016);
    hp.connect(gn);
    d.send(gn, 's', 0.5);
    n.start(t);
    n.stop(t + 0.06);
    return;
  }

  /* Cross-stick: the stick lying across the head, its shoulder struck on the
     rim. What you hear is the rim's woodblock-ish pitch and the shell under
     it — almost none of the head and none of the wires, which is why turning
     the snare down does not make one. */
  if (stroke === 'cross') {
    for (const [mult, peak, type] of [
      [1, 0.55, 'triangle'],
      [2.72, 0.22, 'square'],
    ] as Array<[number, number, OscillatorType]>) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = P.tune * 3.6 * mult * (1 + (d.rand() - 0.5) * 0.02);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400;
      bp.Q.value = 1.6;
      o.connect(bp);
      const g = mkEnv(d, t, vel * peak * 0.5, 0.0006, 0.055);
      bp.connect(g);
      d.send(g, 's');
      o.start(t);
      o.stop(t + 0.16);
    }
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(P.tune * 1.1, t);
    o2.frequency.exponentialRampToValueAtTime(P.tune * 0.8, t + 0.05);
    const gs = mkEnv(d, t, vel * 0.18, 0.001, 0.045);
    o2.connect(gs);
    d.send(gs, 's');
    o2.start(t);
    o2.stop(t + 0.14);

    const n0 = noiseSrc(d);
    const hp0 = ctx.createBiquadFilter();
    hp0.type = 'highpass';
    hp0.frequency.value = 3800;
    n0.connect(hp0);
    const gn = mkEnv(d, t, vel * 0.12, 0.0004, 0.008);
    hp0.connect(gn);
    d.send(gn, 's', 0.4);
    n0.start(t);
    n0.stop(t + 0.05);
    return;
  }

  const ghost = stroke === 'ghost';
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
    const f = P.tune * mult * (1 + (d.rand() - 0.5) * 0.02);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.84, t + decay * 0.8);
    const g = mkEnv(d, t, vel * (1 - snap * 0.5) * peak * (ghost ? 0.5 : 1), 0.001, decay * 0.75);
    o.connect(g);
    d.send(g, 's');
    o.start(t);
    o.stop(t + decay + 0.1);
  }

  // snare wires — brighter and longer the harder it is hit
  const n = noiseSrc(d);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = ghost ? 2800 : 1500;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3200 + vel * 2400;
  bp.Q.value = 0.6;
  n.connect(hp);
  hp.connect(bp);
  const gN = mkEnv(
    d,
    t,
    vel * (0.42 + snap * 0.5) * (ghost ? 0.5 : 1),
    0.001,
    decay * (ghost ? 0.8 : 1.3)
  );
  bp.connect(gN);
  d.send(gN, 's');
  n.start(t);
  n.stop(t + decay * 1.7 + 0.1);

  // stick crack
  const n2 = noiseSrc(d);
  const hp2 = ctx.createBiquadFilter();
  hp2.type = 'highpass';
  hp2.frequency.value = 5800;
  n2.connect(hp2);
  const g3 = mkEnv(d, t, vel * 0.3 * (ghost ? 0.35 : 1), 0.0004, 0.009);
  hp2.connect(g3);
  d.send(g3, 's', 0.5);
  n2.start(t);
  n2.stop(t + 0.05);
}

/**
 * `pedal` is the foot closing the hats rather than a stick hitting them:
 * shorter, duller, with the pedal's own thump under it. Returns the tail of an
 * open or half-open hat, for the caller to choke.
 */
export function hat(
  d: Draw,
  t: number,
  vel: number,
  P: VoiceParams,
  stroke?: 'open' | 'pedal' | 'half'
): Tail | null {
  if (stroke === 'half') return halfHat(d, t, vel, P);
  const ctx = d.ctx;
  const pedal = stroke === 'pedal';
  const open = stroke === 'open';
  const dec = pedal ? Math.max(0.016, P.decay * 0.62) : open ? P.open : P.decay;
  const v = vel * (0.94 + d.rand() * 0.12);

  const g = metal(d, t, {
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
    const bg = mkEnv(d, t, v * 0.1, 0.001, 0.03);
    o.connect(bg);
    d.send(bg, 'h', 0.3);
    o.start(t);
    o.stop(t + 0.09);
  }
  return open ? { g, end: t + dec } : null;
}

/**
 * The cymbals pressed a little apart: a sizzle between the closed and open
 * sounds, more of the noise and less of the metal, ringing until the next
 * hat chokes it as an open one does.
 */
function halfHat(d: Draw, t: number, vel: number, P: VoiceParams): Tail {
  const dec = (P.decay + P.open) * 0.45;
  const v = vel * (0.94 + d.rand() * 0.12);
  const g = metal(d, t, {
    base: 208 * P.tune,
    hp: P.tone * 0.96,
    bp: 9200,
    q: 0.8,
    peak: v * 0.5,
    decay: dec,
    attack: 0.0006,
    voice: 'h',
    noise: { amt: 0.46, hp: P.tone * 1.05, decay: dec * 0.9 },
  });
  return { g, end: t + dec };
}

export function ride(d: Draw, t: number, vel: number, P: VoiceParams, bell?: boolean): void {
  const ctx = d.ctx;
  const dec = bell ? P.decay * 0.85 : P.decay;
  const v = vel * (0.94 + d.rand() * 0.12);

  metal(d, t, {
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
  const n = noiseSrc(d);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = bell ? 5000 : 3800;
  bp.Q.value = 1.5;
  n.connect(bp);
  const g = mkEnv(d, t, v * 0.26, 0.0004, bell ? 0.07 : 0.05);
  bp.connect(g);
  d.send(g, 'r', 0.5);
  n.start(t);
  n.stop(t + 0.14);

  if (bell) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 930 * P.tune;
    const g2 = mkEnv(d, t, v * 0.15, 0.002, dec * 0.8);
    o.connect(g2);
    d.send(g2, 'r');
    o.start(t);
    o.stop(t + dec + 0.1);
  }
}

/**
 * The crash lane's cymbals. A second crash is the first one smaller and a
 * little higher; a splash is small and short; a china is trashy — the wash
 * pushed into the mids, a fast bloom and a shorter, uneven ring.
 */
export function crash(
  d: Draw,
  t: number,
  vel: number,
  base: VoiceParams,
  cymbal?: 'c2' | 'cChina' | 'cSplash'
): void {
  const ctx = d.ctx;
  const shape = cymbal ? CYMBAL_SHAPE[cymbal] : null;
  const P = shape
    ? { ...base, tune: base.tune * shape.size, decay: base.decay * shape.ring }
    : base;
  if (cymbal === 'cChina') {
    china(d, t, vel, P);
    return;
  }

  // wash whose top end closes as it decays, the way a real cymbal damps
  const n = noiseSrc(d);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = P.tone * 0.8;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(14000, t);
  lp.frequency.exponentialRampToValueAtTime(3200, t + P.decay);
  n.connect(hp);
  hp.connect(lp);
  const g = mkEnv(d, t, vel * 0.24, 0.006, P.decay);
  lp.connect(g);
  d.send(g, 'c');
  n.start(t);
  n.stop(t + P.decay + 0.2);

  metal(d, t, {
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

function china(d: Draw, t: number, vel: number, P: VoiceParams): void {
  const ctx = d.ctx;
  const n = noiseSrc(d);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = P.tone * 1.1;
  bp.Q.value = 0.7;
  n.connect(bp);
  const g = mkEnv(d, t, vel * 0.3, 0.002, P.decay);
  bp.connect(g);
  d.send(g, 'c');
  n.start(t);
  n.stop(t + P.decay + 0.2);

  metal(d, t, {
    base: 236 * P.tune,
    hp: P.tone * 0.7,
    bp: P.tone * 1.3,
    q: 1.6,
    peak: vel * 0.16,
    decay: P.decay * 0.7,
    attack: 0.002,
    voice: 'c',
  });
}

/**
 * A tom is the snare's membrane without the wires: the same mode ratios, a
 * longer decay, and a pitch that falls a little as the head relaxes. Three
 * drums off one voice — the knob tunes the floor tom and the rack toms sit
 * above it, which is how you tune a kit.
 */
export function tom(d: Draw, t: number, vel: number, P: VoiceParams, lane: string): void {
  const ctx = d.ctx;
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
    const f = f0 * ratio * (1 + (d.rand() - 0.5) * 0.016);
    o.frequency.setValueAtTime(f * 1.14, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.028);
    o.frequency.exponentialRampToValueAtTime(f * 0.88, t + dec * 0.9);
    const g = mkEnv(d, t, vel * peak * 0.9, 0.0015, dec);
    o.connect(g);
    d.send(g, 't');
    o.start(t);
    o.stop(t + dec + 0.12);
  }

  const stick = P.tone ?? 0.35;
  if (stick > 0.01) {
    const n = noiseSrc(d);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 + stick * 3200;
    bp.Q.value = 0.9;
    n.connect(bp);
    const g = mkEnv(d, t, vel * stick * 0.3, 0.0004, 0.014);
    bp.connect(g);
    d.send(g, 't', 0.5);
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
export function perc(
  d: Draw,
  t: number,
  vel: number,
  P: VoiceParams,
  inst: string,
  accent?: boolean
): void {
  const ctx = d.ctx;
  const pitch = P.tune ?? 1;
  const bright = P.tone ?? 1;
  const v = vel * (P.level ?? 1);

  const tone = (freq: number, peak: number, dec: number, type: OscillatorType = 'triangle') => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq * pitch;
    const g = mkEnv(d, t, peak, 0.0008, dec);
    o.connect(g);
    d.send(g, 'p');
    o.start(t);
    o.stop(t + dec + 0.06);
  };

  const hiss = (lo: number, hi: number, peak: number, dec: number, at = 0) => {
    const n = noiseSrc(d);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = lo * bright;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = hi * bright;
    bp.Q.value = 0.7;
    n.connect(hp);
    hp.connect(bp);
    const g = mkEnv(d, t + at, peak, 0.0006, dec);
    bp.connect(g);
    d.send(g, 'p');
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
      const g = mkEnv(d, t, peak * mul, 0.0012, dec);
      o.connect(g);
      d.send(g, 'p');
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
      metal(d, t, {
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
        const g = mkEnv(d, t, v * (i ? 0.16 : 0.22), 0.001, accent ? 0.42 : 0.26);
        bp.connect(g);
        d.send(g, 'p');
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
        const g = mkEnv(d, t, v * (i ? 0.11 : 0.18), 0.001, 0.22);
        bp.connect(g);
        d.send(g, 'p');
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

/**
 * One kit slot, drawn: the voice and stroke that slot names. What a render
 * plays, and which voice's knobs it reads is `SLOT_BY_ID[slot].voice`.
 * False for a slot this does not draw — the percussion slots, which stay live.
 */
export function drawSlot(d: Draw, slot: string, t: number, vel: number, P: VoiceParams): boolean {
  switch (slot) {
    case 'k':
      kick(d, t, vel, P);
      return true;
    case 's':
      snare(d, t, vel, P);
      return true;
    case 'sGhost':
      snare(d, t, vel, P, 'ghost');
      return true;
    case 'sCross':
      snare(d, t, vel, P, 'cross');
      return true;
    case 'sRim':
      snare(d, t, vel, P, 'rim');
      return true;
    case 'h':
      hat(d, t, vel, P);
      return true;
    case 'hOpen':
      hat(d, t, vel, P, 'open');
      return true;
    case 'hFoot':
      hat(d, t, vel, P, 'pedal');
      return true;
    case 'hHalf':
      hat(d, t, vel, P, 'half');
      return true;
    case 'r':
      ride(d, t, vel, P);
      return true;
    case 'rBell':
      ride(d, t, vel, P, true);
      return true;
    case 'c':
      crash(d, t, vel, P);
      return true;
    case 'c2':
    case 'cChina':
    case 'cSplash':
      crash(d, t, vel, P, slot);
      return true;
    case 't1':
    case 't2':
    case 't3':
      tom(d, t, vel, P, slot);
      return true;
    default:
      return false;
  }
}
