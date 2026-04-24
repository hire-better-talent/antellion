-- CreateEnum
CREATE TYPE "PersonaArchetype" AS ENUM ('EARLY_CAREER', 'MID_CAREER_IC', 'SENIOR_IC', 'MANAGER', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "EngagementTier" AS ENUM ('DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('SCOPING', 'SCANNING', 'REVIEW', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FindingCategory" AS ENUM ('ZERO_PRESENCE', 'COMPETITOR_DOMINANCE', 'SENTIMENT_DIVERGENCE', 'CITATION_MONOCULTURE', 'PERSONA_INVISIBILITY', 'NARRATIVE_INCONSISTENCY', 'ZERO_CITATION', 'CONTENT_GAP', 'COMPETITIVE_POSITIONING', 'EMPLOYER_BRAND', 'OTHER');

-- AlterEnum
ALTER TYPE "LLMProvider" ADD VALUE 'PERPLEXITY';

-- DropIndex
DROP INDEX "scan_results_scanRunId_queryId_key";

-- AlterTable
ALTER TABLE "scan_results" ADD COLUMN     "modelName" VARCHAR(100),
ADD COLUMN     "personaId" TEXT;

-- AlterTable
ALTER TABLE "scan_runs" ADD COLUMN     "engagementId" TEXT;

-- CreateTable
CREATE TABLE "job_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobCategoryId" TEXT NOT NULL,
    "archetype" "PersonaArchetype" NOT NULL,
    "label" TEXT NOT NULL,
    "intent" TEXT,
    "seedContext" TEXT,
    "isCatalog" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobCategoryId" TEXT NOT NULL,
    "tier" "EngagementTier" NOT NULL DEFAULT 'DIAGNOSTIC',
    "status" "EngagementStatus" NOT NULL DEFAULT 'SCOPING',
    "shareToken" TEXT,
    "shareTokenRevokedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_personas" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "labelOverride" VARCHAR(255),
    "intentOverride" TEXT,
    "seedContextOverride" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "engagement_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "namedIssue" VARCHAR(500) NOT NULL,
    "evidenceScanResultIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidenceCitations" JSONB,
    "actionableCategory" "FindingCategory" NOT NULL,
    "personaId" TEXT,
    "modelName" VARCHAR(100),
    "stage" "DecisionStage",
    "competitorId" TEXT,
    "narrative" TEXT,
    "status" "FindingStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finding_audit_entries" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "hasNamedIssue" BOOLEAN NOT NULL,
    "hasEvidence" BOOLEAN NOT NULL,
    "hasActionableCategory" BOOLEAN NOT NULL,
    "isMaterial" BOOLEAN NOT NULL,
    "namedIssueCopy" VARCHAR(500) NOT NULL,
    "actionableCategoryCopy" VARCHAR(100) NOT NULL,
    "evidenceCount" INTEGER NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finding_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_categories_organizationId_idx" ON "job_categories"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "job_categories_organizationId_slug_key" ON "job_categories"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "personas_organizationId_idx" ON "personas"("organizationId");

-- CreateIndex
CREATE INDEX "personas_jobCategoryId_idx" ON "personas"("jobCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "personas_organizationId_jobCategoryId_archetype_label_key" ON "personas"("organizationId", "jobCategoryId", "archetype", "label");

-- CreateIndex
CREATE UNIQUE INDEX "engagements_shareToken_key" ON "engagements"("shareToken");

-- CreateIndex
CREATE INDEX "engagements_organizationId_idx" ON "engagements"("organizationId");

-- CreateIndex
CREATE INDEX "engagements_clientId_idx" ON "engagements"("clientId");

-- CreateIndex
CREATE INDEX "engagements_jobCategoryId_idx" ON "engagements"("jobCategoryId");

-- CreateIndex
CREATE INDEX "engagements_status_idx" ON "engagements"("status");

-- CreateIndex
CREATE INDEX "engagement_personas_engagementId_idx" ON "engagement_personas"("engagementId");

-- CreateIndex
CREATE INDEX "engagement_personas_personaId_idx" ON "engagement_personas"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_personas_engagementId_personaId_key" ON "engagement_personas"("engagementId", "personaId");

-- CreateIndex
CREATE INDEX "findings_engagementId_idx" ON "findings"("engagementId");

-- CreateIndex
CREATE INDEX "findings_engagementId_status_idx" ON "findings"("engagementId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "findings_engagementId_index_key" ON "findings"("engagementId", "index");

-- CreateIndex
CREATE INDEX "finding_audit_entries_findingId_idx" ON "finding_audit_entries"("findingId");

-- CreateIndex
CREATE UNIQUE INDEX "finding_audit_entries_findingId_key" ON "finding_audit_entries"("findingId");

-- CreateIndex
CREATE INDEX "scan_results_modelName_idx" ON "scan_results"("modelName");

-- CreateIndex
CREATE INDEX "scan_results_personaId_idx" ON "scan_results"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "scan_results_scanRunId_queryId_modelName_personaId_key" ON "scan_results"("scanRunId", "queryId", "modelName", "personaId");

-- CreateIndex
CREATE INDEX "scan_runs_engagementId_idx" ON "scan_runs"("engagementId");

-- AddForeignKey
ALTER TABLE "scan_runs" ADD CONSTRAINT "scan_runs_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_jobCategoryId_fkey" FOREIGN KEY ("jobCategoryId") REFERENCES "job_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_jobCategoryId_fkey" FOREIGN KEY ("jobCategoryId") REFERENCES "job_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_personas" ADD CONSTRAINT "engagement_personas_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_personas" ADD CONSTRAINT "engagement_personas_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding_audit_entries" ADD CONSTRAINT "finding_audit_entries_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

