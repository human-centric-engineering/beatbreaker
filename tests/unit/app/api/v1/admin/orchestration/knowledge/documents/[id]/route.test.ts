import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockFindUnique } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
}));

vi.mock('@/lib/auth/config', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock('@/lib/db/client', () => ({
  prisma: {
    aiKnowledgeDocument: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock('@/lib/orchestration/audit/admin-audit-logger', () => ({
  logAdminAction: vi.fn(),
  computeChanges: vi.fn(),
}));

vi.mock('@/lib/security/ip', () => ({ getClientIP: vi.fn(() => '127.0.0.1') }));

import { auth } from '@/lib/auth/config';
import { GET } from '@/app/api/v1/admin/orchestration/knowledge/documents/[id]/route';
import {
  mockAdminUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/helpers/auth';

const DOC_ID = 'cmjbv4i3x00003wsloputgwul';

function req(): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/admin/orchestration/knowledge/documents/${DOC_ID}`,
    { method: 'GET' }
  );
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

// Focused regression test for the Phase 7 contract change: the GET handler
// now `include`s a pendingChanges relation so the cleanup PendingChangeModal
// can render the diff card with a single round-trip. The rest of the route's
// behaviour (PATCH/DELETE, tag flattening) is covered by other suites; this
// file pins the new include + the GET response shape.

describe('GET /api/v1/admin/orchestration/knowledge/documents/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('auth + validation', () => {
    it('401 when unauthenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
      const r = await GET(req(), params(DOC_ID));
      expect(r.status).toBe(401);
    });

    it('403 when non-admin', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
      const r = await GET(req(), params(DOC_ID));
      expect(r.status).toBe(403);
    });

    it('400 on invalid CUID', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
      const r = await GET(req(), params('not-a-cuid'));
      expect(r.status).toBe(400);
    });

    it('404 when document does not exist', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
      mockFindUnique.mockResolvedValue(null);
      const r = await GET(req(), params(DOC_ID));
      expect(r.status).toBe(404);
    });
  });

  describe('pendingChanges include (Phase 7 contract)', () => {
    it('calls findUnique with the pendingChanges include (newest first, scoped fields)', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
      mockFindUnique.mockResolvedValue({
        id: DOC_ID,
        name: 'doc',
        tags: [],
        pendingChanges: [],
      });
      await GET(req(), params(DOC_ID));

      const callArg = mockFindUnique.mock.calls[0][0] as {
        include: {
          pendingChanges: { orderBy: { createdAt: string }; select: Record<string, boolean> };
        };
      };
      // Newest-first is the wire contract — the PendingChangeModal picks the
      // currently-active row by id; ordering also makes the list deterministic.
      expect(callArg.include.pendingChanges.orderBy).toEqual({ createdAt: 'desc' });
      // The select keys ARE the public contract — the modal reads exactly
      // these fields. Dropping or renaming any breaks the modal silently.
      expect(callArg.include.pendingChanges.select).toEqual({
        id: true,
        source: true,
        beforeContent: true,
        afterContent: true,
        sectionMarker: true,
        instructions: true,
        createdAt: true,
      });
    });

    it('returns pendingChanges array in the response body for a doc with pending rewrites', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
      const pendingChange = {
        id: 'pc-1',
        source: 'rewrite_section_with_llm',
        beforeContent: '# A\nold',
        afterContent: '# A\nnew',
        sectionMarker: 'A',
        instructions: 'tighten',
        createdAt: new Date('2026-06-01'),
      };
      mockFindUnique.mockResolvedValue({
        id: DOC_ID,
        name: 'doc',
        status: 'cleaning',
        tags: [],
        pendingChanges: [pendingChange],
      });
      const r = await GET(req(), params(DOC_ID));
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.success).toBe(true);
      expect(body.data.document.pendingChanges).toHaveLength(1);
      expect(body.data.document.pendingChanges[0].id).toBe('pc-1');
      expect(body.data.document.pendingChanges[0].source).toBe('rewrite_section_with_llm');
      expect(body.data.document.pendingChanges[0].afterContent).toBe('# A\nnew');
    });

    it('returns an empty pendingChanges array for a non-cleaning doc with no pending rewrites', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
      mockFindUnique.mockResolvedValue({
        id: DOC_ID,
        name: 'doc',
        status: 'ready',
        tags: [],
        pendingChanges: [],
      });
      const r = await GET(req(), params(DOC_ID));
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.data.document.pendingChanges).toEqual([]);
    });
  });

  describe('tag flattening (existing behaviour, regression guard)', () => {
    it('flattens the tag join rows into a tagIds string array', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
      mockFindUnique.mockResolvedValue({
        id: DOC_ID,
        name: 'doc',
        tags: [{ tagId: 'tag-1' }, { tagId: 'tag-2' }],
        pendingChanges: [],
      });
      const r = await GET(req(), params(DOC_ID));
      const body = await r.json();
      expect(body.data.document.tagIds).toEqual(['tag-1', 'tag-2']);
      // The raw `tags` join rows are removed from the response.
      expect(body.data.document.tags).toBeUndefined();
    });
  });
});
