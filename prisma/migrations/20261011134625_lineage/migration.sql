-- Phase 11 (D48): the drummer lineage map. System content, seeded by
-- `004-lineage`; no user FK.

-- CreateTable
CREATE TABLE "lineage_node" (
    "id" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "modelled" BOOLEAN NOT NULL DEFAULT false,
    "activeFrom" INTEGER,
    "activeTo" INTEGER,
    "styleKey" VARCHAR(40),
    "genres" TEXT[],
    "tags" TEXT[],
    "summary" TEXT,
    "record" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lineage_node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineage_edge" (
    "id" VARCHAR(40) NOT NULL,
    "fromId" VARCHAR(120) NOT NULL,
    "toId" VARCHAR(120) NOT NULL,
    "relation" VARCHAR(32) NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "directed" BOOLEAN NOT NULL,
    "strength" DOUBLE PRECISION,
    "confidence" VARCHAR(24),
    "scope" VARCHAR(16) NOT NULL,
    "declaredBy" VARCHAR(120) NOT NULL,
    "recordingId" VARCHAR(120),

    CONSTRAINT "lineage_edge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineage_recording" (
    "id" VARCHAR(120) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "artist" VARCHAR(200) NOT NULL,
    "year" INTEGER NOT NULL,
    "drummerIds" TEXT[],
    "record" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lineage_recording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lineage_node_slug_key" ON "lineage_node"("slug");

-- CreateIndex
CREATE INDEX "lineage_node_kind_idx" ON "lineage_node"("kind");

-- CreateIndex
CREATE INDEX "lineage_edge_fromId_idx" ON "lineage_edge"("fromId");

-- CreateIndex
CREATE INDEX "lineage_edge_toId_idx" ON "lineage_edge"("toId");

-- AddForeignKey
ALTER TABLE "lineage_edge" ADD CONSTRAINT "lineage_edge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "lineage_node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineage_edge" ADD CONSTRAINT "lineage_edge_toId_fkey" FOREIGN KEY ("toId") REFERENCES "lineage_node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
