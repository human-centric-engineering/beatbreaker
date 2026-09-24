-- BeatBreaker Phase 4, task 4.6: practice shelves (D17).
--
-- A pin is its own row — one of your patterns, someone else's shared one, or a
-- library entry, on the Practising or the Later shelf. It replaces the
-- `Break.pinned` column that was built and taken out before Phase 4 merged, so
-- there is one record of what is pinned.
--
-- TEN STATEMENTS PRISMA GENERATED HAVE BEEN DELETED BY HAND, for the reason
-- given in 20260917215110_breaks_and_takes and 20260923102558_catalogue:
-- Prisma cannot see the objects they attack, so it emits a "repair" on every
-- unrelated migration.
--
--   * six DROP CONSTRAINT against the hand-written FKs to `user`
--     (break_userId_fkey, take_userId_fkey, kit_ownerId_fkey,
--     pattern_library_ownerId_fkey, style_ownerId_fkey,
--     style_version_createdById_fkey) — the FKs that make GDPR erasure reach
--     those rows;
--   * three DROP INDEX against Sunrise's hand-folded vector and full-text
--     indexes;
--   * an ALTER dropping the default on the GENERATED ai_knowledge_chunk
--     ."searchVector" column.
--
-- See .context/database/prisma-unmodelled-objects.md.

-- CreateTable
CREATE TABLE "pin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shelf" VARCHAR(16) NOT NULL,
    "position" INTEGER NOT NULL,
    "breakId" TEXT,
    "libraryEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pin_userId_shelf_position_idx" ON "pin"("userId", "shelf", "position");

-- CreateIndex
CREATE UNIQUE INDEX "pin_userId_breakId_key" ON "pin"("userId", "breakId");

-- CreateIndex
CREATE UNIQUE INDEX "pin_userId_libraryEntryId_key" ON "pin"("userId", "libraryEntryId");

-- AddForeignKey
ALTER TABLE "pin" ADD CONSTRAINT "pin_breakId_fkey" FOREIGN KEY ("breakId") REFERENCES "break"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin" ADD CONSTRAINT "pin_libraryEntryId_fkey" FOREIGN KEY ("libraryEntryId") REFERENCES "library_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- `userId` is a plain scalar in the Prisma schema (a @relation needs a field
-- ON User — CUSTOMIZATION.md §5), so Prisma emits no FK for it. CASCADE: what
-- you pin is personal data and goes when you do.
ALTER TABLE "pin"
  ADD CONSTRAINT "pin_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one target. Both null is a pin on nothing; both set is a pin that
-- the two unique indexes would count twice. Prisma has no syntax for a CHECK.
ALTER TABLE "pin"
  ADD CONSTRAINT "pin_one_target"
  CHECK (num_nonnulls("breakId", "libraryEntryId") = 1);
