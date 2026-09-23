/**
 * Admin catalogue — GET/POST /api/v1/admin/catalogue/libraries/[key]/entries
 *
 * D10's route: a correction to a library lands without a deploy and lands
 * audited. What's worth pinning at this layer is the wiring — admin-only on
 * both verbs, a bad `doc` refused before `createEntry` runs, a missing
 * library answered as 404 rather than a 500 from a null dereference.
 *
 * @see app/api/v1/admin/catalogue/libraries/[key]/entries/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mockAdminUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/helpers/auth';
import { testStyle } from '@/tests/helpers/catalogue';
import { generatePattern } from '@/lib/app/breaks/generate';
import { packPattern } from '@/lib/app/breaks/share';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(() => Promise.resolve(new Headers())) }));
vi.mock('@/lib/security/ip', () => ({ getClientIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/db/client', () => ({
  prisma: { patternLibrary: { findFirst: vi.fn() } },
}));
vi.mock('@/lib/app/breaks/catalogue/admin', async () => {
  const actual = await vi.importActual<typeof import('@/lib/app/breaks/catalogue/admin')>(
    '@/lib/app/breaks/catalogue/admin'
  );
  return { ...actual, createEntry: vi.fn() };
});

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';
import { createEntry } from '@/lib/app/breaks/catalogue/admin';
import { GET, POST } from '@/app/api/v1/admin/catalogue/libraries/[key]/entries/route';

/** A real, wire-format-valid packed pattern — not a hand-rolled stub of `doc`. */
function validDoc() {
  const style = testStyle('funk');
  const pattern = generatePattern({
    style,
    meter: '4/4',
    seed: 42,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return packPattern(pattern);
}

function entryFields(overrides: Record<string, unknown> = {}) {
  return {
    group: 'Classic funk',
    title: 'Funky Drummer',
    artist: 'James Brown',
    bpm: 94,
    styleKey: 'funk',
    meter: '4/4',
    doc: validDoc(),
    ...overrides,
  };
}

function get(): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/v1/admin/catalogue/libraries/famous-breaks/entries'
  );
}

function post(body: unknown): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/v1/admin/catalogue/libraries/famous-breaks/entries',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

function ctx(key = 'famous-breaks') {
  return { params: Promise.resolve({ key }) };
}

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
});

describe('GET /api/v1/admin/catalogue/libraries/[key]/entries', () => {
  it('401s a caller with no session, before touching the database', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await GET(get(), ctx());
    expect(res.status).toBe(401);
    expect(prisma.patternLibrary.findFirst).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin, before touching the database', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await GET(get(), ctx());
    expect(res.status).toBe(403);
    expect(prisma.patternLibrary.findFirst).not.toHaveBeenCalled();
  });

  it('404s a key with no matching system library', async () => {
    vi.mocked(prisma.patternLibrary.findFirst).mockResolvedValue(null);
    const res = await GET(get(), ctx('no-such-library'));
    expect(res.status).toBe(404);
  });

  it('lists entries in position order, without their documents', async () => {
    vi.mocked(prisma.patternLibrary.findFirst).mockResolvedValue({
      id: 'l1',
      key: 'famous-breaks',
      entries: [{ id: 'e1', position: 0, title: 'Funky Drummer' }],
    } as never);

    const res = await GET(get(), ctx());
    expect(res.status).toBe(200);

    const args = vi.mocked(prisma.patternLibrary.findFirst).mock.calls[0][0];
    expect(args?.where).toEqual({ key: 'famous-breaks', ownerId: null });

    // Prisma types `entries` as `true | args`, and `entries: true` would hand
    // back whole rows — documents included. Narrowing here is the assertion:
    // the route has to pass an args object for the next two checks to mean
    // anything.
    const entries = args?.select?.entries;
    if (typeof entries !== 'object') {
      throw new Error(`entries must be selected with an args object, got ${typeof entries}`);
    }

    expect(entries).toMatchObject({ orderBy: { position: 'asc' } });
    // The list is the correction-friendly view — one query for every entry —
    // and it must not carry every entry's pattern document along for the ride.
    expect(entries.select).not.toHaveProperty('doc');

    const body = await json<{ success: boolean; data: { entries: unknown[] } }>(res);
    expect(body.data.entries).toHaveLength(1);
  });
});

describe('POST /api/v1/admin/catalogue/libraries/[key]/entries', () => {
  it('401s a caller with no session, before creating an entry', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post(entryFields()), ctx());
    expect(res.status).toBe(401);
    expect(createEntry).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin, before creating an entry', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await POST(post(entryFields()), ctx());
    expect(res.status).toBe(403);
    expect(createEntry).not.toHaveBeenCalled();
  });

  it('400s a doc that is not a valid packed pattern, without calling createEntry', async () => {
    // `b` (the bars) needs at least one — a document with none is not a
    // pattern, and the console has nothing to render for it.
    const res = await POST(post(entryFields({ doc: { b: [] } })), ctx());
    expect(res.status).toBe(400);
    expect(createEntry).not.toHaveBeenCalled();
  });

  it('400s a missing required field, without calling createEntry', async () => {
    const { title: _title, ...withoutTitle } = entryFields();
    const res = await POST(post(withoutTitle), ctx());
    expect(res.status).toBe(400);
    expect(createEntry).not.toHaveBeenCalled();
  });

  it('404s a key with no matching system library', async () => {
    vi.mocked(createEntry).mockResolvedValue(null);
    const res = await POST(post(entryFields()), ctx('no-such-library'));
    expect(res.status).toBe(404);
  });

  it('201s on a successful create, with the audit actor drawn from the session', async () => {
    vi.mocked(createEntry).mockResolvedValue({ id: 'e-new' });

    const res = await POST(post(entryFields()), ctx());
    expect(res.status).toBe(201);

    expect(createEntry).toHaveBeenCalledWith(
      'famous-breaks',
      expect.objectContaining({ title: 'Funky Drummer', styleKey: 'funk' }),
      { userId: mockAdminUser().user.id, clientIp: '127.0.0.1' }
    );

    const body = await json<{ success: boolean; data: { id: string } }>(res);
    expect(body).toEqual({ success: true, data: { id: 'e-new' } });
  });
});
