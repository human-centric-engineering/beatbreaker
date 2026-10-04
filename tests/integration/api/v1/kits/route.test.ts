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
  seedPiece,
  seedSample,
} from '@/tests/helpers/your-sounds-db';
import { invalidateCatalogue } from '@/lib/app/breaks/catalogue/data';
import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';

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
  invalidateCatalogue();
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

/* ---- pieces in your kits (9-v) ------------------------------------- */

interface PieceSlot {
  piece: string;
  from?: string;
  label: string;
  spec: { layers: Array<{ v: number; files: string[] }>; trim?: number; folder?: string };
  level?: number;
  tune?: number;
  decay?: number;
}

interface KitWithPieces {
  id: string;
  key: string;
  label: string;
  slots: Record<string, PieceSlot | { sampleId: string; name: string }>;
  pan?: Record<string, number>;
  params?: { master: { lp?: number } };
}

describe('pieces in your kits (9-v)', () => {
  it('fills a slot with a piece and its settings, and reads it back resolved to its folder', async () => {
    seedPiece('bigrusty-s', ['s', 'sRim']);
    const kit = seedKit(USER_ID);

    const res = await patch(kit.id, {
      slots: { s: { piece: 'bigrusty-s', level: 1.2, tune: -300, decay: 0.5 } },
      pan: { s: -0.2 },
    });
    expect(res.status).toBe(200);
    const { data } = await json<KitWithPieces>(res);
    expect(data.slots.s).toMatchObject({
      piece: 'bigrusty-s',
      label: 'bigrusty · s',
      level: 1.2,
      tune: -300,
      decay: 0.5,
      spec: {
        folder: 'bigrusty',
        trim: 1.5,
        layers: [{ v: 1, files: ['s-0-0.m4a', 's-0-1.m4a'] }],
      },
    });
    expect(data.pan).toEqual({ s: -0.2 });

    // what was stored is the reference, not a copy of the recordings
    expect(db.kits[0].samples).toEqual({
      slots: { s: { piece: 'bigrusty-s', level: 1.2, tune: -300, decay: 0.5 } },
      pan: { s: -0.2 },
    });
  });

  it('plays another slot of a piece where `from` names it: a rimshot piece slot as the snare', async () => {
    seedPiece('bigrusty-s', ['s', 'sRim']);
    const kit = seedKit(USER_ID);

    const { data } = await json<KitWithPieces>(
      await patch(kit.id, { slots: { s: { piece: 'bigrusty-s', from: 'sRim' } } })
    );
    const slot = data.slots.s as PieceSlot;
    expect(slot.from).toBe('sRim');
    expect(slot.spec.layers[0].files).toEqual(['sRim-0-0.m4a', 'sRim-0-1.m4a']);
  });

  it('400s a piece that does not exist, and a slot the piece does not fill, and writes nothing', async () => {
    seedPiece('bigrusty-s', ['s']);
    const kit = seedKit(USER_ID);
    const before = structuredClone(db.kits[0].samples);

    const res = await patch(kit.id, {
      slots: { k: { piece: 'nothing-k' }, s: { piece: 'bigrusty-s', from: 'sRim' } },
    });
    expect(res.status).toBe(400);
    const body = await json<unknown>(res);
    expect(JSON.stringify(body.error?.details)).toContain('slots.k.piece');
    expect(JSON.stringify(body.error?.details)).toContain('slots.s.from');
    expect(db.kits[0].samples).toEqual(before);
  });

  it('still 400s someone else’s sample in `{ sample }`, naming the slot (the 404 is for their kit)', async () => {
    const theirs = seedSample(OTHER_ID);
    const kit = seedKit(USER_ID);

    const res = await patch(kit.id, { slots: { k: { sample: theirs.id } } });
    expect(res.status).toBe(400);
    expect(JSON.stringify((await json<unknown>(res)).error?.details)).toContain('slots.k');
  });

  it.each([
    ['tune above an octave', { piece: 'bigrusty-s', tune: 1201 }],
    ['tune below an octave', { piece: 'bigrusty-s', tune: -1201 }],
    ['decay under 0.2', { piece: 'bigrusty-s', decay: 0.1 }],
    ['decay over 1', { piece: 'bigrusty-s', decay: 1.1 }],
    ['level over 2', { piece: 'bigrusty-s', level: 2.5 }],
  ])('400s %s', async (_what, slot) => {
    seedPiece('bigrusty-s', ['s']);
    const kit = seedKit(USER_ID);
    expect((await patch(kit.id, { slots: { s: slot } })).status).toBe(400);
  });

  it('400s a pan past ±1, and puts a lane back to its default with null', async () => {
    const kit = seedKit(USER_ID);
    expect((await patch(kit.id, { pan: { h: 1.5 } })).status).toBe(400);

    await patch(kit.id, { pan: { h: -0.5, r: 0.5 } });
    const { data } = await json<KitWithPieces>(await patch(kit.id, { pan: { h: null } }));
    expect(data.pan).toEqual({ r: 0.5 });
  });

  it('keeps a sample of yours beside a piece, and takes the bare id it always took', async () => {
    seedPiece('bigrusty-s', ['s']);
    const kick = seedSample(USER_ID);
    const kit = seedKit(USER_ID);

    const { data } = await json<KitWithPieces>(
      await patch(kit.id, { slots: { k: kick.id, s: { piece: 'bigrusty-s' } } })
    );
    expect(data.slots.k).toMatchObject({ sampleId: kick.id });
    expect(data.slots.s).toMatchObject({ piece: 'bigrusty-s' });
  });

  it('shows a slot naming a piece the catalogue no longer has as empty', async () => {
    const kit = seedKit(USER_ID, {}, { samples: { slots: { s: { piece: 'gone-s' } } } });
    const { data } = await json<KitWithPieces>(await read(kit.id));
    expect(data.slots).toEqual({});
  });
});

describe('make my own from this kit (9-v)', () => {
  /** Big Rusty's numbers, as its row holds them. */
  function testKitParams(): Record<string, unknown> {
    const {
      label: _label,
      hint: _hint,
      engine: _engine,
      credit: _credit,
      ...params
    } = KITS.bigrusty;
    return params;
  }

  function recordedKit(): void {
    seedPiece('bigrusty-k', ['k']);
    seedPiece('bigrusty-s', ['s', 'sRim']);
    seedKit(
      OTHER_ID,
      {},
      {
        ownerId: null,
        key: 'bigrusty',
        engine: 'pack',
        label: 'Big Rusty',
        visibility: 'system',
        params: {
          ...testKitParams(),
          pack: 'bigrusty',
          master: { lp: 9000, drive: 1.5, room: 0.1 },
        },
        samples: {
          slots: {
            k: { piece: 'bigrusty-k' },
            s: { piece: 'bigrusty-s' },
            sRim: { piece: 'bigrusty-s' },
          },
        },
      }
    );
  }

  it('copies a recorded kit into one of yours: the same pieces, its numbers, and no pack', async () => {
    recordedKit();

    const res = await create({ from: 'bigrusty' });
    expect(res.status).toBe(201);
    const { data } = await json<KitWithPieces>(res);
    expect(data.label).toBe('My Big Rusty');
    expect(
      Object.fromEntries(
        Object.entries(data.slots).map(([k, v]) => [k, 'piece' in v ? v.piece : null])
      )
    ).toEqual({
      k: 'bigrusty-k',
      s: 'bigrusty-s',
      sRim: 'bigrusty-s',
    });
    expect(data.params?.master.lp).toBe(9000);

    const mine = db.kits.find((k) => k.id === data.id);
    expect(mine).toMatchObject({ ownerId: USER_ID, engine: 'user', visibility: 'private' });
    expect((mine?.params as { pack?: string }).pack).toBeUndefined();
  });

  it('copies one of your own kits, samples and pans too, under the name you give it', async () => {
    const kick = seedSample(USER_ID);
    const kit = seedKit(USER_ID, { k: kick.id }, { label: 'Garage' });
    await patch(kit.id, { pan: { k: 0.1 } });

    const { data } = await json<KitWithPieces>(await create({ from: kit.key, label: 'Garage 2' }));
    expect(data.label).toBe('Garage 2');
    expect(data.slots.k).toMatchObject({ sampleId: kick.id });
    expect(data.pan).toEqual({ k: 0.1 });
  });

  it('400s a synthesised kit, someone else’s kit, and a key that names nothing, naming `from`', async () => {
    seedKit(
      OTHER_ID,
      {},
      { ownerId: null, key: 'studio70', engine: 'synth', visibility: 'system' }
    );
    const theirs = seedKit(OTHER_ID);

    for (const from of ['studio70', theirs.key, 'no-such-kit']) {
      const res = await create({ from });
      expect(res.status, from).toBe(400);
      expect(JSON.stringify((await json<unknown>(res)).error?.details), from).toContain('from');
    }
    expect(db.kits.filter((k) => k.ownerId === USER_ID)).toHaveLength(0);
  });

  it(`still refuses a copy past ${MAX_YOUR_KITS}`, async () => {
    recordedKit();
    for (let i = 0; i < MAX_YOUR_KITS; i++) seedKit(USER_ID);
    const res = await create({ from: 'bigrusty' });
    expect(res.status).toBe(409);
    expect((await json<unknown>(res)).error?.code).toBe('KIT_LIMIT');
  });
});
