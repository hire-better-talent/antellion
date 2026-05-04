CREATE TYPE "QueryClusterReviewStatus" AS ENUM ('DRAFT', 'APPROVED', 'NEEDS_REVISION', 'STALE');

ALTER TABLE "query_clusters"
ADD COLUMN "reviewStatus" "QueryClusterReviewStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "reviewNotes" TEXT,
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE INDEX "query_clusters_clientId_reviewStatus_idx" ON "query_clusters"("clientId", "reviewStatus");

ALTER TABLE "query_clusters"
ADD CONSTRAINT "query_clusters_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
