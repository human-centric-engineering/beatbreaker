/**
 * Integration Test: /api/v1/studio-settings — your Studio settings (D19)
 *
 * The real `withAuth` guard, the real schema and the real
 * `lib/app/breaks/saved/settings` run over a mocked session, a mocked Prisma
 * and a mocked catalogue. The settings table is a small in-memory store whose
 * upsert merges top-level keys the way the route's `prefs || patch` does,
 * because what is under test is what the row ENDS UP holding after a partial
 * write — a stub that returned canned rows would only assert itself.
 *
 * The statement itself (the jsonb merge, the ON CONFLICT, the cascade) was
 * also run against a real Postgres when this was written.
 *
 * @see app/api/v1/studio-settings/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PATCH } from '@/app/api/v1/studio-settings/route';
import { logger } from '@/lib/logging';
import { DEFAULT_STUDIO_SETTINGS } from '@/lib/validations/studio-settings';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    studioSettings: { findUnique: vi.fn() },
    kit: { findMany: vi.fn() },
    $executeRaw: vi.fn(),
  },
}));
vi.mock('@/lib/app/breaks/catalogue/data', () => ({
  listKits: vi.fn(),
  listStyles: vi.fn(),
}));

import { listKits, listStyles } from '@/lib/app/breaks/catalogue/data';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const OTHER_ID = 'clzx9k8p40000x8c2g3h5m7b1';

/* ---- the in-memory settings table -------------------------------------- */

let rows: Map<string, Record<string, unknown>>;

function install() {
  vi.mocked(prisma.studioSettings.findUnique).mockImplementation(((args: {
    where: { userId: string };
  }) => {
    const prefs = rows.get(args.where.userId);
    return Promise.resolve(prefs ? { prefs } : null);
  }) as never);

  /* `prefs || patch`, with `sound` merged a level deeper: the patch's
     top-level keys replace the stored ones, its kits replace the stored kits,
     and the rest stay. What the statement really does was checked against
     Postgres by hand; this models it. A tagged-template call passes the SQL's
     strings, then its bound parameters in order — userId, then the patch as
     JSON. */
  vi.mocked(prisma.$executeRaw).mockImplementation(((_sql: unknown, ...values: unknown[]) => {
    const [userId, json] = values as [string, string];
    const stored = rows.get(userId) ?? {};
    const patch = JSON.parse(json) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...stored, ...patch };
    if (patch.sound) {
      const was = stored.sound;
      merged.sound = {
        ...(was && typeof was === 'object' ? was : {}),
        ...(patch.sound as Record<string, unknown>),
      };
    }
    rows.set(userId, merged);
    return Promise.resolve(1);
  }) as never);

  vi.mocked(listKits).mockResolvedValue([
    { key: 'studio70', engine: 'synth' },
    { key: 'brush', engine: 'pack' },
    // a drum machine with no implementation behind it yet: listed, not playable
    { key: 'tr808', engine: 'drift' },
  ] as never);
  vi.mocked(listStyles).mockResolvedValue([{ key: 'funk' }, { key: 'jazz' }] as never);

  /* Your own kits (D20), owner-scoped: the caller has one, someone else has
     another. The data layer asks for `{ ownerId, engine: 'user' }`. */
  vi.mocked(prisma.kit.findMany).mockImplementation(((args: {
    where: { ownerId: string; engine: string };
  }) =>
    Promise.resolve(
      yourKits
        .filter((k) => k.ownerId === args.where.ownerId && args.where.engine === 'user')
        .map(({ key }) => ({ key }))
    )) as never);
}

let yourKits: Array<{ ownerId: string; key: string }>;

/* ---- requests --------------------------------------------------------- */

const BASE = 'http://localhost:3000/api/v1/studio-settings';

function read(): Promise<Response> {
  return GET(new NextRequest(BASE));
}

function patch(body: unknown): Promise<Response> {
  return PATCH(
    new NextRequest(BASE, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

interface Body {
  success: boolean;
  data: Record<string, unknown>;
  error?: { code: string; message: string; details?: { errors: Array<{ path: string }> } };
}

async function json(res: Response): Promise<Body> {
  return JSON.parse(await res.text()) as Body;
}

/** The paths a 400 names. */
async function refused(res: Response): Promise<string[]> {
  expect(res.status).toBe(400);
  const body = await json(res);
  expect(body.error?.code).toBe('VALIDATION_ERROR');
  return (body.error?.details?.errors ?? []).map((e) => e.path);
}

beforeEach(() => {
  vi.clearAllMocks();
  rows = new Map();
  yourKits = [
    { ownerId: USER_ID, key: 'yours-mine' },
    { ownerId: OTHER_ID, key: 'yours-theirs' },
  ];
  install();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

/* ---- tests ------------------------------------------------------------ */

describe('auth', () => {
  it('401s both methods without a session, before any query', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    expect((await read()).status).toBe(401);
    expect((await patch({ countIn: 2 })).status).toBe(401);
    expect(prisma.studioSettings.findUnique).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});

describe('GET', () => {
  it('reads as every default when you have never saved a setting', async () => {
    const res = await read();

    expect(res.status).toBe(200);
    expect((await json(res)).data).toEqual(DEFAULT_STUDIO_SETTINGS);
  });

  it('reads only the caller’s row', async () => {
    rows.set(OTHER_ID, { countIn: 0 });
    rows.set(USER_ID, { countIn: 2 });

    const { data } = await json(await read());

    expect(data.countIn).toBe(2);
    expect(prisma.studioSettings.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } })
    );
  });

  it('reads a stored field that no longer parses as its default, keeps the rest, and says which', async () => {
    /* A bound tightened after the value was saved. The tuning next to it is
       still good and must survive: a schema change is not a reason to lose
       someone's kit. */
    const warn = vi.spyOn(logger, 'warn');
    rows.set(USER_ID, {
      startBpm: 9000,
      countIn: 2,
      sound: { studio70: { k: { tune: 50 } } },
      retiredField: true,
    });

    const { data } = await json(await read());

    expect(data.startBpm).toBe(DEFAULT_STUDIO_SETTINGS.startBpm);
    expect(data.countIn).toBe(2);
    expect(data.sound).toEqual({ studio70: { k: { tune: 50 } } });
    expect(data).not.toHaveProperty('retiredField');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('fell back'), {
      userId: USER_ID,
      fields: ['startBpm'],
    });
  });

  it('reads a kit or style the catalogue no longer has as its default', async () => {
    const warn = vi.spyOn(logger, 'warn');
    rows.set(USER_ID, { kit: 'brush', userKit: 'retired-kit', startStyle: 'polka' });

    const { data } = await json(await read());

    expect(data.kit).toBe('brush');
    expect(data.userKit).toBe(DEFAULT_STUDIO_SETTINGS.userKit);
    expect(data.startStyle).toBe(DEFAULT_STUDIO_SETTINGS.startStyle);
    expect(warn).toHaveBeenCalledWith(expect.any(String), {
      userId: USER_ID,
      fields: ['userKit', 'startStyle'],
    });
  });

  it('reads a kit of yours as itself, and as its default once you delete it', async () => {
    rows.set(USER_ID, { kit: 'yours-mine', userKit: 'yours-mine' });
    expect((await json(await read())).data.kit).toBe('yours-mine');

    yourKits = yourKits.filter((k) => k.key !== 'yours-mine');
    const { data } = await json(await read());

    expect(data.kit).toBe(DEFAULT_STUDIO_SETTINGS.kit);
    expect(data.userKit).toBe(DEFAULT_STUDIO_SETTINGS.userKit);
  });

  it('says nothing when every stored field is good', async () => {
    const warn = vi.spyOn(logger, 'warn');
    rows.set(USER_ID, { countIn: 0, kit: 'brush' });

    await read();

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('PATCH', () => {
  it('merges: the fields given replace the stored ones, and the rest are kept', async () => {
    await patch({ countIn: 2, kit: 'brush' });
    const res = await patch({ countIn: 0, startBpm: 120 });

    expect(res.status).toBe(200);
    const { data } = await json(res);
    expect(data).toEqual({
      ...DEFAULT_STUDIO_SETTINGS,
      countIn: 0,
      kit: 'brush',
      startBpm: 120,
    });
    // and it is what the next read sees
    expect((await json(await read())).data).toEqual(data);
  });

  it('writes only what was sent, under the caller’s id', async () => {
    await patch({ sticking: true });

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    // strings first, then the bound parameters — none of it interpolated into the SQL
    const [strings, ...values] = vi.mocked(prisma.$executeRaw).mock.calls[0] as unknown[];
    expect((strings as string[]).join('')).not.toContain(USER_ID);
    expect(values[0]).toBe(USER_ID);
    expect(JSON.parse(values[1] as string)).toEqual({ sticking: true });
  });

  it('merges tuning by kit — a kit sent replaces that kit, the others stay', async () => {
    await patch({
      sound: { studio70: { k: { tune: 50 }, s: { tune: 40 } }, brush: { s: { rate: 1.2 } } },
    });
    await patch({ sound: { studio70: { k: { tune: 60 } } } });

    const { data } = await json(await read());
    expect(data.sound).toEqual({ studio70: { k: { tune: 60 } }, brush: { s: { rate: 1.2 } } });
    // the statement does the kit-level merge itself, not only the top-level `||`
    const [strings] = vi.mocked(prisma.$executeRaw).mock.calls[1] as unknown[];
    expect((strings as string[]).join('')).toContain(`-> 'sound'`);
  });

  it('refuses an unknown field, and writes nothing', async () => {
    expect(await refused(await patch({ countIn: 2, bpm: 120 }))).toEqual(['']);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it.each([
    ['a starting tempo under 50', { startBpm: 49 }, 'startBpm'],
    ['a starting tempo over 300', { startBpm: 301 }, 'startBpm'],
    ['a fractional tempo', { startBpm: 94.5 }, 'startBpm'],
    ['a count-in of 3', { countIn: 3 }, 'countIn'],
    ['five bars', { startBars: 5 }, 'startBars'],
    ['a meter the Studio does not have', { startMeter: '11/8' }, 'startMeter'],
    [
      'a percussion lane that is not an instrument',
      { customLanes: { p1: 'kazoo' } },
      'customLanes.p1',
    ],
    [
      'a kick tuned above every engine’s range',
      { sound: { studio70: { k: { tune: 100 } } } },
      'sound.studio70.k.tune',
    ],
    [
      'a master drive above the drawer’s range',
      { sound: { studio70: { master: { drive: 3 } } } },
      'sound.studio70.master.drive',
    ],
    [
      'a voice that does not exist',
      { sound: { studio70: { z: { tune: 1 } } } },
      'sound.studio70.z',
    ],
    [
      'a parameter that voice does not have',
      { sound: { studio70: { t: { rate: 1 } } } },
      'sound.studio70.t.rate',
    ],
  ])('refuses %s, naming the field', async (_what, body, path) => {
    expect(await refused(await patch(body))).toEqual([path]);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('takes a tuning value that only a sampled kit uses', async () => {
    /* The schema holds each parameter to the widest range any engine gives
       it, because it cannot know the kit's engine. A sampled kit's snare speed
       is not a synthesiser parameter, and must still be storable. */
    const res = await patch({ sound: { brush: { s: { rate: 1.5, level: 1.2 } } } });

    expect(res.status).toBe(200);
  });

  it.each([
    ['kit', 'retired-kit'],
    ['kit', 'tr808'],
    ['userKit', 'retired-kit'],
    ['startStyle', 'polka'],
  ])('refuses %s %s, which the catalogue cannot play, and writes nothing', async (field, key) => {
    expect(await refused(await patch({ countIn: 2, [field]: key }))).toEqual([field]);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('takes one of your own kits', async () => {
    const res = await patch({ kit: 'yours-mine', userKit: 'yours-mine' });

    expect(res.status).toBe(200);
    expect((await json(res)).data.kit).toBe('yours-mine');
  });

  it('refuses someone else’s kit, and writes nothing', async () => {
    expect(await refused(await patch({ kit: 'yours-theirs' }))).toEqual(['kit']);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('does not read the catalogue for a patch that names no kit or style', async () => {
    await patch({ guides: false });

    // the read-back reads it once; the check would have been a second time
    expect(listKits).toHaveBeenCalledTimes(1);
  });
});
