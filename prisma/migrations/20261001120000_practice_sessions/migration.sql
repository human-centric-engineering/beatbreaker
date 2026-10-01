-- BeatBreaker Phase 7D, task 7D.2: practice sessions — a timed run through
-- patterns, each climbing to its target tempo and holding it; the patterns in
-- each; and a log of each run.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

-- CreateTable
CREATE TABLE "practice_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500),
    "totalMinutes" INTEGER NOT NULL,
    "startPct" INTEGER NOT NULL DEFAULT 20,
    "climbPct" INTEGER NOT NULL DEFAULT 67,
    "climbShape" VARCHAR(16) NOT NULL DEFAULT 'steady',
    "climbSteps" INTEGER NOT NULL DEFAULT 4,
    "countIn" INTEGER NOT NULL DEFAULT 1,
    "visibility" VARCHAR(16) NOT NULL DEFAULT 'private',
    "slug" VARCHAR(16),
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

CONSTRAINT "practice_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_session_item" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "breakId" TEXT,
    "libraryEntryId" TEXT,
    "titleSnapshot" VARCHAR(160) NOT NULL,
    "level" INTEGER NOT NULL,
    "goalBpm" INTEGER,
    "minutes" INTEGER NOT NULL,
    "minutesPinned" BOOLEAN NOT NULL DEFAULT false,
    "startPct" INTEGER,
    "climbPct" INTEGER,
    "climbShape" VARCHAR(16),
    "climbSteps" INTEGER,

CONSTRAINT "practice_session_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "sessionName" VARCHAR(80) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "items" JSONB NOT NULL,

CONSTRAINT "practice_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practice_session_slug_key" ON "practice_session"("slug");

-- CreateIndex
CREATE INDEX "practice_session_userId_updatedAt_idx" ON "practice_session"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "practice_session_parentId_idx" ON "practice_session"("parentId");

-- CreateIndex
CREATE INDEX "practice_session_item_breakId_idx" ON "practice_session_item"("breakId");

-- CreateIndex
CREATE INDEX "practice_session_item_libraryEntryId_idx" ON "practice_session_item"("libraryEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "practice_session_item_sessionId_position_key" ON "practice_session_item"("sessionId", "position");

-- CreateIndex
CREATE INDEX "practice_run_userId_endedAt_idx" ON "practice_run"("userId", "endedAt");

-- CreateIndex
CREATE INDEX "practice_run_sessionId_endedAt_idx" ON "practice_run"("sessionId", "endedAt");

-- AddForeignKey
ALTER TABLE "practice_session" ADD CONSTRAINT "practice_session_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "practice_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_session_item" ADD CONSTRAINT "practice_session_item_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "practice_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- SET NULL, not CASCADE: another drummer deleting their pattern must not
-- take it out of your session. `titleSnapshot` keeps what it was called.
ALTER TABLE "practice_session_item" ADD CONSTRAINT "practice_session_item_breakId_fkey" FOREIGN KEY ("breakId") REFERENCES "break"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_session_item" ADD CONSTRAINT "practice_session_item_libraryEntryId_fkey" FOREIGN KEY ("libraryEntryId") REFERENCES "library_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_run" ADD CONSTRAINT "practice_run_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "practice_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- `userId` is a plain scalar in the Prisma schema (a @relation needs a field
-- ON User — CUSTOMIZATION.md §5), so Prisma emits no FK for it. CASCADE: your
-- sessions are personal data and go when you do, and their items with them.
-- Someone else's copy of one keeps going, with `parentId` nulled.
ALTER TABLE "practice_session"
  ADD CONSTRAINT "practice_session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- The same for your runs.
ALTER TABLE "practice_run"
  ADD CONSTRAINT "practice_run_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- At most one target, as on "speed_record_one_target": both targets are SET
-- NULL, so an item whose pattern was deleted points at nothing and keeps its
-- title.
ALTER TABLE "practice_session_item"
  ADD CONSTRAINT "practice_session_item_one_target"
  CHECK (num_nonnulls("breakId", "libraryEntryId") <= 1);
