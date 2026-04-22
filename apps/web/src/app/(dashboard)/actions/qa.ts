"use server";

import { prisma } from "@antellion/db";
import { runQAChecks } from "@antellion/core";
import type { QACheckContext, QARunResult } from "@antellion/core";
import { getAuthContext } from "@/lib/auth";

// ── Fetch QA context ───────────────────────────────────────

async function buildQAContext(
  reportId: string,
  organizationId: string,
): Promise<QACheckContext | null> {
  const report = await prisma.report.findFirst({
    where: { id: reportId, client: { organizationId } },
    select: {
      id: true,
      summary: true,
      metadata: true,
      client: {
        select: {
          name: true,
          competitors: { select: { name: true } },
        },
      },
    },
  });

  if (!report) return null;

  // Extract scan run IDs from report metadata
  const metadata = report.metadata as Record<string, unknown> | null;
  const scanRunIds = Array.isArray(metadata?.scanRunIds)
    ? (metadata.scanRunIds as string[])
    : [];

  // Fetch scan runs
  const scanRuns = scanRunIds.length > 0
    ? await prisma.scanRun.findMany({
        where: { id: { in: scanRunIds } },
        select: {
          id: true,
          status: true,
          queryCount: true,
          resultCount: true,
        },
      })
    : [];

  // Fetch all scan results for these scans
  const scanResults = scanRunIds.length > 0
    ? await prisma.scanResult.findMany({
        where: { scanRunId: { in: scanRunIds } },
        select: {
          id: true,
          scanRunId: true,
          status: true,
          mentioned: true,
          visibilityScore: true,
          sentimentScore: true,
          response: true,
          metadata: true,
          citations: { select: { domain: true } },
        },
      })
    : [];

  // Fetch evidence linked to this report
  const evidenceLinks = await prisma.reportEvidence.findMany({
    where: { reportId },
    select: {
      scanEvidence: {
        select: {
          id: true,
          scanResultId: true,
          status: true,
          confidenceScore: true,
        },
      },
    },
  });

  const evidence = evidenceLinks.map((link) => link.scanEvidence);

  // Scope QA scan results to only the results actually linked to this report.
  // The report was generated from APPROVED results only; fetching all results in the
  // contributing scans (including CAPTURED, NEEDS_REVIEW, REJECTED) would cause
  // evidenceAllApproved to report false failures for results that were intentionally
  // excluded from the report. We derive the relevant result IDs from the evidence links.
  // If there are no evidence links, return an empty set — completenessHasResults will
  // catch this as a blocking failure rather than silently using unrelated results.
  const linkedResultIds = new Set(evidence.map((e) => e.scanResultId));
  const linkedResults = scanResults.filter((r) => linkedResultIds.has(r.id));

  return {
    report: {
      id: report.id,
      summary: report.summary,
      metadata: metadata,
    },
    scanRuns,
    scanResults: linkedResults.map((r) => ({
      id: r.id,
      scanRunId: r.scanRunId,
      status: r.status,
      mentioned: r.mentioned,
      visibilityScore: r.visibilityScore,
      sentimentScore: r.sentimentScore,
      response: r.response,
      metadata: r.metadata,
      citations: r.citations,
    })),
    evidence,
    client: report.client,
  };
}

// ── Run QA checks ──────────────────────────────────────────

export async function runReportQA(reportId: string): Promise<{
  success: boolean;
  result?: QARunResult;
  error?: string;
}> {
  const { organizationId } = await getAuthContext();
  const ctx = await buildQAContext(reportId, organizationId);

  if (!ctx) {
    // Throw so that callers relying on QA as a gate cannot silently bypass it
    // when the report is missing or fails org-scope verification.
    throw new Error("Cannot run QA: report not found or access denied.");
  }

  const result = runQAChecks(ctx);

  // Upsert the ReportQA record and replace all check results
  await prisma.$transaction(async (tx) => {
    // Delete existing check results if re-running
    const existing = await tx.reportQA.findUnique({
      where: { reportId },
      select: { id: true, status: true },
    });

    const previousStatus: string = existing?.status ?? "PENDING";

    if (existing) {
      await tx.qACheckResult.deleteMany({
        where: { reportQAId: existing.id },
      });

      await tx.reportQA.update({
        where: { id: existing.id },
        data: {
          status: result.status,
          runCompletedAt: new Date(),
          // Clear any previous signoff since we re-ran checks
          signedOffById: null,
          signedOffAt: null,
          confidence: null,
          signoffNote: null,
        },
      });

      await tx.qACheckResult.createMany({
        data: result.checks.map((c) => ({
          reportQAId: existing.id,
          checkKey: c.checkKey,
          category: c.category,
          severity: c.severity,
          outcome: c.outcome,
          detail: c.detail,
          expected: c.expected,
          actual: c.actual,
        })),
      });
    } else {
      const qa = await tx.reportQA.create({
        data: {
          reportId,
          status: result.status,
          runCompletedAt: new Date(),
        },
      });

      await tx.qACheckResult.createMany({
        data: result.checks.map((c) => ({
          reportQAId: qa.id,
          checkKey: c.checkKey,
          category: c.category,
          severity: c.severity,
          outcome: c.outcome,
          detail: c.detail,
          expected: c.expected,
          actual: c.actual,
        })),
      });
    }

    // Audit log the QA run
    await tx.transitionLog.create({
      data: {
        entityType: "REPORT",
        entityId: reportId,
        fromStatus: previousStatus,
        toStatus: result.status,
        action: "runQA",
        actorId: null, // system action
      },
    });
  });

  return { success: true, result };
}

// ── Sign off QA ────────────────────────────────────────────

export async function signoffQA(
  reportQAId: string,
  confidence: string,
  note?: string,
): Promise<{ success: boolean; error?: string }> {
  const { organizationId, userId } = await getAuthContext();

  // Verify the QA record exists and belongs to current org
  const qa = await prisma.reportQA.findFirst({
    where: {
      id: reportQAId,
      report: { client: { organizationId } },
    },
    select: { id: true, status: true },
  });

  if (!qa) {
    return { success: false, error: "QA record not found." };
  }

  if (qa.status !== "PASS" && qa.status !== "CONDITIONAL_PASS") {
    return {
      success: false,
      error: `Cannot sign off on QA with status ${qa.status}. Must be PASS or CONDITIONAL_PASS.`,
    };
  }

  const validConfidence = ["LOW", "MEDIUM", "HIGH"];
  if (!validConfidence.includes(confidence)) {
    return {
      success: false,
      error: `Invalid confidence level: ${confidence}. Must be LOW, MEDIUM, or HIGH.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.reportQA.update({
      where: { id: reportQAId },
      data: {
        signedOffById: userId,
        signedOffAt: new Date(),
        confidence,
        signoffNote: note ?? null,
      },
    });

    // Fetch reportId for the audit log
    const updatedQA = await tx.reportQA.findUnique({
      where: { id: reportQAId },
      select: { reportId: true, status: true },
    });

    if (updatedQA) {
      await tx.transitionLog.create({
        data: {
          entityType: "REPORT",
          entityId: updatedQA.reportId,
          fromStatus: updatedQA.status,
          toStatus: updatedQA.status, // status unchanged on signoff
          action: "signoffQA",
          actorId: userId,
        },
      });
    }
  });

  return { success: true };
}

// ── Get QA status ──────────────────────────────────────────

export async function getReportQA(reportId: string) {
  const { organizationId } = await getAuthContext();

  const qa = await prisma.reportQA.findFirst({
    where: {
      reportId,
      report: { client: { organizationId } },
    },
    include: {
      checks: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return qa;
}
