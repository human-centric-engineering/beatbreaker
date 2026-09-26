import type { BreakAudio, SampleSource } from '@/lib/app/breaks/audio/engine';
import { type ResolvedKit, SLOT_BY_ID } from '@/lib/app/breaks/kit';
import { sampleAudioUrl } from '@/lib/app/breaks/samples/limits';
import { logger } from '@/lib/logging';

/** How long to wait before each retry of a sample that might load next time. */
export const RETRY_DELAYS_MS = [2_000, 8_000, 30_000] as const;

/** A status worth asking again for: the request timed out, was throttled, or the server failed. */
function transient(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

/**
 * Your own kits (D20): the samples in your account, played.
 *
 * A kit of yours names a sample id in each filled slot. This fetches each one
 * from `/api/v1/samples/:id/audio` — owner-checked, and cached privately by
 * the browser, since a sample's audio never changes under its id — decodes it
 * once, and keeps the buffer by id. So two kits sharing a sample decode it
 * once, and a slot you change fetches only the new one.
 *
 * Like the packs it returns `false` for a slot it cannot cover, so the
 * synthesised voice stands in: a kit with a kick and a snare in it is a
 * playable kit, and a sample still arriving plays synthesised until it lands.
 *
 * A fetch that might work next time — the connection dropped, a 429, a 5xx —
 * is tried again after {@link RETRY_DELAYS_MS}. One that will not — a 404, a
 * file that does not decode — or one that has used its retries is given up on
 * for the session, and {@link YourSampleSource.failedCount} says so, so the drawer can say a
 * sample would not load rather than that it is still loading.
 */
export class YourSampleSource implements SampleSource {
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly loading = new Set<string>();
  /** Ids waiting out a retry delay, with how many retries they have had. */
  private readonly retrying = new Map<string, number>();
  /** Ids given up on this session, so they are not asked for every bar. */
  private readonly failed = new Set<string>();

  private onChange?: () => void;

  constructor(onChange?: () => void) {
    this.onChange = onChange;
  }

  /** The sample id in each filled slot of `kit`. */
  private static ids(kit: ResolvedKit | null | undefined): Array<[string, string]> {
    if (kit?.engine !== 'user') return [];
    return Object.entries(kit.samples.slots ?? {})
      .map(([slot, spec]): [string, string] => [slot, spec.files[0] ?? ''])
      .filter(([, id]) => id !== '');
  }

  /** How many of this kit's slots have decoded, for the Kit drawer's status line. */
  count(kit: ResolvedKit | null | undefined): number {
    return YourSampleSource.ids(kit).filter(([, id]) => this.buffers.has(id)).length;
  }

  /** How many of this kit's slots have been given up on, for the same line. */
  failedCount(kit: ResolvedKit | null | undefined): number {
    return YourSampleSource.ids(kit).filter(([, id]) => this.failed.has(id)).length;
  }

  refresh(engine: BreakAudio): void {
    void this.load(engine, engine.kit);
  }

  /** Fetch and decode every sample `kit` names that is not in memory yet. */
  async load(engine: BreakAudio, kit: ResolvedKit | null | undefined): Promise<void> {
    const ctx = engine.ctx;
    if (!ctx) return;
    const wanted = YourSampleSource.ids(kit)
      .map(([, id]) => id)
      .filter(
        (id) =>
          !this.buffers.has(id) &&
          !this.loading.has(id) &&
          !this.retrying.has(id) &&
          !this.failed.has(id)
      );
    if (!wanted.length) return;

    for (const id of wanted) this.loading.add(id);
    await Promise.all(wanted.map((id) => this.fetchOne(engine, ctx, id, 0)));
    this.onChange?.();
  }

  private async fetchOne(
    engine: BreakAudio,
    ctx: BaseAudioContext,
    id: string,
    retries: number
  ): Promise<void> {
    let data: ArrayBuffer;
    try {
      const res = await fetch(sampleAudioUrl(id), { redirect: 'error' });
      if (!res.ok) throw new HttpError(res.status);
      data = await res.arrayBuffer();
    } catch (error) {
      this.loading.delete(id);
      // a network error has no status, and is worth another go
      const again = !(error instanceof HttpError) || transient(error.status);
      if (again && retries < RETRY_DELAYS_MS.length) {
        this.retrying.set(id, retries + 1);
        setTimeout(() => void this.retry(engine, id), RETRY_DELAYS_MS[retries]);
        return;
      }
      this.giveUp(id, error);
      return;
    }
    try {
      this.buffers.set(id, await ctx.decodeAudioData(data));
    } catch (error) {
      this.giveUp(id, error);
    } finally {
      this.loading.delete(id);
    }
  }

  private async retry(engine: BreakAudio, id: string): Promise<void> {
    const retries = this.retrying.get(id);
    this.retrying.delete(id);
    // the engine was closed, or the id was dropped, while this waited
    const ctx = engine.ctx;
    if (retries === undefined || !ctx) return;
    this.loading.add(id);
    await this.fetchOne(engine, ctx, id, retries);
    this.onChange?.();
  }

  /** An empty slot, not a broken kit: the synthesised voice covers it. */
  private giveUp(id: string, error: unknown): void {
    this.failed.add(id);
    logger.warn('BeatBreaker: one of your samples would not load', { sampleId: id, error });
  }

  hit(engine: BreakAudio, t: number, slotId: string, vel: number): boolean {
    const kit = engine.kit;
    if (kit?.engine !== 'user') return false;
    const slot = SLOT_BY_ID[slotId];
    if (!slot) return false;

    const bufferFor = (id: string | undefined) => {
      const sampleId = id ? kit.samples.slots?.[id]?.files[0] : undefined;
      return sampleId ? this.buffers.get(sampleId) : undefined;
    };

    let buf = bufferFor(slotId);
    let soften = 1;
    if (!buf && slot.fall) {
      buf = bufferFor(slot.fall);
      // no ghost sample in the kit: the hit, played quieter
      if (buf && slotId === 'sGhost') soften = 0.62;
    }
    if (!buf) return false;

    const P = engine.sound?.[slot.voice] ?? kit[slot.voice as 'k'];
    const rate = (P.rate ?? 1) * (1 + (Math.random() - 0.5) * 0.01);
    const played = engine.playBuf(t, buf, vel * (P.level ?? 1) * soften, slot.voice, rate);
    if (slotId === 'hOpen') engine.noteHatTail(played);
    return true;
  }
}
