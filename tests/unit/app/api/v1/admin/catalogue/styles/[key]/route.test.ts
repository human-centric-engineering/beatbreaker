/**
 * Admin catalogue — PATCH /api/v1/admin/catalogue/styles/[key]
 *
 * This route moves a style in the picker (group, position). What it must NOT
 * be able to do is touch the parameters — a saved break points at the version
 * it was generated from, and there is no update path for one. That claim is
 * pinned two ways here: `patchStyleSchema` has no `params` field to parse, and
 * a body that sneaks one in anyway is silently dropped before it reaches
 * `patchStyle`.
 *
 * @see app/api/v1/admin/catalogue/styles/[key]/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mockAdminUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(() => Promise.resolve(new Headers())) }));
vi.mock('@/lib/security/ip', () => ({ getClientIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/app/breaks/catalogue/admin', async () => {
  const actual = await vi.importActual<typeof import('@/lib/app/breaks/catalogue/admin')>(
    '@/lib/app/breaks/catalogue/admin'
  );
  return { ...actual, patchStyle: vi.fn() };
});

import { auth } from '@/lib/auth/config';
import { patchStyle } from '@/lib/app/breaks/catalogue/admin';
import { PATCH } from '@/app/api/v1/admin/catalogue/styles/[key]/route';

function patch(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/admin/catalogue/styles/funk', {
    method: 'PATCH',
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

describe('PATCH /api/v1/admin/catalogue/styles/[key]', () => {
  it('401s a caller with no session, before writing anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await PATCH(patch({ group: 'Jazz' }), ctx());
    expect(res.status).toBe(401);
    expect(patchStyle).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin, before writing anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await PATCH(patch({ group: 'Jazz' }), ctx());
    expect(res.status).toBe(403);
    expect(patchStyle).not.toHaveBeenCalled();
  });

  it('400s an empty body — there is nothing to change', async () => {
    const res = await PATCH(patch({}), ctx());
    expect(res.status).toBe(400);
    expect(patchStyle).not.toHaveBeenCalled();
  });

  it('strips a smuggled `params` field rather than forwarding it to patchStyle', async () => {
    // The schema has no `params` key at all — an admin trying to move a style
    // AND retune it in one request gets the move only. Columns derived from
    // parameters must never be settable from this route (see the module doc).
    vi.mocked(patchStyle).mockResolvedValue(true);
    await PATCH(patch({ group: 'Jazz', params: { label: 'sneaky' } }), ctx());

    expect(patchStyle).toHaveBeenCalledWith(
      'funk',
      { group: 'Jazz' },
      { userId: mockAdminUser().user.id, clientIp: '127.0.0.1' }
    );
  });

  it('404s a key with no matching system style', async () => {
    vi.mocked(patchStyle).mockResolvedValue(false);
    const res = await PATCH(patch({ group: 'Jazz' }), ctx('nope'));
    expect(res.status).toBe(404);
    const body = await json<{ success: boolean; error: { code: string } }>(res);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('200s on a successful move, with the key the client can refetch', async () => {
    vi.mocked(patchStyle).mockResolvedValue(true);
    const res = await PATCH(patch({ position: 3 }), ctx());
    expect(res.status).toBe(200);

    const body = await json<{ success: boolean; data: { key: string } }>(res);
    expect(body).toEqual({ success: true, data: { key: 'funk' } });
  });
});
