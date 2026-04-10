import { describe, it, expect } from "vitest";
import { runQAChecks } from "../qa/runner";
import {
  completenessScansCompleted,
  completenessHasResults,
  completenessHasSummary,
  evidenceAllApproved,
  evidenceAllHaveResponses,
  evidenceConfidenceAcceptable,
  sourceCitationsPresent,
  sourceNoEmptyDomains,
  narrativeSummaryHasPercentages,
  narrativeSectionsPresent,
  competitorAllInReport,
  competitorMentionDataExists,
  MIN_SUMMARY_LENGTH,
  MIN_CONFIDENCE_SCORE,
} from "../qa/checks";
import type { QACheckContext } from "../qa/types";

// ── Helpers ─────────────────────────────────────────────────

function makeCtx(overrides: Partial<QACheckContext> = {}): QACheckContext {
  return {
    report: {
      id: "report-1",
      summary:
        "TechCorp appears in 65% of AI responses with a visibility score of 72/100. Competitors appear at higher rates in 3 of 5 query themes.",
      metadata: {
        scanRunIds: ["scan-1"],
        sections: [
          { heading: "Visibility Analysis", body: "Analysis of TechCorp and Acme Corp presence..." },
          { heading: "Competitor Comparison", body: "Acme Corp and RivalInc compete..." },
          { heading: "Citations", body: "Source analysis..." },
        ],
      },
    },
    scanRuns: [
      { id: "scan-1", status: "COMPLETED", queryCount: 10, resultCount: 8 },
    ],
    scanResults: [
      {
        id: "r1",
        scanRunId: "scan-1",
        status: "APPROVED",
        mentioned: true,
        visibilityScore: 72,
        sentimentScore: 0.5,
        response: "TechCorp is a leading employer in the tech industry...",
        metadata: {
          competitorMentions: [
            { name: "Acme Corp", domain: "acme.com", mentioned: true },
            { name: "RivalInc", domain: "rivalinc.com", mentioned: false },
          ],
        },
        citations: [{ domain: "glassdoor.com" }, { domain: "linkedin.com" }],
      },
      {
        id: "r2",
        scanRunId: "scan-1",
        status: "APPROVED",
        mentioned: false,
        visibilityScore: 0,
        sentimentScore: -0.2,
        response: "Various companies compete in this space...",
        metadata: {
          competitorMentions: [
            { name: "Acme Corp", domain: "acme.com", mentioned: true },
          ],
        },
        citations: [{ domain: "indeed.com" }],
      },
    ],
    evidence: [
      { id: "ev1", scanResultId: "r1", status: "APPROVED", confidenceScore: 0.8 },
      { id: "ev2", scanResultId: "r2", status: "APPROVED", confidenceScore: 0.6 },
    ],
    client: {
      name: "TechCorp",
      competitors: [{ name: "Acme Corp" }, { name: "RivalInc" }],
    },
    ...overrides,
  };
}

// ── completeness.scans_completed ────────────────────────────

describe("completenessScansCompleted", () => {
  it("passes when all scans are COMPLETED", () => {
    const result = completenessScansCompleted(makeCtx());
    expect(result.outcome).toBe("PASS");
  });

  it("fails when a scan is not COMPLETED", () => {
    const ctx = makeCtx({
      scanRuns: [
        { id: "scan-1", status: "RUNNING", queryCount: 10, resultCount: 5 },
      ],
    });
    const result = completenessScansCompleted(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.severity).toBe("BLOCKING");
  });

  it("accepts COMPLETE as a valid status", () => {
    const ctx = makeCtx({
      scanRuns: [
        { id: "scan-1", status: "COMPLETE", queryCount: 10, resultCount: 8 },
      ],
    });
    expect(completenessScansCompleted(ctx).outcome).toBe("PASS");
  });
});

// ── completeness.has_results ───────────────────────────────

describe("completenessHasResults", () => {
  it("passes when results exist", () => {
    expect(completenessHasResults(makeCtx()).outcome).toBe("PASS");
  });

  it("fails when no results", () => {
    const ctx = makeCtx({ scanResults: [] });
    const result = completenessHasResults(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.severity).toBe("BLOCKING");
  });
});

// ── completeness.has_summary ───────────────────────────────

describe("completenessHasSummary", () => {
  it("passes with a long enough summary", () => {
    expect(completenessHasSummary(makeCtx()).outcome).toBe("PASS");
  });

  it("fails with a short summary", () => {
    const ctx = makeCtx({
      report: { id: "r", summary: "Short", metadata: null },
    });
    const result = completenessHasSummary(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.detail).toContain(String(MIN_SUMMARY_LENGTH));
  });

  it("fails with null summary", () => {
    const ctx = makeCtx({
      report: { id: "r", summary: null, metadata: null },
    });
    expect(completenessHasSummary(ctx).outcome).toBe("FAIL");
  });
});

// ── evidence.all_approved ──────────────────────────────────

describe("evidenceAllApproved", () => {
  it("passes when all results and evidence are APPROVED", () => {
    expect(evidenceAllApproved(makeCtx()).outcome).toBe("PASS");
  });

  it("fails when some scan results are not APPROVED", () => {
    const ctx = makeCtx({
      scanResults: [
        {
          id: "r1",
          scanRunId: "scan-1",
          status: "CAPTURED",
          mentioned: true,
          visibilityScore: 50,
          sentimentScore: 0.3,
          response: "Some response",
          metadata: {},
          citations: [],
        },
      ],
    });
    const result = evidenceAllApproved(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.severity).toBe("BLOCKING");
    expect(result.detail).toMatch(/scan result/i);
  });

  it("fails when linked evidence records are not APPROVED", () => {
    const ctx = makeCtx({
      evidence: [
        { id: "ev1", scanResultId: "r1", status: "DRAFT", confidenceScore: 0.8 },
        { id: "ev2", scanResultId: "r2", status: "APPROVED", confidenceScore: 0.6 },
      ],
    });
    const result = evidenceAllApproved(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.severity).toBe("BLOCKING");
    expect(result.detail).toMatch(/evidence record/i);
    expect(result.actual).toContain("ev1: DRAFT");
  });

  it("fails when evidence is REJECTED", () => {
    const ctx = makeCtx({
      evidence: [
        { id: "ev1", scanResultId: "r1", status: "REJECTED", confidenceScore: null },
      ],
    });
    const result = evidenceAllApproved(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.actual).toContain("REJECTED");
  });

  it("passes when evidence array is empty (no linked evidence yet)", () => {
    const ctx = makeCtx({ evidence: [] });
    const result = evidenceAllApproved(ctx);
    // All scan results are APPROVED and there's no evidence to fail on
    expect(result.outcome).toBe("PASS");
  });

  it("scan result check runs before evidence check", () => {
    // Both results and evidence are bad — should report the scan result failure first
    const ctx = makeCtx({
      scanResults: [
        {
          id: "r1",
          scanRunId: "scan-1",
          status: "NEEDS_REVIEW",
          mentioned: false,
          visibilityScore: null,
          sentimentScore: null,
          response: "Response",
          metadata: {},
          citations: [],
        },
      ],
      evidence: [
        { id: "ev1", scanResultId: "r1", status: "DRAFT", confidenceScore: null },
      ],
    });
    const result = evidenceAllApproved(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.detail).toMatch(/scan result/i);
  });
});

// ── evidence.all_have_responses ────────────────────────────

describe("evidenceAllHaveResponses", () => {
  it("passes when all results have non-empty responses", () => {
    expect(evidenceAllHaveResponses(makeCtx()).outcome).toBe("PASS");
  });

  it("fails when a result has an empty response", () => {
    const ctx = makeCtx({
      scanResults: [
        {
          id: "r1",
          scanRunId: "scan-1",
          status: "APPROVED",
          mentioned: true,
          visibilityScore: 50,
          sentimentScore: 0.3,
          response: "",
          metadata: {},
          citations: [],
        },
      ],
    });
    const result = evidenceAllHaveResponses(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.severity).toBe("BLOCKING");
  });
});

// ── evidence.confidence_acceptable ─────────────────────────

describe("evidenceConfidenceAcceptable", () => {
  it("passes when all confidence scores are acceptable", () => {
    expect(evidenceConfidenceAcceptable(makeCtx()).outcome).toBe("PASS");
  });

  it("warns when confidence is below threshold", () => {
    const ctx = makeCtx({
      evidence: [
        { id: "ev1", scanResultId: "r1", status: "APPROVED", confidenceScore: 0.2 },
      ],
    });
    const result = evidenceConfidenceAcceptable(ctx);
    expect(result.outcome).toBe("WARNING");
    expect(result.severity).toBe("WARNING");
    expect(result.detail).toContain(String(MIN_CONFIDENCE_SCORE));
  });

  it("skips when no evidence records", () => {
    const ctx = makeCtx({ evidence: [] });
    expect(evidenceConfidenceAcceptable(ctx).outcome).toBe("SKIPPED");
  });

  it("passes when confidence is null (no data, not low)", () => {
    const ctx = makeCtx({
      evidence: [
        { id: "ev1", scanResultId: "r1", status: "APPROVED", confidenceScore: null },
      ],
    });
    expect(evidenceConfidenceAcceptable(ctx).outcome).toBe("PASS");
  });
});

// ── source.citations_present ───────────────────────────────

describe("sourceCitationsPresent", () => {
  it("passes when mentioned results have citations", () => {
    expect(sourceCitationsPresent(makeCtx()).outcome).toBe("PASS");
  });

  it("warns when too few mentioned results have citations", () => {
    const ctx = makeCtx({
      scanResults: [
        {
          id: "r1",
          scanRunId: "scan-1",
          status: "APPROVED",
          mentioned: true,
          visibilityScore: 50,
          sentimentScore: 0.3,
          response: "Response",
          metadata: {},
          citations: [], // no citations
        },
        {
          id: "r2",
          scanRunId: "scan-1",
          status: "APPROVED",
          mentioned: true,
          visibilityScore: 40,
          sentimentScore: 0.1,
          response: "Response",
          metadata: {},
          citations: [], // no citations
        },
        {
          id: "r3",
          scanRunId: "scan-1",
          status: "APPROVED",
          mentioned: true,
          visibilityScore: 60,
          sentimentScore: 0.2,
          response: "Response",
          metadata: {},
          citations: [{ domain: "example.com" }], // 1 out of 3 = 33%
        },
      ],
    });
    const result = sourceCitationsPresent(ctx);
    expect(result.outcome).toBe("WARNING");
  });

  it("skips when no mentioned results", () => {
    const ctx = makeCtx({
      scanResults: [
        {
          id: "r1",
          scanRunId: "scan-1",
          status: "APPROVED",
          mentioned: false,
          visibilityScore: 0,
          sentimentScore: 0,
          response: "Response",
          metadata: {},
          citations: [],
        },
      ],
    });
    expect(sourceCitationsPresent(ctx).outcome).toBe("SKIPPED");
  });
});

// ── source.no_empty_domains ────────────────────────────────

describe("sourceNoEmptyDomains", () => {
  it("passes when all citations have domains", () => {
    expect(sourceNoEmptyDomains(makeCtx()).outcome).toBe("PASS");
  });

  it("warns when a citation has a null domain", () => {
    const ctx = makeCtx({
      scanResults: [
        {
          id: "r1",
          scanRunId: "scan-1",
          status: "APPROVED",
          mentioned: true,
          visibilityScore: 50,
          sentimentScore: 0.3,
          response: "Response",
          metadata: {},
          citations: [{ domain: null }, { domain: "example.com" }],
        },
      ],
    });
    const result = sourceNoEmptyDomains(ctx);
    expect(result.outcome).toBe("WARNING");
    expect(result.detail).toContain("1 citation");
  });
});

// ── narrative.summary_has_percentages ──────────────────────

describe("narrativeSummaryHasPercentages", () => {
  it("passes when summary contains percentages", () => {
    expect(narrativeSummaryHasPercentages(makeCtx()).outcome).toBe("PASS");
  });

  it("warns when no percentages in summary", () => {
    const ctx = makeCtx({
      report: {
        id: "r",
        summary: "This is a summary without any numeric data or rates mentioned.",
        metadata: { sections: [{ heading: "A" }, { heading: "B" }] },
      },
    });
    expect(narrativeSummaryHasPercentages(ctx).outcome).toBe("WARNING");
  });
});

// ── narrative.sections_present ─────────────────────────────

describe("narrativeSectionsPresent", () => {
  it("passes when metadata has enough sections", () => {
    expect(narrativeSectionsPresent(makeCtx()).outcome).toBe("PASS");
  });

  it("fails when no sections in metadata", () => {
    const ctx = makeCtx({
      report: { id: "r", summary: "Summary", metadata: { sections: [] } },
    });
    const result = narrativeSectionsPresent(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.severity).toBe("BLOCKING");
  });

  it("fails when metadata is null", () => {
    const ctx = makeCtx({
      report: { id: "r", summary: "Summary", metadata: null },
    });
    expect(narrativeSectionsPresent(ctx).outcome).toBe("FAIL");
  });

  it("fails with only 1 section", () => {
    const ctx = makeCtx({
      report: {
        id: "r",
        summary: "Summary",
        metadata: { sections: [{ heading: "Only one" }] },
      },
    });
    expect(narrativeSectionsPresent(ctx).outcome).toBe("FAIL");
  });
});

// ── competitor.all_in_report ───────────────────────────────

describe("competitorAllInReport", () => {
  it("passes when all competitors appear in report text", () => {
    expect(competitorAllInReport(makeCtx()).outcome).toBe("PASS");
  });

  it("warns when a competitor is missing from report", () => {
    const ctx = makeCtx({
      report: {
        id: "r",
        summary: "Only Acme Corp is mentioned here with 50% visibility.",
        metadata: {
          sections: [{ heading: "Analysis", body: "Acme Corp is the main competitor." }],
        },
      },
      client: {
        name: "TechCorp",
        competitors: [{ name: "Acme Corp" }, { name: "MissingCo" }],
      },
    });
    const result = competitorAllInReport(ctx);
    expect(result.outcome).toBe("WARNING");
    expect(result.detail).toContain("MissingCo");
  });

  it("skips when no competitors", () => {
    const ctx = makeCtx({
      client: { name: "TechCorp", competitors: [] },
    });
    expect(competitorAllInReport(ctx).outcome).toBe("SKIPPED");
  });
});

// ── competitor.mention_data_exists ─────────────────────────

describe("competitorMentionDataExists", () => {
  it("passes when scan results have competitor mention metadata", () => {
    expect(competitorMentionDataExists(makeCtx()).outcome).toBe("PASS");
  });

  it("fails when no competitor metadata in any result", () => {
    const ctx = makeCtx({
      scanResults: [
        {
          id: "r1",
          scanRunId: "scan-1",
          status: "APPROVED",
          mentioned: true,
          visibilityScore: 50,
          sentimentScore: 0.3,
          response: "Response",
          metadata: {}, // no competitorMentions
          citations: [],
        },
      ],
    });
    const result = competitorMentionDataExists(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.severity).toBe("BLOCKING");
  });

  it("skips when no competitors configured", () => {
    const ctx = makeCtx({
      client: { name: "TechCorp", competitors: [] },
    });
    expect(competitorMentionDataExists(ctx).outcome).toBe("SKIPPED");
  });
});

// ── Report-scoped QA context contract ──────────────────────
//
// QA evaluates only the scan results and evidence records that were actually
// linked to the report via ReportEvidence. This scoping is applied by
// buildQAContext (apps/web/.../actions/qa.ts) before the context reaches the
// check functions:
//
//   ReportEvidence.scanEvidenceId
//     → ScanEvidence.scanResultId  (= linked result IDs)
//     → scanResults filtered to those IDs only
//
// The rationale: generateReport fetches APPROVED results only; the scan run
// may also contain CAPTURED, NEEDS_REVIEW, and REJECTED results that were
// intentionally excluded. If QA evaluated all results in the contributing
// scans, evidenceAllApproved would always fail on any scan that had any
// non-approved results, even though those results were never part of the
// report. QA must evaluate the same population the report was built from.
//
// The tests below verify the check logic is correct when given a properly
// scoped context (all approved), fails deterministically on bad data, and
// handles the backward-compatible empty-evidence case.

describe("QA report-scoped context: evidenceAllApproved scoping", () => {
  it("passes when all scan results in context are APPROVED and all evidence is APPROVED", () => {
    // This is the normal post-generation case: buildQAContext filtered to
    // only the APPROVED results that the report was built from.
    const ctx = makeCtx();
    const result = evidenceAllApproved(ctx);
    expect(result.outcome).toBe("PASS");
  });

  it("does NOT fail on non-approved results that are absent from the context", () => {
    // Simulate what buildQAContext produces when a scan also had CAPTURED and
    // NEEDS_REVIEW results: those results are filtered out before QA runs.
    // The context only contains the two APPROVED results from makeCtx().
    // A DRAFT evidence record for a non-linked result is also absent.
    // QA must pass — it has no visibility into the excluded results.
    const ctx = makeCtx({
      // scanResults only contains APPROVED results (the filtered set)
      scanResults: [
        {
          id: "r1",
          scanRunId: "scan-1",
          status: "APPROVED",
          mentioned: true,
          visibilityScore: 72,
          sentimentScore: 0.5,
          response: "TechCorp is a leading employer in the tech industry...",
          metadata: {
            competitorMentions: [
              { name: "Acme Corp", domain: "acme.com", mentioned: true },
              { name: "RivalInc", domain: "rivalinc.com", mentioned: false },
            ],
          },
          citations: [{ domain: "glassdoor.com" }],
        },
      ],
      evidence: [
        { id: "ev1", scanResultId: "r1", status: "APPROVED", confidenceScore: 0.8 },
      ],
    });
    const result = evidenceAllApproved(ctx);
    expect(result.outcome).toBe("PASS");
  });

  it("fails when a non-APPROVED scan result is present in the context (data integrity violation)", () => {
    // buildQAContext should never produce this, but if it does — e.g. a bug
    // in the filtering logic — evidenceAllApproved must catch it as a
    // BLOCKING failure.
    const ctx = makeCtx({
      scanResults: [
        {
          id: "r1",
          scanRunId: "scan-1",
          status: "APPROVED",
          mentioned: true,
          visibilityScore: 72,
          sentimentScore: 0.5,
          response: "Response A",
          metadata: {},
          citations: [],
        },
        {
          id: "r2",
          scanRunId: "scan-1",
          status: "NEEDS_REVIEW",  // should not be in a report-scoped context
          mentioned: false,
          visibilityScore: null,
          sentimentScore: null,
          response: "Response B",
          metadata: {},
          citations: [],
        },
      ],
      evidence: [
        { id: "ev1", scanResultId: "r1", status: "APPROVED", confidenceScore: 0.8 },
      ],
    });
    const result = evidenceAllApproved(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.severity).toBe("BLOCKING");
    expect(result.detail).toMatch(/scan result/i);
    expect(result.actual).toContain("NEEDS_REVIEW");
  });

  it("fails when a linked evidence record is DRAFT (stale link from before the generation fix)", () => {
    // generateReport now only links APPROVED evidence. But stale reports
    // generated before that fix may have DRAFT links. evidenceAllApproved
    // must catch this as a BLOCKING failure.
    const ctx = makeCtx({
      evidence: [
        { id: "ev1", scanResultId: "r1", status: "DRAFT", confidenceScore: 0.7 },
        { id: "ev2", scanResultId: "r2", status: "APPROVED", confidenceScore: 0.6 },
      ],
    });
    const result = evidenceAllApproved(ctx);
    expect(result.outcome).toBe("FAIL");
    expect(result.severity).toBe("BLOCKING");
    expect(result.detail).toMatch(/evidence record/i);
    expect(result.actual).toContain("ev1: DRAFT");
  });

  it("passes with empty evidence when all scan results are APPROVED (backward compat for old reports)", () => {
    // Reports generated before ReportEvidence linking was introduced have no
    // evidence rows. buildQAContext returns an empty evidence array; the scan
    // results are still filtered via linkedResultIds — but since evidence is
    // empty, linkedResultIds is also empty, and linkedResults is empty too.
    // completenessHasResults will catch the empty case as BLOCKING FAIL.
    // evidenceAllApproved itself sees 0 results and 0 evidence — PASS.
    const ctx = makeCtx({ evidence: [], scanResults: [] });
    const result = evidenceAllApproved(ctx);
    expect(result.outcome).toBe("PASS");
  });

  it("completenessHasResults is the blocking gate when no evidence links exist (old report)", () => {
    // When buildQAContext produces an empty scanResults (because there are no
    // ReportEvidence rows to derive linked result IDs from), the run must FAIL
    // via completenessHasResults — not silently pass evidenceAllApproved on
    // the empty set and produce a misleading PASS overall status.
    const ctx = makeCtx({ evidence: [], scanResults: [] });
    const hasResults = completenessHasResults(ctx);
    expect(hasResults.outcome).toBe("FAIL");
    expect(hasResults.severity).toBe("BLOCKING");

    // The full run must also be FAIL
    const runResult = runQAChecks(ctx);
    expect(runResult.status).toBe("FAIL");
  });
});

// ── runQAChecks (orchestrator) ─────────────────────────────

describe("runQAChecks", () => {
  it("returns PASS when all checks pass on clean data", () => {
    const result = runQAChecks(makeCtx());
    expect(result.status).toBe("PASS");
    expect(result.checks.length).toBe(12);
    expect(result.checks.every((c) => c.outcome === "PASS")).toBe(true);
  });

  it("returns FAIL when a BLOCKING check fails", () => {
    const ctx = makeCtx({ scanResults: [] });
    const result = runQAChecks(ctx);
    expect(result.status).toBe("FAIL");
    expect(
      result.checks.some(
        (c) => c.severity === "BLOCKING" && c.outcome === "FAIL",
      ),
    ).toBe(true);
  });

  it("returns CONDITIONAL_PASS when only WARNING-severity checks have issues", () => {
    // All BLOCKING checks pass but summary has no percentages (WARNING)
    const ctx = makeCtx({
      report: {
        id: "r",
        summary:
          "TechCorp appears in most AI responses with moderate visibility and a strong competitive position overall.",
        metadata: {
          scanRunIds: ["scan-1"],
          sections: [
            { heading: "Visibility", body: "TechCorp analysis and Acme Corp and RivalInc..." },
            { heading: "Competitor", body: "Acme Corp and RivalInc comparison..." },
          ],
        },
      },
    });
    const result = runQAChecks(ctx);
    expect(result.status).toBe("CONDITIONAL_PASS");
  });

  it("catches errors in individual checks without crashing the run", () => {
    // Provide a context that might cause issues but the runner should handle it
    const ctx = makeCtx({
      report: {
        id: "r",
        summary: null,
        metadata: null,
      },
    });
    // This should not throw — runner should catch per-check errors
    const result = runQAChecks(ctx);
    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.status).toBe("FAIL"); // null summary and null metadata will cause blocking failures
  });

  it("every check result has the expected shape", () => {
    const result = runQAChecks(makeCtx());
    for (const check of result.checks) {
      expect(check).toHaveProperty("checkKey");
      expect(check).toHaveProperty("category");
      expect(check).toHaveProperty("severity");
      expect(check).toHaveProperty("outcome");
      expect(typeof check.checkKey).toBe("string");
      expect(["BLOCKING", "WARNING", "INFO"]).toContain(check.severity);
      expect(["PASS", "FAIL", "WARNING", "SKIPPED"]).toContain(check.outcome);
    }
  });
});
