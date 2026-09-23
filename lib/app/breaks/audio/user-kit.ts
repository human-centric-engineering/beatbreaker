import type { BreakAudio, SampleSource } from '@/lib/app/breaks/audio/engine';
import { SLOT_BY_ID } from '@/lib/app/breaks/kit';
import { logger } from '@/lib/logging';

/**
 * Your own one-shots.
 *
 * The kit is a set of named slots (see `SLOTS` in `kit.ts`) and this fills them
 * from files on your machine. **Nothing is uploaded** — the encoded bytes go
 * into IndexedDB in this browser and the decoded buffers stay in memory, which
 * is why this is a client module with no server half at all.
 *
 * Like {@link PackSource} it returns `false` for a slot it cannot cover, so the
 * synthesised voice stands in: a kit with only a kick and a snare loaded is a
 * playable kit, not a broken one.
 */

/** What goes in the store: the *encoded* file, so it can be re-decoded later. */
interface SampleRow {
  slot: string;
  name: string;
  data: ArrayBuffer;
}

const DB_NAME = 'beatbreaker-kit';
const STORE = 'samples';

/**
 * A one-shot, not a loop. Twelve seconds is generous for a crash and far below
 * anything that would be a mistake to hold in memory a dozen times over.
 */
export const MAX_SAMPLE_SECONDS = 12;

/** Promise wrapper for an IDBRequest, because the API predates promises. */
function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    // `IDBRequest.error` is a DOMException, but it is null-able on the type
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'));
  });
}

class KitDB {
  private db: IDBDatabase | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('no IndexedDB'));
        return;
      }
      let r: IDBOpenDBRequest;
      try {
        r = indexedDB.open(DB_NAME, 1);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'slot' });
      r.onsuccess = () => {
        this.db = r.result;
        resolve(r.result);
      };
      r.onerror = () => reject(r.error ?? new Error('Could not open the sample store'));
    });
  }

  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.open();
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  async all(): Promise<SampleRow[]> {
    return req((await this.store('readonly')).getAll() as IDBRequest<SampleRow[]>);
  }

  async put(row: SampleRow): Promise<void> {
    await req((await this.store('readwrite')).put(row));
  }

  async del(slot: string): Promise<void> {
    await req((await this.store('readwrite')).delete(slot));
  }
}

export class UserSource implements SampleSource {
  private readonly db = new KitDB();
  private readonly buffers: Record<string, AudioBuffer> = {};
  /** The filename each slot was loaded from, for the slot list. */
  readonly names: Record<string, string> = {};
  private loaded = false;
  private loading = false;

  private onChange?: () => void;

  constructor(onChange?: () => void) {
    this.onChange = onChange;
  }

  count(): number {
    return Object.keys(this.buffers).length;
  }

  isReady(): boolean {
    return this.loaded;
  }

  refresh(engine: BreakAudio): void {
    if (engine.kit?.engine === 'user') void this.load(engine);
  }

  /** Decode everything the store is holding. Once per session. */
  async load(engine: BreakAudio): Promise<void> {
    if (this.loaded || this.loading || !engine.ctx) return;
    this.loading = true;
    try {
      const rows = await this.db.all();
      await Promise.all(
        rows.map(async (row) => {
          try {
            /* `decodeAudioData` detaches the buffer it is given, so each row is
               decoded from a copy — the original bytes stay usable, which is
               what lets a slot be re-decoded after a failure. */
            const buf = await engine.ctx!.decodeAudioData(row.data.slice(0));
            this.buffers[row.slot] = buf;
            this.names[row.slot] = row.name;
          } catch {
            // a file this browser can no longer decode is simply an empty slot
          }
        })
      );
    } catch (error) {
      logger.warn('BeatBreaker: could not read your saved samples', { error });
    } finally {
      this.loading = false;
      this.loaded = true;
      this.onChange?.();
    }
  }

  /**
   * Take a file for one slot.
   *
   * The decode happens before the write, so a file the browser cannot read
   * never reaches the store — and the sample is usable this session even when
   * saving it for next time fails (a private window, or a full quota).
   */
  async add(engine: BreakAudio, slot: string, file: File): Promise<string> {
    const ctx = engine.init();
    if (!ctx) return 'This browser has no Web Audio';
    if (!SLOT_BY_ID[slot]) return 'Unknown slot';

    let data: ArrayBuffer;
    let buf: AudioBuffer;
    try {
      data = await file.arrayBuffer();
      buf = await ctx.decodeAudioData(data.slice(0));
    } catch {
      return 'Could not decode that file — try WAV, MP3, FLAC or M4A';
    }
    if (buf.duration > MAX_SAMPLE_SECONDS) {
      return `That is ${Math.round(buf.duration)}s long — load a single hit, not a loop`;
    }

    this.buffers[slot] = buf;
    this.names[slot] = file.name;
    this.onChange?.();

    try {
      await this.db.put({ slot, name: file.name, data });
    } catch (error) {
      logger.warn('BeatBreaker: sample loaded but not saved', { error });
      return 'Loaded, but this browser would not save it for next time';
    }
    return '';
  }

  async remove(slot: string): Promise<void> {
    delete this.buffers[slot];
    delete this.names[slot];
    this.onChange?.();
    try {
      await this.db.del(slot);
    } catch (error) {
      logger.warn('BeatBreaker: could not forget that sample', { error });
    }
  }

  hit(engine: BreakAudio, t: number, slotId: string, vel: number): boolean {
    const kit = engine.kit;
    if (kit?.engine !== 'user') return false;
    const slot = SLOT_BY_ID[slotId];
    if (!slot) return false;

    let buf = this.buffers[slotId];
    let soften = 1;
    if (!buf && slot.fall) {
      buf = this.buffers[slot.fall];
      // no ghost sample loaded: the hit, played quieter
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
