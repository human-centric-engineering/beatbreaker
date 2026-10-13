import { type Draw, type Tail, mkEnv, noiseSrc } from '@/lib/app/breaks/audio/voices';
import { DRIFT_MAP, type VoiceParams } from '@/lib/app/breaks/kit';

/**
 * The drum machines, built here (9-vi-e, `sound-plan.md` §8).
 *
 * No recording of an 808 or a 909 could be licensed, and the `@driftbox/engine`
 * the `drift` kits were declared against was never installed, so these are
 * voice models: the circuits' shapes in native nodes, drawn into a `Draw` as
 * the synthesised voices are, and rendered ahead by `SynthSource` the same way.
 *
 * - **A model and a table.** A model is a way of making a sound — an analog
 *   kick, a snare of two tones and noise, a hat of six square waves. A table
 *   is the ranges one machine's 0..1 knobs move it over. The 606 is the 808's
 *   models with its own tables, and the Linn-style kit the 909's.
 * - **A resonator is drawn as its ring.** The 808's kick and toms are a
 *   bridged-T network ringing after a trigger pulse: a damped sine with a
 *   little pitch drop, which is what is drawn, with the pulse's click as its
 *   own part. Drawn rather than filtered from an impulse, so its level does
 *   not move with the knobs.
 * - **The 909's hats and cymbals were samples** on the real machine. These
 *   are noise through resonant bands, and the kit's hint says so.
 *
 * Every model takes the voice's knobs and a velocity that is already a gain
 * — a machine has accent, not velocity — and returns the tail of an open hat
 * for the caller to choke.
 */

/** One machine voice: drawn at `t`, `vel` its level, `P` the lane's 0..1 knobs. */
export interface MachineVoice {
  draw: (d: Draw, t: number, vel: number, P: VoiceParams) => Tail | null;
  /** How long it rings at these knobs, seconds: how long a render of it is. */
  seconds: (P: VoiceParams) => number;
}

/** Past a voice's ring, for its oscillators' stop and the render's length. */
const PAST = 0.06;

/** A knob's 0..1, with a missing or broken one at the middle. */
function knob(P: VoiceParams, key: string): number {
  const v = P[key];
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5;
}

/** Across a range, evenly. */
function lin([a, b]: readonly [number, number], x: number): number {
  return a + (b - a) * x;
}

/** Across a range by ratio, as pitch and time are heard. */
function log([a, b]: readonly [number, number], x: number): number {
  return a * (b / a) ** x;
}

type Range = readonly [number, number];

/** A damped sine — a resonator's ring — with a drop in pitch at the start. */
function ring(
  d: Draw,
  t: number,
  o: { f: number; from: number; drop: number; peak: number; ring: number; voice: string }
): void {
  const osc = d.ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(o.f * o.from, t);
  osc.frequency.exponentialRampToValueAtTime(o.f, t + o.drop);
  const g = mkEnv(d, t, o.peak, 0.0008, o.ring);
  osc.connect(g);
  d.send(g, o.voice);
  osc.start(t);
  osc.stop(t + o.ring + 0.05);
}

/** A burst of filtered noise. */
function hiss(
  d: Draw,
  t: number,
  o: {
    type: BiquadFilterType;
    f: number;
    q?: number;
    peak: number;
    ring: number;
    voice: string;
    extra?: number;
  }
): GainNode {
  const n = noiseSrc(d);
  const f = d.ctx.createBiquadFilter();
  f.type = o.type;
  f.frequency.value = o.f;
  f.Q.value = o.q ?? 0.7;
  n.connect(f);
  const g = mkEnv(d, t, o.peak, 0.0005, o.ring);
  f.connect(g);
  d.send(g, o.voice, o.extra);
  n.start(t);
  n.stop(t + o.ring + 0.05);
  return g;
}

/** Soft saturation, for the colour knob: odd length, so silence stays silence. */
function saturate(d: Draw, drive: number): WaveShaperNode {
  const n = 513;
  const c = new Float32Array(new ArrayBuffer(n * Float32Array.BYTES_PER_ELEMENT));
  const a = Math.max(1, drive);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * a) / Math.tanh(a);
  }
  const ws = d.ctx.createWaveShaper();
  ws.curve = c;
  return ws;
}

/* ---- models ------------------------------------------------------------ */

interface KickTable {
  /** Hz, by the tune knob. */
  f: Range;
  /** Seconds it rings, by the decay knob. */
  ring: Range;
  /** How far above its note it starts, and how fast it gets there. */
  from: number;
  drop: number;
  /** The trigger's click, by the tone knob: its level and how bright. */
  click: Range;
  clickF: Range;
  /** Saturation, by the colour knob. */
  drive: Range;
}

/**
 * An analog kick: the ring, a click on top, through a little saturation.
 * The 808's barely drops in pitch and rings long; the 909's sweeps down hard
 * from a click and is shorter.
 */
function kick(tab: KickTable): MachineVoice {
  const seconds = (P: VoiceParams) => log(tab.ring, knob(P, 'decay')) + PAST;
  const draw: MachineVoice['draw'] = (d, t, vel, P) => {
    const f = log(tab.f, knob(P, 'tune'));
    const len = log(tab.ring, knob(P, 'decay'));
    const tone = knob(P, 'tone');
    const sat = saturate(d, lin(tab.drive, knob(P, 'colour')));
    // the ring and the click both go through the saturation, then out as one
    const into: Draw = {
      ...d,
      send: (node) => {
        node.connect(sat);
      },
    };
    ring(into, t, { f, from: tab.from, drop: tab.drop, peak: vel, ring: len, voice: 'k' });
    const click = lin(tab.click, tone);
    if (click > 0.01) {
      hiss(into, t, {
        type: 'lowpass',
        f: log(tab.clickF, tone),
        peak: vel * click,
        ring: 0.006,
        voice: 'k',
      });
    }
    const out = d.ctx.createGain();
    sat.connect(out);
    d.send(out, 'k');
    return null;
  };
  return { draw, seconds };
}

interface SnareTable {
  /** The lower tone, Hz, by tune; the upper is `ratio` above it. */
  f: Range;
  ratio: number;
  /** Seconds the tones ring, by decay. */
  ring: Range;
  /** The noise's level, by tone (the 808's Snappy). */
  snappy: Range;
  /** The noise's band, Hz, by colour. */
  noiseF: Range;
  /** Seconds the noise rings, against the tones'. */
  noiseRing: number;
  wave: OscillatorType;
}

/** Two tuned tones and a burst of noise: the 808's and 909's snare, and the 606's and Linn's from them. */
function snare(tab: SnareTable): MachineVoice {
  const seconds = (P: VoiceParams) =>
    log(tab.ring, knob(P, 'decay')) * Math.max(1, tab.noiseRing) + PAST;
  const draw: MachineVoice['draw'] = (d, t, vel, P) => {
    const f = log(tab.f, knob(P, 'tune'));
    const len = log(tab.ring, knob(P, 'decay'));
    for (const [mult, peak] of [
      [1, 0.62],
      [tab.ratio, 0.36],
    ] as const) {
      const osc = d.ctx.createOscillator();
      osc.type = tab.wave;
      osc.frequency.setValueAtTime(f * mult * 1.12, t);
      osc.frequency.exponentialRampToValueAtTime(f * mult, t + 0.018);
      const g = mkEnv(d, t, vel * peak, 0.0006, len * (mult === 1 ? 1 : 0.7));
      osc.connect(g);
      d.send(g, 's');
      osc.start(t);
      osc.stop(t + len + 0.05);
    }
    hiss(d, t, {
      type: 'highpass',
      f: log(tab.noiseF, knob(P, 'colour')),
      peak: vel * lin(tab.snappy, knob(P, 'tone')),
      ring: len * tab.noiseRing,
      voice: 's',
    });
    return null;
  };
  return { draw, seconds };
}

interface RimTable {
  /** Its two tones, Hz, by tune. */
  f: Range;
  ratio: number;
  ring: number;
}

/** A rim shot or sidestick: two short high tones and a click, gone in a few milliseconds. */
function rim(tab: RimTable): MachineVoice {
  const seconds = () => tab.ring + PAST;
  const draw: MachineVoice['draw'] = (d, t, vel, P) => {
    const f = log(tab.f, knob(P, 'tune'));
    for (const [mult, peak] of [
      [1, 0.4],
      [tab.ratio, 0.3],
    ] as const) {
      const osc = d.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f * mult;
      const g = mkEnv(d, t, vel * peak, 0.0003, tab.ring);
      osc.connect(g);
      d.send(g, 's');
      osc.start(t);
      osc.stop(t + tab.ring + 0.03);
    }
    hiss(d, t, { type: 'highpass', f: 4000, peak: vel * 0.25, ring: 0.004, voice: 's' });
    return null;
  };
  return { draw, seconds };
}

/** The 808's six square waves, Hz: the metal every 808 and 606 hat and cymbal is made from. */
const METAL_808 = [205.3, 304.4, 369.6, 522.7, 540, 800];

interface MetalTable {
  /** Scales the six frequencies, by tune. */
  size: Range;
  /** The two bands the metal is split through, Hz; colour mixes them. */
  bands: readonly [number, number];
  q: number;
  /** The highpass after, Hz, by tone. */
  hp: Range;
  /** Seconds it rings, by decay: shut and open. */
  closed: Range;
  open: Range;
  peak: number;
}

/**
 * An 808-family hat or cymbal: six square waves through two bandpasses
 * (about 3.4 and 7.1 kHz on the 808), then a highpass.
 */
function metalHat(tab: MetalTable, stroke: 'closed' | 'open'): MachineVoice {
  const seconds = (P: VoiceParams) =>
    log(stroke === 'open' ? tab.open : tab.closed, knob(P, 'decay')) + PAST;
  const draw: MachineVoice['draw'] = (d, t, vel, P) => {
    const ctx = d.ctx;
    const size = lin(tab.size, knob(P, 'tune'));
    const len = log(stroke === 'open' ? tab.open : tab.closed, knob(P, 'decay'));
    const mix = knob(P, 'colour');
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = log(tab.hp, knob(P, 'tone'));
    const g = mkEnv(d, t, vel * tab.peak, 0.0005, len);
    hp.connect(g);
    d.send(g, 'h');
    tab.bands.forEach((band, i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = band;
      bp.Q.value = tab.q;
      const level = ctx.createGain();
      level.gain.value = i === 0 ? 1 - mix * 0.7 : 0.3 + mix * 0.7;
      bp.connect(level);
      level.connect(hp);
      for (const f of METAL_808) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = f * size;
        osc.connect(bp);
        osc.start(t);
        osc.stop(t + len + 0.05);
      }
    });
    return stroke === 'open' ? { g, end: t + len } : null;
  };
  return { draw, seconds };
}

interface NoiseHatTable {
  /** Its two resonant bands, Hz, scaled by tune. */
  bands: readonly [number, number];
  size: Range;
  q: number;
  /** The highpass after, Hz, by tone. */
  hp: Range;
  closed: Range;
  open: Range;
  peak: number;
}

/**
 * A 909-family hat: noise through two resonant bands and a highpass. The
 * real 909's hats were 6-bit samples; this is an approximation of them.
 */
function noiseHat(tab: NoiseHatTable, stroke: 'closed' | 'open'): MachineVoice {
  const seconds = (P: VoiceParams) =>
    log(stroke === 'open' ? tab.open : tab.closed, knob(P, 'decay')) + PAST;
  const draw: MachineVoice['draw'] = (d, t, vel, P) => {
    const ctx = d.ctx;
    const size = log(tab.size, knob(P, 'tune'));
    const len = log(stroke === 'open' ? tab.open : tab.closed, knob(P, 'decay'));
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = log(tab.hp, knob(P, 'tone'));
    const g = mkEnv(d, t, vel * tab.peak, 0.0004, len);
    hp.connect(g);
    d.send(g, 'h');
    const n = noiseSrc(d);
    for (const band of tab.bands) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = band * size;
      bp.Q.value = tab.q * (0.6 + knob(P, 'colour') * 0.8);
      n.connect(bp);
      bp.connect(hp);
    }
    n.start(t);
    n.stop(t + len + 0.05);
    return stroke === 'open' ? { g, end: t + len } : null;
  };
  return { draw, seconds };
}

interface CymbalTable {
  /** Metal's base, Hz, by tune; the 909-family ratios above it. */
  base: Range;
  /** The noise's band, Hz, by tone. */
  band: Range;
  /** Seconds it rings, by decay. */
  ring: Range;
  /** How much is noise against metal, by colour. */
  noise: Range;
  peak: number;
  /** The stick's ping, for a ride. */
  ping: number;
  voice: 'r' | 'c';
}

/** Inharmonic ratios for the 909-family cymbals, above the base. */
const METAL_909 = [1, 1.483, 1.932, 2.546, 2.63, 3.897];

/** A 909-family ride or crash: metal and noise through a band, a long ring. Samples on the real 909. */
function cymbal(tab: CymbalTable): MachineVoice {
  const seconds = (P: VoiceParams) => log(tab.ring, knob(P, 'decay')) + PAST;
  const draw: MachineVoice['draw'] = (d, t, vel, P) => {
    const ctx = d.ctx;
    const base = log(tab.base, knob(P, 'tune'));
    const band = log(tab.band, knob(P, 'tone'));
    const len = log(tab.ring, knob(P, 'decay'));
    const noise = lin(tab.noise, knob(P, 'colour'));

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = band;
    bp.Q.value = 0.9;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = band * 0.6;
    bp.connect(hp);
    const g = mkEnv(d, t, vel * tab.peak * (1 - noise * 0.5), 0.002, len);
    hp.connect(g);
    d.send(g, tab.voice);
    for (const r of METAL_909) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = base * r;
      osc.connect(bp);
      osc.start(t);
      osc.stop(t + len + 0.05);
    }
    hiss(d, t, {
      type: 'bandpass',
      f: band * 1.4,
      q: 0.6,
      peak: vel * tab.peak * noise,
      ring: len * 0.7,
      voice: tab.voice,
    });
    if (tab.ping > 0) {
      hiss(d, t, {
        type: 'bandpass',
        f: band * 0.9,
        q: 1.5,
        peak: vel * tab.ping,
        ring: 0.04,
        voice: tab.voice,
        extra: 0.5,
      });
    }
    return null;
  };
  return { draw, seconds };
}

interface TomTable {
  /** How far each tom sits above the floor's `t.tune` Hz. */
  mult: number;
  /** Its ring against `t.decay` seconds. */
  ring: number;
  from: number;
  drop: number;
  /** Noise under it, by `t.tone`. */
  noise: number;
}

/** A tom: a ring with a pitch drop and a little noise. Its knobs are the synth's Hz and seconds (`SYNTH_ONLY`). */
/** A tom's knobs, Hz and seconds, with the synth tom's defaults for one missing. */
function tomKnobs(P: VoiceParams): { tune: number; decay: number } {
  const ok = (v: number | undefined): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v > 0;
  return { tune: ok(P.tune) ? P.tune : 90, decay: ok(P.decay) ? P.decay : 0.5 };
}

function tom(tab: TomTable): MachineVoice {
  const seconds = (P: VoiceParams) => tomKnobs(P).decay * tab.ring + PAST;
  const draw: MachineVoice['draw'] = (d, t, vel, P) => {
    const { tune, decay } = tomKnobs(P);
    const f = tune * tab.mult;
    const len = decay * tab.ring;
    ring(d, t, { f, from: tab.from, drop: tab.drop, peak: vel * 0.9, ring: len, voice: 't' });
    const stick = typeof P.tone === 'number' ? P.tone : 0.35;
    if (stick > 0.01) {
      hiss(d, t, {
        type: 'bandpass',
        f: f * 6,
        peak: vel * stick * tab.noise,
        ring: Math.min(0.08, len * 0.3),
        voice: 't',
        extra: 0.5,
      });
    }
    return null;
  };
  return { draw, seconds };
}

/* ---- tables ------------------------------------------------------------ */

const KICK_808: KickTable = {
  f: [42, 64],
  ring: [0.15, 1.6],
  from: 1.35,
  drop: 0.012,
  click: [0, 0.35],
  clickF: [900, 4000],
  drive: [1, 2.6],
};
const KICK_909: KickTable = {
  f: [44, 68],
  ring: [0.14, 1],
  from: 4.2,
  drop: 0.05,
  click: [0.08, 0.6],
  clickF: [2500, 9000],
  drive: [1.2, 3.2],
};
const KICK_606: KickTable = {
  ...KICK_808,
  f: [52, 78],
  ring: [0.08, 0.5],
  from: 1.5,
  click: [0.05, 0.4],
};
const KICK_LINN: KickTable = {
  ...KICK_909,
  f: [48, 70],
  ring: [0.12, 0.6],
  from: 2.2,
  drop: 0.03,
  click: [0.1, 0.45],
};

const SNARE_808: SnareTable = {
  f: [150, 230],
  ratio: 1.8,
  ring: [0.08, 0.3],
  snappy: [0.15, 0.9],
  noiseF: [1200, 4500],
  noiseRing: 1.1,
  wave: 'sine',
};
const SNARE_909: SnareTable = {
  f: [160, 250],
  ratio: 1.75,
  ring: [0.07, 0.28],
  snappy: [0.2, 1],
  noiseF: [1800, 6500],
  noiseRing: 1.4,
  wave: 'triangle',
};
const SNARE_606: SnareTable = { ...SNARE_808, f: [180, 260], snappy: [0.35, 1.05], noiseRing: 1.2 };
const SNARE_LINN: SnareTable = { ...SNARE_909, f: [150, 220], ring: [0.1, 0.36], noiseRing: 1.6 };

const RIM_808: RimTable = { f: [440, 520], ratio: 3.7, ring: 0.018 };
const RIM_909: RimTable = { f: [480, 600], ratio: 3.4, ring: 0.022 };
const SIDESTICK_LINN: RimTable = { f: [360, 460], ratio: 2.6, ring: 0.035 };

const HATS_808: MetalTable = {
  size: [0.85, 1.2],
  bands: [3440, 7100],
  q: 2.4,
  hp: [5000, 9000],
  closed: [0.03, 0.09],
  open: [0.2, 0.9],
  peak: 0.5,
};
const HATS_606: MetalTable = {
  ...HATS_808,
  bands: [4000, 8500],
  closed: [0.025, 0.06],
  open: [0.15, 0.6],
};
const CYMBAL_606: MetalTable = {
  ...HATS_808,
  bands: [3000, 6200],
  q: 1.4,
  hp: [3200, 6500],
  open: [0.8, 2.6],
  peak: 0.42,
};

const HATS_909: NoiseHatTable = {
  bands: [8200, 11800],
  size: [0.85, 1.15],
  q: 1.4,
  hp: [6000, 9500],
  closed: [0.035, 0.1],
  open: [0.18, 0.75],
  peak: 0.9,
};
const HATS_LINN: NoiseHatTable = { ...HATS_909, bands: [7400, 10600], closed: [0.04, 0.12] };

const RIDE_909: CymbalTable = {
  base: [300, 420],
  band: [4500, 8000],
  ring: [0.8, 3.2],
  noise: [0.2, 0.6],
  peak: 0.22,
  ping: 0.18,
  voice: 'r',
};
const CRASH_909: CymbalTable = {
  base: [240, 340],
  band: [3500, 6500],
  ring: [1, 3.6],
  noise: [0.45, 0.85],
  peak: 0.32,
  ping: 0,
  voice: 'c',
};
const RIDE_LINN: CymbalTable = { ...RIDE_909, base: [340, 460], ring: [1, 3.4] };
const CRASH_LINN: CymbalTable = { ...CRASH_909, ring: [1.2, 3.8] };

const TOM_808 = (mult: number): TomTable => ({
  mult,
  ring: 1.1,
  from: 1.12,
  drop: 0.03,
  noise: 0.15,
});
const TOM_909 = (mult: number): TomTable => ({
  mult,
  ring: 0.9,
  from: 1.5,
  drop: 0.06,
  noise: 0.3,
});

/** The 606's cymbal, on whichever lane plays it. */
function asCrash(voice: MachineVoice): MachineVoice {
  return {
    seconds: voice.seconds,
    draw: (d, t, vel, P) => voice.draw({ ...d, send: (n, _v, e) => d.send(n, 'c', e) }, t, vel, P),
  };
}

/**
 * Every machine voice, by the id `DRIFT_MAP` names. A 606 or Linn-style
 * voice is an 808 or 909 model with its own table.
 */
export const MACHINE_VOICES: Record<string, MachineVoice> = {
  '808.bd': kick(KICK_808),
  '808.sd': snare(SNARE_808),
  '808.rs': rim(RIM_808),
  '808.ch': metalHat(HATS_808, 'closed'),
  '808.oh': metalHat(HATS_808, 'open'),
  '808.lt': tom(TOM_808(1)),
  '808.mt': tom(TOM_808(1.33)),
  '808.ht': tom(TOM_808(1.7)),

  '909.bd': kick(KICK_909),
  '909.sd': snare(SNARE_909),
  '909.rs': rim(RIM_909),
  '909.ch': noiseHat(HATS_909, 'closed'),
  '909.oh': noiseHat(HATS_909, 'open'),
  '909.rd': cymbal(RIDE_909),
  '909.cr': cymbal(CRASH_909),
  '909.lt': tom(TOM_909(1)),
  '909.mt': tom(TOM_909(1.3)),
  '909.ht': tom(TOM_909(1.62)),

  '606.bd': kick(KICK_606),
  '606.sd': snare(SNARE_606),
  '606.ch': metalHat(HATS_606, 'closed'),
  '606.oh': metalHat(HATS_606, 'open'),
  '606.cy': asCrash(metalHat(CYMBAL_606, 'open')),
  '606.lt': tom(TOM_808(1.15)),
  '606.mt': tom(TOM_808(1.4)),
  '606.ht': tom(TOM_808(1.7)),

  'linn.bd': kick(KICK_LINN),
  'linn.sd': snare(SNARE_LINN),
  'linn.ss': rim(SIDESTICK_LINN),
  'linn.ch': noiseHat(HATS_LINN, 'closed'),
  'linn.oh': noiseHat(HATS_LINN, 'open'),
  'linn.rd': cymbal(RIDE_LINN),
  'linn.cr': cymbal(CRASH_LINN),
  'linn.lt': tom(TOM_909(1)),
  'linn.mt': tom(TOM_909(1.28)),
  'linn.ht': tom(TOM_909(1.6)),
};

/** The voice a machine plays a slot with, or none: the slot then falls back as a pack's does. */
export function machineVoice(machine: string | undefined, slot: string): MachineVoice | null {
  const id = machine ? DRIFT_MAP[machine]?.[slot] : undefined;
  return (id && MACHINE_VOICES[id]) || null;
}

/** Whether a machine has a slot of its own. */
export function machineHas(machine: string | undefined, slot: string): boolean {
  return machineVoice(machine, slot) !== null;
}

/**
 * Draw one slot of a machine. Undefined when the machine has no such slot;
 * otherwise the tail of an open hat, or null.
 */
export function drawMachineSlot(
  d: Draw,
  machine: string | undefined,
  slot: string,
  t: number,
  vel: number,
  P: VoiceParams
): Tail | null | undefined {
  const voice = machineVoice(machine, slot);
  return voice ? voice.draw(d, t, vel, P) : undefined;
}

/**
 * What a machine hit is turned up or down by, besides its velocity: the
 * lane's Level and the kit's trim. Applied as a gain, live and to a render
 * when it plays, so moving Level re-renders nothing.
 */
export function machineGain(trim: number | undefined, P: VoiceParams): number {
  const level = typeof P.level === 'number' && Number.isFinite(P.level) ? P.level : 1;
  return level * (trim ?? 1);
}
