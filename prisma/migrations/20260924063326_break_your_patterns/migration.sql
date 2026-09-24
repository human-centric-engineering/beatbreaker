-- BeatBreaker Phase 4: your patterns.
--
-- Break gains its practice layer as a column, a description and reference
-- links. What is pinned and what was recently opened are not columns here:
-- they are per-user rows (Pin, PracticeVisit — D17, D18), because a famous
-- break from the library can be pinned and opened too, and it has no owner.
--
-- TEN STATEMENTS PRISMA GENERATED HAVE BEEN DELETED BY HAND, for the reason
-- given in 20260917215110_breaks_and_takes and 20260923102558_catalogue:
-- Prisma cannot see the objects they attack, so it emits a "repair" on every
-- unrelated migration.
--
--   * six DROP CONSTRAINT against the hand-written FKs to `user`
--     (break_userId_fkey, take_userId_fkey, kit_ownerId_fkey,
--     pattern_library_ownerId_fkey, style_ownerId_fkey,
--     style_version_createdById_fkey) — the FKs that make GDPR erasure reach
--     those rows;
--   * three DROP INDEX against Sunrise's hand-folded vector and full-text
--     indexes;
--   * an ALTER dropping the default on the GENERATED ai_knowledge_chunk
--     ."searchVector" column.
--
-- See .context/database/prisma-unmodelled-objects.md.

-- AlterTable
ALTER TABLE "break" ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "links" JSONB NOT NULL DEFAULT '[]';

-- `level` is derived from the document, as `bpm` and `swing` are, and by the
-- same rule `breakDocFromPayload` applies: a version-1 document numbered its
-- layers before L2->L3 was split, so its 3 is today's 4 and its 4 is today's 5
-- (LAYER_V1_TO_V2). A document without `lv` keeps the default, 5.
UPDATE "break"
SET "level" = CASE
    WHEN ("doc"->>'ver')::int >= 2 THEN ("doc"->>'lv')::int
    ELSE CASE ("doc"->>'lv')::int WHEN 3 THEN 4 WHEN 4 THEN 5 ELSE ("doc"->>'lv')::int END
  END
WHERE "doc" ? 'lv' AND ("doc"->>'lv') ~ '^[1-5]$' AND ("doc"->>'ver') ~ '^[0-9]+$';

