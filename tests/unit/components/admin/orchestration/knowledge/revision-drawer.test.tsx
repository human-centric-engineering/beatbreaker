/**
 * RevisionDrawer Component Tests
 *
 * Test Coverage:
 * - Closed (open=false) → does NOT call apiClient.get (no revisions fetch)
 * - Opens (open=true) → calls apiClient.get with the revisions URL; shows spinner while loading
 * - On success → renders one row per revision; source label prefixes correct ('Agent: ', 'You: section edit')
 * - Empty revisions → "No revisions yet." text appears
 * - Clicking a revision row sets it as selected; right pane renders "v{N} preview" + Restore button
 * - Restore POSTs /cleanup/revisions/{version}/restore; on success calls onRestored AND onOpenChange(false)
 * - Restore failure (5xx) → error message rendered; modal stays open (onOpenChange NOT called)
 *
 * Mocking:
 * - @/lib/api/client (apiClient.get)
 * - globalThis.fetch for restore POST
 * - @/components/admin/orchestration/knowledge/text-diff-viewer → <div data-testid="text-diff" />
 *
 * @see components/admin/orchestration/knowledge/revision-drawer.tsx
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

// Mock TextDiffViewer to a simple marker — keeps revision-drawer tests focused
// on the drawer logic rather than diff rendering (covered by text-diff-viewer.test.tsx)
vi.mock('@/components/admin/orchestration/knowledge/text-diff-viewer', () => ({
  TextDiffViewer: () => <div data-testid="text-diff" />,
}));

// ─── Component import (after mocks) ──────────────────────────────────────────

import { RevisionDrawer } from '@/components/admin/orchestration/knowledge/revision-drawer';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DOC_ID = 'doc-abc-123';
const CURRENT_CONTENT = 'Current document content here.';

function makeRevision(
  overrides?: Partial<{
    id: string;
    version: number;
    source: string;
    actorId: string | null;
    sectionMarker: string | null;
    instructions: string | null;
    createdAt: string;
    contentLength: number;
    charsDelta: number;
  }>
) {
  return {
    id: `rev-${overrides?.version ?? 1}`,
    version: 1,
    source: 'human_section',
    actorId: 'user-123',
    sectionMarker: null,
    instructions: null,
    createdAt: '2026-01-01T10:00:00.000Z',
    contentLength: 500,
    charsDelta: -20,
    ...overrides,
  };
}

const THREE_REVISIONS = [
  makeRevision({ version: 3, source: 'capability:strip_timestamps', charsDelta: -50 }),
  makeRevision({ version: 2, source: 'human_section', charsDelta: 10 }),
  makeRevision({ version: 1, source: 'human_full', charsDelta: 200 }),
];

const BASE_PROPS = {
  documentId: DOC_ID,
  currentContent: CURRENT_CONTENT,
  open: true,
  onOpenChange: vi.fn(),
  onRestored: vi.fn(),
};

function makeRevisionListResponse(revisions: ReturnType<typeof makeRevision>[]) {
  return { revisions };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RevisionDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
    // Default: returns empty revisions list
    mockApiClientGet.mockResolvedValue(makeRevisionListResponse([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Closed state ──────────────────────────────────────────────────────────────

  it('closed (open=false) → does NOT call apiClient.get', () => {
    render(<RevisionDrawer {...BASE_PROPS} open={false} />);

    // No fetch should be attempted when the dialog is closed
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  // ── Loading state ─────────────────────────────────────────────────────────────

  it('open=true → calls apiClient.get with the revisions URL and shows a spinner while loading', async () => {
    // Arrange: block resolution so loading state persists long enough to assert
    let resolveRevisions: (value: unknown) => void;
    const slowPromise = new Promise((resolve) => {
      resolveRevisions = resolve;
    });
    mockApiClientGet.mockReturnValue(slowPromise);

    render(<RevisionDrawer {...BASE_PROPS} open={true} />);

    // Spinner should be visible while loading
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    // Verify the correct URL was called — the route built from documentId
    await waitFor(() => {
      expect(mockApiClientGet).toHaveBeenCalledWith(
        expect.stringContaining(`${DOC_ID}/cleanup/revisions`)
      );
    });

    // Clean up: resolve the promise
    resolveRevisions!(makeRevisionListResponse([]));
  });

  // ── Success: revision rows ────────────────────────────────────────────────────

  it('renders one row per revision on success', async () => {
    mockApiClientGet.mockResolvedValue(makeRevisionListResponse(THREE_REVISIONS));

    render(<RevisionDrawer {...BASE_PROPS} />);

    await waitFor(() => {
      // Each revision gets a version label (v3, v2, v1)
      expect(screen.getByText('v3')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
      expect(screen.getByText('v1')).toBeInTheDocument();
    });
  });

  it('capability: source renders with "Agent: " prefix', async () => {
    mockApiClientGet.mockResolvedValue(
      makeRevisionListResponse([
        makeRevision({ version: 1, source: 'capability:strip_timestamps' }),
      ])
    );

    render(<RevisionDrawer {...BASE_PROPS} />);

    await waitFor(() => {
      // formatSource('capability:strip_timestamps') → 'Agent: strip_timestamps'
      expect(screen.getByText('Agent: strip_timestamps')).toBeInTheDocument();
    });
  });

  it('human_section source renders as "You: section edit"', async () => {
    mockApiClientGet.mockResolvedValue(
      makeRevisionListResponse([makeRevision({ version: 1, source: 'human_section' })])
    );

    render(<RevisionDrawer {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('You: section edit')).toBeInTheDocument();
    });
  });

  // ── Empty revisions ───────────────────────────────────────────────────────────

  it('empty revisions list → renders "No revisions yet."', async () => {
    mockApiClientGet.mockResolvedValue(makeRevisionListResponse([]));

    render(<RevisionDrawer {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('No revisions yet.')).toBeInTheDocument();
    });
  });

  // ── Selection and preview ─────────────────────────────────────────────────────

  it('clicking a revision row shows the preview pane with v{N} preview and Restore button', async () => {
    mockApiClientGet.mockResolvedValue(
      makeRevisionListResponse([makeRevision({ version: 5, source: 'human_full' })])
    );

    render(<RevisionDrawer {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('v5')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    // Click the revision row button
    await user.click(screen.getByRole('button', { name: /v5/i }));

    // Right pane shows version preview header
    await waitFor(() => {
      expect(screen.getByText('v5 preview')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Restore this version/i })).toBeInTheDocument();
  });

  // ── Restore: success ──────────────────────────────────────────────────────────

  it('Restore POSTs /cleanup/revisions/{version}/restore; on success calls onRestored AND onOpenChange(false)', async () => {
    const version = 3;
    const onRestored = vi.fn();
    const onOpenChange = vi.fn();
    mockApiClientGet.mockResolvedValue(
      makeRevisionListResponse([makeRevision({ version, source: 'human_full' })])
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: { newContent: 'restored content' } }),
    });
    globalThis.fetch = fetchMock;

    render(<RevisionDrawer {...BASE_PROPS} onRestored={onRestored} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText(`v${version}`)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: new RegExp(`v${version}`, 'i') }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Restore this version/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Restore this version/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`revisions/${version}/restore`),
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(onRestored).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ── formatSource: restore source ─────────────────────────────────────────────

  it('restore source renders as "You: restore"', async () => {
    // Exercises the `if (source === 'restore') return 'You: restore'` branch at L46.
    mockApiClientGet.mockResolvedValue(
      makeRevisionListResponse([makeRevision({ version: 1, source: 'restore' })])
    );

    render(<RevisionDrawer {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('You: restore')).toBeInTheDocument();
    });
  });

  // ── formatSource: unknown source → pass-through ───────────────────────────────

  it('unknown source string is rendered as-is (else fallback)', async () => {
    // Exercises the `return source` else branch at L47 in formatSource.
    // Any string that doesn't match the known prefixes/values passes through unchanged.
    const unknownSource = 'unknown_source_type';
    mockApiClientGet.mockResolvedValue(
      makeRevisionListResponse([makeRevision({ version: 1, source: unknownSource })])
    );

    render(<RevisionDrawer {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText(unknownSource)).toBeInTheDocument();
    });
  });

  // ── fetchRevisions error path ─────────────────────────────────────────────────

  it('renders "Failed to load revisions" when apiClient.get rejects', async () => {
    // Exercises the catch block at L71 with an Error instance.
    mockApiClientGet.mockRejectedValue(new Error('Network timeout'));

    render(<RevisionDrawer {...BASE_PROPS} open={true} />);

    await waitFor(() => {
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });
  });

  it('renders "Failed to load revisions" when apiClient.get rejects with a non-Error value', async () => {
    // Exercises the `err instanceof Error ? err.message : 'Failed to load revisions'` fallback.
    mockApiClientGet.mockRejectedValue('plain string rejection');

    render(<RevisionDrawer {...BASE_PROPS} open={true} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load revisions')).toBeInTheDocument();
    });
  });

  // ── Non-most-recent revision: preview deferred message ───────────────────────

  it('selecting a non-most-recent revision shows the "deferred" preview message instead of TextDiffViewer', async () => {
    // previewableVersions = { revisions[0].version } = the FIRST (most recent) version.
    // Selecting the second revision (not in previewableVersions) renders the Phase-8 message.
    const revisions = [
      makeRevision({ version: 3, source: 'human_section' }),
      makeRevision({ version: 2, source: 'human_full' }),
    ];
    mockApiClientGet.mockResolvedValue(makeRevisionListResponse(revisions));

    render(<RevisionDrawer {...BASE_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('v2')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    // Click version 2 — NOT the most-recent (version 3)
    await user.click(screen.getByRole('button', { name: /v2/i }));

    await waitFor(() => {
      // The Phase-8 deferred preview message renders for non-most-recent revisions.
      expect(screen.getByText(/Side-by-side diff preview lands in Phase 8/i)).toBeInTheDocument();
    });

    // TextDiffViewer must NOT be rendered (the previewable-versions guard blocked it).
    expect(screen.queryByTestId('text-diff')).not.toBeInTheDocument();
  });

  // ── Restore: failure ──────────────────────────────────────────────────────────

  it('Restore failure (5xx) renders an error message; modal stays open (onOpenChange NOT called)', async () => {
    const version = 2;
    const onRestored = vi.fn();
    const onOpenChange = vi.fn();
    mockApiClientGet.mockResolvedValue(
      makeRevisionListResponse([makeRevision({ version, source: 'human_section' })])
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: { message: 'Internal server error during restore' },
        }),
    });

    render(<RevisionDrawer {...BASE_PROPS} onRestored={onRestored} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText(`v${version}`)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: new RegExp(`v${version}`, 'i') }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Restore this version/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Restore this version/i }));

    await waitFor(() => {
      expect(screen.getByText(/Internal server error during restore/i)).toBeInTheDocument();
    });

    // Modal stays open — callbacks not called
    expect(onRestored).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
