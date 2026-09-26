import type { BreakAudio, SampleSource } from '@/lib/app/breaks/audio/engine';
import { type ResolvedKit, SLOT_BY_ID } from '@/lib/app/breaks/kit';
import { sampleAudioUrl } from '@/lib/app/breaks/samples/limits';
import { logger } from '@/lib/logging';

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
 */
export class YourSampleSource implements SampleSource {
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly loading = new Set<string>();
  /** Ids that would not fetch or decode this session, so they are not retried every bar. */
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

  refresh(engine: BreakAudio): void {
    void this.load(engine, engine.kit);
  }

  /** Fetch and decode every sample `kit` names that is not in memory yet. */
  async load(engine: BreakAudio, kit: ResolvedKit | null | undefined): Promise<void> {
    const ctx = engine.ctx;
    if (!ctx) return;
    const wanted = YourSampleSource.ids(kit)
      .map(([, id]) => id)
      .filter((id) => !this.buffers.has(id) && !this.loading.has(id) && !this.failed.has(id));
    if (!wanted.length) return;

    for (const id of wanted) this.loading.add(id);
    await Promise.all(
      wanted.map(async (id) => {
        try {
          const res = await fetch(sampleAudioUrl(id), { redirect: 'error' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          this.buffers.set(id, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch (error) {
          // an empty slot, not a broken kit: the synthesised voice covers it
          this.failed.add(id);
          logger.warn('BeatBreaker: one of your samples would not load', { sampleId: id, error });
        } finally {
          this.loading.delete(id);
        }
      })
    );
    this.onChange?.();
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
