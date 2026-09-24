-- BeatBreaker Phase 4, task 4.7: practice history (D18).
--
-- What you opened, one row per pattern or library entry, with the layer and
-- tempo you left it at. It replaces the `Break.lastOpenedAt` column that was
-- built and taken out before Phase 4 merged, so there is one record of what
-- was opened.
--
-- Written by hand rather than by `migrate dev`, which would emit the ten
-- "repair" statements described in 20260924130455_practice_shelves — six
-- DROP CONSTRAINT against the hand-written FKs to `user`, three DROP INDEX
-- against Sunrise's hand-folded vector and full-text indexes, and an ALTER on
-- the GENERATED ai_knowledge_chunk."searchVector" column. Nothing here drops
-- anything. See .context/database/prisma-unmodelled-objects.md.

-- CreateTable
CREATE TABLE "practice_visit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "breakId" TEXT,
    "libraryEntryId" TEXT,
    "level" INTEGER NOT NULL,
    "bpm" INTEGER NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_visit_userId_visitedAt_idx" ON "practice_visit"("userId", "visitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "practice_visit_userId_breakId_key" ON "practice_visit"("userId", "breakId");

-- CreateIndex
CREATE UNIQUE INDEX "practice_visit_userId_libraryEntryId_key" ON "practice_visit"("userId", "libraryEntryId");

-- AddForeignKey
ALTER TABLE "practice_visit" ADD CONSTRAINT "practice_visit_breakId_fkey" FOREIGN KEY ("breakId") REFERENCES "break"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_visit" ADD CONSTRAINT "practice_visit_libraryEntryId_fkey" FOREIGN KEY ("libraryEntryId") REFERENCES "library_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- `userId` is a plain scalar in the Prisma schema (a @relation needs a field
-- ON User — CUSTOMIZATION.md §5), so Prisma emits no FK for it. CASCADE: what
-- you practised is personal data and goes when you do.
ALTER TABLE "practice_visit"
  ADD CONSTRAINT "practice_visit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one target, for the reason given on "pin_one_target".
ALTER TABLE "practice_visit"
  ADD CONSTRAINT "practice_visit_one_target"
  CHECK (num_nonnulls("breakId", "libraryEntryId") = 1);
