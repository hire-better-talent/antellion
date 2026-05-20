-- CreateEnum
CREATE TYPE "SurfaceCategory" AS ENUM ('CAREERS_SITE', 'COMPANY_NEWSROOM_BLOG', 'FUNCTIONAL_TEAM_CONTENT', 'LEADERSHIP_SOCIAL_CONTENT', 'GLASSDOOR', 'GENERALIST_PEER_REVIEW', 'SECTOR_SPECIFIC_PEER_REVIEW', 'COMPENSATION_SPECIALIST_PLATFORMS', 'PERSONA_SPECIFIC_COMMUNITY_PLATFORMS', 'REDDIT_GENERAL_PROFESSIONAL_FORUMS', 'INDEPENDENT_VOICE_CONTENT', 'TRADE_AND_BUSINESS_PRESS', 'REFERENCE_SITE_UNMAPPED', 'NEEDS_CLASSIFICATION');

-- AlterEnum
ALTER TYPE "FindingCategory" ADD VALUE 'AUTHORITY_DEFICIT';

-- CreateTable
CREATE TABLE "authority_surface_scores" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "surfaceCategory" "SurfaceCategory" NOT NULL,
    "rubricVersion" VARCHAR(32) NOT NULL,
    "densityScore" INTEGER NOT NULL,
    "voiceScore" INTEGER NOT NULL,
    "recencyScore" INTEGER NOT NULL,
    "combined" INTEGER NOT NULL,
    "densityWeightedCount" DOUBLE PRECISION NOT NULL,
    "distinctVoiceCount" INTEGER NOT NULL,
    "monthsSinceMostRecent" DOUBLE PRECISION,
    "voiceAudit" JSONB NOT NULL,
    "analystNotes" TEXT,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authority_surface_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authority_peer_snapshots" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "surfaceCategory" "SurfaceCategory" NOT NULL,
    "rubricVersion" VARCHAR(32) NOT NULL,
    "peerName" VARCHAR(255) NOT NULL,
    "peerDomain" VARCHAR(255) NOT NULL,
    "combined" INTEGER NOT NULL,
    "densityScore" INTEGER NOT NULL,
    "voiceScore" INTEGER NOT NULL,
    "recencyScore" INTEGER NOT NULL,
    "densityWeightedCount" DOUBLE PRECISION NOT NULL,
    "distinctVoiceCount" INTEGER NOT NULL,
    "monthsSinceMostRecent" DOUBLE PRECISION,
    "voiceAudit" JSONB NOT NULL,
    "analystNotes" TEXT,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authority_peer_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "authority_surface_scores_engagementId_idx" ON "authority_surface_scores"("engagementId");

-- CreateIndex
CREATE INDEX "authority_surface_scores_surfaceCategory_idx" ON "authority_surface_scores"("surfaceCategory");

-- CreateIndex
CREATE INDEX "authority_surface_scores_scoredAt_idx" ON "authority_surface_scores"("scoredAt");

-- CreateIndex
CREATE UNIQUE INDEX "authority_surface_scores_engagementId_surfaceCategory_rubri_key" ON "authority_surface_scores"("engagementId", "surfaceCategory", "rubricVersion");

-- CreateIndex
CREATE INDEX "authority_peer_snapshots_engagementId_idx" ON "authority_peer_snapshots"("engagementId");

-- CreateIndex
CREATE INDEX "authority_peer_snapshots_surfaceCategory_idx" ON "authority_peer_snapshots"("surfaceCategory");

-- CreateIndex
CREATE INDEX "authority_peer_snapshots_peerDomain_idx" ON "authority_peer_snapshots"("peerDomain");

-- CreateIndex
CREATE UNIQUE INDEX "authority_peer_snapshots_engagementId_peerDomain_surfaceCat_key" ON "authority_peer_snapshots"("engagementId", "peerDomain", "surfaceCategory", "rubricVersion");

-- AddForeignKey
ALTER TABLE "authority_surface_scores" ADD CONSTRAINT "authority_surface_scores_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_peer_snapshots" ADD CONSTRAINT "authority_peer_snapshots_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
