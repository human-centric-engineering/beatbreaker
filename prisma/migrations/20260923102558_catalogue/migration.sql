-- BeatBreaker Phase 2: the catalogue.
--
-- Style / StyleVersion, PatternLibrary / LibraryEntry, Kit, and Break's link to
-- the style version that produced it.
--
-- SIX STATEMENTS PRISMA GENERATED HAVE BEEN DELETED BY HAND, as they were in
-- 20260917215110_breaks_and_takes and for the same reason: Prisma cannot see
-- the objects they attack, so it computes desired state without them and emits
-- a repair on every unrelated migration.
--
--   * two DROP CONSTRAINT against break_userId_fkey and take_userId_fkey — the
--     hand-written FKs to `user` that make GDPR erasure reach those rows;
--   * three DROP INDEX against Sunrise's hand-folded vector and full-text
--     indexes (idx_ai_knowledge_chunk_search_vector, idx_knowledge_embedding,
--     idx_message_embedding);
--   * an ALTER dropping the default on the GENERATED ai_knowledge_chunk
--     ."searchVector" column.
--
-- Leaving them in takes knowledge search down silently, which is what happened
-- the first time that earlier migration was applied.
--
-- See .context/database/prisma-unmodelled-objects.md.

-- AlterTable
ALTER TABLE "break" ADD COLUMN     "styleVersionId" TEXT;

-- CreateTable
CREATE TABLE "style" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "ownerId" TEXT,
    "label" VARCHAR(80) NOT NULL,
    "group" VARCHAR(60) NOT NULL,
    "hint" TEXT NOT NULL,
    "meter" VARCHAR(8) NOT NULL DEFAULT '4/4',
    "visibility" VARCHAR(16) NOT NULL DEFAULT 'system',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "style_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "style_version" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "params" JSONB NOT NULL,
    "note" VARCHAR(200) NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "style_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pattern_library" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "ownerId" TEXT,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "visibility" VARCHAR(16) NOT NULL DEFAULT 'system',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pattern_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_entry" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "group" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "artist" VARCHAR(200) NOT NULL,
    "note" TEXT,
    "bpm" INTEGER NOT NULL,
    "styleKey" VARCHAR(40) NOT NULL,
    "styleVersionId" TEXT,
    "meter" VARCHAR(8) NOT NULL,
    "doc" JSONB NOT NULL,
    "links" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "ownerId" TEXT,
    "engine" VARCHAR(16) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "hint" TEXT NOT NULL,
    "group" VARCHAR(60) NOT NULL,
    "params" JSONB NOT NULL,
    "samples" JSONB NOT NULL DEFAULT '{}',
    "credit" TEXT,
    "visibility" VARCHAR(16) NOT NULL DEFAULT 'system',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "style_visibility_group_position_idx" ON "style"("visibility", "group", "position");

-- CreateIndex
CREATE UNIQUE INDEX "style_ownerId_key_key" ON "style"("ownerId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "style_version_styleId_version_key" ON "style_version"("styleId", "version");

-- CreateIndex
CREATE INDEX "pattern_library_visibility_position_idx" ON "pattern_library"("visibility", "position");

-- CreateIndex
CREATE UNIQUE INDEX "pattern_library_ownerId_key_key" ON "pattern_library"("ownerId", "key");

-- CreateIndex
CREATE INDEX "library_entry_libraryId_group_position_idx" ON "library_entry"("libraryId", "group", "position");

-- CreateIndex
CREATE INDEX "library_entry_styleKey_idx" ON "library_entry"("styleKey");

-- CreateIndex
CREATE UNIQUE INDEX "library_entry_libraryId_position_key" ON "library_entry"("libraryId", "position");

-- CreateIndex
CREATE INDEX "kit_visibility_position_idx" ON "kit"("visibility", "position");

-- CreateIndex
CREATE UNIQUE INDEX "kit_ownerId_key_key" ON "kit"("ownerId", "key");

-- AddForeignKey
ALTER TABLE "break" ADD CONSTRAINT "break_styleVersionId_fkey" FOREIGN KEY ("styleVersionId") REFERENCES "style_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "style_version" ADD CONSTRAINT "style_version_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "style"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_entry" ADD CONSTRAINT "library_entry_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "pattern_library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_entry" ADD CONSTRAINT "library_entry_styleVersionId_fkey" FOREIGN KEY ("styleVersionId") REFERENCES "style_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Partial unique indexes on the system rows.
--
-- `@@unique([ownerId, key])` does NOT stop two system styles sharing a key:
-- Postgres treats NULLs as distinct, so ('funk', NULL) and ('funk', NULL) both
-- fit. That matters because the seed upserts by key and a duplicate would make
-- `getStyle('funk')` non-deterministic — two rows, one arbitrary winner, and a
-- generator that quietly writes a different break depending on which it got.
--
-- Prisma has no syntax for a partial index, so these are unmodelled objects
-- like the FKs below, and `lib/app/db-drift.ts` probes each one.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX "style_system_key_key" ON "style"("key") WHERE "ownerId" IS NULL;
CREATE UNIQUE INDEX "pattern_library_system_key_key" ON "pattern_library"("key") WHERE "ownerId" IS NULL;
CREATE UNIQUE INDEX "kit_system_key_key" ON "kit"("key") WHERE "ownerId" IS NULL;

-- ---------------------------------------------------------------------------
-- Hand-written FKs to User, per CUSTOMIZATION.md §5.
--
-- `ownerId` and `createdById` are plain scalars in the Prisma schema, because a
-- @relation needs a back-reference field ON the User model and editing that is
-- the fork-and-edit trap. Prisma therefore emits no FK for them.
--
-- ON DELETE CASCADE for `ownerId`: a style, library or kit someone authored is
-- their own data and goes when they do. No row has an owner yet — everything
-- the seed writes is a system row with ownerId NULL — but the constraint is
-- written now so that the first user-authored row is covered by erasure on the
-- day it is written rather than on the day somebody remembers.
--
-- ON DELETE SET NULL for style_version.createdById: the version outlives its
-- author on purpose. Patterns other people made point at it and carry its id as
-- provenance; cascading would delete a row that is not only about the person
-- being erased. What is erased is the link to them, which is the personal data.
-- ---------------------------------------------------------------------------

ALTER TABLE "style"
  ADD CONSTRAINT "style_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pattern_library"
  ADD CONSTRAINT "pattern_library_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kit"
  ADD CONSTRAINT "kit_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "style_version"
  ADD CONSTRAINT "style_version_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
