// @vitest-environment happy-dom

/**
 * Opening a saved pattern in place — what `fetchSavedPattern` reads from
 * `GET /api/v1/breaks/:id` about sharing and fixed notes (Phase 6, 7A).
 *
 * @see components/app/studio/use-practice-history.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { get: vi.fn() } };
});

import { fetchSavedPattern } from '@/components/app/studio/use-practice-history';
import { APIClientError, apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { testStyle } from '@/tests/helpers/catalogue';

const ID = 'cbrk00000000000000000001';

function answer(overrides: Record<string, unknown> = {}) {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 3,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return {
    id: ID,
    title: 'Cold Carpet',
    mine: true,
    doc: breakPayload({
      bpm: 90,
      swing: 0,
      level: 5,
      arrangement: ['A', 'B'],
      A,
      B: deriveB(A, funk.params),
    }),
    description: null,
    links: [],
    visibility: 'published',
    slug: 'pub0000001',
    basedOn: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

describe('fetchSavedPattern', () => {
  it('reads a pattern that has been published as fixed', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(answer({ frozenAt: '2026-09-20T00:00:00.000Z' }));
    const opened = await fetchSavedPattern(ID);
    expect(opened).not.toBe('gone');
    expect(opened && opened !== 'gone' ? opened.sharing : null).toEqual({
      visibility: 'published',
      slug: 'pub0000001',
      basedOn: null,
      fixed: true,
    });
  });

  it('reads one never published as not fixed', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(answer({ visibility: 'private', frozenAt: null }));
    const opened = await fetchSavedPattern(ID);
    expect(opened && opened !== 'gone' ? opened.sharing?.fixed : null).toBe(false);
  });

  it('reads an unreadable frozenAt as not fixed, and still opens the pattern', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(answer({ frozenAt: 42 }));
    const opened = await fetchSavedPattern(ID);
    expect(opened && opened !== 'gone' ? opened.sharing?.fixed : null).toBe(false);
  });

  it('answers gone on a 404', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new APIClientError('Not found', 'NOT_FOUND', 404));
    expect(await fetchSavedPattern(ID)).toBe('gone');
  });
});
