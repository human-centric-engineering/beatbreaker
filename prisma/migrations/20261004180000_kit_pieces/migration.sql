-- BeatBreaker Phase 9-v, task 9.16: pieces. One instrument from one source,
-- and the slots it fills; a kit's slot may name one. Catalogue data with no
-- `User` FK.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

-- CreateTable
CREATE TABLE "kit_piece" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "folder" VARCHAR(40) NOT NULL,
    "slots" JSONB NOT NULL,
    "credit" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kit_piece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kit_piece_key_key" ON "kit_piece"("key");

-- CreateIndex
CREATE INDEX "kit_piece_position_idx" ON "kit_piece"("position");
