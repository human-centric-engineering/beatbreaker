/**
 * GET /api/v1/buddy/allowance — the drawer's meter. The count itself is tested
 * in `allowance.test.ts`; here, that the route reports the caller's own
 * allowance and nobody else's, and needs a session.
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';
import { buddyTurns, fakeMessageTable } from '@/tests/helpers/buddy';

const db = vi.hoisted(() => ({ messages: null as ReturnType<typeof fakeMessageTable> | null }));

vi.mock('@/lib/db/client', () => ({
  prisma: {
    get aiMessage() {
      return db.messages;
    },
  },
}));
vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));

import { auth } from '@/lib/auth/config';

import { GET } from '@/app/api/v1/buddy/allowance/route';

const USER_ID = mockAuthenticatedUser().user.id;
const TODAY = new Date('2026-09-29T00:00:00Z');

function get(): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/buddy/allowance');
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-29T18:00:00Z'));
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  db.messages = fakeMessageTable([
    ...buddyTurns(USER_ID, 7, TODAY),
    ...buddyTurns('another-user', 25, TODAY),
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/v1/buddy/allowance', () => {
  it("reports the caller's own turns today, and when they come back", async () => {
    const res = await GET(get());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { limit: 30, used: 7, remaining: 23, resetsAt: '2026-09-30T00:00:00.000Z' },
    });
  });

  it('refuses a caller with no session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());

    const res = await GET(get());

    expect(res.status).toBe(401);
  });
});
