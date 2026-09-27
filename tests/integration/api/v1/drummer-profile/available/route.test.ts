/**
 * Integration Test: GET /api/v1/drummer-profile/available
 *
 * The real `withAuth` guard runs over a mocked session; Prisma is mocked at
 * the module boundary so `usernameAvailability`'s real logic runs.
 *
 * @see app/api/v1/drummer-profile/available/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v1/drummer-profile/available/route';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    drummerProfile: { findUnique: vi.fn() },
    reservedUsername: { findUnique: vi.fn() },
  },
}));

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';

function url(username?: string) {
  return `http://localhost:3000/api/v1/drummer-profile/available${
    username !== undefined ? `?username=${encodeURIComponent(username)}` : ''
  }`;
}

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

describe('GET /api/v1/drummer-profile/available', () => {
  it('401s without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await GET(new NextRequest(url('ginger_baker')));
    expect(res.status).toBe(401);
    expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s when the query param is missing', async () => {
    const res = await GET(new NextRequest(url()));
    expect(res.status).toBe(400);
  });

  it('says available for a free name, scoped to the caller', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);

    const res = await GET(new NextRequest(url('ginger_baker')));
    expect(res.status).toBe(200);
    const { data } = await json<{ data: { available: boolean } }>(res);
    expect(data).toEqual({ available: true });
  });

  it('says taken for a name held by someone else', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      userId: 'someone-else',
    } as never);

    const res = await GET(new NextRequest(url('ginger_baker')));
    const { data } = await json<{ data: { available: boolean; reason: string } }>(res);
    expect(data).toEqual({
      available: false,
      reason: 'taken',
      message: "That one's taken. Try another.",
    });
  });

  it('says available for the caller’s own current name', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({ userId: USER_ID } as never);
    const res = await GET(new NextRequest(url('ginger_baker')));
    const { data } = await json<{ data: { available: boolean } }>(res);
    expect(data).toEqual({ available: true });
  });

  it('answers "unavailable" for a reserved word, without going to the database', async () => {
    const res = await GET(new NextRequest(url('admin')));
    const { data } = await json<{ data: { available: boolean; reason: string } }>(res);
    expect(data).toMatchObject({ available: false, reason: 'unavailable' });
    expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the word check short-circuits
  });
});
