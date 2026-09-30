-- BeatBreaker Phase 7B, task 7B.5: reports on drummers' public profiles, and
-- what moderation did about them — break_report's twin for profiles.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

CREATE TABLE "drummer_report" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reason" VARCHAR(24) NOT NULL,
    "note" VARCHAR(500),
    "status" VARCHAR(16) NOT NULL DEFAULT 'open',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drummer_report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "drummer_report_status_createdAt_idx" ON "drummer_report"("status", "createdAt");
CREATE INDEX "drummer_report_subjectId_status_idx" ON "drummer_report"("subjectId", "status");
CREATE INDEX "drummer_report_reporterId_createdAt_idx" ON "drummer_report"("reporterId", "createdAt");

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- All three user references are plain scalars in the Prisma schema (a
-- @relation needs a field ON User — CUSTOMIZATION.md §5).
--
-- CASCADE for the subject: a report about a profile whose owner was erased is
-- a report about nothing.
ALTER TABLE "drummer_report"
  ADD CONSTRAINT "drummer_report_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- SET NULL for the reporter and the admin: the report is the moderation record
-- about a profile, and it outlives the person who filed it and the admin who
-- resolved it.
ALTER TABLE "drummer_report"
  ADD CONSTRAINT "drummer_report_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "drummer_report"
  ADD CONSTRAINT "drummer_report_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
