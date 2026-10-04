import type { BreakAudio, SampleSource } from '@/lib/app/breaks/audio/engine';
import { type KitSampleSlot, SLOT_BY_ID, slotLayers, slotTrim } from '@/lib/app/breaks/kit';
import { clamp } from '@/lib/app/breaks/rng';

/**
 * The recorded kits.
 *
 * The prototype shipped these as base64 mp3 inline in the page, because a
 * preview frame has nowhere to put a file. Here they are real files under
 * `public/kits/`, fetched and decoded on first use: the browser caches them, a
 * kit you never pick costs nothing, and they are out of the JS bundle entirely.
 *
 * Lanes with several velocity layers pick the sample recorded nearest how hard
 * the note is and use gain for the remainder — which is why a layer that fails
 * to decode is dropped rather than fatal. One layer short is still a kit.
 *
 * A layer can hold several round-robins: the same stroke recorded more than
 * once (Phase 9). {@link pickTake} chooses among them so a run of sixteenths
 * is not one sample played sixteen times.
 *
 * **Two passes.** A kit decodes the first round-robin of every layer, and
 * plays from that; the rest decode when the page is idle and join their
 * layers as they land. A kit with three takes a layer is about a third of the
 * bytes before it can play. **Two kits stay decoded** — the one playing and
 * the one before it, so switching back is instant — and the oldest beyond
 * that is let go, because iOS Safari kills a page for decoded-audio memory.
 */

/** One decoded recording, with the offset playback should start at. */
export interface Take {
  buf: AudioBuffer;
  /** Seconds of encoder padding to skip. See {@link onsetOf}. */
  off: number;
}

/** One velocity layer: its round-robins, at the velocity they were recorded at. */
export interface Layer {
  /** The velocity this layer was recorded at, 0–1. */
  v: number;
  takes: Take[];
}

/** A different stick, a hair off the same spot: up to this many cents either way. */
const DETUNE_CENTS = 8;
/** And up to this much louder or softer, in dB. */
const WOBBLE_DB = 0.5;
/**
 * Below this many layers, a note between two of them is darkened as well as
 * turned down. With three recordings a soft hit is the medium layer, quieter,
 * and still as bright as the medium layer — which is not how a drum gets
 * softer. A shelf on the top end makes up the difference.
 */
const SHELF_BELOW_LAYERS = 4;

/**
 * The layer recorded nearest a velocity: the softest one at least as loud, or
 * the loudest there is.
 */
export function layerFor(layers: Layer[], vel: number): Layer {
  for (const layer of layers) if (layer.v >= vel) return layer;
  return layers[layers.length - 1];
}

/**
 * Which round-robin plays: never the one that played last on this slot when
 * there is another, and otherwise any of the rest, by the seeded stream.
 *
 * DrumGizmo's selection weighs closeness, diversity and chance; with velocity
 * already chosen by {@link layerFor}, what is left is the last two. Avoiding
 * only the most recent take is what removes the machine gun — with two takes
 * that is strict alternation, with three or more it is still unpredictable.
 */
export function pickTake(count: number, last: number | undefined, rand: () => number): number {
  if (count <= 1) return 0;
  if (last === undefined || last < 0 || last >= count) return Math.floor(rand() * count);
  const i = Math.floor(rand() * (count - 1));
  return i >= last ? i + 1 : i;
}

/**
 * An mp3 decodes with the encoder's own silence in front of it — about 23 ms
 * here — and a drum that starts 23 ms late is a drum in the wrong place. Find
 * the attack once, at decode time, and start playback there.
 */
export function onsetOf(buf: AudioBuffer): number {
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) {
    const a = Math.abs(d[i]);
    if (a > peak) peak = a;
  }
  const th = peak * 0.02;
  for (let i = 0; i < d.length; i++) {
    // back off a millisecond so the very front of the transient survives
    if (Math.abs(d[i]) > th) return Math.max(0, (i - buf.sampleRate * 0.001) / buf.sampleRate);
  }
  return 0;
}

/** Where the extracted packs live. */
const BASE = '/kits';

/** How many kits stay decoded at once: the current one and the one before. */
export const DECODED_KITS = 2;

/** Run `fn` when the page is idle — Safari has no `requestIdleCallback`. */
function whenIdle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 200);
}

export class PackSource implements SampleSource {
  private readonly loaded = new Map<string, Record<string, Layer[]>>();
  private readonly loading = new Set<string>();
  /** The take each slot (or percussion stroke) played last, so the next one differs. */
  private readonly lastTake = new Map<string, number>();

  /** Recorded percussion, shared across every kit. */
  private perc: Record<string, Layer[]> = {};
  private percLoaded = false;

  /** Set false to play the synthesised percussion voices instead. */
  usePercSamples = true;

  private onChange?: () => void;

  constructor(onChange?: () => void) {
    this.onChange = onChange;
  }

  /** Whether this kit's samples are in memory yet. */
  isReady(pack: string): boolean {
    return this.loaded.has(pack);
  }

  /**
   * Mark a pack the most recently used, and let go of the oldest beyond
   * {@link DECODED_KITS}. A Map iterates in insertion order, so re-inserting
   * is the touch and the first key is the oldest.
   */
  private touch(pack: string): void {
    const slots = this.loaded.get(pack);
    if (!slots) return;
    this.loaded.delete(pack);
    this.loaded.set(pack, slots);
    this.evict(pack);
  }

  /**
   * Let go of the oldest packs beyond {@link DECODED_KITS}, never `keep` —
   * the kit that is playing. A load that finishes after the drummer has
   * moved on must not push out the kit they moved on to.
   */
  private evict(keep: string | undefined): void {
    for (const pack of [...this.loaded.keys()]) {
      if (this.loaded.size <= DECODED_KITS) return;
      if (pack !== keep) this.loaded.delete(pack);
    }
  }

  /** How many slots of a pack decoded, for the kit panel's status line. */
  count(pack: string): number {
    const p = this.loaded.get(pack);
    return p ? Object.keys(p).filter((k) => p[k].length).length : 0;
  }

  /** A take from `layer`, not the one this key played last. */
  private take(engine: BreakAudio, key: string, layer: Layer): Take {
    const i = pickTake(layer.takes.length, this.lastTake.get(key), engine.rand);
    this.lastTake.set(key, i);
    return layer.takes[i];
  }

  refresh(engine: BreakAudio): void {
    const kit = engine.kit;
    if (kit?.engine === 'pack' && kit.pack) {
      this.touch(kit.pack);
      void this.load(engine, kit.pack, kit.samples.slots);
    }
    // percussion is shared, so it loads whichever kit is selected
    void this.loadPerc(engine);
  }

  /** One file, decoded and its onset found — or null, which is one fewer take. */
  private async decodeFile(engine: BreakAudio, pack: string, file: string): Promise<Take | null> {
    const ctx = engine.ctx;
    if (!ctx) return null;
    try {
      const res = await fetch(`${BASE}/${pack}/${file}`, { redirect: 'error' });
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      return { buf, off: onsetOf(buf) };
    } catch {
      // a take that will not decode is one fewer take; a layer with none is one fewer layer
      return null;
    }
  }

  /**
   * The first pass over one slot: each layer's first round-robin that
   * decodes. The rest of each layer's files are pushed onto `rest` for
   * {@link decodeRest}.
   */
  private async decode(
    engine: BreakAudio,
    pack: string,
    spec: KitSampleSlot,
    rest: Array<{ layer: Layer; files: string[] }>
  ): Promise<Layer[]> {
    const out = await Promise.all(
      slotLayers(spec).map(async (layer): Promise<Layer> => {
        // the first take that decodes; one that will not is one fewer take
        let i = 0;
        let take: Take | null = null;
        while (!take && i < layer.files.length)
          take = await this.decodeFile(engine, pack, layer.files[i++]);
        const decoded: Layer = { v: layer.v, takes: take ? [take] : [] };
        const others = layer.files.slice(i);
        if (take && others.length) rest.push({ layer: decoded, files: others });
        return decoded;
      })
    );
    return out.filter((layer) => layer.takes.length > 0);
  }

  /**
   * The second pass: the remaining round-robins, appended to their layers as
   * they decode. Skipped if the pack was let go in the meantime.
   */
  private async decodeRest(
    engine: BreakAudio,
    pack: string,
    slots: Record<string, Layer[]>,
    rest: Array<{ layer: Layer; files: string[] }>
  ): Promise<void> {
    await Promise.all(
      rest.map(async ({ layer, files }) => {
        if (slots !== this.loaded.get(pack) && slots !== this.perc) return;
        const takes = await Promise.all(files.map((f) => this.decodeFile(engine, pack, f)));
        for (const take of takes) if (take) layer.takes.push(take);
      })
    );
    this.onChange?.();
  }

  /**
   * Decode one pack's slots.
   *
   * The slot map used to be fetched from `/kits/manifest.json`; it is the
   * `samples` column on the kit's catalogue row now, and arrives with the kit.
   * One fewer round trip, and — more to the point — one fewer way for the row
   * and the file that describes it to disagree.
   */
  async load(
    engine: BreakAudio,
    pack: string,
    slotSpecs: Record<string, KitSampleSlot> | undefined
  ): Promise<void> {
    if (this.loaded.has(pack) || this.loading.has(pack)) return;
    if (!slotSpecs || !engine.ctx) return;

    this.loading.add(pack);
    try {
      const slots: Record<string, Layer[]> = {};
      const rest: Array<{ layer: Layer; files: string[] }> = [];
      await Promise.all(
        Object.entries(slotSpecs).map(async ([slot, spec]) => {
          slots[slot] = await this.decode(engine, pack, spec, rest);
        })
      );
      this.loaded.set(pack, slots);
      // most recent only if it is still the kit playing; either way the
      // playing kit stays decoded
      const playing = engine.kit?.engine === 'pack' ? engine.kit.pack : undefined;
      if (pack === playing) this.touch(pack);
      else this.evict(playing);
      this.onChange?.();
      if (rest.length) whenIdle(() => void this.decodeRest(engine, pack, slots, rest));
    } finally {
      this.loading.delete(pack);
    }
  }

  /**
   * The percussion lanes are deliberately **not** tied to a kit: a tambourine
   * over the Studio '70s set should be a tambourine. So these load once, from
   * whichever kit ships them, and every kit can reach them.
   *
   * Which kit that is used to be the constant `PERC_FROM = 'virtuosity'`. It is
   * data now — the catalogue names the kit whose `samples.perc` is set — so a
   * fork that ships a different percussion set changes a row rather than this
   * file.
   */
  async loadPerc(engine: BreakAudio): Promise<void> {
    const source = engine.percussion;
    if (this.percLoaded || !engine.ctx || !source) return;

    this.percLoaded = true;
    const out: Record<string, Layer[]> = {};
    const rest: Array<{ layer: Layer; files: string[] }> = [];
    await Promise.all(
      Object.entries(source.slots).map(async ([inst, spec]) => {
        out[inst] = await this.decode(engine, source.pack, spec, rest);
      })
    );
    this.perc = out;
    this.onChange?.();
    if (rest.length) whenIdle(() => void this.decodeRest(engine, source.pack, out, rest));
  }

  /** How many percussion instruments have recordings loaded. */
  percCount(): number {
    return Object.keys(this.perc).filter((k) => this.perc[k].length).length;
  }

  /**
   * Two samples per instrument — the normal stroke and the accent, which for
   * the congas and the agogô is a different drum or bell rather than the same
   * one hit harder.
   */
  percHit(engine: BreakAudio, t: number, inst: string, vel: number, accent: boolean): boolean {
    if (!this.usePercSamples) return false;
    const list = this.perc[inst];
    if (!list?.length) return false;
    const stroke = accent && list.length > 1 ? 1 : 0;
    const rec = this.take(engine, `perc:${inst}:${stroke}`, list[stroke]);
    const P = engine.P('p');
    const bright = P.tone ?? 1;
    engine.playBuf(
      t,
      rec.buf,
      vel * (P.level ?? 1) * slotTrim(engine.percussion?.slots[inst]),
      'p',
      (P.tune ?? 1) * (1 + (engine.rand() - 0.5) * 0.012),
      rec.off,
      (bright - 1) * 9
    );
    return true;
  }

  hit(engine: BreakAudio, t: number, slotId: string, vel: number): boolean {
    const kit = engine.kit;
    if (kit?.engine !== 'pack' || !kit.pack) return false;
    const slot = SLOT_BY_ID[slotId];
    if (!slot) return false;

    const pack = this.loaded.get(kit.pack);
    if (!pack) {
      // not decoded yet — the synthesised voice covers for it this bar
      void this.load(engine, kit.pack, kit.samples.slots);
      return false;
    }

    let list = pack[slotId];
    let from = slotId;
    let soften = 1;
    if (!list?.length && slot.fall) {
      list = pack[slot.fall];
      from = slot.fall;
      // no rest strokes in this kit: the hit, played quieter
      if (list?.length && slotId === 'sGhost') soften = 0.6;
    }
    if (!list?.length) return false;

    // the layer recorded nearest this velocity, then gain for the difference
    const layer = layerFor(list, vel);
    const take = this.take(engine, slotId, layer);
    const under = clamp(vel / (layer.v || 1), 0.25, 1.8);

    const P = engine.sound?.[slot.voice] ?? kit[slot.voice as 'k'];
    const wobble = 10 ** (((engine.rand() * 2 - 1) * WOBBLE_DB) / 20);
    const trim = (kit.trim ?? 1) * slotTrim(kit.samples.slots?.[from]);
    const gain = under * (P.level ?? 1) * trim * soften * wobble;
    const rate = (P.rate ?? 1) * 2 ** (((engine.rand() * 2 - 1) * DETUNE_CENTS) / 1200);
    // half a dB of darkness per dB the layer is turned down, to −6 dB at most
    const shelf =
      list.length < SHELF_BELOW_LAYERS && under < 1
        ? Math.max(-6, 10 * Math.log10(under))
        : undefined;

    const played = engine.playBuf(t, take.buf, gain, slot.voice, rate, take.off, shelf);
    if (slotId === 'hOpen') engine.noteHatTail(played);
    return true;
  }
}
