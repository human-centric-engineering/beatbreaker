-- BeatBreaker Phase 4A, task 4A.7: your own samples (D20).
--
-- One row per uploaded one-shot. The audio is in Sunrise storage under
-- `samples/<userId>/`, never here; the row holds what the list and the quota
-- need. Your kits are `kit` rows you own, which already exist.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

-- CreateTable
CREATE TABLE "sample" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slot" VARCHAR(24) NOT NULL,
    "bytes" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "storageKey" VARCHAR(512) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sample_storageKey_key" ON "sample"("storageKey");

-- CreateIndex
CREATE INDEX "sample_userId_idx" ON "sample"("userId");

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- `userId` is a plain scalar in the Prisma schema (a @relation needs a field
-- ON User — CUSTOMIZATION.md §5), so Prisma emits no FK for it. CASCADE: your
-- samples are personal data and go when you do. The files go by the erasure
-- cleanup hook, since no FK reaches storage.
ALTER TABLE "sample"
  ADD CONSTRAINT "sample_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
