/**
 * Admin catalogue — PATCH/DELETE /api/v1/admin/catalogue/libraries/[key]/entries/[id]
 *
 * The correction route D10 asks for, and the delete route the same section
 * insists be real: an entry taken down for a rights reason has to actually
 * go. What's worth pinning here: admin-only on both verbs, a `doc` that
 * fails the wire schema refused before `patchEntry` runs, an empty patch
 * refused as "nothing to change", and a missing row answered 404 rather
 * than crashing.
 *
 * @see app/api/v1/admin/catalogue/libraries/[key]/entries/[id]/route.ts
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
  return { ...actual, patchEntry: vi.fn(), deleteEntry: vi.fn() };
});

import { auth } from '@/lib/auth/config';
import { patchEntry, deleteEntry } from '@/lib/app/breaks/catalogue/admin';
import { PATCH, DELETE } from '@/app/api/v1/admin/catalogue/libraries/[key]/entries/[id]/route';

function patch(body: unknown): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/v1/admin/catalogue/libraries/famous-breaks/entries/e1',
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
}

function del(): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/v1/admin/catalogue/libraries/famous-breaks/entries/e1',
    { method: 'DELETE' }
  );
}

function ctx(id = 'e1', key = 'famous-breaks') {
  return { params: Promise.resolve({ key, id }) };
}

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
});

describe('PATCH /api/v1/admin/catalogue/libraries/[key]/entries/[id]', () => {
  it('401s a caller with no session, before writing anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await PATCH(patch({ title: 'Corrected title' }), ctx());
    expect(res.status).toBe(401);
    expect(patchEntry).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin, before writing anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await PATCH(patch({ title: 'Corrected title' }), ctx());
    expect(res.status).toBe(403);
    expect(patchEntry).not.toHaveBeenCalled();
  });

  it('400s an empty body — there is nothing to change', async () => {
    const res = await PATCH(patch({}), ctx());
    expect(res.status).toBe(400);
    expect(patchEntry).not.toHaveBeenCalled();
  });

  it('400s a doc that is not a valid packed pattern, without calling patchEntry', async () => {
    const res = await PATCH(patch({ doc: { b: [] } }), ctx());
    expect(res.status).toBe(400);
    expect(patchEntry).not.toHaveBeenCalled();
  });

  it('404s an id with no matching entry', async () => {
    vi.mocked(patchEntry).mockResolvedValue(false);
    const res = await PATCH(patch({ title: 'Corrected title' }), ctx('gone'));
    expect(res.status).toBe(404);
    const body = await json<{ error: { code: string } }>(res);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('200s a correction and echoes the entry id', async () => {
    vi.mocked(patchEntry).mockResolvedValue(true);
    const res = await PATCH(patch({ title: 'Corrected title' }), ctx());
    expect(res.status).toBe(200);

    expect(patchEntry).toHaveBeenCalledWith(
      'e1',
      { title: 'Corrected title' },
      { userId: mockAdminUser().user.id, clientIp: '127.0.0.1' }
    );

    const body = await json<{ success: boolean; data: { id: string } }>(res);
    expect(body).toEqual({ success: true, data: { id: 'e1' } });
  });
});

describe('DELETE /api/v1/admin/catalogue/libraries/[key]/entries/[id]', () => {
  it('401s a caller with no session, before deleting anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await DELETE(del(), ctx());
    expect(res.status).toBe(401);
    expect(deleteEntry).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin, before deleting anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await DELETE(del(), ctx());
    expect(res.status).toBe(403);
    expect(deleteEntry).not.toHaveBeenCalled();
  });

  it('404s an id with no matching entry', async () => {
    vi.mocked(deleteEntry).mockResolvedValue(false);
    const res = await DELETE(del(), ctx('gone'));
    expect(res.status).toBe(404);
  });

  it('200s a real delete, and it is really the id that was asked for', async () => {
    vi.mocked(deleteEntry).mockResolvedValue(true);
    const res = await DELETE(del(), ctx());
    expect(res.status).toBe(200);

    expect(deleteEntry).toHaveBeenCalledWith('e1', {
      userId: mockAdminUser().user.id,
      clientIp: '127.0.0.1',
    });

    const body = await json<{ success: boolean; data: { id: string } }>(res);
    expect(body).toEqual({ success: true, data: { id: 'e1' } });
  });
});
