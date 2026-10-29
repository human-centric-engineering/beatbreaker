/**
 * Core's owner-classification guard sees BeatBreaker's user columns (§115).
 *
 * Ours are mostly hand-written FKs with no `@relation`, some under names core's
 * guard cannot infer — `subjectId`, `reporterId`, `createdById` — so each is
 * marked `/// owner-classification: user-id` in `app.prisma`, which the shared
 * audit (`tests/helpers/owner-classification-audit.ts`) reads. This pins that
 * the marks are there and that an unclassified marked model is named.
 *
 * If you add a user column without that mark, nothing can see it: write it.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  allOwnerClassifications,
  appOwnerClassifications,
  __resetAppOwnerClassificationForTests,
} from '@/lib/db/owner-classification';
import {
  auditOwnerClassification,
  fullSchema,
  parseSchema,
} from '@/tests/helpers/owner-classification-audit';

describe('app owner classification against core’s guard', () => {
  const schema = fullSchema();
  const markedIn = (models: typeof schema, model: string) =>
    [...(models.get(model)?.scalars ?? new Map())]
      .filter(([, scalar]) => scalar.userMarked)
      .map(([name]) => name)
      .sort();
  const marked = (model: string) => markedIn(schema, model);

  beforeEach(() => {
    // the reads below run the REAL seam through the registry's lazy init
    __resetAppOwnerClassificationForTests();
  });

  it('reads the user columns only the mark names', () => {
    expect(marked('DrummerReport')).toEqual(['reporterId', 'resolvedById', 'subjectId']);
    // the comment runs on over two lines before its column
    expect(marked('StyleVersion')).toEqual(['createdById']);
  });

  it('names a marked model that goes unclassified', () => {
    const forkRows = new Set(Object.keys(appOwnerClassifications()));
    const { DrummerReport: _r, StyleVersion: _v, ...rest } = allOwnerClassifications();

    expect(auditOwnerClassification(schema, rest, forkRows)).toEqual([
      'DrummerReport links to a user or to a personal model and is not classified',
      'StyleVersion links to a user or to a personal model and is not classified',
    ]);
  });

  it('marks a column only when the mark is on it', () => {
    const fixture = parseSchema([
      `
model Thing {
  id      String  @id
  /// owner-classification: user-id — no @relation. Nulled on erasure: the
  /// thing outlives whoever made it.
  makerId String?
  /// Not a user.
  label   String
  otherId String
}
`,
    ]);
    expect(markedIn(fixture, 'Thing')).toEqual(['makerId']);
  });

  it('does not carry a mark across a model boundary', () => {
    const fixture = parseSchema([
      `
/// owner-classification: user-id — a stray note above the model, on nothing.
model First {
  id    String @id
  /// owner-classification: user-id — left dangling: the column it was on is gone.
}

model Second {
  otherId String
}
`,
    ]);
    expect(markedIn(fixture, 'First')).toEqual([]);
    expect(markedIn(fixture, 'Second')).toEqual([]);
  });
});
