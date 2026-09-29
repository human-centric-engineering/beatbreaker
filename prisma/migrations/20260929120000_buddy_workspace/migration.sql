-- BeatBreaker Phase 7, task 7.8: BeatBuddy's workspace.
--
-- One row per person holding the pattern BeatBuddy is working on. The Studio
-- sends its document at the start of every turn; the tools read and write this
-- row, so a second tool call in a turn sees what the first did. `rev` lets a
-- write that lost a race be refused rather than silently applied.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

-- CreateTable
CREATE TABLE "buddy_workspace" (
    "userId" TEXT NOT NULL,
    "doc" JSONB NOT NULL,
    "rev" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buddy_workspace_pkey" PRIMARY KEY ("userId")
);

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- `userId` is a plain scalar in the Prisma schema (a @relation needs a field
-- ON User — CUSTOMIZATION.md §5), so Prisma emits no FK for it. CASCADE: the
-- pattern you had open is personal data and goes when you do.
ALTER TABLE "buddy_workspace"
  ADD CONSTRAINT "buddy_workspace_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
