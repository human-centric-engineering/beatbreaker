/**
 * Integration Test: /api/v1/kits — your own kits (D20)
 *
 * The real `withAuth` guard, the real schemas and the real
 * `lib/app/breaks/samples/kits` run over a mocked session and the in-memory
 * `sample`/`kit` table in `tests/helpers/your-sounds-db.ts`, so what is under
 * test is what the rows end up holding.
 *
 * @see app/api/v1/kits/route.ts
 * @see app/api/v1/kits/[id]/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, GET as GET_ONE, PATCH } from '@/app/api/v1/kits/[id]/route';
import { GET, POST } from '@/app/api/v1/kits/route';
import { MAX_YOUR_KITS, YOUR_KIT_KEY_PREFIX } from '@/lib/app/breaks/samples/limits';
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

import { auth } from '@/lib/auth/config';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const OTHER_ID = 'clzx9k8p40000x8c2g3h5m7b1';
const BASE = 'http://localhost:3000/api/v1/kits';

function send(method: string, path: string, body?: unknown): NextRequest {
  return new NextRequest(`${BASE}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const list = () => GET(send('GET', ''));
const create = (body: unknown = {}) => POST(send('POST', '', body));
const read = (id: string) => GET_ONE(send('GET', `/${id}`), ctx(id));
const patch = (id: string, body: unknown) => PATCH(send('PATCH', `/${id}`, body), ctx(id));
const remove = (id: string) => DELETE(send('DELETE', `/${id}`), ctx(id));

interface Kit {
  id: string;
  key: string;
  label: string;
  slots: Record<string, { sampleId: string; name: string; audioUrl: string }>;
}

async function json<T>(
  res: Response
): Promise<{ data: T; error?: { code: string; details?: unknown } }> {
  return JSON.parse(await res.text()) as { data: T; error?: { code: string; details?: unknown } };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetYourSoundsDb();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

describe('auth', () => {
  it('401s without a session, before any query', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    expect((await list()).status).toBe(401);
    expect((await create()).status).toBe(401);
    expect(db.kits).toHaveLength(0);
  });
});

describe('your kits', () => {
  it('creates a kit, takes two of your samples, and lists it with each slot’s audio URL', async () => {
    const kick = seedSample(USER_ID, { name: 'kick.mp3' });
    const snare = seedSample(USER_ID, { name: 'snare.wav', slot: 's' });

    const made = await create({ label: 'Garage kit' });
    expect(made.status).toBe(201);
    const kit = (await json<Kit>(made)).data;
    expect(kit.key.startsWith(YOUR_KIT_KEY_PREFIX)).toBe(true);
    expect(kit.key.length).toBeLessThanOrEqual(40);
    expect(kit.slots).toEqual({});
    expect(db.kits[0]).toMatchObject({ ownerId: USER_ID, engine: 'user', visibility: 'private' });

    const set = await patch(kit.id, { slots: { k: kick.id, s: snare.id } });
    expect(set.status).toBe(200);

    const { data } = await json<{ kits: Kit[] }>(await list());
    expect(data.kits).toHaveLength(1);
    expect(data.kits[0]).toMatchObject({ label: 'Garage kit', key: kit.key });
    expect(data.kits[0].slots).toEqual({
      k: { sampleId: kick.id, name: 'kick.mp3', audioUrl: `/api/v1/samples/${kick.id}/audio` },
      s: { sampleId: snare.id, name: 'snare.wav', audioUrl: `/api/v1/samples/${snare.id}/audio` },
    });
  });

  it('renames, empties a slot with null, and leaves the other slots alone', async () => {
    const kick = seedSample(USER_ID);
    const snare = seedSample(USER_ID);
    const kit = seedKit(USER_ID, { k: kick.id, s: snare.id });

    const res = await patch(kit.id, { label: 'Renamed', slots: { k: null } });

    const { data } = await json<Kit>(res);
    expect(data.label).toBe('Renamed');
    expect(Object.keys(data.slots)).toEqual(['s']);
  });

  it('refuses someone else’s sample in a slot, naming the slot, and writes nothing', async () => {
    const theirs = seedSample(OTHER_ID);
    const kit = seedKit(USER_ID);

    const res = await patch(kit.id, { slots: { k: theirs.id } });

    expect(res.status).toBe(400);
    const body = await json<unknown>(res);
    expect(body.error?.details).toEqual({
      errors: [{ path: 'slots.k', message: 'Not one of your samples' }],
    });
    expect(db.kits[0].samples).toEqual({ slots: {} });
  });

  it('refuses a slot that is not one of the kit’s slots', async () => {
    const mine = seedSample(USER_ID);
    const kit = seedKit(USER_ID);
    expect((await patch(kit.id, { slots: { cowbell: mine.id } })).status).toBe(400);
  });

  it('404s someone else’s kit on read, rename and delete, and leaves it alone', async () => {
    const theirs = seedKit(OTHER_ID, {}, { label: 'Theirs' });

    expect((await read(theirs.id)).status).toBe(404);
    expect((await patch(theirs.id, { label: 'Mine now' })).status).toBe(404);
    expect((await remove(theirs.id)).status).toBe(404);
    expect(db.kits).toHaveLength(1);
    expect(db.kits[0].label).toBe('Theirs');
  });

  it('404s a system kit, which is nobody’s to edit here', async () => {
    const system = seedKit(OTHER_ID, {}, { ownerId: null, engine: 'pack' });
    expect((await patch(system.id, { label: 'x' })).status).toBe(404);
  });

  it('lists only your kits', async () => {
    seedKit(OTHER_ID);
    const mine = seedKit(USER_ID);

    const { data } = await json<{ kits: Kit[] }>(await list());
    expect(data.kits.map((k) => k.id)).toEqual([mine.id]);
  });

  it('deletes your kit and keeps the samples that were in it', async () => {
    const kick = seedSample(USER_ID);
    const kit = seedKit(USER_ID, { k: kick.id });

    expect((await remove(kit.id)).status).toBe(200);
    expect(db.kits).toHaveLength(0);
    expect(db.samples).toHaveLength(1);
  });

  it(`refuses a kit past ${MAX_YOUR_KITS}`, async () => {
    for (let i = 0; i < MAX_YOUR_KITS; i++) seedKit(USER_ID);

    const res = await create();
    expect(res.status).toBe(409);
    expect((await json<unknown>(res)).error?.code).toBe('KIT_LIMIT');
  });

  /* The fake runs a transaction straight through, so it cannot race two
     requests; what it can show is that the lock comes before the read it
     guards, inside the transaction, keyed on you. */
  function lockedBefore(read: { mock: { invocationCallOrder: number[] } }): void {
    expect(fakePrisma.$transaction).toHaveBeenCalledTimes(1);
    const lock = vi.mocked(fakePrisma.$executeRaw);
    const [strings, ...values] = lock.mock.calls[0] as unknown as [
      TemplateStringsArray,
      ...unknown[],
    ];
    expect(strings.join('?')).toContain('pg_advisory_xact_lock');
    expect(values).toContain(USER_ID);
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(read.mock.invocationCallOrder[0]);
  }

  it('counts your kits behind the per-person lock, so two creates cannot both see room', async () => {
    expect((await create()).status).toBe(201);
    lockedBefore(fakePrisma.kit.count);
  });

  it('reads the slots behind the per-person lock, so two changes cannot lose one', async () => {
    const kick = seedSample(USER_ID);
    const kit = seedKit(USER_ID);

    expect((await patch(kit.id, { slots: { k: kick.id } })).status).toBe(200);
    lockedBefore(fakePrisma.kit.findFirst);
  });

  it('reads your own kit, and 400s an id that is not one', async () => {
    const kick = seedSample(USER_ID);
    const kit = seedKit(USER_ID, { k: kick.id });

    const res = await read(kit.id);
    expect(res.status).toBe(200);
    expect(Object.keys((await json<Kit>(res)).data.slots)).toEqual(['k']);

    expect((await read('not-an-id')).status).toBe(400);
    expect((await patch('not-an-id', { label: 'x' })).status).toBe(400);
    expect((await remove('not-an-id')).status).toBe(400);
  });

  it('shows a slot naming a sample that is gone, or someone else’s, as empty', async () => {
    const theirs = seedSample(OTHER_ID);
    const kit = seedKit(USER_ID, { k: 'cgone0000000000000000000', s: theirs.id });

    const { data } = await json<Kit>(await read(kit.id));
    expect(data.slots).toEqual({});
  });

  it('reads a slots column that does not parse as an empty kit, and can still fill it', async () => {
    const kick = seedSample(USER_ID);
    const kit = seedKit(USER_ID, {}, { samples: { slots: 'garbage' } });

    expect((await json<Kit>(await read(kit.id))).data.slots).toEqual({});
    const res = await patch(kit.id, { slots: { k: kick.id } });
    expect(Object.keys((await json<Kit>(res)).data.slots)).toEqual(['k']);
  });

  it('renames without touching the slots', async () => {
    const kick = seedSample(USER_ID);
    const kit = seedKit(USER_ID, { k: kick.id });

    await patch(kit.id, { label: 'Only the name' });
    expect(db.kits[0]).toMatchObject({ label: 'Only the name' });
    expect(db.kits[0].samples).toEqual({ slots: { k: { v: null, files: [kick.id] } } });
  });

  it('refuses a patch that changes nothing', async () => {
    const kit = seedKit(USER_ID);
    expect((await patch(kit.id, {})).status).toBe(400);
  });
});
