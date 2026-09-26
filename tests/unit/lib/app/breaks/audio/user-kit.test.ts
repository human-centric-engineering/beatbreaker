// @vitest-environment happy-dom

/**
 * `UserSource` — your own one-shots, kept in IndexedDB
 * (`lib/app/breaks/audio/user-kit.ts`).
 *
 * `engine.init()` has to run for real here (`add()` calls it directly), so
 * this follows `engine.test.ts`'s pattern: `window.AudioContext =
 * FakeAudioContext`. That fake has no decode step of its own, so a small
 * subclass below adds a stubbed `decodeAudioData` — the one thing this module
 * needs that `engine.test.ts` never did.
 *
 * There is no real IndexedDB in the test environment, so `FakeIndexedDB`
 * below stands in. It is deliberately not a "always succeeds" stub: writes
 * resolve on a microtask (real IndexedDB requests never resolve
 * synchronously — code that assumed otherwise would pass here and break in a
 * browser) and a test can make the next `put()` fail, which is the only way
 * to honestly exercise "decoded but not saved." The same idea covers reads
 * and deletes (`failNextGetAll`, `failNextDelete`) and opening the database
 * itself (`throwOnOpen`, `failOpen`) — `KitDB.open()` has a synchronous-throw
 * branch and an async `onerror` branch that are otherwise unreachable from a
 * fake that always succeeds.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BreakAudio } from '@/lib/app/breaks/audio/engine';
import { MAX_SAMPLE_SECONDS, UserSource } from '@/lib/app/breaks/audio/user-kit';
import type { ResolvedKit } from '@/lib/app/breaks/kit';
import { yourKitToCatalogue } from '@/lib/app/breaks/samples/your-kit';
import { testKit } from '@/tests/helpers/catalogue';
import { FakeAudioBuffer, FakeAudioContext } from '@/tests/helpers/fake-audio-context';

const { loggerWarn } = vi.hoisted(() => ({ loggerWarn: vi.fn() }));
vi.mock('@/lib/logging', () => ({
  logger: { warn: loggerWarn, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

/* ------------------------------------------------------------------------ */
/* fakes                                                                    */
/* ------------------------------------------------------------------------ */

class DecodingContext extends FakeAudioContext {
  decodeAudioData = vi.fn(
    async (_data: ArrayBuffer): Promise<AudioBuffer> =>
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
  );
}

interface FakeRow {
  slot: string;
  name: string;
  data: ArrayBuffer;
}

class FakeIDBRequest<T> {
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result!: T;
  error: Error | null = null;
}

function succeed<T>(req: FakeIDBRequest<T>, result: T): void {
  queueMicrotask(() => {
    req.result = result;
    req.onsuccess?.();
  });
}

function fail<T>(req: FakeIDBRequest<T>, error: Error): void {
  queueMicrotask(() => {
    req.error = error;
    req.onerror?.();
  });
}

class FakeStore {
  rows = new Map<string, FakeRow>();
  /** A test sets this to make the next write fail, e.g. a full quota. */
  failNextPut = false;
  /** A test sets this to make the next read fail, e.g. a corrupt store. */
  failNextGetAll = false;
  /** A test sets this to make the next delete fail. */
  failNextDelete = false;

  getAll(): FakeIDBRequest<FakeRow[]> {
    const req = new FakeIDBRequest<FakeRow[]>();
    if (this.failNextGetAll) {
      this.failNextGetAll = false;
      fail(req, new Error('could not read object store'));
    } else {
      succeed(req, [...this.rows.values()]);
    }
    return req;
  }

  put(row: FakeRow): FakeIDBRequest<undefined> {
    const req = new FakeIDBRequest<undefined>();
    if (this.failNextPut) {
      this.failNextPut = false;
      fail(req, new Error('quota exceeded'));
    } else {
      this.rows.set(row.slot, row);
      succeed(req, undefined);
    }
    return req;
  }

  delete(slot: string): FakeIDBRequest<undefined> {
    const req = new FakeIDBRequest<undefined>();
    if (this.failNextDelete) {
      this.failNextDelete = false;
      fail(req, new Error('could not delete row'));
    } else {
      this.rows.delete(slot);
      succeed(req, undefined);
    }
    return req;
  }
}

class FakeIDBDatabase {
  store = new FakeStore();
  // KitDB.open()'s onupgradeneeded calls this on a fresh database; the store
  // already exists here, so there is nothing to create.
  createObjectStore(_name: string, _options: { keyPath: string }): FakeStore {
    return this.store;
  }
  transaction(_name: string, _mode: IDBTransactionMode): { objectStore: () => FakeStore } {
    return { objectStore: () => this.store };
  }
}

/** Just enough of `indexedDB.open()` for `KitDB` to drive. */
class FakeIndexedDB {
  db = new FakeIDBDatabase();
  /** A test sets this to model `indexedDB.open()` throwing synchronously. */
  throwOnOpen = false;
  /** A test sets this to model the open request itself failing (e.g. blocked/denied). */
  failOpen = false;

  open(
    _name: string,
    _version: number
  ): {
    onupgradeneeded: (() => void) | null;
    onsuccess: (() => void) | null;
    onerror: (() => void) | null;
    result: FakeIDBDatabase;
    error: Error | null;
  } {
    if (this.throwOnOpen) {
      throw new Error('IndexedDB is disabled in this browsing context');
    }
    const req = {
      onupgradeneeded: null as (() => void) | null,
      onsuccess: null as (() => void) | null,
      onerror: null as (() => void) | null,
      result: this.db,
      error: null as Error | null,
    };
    queueMicrotask(() => {
      if (this.failOpen) {
        req.error = new Error('the database could not be opened');
        req.onerror?.();
      } else {
        req.onupgradeneeded?.();
        req.onsuccess?.();
      }
    });
    return req;
  }
}

/* ------------------------------------------------------------------------ */
/* fixtures                                                                 */
/* ------------------------------------------------------------------------ */

const USER_KIT: ResolvedKit = {
  ...yourKitToCatalogue({ id: 'k1', key: 'user', label: 'Your samples', slots: {} }),
};
// Any non-user kit whose voice params share `user`'s rate/level/room shape.
const PACK_KIT: ResolvedKit = testKit('muldjord');

function initEngine(kit: ResolvedKit | null = USER_KIT): {
  audio: BreakAudio;
  ctx: DecodingContext;
} {
  const audio = new BreakAudio();
  audio.setKit(kit, null);
  const ctx = audio.init() as unknown as DecodingContext;
  return { audio, ctx };
}

let fakeIndexedDB: FakeIndexedDB;

beforeEach(() => {
  FakeAudioContext.instances.length = 0;
  FakeAudioContext.throwOnConstruct = false;
  window.AudioContext = DecodingContext as unknown as typeof AudioContext;
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  fakeIndexedDB = new FakeIndexedDB();
  vi.stubGlobal('indexedDB', fakeIndexedDB);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/* ------------------------------------------------------------------------ */
/* add()                                                                    */
/* ------------------------------------------------------------------------ */

describe('add()', () => {
  it('never writes to the store when the browser cannot decode the file', async () => {
    const { audio, ctx } = initEngine();
    ctx.decodeAudioData.mockRejectedValueOnce(new Error('unsupported codec'));
    const source = new UserSource();
    const file = new File([new Uint8Array(4)], 'bad.xyz');

    const message = await source.add(audio, 'k', file);

    expect(message).toBe('Could not decode that file — try WAV, MP3, FLAC or M4A');
    expect(source.count()).toBe(0);
    expect(fakeIndexedDB.db.store.rows.size).toBe(0); // decode happens before the write
  });

  it('refuses a sample longer than the limit without ever storing it', async () => {
    const { audio, ctx } = initEngine();
    // sampleRate 1, length 13 -> duration 13s, and cheap to allocate
    ctx.decodeAudioData.mockResolvedValueOnce(
      new FakeAudioBuffer(1, MAX_SAMPLE_SECONDS + 1, 1) as unknown as AudioBuffer
    );
    const source = new UserSource();
    const file = new File([new Uint8Array(4)], 'loop.wav');

    const message = await source.add(audio, 'k', file);

    expect(message).toBe(`That is ${MAX_SAMPLE_SECONDS + 1}s long — load a single hit, not a loop`);
    expect(source.count()).toBe(0);
    expect(fakeIndexedDB.db.store.rows.size).toBe(0);
  });

  it('keeps the sample usable this session even when the save to disk fails', async () => {
    const { audio, ctx } = initEngine();
    ctx.decodeAudioData.mockResolvedValueOnce(
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
    );
    fakeIndexedDB.db.store.failNextPut = true;
    const source = new UserSource();
    const file = new File([new Uint8Array(4)], 'kick.wav');

    const message = await source.add(audio, 'k', file);

    expect(message).toBe('Loaded, but this browser would not save it for next time');
    expect(source.count()).toBe(1); // still usable this session
    expect(source.names.k).toBe('kick.wav');
    expect(loggerWarn).toHaveBeenCalled();
  });

  it('decodes, stores, and reports success for a normal one-shot', async () => {
    const { audio, ctx } = initEngine();
    ctx.decodeAudioData.mockResolvedValueOnce(
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
    );
    const source = new UserSource();
    const file = new File([new Uint8Array(4)], 'snare.wav');

    const message = await source.add(audio, 's', file);

    expect(message).toBe('');
    expect(source.count()).toBe(1);
    expect(source.names.s).toBe('snare.wav');
    expect(fakeIndexedDB.db.store.rows.get('s')?.name).toBe('snare.wav');
  });

  it('refuses without ever touching the store when this browser has no Web Audio', async () => {
    // `engine.init()` returns null when `new AudioContext()` throws (H7-style
    // hardware refusal) — `add()` must not reach the decode step at all.
    FakeAudioContext.throwOnConstruct = true;
    const audio = new BreakAudio();
    const source = new UserSource();
    const file = new File([new Uint8Array(4)], 'kick.wav');

    const message = await source.add(audio, 'k', file);

    expect(message).toBe('This browser has no Web Audio');
    expect(source.count()).toBe(0);
    expect(fakeIndexedDB.db.store.rows.size).toBe(0);
  });

  it('rejects a slot the kit vocabulary does not define', async () => {
    const { audio } = initEngine();
    const source = new UserSource();
    const file = new File([new Uint8Array(4)], 'kick.wav');

    const message = await source.add(audio, 'not-a-real-slot', file);

    expect(message).toBe('Unknown slot');
    expect(source.count()).toBe(0);
    expect(fakeIndexedDB.db.store.rows.size).toBe(0);
  });
});

/* ------------------------------------------------------------------------ */
/* load()                                                                   */
/* ------------------------------------------------------------------------ */

describe('load()', () => {
  it('is not ready until load() resolves, then decodes everything the store is holding', async () => {
    const { audio } = initEngine();
    fakeIndexedDB.db.store.rows.set('k', { slot: 'k', name: 'kick.wav', data: new ArrayBuffer(4) });
    fakeIndexedDB.db.store.rows.set('s', {
      slot: 's',
      name: 'snare.wav',
      data: new ArrayBuffer(4),
    });
    const source = new UserSource();

    expect(source.isReady()).toBe(false);
    await source.load(audio);

    expect(source.isReady()).toBe(true);
    expect(source.count()).toBe(2);
    expect(source.names).toEqual({ k: 'kick.wav', s: 'snare.wav' });
  });

  it('skips a row this browser can no longer decode, without failing the whole load', async () => {
    const { audio, ctx } = initEngine();
    fakeIndexedDB.db.store.rows.set('k', { slot: 'k', name: 'kick.wav', data: new ArrayBuffer(4) });
    fakeIndexedDB.db.store.rows.set('s', {
      slot: 's',
      name: 'snare.wav',
      data: new ArrayBuffer(4),
    });
    // rows are decoded in insertion order, so this rejection lands on 'k'
    ctx.decodeAudioData.mockRejectedValueOnce(new Error('unsupported codec'));
    const source = new UserSource();

    await source.load(audio);

    expect(source.isReady()).toBe(true); // the load still finishes
    expect(source.count()).toBe(1); // only the row that decoded
    expect(source.names).toEqual({ s: 'snare.wav' });
  });

  it('logs and still finishes loading when the store itself cannot be read', async () => {
    // The case a sibling agent deliberately left out: `db.all()` rejecting
    // (a corrupt store, a browser that revoked storage access mid-session)
    // must not leave the kit stuck reporting "not ready" forever.
    const { audio } = initEngine();
    fakeIndexedDB.db.store.failNextGetAll = true;
    const source = new UserSource();

    await source.load(audio);

    expect(source.isReady()).toBe(true);
    expect(source.count()).toBe(0);
    expect(loggerWarn).toHaveBeenCalledWith(
      'BeatBreaker: could not read your saved samples',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('logs and still finishes loading when this browser has no IndexedDB at all', async () => {
    const { audio } = initEngine();
    vi.stubGlobal('indexedDB', undefined);
    const source = new UserSource();

    await source.load(audio);

    expect(source.isReady()).toBe(true);
    expect(source.count()).toBe(0);
    expect(loggerWarn).toHaveBeenCalledWith(
      'BeatBreaker: could not read your saved samples',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('logs and still finishes loading when opening the database throws synchronously', async () => {
    const { audio } = initEngine();
    fakeIndexedDB.throwOnOpen = true;
    const source = new UserSource();

    await source.load(audio);

    expect(source.isReady()).toBe(true);
    expect(loggerWarn).toHaveBeenCalledWith(
      'BeatBreaker: could not read your saved samples',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('logs and still finishes loading when the database refuses to open', async () => {
    const { audio } = initEngine();
    fakeIndexedDB.failOpen = true;
    const source = new UserSource();

    await source.load(audio);

    expect(source.isReady()).toBe(true);
    expect(loggerWarn).toHaveBeenCalledWith(
      'BeatBreaker: could not read your saved samples',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('does not read the store again once a load has already finished', async () => {
    const { audio } = initEngine();
    fakeIndexedDB.db.store.rows.set('k', { slot: 'k', name: 'kick.wav', data: new ArrayBuffer(4) });
    const source = new UserSource();
    await source.load(audio);
    expect(source.count()).toBe(1);

    const getAllSpy = vi.spyOn(fakeIndexedDB.db.store, 'getAll');
    await source.load(audio);

    expect(getAllSpy).not.toHaveBeenCalled();
  });

  it('does nothing without a context to decode into', async () => {
    const audio = new BreakAudio(); // never init()'d, so engine.ctx is null
    fakeIndexedDB.db.store.rows.set('k', { slot: 'k', name: 'kick.wav', data: new ArrayBuffer(4) });
    const source = new UserSource();

    await source.load(audio);

    // unlike the "already loaded" no-op above, this one never got to try —
    // isReady() must stay false so a later, real load() is not skipped
    expect(source.isReady()).toBe(false);
    expect(source.count()).toBe(0);
  });
});

/* ------------------------------------------------------------------------ */
/* remove()                                                                 */
/* ------------------------------------------------------------------------ */

describe('remove()', () => {
  it('forgets the sample immediately and notifies, even before the delete round-trips', async () => {
    const onChange = vi.fn();
    const { audio, ctx } = initEngine();
    ctx.decodeAudioData.mockResolvedValueOnce(
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
    );
    const source = new UserSource(onChange);
    await source.add(audio, 'k', new File([new Uint8Array(4)], 'kick.wav'));
    expect(source.count()).toBe(1);
    onChange.mockClear();

    await source.remove('k');

    expect(source.count()).toBe(0);
    expect(source.names.k).toBeUndefined();
    expect(fakeIndexedDB.db.store.rows.has('k')).toBe(false);
    expect(onChange).toHaveBeenCalled();
  });

  it('still forgets the sample locally when the store delete fails', async () => {
    const { audio, ctx } = initEngine();
    ctx.decodeAudioData.mockResolvedValueOnce(
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
    );
    const source = new UserSource();
    await source.add(audio, 'k', new File([new Uint8Array(4)], 'kick.wav'));
    fakeIndexedDB.db.store.failNextDelete = true;

    await source.remove('k');

    // removed from the in-memory kit regardless of whether the disk write landed —
    // a sample that silently comes back after "removing" it would be worse
    expect(source.count()).toBe(0);
    expect(source.names.k).toBeUndefined();
    expect(loggerWarn).toHaveBeenCalledWith(
      'BeatBreaker: could not forget that sample',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});

/* ------------------------------------------------------------------------ */
/* hit()                                                                    */
/* ------------------------------------------------------------------------ */

describe('hit()', () => {
  it('returns false unless the loaded kit is a user kit', async () => {
    const { audio, ctx } = initEngine(USER_KIT);
    ctx.decodeAudioData.mockResolvedValueOnce(
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
    );
    const source = new UserSource();
    await source.add(audio, 'k', new File([new Uint8Array(4)], 'kick.wav'));

    audio.setKit(PACK_KIT, null); // the buffer is still loaded, but this kit isn't `user`

    expect(source.hit(audio, 0, 'k', 1)).toBe(false);
  });

  it("reads tuning off the kit row's own voice params when there is no sound override", async () => {
    const { audio, ctx } = initEngine(USER_KIT);
    ctx.decodeAudioData.mockResolvedValueOnce(
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
    );
    const source = new UserSource();
    await source.add(audio, 'k', new File([new Uint8Array(4)], 'kick.wav'));
    audio.setKit(USER_KIT, null); // no sound override

    const playBuf = vi.spyOn(audio, 'playBuf');
    expect(source.hit(audio, 0.1, 'k', 0.8)).toBe(true);

    const [, , gain, voice, rate] = playBuf.mock.calls[0];
    expect(voice).toBe('k');
    // Math.random pinned at 0.5 -> jitter resolves to exactly 1
    expect(rate).toBeCloseTo(USER_KIT.k.rate, 9);
    expect(gain).toBeCloseTo(0.8 * USER_KIT.k.level, 9);
  });

  it("prefers the sound override's tuning over the kit row when one is set", async () => {
    const { audio, ctx } = initEngine(USER_KIT);
    ctx.decodeAudioData.mockResolvedValueOnce(
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
    );
    const source = new UserSource();
    await source.add(audio, 'k', new File([new Uint8Array(4)], 'kick.wav'));

    const sound = { k: { rate: 1.5, level: 0.4, room: 0 } };
    audio.setKit(USER_KIT, sound);

    const playBuf = vi.spyOn(audio, 'playBuf');
    expect(source.hit(audio, 0, 'k', 1)).toBe(true);

    const [, , gain, , rate] = playBuf.mock.calls[0];
    expect(gain).toBeCloseTo(0.4, 9);
    expect(rate).toBeCloseTo(1.5, 9);
  });

  it('returns false for a slot id the kit vocabulary does not know', () => {
    const { audio } = initEngine(USER_KIT);
    const source = new UserSource();

    expect(source.hit(audio, 0, 'not-a-real-slot', 1)).toBe(false);
  });

  it('returns false when nothing is loaded for a slot with no fallback', () => {
    const { audio } = initEngine(USER_KIT);
    const source = new UserSource();
    // 'k' (kick) has no `fall` in SLOTS — nothing loaded means nothing plays
    expect(source.hit(audio, 0, 'k', 1)).toBe(false);
  });

  it('falls back to the slot it stands in for, and notes the tail for an open hat', async () => {
    const { audio, ctx } = initEngine(USER_KIT);
    ctx.decodeAudioData.mockResolvedValueOnce(
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
    );
    const source = new UserSource();
    // only the closed hat is loaded; SLOTS defines hOpen with `fall: 'h'`
    await source.add(audio, 'h', new File([new Uint8Array(4)], 'hat.wav'));

    const noteHatTail = vi.spyOn(audio, 'noteHatTail');

    expect(source.hit(audio, 0, 'hOpen', 1)).toBe(true);

    expect(noteHatTail).toHaveBeenCalledTimes(1);
  });

  it('plays a ghost snare quieter through the fallback when no ghost sample is loaded', async () => {
    const { audio, ctx } = initEngine(USER_KIT);
    ctx.decodeAudioData.mockResolvedValueOnce(
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
    );
    const source = new UserSource();
    // only the full snare is loaded; SLOTS defines sGhost with `fall: 's'`
    await source.add(audio, 's', new File([new Uint8Array(4)], 'snare.wav'));
    audio.setKit(USER_KIT, null); // no sound override, so P comes off the kit row

    const playBuf = vi.spyOn(audio, 'playBuf');
    expect(source.hit(audio, 0, 'sGhost', 1)).toBe(true);

    const [, , gain] = playBuf.mock.calls[0];
    // ghost-via-fallback is the ordinary snare gain times the 0.62 soften factor
    expect(gain).toBeCloseTo(1 * USER_KIT.s.level * 0.62, 9);
  });
});

/* ------------------------------------------------------------------------ */
/* refresh()                                                                */
/* ------------------------------------------------------------------------ */

describe('refresh()', () => {
  it('loads only for a user kit', () => {
    const { audio } = initEngine(USER_KIT);
    const source = new UserSource();
    const loadSpy = vi.spyOn(source, 'load').mockResolvedValue();

    source.refresh(audio);
    expect(loadSpy).toHaveBeenCalledWith(audio);

    loadSpy.mockClear();
    audio.setKit(PACK_KIT, null);
    source.refresh(audio);
    expect(loadSpy).not.toHaveBeenCalled();
  });
});
