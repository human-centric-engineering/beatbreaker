import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindFirst, mockCreate, mockFindMany, mockDeleteMany } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockDeleteMany: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  prisma: {
    aiKnowledgeDocumentRevision: {
      findFirst: mockFindFirst,
      create: mockCreate,
      findMany: mockFindMany,
      deleteMany: mockDeleteMany,
    },
  },
}));

import {
  DEFAULT_REVISION_RETENTION,
  getRevisionRetention,
  nextVersion,
  writeRevision,
} from '@/lib/orchestration/knowledge/revisions';

const DOC_ID = 'doc-rev-001';

describe('revisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: prune lookup returns no cutoff row → nothing to delete.
    mockFindMany.mockResolvedValue([]);
    mockDeleteMany.mockResolvedValue({ count: 0 });
    delete process.env.KB_REVISION_RETENTION;
  });

  afterEach(() => {
    delete process.env.KB_REVISION_RETENTION;
  });

  describe('nextVersion', () => {
    it('returns 1 when there are no prior revisions', async () => {
      mockFindFirst.mockResolvedValue(null);
      expect(await nextVersion(DOC_ID)).toBe(1);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { documentId: DOC_ID },
        select: { version: true },
        orderBy: { version: 'desc' },
      });
    });

    it('returns latest+1 when prior revisions exist', async () => {
      mockFindFirst.mockResolvedValue({ version: 7 });
      expect(await nextVersion(DOC_ID)).toBe(8);
    });
  });

  describe('writeRevision', () => {
    it('writes a row with the allocated version + supplied fields', async () => {
      mockFindFirst.mockResolvedValue({ version: 2 });
      await writeRevision({
        documentId: DOC_ID,
        content: 'cleaned content',
        source: 'capability:strip_timestamps',
        actorId: 'admin-1',
        sectionMarker: 'Intro',
        instructions: 'tighten',
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          documentId: DOC_ID,
          version: 3,
          content: 'cleaned content',
          source: 'capability:strip_timestamps',
          actorId: 'admin-1',
          sectionMarker: 'Intro',
          instructions: 'tighten',
        },
      });
    });

    it('passes null actorId through', async () => {
      mockFindFirst.mockResolvedValue(null);
      await writeRevision({
        documentId: DOC_ID,
        content: 'x',
        source: 'restore',
        actorId: null,
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: null, source: 'restore' }),
      });
    });

    it('omits sectionMarker + instructions when not supplied', async () => {
      mockFindFirst.mockResolvedValue(null);
      await writeRevision({
        documentId: DOC_ID,
        content: 'x',
        source: 'human_full',
        actorId: 'admin-2',
      });
      const call = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(call.data.sectionMarker).toBeUndefined();
      expect(call.data.instructions).toBeUndefined();
    });
  });

  describe('getRevisionRetention', () => {
    it('returns DEFAULT_REVISION_RETENTION when env var unset', () => {
      expect(getRevisionRetention()).toBe(DEFAULT_REVISION_RETENTION);
    });

    it('parses a valid integer env var', () => {
      process.env.KB_REVISION_RETENTION = '100';
      expect(getRevisionRetention()).toBe(100);
    });

    it('clamps below the minimum (10)', () => {
      process.env.KB_REVISION_RETENTION = '1';
      expect(getRevisionRetention()).toBe(10);
    });

    it('clamps above the maximum (500)', () => {
      process.env.KB_REVISION_RETENTION = '99999';
      expect(getRevisionRetention()).toBe(500);
    });

    it('falls back to default on non-numeric input', () => {
      process.env.KB_REVISION_RETENTION = 'forty';
      expect(getRevisionRetention()).toBe(DEFAULT_REVISION_RETENTION);
    });
  });

  describe('writeRevision pruning', () => {
    it('skips deletion when total revisions are below the retention cap', async () => {
      mockFindFirst.mockResolvedValue({ version: 5 });
      // findMany with skip: 49 returns nothing → fewer than 50 rows exist.
      mockFindMany.mockResolvedValue([]);

      await writeRevision({
        documentId: DOC_ID,
        content: 'x',
        source: 'human_full',
        actorId: 'admin-1',
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { documentId: DOC_ID },
        select: { version: true },
        orderBy: { version: 'desc' },
        skip: DEFAULT_REVISION_RETENTION - 1,
        take: 1,
      });
      expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it('deletes revisions older than the Nth-most-recent when the cap is reached', async () => {
      mockFindFirst.mockResolvedValue({ version: 60 });
      // Nth-most-recent is version 11 → delete everything strictly older.
      mockFindMany.mockResolvedValue([{ version: 11 }]);

      await writeRevision({
        documentId: DOC_ID,
        content: 'x',
        source: 'capability:strip_timestamps',
        actorId: 'admin-1',
      });

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { documentId: DOC_ID, version: { lt: 11 } },
      });
    });

    it('honours KB_REVISION_RETENTION when set', async () => {
      process.env.KB_REVISION_RETENTION = '20';
      mockFindFirst.mockResolvedValue({ version: 30 });
      mockFindMany.mockResolvedValue([{ version: 11 }]);

      await writeRevision({
        documentId: DOC_ID,
        content: 'x',
        source: 'human_full',
        actorId: 'admin-1',
      });

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 19, take: 1 }));
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { documentId: DOC_ID, version: { lt: 11 } },
      });
    });
  });
});
