import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindFirst, mockCreate } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  prisma: {
    aiKnowledgeDocumentRevision: {
      findFirst: mockFindFirst,
      create: mockCreate,
    },
  },
}));

import { nextVersion, writeRevision } from '@/lib/orchestration/knowledge/revisions';

const DOC_ID = 'doc-rev-001';

describe('revisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
