-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DecisionStage" AS ENUM ('DISCOVERY', 'CONSIDERATION', 'EVALUATION', 'COMMITMENT');

-- CreateEnum
CREATE TYPE "QAStatus" AS ENUM ('PENDING', 'PASS', 'FAIL', 'CONDITIONAL_PASS');

-- CreateEnum
CREATE TYPE "QACheckOutcome" AS ENUM ('PASS', 'FAIL', 'WARNING', 'SKIPPED');

-- CreateEnum
CREATE TYPE "LLMProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'MANUAL');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUPERSEDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScanResultStatus" AS ENUM ('CAPTURED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ScanRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContentAssetType" AS ENUM ('CAREERS_PAGE', 'JOB_POSTING', 'BLOG_POST', 'PRESS_RELEASE', 'SOCIAL_PROFILE', 'REVIEW_SITE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATING', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('CONTENT_GAP', 'COMPETITIVE_POSITIONING', 'EMPLOYER_BRAND', 'TECHNICAL_REPUTATION', 'COMPENSATION_PERCEPTION', 'CULTURE_SIGNAL', 'DIVERSITY_INCLUSION', 'OTHER');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "industry" TEXT,
    "description" TEXT,
    "nicheKeywords" TEXT,
    "logoUrl" TEXT,
    "careerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employeeCount" INTEGER,
    "headquarters" TEXT,
    "additionalLocations" TEXT,
    "publiclyTraded" BOOLEAN NOT NULL DEFAULT false,
    "revenueScale" TEXT,
    "knownFor" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "industry" TEXT,
    "description" TEXT,
    "careerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_profiles" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "seniority" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_clusters" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "roleProfileId" TEXT,
    "name" TEXT NOT NULL,
    "intent" TEXT,
    "description" TEXT,
    "stage" "DecisionStage",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queries" (
    "id" TEXT NOT NULL,
    "queryClusterId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "intent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stage" "DecisionStage",
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_runs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "triggeredById" TEXT,
    "parentScanRunId" TEXT,
    "status" "ScanRunStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT,
    "queryDepth" TEXT,
    "focusArea" TEXT,
    "queryCount" INTEGER NOT NULL DEFAULT 0,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "queryScope" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_results" (
    "id" TEXT NOT NULL,
    "scanRunId" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "competitorId" TEXT,
    "response" TEXT NOT NULL,
    "visibilityScore" DOUBLE PRECISION,
    "sentimentScore" DOUBLE PRECISION,
    "relevanceScore" DOUBLE PRECISION,
    "ranking" INTEGER,
    "mentioned" BOOLEAN NOT NULL DEFAULT false,
    "tokenCount" INTEGER,
    "latencyMs" INTEGER,
    "metadata" JSONB,
    "status" "ScanResultStatus" NOT NULL DEFAULT 'CAPTURED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citation_sources" (
    "id" TEXT NOT NULL,
    "scanResultId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "domain" TEXT,
    "sourceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citation_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_evidence" (
    "id" TEXT NOT NULL,
    "scanResultId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "promptText" TEXT NOT NULL,
    "promptVersion" TEXT,
    "provider" "LLMProvider" NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT,
    "temperature" DOUBLE PRECISION,
    "topP" DOUBLE PRECISION,
    "maxTokens" INTEGER,
    "systemPrompt" TEXT,
    "parameters" JSONB,
    "rawResponse" TEXT NOT NULL,
    "rawTokenCount" INTEGER,
    "promptTokens" INTEGER,
    "latencyMs" INTEGER,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "analystNotes" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "analystConfidence" DOUBLE PRECISION,
    "extractedSources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_assets" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "assetType" "ContentAssetType" NOT NULL,
    "content" TEXT,
    "lastCrawled" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "generatedById" TEXT,
    "title" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "generatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "category" "RecommendationCategory" NOT NULL,
    "priority" "RecommendationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT,
    "effort" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_evidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "scanEvidenceId" TEXT NOT NULL,
    "sectionHeading" VARCHAR(255),
    "claimText" TEXT,
    "evidenceRole" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_qa" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" "QAStatus" NOT NULL DEFAULT 'PENDING',
    "runCompletedAt" TIMESTAMP(3),
    "signedOffById" TEXT,
    "signedOffAt" TIMESTAMP(3),
    "confidence" TEXT,
    "signoffNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_qa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_check_results" (
    "id" TEXT NOT NULL,
    "reportQAId" TEXT NOT NULL,
    "checkKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "outcome" "QACheckOutcome" NOT NULL,
    "detail" TEXT,
    "expected" TEXT,
    "actual" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qa_check_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyDomain" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactTitle" TEXT,
    "topCompetitor" TEXT,
    "primaryRole" TEXT,
    "source" TEXT NOT NULL DEFAULT 'landing_page',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transition_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transition_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_baselines" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "earnedVisibilityRate" DOUBLE PRECISION NOT NULL,
    "discoveryMentionRate" DOUBLE PRECISION,
    "evaluationMentionRate" DOUBLE PRECISION,
    "considerationMentionRate" DOUBLE PRECISION,
    "commitmentMentionRate" DOUBLE PRECISION,
    "overallMentionRate" DOUBLE PRECISION NOT NULL,
    "avgSentiment" DOUBLE PRECISION,
    "topCompetitorName" TEXT,
    "topCompetitorRate" DOUBLE PRECISION,
    "competitorGapPp" INTEGER,
    "totalGapDomains" INTEGER NOT NULL DEFAULT 0,
    "employerGapDomains" INTEGER NOT NULL DEFAULT 0,
    "overallPositioning" TEXT,
    "queryCount" INTEGER NOT NULL,
    "focusArea" TEXT,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stageData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "clients_organizationId_idx" ON "clients"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organizationId_domain_key" ON "clients"("organizationId", "domain");

-- CreateIndex
CREATE INDEX "competitors_clientId_idx" ON "competitors"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "competitors_clientId_domain_key" ON "competitors"("clientId", "domain");

-- CreateIndex
CREATE INDEX "role_profiles_clientId_idx" ON "role_profiles"("clientId");

-- CreateIndex
CREATE INDEX "query_clusters_clientId_idx" ON "query_clusters"("clientId");

-- CreateIndex
CREATE INDEX "query_clusters_clientId_stage_idx" ON "query_clusters"("clientId", "stage");

-- CreateIndex
CREATE INDEX "query_clusters_roleProfileId_idx" ON "query_clusters"("roleProfileId");

-- CreateIndex
CREATE INDEX "queries_queryClusterId_idx" ON "queries"("queryClusterId");

-- CreateIndex
CREATE INDEX "scan_runs_clientId_idx" ON "scan_runs"("clientId");

-- CreateIndex
CREATE INDEX "scan_runs_status_idx" ON "scan_runs"("status");

-- CreateIndex
CREATE INDEX "scan_runs_parentScanRunId_idx" ON "scan_runs"("parentScanRunId");

-- CreateIndex
CREATE INDEX "scan_results_scanRunId_idx" ON "scan_results"("scanRunId");

-- CreateIndex
CREATE INDEX "scan_results_queryId_idx" ON "scan_results"("queryId");

-- CreateIndex
CREATE INDEX "scan_results_competitorId_idx" ON "scan_results"("competitorId");

-- CreateIndex
CREATE INDEX "scan_results_status_idx" ON "scan_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scan_results_scanRunId_queryId_key" ON "scan_results"("scanRunId", "queryId");

-- CreateIndex
CREATE INDEX "citation_sources_scanResultId_idx" ON "citation_sources"("scanResultId");

-- CreateIndex
CREATE INDEX "scan_evidence_scanResultId_idx" ON "scan_evidence"("scanResultId");

-- CreateIndex
CREATE INDEX "scan_evidence_status_idx" ON "scan_evidence"("status");

-- CreateIndex
CREATE INDEX "scan_evidence_provider_modelName_idx" ON "scan_evidence"("provider", "modelName");

-- CreateIndex
CREATE INDEX "scan_evidence_executedAt_idx" ON "scan_evidence"("executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "scan_evidence_scanResultId_version_key" ON "scan_evidence"("scanResultId", "version");

-- CreateIndex
CREATE INDEX "content_assets_clientId_idx" ON "content_assets"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "content_assets_clientId_url_key" ON "content_assets"("clientId", "url");

-- CreateIndex
CREATE INDEX "reports_clientId_idx" ON "reports"("clientId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "recommendations_reportId_idx" ON "recommendations"("reportId");

-- CreateIndex
CREATE INDEX "report_evidence_reportId_idx" ON "report_evidence"("reportId");

-- CreateIndex
CREATE INDEX "report_evidence_scanEvidenceId_idx" ON "report_evidence"("scanEvidenceId");

-- CreateIndex
CREATE UNIQUE INDEX "report_evidence_reportId_scanEvidenceId_sectionHeading_key" ON "report_evidence"("reportId", "scanEvidenceId", "sectionHeading");

-- CreateIndex
CREATE UNIQUE INDEX "report_qa_reportId_key" ON "report_qa"("reportId");

-- CreateIndex
CREATE INDEX "report_qa_reportId_idx" ON "report_qa"("reportId");

-- CreateIndex
CREATE INDEX "report_qa_status_idx" ON "report_qa"("status");

-- CreateIndex
CREATE INDEX "qa_check_results_reportQAId_idx" ON "qa_check_results"("reportQAId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "transition_logs_entityType_entityId_idx" ON "transition_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "transition_logs_createdAt_idx" ON "transition_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_baselines_reportId_key" ON "assessment_baselines"("reportId");

-- CreateIndex
CREATE INDEX "assessment_baselines_clientId_idx" ON "assessment_baselines"("clientId");

-- CreateIndex
CREATE INDEX "assessment_baselines_clientId_assessmentDate_idx" ON "assessment_baselines"("clientId", "assessmentDate");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_profiles" ADD CONSTRAINT "role_profiles_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_clusters" ADD CONSTRAINT "query_clusters_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_clusters" ADD CONSTRAINT "query_clusters_roleProfileId_fkey" FOREIGN KEY ("roleProfileId") REFERENCES "role_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queries" ADD CONSTRAINT "queries_queryClusterId_fkey" FOREIGN KEY ("queryClusterId") REFERENCES "query_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_runs" ADD CONSTRAINT "scan_runs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_runs" ADD CONSTRAINT "scan_runs_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_runs" ADD CONSTRAINT "scan_runs_parentScanRunId_fkey" FOREIGN KEY ("parentScanRunId") REFERENCES "scan_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_results" ADD CONSTRAINT "scan_results_scanRunId_fkey" FOREIGN KEY ("scanRunId") REFERENCES "scan_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_results" ADD CONSTRAINT "scan_results_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "queries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_results" ADD CONSTRAINT "scan_results_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation_sources" ADD CONSTRAINT "citation_sources_scanResultId_fkey" FOREIGN KEY ("scanResultId") REFERENCES "scan_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_evidence" ADD CONSTRAINT "scan_evidence_scanResultId_fkey" FOREIGN KEY ("scanResultId") REFERENCES "scan_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_evidence" ADD CONSTRAINT "scan_evidence_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_assets" ADD CONSTRAINT "content_assets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_evidence" ADD CONSTRAINT "report_evidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_evidence" ADD CONSTRAINT "report_evidence_scanEvidenceId_fkey" FOREIGN KEY ("scanEvidenceId") REFERENCES "scan_evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_qa" ADD CONSTRAINT "report_qa_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa_check_results" ADD CONSTRAINT "qa_check_results_reportQAId_fkey" FOREIGN KEY ("reportQAId") REFERENCES "report_qa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_baselines" ADD CONSTRAINT "assessment_baselines_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_baselines" ADD CONSTRAINT "assessment_baselines_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
