-- BeatBreaker Phase 7C, task 7C.2: speed records — the fastest tempo you can
-- play a pattern well, at a layer, and when you said so.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

-- CreateTable
CREATE TABLE "speed_record" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "breakId" TEXT,
    "libraryEntryId" TEXT,
    "titleSnapshot" VARCHAR(160) NOT NULL,
    "level" INTEGER NOT NULL,
    "bpm" INTEGER NOT NULL,
    "gridHash" VARCHAR(64) NOT NULL,
    "videoUrl" VARCHAR(300),
    "note" VARCHAR(280),
    "listed" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speed_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "speed_record_userId_recordedAt_idx" ON "speed_record"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "speed_record_breakId_level_listed_idx" ON "speed_record"("breakId", "level", "listed");

-- CreateIndex
CREATE INDEX "speed_record_libraryEntryId_level_listed_idx" ON "speed_record"("libraryEntryId", "level", "listed");

-- AddForeignKey
-- SET NULL, not CASCADE: another drummer deleting their pattern must not
-- erase your history. `titleSnapshot` keeps what it was called.
ALTER TABLE "speed_record" ADD CONSTRAINT "speed_record_breakId_fkey" FOREIGN KEY ("breakId") REFERENCES "break"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speed_record" ADD CONSTRAINT "speed_record_libraryEntryId_fkey" FOREIGN KEY ("libraryEntryId") REFERENCES "library_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- `userId` is a plain scalar in the Prisma schema (a @relation needs a field
-- ON User — CUSTOMIZATION.md §5), so Prisma emits no FK for it. CASCADE: your
-- speeds are personal data and go when you do, and with them your rows on
-- every table.
ALTER TABLE "speed_record"
  ADD CONSTRAINT "speed_record_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- At most one target. Not exactly one, as on "pin_one_target": both targets
-- are SET NULL, so a record whose pattern was deleted points at nothing and
-- is still yours.
ALTER TABLE "speed_record"
  ADD CONSTRAINT "speed_record_one_target"
  CHECK (num_nonnulls("breakId", "libraryEntryId") <= 1);
