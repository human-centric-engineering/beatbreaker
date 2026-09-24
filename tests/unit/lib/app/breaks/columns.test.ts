/**
 * The `Break` columns read off a document rather than the request.
 *
 * Every write path goes through this — create, bulk create and a PATCH that
 * replaces the document — so what it derives is what the list shows and
 * filters on. The case worth pinning is the one the earlier PATCH got wrong:
 * the style version travels with the document, not just the style key.
 *
 * @see lib/app/breaks/columns.ts
 */

import { describe, expect, it } from 'vitest';

import { columnsFromDoc } from '@/lib/app/breaks/columns';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { type SharePayload } from '@/lib/app/breaks/schema';
import { breakPayload } from '@/lib/app/breaks/share';
import { testStyle } from '@/tests/helpers/catalogue';

function payload(overrides: Partial<SharePayload> = {}): SharePayload {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '7/8',
    seed: 42,
    bars: 3,
    density: 50,
    ghosts: 50,
  });
  return {
    ...breakPayload({
      bpm: 103.6,
      swing: 12.4,
      level: 3,
      arrangement: ['A', 'B'],
      A,
      B: deriveB(A, funk.params),
    }),
    ...overrides,
  };
}

describe('columnsFromDoc', () => {
  it('derives every list column from the document, rounding what the list shows whole', () => {
    const { columns } = columnsFromDoc(payload());
    expect(columns).toEqual({
      style: 'funk',
      styleVersionId: testStyle('funk').versionId,
      meter: '7/8',
      bpm: 104,
      swing: 12,
      seed: 42n,
      bars: 3,
      level: 3,
    });
  });

  it('reads the level a version-1 document meant, not the number it wrote', () => {
    // v1 numbered its layers before L2→L3 was split: its 3 is today's 4
    expect(columnsFromDoc(payload({ ver: 1, lv: 3 })).columns.level).toBe(4);
    expect(columnsFromDoc(payload({ ver: 1, lv: 4 })).columns.level).toBe(5);
  });

  it('takes the full break, layer 5, for a document that names no layer', () => {
    expect(columnsFromDoc(payload({ lv: undefined })).columns.level).toBe(5);
  });

  it('has no style version for a v3-style document that carries none', () => {
    const p = payload();
    const { sv: _sv, ...A } = p.A;
    expect(columnsFromDoc({ ...p, A }).columns.styleVersionId).toBeNull();
  });

  it('hands back the decoded break it derived them from', () => {
    const { decoded, columns } = columnsFromDoc(payload());
    expect(decoded.A.bars).toHaveLength(columns.bars);
    expect(decoded.level).toBe(columns.level);
  });
});
