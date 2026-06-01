/**
 * PendingChangeModal Component Tests
 *
 * Test Coverage:
 * - changeId=null → modal is closed (no DialogTitle in DOM)
 * - changeId='abc' → modal opens; calls apiClient.get for the doc; finds change by id; renders TextDiffViewer
 * - Pending change not in response → "Pending change not found" error rendered
 * - Section rewrite (sectionMarker set) → source line matches /Section rewrite: <marker>/i
 * - Whole-doc rewrite (sectionMarker null) → source line matches /Whole-document rewrite/i
 * - Accept button POSTs /cleanup/changes/<id>/accept; on success calls onResolved + onClose
 * - Reject button POSTs /cleanup/changes/<id>/reject; on success calls onResolved + onClose
 * - Accept failure → error rendered; onResolved and onClose NOT called
 *
 * Mocking:
 * - @/lib/api/client (apiClient.get returning { document: { pendingChanges: [...] } })
 * - globalThis.fetch for accept/reject
 * - @/components/admin/orchestration/knowledge/text-diff-viewer → <div data-testid="text-diff" />
 *
 * @see components/admin/orchestration/knowledge/pending-change-modal.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Hoisted mock refs ────────────────────────────────────────────────────────

const { mockApiClientGet } = vi.hoisted(() => ({
  mockApiClientGet: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: mockApiClientGet,
  },
  APIClientError: class APIClientError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'APIClientError';
    }
  },
}));

// Mock TextDiffViewer to a simple marker — keeps pending-change-modal tests
// focused on accept/reject logic rather than diff rendering internals
vi.mock('@/components/admin/orchestration/knowledge/text-diff-viewer', () => ({
  TextDiffViewer: () => <div data-testid="text-diff" />,
}));

// ─── Component import (after mocks) ──────────────────────────────────────────

import { PendingChangeModal } from '@/components/admin/orchestration/knowledge/pending-change-modal';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DOC_ID = 'doc-abc-123';
const CHANGE_ID = 'change-xyz-456';

interface PendingChangeRecord {
  id: string;
  source: 'rewrite_with_llm' | 'rewrite_section_with_llm';
  beforeContent: string;
  afterContent: string;
  sectionMarker: string | null;
  instructions: string;
}

function makePendingChange(overrides?: Partial<PendingChangeRecord>): PendingChangeRecord {
  return {
    id: CHANGE_ID,
    source: 'rewrite_with_llm',
    beforeContent: 'Before: original content here.',
    afterContent: 'After: rewritten content here.',
    sectionMarker: null,
    instructions: 'Improve clarity',
    ...overrides,
  };
}

function makeDocResponse(changes: PendingChangeRecord[]) {
  return {
    document: {
      id: DOC_ID,
      pendingChanges: changes,
    },
  };
}

const BASE_PROPS = {
  documentId: DOC_ID,
  changeId: CHANGE_ID,
  onClose: vi.fn(),
  onResolved: vi.fn(),
};

function makeAcceptRejectUrl(docId: string, changeId: string, action: 'accept' | 'reject') {
  return `/api/v1/admin/orchestration/knowledge/documents/${docId}/cleanup/changes/${changeId}/${action}`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PendingChangeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
    // Default: returns doc with the matching pending change
    mockApiClientGet.mockResolvedValue(makeDocResponse([makePendingChange()]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Closed state ──────────────────────────────────────────────────────────────

  it('changeId=null → modal is closed (no DialogTitle in the DOM)', () => {
    render(<PendingChangeModal {...BASE_PROPS} changeId={null} />);

    // When changeId is null, open=false — Dialog does not render its children
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  // ── Open state ────────────────────────────────────────────────────────────────

  it('changeId set → modal opens; calls apiClient.get for the document and renders TextDiffViewer', async () => {
    const change = makePendingChange({ sectionMarker: null });
    mockApiClientGet.mockResolvedValue(makeDocResponse([change]));

    render(<PendingChangeModal {...BASE_PROPS} changeId={CHANGE_ID} />);

    // Wait for load to complete and diff to render
    await waitFor(() => {
      expect(screen.getByTestId('text-diff')).toBeInTheDocument();
    });

    // The GET was called with the doc endpoint
    expect(mockApiClientGet).toHaveBeenCalledWith(expect.stringContaining(`/documents/${DOC_ID}`));
  });

  // ── Pending change not found ──────────────────────────────────────────────────

  it('pending change not in response → "Pending change not found" error rendered', async () => {
    // The doc response has no pendingChanges matching the changeId
    mockApiClientGet.mockResolvedValue(
      makeDocResponse([makePendingChange({ id: 'other-change-id' })])
    );

    render(<PendingChangeModal {...BASE_PROPS} changeId={CHANGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText(/Pending change not found/i)).toBeInTheDocument();
    });
  });

  // ── Source line: section rewrite ──────────────────────────────────────────────

  it('section rewrite (sectionMarker set) → source line matches /Section rewrite: <marker>/i', async () => {
    const marker = '## Overview';
    mockApiClientGet.mockResolvedValue(
      makeDocResponse([
        makePendingChange({
          source: 'rewrite_section_with_llm',
          sectionMarker: marker,
        }),
      ])
    );

    render(<PendingChangeModal {...BASE_PROPS} changeId={CHANGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`Section rewrite: ${marker}`, 'i'))).toBeInTheDocument();
    });
  });

  // ── Source line: whole-doc rewrite ────────────────────────────────────────────

  it('whole-doc rewrite (sectionMarker null) → source line matches /Whole-document rewrite/i', async () => {
    mockApiClientGet.mockResolvedValue(
      makeDocResponse([
        makePendingChange({
          source: 'rewrite_with_llm',
          sectionMarker: null,
        }),
      ])
    );

    render(<PendingChangeModal {...BASE_PROPS} changeId={CHANGE_ID} />);

    await waitFor(() => {
      expect(screen.getByText(/Whole-document rewrite/i)).toBeInTheDocument();
    });
  });

  // ── Accept ────────────────────────────────────────────────────────────────────

  it('Accept POSTs /cleanup/changes/<id>/accept; on success calls onResolved then onClose', async () => {
    const onResolved = vi.fn();
    const onClose = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
    globalThis.fetch = fetchMock;

    render(<PendingChangeModal {...BASE_PROPS} onResolved={onResolved} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Accept/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        makeAcceptRejectUrl(DOC_ID, CHANGE_ID, 'accept'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Reject ────────────────────────────────────────────────────────────────────

  it('Reject POSTs /cleanup/changes/<id>/reject; on success calls onResolved then onClose', async () => {
    const onResolved = vi.fn();
    const onClose = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
    globalThis.fetch = fetchMock;

    render(<PendingChangeModal {...BASE_PROPS} onResolved={onResolved} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reject/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Reject/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        makeAcceptRejectUrl(DOC_ID, CHANGE_ID, 'reject'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Accept failure ────────────────────────────────────────────────────────────

  it('Accept failure → error rendered; onResolved and onClose NOT called', async () => {
    const onResolved = vi.fn();
    const onClose = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: { message: 'Accept operation failed on server' },
        }),
    });

    render(<PendingChangeModal {...BASE_PROPS} onResolved={onResolved} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Accept/i }));

    await waitFor(() => {
      expect(screen.getByText(/Accept operation failed on server/i)).toBeInTheDocument();
    });

    expect(onResolved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
