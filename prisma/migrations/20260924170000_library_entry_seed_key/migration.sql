-- BeatBreaker Phase 4, task 4.6 follow-up: a stable identity for seeded
-- library entries.
--
-- The catalogue seed upserted entries by (libraryId, position). That was
-- harmless while nothing held an entry's id; a Pin does. Keyed by slot,
-- inserting a famous break mid-list gave every later row — and every pin on it
-- — a different break. The seed now upserts by `seedKey`, a slug of the title
-- in the data file.
--
-- Written by hand rather than by `migrate dev`, which (a) asks interactively
-- before adding a unique index and (b) would emit the ten "repair" statements
-- described in 20260924130455_practice_shelves. Nothing here drops anything.

ALTER TABLE "library_entry" ADD COLUMN "seedKey" VARCHAR(80);

-- Backfill every existing row with the key the seed will compute for it —
-- the same slug as `seedKeyOf` in prisma/seeds/app-beatbreaker/001-catalogue.ts
-- (lower-case; each run of anything but a-z0-9 becomes one '-'; no '-' at
-- either end), so the next seed run matches these rows instead of replacing
-- them and cascading away their pins.
UPDATE "library_entry"
SET "seedKey" = left(trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g')), 80);

-- CreateIndex
CREATE UNIQUE INDEX "library_entry_libraryId_seedKey_key" ON "library_entry"("libraryId", "seedKey");
