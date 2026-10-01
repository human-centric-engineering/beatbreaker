-- BeatBreaker Phase 7C, task 7C.5: reports that a listed speed does not look
-- right, and what moderation did about them — drummer_report's twin for
-- speed records.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves. Nothing here drops anything. See
-- .context/database/prisma-unmodelled-objects.md.

-- CreateTable
CREATE TABLE "speed_report" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reason" VARCHAR(24) NOT NULL,
    "note" VARCHAR(500),
    "status" VARCHAR(16) NOT NULL DEFAULT 'open',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speed_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "speed_report_status_createdAt_idx" ON "speed_report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "speed_report_recordId_status_idx" ON "speed_report"("recordId", "status");

-- CreateIndex
CREATE INDEX "speed_report_reporterId_createdAt_idx" ON "speed_report"("reporterId", "createdAt");

-- AddForeignKey
-- CASCADE: a report on a record that was deleted is a report on nothing.
ALTER TABLE "speed_report" ADD CONSTRAINT "speed_report_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "speed_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- SET NULL for the reporter and the admin: the report is the moderation
-- record about a speed, and it outlives the person who filed it and the admin
-- who resolved it.
ALTER TABLE "speed_report"
  ADD CONSTRAINT "speed_report_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "speed_report"
  ADD CONSTRAINT "speed_report_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
