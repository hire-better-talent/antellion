import type { QACheckContext, QACheckResult, QACheckFn } from "./types";

// ── Thresholds ──────────────────────────────────────────────

/** Minimum summary length (characters) to be considered non-trivial. */
export const MIN_SUMMARY_LENGTH = 50;

/** Minimum confidence score for evidence to be considered acceptable. */
export const MIN_CONFIDENCE_SCORE = 0.4;

/** Minimum fraction of mentioned results that should have citations. */
export const MIN_CITATION_RATE = 0.5;

/** Minimum number of sections in report metadata. */
export const MIN_SECTIONS = 2;

// ── COMPLETENESS checks ────────────────────────────────────

const COMPLETE_STATUSES = new Set(["COMPLETED", "COMPLETE"]);

export const completenessScansCompleted: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  const incomplete = ctx.scanRuns.filter(
    (s) => !COMPLETE_STATUSES.has(s.status),
  );

  if (incomplete.length > 0) {
    return {
      checkKey: "completeness.scans_completed",
      category: "COMPLETENESS",
      severity: "BLOCKING",
      outcome: "FAIL",
      detail: `${incomplete.length} scan run(s) are not in COMPLETED status.`,
      expected: "All scan runs COMPLETED",
      actual: incomplete
        .map((s) => `${s.id}: ${s.status}`)
        .join(", "),
    };
  }

  return {
    checkKey: "completeness.scans_completed",
    category: "COMPLETENESS",
    severity: "BLOCKING",
    outcome: "PASS",
    detail: `All ${ctx.scanRuns.length} scan run(s) are COMPLETED.`,
    expected: null,
    actual: null,
  };
};

export const completenessHasResults: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  if (ctx.scanResults.length === 0) {
    return {
      checkKey: "completeness.has_results",
      category: "COMPLETENESS",
      severity: "BLOCKING",
      outcome: "FAIL",
      detail: "Report has no scan results.",
      expected: "At least 1 scan result",
      actual: "0 results",
    };
  }

  return {
    checkKey: "completeness.has_results",
    category: "COMPLETENESS",
    severity: "BLOCKING",
    outcome: "PASS",
    detail: `Report has ${ctx.scanResults.length} scan result(s).`,
    expected: null,
    actual: null,
  };
};

export const completenessHasSummary: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  const summary = ctx.report.summary?.trim() ?? "";

  if (summary.length < MIN_SUMMARY_LENGTH) {
    return {
      checkKey: "completeness.has_summary",
      category: "COMPLETENESS",
      severity: "BLOCKING",
      outcome: "FAIL",
      detail: `Report summary is too short (${summary.length} chars). Must be at least ${MIN_SUMMARY_LENGTH}.`,
      expected: `>= ${MIN_SUMMARY_LENGTH} characters`,
      actual: `${summary.length} characters`,
    };
  }

  return {
    checkKey: "completeness.has_summary",
    category: "COMPLETENESS",
    severity: "BLOCKING",
    outcome: "PASS",
    detail: `Summary has ${summary.length} characters.`,
    expected: null,
    actual: null,
  };
};

// ── EVIDENCE_INTEGRITY checks ──────────────────────────────

export const evidenceAllApproved: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  // Check 1: all scan results in the contributing scans must be APPROVED.
  const unapprovedResults = ctx.scanResults.filter(
    (r) => r.status !== "APPROVED",
  );

  if (unapprovedResults.length > 0) {
    return {
      checkKey: "evidence.all_approved",
      category: "EVIDENCE_INTEGRITY",
      severity: "BLOCKING",
      outcome: "FAIL",
      detail: `${unapprovedResults.length} scan result(s) are not in APPROVED status.`,
      expected: "All scan results APPROVED",
      actual: unapprovedResults
        .map((r) => `${r.id}: ${r.status}`)
        .slice(0, 10)
        .join(", "),
    };
  }

  // Check 2: all linked evidence records must also be APPROVED.
  // After the report generation fix, evidence links should only point to APPROVED records,
  // but this check catches any stale links that slipped through before the fix.
  const unapprovedEvidence = ctx.evidence.filter(
    (e) => e.status !== "APPROVED",
  );

  if (unapprovedEvidence.length > 0) {
    return {
      checkKey: "evidence.all_approved",
      category: "EVIDENCE_INTEGRITY",
      severity: "BLOCKING",
      outcome: "FAIL",
      detail: `${unapprovedEvidence.length} linked evidence record(s) are not in APPROVED status.`,
      expected: "All linked evidence APPROVED",
      actual: unapprovedEvidence
        .map((e) => `${e.id}: ${e.status}`)
        .slice(0, 10)
        .join(", "),
    };
  }

  return {
    checkKey: "evidence.all_approved",
    category: "EVIDENCE_INTEGRITY",
    severity: "BLOCKING",
    outcome: "PASS",
    detail: `All ${ctx.scanResults.length} scan result(s) and ${ctx.evidence.length} linked evidence record(s) are APPROVED.`,
    expected: null,
    actual: null,
  };
};

export const evidenceAllHaveResponses: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  const emptyResponses = ctx.scanResults.filter(
    (r) => !r.response || r.response.trim().length === 0,
  );

  if (emptyResponses.length > 0) {
    return {
      checkKey: "evidence.all_have_responses",
      category: "EVIDENCE_INTEGRITY",
      severity: "BLOCKING",
      outcome: "FAIL",
      detail: `${emptyResponses.length} scan result(s) have empty response text.`,
      expected: "All results have non-empty responses",
      actual: `${emptyResponses.length} empty`,
    };
  }

  return {
    checkKey: "evidence.all_have_responses",
    category: "EVIDENCE_INTEGRITY",
    severity: "BLOCKING",
    outcome: "PASS",
    detail: "All scan results have non-empty response text.",
    expected: null,
    actual: null,
  };
};

export const evidenceConfidenceAcceptable: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  if (ctx.evidence.length === 0) {
    return {
      checkKey: "evidence.confidence_acceptable",
      category: "EVIDENCE_INTEGRITY",
      severity: "WARNING",
      outcome: "SKIPPED",
      detail: "No evidence records to check.",
      expected: null,
      actual: null,
    };
  }

  const lowConfidence = ctx.evidence.filter(
    (e) =>
      e.confidenceScore !== null && e.confidenceScore < MIN_CONFIDENCE_SCORE,
  );

  if (lowConfidence.length > 0) {
    return {
      checkKey: "evidence.confidence_acceptable",
      category: "EVIDENCE_INTEGRITY",
      severity: "WARNING",
      outcome: "WARNING",
      detail: `${lowConfidence.length} evidence record(s) have confidence below ${MIN_CONFIDENCE_SCORE}.`,
      expected: `All confidence scores >= ${MIN_CONFIDENCE_SCORE}`,
      actual: lowConfidence
        .map(
          (e) => `${e.id}: ${e.confidenceScore}`,
        )
        .slice(0, 10)
        .join(", "),
    };
  }

  return {
    checkKey: "evidence.confidence_acceptable",
    category: "EVIDENCE_INTEGRITY",
    severity: "WARNING",
    outcome: "PASS",
    detail: "All evidence records have acceptable confidence scores.",
    expected: null,
    actual: null,
  };
};

// ── SOURCE_ACCURACY checks ─────────────────────────────────

export const sourceCitationsPresent: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  const mentionedResults = ctx.scanResults.filter((r) => r.mentioned);

  if (mentionedResults.length === 0) {
    return {
      checkKey: "source.citations_present",
      category: "SOURCE_ACCURACY",
      severity: "WARNING",
      outcome: "SKIPPED",
      detail: "No results with mentions to check citations against.",
      expected: null,
      actual: null,
    };
  }

  const withCitations = mentionedResults.filter(
    (r) => r.citations.length > 0,
  );
  const rate =
    mentionedResults.length > 0
      ? withCitations.length / mentionedResults.length
      : 0;

  if (rate < MIN_CITATION_RATE) {
    return {
      checkKey: "source.citations_present",
      category: "SOURCE_ACCURACY",
      severity: "WARNING",
      outcome: "WARNING",
      detail: `Only ${Math.round(rate * 100)}% of mentioned results have citations (need >= ${Math.round(MIN_CITATION_RATE * 100)}%).`,
      expected: `>= ${Math.round(MIN_CITATION_RATE * 100)}% of mentioned results with citations`,
      actual: `${withCitations.length}/${mentionedResults.length} (${Math.round(rate * 100)}%)`,
    };
  }

  return {
    checkKey: "source.citations_present",
    category: "SOURCE_ACCURACY",
    severity: "WARNING",
    outcome: "PASS",
    detail: `${Math.round(rate * 100)}% of mentioned results have citations.`,
    expected: null,
    actual: null,
  };
};

export const sourceNoEmptyDomains: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  let nullDomainCount = 0;
  for (const result of ctx.scanResults) {
    for (const citation of result.citations) {
      if (citation.domain === null || citation.domain.trim() === "") {
        nullDomainCount++;
      }
    }
  }

  if (nullDomainCount > 0) {
    return {
      checkKey: "source.no_empty_domains",
      category: "SOURCE_ACCURACY",
      severity: "WARNING",
      outcome: "WARNING",
      detail: `${nullDomainCount} citation(s) have a null or empty domain.`,
      expected: "All citations have a non-null domain",
      actual: `${nullDomainCount} null/empty`,
    };
  }

  return {
    checkKey: "source.no_empty_domains",
    category: "SOURCE_ACCURACY",
    severity: "WARNING",
    outcome: "PASS",
    detail: "All citations have non-null domains.",
    expected: null,
    actual: null,
  };
};

// ── NARRATIVE checks ───────────────────────────────────────

export const narrativeSummaryHasPercentages: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  const summary = ctx.report.summary ?? "";
  const hasPercentage = /\d+%/.test(summary);

  if (!hasPercentage) {
    return {
      checkKey: "narrative.summary_has_percentages",
      category: "NARRATIVE",
      severity: "WARNING",
      outcome: "WARNING",
      detail:
        "Summary does not contain any percentage figures. Data may not have been incorporated into the narrative.",
      expected: "At least one percentage in summary",
      actual: "No percentages found",
    };
  }

  return {
    checkKey: "narrative.summary_has_percentages",
    category: "NARRATIVE",
    severity: "WARNING",
    outcome: "PASS",
    detail: "Summary contains percentage figures.",
    expected: null,
    actual: null,
  };
};

export const narrativeSectionsPresent: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  const metadata = ctx.report.metadata;
  const sections = Array.isArray(metadata?.sections) ? metadata.sections : [];

  if (sections.length < MIN_SECTIONS) {
    return {
      checkKey: "narrative.sections_present",
      category: "NARRATIVE",
      severity: "BLOCKING",
      outcome: "FAIL",
      detail: `Report has ${sections.length} section(s), need at least ${MIN_SECTIONS}.`,
      expected: `>= ${MIN_SECTIONS} sections`,
      actual: `${sections.length} sections`,
    };
  }

  return {
    checkKey: "narrative.sections_present",
    category: "NARRATIVE",
    severity: "BLOCKING",
    outcome: "PASS",
    detail: `Report has ${sections.length} section(s).`,
    expected: null,
    actual: null,
  };
};

// ── COMPETITOR_LOGIC checks ────────────────────────────────

/**
 * Extract competitor mentions from scan result metadata.
 * Mirrors the extraction logic in scan-comparison.ts.
 */
function extractCompetitorNamesFromMetadata(metadata: unknown): string[] {
  if (
    metadata == null ||
    typeof metadata !== "object" ||
    !("competitorMentions" in metadata) ||
    !Array.isArray(
      (metadata as Record<string, unknown>).competitorMentions,
    )
  ) {
    return [];
  }

  return (
    metadata as { competitorMentions: Array<{ name: string }> }
  ).competitorMentions.map((m) => m.name);
}

export const competitorAllInReport: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  const competitors = ctx.client.competitors;

  if (competitors.length === 0) {
    return {
      checkKey: "competitor.all_in_report",
      category: "COMPETITOR_LOGIC",
      severity: "WARNING",
      outcome: "SKIPPED",
      detail: "Client has no competitors configured.",
      expected: null,
      actual: null,
    };
  }

  // Check if each competitor name appears somewhere in report sections or summary
  const metadata = ctx.report.metadata;
  const sections = Array.isArray(metadata?.sections) ? metadata.sections : [];
  const fullText = [
    ctx.report.summary ?? "",
    ...sections.map((s: Record<string, unknown>) =>
      [
        String(s.heading ?? ""),
        String(s.body ?? ""),
        ...(Array.isArray(s.subsections)
          ? s.subsections.map(
              (sub: Record<string, unknown>) =>
                `${String(sub.heading ?? "")} ${String(sub.body ?? "")}`,
            )
          : []),
      ].join(" "),
    ),
  ]
    .join(" ")
    .toLowerCase();

  const missing = competitors.filter(
    (c) => !fullText.includes(c.name.toLowerCase()),
  );

  if (missing.length > 0) {
    return {
      checkKey: "competitor.all_in_report",
      category: "COMPETITOR_LOGIC",
      severity: "WARNING",
      outcome: "WARNING",
      detail: `${missing.length} competitor(s) not mentioned in report: ${missing.map((c) => c.name).join(", ")}`,
      expected: "All competitors appear in report",
      actual: `Missing: ${missing.map((c) => c.name).join(", ")}`,
    };
  }

  return {
    checkKey: "competitor.all_in_report",
    category: "COMPETITOR_LOGIC",
    severity: "WARNING",
    outcome: "PASS",
    detail: "All competitors appear in the report.",
    expected: null,
    actual: null,
  };
};

export const competitorMentionDataExists: QACheckFn = (
  ctx: QACheckContext,
): QACheckResult => {
  const competitors = ctx.client.competitors;

  if (competitors.length === 0) {
    return {
      checkKey: "competitor.mention_data_exists",
      category: "COMPETITOR_LOGIC",
      severity: "BLOCKING",
      outcome: "SKIPPED",
      detail: "Client has no competitors configured.",
      expected: null,
      actual: null,
    };
  }

  // Check if at least one scan result has competitor mention metadata
  const hasCompetitorData = ctx.scanResults.some((r) => {
    const names = extractCompetitorNamesFromMetadata(r.metadata);
    return names.length > 0;
  });

  if (!hasCompetitorData) {
    return {
      checkKey: "competitor.mention_data_exists",
      category: "COMPETITOR_LOGIC",
      severity: "BLOCKING",
      outcome: "FAIL",
      detail:
        "Competitors exist but no scan results contain competitor mention metadata.",
      expected: "At least one result with competitor mention data",
      actual: "No competitor mention metadata found",
    };
  }

  return {
    checkKey: "competitor.mention_data_exists",
    category: "COMPETITOR_LOGIC",
    severity: "BLOCKING",
    outcome: "PASS",
    detail: "Scan results contain competitor mention data.",
    expected: null,
    actual: null,
  };
};

// ── All checks registry ────────────────────────────────────

export const ALL_CHECKS: QACheckFn[] = [
  // COMPLETENESS
  completenessScansCompleted,
  completenessHasResults,
  completenessHasSummary,
  // EVIDENCE_INTEGRITY
  evidenceAllApproved,
  evidenceAllHaveResponses,
  evidenceConfidenceAcceptable,
  // SOURCE_ACCURACY
  sourceCitationsPresent,
  sourceNoEmptyDomains,
  // NARRATIVE
  narrativeSummaryHasPercentages,
  narrativeSectionsPresent,
  // COMPETITOR_LOGIC
  competitorAllInReport,
  competitorMentionDataExists,
];
