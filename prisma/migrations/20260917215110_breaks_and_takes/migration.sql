-- BeatBreaker: the Break and Take tables.
--
-- Prisma generated four statements above these that have been deleted by hand:
-- three DROP INDEX against Sunrise's Group-A hand-folded objects
-- (idx_ai_knowledge_chunk_search_vector, idx_knowledge_embedding,
-- idx_message_embedding) and an ALTER dropping the default on the GENERATED
-- ai_knowledge_chunk."searchVector" column. Prisma cannot see any of them, so
-- it computes desired state without them and emits a repair on every unrelated
-- migration. Leaving those in drops the vector and full-text indexes and takes
-- knowledge search down silently — which is what happened when this migration
-- was first applied, and has happened to Sunrise before (see the write-up on
-- 20260529120000_restore_knowledge_embedding_hnsw_index).
--
-- See .context/database/prisma-unmodelled-objects.md.

-- CreateTable
CREATE TABLE "break" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "style" VARCHAR(40) NOT NULL,
    "meter" VARCHAR(8) NOT NULL,
    "bpm" INTEGER NOT NULL,
    "swing" INTEGER NOT NULL DEFAULT 0,
    "seed" BIGINT NOT NULL,
    "bars" INTEGER NOT NULL DEFAULT 2,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "doc" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "break_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "take" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "breakId" TEXT NOT NULL,
    "videoKey" VARCHAR(512) NOT NULL,
    "duration" INTEGER,
    "bpm" INTEGER,
    "layer" INTEGER NOT NULL DEFAULT 5,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "take_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "break_userId_createdAt_idx" ON "break"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "break_shared_createdAt_idx" ON "break"("shared", "createdAt");

-- CreateIndex
CREATE INDEX "take_breakId_createdAt_idx" ON "take"("breakId", "createdAt");

-- CreateIndex
CREATE INDEX "take_userId_createdAt_idx" ON "take"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "take" ADD CONSTRAINT "take_breakId_fkey" FOREIGN KEY ("breakId") REFERENCES "break"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written FKs to User, per CUSTOMIZATION.md §5.
--
-- Break.userId and Take.userId are plain scalars in the Prisma schema, because
-- a @relation would need a back-reference field ON the User model and editing
-- that is the fork-and-edit trap. Prisma therefore emits no FK for them, and
-- without one `prisma.user.delete()` either orphans these rows (a silent GDPR
-- retention violation) or throws P2003 and breaks erasure for every user.
--
-- ON DELETE CASCADE: a break and a take are the person's own data, not
-- retained config. Both are also Prisma-unmodelled objects, so a future
-- `migrate dev` will try to DROP them — `lib/app/db-drift.ts` registers a probe
-- per constraint that asserts the name AND the ON DELETE action, so CI fails
-- rather than the cascade quietly disappearing.
-- ---------------------------------------------------------------------------

ALTER TABLE "break"
  ADD CONSTRAINT "break_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "take"
  ADD CONSTRAINT "take_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
