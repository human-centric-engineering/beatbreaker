-- BeatBreaker Phase 7B, task 7B.2: what a drummer says about themselves —
-- purposes, styles, ability, channel links, and which of them are public.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything. See .context/database/prisma-unmodelled-objects.md.

CREATE TABLE "drummer_about" (
    "userId" TEXT NOT NULL,
    "purposes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "styles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ability" VARCHAR(16),
    "styleAbility" JSONB NOT NULL DEFAULT '{}',
    "channels" JSONB NOT NULL DEFAULT '[]',
    "public" JSONB NOT NULL DEFAULT '{}',
    "askedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drummer_about_pkey" PRIMARY KEY ("userId")
);

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- `userId` is a plain scalar in the Prisma schema (a @relation needs a field
-- ON User — CUSTOMIZATION.md §5), so Prisma emits no FK for it. CASCADE: what
-- you said about yourself is personal data and goes when you do.
ALTER TABLE "drummer_about"
  ADD CONSTRAINT "drummer_about_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
