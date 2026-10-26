/**
 * Core's owner-classification guard sees BeatBreaker's user columns (§115).
 *
 * The guard (`tests/unit/lib/db/owner-classification.test.ts`) spots a user
 * link by a `User` relation or by core's own column names (`userId`,
 * `ownerId`, `createdBy`, …). Ours are mostly hand-written FKs with no
 * `@relation`, some under names it does not know — `subjectId`, `reporterId`,
 * `createdById` — so `DrummerReport` and `StyleVersion` went unclassified past
 * it, and classifying them was refused as a stale row. What every one carries
 * is the schema's `/// FK to User.id` doc comment, which the shared audit
 * (`tests/helpers/owner-classification-audit.ts`) now reads; this pins that it
 * does.
 *
 * If you add a user column without that comment, nothing can see it: write the
 * comment.
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

  beforeEach(() => {
    // the reads below run the REAL seam through the registry's lazy init
    __resetAppOwnerClassificationForTests();
  });

  it('reads the user columns only the doc comment marks', () => {
    expect([...(schema.get('DrummerReport')?.userMarked ?? [])].sort()).toEqual([
      'reporterId',
      'resolvedById',
      'subjectId',
    ]);
    // the comment runs on over two lines before its column
    expect([...(schema.get('StyleVersion')?.userMarked ?? [])]).toEqual(['createdById']);
  });

  it('names a marked model that goes unclassified', () => {
    const forkRows = new Set(Object.keys(appOwnerClassifications()));
    const { DrummerReport: _r, StyleVersion: _v, ...rest } = allOwnerClassifications();

    expect(auditOwnerClassification(schema, rest, forkRows)).toEqual([
      'DrummerReport links to a user or to a personal model and is not classified',
      'StyleVersion links to a user or to a personal model and is not classified',
    ]);
  });

  it('marks a column only when the comment is on it', () => {
    const fixture = parseSchema([
      `
model Thing {
  id      String  @id
  /// FK to User.id — no @relation. Nulled on erasure: the thing outlives
  /// whoever made it.
  makerId String?
  /// Not a user.
  label   String
  otherId String
}
`,
    ]);
    expect([...(fixture.get('Thing')?.userMarked ?? [])]).toEqual(['makerId']);
  });
});
