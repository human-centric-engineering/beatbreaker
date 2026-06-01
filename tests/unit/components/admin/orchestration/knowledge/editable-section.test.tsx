/**
 * EditableSection Component Tests
 *
 * Test Coverage:
 * - View mode: renders <pre> with section.body; pencil button present in DOM (hidden via CSS)
 * - Click pencil → acquireLock called; on false return, stays in view mode (no textarea)
 * - Click pencil → acquireLock returns true → enters edit mode (textarea, Save/Cancel/Refine buttons)
 * - Save POSTs /cleanup/section with { sectionMarker, content, expectedFingerprint } using real sha256Hex
 * - 423 response → error banner matching /another admin is editing/i; stays in edit mode
 * - 409 response → conflict panel with Keep mine / Take theirs; clicking Take theirs replaces draft
 * - Save success → exits edit mode; onSaved callback fires
 * - Cancel exits edit mode without firing fetch
 * - Refine button reveals instructions input + Refine/Cancel; Refine POSTs /cleanup/section/refine
 * - Refine success → onPendingChange called with returned id; prompt closed
 * - Live diff strip shows +N chars when text is added to the textarea
 *
 * Mocking: globalThis.fetch per test; acquireLock is a prop (vi.fn()).
 * sha256Hex is NOT mocked — we use the real implementation for end-to-end fingerprint integrity.
 *
 * @see components/admin/orchestration/knowledge/editable-section.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditableSection } from '@/components/admin/orchestration/knowledge/editable-section';
import { sha256Hex } from '@/lib/orchestration/knowledge/cleanup-client';
import type { Section } from '@/lib/orchestration/knowledge/section-detection';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DOC_ID = 'doc-abc-123';
const SECTION_MARKER = '## Introduction';
const SECTION_BODY = 'This is the introduction section body.';

function makeSection(overrides?: Partial<Section>): Section {
  return {
    id: 'section-id-001',
    marker: SECTION_MARKER,
    body: SECTION_BODY,
    startOffset: 0,
    endOffset: SECTION_BODY.length,
    ...overrides,
  };
}

const BASE_PROPS = {
  documentId: DOC_ID,
  section: makeSection(),
  acquireLock: vi.fn().mockResolvedValue(true),
  onSaved: vi.fn(),
  onPendingChange: vi.fn(),
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

function makeSectionUrl(docId: string) {
  return `/api/v1/admin/orchestration/knowledge/documents/${docId}/cleanup/section`;
}

function makeRefineUrl(docId: string) {
  return `${makeSectionUrl(docId)}/refine`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EditableSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: {} }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── View mode ─────────────────────────────────────────────────────────────────

  it('renders a <pre> with section.body in view mode', () => {
    render(<EditableSection {...BASE_PROPS} />);

    const pre = document.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toBe(SECTION_BODY);
  });

  it('pencil button is present in the DOM (hidden via CSS but queryable by aria-label)', () => {
    render(<EditableSection {...BASE_PROPS} />);

    // The button is in DOM but hidden via CSS (opacity-0 + group-hover classes)
    const pencilButton = document.querySelector(`[aria-label="Edit section ${SECTION_MARKER}"]`);
    expect(pencilButton).not.toBeNull();
  });

  it('clicking pencil calls acquireLock', async () => {
    const acquireLock = vi.fn().mockResolvedValue(true);
    render(<EditableSection {...BASE_PROPS} acquireLock={acquireLock} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(acquireLock).toHaveBeenCalledTimes(1);
    });
  });

  it('stays in view mode (no textarea) when acquireLock returns false', async () => {
    const acquireLock = vi.fn().mockResolvedValue(false);
    render(<EditableSection {...BASE_PROPS} acquireLock={acquireLock} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(acquireLock).toHaveBeenCalled();
    });

    // No textarea should appear — still in view mode
    expect(document.querySelector('textarea')).toBeNull();
  });

  // ── Edit mode ─────────────────────────────────────────────────────────────────

  it('enters edit mode with textarea and action buttons when acquireLock returns true', async () => {
    render(<EditableSection {...BASE_PROPS} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(document.querySelector('textarea')).not.toBeNull();
    });

    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refine with agent/i })).toBeInTheDocument();
  });

  // ── Save: fingerprint integrity ───────────────────────────────────────────────

  it('Save POSTs with expectedFingerprint = sha256Hex(section.body) — fingerprint contract is end-to-end verifiable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
    globalThis.fetch = fetchMock;

    render(<EditableSection {...BASE_PROPS} />);

    // Enter edit mode
    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(document.querySelector('textarea')).not.toBeNull();
    });

    // Click Save
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    // Compute the expected fingerprint using the REAL sha256Hex (not a mock)
    const expectedFingerprint = await sha256Hex(SECTION_BODY);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        makeSectionUrl(DOC_ID),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            sectionMarker: SECTION_MARKER,
            content: SECTION_BODY,
            expectedFingerprint,
          }),
        })
      );
    });
  });

  // ── Save: 423 lock-held response ──────────────────────────────────────────────

  it('423 response shows error banner matching /another admin is editing/i; stays in edit mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 423,
      json: () => Promise.resolve({ success: false, error: { code: 'LOCK_HELD' } }),
    });
    globalThis.fetch = fetchMock;

    render(<EditableSection {...BASE_PROPS} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(document.querySelector('textarea')).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Another admin is editing/i)).toBeInTheDocument();
    });

    // Should still be in edit mode (textarea present)
    expect(document.querySelector('textarea')).not.toBeNull();
  });

  // ── Save: 409 conflict response ───────────────────────────────────────────────

  it('409 response renders conflict panel with Keep mine / Take theirs buttons', async () => {
    const serverBody = 'Server version of the content';
    const serverFingerprint = 'abc123fingerprint';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'CONTENT_MISMATCH',
            details: {
              currentBody: [serverBody],
              currentFingerprint: [serverFingerprint],
            },
          },
        }),
    });

    render(<EditableSection {...BASE_PROPS} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(document.querySelector('textarea')).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Keep mine/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Take theirs/i })).toBeInTheDocument();
    });
  });

  it('clicking Take theirs replaces the textarea content with currentBody from response', async () => {
    const serverBody = 'Server version replaces draft';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'CONTENT_MISMATCH',
            details: {
              currentBody: [serverBody],
              currentFingerprint: ['fp-xyz'],
            },
          },
        }),
    });

    render(<EditableSection {...BASE_PROPS} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(document.querySelector('textarea')).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Take theirs/i })).toBeInTheDocument();
    });

    // Click Take theirs
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Take theirs/i }));

    // Textarea content should now be the server body
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe(serverBody);

    // Conflict panel should be gone
    expect(screen.queryByRole('button', { name: /Keep mine/i })).not.toBeInTheDocument();
  });

  // ── Save: success ─────────────────────────────────────────────────────────────

  it('save success exits edit mode and calls onSaved callback', async () => {
    const onSaved = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });

    render(<EditableSection {...BASE_PROPS} onSaved={onSaved} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(document.querySelector('textarea')).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      // Textarea gone — back to view mode
      expect(document.querySelector('textarea')).toBeNull();
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  // ── Cancel ────────────────────────────────────────────────────────────────────

  it('Cancel exits edit mode without firing any fetch', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    render(<EditableSection {...BASE_PROPS} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(document.querySelector('textarea')).not.toBeNull();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^Cancel$/i }));

    // Back to view mode
    expect(document.querySelector('textarea')).toBeNull();

    // No fetch should have been called (fetch was not set up to resolve, would hang if called)
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── Refine with agent ─────────────────────────────────────────────────────────

  it('Refine button reveals instructions input + Refine/Cancel buttons', async () => {
    render(<EditableSection {...BASE_PROPS} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refine with agent/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Refine with agent/i }));

    // Instructions input should appear
    expect(screen.getByPlaceholderText(/shorten to one paragraph/i)).toBeInTheDocument();

    // Refine and Cancel buttons within the prompt panel
    const refineButtons = screen.getAllByRole('button', { name: /^Refine$/i });
    expect(refineButtons.length).toBeGreaterThan(0);
  });

  it('Refine POSTs /cleanup/section/refine with { sectionMarker, instructions }', async () => {
    const instructions = 'Make it shorter and clearer';
    const pendingChangeId = 'change-abc-789';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: { pendingChangeId } }),
    });
    globalThis.fetch = fetchMock;

    render(<EditableSection {...BASE_PROPS} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refine with agent/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Refine with agent/i }));

    const instructionsInput = screen.getByPlaceholderText(/shorten to one paragraph/i);
    await user.type(instructionsInput, instructions);

    // Click the Refine button (inside the prompt panel)
    const refineButtons = screen.getAllByRole('button', { name: /^Refine$/i });
    await user.click(refineButtons[refineButtons.length - 1]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        makeRefineUrl(DOC_ID),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            sectionMarker: SECTION_MARKER,
            instructions,
          }),
        })
      );
    });
  });

  it('Refine success calls onPendingChange with the returned pendingChangeId', async () => {
    const onPendingChange = vi.fn();
    const pendingChangeId = 'change-xyz-999';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: { pendingChangeId } }),
    });

    render(<EditableSection {...BASE_PROPS} onPendingChange={onPendingChange} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refine with agent/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Refine with agent/i }));

    const instructionsInput = screen.getByPlaceholderText(/shorten to one paragraph/i);
    await user.type(instructionsInput, 'Shorten it');

    const refineButtons = screen.getAllByRole('button', { name: /^Refine$/i });
    await user.click(refineButtons[refineButtons.length - 1]);

    await waitFor(() => {
      expect(onPendingChange).toHaveBeenCalledWith(pendingChangeId);
    });
  });

  // ── Live diff strip ───────────────────────────────────────────────────────────

  it('live diff strip shows +N chars when text is typed into the textarea', async () => {
    render(<EditableSection {...BASE_PROPS} />);

    const pencilButton = document.querySelector(
      `[aria-label="Edit section ${SECTION_MARKER}"]`
    ) as HTMLElement;
    fireEvent.click(pencilButton);

    await waitFor(() => {
      expect(document.querySelector('textarea')).not.toBeNull();
    });

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const addedText = ' extra added text here';
    const expectedDelta = addedText.length;

    // Use fireEvent.change to set the new value directly (avoids userEvent brace escaping)
    fireEvent.change(textarea, { target: { value: SECTION_BODY + addedText } });

    // The action bar should show the positive char delta
    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`\\+${expectedDelta.toLocaleString()}\\s*chars`, 'i'))
      ).toBeInTheDocument();
    });
  });
});
