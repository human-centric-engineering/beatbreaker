/**
 * Admin catalogue — PATCH /api/v1/admin/catalogue/kits/[key]
 *
 * A kit's metadata, its voice knobs, its sample map and the CC BY 4.0 credit
 * (§10). What's worth pinning: admin-only, a body with nothing to change
 * refused, a sample map with a path-hostile file name refused before
 * `patchKit` runs (see `kitSamplesSchema` — a kit row is admin-written
 * starting now, which is exactly when a `../` stops being hypothetical),
 * and a missing kit answered 404.
 *
 * @see app/api/v1/admin/catalogue/kits/[key]/route.ts
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
  return { ...actual, patchKit: vi.fn() };
});

import { auth } from '@/lib/auth/config';
import { patchKit } from '@/lib/app/breaks/catalogue/admin';
import { PATCH } from '@/app/api/v1/admin/catalogue/kits/[key]/route';

function patch(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/admin/catalogue/kits/studio70', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function ctx(key = 'studio70') {
  return { params: Promise.resolve({ key }) };
}

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
});

describe('PATCH /api/v1/admin/catalogue/kits/[key]', () => {
  it('401s a caller with no session, before writing anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await PATCH(patch({ label: 'New label' }), ctx());
    expect(res.status).toBe(401);
    expect(patchKit).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin, before writing anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await PATCH(patch({ label: 'New label' }), ctx());
    expect(res.status).toBe(403);
    expect(patchKit).not.toHaveBeenCalled();
  });

  it('400s an empty body — there is nothing to change', async () => {
    const res = await PATCH(patch({}), ctx());
    expect(res.status).toBe(400);
    expect(patchKit).not.toHaveBeenCalled();
  });

  it('400s params missing the required voice/master keys, without calling patchKit', async () => {
    const res = await PATCH(patch({ params: {} }), ctx());
    expect(res.status).toBe(400);
    expect(patchKit).not.toHaveBeenCalled();
  });

  it('400s a sample file name that tries to climb out of its folder', async () => {
    const res = await PATCH(
      patch({ samples: { slots: { k: { v: null, files: ['../../etc/passwd'] } } } }),
      ctx()
    );
    expect(res.status).toBe(400);
    expect(patchKit).not.toHaveBeenCalled();
  });

  it('404s a key with no matching system kit', async () => {
    vi.mocked(patchKit).mockResolvedValue(false);
    const res = await PATCH(patch({ label: 'New label' }), ctx('nope'));
    expect(res.status).toBe(404);
    const body = await json<{ error: { code: string } }>(res);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('200s a successful write and echoes the key', async () => {
    vi.mocked(patchKit).mockResolvedValue(true);
    const res = await PATCH(patch({ label: 'New label', credit: 'Sample pack by Someone' }), ctx());
    expect(res.status).toBe(200);

    expect(patchKit).toHaveBeenCalledWith(
      'studio70',
      { label: 'New label', credit: 'Sample pack by Someone' },
      { userId: mockAdminUser().user.id, clientIp: '127.0.0.1' }
    );

    const body = await json<{ success: boolean; data: { key: string } }>(res);
    expect(body).toEqual({ success: true, data: { key: 'studio70' } });
  });
});
