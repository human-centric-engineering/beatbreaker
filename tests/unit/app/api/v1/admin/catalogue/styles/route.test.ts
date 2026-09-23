/**
 * Admin catalogue — GET/POST /api/v1/admin/catalogue/styles
 *
 * What matters here: the route is genuinely behind `withAdminAuth` (a
 * copy-pasted route that forgot the wrapper is the failure this guards
 * against, on every verb); a bad body is refused before `createStyle` ever
 * runs; and a successful create returns the 201 shape the admin page reads.
 *
 * `@/lib/app/breaks/catalogue/admin` is mocked with `importActual` so the
 * real Zod schemas run (validation is the thing worth pinning) while the
 * writer function itself is a spy — this file is about the route's wiring,
 * not about `createStyle`'s own transaction.
 *
 * @see app/api/v1/admin/catalogue/styles/route.ts
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
  prisma: { style: { findMany: vi.fn() } },
}));
vi.mock('@/lib/app/breaks/catalogue/admin', async () => {
  const actual = await vi.importActual<typeof import('@/lib/app/breaks/catalogue/admin')>(
    '@/lib/app/breaks/catalogue/admin'
  );
  return { ...actual, createStyle: vi.fn() };
});

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';
import { createStyle } from '@/lib/app/breaks/catalogue/admin';
import { GET, POST } from '@/app/api/v1/admin/catalogue/styles/route';

/** A real seed style's params — a valid `styleParamsSchema` payload, not a hand-rolled stub. */
const FUNK_PARAMS = STYLES.funk;

function get(): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/admin/catalogue/styles');
}

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/admin/catalogue/styles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
});

describe('GET /api/v1/admin/catalogue/styles', () => {
  it('401s a caller with no session, before touching the database', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(prisma.style.findMany).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin, before touching the database', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await GET(get());
    expect(res.status).toBe(403);
    expect(prisma.style.findMany).not.toHaveBeenCalled();
  });

  it('lists only system rows, ordered for the picker, wrapped in the envelope', async () => {
    vi.mocked(prisma.style.findMany).mockResolvedValue([
      { id: 's1', key: 'funk', label: 'Funk 16ths', _count: { versions: 2 } },
    ] as never);

    const res = await GET(get());
    expect(res.status).toBe(200);

    const args = vi.mocked(prisma.style.findMany).mock.calls[0][0];
    // ownerId: null is the whole ownership story for a system catalogue row —
    // dropping it would leak a future user-owned style (D16) into the admin list.
    expect(args?.where).toEqual({ ownerId: null });
    expect(args?.orderBy).toEqual([{ group: 'asc' }, { position: 'asc' }]);

    const body = await json<{ success: boolean; data: unknown[] }>(res);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/v1/admin/catalogue/styles', () => {
  it('401s a caller with no session, before creating anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post({ key: 'new-style', group: 'Funk', params: FUNK_PARAMS }));
    expect(res.status).toBe(401);
    expect(createStyle).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin, before creating anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await POST(post({ key: 'new-style', group: 'Funk', params: FUNK_PARAMS }));
    expect(res.status).toBe(403);
    expect(createStyle).not.toHaveBeenCalled();
  });

  it('400s a style whose params fail styleParamsSchema, without calling createStyle', async () => {
    // `hats` must be 8 or 16 — a style whose cymbal ostinato names any other
    // subdivision is the kind of row that would hang the generator.
    const badParams = { ...FUNK_PARAMS, hats: 7 };
    const res = await POST(post({ key: 'new-style', group: 'Funk', params: badParams }));
    expect(res.status).toBe(400);
    expect(createStyle).not.toHaveBeenCalled();
  });

  it('400s a key that is not lower-case letters, digits and hyphens', async () => {
    const res = await POST(post({ key: 'Not A Key!', group: 'Funk', params: FUNK_PARAMS }));
    expect(res.status).toBe(400);
    expect(createStyle).not.toHaveBeenCalled();
  });

  it('creates at version 1 and returns 201 with the shape the admin page reads', async () => {
    vi.mocked(createStyle).mockResolvedValue({ id: 'cnewstyle00000000000001', key: 'new-style' });

    const res = await POST(post({ key: 'new-style', group: 'Funk', params: FUNK_PARAMS }));
    expect(res.status).toBe(201);

    // The actor comes from the session and the request, not from the body —
    // a caller cannot claim to be someone else's edit.
    expect(createStyle).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'new-style',
        group: 'Funk',
        params: expect.objectContaining(FUNK_PARAMS),
      }),
      { userId: mockAdminUser().user.id, clientIp: '127.0.0.1' }
    );

    const body = await json<{ success: boolean; data: { key: string } }>(res);
    expect(body).toEqual({
      success: true,
      data: { id: 'cnewstyle00000000000001', key: 'new-style' },
    });
  });
});
