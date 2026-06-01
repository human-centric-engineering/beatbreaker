/**
 * Unit Tests: StripMatchesCapability
 *
 * Tests for the strip_matches capability, which removes inline regex matches
 * from lines (rather than whole lines). The "g" flag is always forced on.
 *
 * @see lib/orchestration/capabilities/built-in/document-cleanup/strip-matches.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// vi.mock is hoisted — use vi.hoisted() so mock fn refs exist before the factory runs
const { mockResolveCleanupTarget, mockWriteCleanupContent, mockSummariseMutation } = vi.hoisted(
  () => ({
    mockResolveCleanupTarget: vi.fn(),
    mockWriteCleanupContent: vi.fn(),
    mockSummariseMutation: vi.fn(),
  })
);

vi.mock('@/lib/orchestration/capabilities/built-in/document-cleanup/context', () => ({
  resolveCleanupTarget: mockResolveCleanupTarget,
  writeCleanupContent: mockWriteCleanupContent,
  summariseMutation: mockSummariseMutation,
}));

const { mockRequireEditableTarget } = vi.hoisted(() => ({
  mockRequireEditableTarget: vi.fn(),
}));

vi.mock('@/lib/orchestration/knowledge/edit-lock', () => ({
  requireEditableTarget: mockRequireEditableTarget,
}));

// ─── Imports ────────────────────────────────────────────────────────────────

import { StripMatchesCapability } from '@/lib/orchestration/capabilities/built-in/document-cleanup/strip-matches';
import type { CapabilityContext } from '@/lib/orchestration/capabilities/types';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const DOCUMENT_ID = 'doc-sm-001';

function makeContext(overrides: Partial<CapabilityContext> = {}): CapabilityContext {
  return {
    userId: 'user-1',
    agentId: 'agent-1',
    conversationId: 'conv-1',
    ...overrides,
  };
}

function makeTarget(content: string) {
  return {
    documentId: DOCUMENT_ID,
    content,
    originalContent: content,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('StripMatchesCapability', () => {
  let capability: StripMatchesCapability;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireEditableTarget.mockResolvedValue({ ok: true });
    capability = new StripMatchesCapability();
    // Real summariseMutation logic for accurate assertions
    mockSummariseMutation.mockImplementation((before: string, after: string) => ({
      charsRemoved: before.length - after.length,
      charsAfter: after.length,
      linesRemoved: before.split('\n').length - after.split('\n').length,
      linesAfter: after.split('\n').length,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── not_cleanup_session ──────────────────────────────────────────────────

  it('returns not_cleanup_session error when resolveCleanupTarget returns null', async () => {
    // Arrange
    mockResolveCleanupTarget.mockResolvedValue(null);

    // Act
    const result = await capability.execute({ regex: 'foo' }, makeContext());

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('not_cleanup_session');
    expect(mockWriteCleanupContent).not.toHaveBeenCalled();
  });

  // ── g flag is forced ─────────────────────────────────────────────────────

  it('forces the g flag even when the caller omits it, removing all matches globally', async () => {
    // Arrange: three occurrences of [12:34] — without g, only the first would be stripped
    const content = 'Text [12:34] more text [56:78] and [90:12] end';
    mockResolveCleanupTarget.mockResolvedValue(makeTarget(content));

    // Act: no flags supplied — the capability must add 'g' internally
    const result = await capability.execute({ regex: '\\[\\d{2}:\\d{2}\\]' }, makeContext());

    // Assert: all three matches removed (not just the first)
    expect(result.success).toBe(true);
    expect(result.data?.matchCount).toBe(3);
    const writtenContent = vi.mocked(mockWriteCleanupContent).mock.calls[0]?.[1] as string;
    expect(writtenContent).toBe('Text  more text  and  end');
  });

  it('does not duplicate g when the caller already includes it in flags', async () => {
    // Arrange
    const content = 'aXb aXb aXb';
    mockResolveCleanupTarget.mockResolvedValue(makeTarget(content));

    // Act: caller passes g explicitly — the capability should not throw on 'gg' (implementation
    // checks for existing g before appending)
    const result = await capability.execute({ regex: 'X', flags: 'g' }, makeContext());

    // Assert: all three X characters removed
    expect(result.success).toBe(true);
    expect(result.data?.matchCount).toBe(3);
    expect(mockWriteCleanupContent).toHaveBeenCalledWith(DOCUMENT_ID, 'ab ab ab');
  });

  // ── matchCount reflects total matches ───────────────────────────────────

  it('returns matchCount === 0 when no matches exist (no-op)', async () => {
    // Arrange
    const content = 'no timestamps here\njust plain text';
    mockResolveCleanupTarget.mockResolvedValue(makeTarget(content));

    // Act
    const result = await capability.execute({ regex: '\\d{2}:\\d{2}' }, makeContext());

    // Assert: no matches → matchCount 0, content unchanged, charsRemoved 0
    expect(result.success).toBe(true);
    expect(result.data?.matchCount).toBe(0);
    expect(result.data?.charsRemoved).toBe(0);
    expect(mockWriteCleanupContent).toHaveBeenCalledWith(DOCUMENT_ID, content);
  });

  // ── partial-line match preserves surrounding text ────────────────────────

  it('removes only the matching portion of a line, preserving surrounding text', async () => {
    // Arrange: inline timestamp markers mid-line
    const content = 'Hello 00:42 world\nAnother line 01:15 here';
    mockResolveCleanupTarget.mockResolvedValue(makeTarget(content));

    // Act
    const result = await capability.execute({ regex: '\\d{2}:\\d{2}' }, makeContext());

    // Assert: timestamps stripped but surrounding text preserved on the same lines
    expect(result.success).toBe(true);
    const writtenContent = vi.mocked(mockWriteCleanupContent).mock.calls[0]?.[1] as string;
    expect(writtenContent).toBe('Hello  world\nAnother line  here');
    expect(result.data?.matchCount).toBe(2);
  });

  // ── MutationSummary shape ────────────────────────────────────────────────

  it('returns the full MutationSummary shape plus pattern and matchCount', async () => {
    // Arrange
    const content = 'remove_me keep this remove_me';
    mockResolveCleanupTarget.mockResolvedValue(makeTarget(content));

    // Act
    const result = await capability.execute({ regex: 'remove_me' }, makeContext());

    // Assert: all expected data fields present
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      charsRemoved: expect.any(Number),
      charsAfter: expect.any(Number),
      linesRemoved: expect.any(Number),
      linesAfter: expect.any(Number),
      pattern: 'remove_me',
      matchCount: 2,
    });
  });
});
