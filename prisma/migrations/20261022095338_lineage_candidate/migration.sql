-- 15-a (D74): a researched drummer who is not built yet. The rest of what
-- migrate dev generated (drops of hand-written FKs and indexes) is removed.
ALTER TABLE "lineage_node" ADD COLUMN "candidate" BOOLEAN NOT NULL DEFAULT false;
