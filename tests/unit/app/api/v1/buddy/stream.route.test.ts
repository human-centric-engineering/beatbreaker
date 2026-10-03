/**
 * POST /api/v1/buddy/stream — one BeatBuddy turn.
 *
 * The model is not called here; `streamChat` is the seam. What these assert is
 * the route's contract: the agent is pinned and the user comes from the
 * session; a document the Studio could not have made is refused before the
 * model is called or the workspace is touched; the 31st turn of the day is
 * refused with the friendly message; and a turn that goes ahead first puts the
 * pattern on screen into the caller's workspace.
 *
 * The workspace and the message count are in-memory tables that apply the
 * route's filters, so the allowance is counted, not stubbed.
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { MAX_BUDDY_BODY_BYTES } from '@/lib/validations/buddy';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';
import {
  buddyTurns,
  fakeMessageTable,
  fakeWorkspaceTable,
  funkPayload,
  type FakeWorkspaceTable,
  type MessageRow,
} from '@/tests/helpers/buddy';

const db = vi.hoisted(() => ({
  workspace: null as FakeWorkspaceTable | null,
  messages: null as ReturnType<typeof fakeMessageTable> | null,
  agent: null as { id: string; rateLimitRpm: number | null } | null,
}));

vi.mock('@/lib/db/client', () => ({
  prisma: {
    get buddyWorkspace() {
      return db.workspace;
    },
    get aiMessage() {
      return db.messages;
    },
    aiAgent: {
      findFirst: vi.fn(async ({ where }: { where: { slug: string; isActive: boolean } }) =>
        where.slug === 'beatbuddy' && where.isActive ? db.agent : null
      ),
    },
  },
}));
vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/orchestration/chat', () => ({ streamChat: vi.fn(() => 'the-event-stream') }));
vi.mock('@/lib/orchestration/llm/model-registry-db-hydrate', () => ({
  hydrateFromDb: vi.fn(async () => undefined),
}));
vi.mock('@/lib/api/sse', () => ({
  sseResponse: vi.fn(() => new Response('data: {}\n\n', { status: 200 })),
}));
vi.mock('@/lib/logging/context', () => ({
  getRequestId: vi.fn(async () => 'req-1'),
  getVisitorId: vi.fn(async () => 'visitor-1'),
}));
vi.mock('@/lib/security/rate-limit', () => ({
  consumerChatLimiter: { check: vi.fn(() => ({ success: true })) },
  agentChatLimiter: { check: vi.fn(() => ({ success: true })) },
  imageLimiter: { check: vi.fn(() => ({ success: true })) },
  createRateLimitResponse: vi.fn(() =>
    Response.json(
      { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Slow down.' } },
      { status: 429 }
    )
  ),
}));

import { auth } from '@/lib/auth/config';
import { sseResponse } from '@/lib/api/sse';
import { streamChat } from '@/lib/orchestration/chat';
import { hydrateFromDb } from '@/lib/orchestration/llm/model-registry-db-hydrate';
import { consumerChatLimiter } from '@/lib/security/rate-limit';

import { POST } from '@/app/api/v1/buddy/stream/route';

const USER_ID = mockAuthenticatedUser().user.id;
const NOW = new Date('2026-09-29T15:30:00Z');
const TODAY = new Date('2026-09-29T00:00:00Z');
const DOC = funkPayload();

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/buddy/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

interface Envelope {
  success: boolean;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

async function json(res: Response): Promise<Envelope> {
  return (await res.json()) as Envelope;
}

function turnsUsed(rows: MessageRow[]) {
  db.messages = fakeMessageTable(rows);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(consumerChatLimiter.check).mockReturnValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: 0,
  });
  db.workspace = fakeWorkspaceTable();
  db.agent = { id: 'agent-buddy', rateLimitRpm: null };
  turnsUsed([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/v1/buddy/stream', () => {
  it("puts the pattern on screen into the caller's workspace, then streams a turn with BeatBuddy pinned", async () => {
    const res = await POST(post({ message: 'add ghost notes to bar 2', doc: DOC, section: 'B' }));

    expect(res.status).toBe(200);
    expect(db.workspace?.rows.get(USER_ID)).toMatchObject({ doc: DOC, rev: 0 });
    expect(streamChat).toHaveBeenCalledTimes(1);
    expect(vi.mocked(streamChat).mock.calls[0][0]).toMatchObject({
      message: 'add ghost notes to bar 2',
      agentSlug: 'beatbuddy',
      userId: USER_ID,
      contextType: 'studio',
      contextId: 'about',
      entityContext: { workspace: true, section: 'B' },
    });
    expect(sseResponse).toHaveBeenCalledWith('the-event-stream', expect.anything());
  });

  it('loads the model registry before the turn, so its dollar caps see a real cost (sunrise#813)', async () => {
    await POST(post({ message: 'add ghost notes to bar 2', doc: DOC }));

    expect(hydrateFromDb).toHaveBeenCalledTimes(1);
    expect(vi.mocked(hydrateFromDb).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(streamChat).mock.invocationCallOrder[0]
    );
  });

  it('ignores an agent, a user id or a scope in the body — the client cannot choose what the turn acts on', async () => {
    await POST(
      post({
        message: 'hi',
        doc: DOC,
        agentSlug: 'some-admin-agent',
        userId: 'someone-else',
        scope: { module: 'admin' },
      })
    );

    const request = vi.mocked(streamChat).mock.calls[0][0];
    expect(request.agentSlug).toBe('beatbuddy');
    expect(request.userId).toBe(USER_ID);
    expect(request.scope).toBeUndefined();
    expect(db.workspace?.rows.has('someone-else')).toBe(false);
  });

  it('carries on an existing conversation when given its id', async () => {
    await POST(
      post({ message: 'and bar 3', doc: DOC, conversationId: 'cmjbv4i3x00003wsloputgaaa' })
    );

    expect(vi.mocked(streamChat).mock.calls[0][0].conversationId).toBe('cmjbv4i3x00003wsloputgaaa');
  });

  it('refuses a document the Studio could not have made, before the model is called or the workspace touched', async () => {
    const broken = { ...DOC, A: { ...DOC.A, b: [] } };
    expect(sharePayloadSchema.safeParse(broken).success).toBe(false);

    const res = await POST(post({ message: 'tidy it up', doc: broken }));

    expect(res.status).toBe(400);
    expect((await json(res)).error?.code).toBe('VALIDATION_ERROR');
    expect(streamChat).not.toHaveBeenCalled();
    expect(db.workspace?.rows.size).toBe(0);
  });

  it('refuses a turn with no document at all', async () => {
    const res = await POST(post({ message: 'make it a bossa' }));

    expect(res.status).toBe(400);
    expect(streamChat).not.toHaveBeenCalled();
  });

  it('allows the 30th turn of the day', async () => {
    turnsUsed(buddyTurns(USER_ID, 29, TODAY));

    const res = await POST(post({ message: 'one more', doc: DOC }));

    expect(res.status).toBe(200);
    expect(streamChat).toHaveBeenCalledTimes(1);
  });

  it('refuses the 31st turn with the friendly message, before the model is called or the workspace touched', async () => {
    turnsUsed(buddyTurns(USER_ID, 30, TODAY));

    const res = await POST(post({ message: 'one more', doc: DOC }));

    expect(res.status).toBe(429);
    const { error } = await json(res);
    expect(error?.code).toBe('BUDDY_ALLOWANCE_SPENT');
    expect(error?.message).toBe(
      "That's all 30 of today's BeatBuddy turns. They come back at midnight UTC — everything else in the Studio still works."
    );
    expect(error?.details).toEqual({
      limit: 30,
      used: 30,
      remaining: 0,
      resetsAt: '2026-09-30T00:00:00.000Z',
    });
    expect(streamChat).not.toHaveBeenCalled();
    expect(db.workspace?.rows.size).toBe(0);
  });

  it("counts only the caller's turns today — someone else's full day, or the caller's own yesterday, does not refuse them", async () => {
    turnsUsed([
      ...buddyTurns('another-user', 30, TODAY),
      ...buddyTurns(USER_ID, 30, new Date('2026-09-28T09:00:00Z')),
    ]);

    const res = await POST(post({ message: 'morning', doc: DOC }));

    expect(res.status).toBe(200);
  });

  it('says BeatBuddy is unavailable when the agent is missing or switched off', async () => {
    db.agent = null;

    const res = await POST(post({ message: 'hi', doc: DOC }));

    expect(res.status).toBe(503);
    expect((await json(res)).error?.code).toBe('BUDDY_UNAVAILABLE');
    expect(streamChat).not.toHaveBeenCalled();
    expect(db.workspace?.rows.size).toBe(0);
  });

  it('refuses a file whose bytes are not the image it claims to be, leaving the workspace alone', async () => {
    const res = await POST(
      post({
        message: 'read this chart',
        doc: DOC,
        attachments: [
          {
            name: 'chart.png',
            mediaType: 'image/png',
            data: Buffer.from('not a png at all').toString('base64'),
          },
        ],
      })
    );

    expect(res.status).toBe(415);
    expect((await json(res)).error?.code).toBe('IMAGE_INVALID_TYPE');
    expect(streamChat).not.toHaveBeenCalled();
    expect(db.workspace?.rows.size).toBe(0);
  });

  it('passes a real PNG and a real PDF through to the turn', async () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(32),
    ]);
    const pdf = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n');
    const res = await POST(
      post({
        message: 'read these',
        doc: DOC,
        attachments: [
          { name: 'chart.png', mediaType: 'image/png', data: png.toString('base64') },
          { name: 'chart.pdf', mediaType: 'application/pdf', data: pdf.toString('base64') },
        ],
      })
    );

    expect(res.status).toBe(200);
    expect(streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({ mediaType: 'image/png' }),
          expect.objectContaining({ mediaType: 'application/pdf' }),
        ],
      })
    );
  });

  it('refuses a file whose bytes are not the PDF it claims to be', async () => {
    const res = await POST(
      post({
        message: 'read this chart',
        doc: DOC,
        attachments: [
          {
            name: 'chart.pdf',
            mediaType: 'application/pdf',
            data: Buffer.from('not a pdf at all').toString('base64'),
          },
        ],
      })
    );

    expect(res.status).toBe(415);
    expect((await json(res)).error?.code).toBe('IMAGE_INVALID_TYPE');
    expect(streamChat).not.toHaveBeenCalled();
    expect(db.workspace?.rows.size).toBe(0);
  });

  it('refuses a body declared over the cap from its Content-Length, before reading it', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/buddy/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(MAX_BUDDY_BODY_BYTES + 1),
      },
      body: JSON.stringify({ message: 'hi', doc: DOC }),
    });

    const res = await POST(req);

    expect(res.status).toBe(413);
    expect((await json(res)).error?.code).toBe('FILE_TOO_LARGE');
    expect(streamChat).not.toHaveBeenCalled();
    expect(db.workspace?.rows.size).toBe(0);
  });

  it('applies the per-user chat cap before reading the body', async () => {
    vi.mocked(consumerChatLimiter.check).mockReturnValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: 0,
    });

    const res = await POST(post({ message: 'hi', doc: DOC }));

    expect(res.status).toBe(429);
    expect(consumerChatLimiter.check).toHaveBeenCalledWith(USER_ID);
    expect(streamChat).not.toHaveBeenCalled();
  });

  it('refuses a caller with no session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());

    const res = await POST(post({ message: 'hi', doc: DOC }));

    expect(res.status).toBe(401);
    expect(streamChat).not.toHaveBeenCalled();
  });
});
