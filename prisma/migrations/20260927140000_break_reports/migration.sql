-- BeatBreaker Phase 6-iii, task 6.10: reports on shared and published
-- patterns, and what moderation did about them.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

CREATE TABLE "break_report" (
    "id" TEXT NOT NULL,
    "breakId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reason" VARCHAR(24) NOT NULL,
    "note" VARCHAR(500),
    "status" VARCHAR(16) NOT NULL DEFAULT 'open',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "break_report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "break_report_status_createdAt_idx" ON "break_report"("status", "createdAt");
CREATE INDEX "break_report_breakId_status_idx" ON "break_report"("breakId", "status");
CREATE INDEX "break_report_reporterId_createdAt_idx" ON "break_report"("reporterId", "createdAt");

-- A Prisma relation, so Prisma models this one. CASCADE: a report on a
-- pattern that was deleted is a report on nothing.
ALTER TABLE "break_report"
  ADD CONSTRAINT "break_report_breakId_fkey"
  FOREIGN KEY ("breakId") REFERENCES "break"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- Both user references are plain scalars in the Prisma schema (a @relation
-- needs a field ON User — CUSTOMIZATION.md §5). SET NULL, not CASCADE: the
-- report is the moderation record about a pattern, and it outlives the person
-- who filed it and the admin who resolved it.
ALTER TABLE "break_report"
  ADD CONSTRAINT "break_report_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "break_report"
  ADD CONSTRAINT "break_report_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
