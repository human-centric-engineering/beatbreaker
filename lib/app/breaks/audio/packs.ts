import type { BreakAudio, SampleSource } from '@/lib/app/breaks/audio/engine';
import { KITS, SLOT_BY_ID } from '@/lib/app/breaks/kit';
import { clamp } from '@/lib/app/breaks/rng';
import { logger } from '@/lib/logging';

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
 */

/** One decoded sample, with the offset playback should start at. */
interface Layer {
  buf: AudioBuffer;
  /** The velocity this layer was recorded at, 0–1. */
  v: number;
  /** Seconds of encoder padding to skip. See {@link onsetOf}. */
  off: number;
}

interface PackManifestEntry {
  sampleRate: number;
  slots: Record<string, { v: number[] | null; files: string[] }>;
  perc?: Record<string, { v: number[] | null; files: string[] }>;
}

type Manifest = Record<string, PackManifestEntry>;

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

export class PackSource implements SampleSource {
  private manifest: Manifest | null = null;
  private manifestLoading = false;
  private readonly loaded = new Map<string, Record<string, Layer[]>>();
  private readonly loading = new Set<string>();

  /** Recorded percussion, shared across every kit. */
  private perc: Record<string, Layer[]> = {};
  private percLoaded = false;
  /** Which pack the percussion recordings come from. */
  private static readonly PERC_FROM = 'virtuosity';

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

  /** How many slots of a pack decoded, for the kit panel's status line. */
  count(pack: string): number {
    const p = this.loaded.get(pack);
    return p ? Object.keys(p).filter((k) => p[k].length).length : 0;
  }

  refresh(engine: BreakAudio): void {
    const kit = KITS[engine.kitKey];
    if (kit?.engine === 'pack' && kit.pack) void this.load(engine, kit.pack);
    // percussion is shared, so it loads whichever kit is selected
    void this.loadPerc(engine);
  }

  private async manifestFor(): Promise<Manifest | null> {
    if (this.manifest) return this.manifest;
    if (this.manifestLoading) return null;
    this.manifestLoading = true;
    try {
      /* `redirect: 'error'` on a same-origin static asset: these paths are
         ours and a redirect would be a misconfiguration, not a hop to follow.
         The guard in outbound-fetch-redirects.test.ts is right to insist —
         fetch follows redirects by default, so any validation upstream of it
         only ever sees the first hop. */
      const res = await fetch(`${BASE}/manifest.json`, { redirect: 'error' });
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      this.manifest = (await res.json()) as Manifest;
      return this.manifest;
    } catch (error) {
      logger.warn('BeatBreaker: could not load the kit manifest', { error });
      return null;
    } finally {
      this.manifestLoading = false;
    }
  }

  private async decode(
    engine: BreakAudio,
    pack: string,
    files: string[],
    vs: number[] | null
  ): Promise<Layer[]> {
    const ctx = engine.ctx;
    if (!ctx) return [];
    const out = await Promise.all(
      files.map(async (file, i): Promise<Layer | null> => {
        try {
          const res = await fetch(`${BASE}/${pack}/${file}`, { redirect: 'error' });
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          return { buf, v: vs?.[i] ?? 1, off: onsetOf(buf) };
        } catch {
          // a layer that will not decode is just one fewer layer
          return null;
        }
      })
    );
    return out.filter((x): x is Layer => x !== null);
  }

  async load(engine: BreakAudio, pack: string): Promise<void> {
    if (this.loaded.has(pack) || this.loading.has(pack)) return;
    const manifest = await this.manifestFor();
    const entry = manifest?.[pack];
    if (!entry || !engine.ctx) return;

    this.loading.add(pack);
    try {
      const slots: Record<string, Layer[]> = {};
      await Promise.all(
        Object.entries(entry.slots).map(async ([slot, spec]) => {
          slots[slot] = await this.decode(engine, pack, spec.files, spec.v);
        })
      );
      this.loaded.set(pack, slots);
      this.onChange?.();
    } finally {
      this.loading.delete(pack);
    }
  }

  /**
   * The percussion lanes are deliberately **not** tied to a kit: a tambourine
   * over the Studio '70s set should be a tambourine. So these load once, from
   * whichever pack ships them, and every kit can reach them.
   */
  async loadPerc(engine: BreakAudio): Promise<void> {
    if (this.percLoaded || !engine.ctx) return;
    const manifest = await this.manifestFor();
    const entry = manifest?.[PackSource.PERC_FROM];
    if (!entry?.perc) return;

    this.percLoaded = true;
    const out: Record<string, Layer[]> = {};
    await Promise.all(
      Object.entries(entry.perc).map(async ([inst, spec]) => {
        out[inst] = await this.decode(engine, PackSource.PERC_FROM, spec.files, spec.v);
      })
    );
    this.perc = out;
    this.onChange?.();
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
    const rec = list[accent && list.length > 1 ? 1 : 0];
    const P = engine.P('p');
    const bright = P.tone ?? 1;
    engine.playBuf(
      t,
      rec.buf,
      vel * (P.level ?? 1),
      'p',
      (P.tune ?? 1) * (1 + (Math.random() - 0.5) * 0.012),
      rec.off,
      (bright - 1) * 9
    );
    return true;
  }

  hit(engine: BreakAudio, t: number, slotId: string, vel: number): boolean {
    const kit = KITS[engine.kitKey];
    if (kit?.engine !== 'pack' || !kit.pack) return false;
    const slot = SLOT_BY_ID[slotId];
    if (!slot) return false;

    const pack = this.loaded.get(kit.pack);
    if (!pack) {
      // not decoded yet — the synthesised voice covers for it this bar
      void this.load(engine, kit.pack);
      return false;
    }

    let list = pack[slotId];
    let soften = 1;
    if (!list?.length && slot.fall) {
      list = pack[slot.fall];
      // no rest strokes in this kit: the hit, played quieter
      if (list?.length && slotId === 'sGhost') soften = 0.6;
    }
    if (!list?.length) return false;

    // the layer recorded nearest this velocity, then gain for the difference
    let pick = list[list.length - 1];
    for (const layer of list) {
      if (layer.v >= vel) {
        pick = layer;
        break;
      }
    }

    const P = engine.sound?.[slot.voice] ?? kit[slot.voice as 'k'];
    const gain = clamp(vel / (pick.v || 1), 0.25, 1.8) * (P.level ?? 1) * (kit.trim ?? 1) * soften;
    const rate = (P.rate ?? 1) * (1 + (Math.random() - 0.5) * 0.008);

    const played = engine.playBuf(t, pick.buf, gain, slot.voice, rate, pick.off);
    if (slotId === 'hOpen') engine.noteHatTail(played);
    return true;
  }
}
