-- Phase 12-b: a drummer's rhythmic devices, sourced, for the map's filter and BeatBuddy.
-- AlterTable
ALTER TABLE "lineage_node" ADD COLUMN "devices" JSONB NOT NULL DEFAULT '[]';
