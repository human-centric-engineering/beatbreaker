/**
 * Integration Test: GET/PUT /api/v1/drummer-about — About you (task 7B.3)
 *
 * The real `withAuth` guard, the real `drummerAboutSchema` (so channel
 * canonicalisation and the off-allowlist refusal are the schema's own code,
 * not a stand-in) and the real `lib/app/breaks/community/about` /
 * `about-saved` logic run over a mocked session, a mocked Prisma and a mocked
 * catalogue. `DrummerAbout` is a small in-memory row, the same house pattern
 * as `tests/integration/api/v1/studio-settings/route.test.ts`, because what
 * is under test is what the row ENDS UP holding after a partial write.
 *
 * `updateStudioSettings` and `invalidateContext` — what saving About you
 * changes elsewhere (task 7B.8/7B.9) — are mocked at their own module
 * boundary: the settings merge itself is covered by the Studio-settings
 * suite, so here we assert only that `about-saved.ts` calls them with the
 * right arguments in the right circumstances.
 *
 * @see app/api/v1/drummer-about/route.ts
 * @see lib/app/breaks/community/about.ts
 * @see lib/app/breaks/community/about-saved.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PUT } from '@/app/api/v1/drummer-about/route';
import { BUDDY_CONTEXT } from '@/lib/app/breaks/buddy/about-context';
import { ABILITY_START, DEFAULT_PUBLIC } from '@/lib/validations/drummer-about';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => ({
  prisma: { drummerAbout: { findUnique: vi.fn(), upsert: vi.fn() } },
}));
vi.mock('@/lib/app/breaks/catalogue/data', () => ({ listStyles: vi.fn() }));
vi.mock('@/lib/app/breaks/saved/settings', () => ({ updateStudioSettings: vi.fn() }));
vi.mock('@/lib/orchestration/chat/context-builder', () => ({ invalidateContext: vi.fn() }));

import { auth } from '@/lib/auth/config';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { updateStudioSettings } from '@/lib/app/breaks/saved/settings';
import { prisma } from '@/lib/db/client';
import { invalidateContext } from '@/lib/orchestration/chat/context-builder';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const BASE = 'http://localhost:3000/api/v1/drummer-about';

interface Row {
  userId: string;
  purposes: string[];
  styles: string[];
  ability: string | null;
  styleAbility: Record<string, string>;
  channels: unknown[];
  public: Record<string, boolean>;
  askedAt: Date | null;
}

let rows: Map<string, Row>;

function install() {
  vi.mocked(prisma.drummerAbout.findUnique).mockImplementation(((args: {
    where: { userId: string };
  }) => Promise.resolve(rows.get(args.where.userId) ?? null)) as never);

  vi.mocked(prisma.drummerAbout.upsert).mockImplementation(((args: {
    where: { userId: string };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }) => {
    const existing = rows.get(args.where.userId);
    const data = existing ? args.update : args.create;
    const row = {
      userId: args.where.userId,
      askedAt: existing?.askedAt ?? null,
      ...existing,
      ...data,
    } as Row;
    rows.set(args.where.userId, row);
    return Promise.resolve(row);
  }) as never);

  vi.mocked(listStyles).mockResolvedValue([
    { key: 'funk' },
    { key: 'jazz' },
    { key: 'samba' },
    { key: 'rock' },
    { key: 'reggae' },
    { key: 'afrobeat' },
    { key: 'gospel' },
    { key: 'metal' },
    { key: 'hiphop' },
  ] as never);

  vi.mocked(updateStudioSettings).mockResolvedValue({} as never);
}

function get(): Promise<Response> {
  return GET(new NextRequest(BASE));
}

function put(body: unknown): Promise<Response> {
  return PUT(
    new NextRequest(BASE, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

interface AboutBody {
  success: boolean;
  data: {
    purposes: string[];
    styles: string[];
    ability: string | null;
    styleAbility: Record<string, string>;
    channels: Array<{ kind: string; url: string; drumming: boolean; display: string }>;
    public: Record<string, boolean>;
    askedAt: string | null;
  };
  error?: { code: string; message: string; details?: { errors: Array<{ path: string }> } };
}

async function json(res: Response): Promise<AboutBody> {
  return JSON.parse(await res.text()) as AboutBody;
}

async function refused(res: Response): Promise<string[]> {
  expect(res.status).toBe(400);
  const body = await json(res);
  expect(body.error?.code).toBe('VALIDATION_ERROR');
  return (body.error?.details?.errors ?? []).map((e) => e.path);
}

beforeEach(() => {
  vi.clearAllMocks();
  rows = new Map();
  install();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

describe('auth', () => {
  it('401s GET without a session, before any query', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await get();
    expect(res.status).toBe(401);
    expect(prisma.drummerAbout.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('401s PUT without a session, before any write', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await put({ ability: 'beginner' });
    expect(res.status).toBe(401);
    expect(prisma.drummerAbout.upsert).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });
});

describe('GET /api/v1/drummer-about', () => {
  it('reads every field as its default when nothing has been saved', async () => {
    const { data } = await json(await get());
    expect(data).toEqual({
      purposes: [],
      styles: [],
      ability: null,
      styleAbility: {},
      channels: [],
      public: DEFAULT_PUBLIC,
      askedAt: null,
    });
  });

  it('defaults channels public and the rest private', async () => {
    const { data } = await json(await get());
    expect(data.public).toEqual({
      purposes: false,
      styles: false,
      ability: false,
      channels: true,
    });
  });
});

describe('PUT /api/v1/drummer-about — each field saves and reads back', () => {
  it('saves and reads back purposes', async () => {
    await put({ purposes: ['learning', 'teaching'] });
    const { data } = await json(await get());
    expect(data.purposes).toEqual(['learning', 'teaching']);
  });

  it('saves and reads back styles', async () => {
    await put({ styles: ['funk', 'jazz'] });
    const { data } = await json(await get());
    expect(data.styles).toEqual(['funk', 'jazz']);
  });

  it('saves and reads back ability', async () => {
    await put({ ability: 'advanced' });
    const { data } = await json(await get());
    expect(data.ability).toBe('advanced');
  });

  it('saves and reads back a per-style ability for a chosen style', async () => {
    await put({ styles: ['funk'], styleAbility: { funk: 'intermediate' } });
    const { data } = await json(await get());
    expect(data.styleAbility).toEqual({ funk: 'intermediate' });
  });

  it('saves and reads back channels', async () => {
    await put({ channels: [{ url: 'https://www.youtube.com/@ringo', drumming: true }] });
    const { data } = await json(await get());
    expect(data.channels).toEqual([
      {
        kind: 'youtube',
        url: 'https://www.youtube.com/@ringo',
        drumming: true,
        display: '@ringo',
      },
    ]);
  });

  it('saves and reads back the public switches', async () => {
    await put({ public: { purposes: true, ability: true } });
    const { data } = await json(await get());
    expect(data.public).toEqual({
      purposes: true,
      styles: false,
      ability: true,
      channels: true,
    });
  });

  it('records askedAt when asked: true is sent, and leaves it once set', async () => {
    const res = await put({ asked: true });
    const first = (await json(res)).data.askedAt;
    expect(first).not.toBeNull();

    // saving an unrelated field afterwards does not clear or move askedAt
    await put({ ability: 'beginner' });
    const { data } = await json(await get());
    expect(data.askedAt).toBe(first);
  });

  it('leaves a field out of the PUT body untouched', async () => {
    await put({ purposes: ['learning'] });
    await put({ ability: 'beginner' });
    const { data } = await json(await get());
    expect(data.purposes).toEqual(['learning']);
    expect(data.ability).toBe('beginner');
  });

  it('clears styles with an empty list and ability with null', async () => {
    await put({ styles: ['funk'], ability: 'beginner' });
    const res = await put({ styles: [], ability: null });
    expect(res.status).toBe(200);
    const { data } = await json(await get());
    expect(data.styles).toEqual([]);
    expect(data.ability).toBeNull();
  });
});

describe('PUT /api/v1/drummer-about — channel links', () => {
  it('refuses an off-allowlist channel with 400 and writes nothing', async () => {
    // not https: refused outright, never treated as a personal website
    const res = await put({
      channels: [{ url: 'http://www.youtube.com/@someone', drumming: false }],
    });
    expect(res.status).toBe(400);
    expect(prisma.drummerAbout.upsert).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema refuses before any write
  });

  it('stores twitter.com as the canonical x.com URL, tracking params dropped', async () => {
    const res = await put({ channels: [{ url: 'https://twitter.com/jo?x=1', drumming: false }] });
    expect(res.status).toBe(200);

    const written = vi.mocked(prisma.drummerAbout.upsert).mock.calls[0][0] as {
      create: { channels: Array<{ kind: string; url: string }> };
    };
    expect(written.create.channels).toEqual([
      { kind: 'x', url: 'https://x.com/jo', drumming: false },
    ]);

    const { data } = await json(await get());
    expect(data.channels[0].url).toBe('https://x.com/jo');
    expect(data.channels[0].kind).toBe('x');
  });
});

describe('PUT /api/v1/drummer-about — validation', () => {
  it('400s an unknown style, checked against the catalogue, and writes nothing', async () => {
    const res = await put({ styles: ['not-a-real-style'] });
    expect(res.status).toBe(400);
    expect(prisma.drummerAbout.upsert).not.toHaveBeenCalled(); // test-review:accept no_arg_called — catalogue check refuses before any write
  });

  it('400s a ninth style', async () => {
    const paths = await refused(
      await put({
        styles: [
          'funk',
          'jazz',
          'samba',
          'rock',
          'reggae',
          'afrobeat',
          'gospel',
          'metal',
          'hiphop',
        ],
      })
    );
    expect(paths).toContain('styles');
    expect(prisma.drummerAbout.upsert).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema refuses before any write
  });

  it('400s a styleAbility naming a style that was not chosen', async () => {
    const res = await put({ styles: ['funk'], styleAbility: { jazz: 'beginner' } });
    expect(res.status).toBe(400);
    expect(prisma.drummerAbout.upsert).not.toHaveBeenCalled(); // test-review:accept no_arg_called — data layer refuses before any write
  });

  it('400s a strict-unknown top-level key', async () => {
    const res = await put({ favouriteColour: 'blue' });
    expect(res.status).toBe(400);
    expect(prisma.drummerAbout.upsert).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema refuses before any write
  });
});

describe('PUT /api/v1/drummer-about — ability and Studio settings (7B.8/7B.9)', () => {
  it('patches Studio settings with the ability’s ABILITY_START values when the ability changes', async () => {
    await put({ ability: 'advanced' });

    expect(updateStudioSettings).toHaveBeenCalledWith(USER_ID, ABILITY_START.advanced);
  });

  it('does not touch Studio settings when saving the same ability again', async () => {
    await put({ ability: 'advanced' });
    vi.mocked(updateStudioSettings).mockClear();

    await put({ ability: 'advanced' });

    expect(updateStudioSettings).not.toHaveBeenCalled();
  });

  it('does not touch Studio settings when an unrelated field changes', async () => {
    await put({ purposes: ['learning'] });
    expect(updateStudioSettings).not.toHaveBeenCalled();
  });

  it('invalidates BeatBuddy’s cached context on every save, keyed on the caller', async () => {
    await put({ purposes: ['learning'] });
    expect(invalidateContext).toHaveBeenCalledWith(BUDDY_CONTEXT.type, BUDDY_CONTEXT.id, {
      userId: USER_ID,
    });
  });
});
