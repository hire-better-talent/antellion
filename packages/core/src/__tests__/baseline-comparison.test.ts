import { describe, it, expect } from "vitest";
import {
  computeBaselineComparison,
  type BaselineSnapshot,
} from "../baseline-comparison";

// ─── Helpers ────────────────────────────────────────────────

function makeSnapshot(
  overrides: Partial<BaselineSnapshot> = {},
): BaselineSnapshot {
  return {
    earnedVisibilityRate: 0.03,
    discoveryMentionRate: 0.0,
    evaluationMentionRate: 0.05,
    considerationMentionRate: 0.6,
    commitmentMentionRate: 0.5,
    overallMentionRate: 0.15,
    avgSentiment: 0.2,
    topCompetitorName: "Apex Cloud",
    topCompetitorRate: 0.48,
    competitorGapPp: -45,
    totalGapDomains: 8,
    employerGapDomains: 5,
    overallPositioning: "INVISIBLE",
    queryCount: 30,
    assessmentDate: new Date("2026-01-15"),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────

describe("computeBaselineComparison", () => {
  it("detects meaningful improvement in earned visibility", () => {
    const prev = makeSnapshot({ earnedVisibilityRate: 0.03 });
    const curr = makeSnapshot({
      earnedVisibilityRate: 0.18,
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    const evChange = result.changes.find(
      (c) => c.metric === "earnedVisibilityRate",
    );

    expect(evChange).toBeDefined();
    expect(evChange!.changeDirection).toBe("improved");
    expect(evChange!.significance).toBe("meaningful");
    expect(evChange!.changePp).toBe(15);
  });

  it("detects unchanged metric when change is less than 2pp", () => {
    const prev = makeSnapshot({ overallMentionRate: 0.15 });
    const curr = makeSnapshot({
      overallMentionRate: 0.16,
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    const change = result.changes.find(
      (c) => c.metric === "overallMentionRate",
    );

    expect(change).toBeDefined();
    expect(change!.significance).toBe("unchanged");
  });

  it("detects marginal change (2-4pp)", () => {
    const prev = makeSnapshot({ discoveryMentionRate: 0.10 });
    const curr = makeSnapshot({
      discoveryMentionRate: 0.13,
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    const change = result.changes.find(
      (c) => c.metric === "discoveryMentionRate",
    );

    expect(change).toBeDefined();
    expect(change!.significance).toBe("marginal");
    expect(change!.changePp).toBe(3);
  });

  it("returns overallDirection 'improved' when all meaningful changes are improvements", () => {
    const prev = makeSnapshot({
      earnedVisibilityRate: 0.03,
      discoveryMentionRate: 0.0,
      evaluationMentionRate: 0.05,
      competitorGapPp: -45,
      totalGapDomains: 8,
      overallPositioning: "INVISIBLE",
    });
    const curr = makeSnapshot({
      earnedVisibilityRate: 0.18,
      discoveryMentionRate: 0.12,
      evaluationMentionRate: 0.15,
      competitorGapPp: -30,
      totalGapDomains: 5,
      overallPositioning: "PERIPHERAL",
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.overallDirection).toBe("improved");
  });

  it("returns overallDirection 'mixed' when some metrics improve and others decline", () => {
    const prev = makeSnapshot({
      earnedVisibilityRate: 0.18,
      discoveryMentionRate: 0.12,
      totalGapDomains: 5,
    });
    const curr = makeSnapshot({
      earnedVisibilityRate: 0.25,
      discoveryMentionRate: 0.03, // declined
      totalGapDomains: 2, // improved
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.overallDirection).toBe("mixed");
  });

  it("returns overallDirection 'declined' when all meaningful changes are declines", () => {
    const prev = makeSnapshot({
      earnedVisibilityRate: 0.25,
      discoveryMentionRate: 0.20,
      overallPositioning: "CONTENDER",
    });
    const curr = makeSnapshot({
      earnedVisibilityRate: 0.08,
      discoveryMentionRate: 0.05,
      overallPositioning: "INVISIBLE",
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.overallDirection).toBe("declined");
  });

  it("returns overallDirection 'unchanged' when no meaningful changes", () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.overallDirection).toBe("unchanged");
  });

  it("handles null values in previous snapshot gracefully", () => {
    const prev = makeSnapshot({
      discoveryMentionRate: null,
      evaluationMentionRate: null,
      avgSentiment: null,
      topCompetitorName: null,
      topCompetitorRate: null,
      competitorGapPp: null,
    });
    const curr = makeSnapshot({
      discoveryMentionRate: 0.12,
      evaluationMentionRate: 0.15,
      avgSentiment: 0.3,
      topCompetitorName: "Apex Cloud",
      topCompetitorRate: 0.48,
      competitorGapPp: -30,
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);

    // Should not throw, and should produce a valid comparison
    expect(result.changes.length).toBeGreaterThan(0);

    // Discovery should be "new" since previous was null
    const discChange = result.changes.find(
      (c) => c.metric === "discoveryMentionRate",
    );
    expect(discChange).toBeDefined();
    expect(discChange!.changeDirection).toBe("new");
  });

  it("handles both null values for a metric gracefully", () => {
    const prev = makeSnapshot({
      discoveryMentionRate: null,
    });
    const curr = makeSnapshot({
      discoveryMentionRate: null,
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);

    // discoveryMentionRate should not appear at all since both are null
    const discChange = result.changes.find(
      (c) => c.metric === "discoveryMentionRate",
    );
    expect(discChange).toBeUndefined();
  });

  it("produces a non-empty summary narrative referencing specific metrics", () => {
    const prev = makeSnapshot({ earnedVisibilityRate: 0.03 });
    const curr = makeSnapshot({
      earnedVisibilityRate: 0.18,
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);

    expect(result.summary).toBeTruthy();
    expect(result.summary.length).toBeGreaterThan(10);
    // Should mention earned visibility since it changed meaningfully
    expect(result.summary.toLowerCase()).toContain("visibility");
  });

  it("produces a fallback summary when no meaningful changes", () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.summary).toContain("No meaningful changes");
  });

  it("computes daysBetween correctly", () => {
    const prev = makeSnapshot({
      assessmentDate: new Date("2026-01-15"),
    });
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.daysBetween).toBe(77);
  });

  it("computes daysBetween as 0 for same-day assessments", () => {
    const date = new Date("2026-03-15");
    const prev = makeSnapshot({ assessmentDate: date });
    const curr = makeSnapshot({ assessmentDate: date });

    const result = computeBaselineComparison(prev, curr);
    expect(result.daysBetween).toBe(0);
  });

  it("detects improved positioning tier", () => {
    const prev = makeSnapshot({ overallPositioning: "INVISIBLE" });
    const curr = makeSnapshot({
      overallPositioning: "PERIPHERAL",
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    const posChange = result.changes.find(
      (c) => c.metric === "overallPositioning",
    );

    expect(posChange).toBeDefined();
    expect(posChange!.changeDirection).toBe("improved");
    expect(posChange!.significance).toBe("meaningful");
  });

  it("detects declined positioning tier", () => {
    const prev = makeSnapshot({ overallPositioning: "CONTENDER" });
    const curr = makeSnapshot({
      overallPositioning: "INVISIBLE",
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    const posChange = result.changes.find(
      (c) => c.metric === "overallPositioning",
    );

    expect(posChange).toBeDefined();
    expect(posChange!.changeDirection).toBe("declined");
  });

  it("detects improved competitor gap (less negative)", () => {
    const prev = makeSnapshot({ competitorGapPp: -45 });
    const curr = makeSnapshot({
      competitorGapPp: -30,
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    const gapChange = result.changes.find(
      (c) => c.metric === "competitorGapPp",
    );

    expect(gapChange).toBeDefined();
    expect(gapChange!.changeDirection).toBe("improved");
    expect(gapChange!.changePp).toBe(15);
  });

  it("detects citation gaps closed as improvement", () => {
    const prev = makeSnapshot({ totalGapDomains: 8 });
    const curr = makeSnapshot({
      totalGapDomains: 5,
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    const citChange = result.changes.find(
      (c) => c.metric === "totalGapDomains",
    );

    expect(citChange).toBeDefined();
    expect(citChange!.changeDirection).toBe("improved");
    // 3 gaps closed is meaningful (>= 3 threshold)
    expect(citChange!.significance).toBe("meaningful");
  });

  it("treats 1-2 gap change as marginal", () => {
    const prev = makeSnapshot({ totalGapDomains: 8 });
    const curr = makeSnapshot({
      totalGapDomains: 7,
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    const citChange = result.changes.find(
      (c) => c.metric === "totalGapDomains",
    );

    expect(citChange).toBeDefined();
    expect(citChange!.significance).toBe("marginal");
  });

  it("includes both previous and current snapshots in result", () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.previous).toBe(prev);
    expect(result.current).toBe(curr);
  });

  it("narrative mentions citation gaps when they were closed", () => {
    const prev = makeSnapshot({
      earnedVisibilityRate: 0.03,
      totalGapDomains: 8,
    });
    const curr = makeSnapshot({
      earnedVisibilityRate: 0.18,
      totalGapDomains: 5,
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.summary.toLowerCase()).toContain("citation gap");
  });

  it("narrative mentions positioning when it changes", () => {
    const prev = makeSnapshot({ overallPositioning: "INVISIBLE" });
    const curr = makeSnapshot({
      overallPositioning: "PERIPHERAL",
      assessmentDate: new Date("2026-04-02"),
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.summary.toLowerCase()).toContain("positioning");
  });

  // ─── Stability baseline tests ──────────────────────────────

  it("comparison works without stability data on either snapshot", () => {
    // Existing baselines have no stabilityDistribution or validatedQueryRate
    const prev = makeSnapshot();
    const curr = makeSnapshot({ assessmentDate: new Date("2026-04-02") });

    const result = computeBaselineComparison(prev, curr);

    // Should not throw and should produce no stability metric changes
    const stabilityChange = result.changes.find(
      (c) => c.metric === "stablePresenceQueries",
    );
    const validationChange = result.changes.find(
      (c) => c.metric === "validationCoverage",
    );
    expect(stabilityChange).toBeUndefined();
    expect(validationChange).toBeUndefined();
  });

  it("gracefully skips stability comparison when only one snapshot has stability data", () => {
    // prev has no stability data; curr does — asymmetric case from first multi-run report
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
      stabilityDistribution: {
        STABLE_PRESENCE: 12,
        VOLATILE_PRESENCE: 6,
        STABLE_ABSENCE: 8,
        UNVALIDATED: 4,
      },
      validatedQueryRate: 0.75,
    });

    const result = computeBaselineComparison(prev, curr);

    const stabilityChange = result.changes.find(
      (c) => c.metric === "stablePresenceQueries",
    );
    expect(stabilityChange).toBeUndefined();
  });

  it("computes correct stable presence count change when both snapshots have stability data", () => {
    const prev = makeSnapshot({
      stabilityDistribution: {
        STABLE_PRESENCE: 8,
        VOLATILE_PRESENCE: 10,
        STABLE_ABSENCE: 7,
        UNVALIDATED: 5,
      },
      validatedQueryRate: 0.6,
    });
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
      stabilityDistribution: {
        STABLE_PRESENCE: 14,
        VOLATILE_PRESENCE: 7,
        STABLE_ABSENCE: 5,
        UNVALIDATED: 4,
      },
      validatedQueryRate: 0.8,
    });

    const result = computeBaselineComparison(prev, curr);

    const stableChange = result.changes.find(
      (c) => c.metric === "stablePresenceQueries",
    );
    expect(stableChange).toBeDefined();
    expect(stableChange!.previous).toBe(8);
    expect(stableChange!.current).toBe(14);
    expect(stableChange!.changePp).toBe(6);
    expect(stableChange!.changeDirection).toBe("improved");
    expect(stableChange!.significance).toBe("meaningful");

    const validationChange = result.changes.find(
      (c) => c.metric === "validationCoverage",
    );
    expect(validationChange).toBeDefined();
    expect(validationChange!.changePp).toBe(20); // 80% - 60% = 20pp
    expect(validationChange!.changeDirection).toBe("improved");
  });

  it("generates positive stability narrative when stable presence increases", () => {
    const prev = makeSnapshot({
      stabilityDistribution: {
        STABLE_PRESENCE: 5,
        VOLATILE_PRESENCE: 12,
        STABLE_ABSENCE: 8,
        UNVALIDATED: 5,
      },
      validatedQueryRate: 0.5,
    });
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
      // Meaningful jump in stable presence, visible improvement
      earnedVisibilityRate: 0.25,
      stabilityDistribution: {
        STABLE_PRESENCE: 12,
        VOLATILE_PRESENCE: 8,
        STABLE_ABSENCE: 6,
        UNVALIDATED: 4,
      },
      validatedQueryRate: 0.75,
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.summary.toLowerCase()).toContain("stable visibility improved");
  });

  it("generates concern narrative when stable absence increases meaningfully", () => {
    const prev = makeSnapshot({
      stabilityDistribution: {
        STABLE_PRESENCE: 10,
        VOLATILE_PRESENCE: 8,
        STABLE_ABSENCE: 4,
        UNVALIDATED: 8,
      },
      validatedQueryRate: 0.6,
    });
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
      stabilityDistribution: {
        STABLE_PRESENCE: 10,
        VOLATILE_PRESENCE: 5,
        STABLE_ABSENCE: 9, // +5 — meaningful gap growth
        UNVALIDATED: 6,
      },
      validatedQueryRate: 0.7,
    });

    const result = computeBaselineComparison(prev, curr);
    expect(result.summary.toLowerCase()).toContain("persistent gaps");
  });

  it("classifies stable presence change of 1-2 as marginal", () => {
    const prev = makeSnapshot({
      stabilityDistribution: {
        STABLE_PRESENCE: 10,
        VOLATILE_PRESENCE: 8,
        STABLE_ABSENCE: 6,
        UNVALIDATED: 6,
      },
      validatedQueryRate: 0.7,
    });
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
      stabilityDistribution: {
        STABLE_PRESENCE: 12, // +2 — marginal
        VOLATILE_PRESENCE: 7,
        STABLE_ABSENCE: 5,
        UNVALIDATED: 6,
      },
      validatedQueryRate: 0.72,
    });

    const result = computeBaselineComparison(prev, curr);
    const stableChange = result.changes.find(
      (c) => c.metric === "stablePresenceQueries",
    );
    expect(stableChange).toBeDefined();
    expect(stableChange!.changePp).toBe(2);
    expect(stableChange!.significance).toBe("marginal");
  });

  it("classifies stable presence change of >=3 as meaningful", () => {
    const prev = makeSnapshot({
      stabilityDistribution: {
        STABLE_PRESENCE: 5,
        VOLATILE_PRESENCE: 10,
        STABLE_ABSENCE: 8,
        UNVALIDATED: 7,
      },
      validatedQueryRate: 0.5,
    });
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
      stabilityDistribution: {
        STABLE_PRESENCE: 9, // +4 — meaningful
        VOLATILE_PRESENCE: 8,
        STABLE_ABSENCE: 7,
        UNVALIDATED: 6,
      },
      validatedQueryRate: 0.6,
    });

    const result = computeBaselineComparison(prev, curr);
    const stableChange = result.changes.find(
      (c) => c.metric === "stablePresenceQueries",
    );
    expect(stableChange).toBeDefined();
    expect(stableChange!.changePp).toBe(4);
    expect(stableChange!.significance).toBe("meaningful");
  });

  it("generates volatile improvement narrative when volatile presence drops meaningfully", () => {
    const prev = makeSnapshot({
      stabilityDistribution: {
        STABLE_PRESENCE: 10,
        VOLATILE_PRESENCE: 15,
        STABLE_ABSENCE: 3,
        UNVALIDATED: 2,
      },
      validatedQueryRate: 0.85,
    });
    const curr = makeSnapshot({
      assessmentDate: new Date("2026-04-02"),
      stabilityDistribution: {
        STABLE_PRESENCE: 10,
        VOLATILE_PRESENCE: 9,  // -6, meaningful drop
        STABLE_ABSENCE: 3,
        UNVALIDATED: 8,
      },
      validatedQueryRate: 0.7,
    });

    const result = computeBaselineComparison(prev, curr);
    // Volatile drop without stable presence increase → "stability strengthened" narrative
    expect(result.summary.toLowerCase()).toContain("stability strengthened");
  });
});
