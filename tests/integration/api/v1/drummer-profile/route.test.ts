/**
 * Integration Test: GET/PUT /api/v1/drummer-profile
 *
 * The real `withAuth` guard runs over a mocked session; Prisma is mocked at
 * the module boundary and `$transaction` calls its callback with a `tx` of
 * the same mocked models, so `saveDrummerProfile`'s real logic runs.
 *
 * @see app/api/v1/drummer-profile/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PUT } from '@/app/api/v1/drummer-profile/route';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    drummerProfile: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    reservedUsername: { findUnique: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';

function tx() {
  return { reservedUsername: prisma.reservedUsername, drummerProfile: prisma.drummerProfile };
}

function url() {
  return 'http://localhost:3000/api/v1/drummer-profile';
}

function put(body: unknown): NextRequest {
  return new NextRequest(url(), {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (t: unknown) => Promise<unknown>)(tx())
  );
});

describe('GET /api/v1/drummer-profile', () => {
  it('401s without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await GET(new NextRequest(url()));
    expect(res.status).toBe(401);
    expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('reads the caller’s own row, scoped by session, never by a query param', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'ginger_baker',
      bio: 'Funk drummer',
      usernameChangedAt: null,
    } as never);

    const res = await GET(new NextRequest(url()));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.drummerProfile.findUnique).mock.calls[0][0]).toEqual({
      where: { userId: USER_ID },
    });
    const { data } = await json<{ data: { username: string; bio: string; nextChangeAt: null } }>(
      res
    );
    expect(data).toEqual({ username: 'ginger_baker', bio: 'Funk drummer', nextChangeAt: null });
  });

  it('answers null, not 404, when there is no profile yet', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    const res = await GET(new NextRequest(url()));
    expect(res.status).toBe(200);
    const { data } = await json<{ data: unknown }>(res);
    expect(data).toBeNull();
  });
});

describe('PUT /api/v1/drummer-profile', () => {
  it('401s without a session and never writes', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await PUT(put({ username: 'ginger_baker' }));
    expect(res.status).toBe(401);
    expect(prisma.$transaction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s a username that breaks the shape rule, before touching the database', async () => {
    const res = await PUT(put({ username: 'ab' }));
    expect(res.status).toBe(400);
    expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema validation short-circuits
  });

  it('creates a profile under the session user, never a body-named one', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.drummerProfile.create).mockResolvedValue({
      username: 'ginger_baker',
      bio: null,
      usernameChangedAt: null,
    } as never);

    const res = await PUT(put({ username: 'Ginger_Baker', userId: 'someone-else' }));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.drummerProfile.create).mock.calls[0][0]).toEqual({
      data: { userId: USER_ID, username: 'ginger_baker', bio: null },
    });
    const { data } = await json<{ data: { username: string } }>(res);
    expect(data.username).toBe('ginger_baker');
  });

  it('answers 409 with the site’s words when the name is taken', async () => {
    vi.mocked(prisma.drummerProfile.findUnique)
      .mockResolvedValueOnce(null) // current
      .mockResolvedValueOnce({ userId: 'someone-else' } as never); // holder
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);

    const res = await PUT(put({ username: 'taken_name' }));
    expect(res.status).toBe(409);
    const body = await json<{ error: { code: string; message: string } }>(res);
    expect(body.error).toMatchObject({
      code: 'CONFLICT',
      message: "That one's taken. Try another.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('answers 409 naming the date it may change again, inside the 30-day window', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'old_name',
      bio: '',
      usernameChangedAt: new Date(),
    } as never);

    const res = await PUT(put({ username: 'new_name' }));
    expect(res.status).toBe(409);
    const body = await json<{ error: { message: string } }>(res);
    expect(body.error.message).toMatch(/once every 30 days/);
  });
});
