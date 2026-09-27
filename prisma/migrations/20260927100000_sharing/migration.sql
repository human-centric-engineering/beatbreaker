-- BeatBreaker Phase 6-i, tasks 6.1 and 6.2: who can open a pattern, and the
-- name public work appears under.
--
-- Written by hand rather than by `migrate dev`, for the reason given in
-- 20260924130455_practice_shelves: a generated migration would also drop the
-- hand-written FKs to `user` and Sunrise's hand-folded indexes. Nothing here
-- drops anything but the `shared` column and its index, which `visibility`
-- replaces. See .context/database/prisma-unmodelled-objects.md.

-- ---------------------------------------------------------------------------
-- 6.1 — visibility replaces `shared`
-- ---------------------------------------------------------------------------

ALTER TABLE "break"
  ADD COLUMN "visibility" VARCHAR(16) NOT NULL DEFAULT 'private',
  ADD COLUMN "slug" VARCHAR(16),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "gridHash" VARCHAR(64),
  ADD COLUMN "difficulty" INTEGER;

-- A shared row was readable by anyone with its id: it becomes a link share,
-- with the slug a link share needs. Ten hex characters of md5 over a random
-- value and the id — the same length the app mints, and as unguessable for
-- the handful of rows this touches. The app's own slugs are base32.
UPDATE "break"
  SET "visibility" = 'link',
      "slug" = substr(md5(random()::text || "id"), 1, 10)
  WHERE "shared" = true;

DROP INDEX "break_shared_createdAt_idx";
ALTER TABLE "break" DROP COLUMN "shared";

CREATE UNIQUE INDEX "break_slug_key" ON "break"("slug");
CREATE INDEX "break_visibility_publishedAt_idx" ON "break"("visibility", "publishedAt");
CREATE INDEX "break_visibility_style_meter_idx" ON "break"("visibility", "style", "meter");
CREATE INDEX "break_parentId_idx" ON "break"("parentId");

-- A Prisma self-relation, so Prisma models this one. SET NULL: a copy is its
-- new owner's, and outlives the pattern it came from.
ALTER TABLE "break"
  ADD CONSTRAINT "break_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "break"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 6.2 — the drummer profile, and usernames held after a change
-- ---------------------------------------------------------------------------

CREATE TABLE "drummer_profile" (
    "userId" TEXT NOT NULL,
    "username" VARCHAR(24) NOT NULL,
    "bio" VARCHAR(280),
    "usernameChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drummer_profile_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "drummer_profile_username_key" ON "drummer_profile"("username");

CREATE TABLE "reserved_username" (
    "username" VARCHAR(24) NOT NULL,
    "heldUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reserved_username_pkey" PRIMARY KEY ("username")
);

-- ---------------------------------------------------------------------------
-- Unmodelled objects, each probed by lib/app/db-drift.ts.
-- ---------------------------------------------------------------------------

-- `userId` is a plain scalar in the Prisma schema (a @relation needs a field
-- ON User — CUSTOMIZATION.md §5), so Prisma emits no FK for it. CASCADE: the
-- profile is personal data and goes when you do.
ALTER TABLE "drummer_profile"
  ADD CONSTRAINT "drummer_profile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
