-- BeatBreaker Phase 7A: an author's variation of their own fixed pattern
-- records it in `ownParentId`, not `parentId`, so it is listed and credited as
-- a variation without counting as a save ("most saved" counts `parentId`).
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

ALTER TABLE "break" ADD COLUMN "ownParentId" TEXT;

CREATE INDEX "break_ownParentId_idx" ON "break"("ownParentId");

ALTER TABLE "break"
  ADD CONSTRAINT "break_ownParentId_fkey"
  FOREIGN KEY ("ownParentId") REFERENCES "break"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
