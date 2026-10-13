import type { BreakAudio, SampleSource } from '@/lib/app/breaks/audio/engine';
import { type Layer, pickTake } from '@/lib/app/breaks/audio/packs';
import { type Draw, drawSlot } from '@/lib/app/breaks/audio/voices';
import { SLOT_BY_ID, type VoiceParams, kitEngine } from '@/lib/app/breaks/kit';
import { makeRng } from '@/lib/app/breaks/rng';

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
 *   velocity, and play at `vel`. A kit costs 8–15 MB rather than the 29–60 MB
 *   five layers of every slot would.
 * - **A take is seeded.** Its jitter, its noise and its ±1.5% pitch and ±5%
 *   decay come from a stream seeded by slot, layer and take, so a kit renders
 *   the same every time.
 * - **One room send per hit.** A render is the voice dry; the room is sent
 *   when it plays, at the voice's amount. Inside a voice the beater and the
 *   stick used to send less (×0.4, ×0.5); a render cannot.
 * - **A knob re-renders its voice only,** 150 ms after it stops moving. The
 *   voice's old render plays until the new one is ready, and the live graph
 *   plays before there is any. Another kit drops every render at once: the
 *   last kit's would be the wrong drums.
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

/** −80 dBFS: below this the end of a render is cut off, not kept as silence. */
const TAIL_FLOOR = 1e-4;

/** Makes the context a take is drawn into — injectable, so it tests without a browser. */
export type MakeOffline = (
  channels: number,
  length: number,
  sampleRate: number
) => OfflineAudioContext;

function browserOffline(): MakeOffline | null {
  if (typeof OfflineAudioContext === 'undefined') return null;
  return (channels, length, sampleRate) => new OfflineAudioContext(channels, length, sampleRate);
}

/**
 * What a voice's render depends on: its knobs but its room, which is sent
 * when it plays, and the rate it is rendered at. A voice whose signature has
 * not changed keeps its render.
 */
export function signature(P: VoiceParams, rate: number): string {
  const keys = Object.keys(P)
    .filter((k) => k !== 'room')
    .sort();
  return JSON.stringify([rate, keys.map((k) => [k, P[k]])]);
}

/** The layer rendered nearest a velocity, above or below it; the first on a tie. */
export function nearestLayer(layers: Layer[], vel: number): Layer {
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

/**
 * One take of one slot: its knobs strayed by the seed, drawn at `vel` into a
 * context of its own, rendered, and its silent end cut off. Null if the
 * browser would not render it, and the slot is one take short.
 */
export async function renderTake(
  make: MakeOffline,
  rate: number,
  slot: string,
  vel: number,
  P: VoiceParams,
  seed: number
): Promise<AudioBuffer | null> {
  const rand = makeRng(seed);
  const pitch = 1 + (rand() * 2 - 1) * PITCH_SPREAD;
  const ring = 1 + (rand() * 2 - 1) * DECAY_SPREAD;
  const at: VoiceParams = { ...P, tune: P.tune * pitch, decay: P.decay * ring };
  if (P.open !== undefined) at.open = P.open * ring;

  // longer than any voice rings: the snare's wires stop at 1.7× its decay
  const length = Math.ceil(rate * (Math.max(at.decay, at.open ?? 0) * 1.8 + 0.25));
  try {
    const ctx = make(1, length, rate);
    const noise = ctx.createBuffer(1, Math.min(length, rate * 2), rate);
    const n = noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = rand() * 2 - 1;
    const d: Draw = {
      ctx,
      noise,
      send: (node) => node.connect(ctx.destination),
      rand,
    };
    if (!drawSlot(d, slot, 0, vel, at)) return null;
    const out = await ctx.startRendering();
    return trimTail(ctx, out);
  } catch {
    return null;
  }
}

/** The render up to where it falls under {@link TAIL_FLOOR}, and a millisecond after. */
function trimTail(ctx: BaseAudioContext, buf: AudioBuffer): AudioBuffer {
  const d = buf.getChannelData(0);
  let last = d.length - 1;
  while (last > 0 && Math.abs(d[last]) < TAIL_FLOOR) last--;
  const keep = Math.min(d.length, last + 1 + Math.ceil(buf.sampleRate * 0.001));
  if (keep >= d.length) return buf;
  const out = ctx.createBuffer(1, keep, buf.sampleRate);
  out.getChannelData(0).set(d.subarray(0, keep));
  return out;
}

/** A voice's renders and the knobs they were drawn with. */
interface Rendered {
  sig: string;
  slots: Record<string, Layer[]>;
}

export class SynthSource implements SampleSource {
  /** The synthesised kit the renders are of, or null when none is picked. */
  private kitKey: string | null = null;
  /** What plays, by voice. */
  private readonly voices = new Map<string, Rendered>();
  /** The signature each voice is being rendered to, while it is. */
  private readonly wanted = new Map<string, string>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** The take each slot played last, so the next one differs. */
  private readonly lastTake = new Map<string, number>();

  constructor(
    private readonly onChange?: () => void,
    private readonly make: MakeOffline | null = browserOffline()
  ) {}

  /** Whether every voice of the kit playing has a render. */
  isReady(): boolean {
    return !!this.kitKey && Object.keys(RENDERED).every((v) => this.voices.has(v));
  }

  refresh(engine: BreakAudio): void {
    const kit = engine.kit;
    const key = kit && kitEngine(kit) === 'synth' && this.make ? kit.key : null;
    if (key !== this.kitKey) {
      this.drop();
      this.kitKey = key;
    }
    const ctx = engine.ctx;
    if (!key || !ctx) return;

    for (const voice of Object.keys(RENDERED)) {
      const P = engine.P(voice);
      const sig = signature(P, ctx.sampleRate);
      if (this.voices.get(voice)?.sig === sig) {
        // back where it was: whatever was on its way is not wanted now
        this.cancel(voice);
        continue;
      }
      if (this.wanted.get(voice) === sig) continue;
      this.cancel(voice);
      this.wanted.set(voice, sig);
      this.timers.set(
        voice,
        setTimeout(() => {
          this.timers.delete(voice);
          void this.render(engine, key, voice, P, ctx.sampleRate, sig);
        }, DEBOUNCE_MS)
      );
    }
  }

  /** Every render and every one on its way, let go. */
  private drop(): void {
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

  /**
   * Render every slot of one voice, and swap it in only if it is still the
   * render wanted: the kit has not changed, and no knob has moved since.
   */
  private async render(
    engine: BreakAudio,
    key: string,
    voice: string,
    P: VoiceParams,
    rate: number,
    sig: string
  ): Promise<void> {
    const make = this.make;
    // closed while it waited: there is nothing to play it into
    if (!make || !engine.ctx) {
      this.wanted.delete(voice);
      return;
    }
    const current = (): boolean => this.kitKey === key && this.wanted.get(voice) === sig;
    const slots: Record<string, Layer[]> = {};
    for (const slot of RENDERED[voice]) {
      const vels = SHAPED_BY_VELOCITY.has(slot) ? LAYERS : [1];
      const layers = await Promise.all(
        vels.map(async (v, li): Promise<Layer> => {
          const bufs = await Promise.all(
            Array.from({ length: VARIATIONS }, (_, i) =>
              renderTake(make, rate, slot, v, P, seedOf(slot, li, i))
            )
          );
          return { v, takes: bufs.flatMap((buf) => (buf ? [{ buf, off: 0 }] : [])) };
        })
      );
      if (!current()) return;
      slots[slot] = layers.filter((layer) => layer.takes.length > 0);
    }
    this.wanted.delete(voice);
    this.voices.set(voice, { sig, slots });
    this.onChange?.();
  }

  hit(engine: BreakAudio, t: number, slotId: string, vel: number): boolean {
    if (!this.kitKey || engine.kit?.key !== this.kitKey) return false;
    const slot = SLOT_BY_ID[slotId];
    if (!slot) return false;
    const layers = this.voices.get(slot.voice)?.slots[slotId];
    if (!layers?.length) return false;

    const layer = nearestLayer(layers, vel);
    const i = pickTake(layer.takes.length, this.lastTake.get(slotId), engine.rand);
    this.lastTake.set(slotId, i);
    const played = engine.playBuf(t, layer.takes[i].buf, vel / layer.v, slot.voice);
    if (slotId === 'hOpen' || slotId === 'hHalf') engine.noteHatTail(played);
    return true;
  }
}
