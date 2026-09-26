-- BeatBreaker Phase 4A, task 4A.1: your Studio settings (D19).
--
-- How you play — the kit and its tuning, the count-in, the generator's dials,
-- the starting values for a new pattern — in one row per person, so another
-- device brings them. `prefs` is held to studioSettingsSchema by the API.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

-- CreateTable
CREATE TABLE "studio_settings" (
    "userId" TEXT NOT NULL,
    "prefs" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_settings_pkey" PRIMARY KEY ("userId")
);

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- `userId` is a plain scalar in the Prisma schema (a @relation needs a field
-- ON User — CUSTOMIZATION.md §5), so Prisma emits no FK for it. CASCADE: how
-- you like to play is personal data and goes when you do.
ALTER TABLE "studio_settings"
  ADD CONSTRAINT "studio_settings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
