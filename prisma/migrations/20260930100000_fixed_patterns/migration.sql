-- BeatBreaker Phase 7A, task 7A.1: a published pattern's notes are fixed
-- (D26). `frozenAt` is set on the first publish and never cleared.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

ALTER TABLE "break" ADD COLUMN "frozenAt" TIMESTAMP(3);

-- Every pattern published before now is fixed from its first publication.
-- `publishedAt` is never cleared, so this also covers one since unpublished.
UPDATE "break" SET "frozenAt" = "publishedAt" WHERE "publishedAt" IS NOT NULL;
