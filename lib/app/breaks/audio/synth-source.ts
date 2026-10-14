import type { BreakAudio, SampleSource } from '@/lib/app/breaks/audio/engine';
import { type MakeOffline, browserOffline } from '@/lib/app/breaks/audio/offline';
import { pickTake } from '@/lib/app/breaks/audio/packs';
import { machineGain, machineHas, machineVoice } from '@/lib/app/breaks/audio/machines';
import { type Draw, drawSlot } from '@/lib/app/breaks/audio/voices';
import { SLOT_BY_ID, type VoiceParams, kitEngine } from '@/lib/app/breaks/kit';
import { makeRng } from '@/lib/app/breaks/rng';
import { logger } from '@/lib/logging';

/**
 * The synthesised kits, rendered ahead (9-vi-d, `sound-plan.md` §8).
 *
 * When a synthesised kit is picked, each of its voices is drawn into an
 * `OfflineAudioContext` by the same code that plays it live (`voices.ts`), a
 * few takes of every slot, and from then on a hit is one buffer through the
 * sampler path: one source node where the live graph builds ten to twenty, and
 * a choice of takes, as a recorded kit has, so no two hits in a row are the
 * same one.
 *
 * - **Velocity layers only where velocity changes the sound.** Of the drawn
 *   voices, only the snare's does: its wires' band rises with the hit. Every
 *   other voice's velocity is a gain on each of its parts, so a softer render
 *   is the full one, quieter, exactly. Those slots render once, at full
 *   velocity, and play at `vel`. A kit costs 12–24 MB (with the room
 *   channels below) rather than the 29–60 MB five mono layers of every slot
 *   would.
 * - **A take is seeded.** Its jitter and its ±1.5% pitch and ±5% decay come
 *   from a stream seeded by slot, layer and take, and its noise from one of
 *   three seeded buffers, so a kit renders the same every time.
 * - **The room is sent when a take plays.** A voice whose beater or stick
 *   sends less room than the drum (×0.4, ×0.5) renders two channels, the dry
 *   voice and its room send, and `playTake` splits them. One whose parts all
 *   send alike renders one.
 * - **One voice renders at a time,** a layer's takes together, so picking a
 *   kit does not build ninety graphs in one burst on the thread the transport
 *   schedules from.
 * - **A knob re-renders its voice only,** 150 ms after it stops moving. Until
 *   the new render lands, the voice plays live, so what you hear is where the
 *   knob is. Another kit drops every render at once, and plays live until its
 *   own land.
 * - **A voice that will not render plays live,** and says so in the log: one
 *   that would ring longer than {@link MAX_RENDER_S}, or one the browser
 *   would not render. So does every voice in a browser without
 *   `OfflineAudioContext`.
 *
 * The drum machines (9-vi-e) render the same way, from `machines.ts`: only
 * the slots each machine has, one layer each (a machine has accent, not
 * velocity), takes that differ only in their noise, and the lane's Level and
 * the kit's trim applied when a take plays.
 *
 * Percussion stays live: it is shared by every kit, and a recorded perc plays
 * first anyway.
 */

/** The slots each voice renders: every kit slot the synth draws. */
export const RENDERED: Record<string, readonly string[]> = {
  k: ['k'],
  s: ['s', 'sGhost', 'sCross', 'sRim'],
  h: ['h', 'hOpen', 'hFoot', 'hHalf'],
  r: ['r', 'rBell'],
  c: ['c', 'c2', 'cChina', 'cSplash'],
  t: ['t1', 't2', 't3'],
};

/** The slots a voice renders: all of them for the synth, those a machine has for a machine. */
function slotsOf(voice: string, machine: string | undefined): readonly string[] {
  if (machine === undefined) return RENDERED[voice];
  return RENDERED[voice].filter((slot) => machineHas(machine, slot));
}

/** The velocities a slot whose sound changes with velocity is rendered at. */
export const LAYERS: readonly number[] = [0.2, 0.4, 0.6, 0.8, 1];

/** The slots that are — the snare strokes with wires under them. See the header. */
const SHAPED_BY_VELOCITY: ReadonlySet<string> = new Set(['s', 'sGhost', 'sRim']);

/** Takes of every layer. */
export const VARIATIONS = 3;

/** How far a take's pitch and decay stray from the knob, either way. */
const PITCH_SPREAD = 0.015;
const DECAY_SPREAD = 0.05;

/** How long a knob must be still before its voice re-renders. */
export const DEBOUNCE_MS = 150;

/** The longest a take may be. A voice that rings longer plays live. */
export const MAX_RENDER_S = 8;

/** The decay a render is sized for when the knobs give none — the toms' own default. */
const DEFAULT_DECAY = 0.5;

/** −80 dBFS: below this the end of a render is cut off, not kept as silence. */
const TAIL_FLOOR = 1e-4;

/** Seconds of noise in each of the shared noise buffers. */
const NOISE_S = 2;

/**
 * What a voice's render depends on: its knobs but its room, which is sent
 * when it plays, and the rate it is rendered at. A voice whose signature has
 * not changed keeps its render. A machine's Level is a gain when it plays,
 * too, so it is left out with the room.
 */
export function signature(
  P: VoiceParams,
  rate: number,
  playback: readonly string[] = ['room']
): string {
  const keys = Object.keys(P)
    .filter((k) => !playback.includes(k))
    .sort();
  return JSON.stringify([rate, keys.map((k) => [k, P[k]])]);
}

/** The layer rendered nearest a velocity, above or below it; the first on a tie. */
export function nearestLayer<L extends { v: number }>(layers: L[], vel: number): L {
  let best = layers[0];
  for (const layer of layers) if (Math.abs(layer.v - vel) < Math.abs(best.v - vel)) best = layer;
  return best;
}

/** A take's seed: the same slot, layer and take always draw the same. */
function seedOf(slot: string, layer: number, take: number): number {
  const s = `${slot}:${layer}:${take}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function finite(v: number | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * How long a take of these knobs is rendered for: longer than any voice
 * rings. A missing or zero decay sizes it as the toms' default does, which is
 * what the tom voice plays with.
 */
export function renderSeconds(P: VoiceParams): number {
  const decay = finite(P.decay) && P.decay > 0 ? P.decay : DEFAULT_DECAY;
  const open = finite(P.open) ? P.open : 0;
  // the snare's wires stop at 1.7× its decay, the floor tom at 1.18×
  return Math.max(decay, open) * 1.8 + 0.25;
}

/** Seeded white noise, for the voices' noise sources. */
export function seededNoise(ctx: BaseAudioContext, rate: number, seed: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(rate * NOISE_S), rate);
  const d = buf.getChannelData(0);
  const rand = makeRng(seed);
  for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1;
  return buf;
}

/**
 * One take of one slot: its knobs strayed by the seed, drawn at `vel` into a
 * context of its own, rendered, and its silent end cut off. Null for a slot
 * the synth (or `machine`) does not draw, or a take longer than
 * {@link MAX_RENDER_S}. Rejects if the browser will not render it.
 *
 * A machine's take is not strayed: a drum machine is the same every hit, and
 * its takes differ only in their noise.
 *
 * Two channels come back when some part of the voice sends the room a
 * different amount from the rest: channel 0 is the voice, channel 1 what it
 * sends to the room. One channel when the two would be the same.
 */
export async function renderTake(
  make: MakeOffline,
  rate: number,
  slot: string,
  vel: number,
  P: VoiceParams,
  seed: number,
  noise?: (ctx: BaseAudioContext) => AudioBuffer,
  machine?: string
): Promise<AudioBuffer | null> {
  const rand = makeRng(seed);
  const voice = machine ? machineVoice(machine, slot) : null;
  if (machine && !voice) return null;
  let at = P;
  if (!voice) {
    const pitch = 1 + (rand() * 2 - 1) * PITCH_SPREAD;
    const ring = 1 + (rand() * 2 - 1) * DECAY_SPREAD;
    at = { ...P, tune: P.tune * pitch, decay: P.decay * ring };
    if (P.open !== undefined) at.open = P.open * ring;
  }

  const seconds = voice ? voice.seconds(at) : renderSeconds(at);
  if (!(seconds <= MAX_RENDER_S)) return null;
  const ctx = make(2, Math.ceil(rate * seconds), rate);
  const merger = ctx.createChannelMerger(2);
  merger.connect(ctx.destination);
  let split = false;
  const d: Draw = {
    ctx,
    noise: noise ? noise(ctx) : seededNoise(ctx, rate, seed),
    send: (node, _voice, extra) => {
      node.connect(merger, 0, 0);
      if (extra === undefined || extra === 1) {
        node.connect(merger, 0, 1);
        return;
      }
      split = true;
      const tap = ctx.createGain();
      tap.gain.value = extra;
      node.connect(tap);
      tap.connect(merger, 0, 1);
    },
    rand,
  };
  if (voice) voice.draw(d, 0, vel, at);
  else if (!drawSlot(d, slot, 0, vel, at)) return null;
  const out = await ctx.startRendering();
  return keep(ctx, out, split ? 2 : 1);
}

/**
 * The first `channels` of the render, up to where every one of them is under
 * {@link TAIL_FLOOR}, and a millisecond after.
 */
function keep(ctx: BaseAudioContext, buf: AudioBuffer, channels: number): AudioBuffer {
  const data = Array.from({ length: channels }, (_, c) => buf.getChannelData(c));
  let last = 0;
  for (const d of data) {
    let i = d.length - 1;
    while (i > last && Math.abs(d[i]) < TAIL_FLOOR) i--;
    last = Math.max(last, i);
  }
  const length = Math.min(buf.length, last + 1 + Math.ceil(buf.sampleRate * 0.001));
  const out = ctx.createBuffer(channels, length, buf.sampleRate);
  data.forEach((d, c) => out.getChannelData(c).set(d.subarray(0, length)));
  return out;
}

/** One velocity layer of a rendered slot. */
interface Layer {
  v: number;
  takes: AudioBuffer[];
}

/** A voice's renders and the knobs they were drawn with. */
interface Rendered {
  sig: string;
  slots: Record<string, Layer[]>;
}

export class SynthSource implements SampleSource {
  /** The synthesised kit the renders are of, or null when none is picked. */
  private kitKey: string | null = null;
  /** Bumped whenever every render is let go, so one already on its way is not installed. */
  private gen = 0;
  /** What plays, by voice. */
  private readonly voices = new Map<string, Rendered>();
  /** The signature each voice is being rendered to, while it is. */
  private readonly wanted = new Map<string, string>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** The take each slot played last, so the next one differs. */
  private readonly lastTake = new Map<string, number>();
  /** The renders, one voice after another. */
  private queue: Promise<void> = Promise.resolve();
  /** One seeded noise buffer per take and rate, shared by every render. */
  private readonly noises = new Map<string, AudioBuffer>();

  constructor(
    private readonly onChange?: () => void,
    private readonly make: MakeOffline | null = browserOffline()
  ) {}

  refresh(engine: BreakAudio): void {
    const kit = engine.kit;
    const engineOf = kitEngine(kit);
    const renders = engineOf === 'synth' || engineOf === 'drift';
    const key = kit && renders && this.make ? kit.key : null;
    if (key !== this.kitKey) {
      this.drop();
      this.kitKey = key;
    }
    const ctx = engine.ctx;
    if (!key || !ctx) return;

    const machine = engineOf === 'drift' ? (kit?.machine ?? '') : undefined;
    for (const voice of Object.keys(RENDERED)) {
      const slots = slotsOf(voice, machine);
      if (!slots.length) continue;
      const P = engine.knobs(voice);
      const rate = ctx.sampleRate;
      const sig = signature(P, rate, machine === undefined ? ['room'] : ['room', 'level']);
      if (this.voices.get(voice)?.sig === sig) {
        // back where it was: whatever was on its way is not wanted now
        this.cancel(voice);
        continue;
      }
      if (this.wanted.get(voice) === sig) continue;
      this.cancel(voice);
      this.wanted.set(voice, sig);
      const gen = this.gen;
      this.timers.set(
        voice,
        setTimeout(() => {
          this.timers.delete(voice);
          this.queue = this.queue.then(() =>
            this.render(gen, key, voice, slots, machine, P, rate, sig)
          );
        }, DEBOUNCE_MS)
      );
    }
  }

  /** The engine is closed: let go of everything, and render nothing more. */
  dispose(): void {
    this.drop();
    this.kitKey = null;
  }

  /** Every render and every one on its way, let go. */
  private drop(): void {
    this.gen++;
    for (const voice of [...this.timers.keys()]) this.cancel(voice);
    this.wanted.clear();
    this.voices.clear();
    this.lastTake.clear();
  }

  private cancel(voice: string): void {
    const timer = this.timers.get(voice);
    if (timer !== undefined) clearTimeout(timer);
    this.timers.delete(voice);
    this.wanted.delete(voice);
  }

  /** Take `take`'s noise at `rate`, made once from the first context that asks. */
  private noise(take: number, rate: number): (ctx: BaseAudioContext) => AudioBuffer {
    return (ctx) => {
      const key = `${rate}:${take}`;
      let buf = this.noises.get(key);
      if (!buf) {
        buf = seededNoise(ctx, rate, 0x6e015e + take);
        this.noises.set(key, buf);
      }
      return buf;
    };
  }

  /**
   * Render every slot of one voice, a layer at a time, and swap it in only
   * if it is still the render wanted: nothing has been let go since it was
   * asked for, and no knob has moved.
   */
  private async render(
    gen: number,
    key: string,
    voice: string,
    slotIds: readonly string[],
    machine: string | undefined,
    P: VoiceParams,
    rate: number,
    sig: string
  ): Promise<void> {
    const make = this.make;
    const current = (): boolean => this.gen === gen && this.wanted.get(voice) === sig;
    if (!make || !current()) return;

    const slots: Record<string, Layer[]> = {};
    const live: string[] = [];
    for (const slot of slotIds) {
      const vels = machine === undefined && SHAPED_BY_VELOCITY.has(slot) ? LAYERS : [1];
      const layers: Layer[] = [];
      let why = 'longer than a render';
      for (const [li, v] of vels.entries()) {
        const bufs = await Promise.all(
          Array.from({ length: VARIATIONS }, (_, i) =>
            renderTake(
              make,
              rate,
              slot,
              v,
              P,
              seedOf(slot, li, i),
              this.noise(i, rate),
              machine
            ).catch((err: unknown) => {
              why = err instanceof Error ? err.message : String(err);
              return null;
            })
          )
        );
        if (!current()) return;
        const takes = bufs.filter((buf): buf is AudioBuffer => buf !== null);
        if (takes.length) layers.push({ v, takes });
      }
      if (layers.length) slots[slot] = layers;
      else live.push(`${slot}: ${why}`);
    }
    this.wanted.delete(voice);
    this.voices.set(voice, { sig, slots });
    if (live.length) {
      logger.warn('Synth kit: slots that did not render play live', { kit: key, voice, live });
    }
    this.onChange?.();
  }

  hit(engine: BreakAudio, t: number, slotId: string, vel: number): boolean {
    if (!this.kitKey || engine.kit?.key !== this.kitKey) return false;
    const slot = SLOT_BY_ID[slotId];
    if (!slot) return false;
    // re-rendering: the live voice is where the knob is now
    if (this.wanted.has(slot.voice)) return false;
    const rendered = this.voices.get(slot.voice)?.slots;
    const kit = engine.kit;
    const machine = kitEngine(kit) === 'drift' ? kit?.machine : undefined;
    /* A slot this machine does not have plays its `fall`, as a pack's does.
       One that did not render — the synth's, or a machine's own — plays live. */
    const layers = rendered?.[slotId]?.length
      ? rendered[slotId]
      : slot.fall && machine !== undefined && !machineHas(machine, slotId)
        ? rendered?.[slot.fall]
        : undefined;
    if (!layers?.length) return false;

    const layer = nearestLayer(layers, vel);
    const i = pickTake(layer.takes.length, this.lastTake.get(slotId), engine.rand);
    this.lastTake.set(slotId, i);
    const gain = machine !== undefined ? machineGain(kit?.trim, engine.knobs(slot.voice)) : 1;
    const played = engine.playTake(t, layer.takes[i], (vel / layer.v) * gain, slot.voice);
    if (slotId === 'hOpen' || slotId === 'hHalf') engine.noteHatTail(played);
    return true;
  }
}
