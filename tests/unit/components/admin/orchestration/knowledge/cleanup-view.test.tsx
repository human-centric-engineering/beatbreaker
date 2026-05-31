/**
 * CleanupView Component Tests
 *
 * Test Coverage:
 * - Renders document name and size-class badge with the correct label
 * - Shows the "too-large" warning callout when llmRewriteAllowed=false
 * - Does NOT show the callout when llmRewriteAllowed=true
 * - Renders three action buttons in the header (Mark cleaned, Use original, Discard & delete)
 * - Tab switcher swaps between "Cleaned" and "Original" content in the preview pane
 * - Reduction-percentage label appears when processedContent is shorter than originalContent
 * - "Mark cleaned" POSTs { action: 'commit' } and redirects on success
 * - "Use original" POSTs { action: 'use-original' } and redirects on success
 * - "Discard & delete" POSTs { action: 'delete' } and redirects on success
 * - Displays error message when finalise POST fails
 * - When onStreamComplete fires, re-fetches doc and updates processedContent
 * - When onCapabilityResult fires, re-fetches doc and updates processedContent
 *
 * @see components/admin/orchestration/knowledge/cleanup-view.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CleanupView } from '@/components/admin/orchestration/knowledge/cleanup-view';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// vi.hoisted ensures mockPush is available inside the vi.mock factory because
// vi.mock calls are hoisted to module scope at transform time.
const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Capture the callback props so tests can fire them manually.
// Using a plain mutable object (not ref) so assignments inside the factory
// closure update the value the test body reads.
let capturedOnStreamComplete: (() => void) | undefined;
let capturedOnCapabilityResult: (() => void) | undefined;

vi.mock('@/components/admin/orchestration/chat/chat-interface', () => ({
  ChatInterface: (props: {
    agentSlug: string;
    onStreamComplete?: () => void;
    onCapabilityResult?: (slug: string, result: unknown) => void;
  }) => {
    // Capture callbacks on every render so the latest closure is available.
    capturedOnStreamComplete = props.onStreamComplete;
    // Adapt the signature: the plan specifies onCapabilityResult fires with no args from
    // the test side; we wrap the real prop (which takes slug + result) to satisfy the
    // component's signature while exposing a zero-arg call from the test.
    capturedOnCapabilityResult = props.onCapabilityResult
      ? () => props.onCapabilityResult!('cleanup-agent', {})
      : undefined;
    return <div data-testid="chat-interface" data-agent={props.agentSlug} />;
  },
}));

// apiClient.get is used for the doc refetch after chat events.
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
  APIClientError: class APIClientError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'APIClientError';
    }
  },
}));

// ─── Import mocked modules (after vi.mock declarations) ───────────────────────

import { apiClient } from '@/lib/api/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DOC_ID = 'doc-abc-123';
const DOC_NAME = 'Meeting Notes Q1';
const FILE_NAME = 'meeting-notes-q1.pdf';

const BASE_PROPS = {
  documentId: DOC_ID,
  documentName: DOC_NAME,
  fileName: FILE_NAME,
  originalContent: 'Original text here with some content.',
  initialProcessedContent: 'Cleaned up text.',
  sizeClass: 'medium' as const,
  sizeTokens: 12000,
  llmRewriteAllowed: true,
  conversationId: null,
};

/** A happy-path fetch mock — returns updated processedContent. */
function makeFetchSuccess(body: unknown = {}) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

/** A failing fetch mock — returns 500 with an error body. */
function makeFetchError(message = 'Internal Server Error') {
  return Promise.resolve({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error: { message } }),
  });
}

/** Default successful apiClient.get response for the doc refetch. */
function makeDocResponse(processedContent = 'Refreshed content.') {
  return {
    document: {
      id: DOC_ID,
      status: 'cleanup_ready',
      originalContent: BASE_PROPS.originalContent,
      processedContent,
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CleanupView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnStreamComplete = undefined;
    capturedOnCapabilityResult = undefined;

    // Default: all fetches succeed with an empty JSON body
    globalThis.fetch = vi.fn().mockImplementation(() => makeFetchSuccess({}));

    // Default: apiClient.get returns the base doc shape
    vi.mocked(apiClient.get).mockResolvedValue(makeDocResponse());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Badge labels ─────────────────────────────────────────────────────────────

  it('renders the document name in the heading', () => {
    render(<CleanupView {...BASE_PROPS} />);
    expect(screen.getByRole('heading', { name: DOC_NAME })).toBeInTheDocument();
  });

  it('renders "Medium" badge for sizeClass="medium"', () => {
    render(<CleanupView {...BASE_PROPS} sizeClass="medium" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders "Small" badge for sizeClass="small"', () => {
    render(<CleanupView {...BASE_PROPS} sizeClass="small" />);
    expect(screen.getByText('Small')).toBeInTheDocument();
  });

  it('renders "Large" badge for sizeClass="large"', () => {
    render(<CleanupView {...BASE_PROPS} sizeClass="large" />);
    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  it('renders "Too large for whole-doc LLM rewrite" badge for sizeClass="too-large"', () => {
    render(<CleanupView {...BASE_PROPS} sizeClass="too-large" llmRewriteAllowed={false} />);
    expect(screen.getByText('Too large for whole-doc LLM rewrite')).toBeInTheDocument();
  });

  // ── Too-large warning callout ─────────────────────────────────────────────────

  it('shows the too-large warning callout when llmRewriteAllowed=false', () => {
    render(<CleanupView {...BASE_PROPS} llmRewriteAllowed={false} />);
    expect(
      screen.getByText(/This document is too large for a whole-document LLM rewrite/i)
    ).toBeInTheDocument();
  });

  it('does NOT show the too-large warning callout when llmRewriteAllowed=true', () => {
    render(<CleanupView {...BASE_PROPS} llmRewriteAllowed={true} />);
    expect(
      screen.queryByText(/This document is too large for a whole-document LLM rewrite/i)
    ).not.toBeInTheDocument();
  });

  // ── Header action buttons ─────────────────────────────────────────────────────

  it('renders all three action buttons in the header', () => {
    render(<CleanupView {...BASE_PROPS} />);
    expect(screen.getByRole('button', { name: /Mark cleaned/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use original/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Discard.*delete/i })).toBeInTheDocument();
  });

  // ── Tab switcher ─────────────────────────────────────────────────────────────

  it('shows processedContent in the Cleaned tab by default', () => {
    render(
      <CleanupView
        {...BASE_PROPS}
        originalContent="original text"
        initialProcessedContent="cleaned text"
      />
    );
    // The "Cleaned" tab is active by default; its content should be visible.
    expect(screen.getByText('cleaned text')).toBeInTheDocument();
  });

  it('switches to showing originalContent after clicking the Original tab', async () => {
    const user = userEvent.setup();
    render(
      <CleanupView
        {...BASE_PROPS}
        originalContent="original text"
        initialProcessedContent="cleaned text"
      />
    );

    // Act — switch to the "Original" tab
    await user.click(screen.getByRole('tab', { name: /Original/i }));

    // Assert — original content is now visible in the preview pane
    expect(screen.getByText('original text')).toBeInTheDocument();
  });

  it('switches back to showing processedContent after clicking Cleaned tab', async () => {
    const user = userEvent.setup();
    render(
      <CleanupView
        {...BASE_PROPS}
        originalContent="original text"
        initialProcessedContent="cleaned text"
      />
    );

    // Switch to Original
    await user.click(screen.getByRole('tab', { name: /Original/i }));
    // Switch back to Cleaned
    await user.click(screen.getByRole('tab', { name: /Cleaned/i }));

    expect(screen.getByText('cleaned text')).toBeInTheDocument();
  });

  // ── Reduction percentage ──────────────────────────────────────────────────────

  it('shows a reduction percentage when processedContent is shorter than originalContent', () => {
    // originalContent length: 50 chars; processedContent length: 25 chars → 50% reduction
    render(
      <CleanupView
        {...BASE_PROPS}
        originalContent={'a'.repeat(50)}
        initialProcessedContent={'b'.repeat(25)}
      />
    );
    expect(screen.getByText(/50\.0% reduction/i)).toBeInTheDocument();
  });

  it('does NOT show a reduction percentage when content lengths are equal', () => {
    render(
      <CleanupView
        {...BASE_PROPS}
        originalContent="same length text!!!"
        initialProcessedContent="same length text!!!"
      />
    );
    expect(screen.queryByText(/reduction/i)).not.toBeInTheDocument();
  });

  // ── Finalise: Mark cleaned ────────────────────────────────────────────────────

  it('POSTs { action: "commit" } when "Mark cleaned" is clicked', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockImplementation(() => makeFetchSuccess({}));

    render(<CleanupView {...BASE_PROPS} />);
    await user.click(screen.getByRole('button', { name: /Mark cleaned/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${DOC_ID}/cleanup/finalise`),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'commit' }),
        })
      );
    });
  });

  it('redirects to /admin/orchestration/knowledge after "Mark cleaned" succeeds', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockImplementation(() => makeFetchSuccess({}));

    render(<CleanupView {...BASE_PROPS} />);
    await user.click(screen.getByRole('button', { name: /Mark cleaned/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/orchestration/knowledge');
    });
  });

  // ── Finalise: Use original ────────────────────────────────────────────────────

  it('POSTs { action: "use-original" } when "Use original" is clicked', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockImplementation(() => makeFetchSuccess({}));

    render(<CleanupView {...BASE_PROPS} />);
    await user.click(screen.getByRole('button', { name: /Use original/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${DOC_ID}/cleanup/finalise`),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'use-original' }),
        })
      );
    });
  });

  it('redirects to /admin/orchestration/knowledge after "Use original" succeeds', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockImplementation(() => makeFetchSuccess({}));

    render(<CleanupView {...BASE_PROPS} />);
    await user.click(screen.getByRole('button', { name: /Use original/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/orchestration/knowledge');
    });
  });

  // ── Finalise: Discard & delete ────────────────────────────────────────────────

  it('POSTs { action: "delete" } when "Discard & delete" is clicked', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockImplementation(() => makeFetchSuccess({}));

    render(<CleanupView {...BASE_PROPS} />);
    await user.click(screen.getByRole('button', { name: /Discard.*delete/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${DOC_ID}/cleanup/finalise`),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'delete' }),
        })
      );
    });
  });

  it('redirects to /admin/orchestration/knowledge after "Discard & delete" succeeds', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockImplementation(() => makeFetchSuccess({}));

    render(<CleanupView {...BASE_PROPS} />);
    await user.click(screen.getByRole('button', { name: /Discard.*delete/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/orchestration/knowledge');
    });
  });

  // ── Finalise: error handling ──────────────────────────────────────────────────

  it('displays an error message when the finalise POST fails', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => makeFetchError('Something went wrong on the server'));

    render(<CleanupView {...BASE_PROPS} />);
    await user.click(screen.getByRole('button', { name: /Mark cleaned/i }));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong on the server/i)).toBeInTheDocument();
    });

    // Should NOT redirect on failure
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not redirect when the finalise POST fails', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockImplementation(() => makeFetchError('Server error'));

    render(<CleanupView {...BASE_PROPS} />);
    await user.click(screen.getByRole('button', { name: /Use original/i }));

    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  // ── ChatInterface is mounted ──────────────────────────────────────────────────

  it('mounts the ChatInterface with the cleanup-agent slug', () => {
    render(<CleanupView {...BASE_PROPS} />);
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    expect(screen.getByTestId('chat-interface')).toHaveAttribute('data-agent', 'cleanup-agent');
  });

  // ── Refetch on chat events ────────────────────────────────────────────────────

  it('re-fetches the doc via apiClient.get when onStreamComplete fires and updates processedContent', async () => {
    // Arrange: apiClient.get will return updated processedContent
    vi.mocked(apiClient.get).mockResolvedValue(makeDocResponse('Stream-refreshed content'));

    render(<CleanupView {...BASE_PROPS} initialProcessedContent="old content before stream" />);

    // Confirm initial state
    expect(screen.getByText('old content before stream')).toBeInTheDocument();

    // Act: fire the onStreamComplete callback that CleanupView passes to ChatInterface
    await act(async () => {
      capturedOnStreamComplete?.();
    });

    // Assert: apiClient.get was called with the doc endpoint, and the preview
    // pane now shows the updated processedContent from the API response —
    // not the stale initialProcessedContent the component started with.
    await waitFor(() => {
      expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith(expect.stringContaining(DOC_ID));
      expect(screen.getByText('Stream-refreshed content')).toBeInTheDocument();
    });
  });

  it('re-fetches the doc via apiClient.get when onCapabilityResult fires and updates processedContent', async () => {
    // Arrange: apiClient.get returns content updated by a capability
    vi.mocked(apiClient.get).mockResolvedValue(makeDocResponse('Capability-refreshed content'));

    render(<CleanupView {...BASE_PROPS} initialProcessedContent="old content before capability" />);

    expect(screen.getByText('old content before capability')).toBeInTheDocument();

    // Act: fire the onCapabilityResult callback
    await act(async () => {
      capturedOnCapabilityResult?.();
    });

    // Assert: the preview pane reflects the content the API returned after the
    // capability ran — proving CleanupView called apiClient.get and applied
    // the response, not simply re-rendered with a mock return value.
    await waitFor(() => {
      expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith(expect.stringContaining(DOC_ID));
      expect(screen.getByText('Capability-refreshed content')).toBeInTheDocument();
    });
  });

  it('does not crash when refetch returns an unexpected shape', async () => {
    // Arrange: apiClient.get returns a shape that fails docResponseSchema.safeParse
    vi.mocked(apiClient.get).mockResolvedValue({ unexpected: 'shape' });

    render(<CleanupView {...BASE_PROPS} initialProcessedContent="original state" />);

    // Act: fire the stream complete callback — refetch should fail gracefully
    await act(async () => {
      capturedOnStreamComplete?.();
    });

    // Assert: the component remains stable; processedContent is unchanged
    await waitFor(() => {
      expect(screen.getByText('original state')).toBeInTheDocument();
    });
  });

  it('does not crash when refetch throws', async () => {
    // Arrange: apiClient.get throws a network error
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network failure'));

    render(<CleanupView {...BASE_PROPS} initialProcessedContent="stable content" />);

    // Act: fire the stream complete callback — catch block should swallow the error
    await act(async () => {
      capturedOnStreamComplete?.();
    });

    // Assert: component does not unmount; stable content is still shown
    await waitFor(() => {
      expect(screen.getByText('stable content')).toBeInTheDocument();
    });
  });
});
