import type { BreakAudio, SampleSource } from '@/lib/app/breaks/audio/engine';
import {
  type KitSampleSlot,
  type ResolvedKit,
  SLOT_BY_ID,
  slotLayers,
  slotTrim,
} from '@/lib/app/breaks/kit';
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
 * bytes before it can play. A `late` slot — a rimshot, a half-open hat, the
 * second crash, china and splash — waits for the idle pass entirely, and its
 * synthesised voice plays it until it lands. **Two kits stay decoded** — the one playing and
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

/**
 * Whether a kit's slot plays from the packs. Every slot of a recorded kit
 * does. A kit of yours (9-v) mixes pieces, which name their folder, and your
 * own samples, which do not and are `YourSampleSource`'s.
 */
export function playsFromPacks(kit: ResolvedKit, spec: KitSampleSlot): boolean {
  if (spec.folder) return true;
  return kit.engine === 'pack' && !!kit.pack;
}

/** The slots of `kit` that play from the packs; empty for a synthesised kit. */
function packSlots(kit: ResolvedKit | null | undefined): Record<string, KitSampleSlot> {
  if (!kit || (kit.engine !== 'pack' && kit.engine !== 'user')) return {};
  return Object.fromEntries(
    Object.entries(kit.samples.slots ?? {}).filter(([, spec]) => playsFromPacks(kit, spec))
  );
}

/**
 * Each kit's decode key, worked out once per catalogue entry rather than per
 * note. Keyed on the kit, not its slot map: two kits may share one map and
 * still read it from different packs.
 */
const decodeKeys = new WeakMap<ResolvedKit, string>();

/**
 * What a kit's decoded samples are cached under: its key and which files its
 * slots name. A kit of yours keeps its key when you change a slot's piece,
 * and the decode it had is then the wrong one. The slots' Level, Tune and
 * Decay are applied per hit and are not part of it.
 */
export function decodeKey(kit: ResolvedKit): string {
  const have = decodeKeys.get(kit);
  if (have !== undefined) return have;
  const files = JSON.stringify(
    Object.entries(packSlots(kit)).map(([slot, spec]) => [
      slot,
      spec.folder ?? kit.pack,
      slotLayers(spec),
    ])
  );
  // djb2: short, and it only has to tell this kit's versions apart
  let h = 5381;
  for (let i = 0; i < files.length; i++) h = ((h << 5) + h + files.charCodeAt(i)) | 0;
  const key = `${kit.key}#${(h >>> 0).toString(36)}`;
  decodeKeys.set(kit, key);
  return key;
}

/** A file still to decode, and the folder it is in. */
interface Pending {
  layer: Layer;
  files: string[];
  folder: string;
}

/** Run `fn` when the page is idle — Safari has no `requestIdleCallback`. */
function whenIdle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 200);
}

/**
 * The recorded kits' samples, decoded per kit.
 *
 * Keyed by **kit**, not pack. A recorded kit was one folder; since pieces
 * (9-v) a kit draws each slot from its piece's folder, so two kits sharing a
 * folder may share no slots, and a kit of yours has no pack at all.
 */
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
  isReady(kit: ResolvedKit | null | undefined): boolean {
    return !!kit && this.loaded.has(decodeKey(kit));
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

  /** How many of a kit's slots decoded, for the kit panel's status line. */
  count(kit: ResolvedKit | null | undefined): number {
    const p = kit ? this.loaded.get(decodeKey(kit)) : undefined;
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
    if (kit && Object.keys(packSlots(kit)).length) {
      this.touch(decodeKey(kit));
      void this.load(engine, kit);
    }
    // percussion is shared, so it loads whichever kit is selected
    void this.loadPerc(engine);
  }

  /** One file, decoded and its onset found — or null, which is one fewer take. */
  private async decodeFile(engine: BreakAudio, folder: string, file: string): Promise<Take | null> {
    const ctx = engine.ctx;
    if (!ctx) return null;
    try {
      const res = await fetch(`${BASE}/${folder}/${file}`, { redirect: 'error' });
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
    folder: string,
    spec: KitSampleSlot,
    rest: Pending[]
  ): Promise<Layer[]> {
    const out = await Promise.all(
      slotLayers(spec).map(async (layer): Promise<Layer> => {
        // the first take that decodes; one that will not is one fewer take
        let i = 0;
        let take: Take | null = null;
        while (!take && i < layer.files.length)
          take = await this.decodeFile(engine, folder, layer.files[i++]);
        const decoded: Layer = { v: layer.v, takes: take ? [take] : [] };
        const others = layer.files.slice(i);
        if (take && others.length) rest.push({ layer: decoded, files: others, folder });
        return decoded;
      })
    );
    return out.filter((layer) => layer.takes.length > 0);
  }

  /**
   * The second pass: the remaining round-robins, appended to their layers as
   * they decode, then the `late` slots whole. Skipped if the kit was let go
   * in the meantime.
   */
  private async decodeRest(
    engine: BreakAudio,
    key: string,
    slots: Record<string, Layer[]>,
    rest: Pending[],
    late: Array<[string, KitSampleSlot, string]> = []
  ): Promise<void> {
    const live = (): boolean => slots === this.loaded.get(key) || slots === this.perc;
    const more = async (list: Pending[]): Promise<void> => {
      await Promise.all(
        list.map(async ({ layer, files, folder }) => {
          if (!live()) return;
          const takes = await Promise.all(files.map((f) => this.decodeFile(engine, folder, f)));
          for (const take of takes) if (take) layer.takes.push(take);
        })
      );
    };
    await more(rest);
    await Promise.all(
      late.map(async ([slot, spec, folder]) => {
        if (!live()) return;
        const takes: Pending[] = [];
        const layers = await this.decode(engine, folder, spec, takes);
        if (!live()) return;
        slots[slot] = layers;
        await more(takes);
      })
    );
    this.onChange?.();
  }

  /**
   * Decode the slots of `kit` that play from the packs.
   *
   * The slot map used to be fetched from `/kits/manifest.json`; it is the
   * `samples` column on the kit's catalogue row now, and arrives with the kit.
   * One fewer round trip, and — more to the point — one fewer way for the row
   * and the file that describes it to disagree.
   *
   * Each slot's files are in its own `folder` where it names one (a piece,
   * 9-v), else in the kit's pack.
   */
  async load(engine: BreakAudio, kit: ResolvedKit): Promise<void> {
    const slotSpecs = packSlots(kit);
    if (!Object.keys(slotSpecs).length) return;
    const key = decodeKey(kit);
    const folder = kit.pack ?? '';
    if (this.loaded.has(key) || this.loading.has(key)) return;
    if (!engine.ctx) return;

    this.loading.add(key);
    try {
      const slots: Record<string, Layer[]> = {};
      const rest: Pending[] = [];
      const late: Array<[string, KitSampleSlot, string]> = [];
      await Promise.all(
        Object.entries(slotSpecs).map(async ([slot, spec]) => {
          const dir = spec.folder ?? folder;
          if (SLOT_BY_ID[slot]?.late) late.push([slot, spec, dir]);
          else slots[slot] = await this.decode(engine, dir, spec, rest);
        })
      );
      this.loaded.set(key, slots);
      // most recent only if it is still the kit playing; either way the
      // playing kit stays decoded
      const playing = engine.kit ? decodeKey(engine.kit) : undefined;
      if (key === playing) this.touch(key);
      else this.evict(playing);
      this.onChange?.();
      if (rest.length || late.length) {
        whenIdle(() => void this.decodeRest(engine, key, slots, rest, late));
      }
    } finally {
      this.loading.delete(key);
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
    const rest: Pending[] = [];
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
    if (!kit) return false;
    const slot = SLOT_BY_ID[slotId];
    if (!slot) return false;
    const specs = kit.samples.slots ?? {};
    /* A slot of yours holding one of your samples is `YourSampleSource`'s,
       and so is a slot that would fall back on one. Without this a ghost
       sample of yours would be passed over for your snare piece, played soft. */
    const mine = (id: string): boolean => !!specs[id] && !playsFromPacks(kit, specs[id]);
    if (mine(slotId) || (!specs[slotId] && slot.fall && mine(slot.fall))) return false;

    const decoded = this.loaded.get(decodeKey(kit));
    if (!decoded) {
      // not decoded yet — the synthesised voice covers for it this bar
      void this.load(engine, kit);
      return false;
    }

    let list = decoded[slotId];
    let from = slotId;
    let soften = 1;
    if (!list?.length && slot.fall) {
      list = decoded[slot.fall];
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
    const spec = specs[from];
    const wobble = 10 ** (((engine.rand() * 2 - 1) * WOBBLE_DB) / 20);
    const trim = (kit.trim ?? 1) * slotTrim(spec);
    // the kit's own Level for the slot (9-v), on top of the voice's
    const gain = under * (P.level ?? 1) * (spec?.level ?? 1) * trim * soften * wobble;
    const cents = (spec?.tune ?? 0) + (engine.rand() * 2 - 1) * DETUNE_CENTS;
    const rate = (P.rate ?? 1) * 2 ** (cents / 1200);
    // half a dB of darkness per dB the layer is turned down, to −6 dB at most
    const shelf =
      list.length < SHELF_BELOW_LAYERS && under < 1
        ? Math.max(-6, 10 * Math.log10(under))
        : undefined;

    const played = engine.playBuf(
      t,
      take.buf,
      gain,
      slot.voice,
      rate,
      take.off,
      shelf,
      spec?.decay
    );
    if (slotId === 'hOpen' || slotId === 'hHalf') engine.noteHatTail(played);
    return true;
  }
}
