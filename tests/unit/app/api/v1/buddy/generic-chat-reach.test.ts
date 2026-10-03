/**
 * Sunrise's generic consumer chat route can't reach BeatBuddy (Phase 8, 8.1).
 *
 * `POST /api/v1/chat/stream` takes any active agent whose visibility is
 * `public` or `invite_only`, and it doesn't apply BeatBuddy's daily
 * allowance. So BeatBuddy's visibility has to be one that route refuses.
 *
 * The fake `findFirst` applies the route's own `where` to a BeatBuddy row
 * with the visibility the seed gives it. If either the seed or the route's
 * filter changes so that BeatBuddy becomes reachable, this fails. The
 * `public` case shows that the fake really filters.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockAuthenticatedUser } from '@/tests/helpers/auth';

const row = vi.hoisted(() => ({
  current: { id: 'agent-bb', slug: 'beatbuddy', isActive: true, visibility: 'internal' },
}));

interface AgentWhere {
  slug?: string;
  isActive?: boolean;
  visibility?: { in: string[] };
}

vi.mock('@/lib/db/client', () => ({
  prisma: {
    aiAgent: {
      findFirst: vi.fn(async ({ where }: { where: AgentWhere }) => {
        const r = row.current;
        const match =
          (where.slug === undefined || where.slug === r.slug) &&
          (where.isActive === undefined || where.isActive === r.isActive) &&
          (where.visibility === undefined || where.visibility.in.includes(r.visibility));
        return match
          ? { id: r.id, slug: r.slug, visibility: r.visibility, rateLimitRpm: null }
          : null;
      }),
    },
    aiAgentInviteToken: { findFirst: vi.fn(), update: vi.fn() },
    $executeRaw: vi.fn(),
  },
}));
vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/security/rate-limit', () => ({
  consumerChatLimiter: {
    check: vi.fn(() => ({ success: true, limit: 20, remaining: 19, reset: 0 })),
  },
  agentChatLimiter: { check: vi.fn(() => ({ success: true })), reset: vi.fn() },
  imageLimiter: { check: vi.fn(() => ({ success: true, limit: 20, remaining: 19, reset: 0 })) },
  createRateLimitResponse: vi.fn(() => new Response(null, { status: 429 })),
}));
vi.mock('@/lib/security/ip', () => ({ getClientIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/orchestration/chat', () => ({ streamChat: vi.fn() }));
vi.mock('@/lib/api/sse', () => ({
  sseResponse: vi.fn(() => new Response('data: test\n\n', { status: 200 })),
}));
vi.mock('@/lib/logging/context', () => ({
  getRequestId: vi.fn(() => Promise.resolve('req-1')),
  getVisitorId: vi.fn(() => Promise.resolve('vid-1')),
}));

import type { NextRequest } from 'next/server';

import { POST } from '@/app/api/v1/chat/stream/route';
import { BEATBUDDY_SLUG, BEATBUDDY_VISIBILITY } from '@/lib/app/breaks/buddy/agent';
import { auth } from '@/lib/auth/config';
import { streamChat } from '@/lib/orchestration/chat';

function request(): NextRequest {
  const url = new URL('http://localhost:3000/api/v1/chat/stream');
  return {
    json: async () => ({ message: 'make it a bossa', agentSlug: BEATBUDDY_SLUG }),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    url: url.toString(),
    nextUrl: { searchParams: url.searchParams },
    signal: new AbortController().signal,
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(streamChat).mockReturnValue({
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'start' as const };
    },
  } as never);
});

describe('BeatBuddy through Sunrise’s generic chat route', () => {
  it('is not found at the visibility the seed gives it, and no turn is streamed', async () => {
    row.current = { ...row.current, visibility: BEATBUDDY_VISIBILITY };

    const res = await POST(request());

    expect(res.status).toBe(404);
    expect(streamChat).not.toHaveBeenCalled();
  });

  it('would be reachable if it were public, which is why it is not', async () => {
    row.current = { ...row.current, visibility: 'public' };

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(streamChat).toHaveBeenCalledOnce();
  });
});
