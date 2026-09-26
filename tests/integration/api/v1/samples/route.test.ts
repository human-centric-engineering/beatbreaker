/**
 * Integration Test: /api/v1/samples — your own samples (D20)
 *
 * The real `withAuth` guard, the real WAV reader and the real
 * `lib/app/breaks/samples/data` run over a mocked session, an in-memory
 * `sample`/`kit` table (`tests/helpers/your-sounds-db.ts`) and a fake storage
 * provider that records what it holds. What is under test is what ends up in
 * the table and in storage: a refusal leaves neither, a failed write leaves no
 * row, a delete takes the file.
 *
 * @see app/api/v1/samples/route.ts
 * @see app/api/v1/samples/[id]/route.ts
 * @see app/api/v1/samples/[id]/audio/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as AUDIO } from '@/app/api/v1/samples/[id]/audio/route';
import { DELETE } from '@/app/api/v1/samples/[id]/route';
import { GET, POST } from '@/app/api/v1/samples/route';
import { sampleUploadLimiter } from '@/lib/app/breaks/samples/data';
import { MAX_SAMPLE_BYTES } from '@/lib/app/breaks/samples/limits';
import { writeWav } from '@/lib/app/breaks/samples/wav';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';
import {
  db,
  fakePrisma,
  resetYourSoundsDb,
  seedKit,
  seedSample,
} from '@/tests/helpers/your-sounds-db';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', async () => ({
  prisma: (await import('@/tests/helpers/your-sounds-db')).fakePrisma,
}));
vi.mock('@/lib/storage/client', () => ({ getStorageClient: vi.fn() }));

import { auth } from '@/lib/auth/config';
import { getStorageClient } from '@/lib/storage/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const OTHER_ID = 'clzx9k8p40000x8c2g3h5m7b1';

/* ---- a storage provider that remembers what it holds ------------------- */

const files = new Map<string, { body: Buffer; public: boolean | undefined }>();

function provider(caps: { privateObjects?: boolean; download?: boolean } = {}) {
  return {
    name: 'fake',
    capabilities: { privateObjects: true, download: true, signedUrls: false, ...caps },
    upload: vi.fn(async (body: Buffer, opts: { key: string; public?: boolean }) => {
      files.set(opts.key, { body, public: opts.public });
      return { key: opts.key, url: `/nowhere/${opts.key}`, size: body.length };
    }),
    delete: vi.fn(async (key: string) => ({ success: files.delete(key), key })),
    deletePrefix: vi.fn(async (prefix: string) => ({ success: true, key: prefix })),
    download: vi.fn(async (key: string) => {
      const f = files.get(key);
      if (!f) throw new Error('no such object');
      return { key, body: f.body, size: f.body.length };
    }),
  };
}

let storage: ReturnType<typeof provider>;

/* ---- requests --------------------------------------------------------- */

const BASE = 'http://localhost:3000/api/v1/samples';

/** A valid sample: `seconds` of silence as mono 16-bit 44.1 kHz. */
function wavOf(seconds: number): Uint8Array<ArrayBuffer> {
  return writeWav(new Float32Array(Math.round(seconds * 44_100)));
}

function upload(
  file: BlobPart | null,
  fields: Record<string, string> = { slot: 'k', name: 'kick.mp3' },
  headers: Record<string, string> = {}
): Promise<Response> {
  const form = new FormData();
  if (file !== null) form.set('file', new Blob([file], { type: 'audio/wav' }), 'kick.wav');
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return POST(new NextRequest(BASE, { method: 'POST', body: form, headers }));
}

function list(): Promise<Response> {
  return GET(new NextRequest(BASE));
}

function remove(id: string): Promise<Response> {
  return DELETE(new NextRequest(`${BASE}/${id}`, { method: 'DELETE' }), {
    params: Promise.resolve({ id }),
  });
}

function audio(id: string): Promise<Response> {
  return AUDIO(new NextRequest(`${BASE}/${id}/audio`), { params: Promise.resolve({ id }) });
}

interface Body {
  success: boolean;
  data: {
    sample: { id: string; name: string; slot: string; bytes: number; durationMs: number };
    samples: Array<{ id: string; audioUrl: string }>;
    usage: { count: number; bytes: number; maxCount: number; maxBytes: number };
  };
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

async function json(res: Response): Promise<Body> {
  return JSON.parse(await res.text()) as Body;
}

/** A refusal: the status, its code, and a message a person can read. */
async function refusal(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  const body = await json(res);
  expect(body.error?.code).toBe(code);
  expect(body.error?.message).toMatch(/\w+ \w+/);
  return body.error!;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetYourSoundsDb();
  files.clear();
  storage = provider();
  vi.mocked(getStorageClient).mockReturnValue(storage);
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  sampleUploadLimiter.reset(USER_ID);
});

/* ---- tests ------------------------------------------------------------ */

describe('auth', () => {
  it('401s every method without a session, before storage or a query', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const id = seedSample(USER_ID).id;

    expect((await list()).status).toBe(401);
    expect((await upload(wavOf(1))).status).toBe(401);
    expect((await remove(id)).status).toBe(401);
    expect((await audio(id)).status).toBe(401);
    expect(fakePrisma.sample.findMany).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/samples', () => {
  it('stores the WAV privately under your prefix and records it', async () => {
    const res = await upload(wavOf(0.5), { slot: 's', name: '  snare.mp3 ' });

    expect(res.status).toBe(201);
    const { data } = await json(res);
    expect(data.sample).toMatchObject({ name: 'snare.mp3', slot: 's', durationMs: 500 });
    expect(data.usage).toMatchObject({ count: 1, maxCount: 150, maxBytes: 50 * 1024 * 1024 });

    expect(db.samples).toHaveLength(1);
    const [row] = db.samples;
    expect(row.userId).toBe(USER_ID);
    expect(row.storageKey).toMatch(new RegExp(`^samples/${USER_ID}/[0-9a-f-]{36}\\.wav$`));
    expect(row.bytes).toBe(44 + 22_050 * 2);
    expect(files.get(row.storageKey)).toMatchObject({ public: false });
  });

  it('refuses a body over the cap by its Content-Length, before reading it', async () => {
    const res = await upload(wavOf(0.1), undefined, {
      'content-length': String(MAX_SAMPLE_BYTES * 6),
    });
    const error = await refusal(res, 413, 'SAMPLE_TOO_LARGE');
    expect(error.message).toBe('A sample can be at most 1.5 MB');
    expect(db.samples).toHaveLength(0);
  });

  it('refuses a file over 1.5 MB that got past the header check', async () => {
    const res = await upload(new Uint8Array(MAX_SAMPLE_BYTES + 1));
    await refusal(res, 413, 'SAMPLE_TOO_LARGE');
    expect(files.size).toBe(0);
  });

  it.each([
    ['a text file renamed .wav', new TextEncoder().encode('not audio at all'), 'not-wav'],
    ['a stereo WAV', stereo(), 'not-mono'],
  ])('refuses %s with the reason', async (_label, bytes, reason) => {
    const error = await refusal(await upload(bytes), 400, 'SAMPLE_NOT_WAV');
    expect(error.details).toEqual({ reason });
    expect(db.samples).toHaveLength(0);
    expect(files.size).toBe(0);
  });

  it('refuses a sample longer than 12 seconds, saying how long it is', async () => {
    // 12.5 s of mono 16-bit is ~1.1 MB, under the size cap: this is the duration check
    const error = await refusal(await upload(wavOf(12.5)), 400, 'SAMPLE_TOO_LONG');
    expect(error.message).toBe('That is 12.5 seconds long — a sample can be at most 12');
    expect(db.samples).toHaveLength(0);
  });

  it('refuses a missing file, an unknown slot and an empty name, naming each', async () => {
    const noFile = await refusal(await upload(null), 400, 'VALIDATION_ERROR');
    expect(noFile.details).toEqual({ errors: [{ path: 'file', message: 'No file sent' }] });

    const bad = await refusal(
      await upload(wavOf(0.1), { slot: 'cowbell', name: '\u0007 ' }),
      400,
      'VALIDATION_ERROR'
    );
    const paths = (bad.details?.errors as Array<{ path: string }>).map((e) => e.path);
    expect(paths.sort()).toEqual(['name', 'slot']);
  });

  it('accepts the 150th sample and refuses the 151st, leaving no file', async () => {
    for (let i = 0; i < 149; i++) seedSample(USER_ID, { bytes: 10 });
    // someone else's samples are not yours to count
    for (let i = 0; i < 5; i++) seedSample(OTHER_ID, { bytes: 10 });

    const hundredFiftieth = await upload(wavOf(0.1));
    expect(hundredFiftieth.status).toBe(201);
    expect((await json(hundredFiftieth)).data.usage.count).toBe(150);

    const error = await refusal(await upload(wavOf(0.1)), 409, 'SAMPLE_LIMIT_COUNT');
    expect(error.details).toEqual({ count: 150, maxCount: 150 });
    expect(db.samples.filter((s) => s.userId === USER_ID)).toHaveLength(150);
    expect(storage.upload).toHaveBeenCalledTimes(1);
  });

  it('refuses an upload that would pass 50 MB, leaving no file', async () => {
    seedSample(USER_ID, { bytes: 50 * 1024 * 1024 - 1000 });

    const error = await refusal(await upload(wavOf(0.1)), 409, 'SAMPLE_LIMIT_BYTES');
    expect(error.message).toMatch(/delete one to make room/);
    expect(db.samples).toHaveLength(1);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('checks the allowance inside the transaction, behind the per-person lock', async () => {
    await upload(wavOf(0.1));

    expect(fakePrisma.$transaction).toHaveBeenCalledTimes(1);
    const [strings, ...values] = vi.mocked(fakePrisma.$executeRaw).mock.calls[0] as unknown as [
      TemplateStringsArray,
      ...unknown[],
    ];
    expect(strings.join('?')).toContain('pg_advisory_xact_lock');
    expect(values).toContain(USER_ID);
  });

  it('leaves no row when the storage write fails', async () => {
    storage.upload.mockRejectedValueOnce(new Error('bucket on fire'));

    await refusal(await upload(wavOf(0.1)), 502, 'SAMPLE_NOT_STORED');
    expect(db.samples).toHaveLength(0);
  });

  it('503s, storing nothing, when the provider cannot keep an object private', async () => {
    storage = provider({ privateObjects: false });
    vi.mocked(getStorageClient).mockReturnValue(storage);

    await refusal(await upload(wavOf(0.1)), 503, 'STORAGE_NOT_PRIVATE');
    expect(storage.upload).not.toHaveBeenCalled();
    expect(db.samples).toHaveLength(0);
  });

  it('503s when there is no storage at all', async () => {
    vi.mocked(getStorageClient).mockReturnValue(null);
    await refusal(await upload(wavOf(0.1)), 503, 'STORAGE_NOT_CONFIGURED');
  });

  it('caps uploads per person, not per address', async () => {
    for (let i = 0; i < 60; i++) sampleUploadLimiter.check(USER_ID);

    expect((await upload(wavOf(0.1))).status).toBe(429);
    expect(storage.upload).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/samples', () => {
  it('lists only your samples, newest first, with the usage', async () => {
    const older = seedSample(USER_ID, { bytes: 100 });
    const newer = seedSample(USER_ID, { bytes: 200 });
    seedSample(OTHER_ID, { bytes: 999 });

    const { data } = await json(await list());

    expect(data.samples.map((s) => s.id)).toEqual([newer.id, older.id]);
    expect(data.samples[0].audioUrl).toBe(`/api/v1/samples/${newer.id}/audio`);
    expect(data.usage).toMatchObject({ count: 2, bytes: 300 });
  });
});

describe('DELETE /api/v1/samples/:id', () => {
  it('removes the row and the file, and empties the slots that held it', async () => {
    const kick = seedSample(USER_ID);
    const snare = seedSample(USER_ID, { slot: 's' });
    files.set(kick.storageKey, { body: Buffer.from('x'), public: false });
    const kit = seedKit(USER_ID, { k: kick.id, s: snare.id });

    const res = await remove(kick.id);

    expect(res.status).toBe(200);
    expect((await json(res)).data.usage.count).toBe(1);
    expect(db.samples.map((s) => s.id)).toEqual([snare.id]);
    expect(files.has(kick.storageKey)).toBe(false);
    expect(db.kits.find((k) => k.id === kit.id)?.samples).toEqual({
      slots: { s: { v: null, files: [snare.id] } },
    });
  });

  it('404s someone else’s sample, and leaves it and its file alone', async () => {
    const theirs = seedSample(OTHER_ID);
    files.set(theirs.storageKey, { body: Buffer.from('x'), public: false });

    expect((await remove(theirs.id)).status).toBe(404);
    expect(db.samples).toHaveLength(1);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('400s an id that is not one', async () => {
    expect((await remove('not-an-id')).status).toBe(400);
  });
});

describe('GET /api/v1/samples/:id/audio', () => {
  it('serves your sample’s WAV, privately cached', async () => {
    const mine = seedSample(USER_ID);
    const wav = Buffer.from(wavOf(0.01));
    files.set(mine.storageKey, { body: wav, public: false });

    const res = await audio(mine.id);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/wav');
    expect(res.headers.get('cache-control')).toMatch(/^private/);
    expect(Buffer.from(await res.arrayBuffer()).equals(wav)).toBe(true);
    expect(storage.download).toHaveBeenCalledWith(mine.storageKey);
  });

  it('404s someone else’s sample without reading storage', async () => {
    const theirs = seedSample(OTHER_ID);
    files.set(theirs.storageKey, { body: Buffer.from('x'), public: false });

    expect((await audio(theirs.id)).status).toBe(404);
    expect(storage.download).not.toHaveBeenCalled();
  });

  it('404s a row whose file is missing', async () => {
    const mine = seedSample(USER_ID);
    expect((await audio(mine.id)).status).toBe(404);
  });

  it('503s when the provider cannot read an object back', async () => {
    storage = provider({ download: false });
    vi.mocked(getStorageClient).mockReturnValue(storage);
    const mine = seedSample(USER_ID);

    expect((await audio(mine.id)).status).toBe(503);
  });
});

/** A two-channel WAV of a tenth of a second, otherwise in the right format. */
function stereo(): Uint8Array<ArrayBuffer> {
  const bytes = wavOf(0.1);
  const view = new DataView(bytes.buffer);
  view.setUint16(22, 2, true);
  return bytes;
}
