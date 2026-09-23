/**
 * Admin catalogue — GET/POST /api/v1/admin/catalogue/styles/[key]/versions
 *
 * This is the only way a style is edited: a version is added, the style's
 * pointer moves. It is deliberately NOT the only route in this folder that
 * could exist — there is no PUT or PATCH here, because rewriting a version
 * would change breaks nobody touched. That absence is asserted directly
 * below, the same way an admin editing `.context/app/catalogue.md` would
 * check it: by reading the module's own exports.
 *
 * @see app/api/v1/admin/catalogue/styles/[key]/versions/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mockAdminUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/helpers/auth';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(() => Promise.resolve(new Headers())) }));
vi.mock('@/lib/security/ip', () => ({ getClientIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/db/client', () => ({
  prisma: { style: { findFirst: vi.fn() } },
}));
vi.mock('@/lib/app/breaks/catalogue/admin', async () => {
  const actual = await vi.importActual<typeof import('@/lib/app/breaks/catalogue/admin')>(
    '@/lib/app/breaks/catalogue/admin'
  );
  return { ...actual, addStyleVersion: vi.fn() };
});

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';
import { addStyleVersion } from '@/lib/app/breaks/catalogue/admin';
import * as versionsRoute from '@/app/api/v1/admin/catalogue/styles/[key]/versions/route';

const { GET, POST } = versionsRoute;
const FUNK_PARAMS = STYLES.funk;

function get(): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/admin/catalogue/styles/funk/versions');
}

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/admin/catalogue/styles/funk/versions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function ctx(key = 'funk') {
  return { params: Promise.resolve({ key }) };
}

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
});

describe('module shape', () => {
  it('exports no PUT or PATCH — a version cannot be edited, only added', () => {
    // The regression this catches is not a 404: a route module that grew a
    // PUT/PATCH handler here would compile, pass every other test, and
    // quietly reopen the "rewrite a version" hole the immutability promise
    // depends on closing. Reading the module's own exports is the only check
    // that would catch that on the day it happens.
    expect((versionsRoute as Record<string, unknown>).PUT).toBeUndefined();
    expect((versionsRoute as Record<string, unknown>).PATCH).toBeUndefined();
    expect((versionsRoute as Record<string, unknown>).DELETE).toBeUndefined();
  });
});

describe('GET /api/v1/admin/catalogue/styles/[key]/versions', () => {
  it('401s a caller with no session, before touching the database', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await GET(get(), ctx());
    expect(res.status).toBe(401);
    expect(prisma.style.findFirst).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin, before touching the database', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await GET(get(), ctx());
    expect(res.status).toBe(403);
    expect(prisma.style.findFirst).not.toHaveBeenCalled();
  });

  it('404s a key with no matching system style', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue(null);
    const res = await GET(get(), ctx('nope'));
    expect(res.status).toBe(404);
  });

  it('returns every version, newest first, for the key requested', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue({
      id: 's1',
      currentVersion: 2,
      versions: [{ id: 'v2', version: 2 }],
    } as never);

    const res = await GET(get(), ctx());
    expect(res.status).toBe(200);

    const args = vi.mocked(prisma.style.findFirst).mock.calls[0][0];
    expect(args?.where).toEqual({ key: 'funk', ownerId: null });
    expect(args?.select?.versions).toMatchObject({ orderBy: { version: 'desc' } });
  });
});

describe('POST /api/v1/admin/catalogue/styles/[key]/versions', () => {
  it('401s a caller with no session, before writing a version', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post({ params: FUNK_PARAMS }), ctx());
    expect(res.status).toBe(401);
    expect(addStyleVersion).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin, before writing a version', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await POST(post({ params: FUNK_PARAMS }), ctx());
    expect(res.status).toBe(403);
    expect(addStyleVersion).not.toHaveBeenCalled();
  });

  it('400s params that fail styleParamsSchema, without calling addStyleVersion', async () => {
    // The tempo range is a [low, high] tuple that must not be inverted — a
    // style that ran [106, 88] would give the generator a range with no
    // numbers in it.
    const badParams = { ...FUNK_PARAMS, bpm: [106, 88] };
    const res = await POST(post({ params: badParams }), ctx());
    expect(res.status).toBe(400);
    expect(addStyleVersion).not.toHaveBeenCalled();
  });

  it('404s a key with no matching system style', async () => {
    vi.mocked(addStyleVersion).mockResolvedValue(null);
    const res = await POST(post({ params: FUNK_PARAMS }), ctx('nope'));
    expect(res.status).toBe(404);
  });

  it('201s on a successful write, with the new version number', async () => {
    vi.mocked(addStyleVersion).mockResolvedValue({ version: 3 });

    const res = await POST(post({ params: FUNK_PARAMS, note: 'Softened the ghost bias' }), ctx());
    expect(res.status).toBe(201);

    expect(addStyleVersion).toHaveBeenCalledWith(
      'funk',
      { params: expect.objectContaining(FUNK_PARAMS), note: 'Softened the ghost bias' },
      { userId: mockAdminUser().user.id, clientIp: '127.0.0.1' }
    );

    const body = await json<{ success: boolean; data: { version: number } }>(res);
    expect(body).toEqual({ success: true, data: { version: 3 } });
  });

  it('defaults an empty note rather than requiring one', async () => {
    vi.mocked(addStyleVersion).mockResolvedValue({ version: 2 });
    await POST(post({ params: FUNK_PARAMS }), ctx());
    expect(addStyleVersion).toHaveBeenCalledWith(
      'funk',
      expect.objectContaining({ note: '' }),
      expect.anything()
    );
  });
});
