import { describe, it, expect } from "vitest";
import { classifyQueryStage } from "../decision-journey/classifier";
import {
  computeJourneyAnalysis,
  classifyPositioning,
  type StageComparisonInput,
} from "../decision-journey/stage-comparison";
import { computeStageConfidence } from "../decision-journey/stage-confidence";
import type { DecisionStage } from "../decision-journey/types";

// ─── Helpers ─────────────────────────────────────────────────

const CLIENT = "Meridian Technologies";
const COMPETITORS = ["Apex Cloud", "NovaBridge"];

function makeResult(
  stage: DecisionStage | null,
  mentioned: boolean,
  overrides: Partial<StageComparisonInput["results"][number]> = {},
): StageComparisonInput["results"][number] {
  return {
    queryId: "q1",
    stage,
    mentioned,
    visibilityScore: mentioned ? 60 : 0,
    sentimentScore: 0.1,
    metadata: null,
    citations: [],
    ...overrides,
  };
}

// ─── classifyQueryStage ───────────────────────────────────────

describe("classifyQueryStage", () => {
  it("classifies generic list query with no company name as DISCOVERY", () => {
    expect(
      classifyQueryStage("best tech companies in Austin", CLIENT, COMPETITORS),
    ).toBe("DISCOVERY");
  });

  it("classifies 'what is it like to work at Meridian' as CONSIDERATION", () => {
    expect(
      classifyQueryStage(
        "what is it like to work at Meridian Technologies",
        CLIENT,
        COMPETITORS,
      ),
    ).toBe("CONSIDERATION");
  });

  it("classifies head-to-head comparison as EVALUATION", () => {
    expect(
      classifyQueryStage(
        "Meridian Technologies vs Apex Cloud for backend engineers",
        CLIENT,
        COMPETITORS,
      ),
    ).toBe("EVALUATION");
  });

  it("classifies 'should I work at Meridian or Apex' as EVALUATION", () => {
    expect(
      classifyQueryStage(
        "should I work at Meridian Technologies or Apex Cloud",
        CLIENT,
        COMPETITORS,
      ),
    ).toBe("EVALUATION");
  });

  it("classifies salary query without company name as DISCOVERY", () => {
    expect(
      classifyQueryStage(
        "senior engineer salary enterprise SaaS",
        CLIENT,
        COMPETITORS,
      ),
    ).toBe("DISCOVERY");
  });

  it("classifies interview process query as COMMITMENT", () => {
    expect(
      classifyQueryStage(
        "Meridian Technologies interview process",
        CLIENT,
        COMPETITORS,
      ),
    ).toBe("COMMITMENT");
  });

  it("classifies company with comparison compensation terms as EVALUATION", () => {
    expect(
      classifyQueryStage(
        "Meridian Technologies compensation compared to competitors",
        CLIENT,
        COMPETITORS,
      ),
    ).toBe("EVALUATION");
  });

  it("classifies generic hiring process query (no company) as DISCOVERY", () => {
    expect(
      classifyQueryStage(
        "hiring process at tech companies",
        CLIENT,
        COMPETITORS,
      ),
    ).toBe("DISCOVERY");
  });

  it("classifies onboarding query as COMMITMENT", () => {
    expect(
      classifyQueryStage(
        "Meridian Technologies onboarding experience",
        CLIENT,
        COMPETITORS,
      ),
    ).toBe("COMMITMENT");
  });

  it("classifies empty string as DISCOVERY (fallback)", () => {
    expect(classifyQueryStage("", CLIENT, COMPETITORS)).toBe("DISCOVERY");
  });

  it("classifies company name + competitor name as EVALUATION (two companies)", () => {
    expect(
      classifyQueryStage(
        "Meridian Technologies and NovaBridge culture",
        CLIENT,
        COMPETITORS,
      ),
    ).toBe("EVALUATION");
  });

  it("classifies 'how to get hired at Meridian' as COMMITMENT", () => {
    expect(
      classifyQueryStage(
        "how to get hired at Meridian Technologies as a backend engineer",
        CLIENT,
        COMPETITORS,
      ),
    ).toBe("COMMITMENT");
  });
});

// ─── classifyPositioning ─────────────────────────────────────

describe("classifyPositioning", () => {
  it("returns INVISIBLE when mention rate is below 0.2", () => {
    expect(classifyPositioning(0.1, 50, 0.2)).toBe("INVISIBLE");
  });

  it("returns INVISIBLE at mention rate 0", () => {
    expect(classifyPositioning(0, 0, 0)).toBe("INVISIBLE");
  });

  it("returns CAUTIONARY when sentiment is negative (even with decent rate)", () => {
    expect(classifyPositioning(0.3, 40, -0.5)).toBe("CAUTIONARY");
  });

  it("returns PERIPHERAL when rate is low (0.3) but sentiment is neutral", () => {
    expect(classifyPositioning(0.3, 40, 0.1)).toBe("PERIPHERAL");
  });

  it("returns PERIPHERAL when visibility is low even with acceptable rate", () => {
    expect(classifyPositioning(0.5, 20, 0.1)).toBe("PERIPHERAL");
  });

  it("returns CHAMPION at high rate, visibility, and sentiment", () => {
    expect(classifyPositioning(0.8, 70, 0.5)).toBe("CHAMPION");
  });

  it("returns CONTENDER at moderate rate and positive sentiment", () => {
    expect(classifyPositioning(0.5, 50, 0.1)).toBe("CONTENDER");
  });

  it("returns CONTENDER at exactly 0.7 rate but below sentiment threshold", () => {
    // mentionRate 0.7, visibility 60, sentiment 0.1 — does NOT meet CHAMPION (sentiment <= 0.2)
    expect(classifyPositioning(0.7, 60, 0.1)).toBe("CONTENDER");
  });
});

// ─── computeJourneyAnalysis ───────────────────────────────────

describe("computeJourneyAnalysis", () => {
  it("computes correct per-stage mention rates for one result per stage", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("DISCOVERY", true),
        makeResult("CONSIDERATION", true),
        makeResult("EVALUATION", false),
        makeResult("COMMITMENT", true),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);

    expect(analysis.stages).toHaveLength(4);

    const disc = analysis.stages.find((s) => s.stage === "DISCOVERY")!;
    expect(disc.mentionRate).toBe(1);

    const eval_ = analysis.stages.find((s) => s.stage === "EVALUATION")!;
    expect(eval_.mentionRate).toBe(0);
  });

  it("only includes stages with results", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [makeResult("DISCOVERY", true), makeResult("DISCOVERY", false)],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);
    expect(analysis.stages).toHaveLength(1);
    expect(analysis.stages[0].stage).toBe("DISCOVERY");
    expect(analysis.stages[0].mentionRate).toBe(0.5);
  });

  it("returns empty stages array when no results have a stage", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [makeResult(null, true), makeResult(null, false)],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);
    expect(analysis.stages).toHaveLength(0);
    expect(analysis.funnelThroughput).toBe(0);
    expect(analysis.criticalGapStage).toBeNull();
  });

  it("computes funnel throughput as the product of all stage mention rates", () => {
    // 0.5 × 0.67 × 0.17 × 0.83 ≈ 0.047
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        // DISCOVERY: 3/6 = 0.5
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", false),
        makeResult("DISCOVERY", false),
        makeResult("DISCOVERY", false),
        // CONSIDERATION: 4/6 ≈ 0.667
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", false),
        makeResult("CONSIDERATION", false),
        // EVALUATION: 1/6 ≈ 0.167
        makeResult("EVALUATION", true),
        makeResult("EVALUATION", false),
        makeResult("EVALUATION", false),
        makeResult("EVALUATION", false),
        makeResult("EVALUATION", false),
        makeResult("EVALUATION", false),
        // COMMITMENT: 5/6 ≈ 0.833
        makeResult("COMMITMENT", true),
        makeResult("COMMITMENT", true),
        makeResult("COMMITMENT", true),
        makeResult("COMMITMENT", true),
        makeResult("COMMITMENT", true),
        makeResult("COMMITMENT", false),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);

    const disc = analysis.stages.find((s) => s.stage === "DISCOVERY")!;
    expect(disc.mentionRate).toBeCloseTo(0.5, 2);

    const consid = analysis.stages.find((s) => s.stage === "CONSIDERATION")!;
    expect(consid.mentionRate).toBeCloseTo(4 / 6, 2);

    const eval_ = analysis.stages.find((s) => s.stage === "EVALUATION")!;
    expect(eval_.mentionRate).toBeCloseTo(1 / 6, 2);

    const commit = analysis.stages.find((s) => s.stage === "COMMITMENT")!;
    expect(commit.mentionRate).toBeCloseTo(5 / 6, 2);

    // Throughput
    const expected = (3 / 6) * (4 / 6) * (1 / 6) * (5 / 6);
    expect(analysis.funnelThroughput).toBeCloseTo(expected, 3);
  });

  it("identifies the critical gap stage as the one below 0.3 mention rate", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", true),
        // EVALUATION: 1/5 = 0.2 — below 0.3 threshold
        makeResult("EVALUATION", true),
        makeResult("EVALUATION", false),
        makeResult("EVALUATION", false),
        makeResult("EVALUATION", false),
        makeResult("EVALUATION", false),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);
    expect(analysis.criticalGapStage).toBe("EVALUATION");
  });

  it("returns null criticalGapStage when all stages are above threshold", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", true),
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", false),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);
    // DISCOVERY: 1.0, CONSIDERATION: 0.5 — both >= 0.3
    expect(analysis.criticalGapStage).toBeNull();
  });

  it("populates gapDomains only for domains where client is NEVER mentioned", () => {
    // gapDomains is strict: a domain is a gap ONLY if the client was never
    // mentioned in any response citing that domain. If the client appears in
    // at least one response citing the domain, the domain is NOT a gap —
    // the client has a presence on that platform, the absence in other queries
    // is a query-specific miss, not a platform data gap.
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("DISCOVERY", false, {
          citations: [{ domain: "levels.fyi" }, { domain: "glassdoor.com" }],
        }),
        makeResult("DISCOVERY", true, {
          citations: [{ domain: "glassdoor.com" }, { domain: "linkedin.com" }],
        }),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);
    const disc = analysis.stages.find((s) => s.stage === "DISCOVERY")!;

    // levels.fyi only appears in client-absent result → gap domain
    expect(disc.gapDomains).toContain("levels.fyi");
    // glassdoor.com appears in a client-present result → NOT a gap domain,
    // because the client clearly has presence on glassdoor.com even though
    // it was absent from one query citing it.
    expect(disc.gapDomains).not.toContain("glassdoor.com");
    // linkedin.com only appears in client-present result → NOT a gap domain
    expect(disc.gapDomains).not.toContain("linkedin.com");
    // citedDomains includes all domains seen in this stage
    expect(disc.citedDomains).toContain("linkedin.com");
    expect(disc.citedDomains).toContain("glassdoor.com");
    expect(disc.citedDomains).toContain("levels.fyi");
  });

  it("computes positioning tiers per stage", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        // 0 mentions out of 6 → mentionRate 0 → INVISIBLE
        makeResult("DISCOVERY", false, {
          visibilityScore: 0,
          sentimentScore: 0,
        }),
        makeResult("DISCOVERY", false, {
          visibilityScore: 0,
          sentimentScore: 0,
        }),
        makeResult("DISCOVERY", false, {
          visibilityScore: 0,
          sentimentScore: 0,
        }),
        makeResult("DISCOVERY", false, {
          visibilityScore: 0,
          sentimentScore: 0,
        }),
        makeResult("DISCOVERY", false, {
          visibilityScore: 0,
          sentimentScore: 0,
        }),
        makeResult("DISCOVERY", false, {
          visibilityScore: 0,
          sentimentScore: 0,
        }),
        // All 4 mentioned, avgVisibility = 70, avgSentiment = 0.4 → CHAMPION
        // CHAMPION requires: mentionRate >= 0.7, avgVisibility >= 60, avgSentiment > 0.2
        makeResult("COMMITMENT", true, {
          visibilityScore: 70,
          sentimentScore: 0.4,
        }),
        makeResult("COMMITMENT", true, {
          visibilityScore: 70,
          sentimentScore: 0.4,
        }),
        makeResult("COMMITMENT", true, {
          visibilityScore: 70,
          sentimentScore: 0.4,
        }),
        makeResult("COMMITMENT", true, {
          visibilityScore: 70,
          sentimentScore: 0.4,
        }),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);

    const disc = analysis.stages.find((s) => s.stage === "DISCOVERY")!;
    expect(disc.positioning).toBe("INVISIBLE");

    // mentionRate = 4/4 = 1.0, avgVisibility = 70, avgSentiment = 0.4 → CHAMPION
    const commit = analysis.stages.find((s) => s.stage === "COMMITMENT")!;
    expect(commit.positioning).toBe("CHAMPION");
  });
});

// ─── earned visibility classification ────────────────────────

describe("earnedVisibilityRate and classification", () => {
  it("high Consideration rate does not inflate earnedVisibilityRate", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        // DISCOVERY: 1/5 = 0.2
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", false),
        makeResult("DISCOVERY", false),
        makeResult("DISCOVERY", false),
        makeResult("DISCOVERY", false),
        // CONSIDERATION: 4/5 = 0.8
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", false),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);

    // Earned rate should equal Discovery rate only (0.2), not be inflated by Consideration
    expect(analysis.earnedVisibilityRate).toBeCloseTo(0.2, 5);
    expect(analysis.earnedVisibilityTier).toBe("weak");
  });

  it("earnedVisibilityRate uses only Discovery (not Evaluation, which is prompted)", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        // DISCOVERY: 2/4 = 0.5
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", false),
        makeResult("DISCOVERY", false),
        // EVALUATION: 3/4 = 0.75 — should NOT affect earnedVisibilityRate
        makeResult("EVALUATION", true),
        makeResult("EVALUATION", true),
        makeResult("EVALUATION", true),
        makeResult("EVALUATION", false),
        // CONSIDERATION: 4/4 = 1.0 — should not affect earnedVisibilityRate
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", true),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);

    // Earned = Discovery only = 0.5
    expect(analysis.earnedVisibilityRate).toBeCloseTo(0.5, 5);
    expect(analysis.earnedVisibilityTier).toBe("strong");

    expect(analysis.visibility?.earnedMentionRate).toBeCloseTo(0.5, 5);
    expect(analysis.visibility?.earnedStages).toContain("DISCOVERY");
    expect(analysis.visibility?.earnedStages).not.toContain("EVALUATION");
    expect(analysis.visibility?.positioningStages).toContain("CONSIDERATION");
  });

  it("earnedVisibilityRate equals Discovery rate when only Discovery has data", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", false),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);

    // Only DISCOVERY: 2/3
    expect(analysis.earnedVisibilityRate).toBeCloseTo(2 / 3, 5);
    expect(analysis.visibility?.earnedStages).toEqual(["DISCOVERY"]);
    expect(analysis.visibility?.positioningStages).toEqual([]);
  });

  it("earnedVisibilityRate is 0 when only Consideration and Commitment have data", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("CONSIDERATION", true),
        makeResult("CONSIDERATION", true),
        makeResult("COMMITMENT", true),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);

    expect(analysis.earnedVisibilityRate).toBe(0);
    expect(analysis.earnedVisibilityTier).toBe("invisible");
    expect(analysis.visibility?.earnedStages).toEqual([]);
    expect(analysis.visibility?.positioningStages).toContain("CONSIDERATION");
    expect(analysis.visibility?.positioningStages).toContain("COMMITMENT");
  });

  it("earnedVisibilityTier thresholds", () => {
    function tierFrom(rate: number): string {
      const input: StageComparisonInput = {
        clientName: CLIENT,
        results: [
          // Use 100 results to get a precise rate
          ...Array.from({ length: Math.round(rate * 100) }, () =>
            makeResult("DISCOVERY", true),
          ),
          ...Array.from({ length: 100 - Math.round(rate * 100) }, () =>
            makeResult("DISCOVERY", false),
          ),
        ],
        competitors: [],
      };
      return computeJourneyAnalysis(input).earnedVisibilityTier!;
    }

    expect(tierFrom(0.5)).toBe("strong");
    expect(tierFrom(0.6)).toBe("strong");
    expect(tierFrom(0.3)).toBe("moderate");
    expect(tierFrom(0.45)).toBe("moderate");
    expect(tierFrom(0.15)).toBe("weak");
    expect(tierFrom(0.25)).toBe("weak");
    expect(tierFrom(0.0)).toBe("invisible");
    expect(tierFrom(0.1)).toBe("invisible");
  });

  it("StageVisibility metricType is 'visibility' for DISCOVERY and EVALUATION", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("DISCOVERY", true),
        makeResult("EVALUATION", false),
        makeResult("CONSIDERATION", true),
        makeResult("COMMITMENT", true),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);

    const disc = analysis.stages.find((s) => s.stage === "DISCOVERY")!;
    const eval_ = analysis.stages.find((s) => s.stage === "EVALUATION")!;
    const consid = analysis.stages.find((s) => s.stage === "CONSIDERATION")!;
    const commit = analysis.stages.find((s) => s.stage === "COMMITMENT")!;

    expect(disc.metricType).toBe("visibility");
    // Evaluation queries typically name the company, making them prompted — not earned
    expect(eval_.metricType).toBe("positioning");
    expect(consid.metricType).toBe("positioning");
    expect(commit.metricType).toBe("positioning");
  });
});

// ─── sourcedRate ─────────────────────────────────────────────

describe("sourcedRate in StageVisibility", () => {
  it("returns sourcedRate = 0 when no results have citations", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("DISCOVERY", true),
        makeResult("DISCOVERY", false),
        makeResult("DISCOVERY", false),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);
    const disc = analysis.stages.find((s) => s.stage === "DISCOVERY")!;

    expect(disc.sourcedRate).toBe(0);
  });

  it("returns sourcedRate = 1 when all results have citations", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("DISCOVERY", true, {
          citations: [{ domain: "glassdoor.com" }],
        }),
        makeResult("DISCOVERY", false, {
          citations: [{ domain: "levels.fyi" }],
        }),
        makeResult("DISCOVERY", false, {
          citations: [{ domain: "linkedin.com" }],
        }),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);
    const disc = analysis.stages.find((s) => s.stage === "DISCOVERY")!;

    expect(disc.sourcedRate).toBe(1);
  });

  it("returns the correct fraction for mixed citation coverage", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("CONSIDERATION", true, {
          citations: [{ domain: "glassdoor.com" }],
        }),
        makeResult("CONSIDERATION", true, {
          citations: [{ domain: "linkedin.com" }],
        }),
        makeResult("CONSIDERATION", false), // no citations
        makeResult("CONSIDERATION", false), // no citations
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);
    const consid = analysis.stages.find((s) => s.stage === "CONSIDERATION")!;

    // 2 of 4 results have citations → 0.5
    expect(consid.sourcedRate).toBeCloseTo(0.5, 5);
  });

  it("computes sourcedRate independently per stage", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        // DISCOVERY: 1/2 = 0.5
        makeResult("DISCOVERY", true, {
          citations: [{ domain: "glassdoor.com" }],
        }),
        makeResult("DISCOVERY", false),
        // EVALUATION: 0/2 = 0
        makeResult("EVALUATION", true),
        makeResult("EVALUATION", false),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);
    const disc = analysis.stages.find((s) => s.stage === "DISCOVERY")!;
    const eval_ = analysis.stages.find((s) => s.stage === "EVALUATION")!;

    expect(disc.sourcedRate).toBeCloseTo(0.5, 5);
    expect(eval_.sourcedRate).toBe(0);
  });

  it("sourcedRate flows through to JourneyAnalysis stages array", () => {
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [
        makeResult("DISCOVERY", true, {
          citations: [{ domain: "glassdoor.com" }],
        }),
        makeResult("DISCOVERY", true, {
          citations: [{ domain: "linkedin.com" }],
        }),
        makeResult("DISCOVERY", false),
        makeResult("DISCOVERY", false),
      ],
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);

    expect(analysis.stages).toHaveLength(1);
    const disc = analysis.stages[0];
    // 2 of 4 have citations → 0.5
    expect(disc.sourcedRate).toBeCloseTo(0.5, 5);
  });

  it("sourcedRate = 0 when stage has no results (empty stage check via no-stage filter)", () => {
    // Stages with 0 results are excluded from the output, so there is no zero-result
    // sourcedRate case — the guard in computeStageVisibility handles the division:
    // n > 0 ? withCitations / n : 0
    const input: StageComparisonInput = {
      clientName: CLIENT,
      results: [], // no results at all
      competitors: [],
    };

    const analysis = computeJourneyAnalysis(input);
    // No stages with results means no stage entries
    expect(analysis.stages).toHaveLength(0);
  });
});

// ─── computeStageConfidence ───────────────────────────────────

describe("computeStageConfidence", () => {
  it("returns a LOW-ish confidence score for 6 results out of 36 total queries", () => {
    const results = Array.from({ length: 6 }, (_, i) => ({
      mentioned: i % 2 === 0,
      visibilityScore: i % 2 === 0 ? 60 : null,
      sentimentScore: i % 2 === 0 ? 0.2 : null,
      citationCount: 1,
      responseLength: 200,
    }));

    const confidence = computeStageConfidence(results, 1, 36);

    // With scanCompleteness = 6/36 ≈ 0.17, the incomplete_scan penalty fires.
    // Score should be <= MEDIUM ceiling (70).
    expect(confidence.score).toBeLessThanOrEqual(70);
    expect(["LOW", "MEDIUM"]).toContain(confidence.tier);
    expect(confidence.penalties.length).toBeGreaterThan(0);
  });

  it("returns higher confidence for 20 results out of 36 total queries", () => {
    const results = Array.from({ length: 20 }, (_, i) => ({
      mentioned: i % 3 !== 0, // ~67% mentioned
      visibilityScore: 55,
      sentimentScore: 0.1,
      citationCount: 2,
      responseLength: 400,
    }));

    const confidence6 = computeStageConfidence(
      results.slice(0, 6),
      1,
      36,
    );
    const confidence20 = computeStageConfidence(results, 1, 36);

    // 20 results should score higher than 6
    expect(confidence20.score).toBeGreaterThan(confidence6.score);
  });

  it("handles 0 results without throwing", () => {
    expect(() => computeStageConfidence([], 1, 36)).not.toThrow();
    const confidence = computeStageConfidence([], 1, 36);
    expect(confidence.score).toBeGreaterThanOrEqual(0);
    expect(confidence.score).toBeLessThanOrEqual(100);
  });
});
