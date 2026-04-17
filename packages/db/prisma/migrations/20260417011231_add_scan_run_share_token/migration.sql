-- AlterTable
ALTER TABLE "scan_runs" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "scan_runs" ADD COLUMN "shareTokenRevokedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "scan_runs_shareToken_key" ON "scan_runs"("shareToken");
