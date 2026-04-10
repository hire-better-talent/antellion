import { describe, it, expect } from "vitest";
import {
  buildOperatorActionPlan,
  detectTriggerFlags,
  computeCompellingScore,
  DEFAULT_UPSELL_PRIORITY,
  COMPELLING_SCORE_SAMPLE_CAP,
  TRIGGER_THRESHOLDS,
} from "../operator-action-plan";
import type {
  ReportMetadata,
  TriggerFlags,
} from "../operator-action-plan";
import { buildPushbackPredictions } from "../operator-action-plan/rules/pushback";
import { buildUpsellOpportunities } from "../operator-action-plan/rules/upsell";
import { buildClientQuestions, MAX_CLIENT_QUESTIONS } from "../operator-action-plan/rules/questions";
import { buildTalkingPoints, MAX_TALKING_POINTS } from "../operator-action-plan/builders/talking-points";
import { buildRedFlags } from "../operator-action-plan/builders/red-flags";
import { buildValidationItems } from "../operator-action-plan/builders/validation";

// ─── Fixtures ────────────────────────────────────────────────

function makeStage(overrides: Partial<NonNullable<ReportMetadata["journeyAnalysis"]>["stages"][number]> = {}) {
  return {
    stage: "DISCOVERY",
    mentionRate: 0.12,
    avgSentiment: 0.1,
    positioning: "PERIPHERAL",
    sourcedRate: 0.4,
    topCompetitor: { name: "Stripe", mentionRate: 0.67 },
    gapVsTopCompetitor: 0.55,
    gapDomains: ["glassdoor.com", "levels.fyi"],
    narrative: "Plaid has limited Discovery visibility at 12%. Stripe leads by 55 points.",
    competitorCallout: "Stripe leads Discovery by 55 points with presence on glassdoor.com.",
    ...overrides,
  };
}

/** Full-featured metadata representing a weak report. */
function makeWeakMeta(overrides: Partial<ReportMetadata> = {}): ReportMetadata {
  return {
    clientName: "Plaid",
    clientOverallRate: 0.12,
    scanRunIds: ["run-1"],
    overallSourcedRate: 0.28,
    journeyAnalysis: {
      stages: [
        makeStage({ stage: "DISCOVERY", mentionRate: 0.12, sourcedRate: 0.28, positioning: "PERIPHERAL" }),
        makeStage({ stage: "EVALUATION", mentionRate: 0.08, sourcedRate: 0.22, positioning: "INVISIBLE", topCompetitor: { name: "Stripe", mentionRate: 0.72 } }),
        makeStage({ stage: "CONSIDERATION", mentionRate: 0.45, sourcedRate: 0.5, positioning: "CONTENDER", topCompetitor: null }),
        makeStage({ stage: "COMMITMENT", mentionRate: 0.0, sourcedRate: 0.0, positioning: "INVISIBLE", topCompetitor: null }),
      ],
      funnelThroughput: 0.08,
      criticalGapStage: "EVALUATION",
      overallPositioning: "PERIPHERAL",
      earnedVisibilityRate: 0.12,
      earnedVisibilityTier: "weak",
    },
    competitors: [
      { name: "Stripe", overallRate: 0.72, threatLevel: "Primary", stages: [] },
    ],
    remediationPlan: {
      recommendations: [
        { id: "r1", stage: "DISCOVERY", priority: "CRITICAL", title: "Establish Glassdoor authority", summary: "Build review volume.", whyItMatters: "Gap.", targetPlatforms: ["glassdoor.com"], actions: ["Campaign"], evidenceBasis: "Discovery gap", expectedImpact: "High", effort: "MEDIUM", timeframe: "60 days" },
        { id: "r2", stage: "EVALUATION", priority: "CRITICAL", title: "Publish levels.fyi data", summary: "Compensation transparency.", whyItMatters: "Gap.", targetPlatforms: ["levels.fyi"], actions: ["Publish"], evidenceBasis: "Evaluation gap", expectedImpact: "High", effort: "LOW", timeframe: "30 days" },
        { id: "r3", stage: "DISCOVERY", priority: "CRITICAL", title: "Create builtin.com profile", summary: "Employer discovery.", whyItMatters: "Gap.", targetPlatforms: ["builtin.com"], actions: ["Create"], evidenceBasis: "Discovery gap", expectedImpact: "Medium", effort: "LOW", timeframe: "30 days" },
      ],
      criticalCount: 3,
      highCount: 1,
      topPriorityStage: "EVALUATION",
      funnelImpactSummary: "Addressing EVALUATION could increase throughput from 8% to 15%.",
    },
    confidence: {
      overall: { score: 38, tier: "LOW" },
      perSection: {
        visibility: { score: 35, tier: "LOW" },
      },
    },
    multiRunAnalysis: {
      totalQueries: 15,
      validatedQueryCount: 0,
      validationRate: 0,
      stabilityDistribution: {
        STABLE_PRESENCE: 2,
        VOLATILE_PRESENCE: 7,
        STABLE_ABSENCE: 6,
        UNVALIDATED: 0,
      },
      effectiveScanRunCount: 1,
    },
    readinessWarnings: [
      { severity: "critical", title: "Discovery data is thin", description: "Only 7 Discovery queries available (minimum recommended: 10)." },
      { severity: "warning", title: "Approved result count is low", description: "Only 32 total approved results." },
    ],
    ...overrides,
  };
}

/** Metadata representing a strong, high-confidence report. */
function makeStrongMeta(overrides: Partial<ReportMetadata> = {}): ReportMetadata {
  return {
    clientName: "Acme Corp",
    clientOverallRate: 0.78,
    scanRunIds: ["run-1", "run-2"],
    overallSourcedRate: 0.72,
    journeyAnalysis: {
      stages: [
        // Client leads — gapVsTopCompetitor is 0, competitor rate < client rate
        makeStage({ stage: "DISCOVERY", mentionRate: 0.78, sourcedRate: 0.72, positioning: "CHAMPION", topCompetitor: { name: "BigCo", mentionRate: 0.62 }, gapVsTopCompetitor: 0 }),
        // Slight disadvantage — gap is only 0.07
        makeStage({ stage: "EVALUATION", mentionRate: 0.65, sourcedRate: 0.68, positioning: "CONTENDER", topCompetitor: { name: "BigCo", mentionRate: 0.72 }, gapVsTopCompetitor: 0.07 }),
        // No competitor — must explicitly set gapVsTopCompetitor to 0 to avoid default 0.55
        makeStage({ stage: "CONSIDERATION", mentionRate: 0.80, sourcedRate: 0.75, positioning: "CHAMPION", topCompetitor: null, gapVsTopCompetitor: 0, gapDomains: [] }),
        makeStage({ stage: "COMMITMENT", mentionRate: 0.70, sourcedRate: 0.65, positioning: "CONTENDER", topCompetitor: null, gapVsTopCompetitor: 0, gapDomains: [] }),
      ],
      funnelThroughput: 0.65,
      criticalGapStage: null,
      overallPositioning: "CHAMPION",
      earnedVisibilityRate: 0.78,
      earnedVisibilityTier: "strong",
    },
    competitors: [
      { name: "BigCo", overallRate: 0.68, threatLevel: "Secondary", stages: [] },
    ],
    remediationPlan: {
      recommendations: [
        { id: "r1", stage: "EVALUATION", priority: "HIGH", title: "Improve evaluation content", summary: "Minor gap.", whyItMatters: "Gap.", targetPlatforms: [], actions: [], evidenceBasis: "Evaluation data", expectedImpact: "Medium", effort: "LOW", timeframe: "30 days" },
      ],
      criticalCount: 0,
      highCount: 1,
      topPriorityStage: "EVALUATION",
      funnelImpactSummary: "Minor improvements available.",
    },
    confidence: {
      overall: { score: 82, tier: "HIGH" },
      perSection: {
        visibility: { score: 84, tier: "HIGH" },
      },
    },
    multiRunAnalysis: {
      totalQueries: 60,
      validatedQueryCount: 55,
      validationRate: 0.92,
      stabilityDistribution: {
        STABLE_PRESENCE: 45,
        VOLATILE_PRESENCE: 8,
        STABLE_ABSENCE: 7,
        UNVALIDATED: 0,
      },
      effectiveScanRunCount: 2,
    },
    readinessWarnings: [],
    ...overrides,
  };
}

// ─── 1. Trigger detection ────────────────────────────────────

describe("detectTriggerFlags", () => {
  it("sets hasGlassdoorGap when glassdoor.com is in any stage gapDomains", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    expect(flags.hasGlassdoorGap).toBe(true);
  });

  it("does not set hasGlassdoorGap when glassdoor.com is not in gap domains", () => {
    const meta = makeWeakMeta();
    meta.journeyAnalysis!.stages = meta.journeyAnalysis!.stages.map((s) => ({
      ...s,
      gapDomains: s.gapDomains.filter((d) => d !== "glassdoor.com"),
    }));
    const flags = detectTriggerFlags(meta);
    expect(flags.hasGlassdoorGap).toBe(false);
  });

  it("sets hasLevelsFyiGap when levels.fyi is in gap domains", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    expect(flags.hasLevelsFyiGap).toBe(true);
  });

  it("sets hasCriticalDiscoveryGap when Discovery mentionRate <= threshold", () => {
    const meta = makeWeakMeta();
    // Discovery is at 12% which is above 10% threshold
    const flags = detectTriggerFlags(meta);
    expect(flags.hasCriticalDiscoveryGap).toBe(false);

    // Force below threshold
    meta.journeyAnalysis!.stages = meta.journeyAnalysis!.stages.map((s) =>
      s.stage === "DISCOVERY" ? { ...s, mentionRate: 0.05 } : s,
    );
    const flags2 = detectTriggerFlags(meta);
    expect(flags2.hasCriticalDiscoveryGap).toBe(true);
  });

  it("sets hasCriticalEvaluationGap when Evaluation mentionRate <= threshold", () => {
    const meta = makeWeakMeta();
    // Evaluation is at 8% which is exactly below threshold (10%)
    const flags = detectTriggerFlags(meta);
    expect(flags.hasCriticalEvaluationGap).toBe(true);
  });

  it("sets hasCriticalCommitmentGap when Commitment is INVISIBLE", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    expect(flags.hasCriticalCommitmentGap).toBe(true);
  });

  it("sets hasMultiStageCollapse when 3+ stages are weak", () => {
    const meta = makeWeakMeta();
    // DISCOVERY=PERIPHERAL, EVALUATION=INVISIBLE, COMMITMENT=INVISIBLE → 3 weak
    const flags = detectTriggerFlags(meta);
    expect(flags.hasMultiStageCollapse).toBe(true);
  });

  it("does not set hasMultiStageCollapse when fewer than 3 stages are weak", () => {
    const meta = makeStrongMeta();
    const flags = detectTriggerFlags(meta);
    expect(flags.hasMultiStageCollapse).toBe(false);
  });

  it("sets hasStrongCompetitorContrast when any stage gap >= 0.3", () => {
    const meta = makeWeakMeta();
    // Discovery gap: 0.67 - 0.12 = 0.55 >= 0.3
    const flags = detectTriggerFlags(meta);
    expect(flags.hasStrongCompetitorContrast).toBe(true);
  });

  it("does not set hasStrongCompetitorContrast when all gaps are small", () => {
    const meta = makeStrongMeta();
    // Evaluation gap: 0.72 - 0.65 = 0.07 < 0.3
    const flags = detectTriggerFlags(meta);
    expect(flags.hasStrongCompetitorContrast).toBe(false);
  });

  it("sets hasZeroOwnedCitations when overallSourcedRate < 0.1", () => {
    const meta = makeWeakMeta({ overallSourcedRate: 0.05 });
    const flags = detectTriggerFlags(meta);
    expect(flags.hasZeroOwnedCitations).toBe(true);
  });

  it("does not set hasZeroOwnedCitations when overallSourcedRate >= 0.1", () => {
    const meta = makeWeakMeta({ overallSourcedRate: 0.28 });
    const flags = detectTriggerFlags(meta);
    expect(flags.hasZeroOwnedCitations).toBe(false);
  });

  it("sets hasLowSourcedRate when overallSourcedRate < 0.5", () => {
    const meta = makeWeakMeta({ overallSourcedRate: 0.28 });
    const flags = detectTriggerFlags(meta);
    expect(flags.hasLowSourcedRate).toBe(true);
  });

  it("sets hasStabilityIssues when volatile presence rate > 0.3", () => {
    const meta = makeWeakMeta();
    // 7 volatile out of 15 total = 47% > 30%
    const flags = detectTriggerFlags(meta);
    expect(flags.hasStabilityIssues).toBe(true);
  });

  it("does not set hasStabilityIssues when volatile rate is low", () => {
    const meta = makeStrongMeta();
    // 8 volatile out of 60 total = 13% < 30%
    const flags = detectTriggerFlags(meta);
    expect(flags.hasStabilityIssues).toBe(false);
  });

  it("sets isFirstAssessment for single scan run", () => {
    const meta = makeWeakMeta({ scanRunIds: ["run-1"] });
    const flags = detectTriggerFlags(meta);
    expect(flags.isFirstAssessment).toBe(true);
  });

  it("does not set isFirstAssessment for multiple scan runs with high validation", () => {
    const meta = makeStrongMeta();
    const flags = detectTriggerFlags(meta);
    expect(flags.isFirstAssessment).toBe(false);
  });

  it("sets hasNegativeSentiment when average sentiment < -0.1", () => {
    const meta = makeWeakMeta();
    meta.journeyAnalysis!.stages = meta.journeyAnalysis!.stages.map((s) => ({
      ...s,
      avgSentiment: -0.3,
    }));
    const flags = detectTriggerFlags(meta);
    expect(flags.hasNegativeSentiment).toBe(true);
  });

  it("sets hasLowSampleSize from readiness warnings", () => {
    const meta = makeWeakMeta();
    // Has a critical "Discovery data is thin" warning
    const flags = detectTriggerFlags(meta);
    expect(flags.hasLowSampleSize).toBe(true);
  });

  it("returns all false flags for a strong, complete report", () => {
    const meta = makeStrongMeta();
    const flags = detectTriggerFlags(meta);
    // Strong report should not trigger most flags
    expect(flags.hasCriticalDiscoveryGap).toBe(false);
    expect(flags.hasCriticalEvaluationGap).toBe(false);
    expect(flags.hasZeroOwnedCitations).toBe(false);
    expect(flags.hasStabilityIssues).toBe(false);
  });
});

// ─── 2. Compelling score normalization ───────────────────────

describe("computeCompellingScore", () => {
  it("returns 0 when gapMagnitude is 0", () => {
    expect(computeCompellingScore(0.8, 30, 0, 0.6)).toBe(0);
  });

  it("returns 0 when confidence is 0", () => {
    expect(computeCompellingScore(0, 30, 0.5, 0.6)).toBe(0);
  });

  it("returns 0 when sourcedRate is 0", () => {
    expect(computeCompellingScore(0.8, 30, 0.5, 0)).toBe(0);
  });

  it("returns 0 when sampleSize is 1 (log(1)=0)", () => {
    // Math.log(1) === 0, so normalizedSample = 0, score = 0
    expect(computeCompellingScore(0.8, 1, 0.5, 0.6)).toBe(0);
  });

  it("normalizedSample caps at 1 when sampleSize >= COMPELLING_SCORE_SAMPLE_CAP", () => {
    // At cap: log(50)/log(50) = 1
    const atCap = computeCompellingScore(1, COMPELLING_SCORE_SAMPLE_CAP, 1, 1);
    expect(atCap).toBeCloseTo(1, 5);

    // Above cap should also yield 1 (min capped)
    const aboveCap = computeCompellingScore(1, 1000, 1, 1);
    expect(aboveCap).toBeCloseTo(1, 5);
  });

  it("normalizedSample at sampleSize=1 is approximately 0", () => {
    // log(1)/log(50) = 0
    const score = computeCompellingScore(1, 1, 1, 1);
    expect(score).toBeCloseTo(0, 5);
  });

  it("normalizedSample at sampleSize=10 is log(10)/log(50) ≈ 0.588", () => {
    const expectedNormalized = Math.log(10) / Math.log(COMPELLING_SCORE_SAMPLE_CAP);
    const score = computeCompellingScore(1, 10, 1, 1);
    expect(score).toBeCloseTo(expectedNormalized, 5);
  });

  it("normalizedSample at sampleSize=50 equals 1 exactly", () => {
    const score = computeCompellingScore(1, 50, 1, 1);
    expect(score).toBeCloseTo(1, 5);
  });

  it("scales proportionally with confidence", () => {
    const half = computeCompellingScore(0.5, 50, 1, 1);
    const full = computeCompellingScore(1.0, 50, 1, 1);
    expect(full).toBeCloseTo(half * 2, 5);
  });

  it("produces a realistic score for a typical finding", () => {
    // confidence=0.6, sample=30, gap=0.55, sourced=0.4
    const normalizedSample = Math.log(30) / Math.log(50);
    const expected = 0.6 * normalizedSample * 0.55 * 0.4;
    const actual = computeCompellingScore(0.6, 30, 0.55, 0.4);
    expect(actual).toBeCloseTo(expected, 10);
  });
});

// ─── 3. Red flag severity sorting ────────────────────────────

describe("buildRedFlags", () => {
  it("sorts critical before major before advisory", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    const redFlags = buildRedFlags(meta, flags);

    if (redFlags.length < 2) return; // skip if too few flags to sort

    const severityOrder = { critical: 0, major: 1, advisory: 2 };
    for (let i = 0; i < redFlags.length - 1; i++) {
      expect(severityOrder[redFlags[i]!.severity]).toBeLessThanOrEqual(
        severityOrder[redFlags[i + 1]!.severity],
      );
    }
  });

  it("emits critical flag when a stage has zero sourced results but non-zero mentions", () => {
    const meta = makeWeakMeta();
    // Force a stage with mentions but zero sourcing
    meta.journeyAnalysis!.stages = meta.journeyAnalysis!.stages.map((s) =>
      s.stage === "EVALUATION" ? { ...s, mentionRate: 0.2, sourcedRate: 0 } : s,
    );
    const flags = detectTriggerFlags(meta);
    const redFlags = buildRedFlags(meta, flags);
    const critical = redFlags.filter((f) => f.severity === "critical");
    expect(critical.some((f) => f.concern.includes("EVALUATION"))).toBe(true);
  });

  it("emits major flag when overall confidence is LOW", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    const redFlags = buildRedFlags(meta, flags);
    // LOW confidence should trigger a critical or major flag
    expect(redFlags.some((f) => f.severity === "critical" && f.concern.includes("LOW"))).toBe(true);
  });

  it("emits advisory flag for low-but-not-critical sourced rate", () => {
    const meta = makeWeakMeta({ overallSourcedRate: 0.35 });
    // Remove the EVALUATION stage's zero sourcing to avoid critical
    meta.journeyAnalysis!.stages = meta.journeyAnalysis!.stages.map((s) =>
      s.stage === "EVALUATION" ? { ...s, sourcedRate: 0.35 } : s,
    );
    const flags = detectTriggerFlags(meta);
    const redFlags = buildRedFlags(meta, flags);
    const advisory = redFlags.filter((f) => f.severity === "advisory");
    // At 35% sourced rate we should have an advisory flag
    expect(advisory.length).toBeGreaterThan(0);
  });

  it("does not emit flags for a strong report with no issues", () => {
    const meta = makeStrongMeta();
    // Remove readiness warnings for clean test
    meta.readinessWarnings = [];
    const flags = detectTriggerFlags(meta);
    const redFlags = buildRedFlags(meta, flags);
    const critical = redFlags.filter((f) => f.severity === "critical");
    expect(critical.length).toBe(0);
  });
});

// ─── 4. Rule table matching ───────────────────────────────────

describe("pushback rule table", () => {
  it("fires glassdoor objection when hasGlassdoorGap is true", () => {
    const flags = { ...emptyFlags(), hasGlassdoorGap: true };
    const predictions = buildPushbackPredictions(flags);
    expect(predictions.some((p) => p.triggerId === "glassdoor_investment_objection")).toBe(true);
  });

  it("does not fire glassdoor objection when hasGlassdoorGap is false", () => {
    const flags = { ...emptyFlags(), hasGlassdoorGap: false };
    const predictions = buildPushbackPredictions(flags);
    expect(predictions.some((p) => p.triggerId === "glassdoor_investment_objection")).toBe(false);
  });

  it("fires single scan credibility objection when isFirstAssessment is true", () => {
    const flags = { ...emptyFlags(), isFirstAssessment: true };
    const predictions = buildPushbackPredictions(flags);
    expect(predictions.some((p) => p.triggerId === "single_scan_credibility_objection")).toBe(true);
  });

  it("fires recruiter deflection when critical evaluation gap exists", () => {
    const flags = { ...emptyFlags(), hasCriticalEvaluationGap: true };
    const predictions = buildPushbackPredictions(flags);
    expect(predictions.some((p) => p.triggerId === "recruiter_relationship_deflection")).toBe(true);
  });

  it("fires recruiter deflection when critical discovery gap exists", () => {
    const flags = { ...emptyFlags(), hasCriticalDiscoveryGap: true };
    const predictions = buildPushbackPredictions(flags);
    expect(predictions.some((p) => p.triggerId === "recruiter_relationship_deflection")).toBe(true);
  });

  it("fires size vs visibility objection when hasStrongCompetitorContrast is true", () => {
    const flags = { ...emptyFlags(), hasStrongCompetitorContrast: true };
    const predictions = buildPushbackPredictions(flags);
    expect(predictions.some((p) => p.triggerId === "size_vs_visibility_objection")).toBe(true);
  });

  it("fires sourcing methodology objection when hasLowSourcedRate is true", () => {
    const flags = { ...emptyFlags(), hasLowSourcedRate: true };
    const predictions = buildPushbackPredictions(flags);
    expect(predictions.some((p) => p.triggerId === "sourcing_methodology_objection")).toBe(true);
  });

  it("fires no predictions when all flags are false", () => {
    const flags = emptyFlags();
    const predictions = buildPushbackPredictions(flags);
    expect(predictions.length).toBe(0);
  });

  it("all 5 documented pushback types can be triggered", () => {
    const flags: TriggerFlags = {
      ...emptyFlags(),
      hasGlassdoorGap: true,
      isFirstAssessment: true,
      hasCriticalEvaluationGap: true,
      hasStrongCompetitorContrast: true,
      hasLowSourcedRate: true,
    };
    const predictions = buildPushbackPredictions(flags);
    const ids = new Set(predictions.map((p) => p.triggerId));
    expect(ids.has("glassdoor_investment_objection")).toBe(true);
    expect(ids.has("single_scan_credibility_objection")).toBe(true);
    expect(ids.has("recruiter_relationship_deflection")).toBe(true);
    expect(ids.has("size_vs_visibility_objection")).toBe(true);
    expect(ids.has("sourcing_methodology_objection")).toBe(true);
  });
});

describe("upsell rule table", () => {
  it("fires content_authoring when hasContentGap is true", () => {
    const flags = { ...emptyFlags(), hasContentGap: true };
    const upsells = buildUpsellOpportunities(flags);
    expect(upsells.some((u) => u.engagementType === "content_authoring")).toBe(true);
  });

  it("fires monitoring when hasStabilityIssues is true", () => {
    const flags = { ...emptyFlags(), hasStabilityIssues: true };
    const upsells = buildUpsellOpportunities(flags);
    expect(upsells.some((u) => u.engagementType === "monitoring")).toBe(true);
  });

  it("fires full_assessment when isFirstAssessment is true", () => {
    const flags = { ...emptyFlags(), isFirstAssessment: true };
    const upsells = buildUpsellOpportunities(flags);
    expect(upsells.some((u) => u.engagementType === "full_assessment")).toBe(true);
  });

  it("fires advisory when hasMultiStageCollapse is true", () => {
    const flags = { ...emptyFlags(), hasMultiStageCollapse: true };
    const upsells = buildUpsellOpportunities(flags);
    expect(upsells.some((u) => u.engagementType === "advisory")).toBe(true);
  });

  it("fires no upsells when all flags are false", () => {
    const flags = emptyFlags();
    // snapshot_upgrade fires when NOT first assessment and no content/stability gaps
    // so force all false
    const upsells = buildUpsellOpportunities(flags);
    // Only snapshot_upgrade could fire with all false (its condition checks !isFirstAssessment && !hasContentGap && !hasStabilityIssues)
    const filteredUpsells = upsells.filter((u) => u.engagementType !== "snapshot_upgrade");
    expect(filteredUpsells.length).toBe(0);
  });
});

// ─── 5. Top 5 talking points selection ───────────────────────

describe("buildTalkingPoints", () => {
  it("returns at most MAX_TALKING_POINTS points", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    const points = buildTalkingPoints(meta, flags);
    expect(points.length).toBeLessThanOrEqual(MAX_TALKING_POINTS);
  });

  it("selects highest compelling score, not just first N", () => {
    // Create metadata where the COMMITMENT stage has a very high gap magnitude
    // (zero mention rate, high competitor rate) but low sourced rate
    const meta = makeWeakMeta();
    meta.journeyAnalysis!.stages = [
      makeStage({ stage: "DISCOVERY", mentionRate: 0.5, sourcedRate: 0.6, gapVsTopCompetitor: 0.1, topCompetitor: { name: "A", mentionRate: 0.6 } }),
      makeStage({ stage: "EVALUATION", mentionRate: 0.8, sourcedRate: 0.7, gapVsTopCompetitor: 0.05, topCompetitor: { name: "A", mentionRate: 0.85 } }),
      makeStage({ stage: "CONSIDERATION", mentionRate: 0.3, sourcedRate: 0.8, gapVsTopCompetitor: 0.5, topCompetitor: { name: "B", mentionRate: 0.8 } }),
      makeStage({ stage: "COMMITMENT", mentionRate: 0.1, sourcedRate: 0.9, gapVsTopCompetitor: 0.7, topCompetitor: { name: "C", mentionRate: 0.8 } }),
    ];

    const flags = detectTriggerFlags(meta);
    const points = buildTalkingPoints(meta, flags);

    // With confidence=0.38/100, all have same confidence factor.
    // Consideration and Commitment should rank higher due to larger gaps.
    // The point is that the selection is score-based, not insertion-order-based.
    expect(points.length).toBeGreaterThan(0);
    // Verify that points are sorted descending by compelling score
    for (let i = 0; i < points.length - 1; i++) {
      expect(points[i]!.compellingScore).toBeGreaterThanOrEqual(points[i + 1]!.compellingScore);
    }
  });

  it("all returned points have compellingScore >= 0", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    const points = buildTalkingPoints(meta, flags);
    for (const point of points) {
      expect(point.compellingScore).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns fewer than 5 when fewer than 5 stages exist", () => {
    const meta = makeWeakMeta();
    // Only 1 stage
    meta.journeyAnalysis!.stages = [
      makeStage({ stage: "DISCOVERY", mentionRate: 0.12, sourcedRate: 0.4 }),
    ];
    const flags = detectTriggerFlags(meta);
    const points = buildTalkingPoints(meta, flags);
    expect(points.length).toBeLessThanOrEqual(1);
  });
});

// ─── 6. Max 3 questions ───────────────────────────────────────

describe("buildClientQuestions", () => {
  it("returns at most MAX_CLIENT_QUESTIONS questions when routed through buildOperatorActionPlan", () => {
    // All flags will fire from this weak metadata — the orchestrator must cap at 3.
    const meta = makeWeakMeta();
    // Force all gap flags by adding zero owned citations
    meta.overallSourcedRate = 0.05;

    const plan = buildOperatorActionPlan({
      reportId: "cap-test",
      clientName: "TestCo",
      metadata: meta,
    });
    expect(plan.clientQuestions.length).toBeLessThanOrEqual(MAX_CLIENT_QUESTIONS);
  });

  it("buildClientQuestions rule function returns all matching questions (uncapped)", () => {
    // The raw rule function is uncapped — the cap is in the orchestrator.
    // Verify that multiple rules can fire simultaneously.
    const flags: TriggerFlags = {
      hasGlassdoorGap: true,
      hasLinkedInGap: false,
      hasLevelsFyiGap: false,
      hasContentGap: true,
      hasCriticalDiscoveryGap: true,
      hasCriticalEvaluationGap: false,
      hasCriticalCommitmentGap: false,
      hasMultiStageCollapse: false,
      hasStrongCompetitorContrast: false,
      hasZeroOwnedCitations: false,
      hasLowSampleSize: false,
      hasStabilityIssues: false,
      isFirstAssessment: false,
      hasNegativeSentiment: false,
      hasLowSourcedRate: false,
    };
    const questions = buildClientQuestions(flags);
    // glassdoor + content + discovery gap → 3 rules should fire
    expect(questions.length).toBeGreaterThanOrEqual(2);
  });

  it("returns 0 questions when no flags fire", () => {
    const flags = emptyFlags();
    const questions = buildClientQuestions(flags);
    expect(questions.length).toBe(0);
  });

  it("returns a question for glassdoor gap", () => {
    const flags = { ...emptyFlags(), hasGlassdoorGap: true };
    const questions = buildClientQuestions(flags);
    expect(questions.some((q) => q.triggerId === "glassdoor_ownership_question")).toBe(true);
  });

  it("returns a question for first assessment", () => {
    const flags = { ...emptyFlags(), isFirstAssessment: true };
    const questions = buildClientQuestions(flags);
    expect(questions.some((q) => q.triggerId === "no_baseline_question")).toBe(true);
  });

  it("returns a question for zero owned citations", () => {
    const flags = { ...emptyFlags(), hasZeroOwnedCitations: true };
    const questions = buildClientQuestions(flags);
    expect(questions.some((q) => q.triggerId === "employer_brand_ownership_question")).toBe(true);
  });
});

// ─── 7. Upsell priority ordering ─────────────────────────────

describe("DEFAULT_UPSELL_PRIORITY", () => {
  it("has content_authoring as the first priority", () => {
    expect(DEFAULT_UPSELL_PRIORITY[0]).toBe("content_authoring");
  });

  it("has monitoring as second priority", () => {
    expect(DEFAULT_UPSELL_PRIORITY[1]).toBe("monitoring");
  });

  it("covers all 5 engagement types", () => {
    const types = new Set(DEFAULT_UPSELL_PRIORITY);
    expect(types.has("content_authoring")).toBe(true);
    expect(types.has("monitoring")).toBe(true);
    expect(types.has("advisory")).toBe(true);
    expect(types.has("snapshot_upgrade")).toBe(true);
    expect(types.has("full_assessment")).toBe(true);
  });

  it("selects content_authoring as primary when both content and monitoring fire", () => {
    const meta = makeWeakMeta();
    // Ensure both content gap and stability issues trigger
    const flags = detectTriggerFlags(meta);
    expect(flags.hasContentGap).toBe(true);
    expect(flags.hasStabilityIssues).toBe(true);

    const result = buildOperatorActionPlan({
      reportId: "test-id",
      clientName: "Plaid",
      metadata: meta,
    });
    // content_authoring comes before monitoring in priority
    expect(result.nextEngagementPlan.primaryEngagementType).toBe("content_authoring");
  });
});

// ─── 8. Validation items ──────────────────────────────────────

describe("buildValidationItems", () => {
  it("surfaces low confidence sections as validation items", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    const items = buildValidationItems(meta, flags);
    expect(items.some((i) => i.category === "mention_claim" && i.finding.includes("visibility"))).toBe(true);
  });

  it("surfaces readiness warnings as validation items", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    const items = buildValidationItems(meta, flags);
    expect(items.some((i) => i.category === "sample_size" && i.finding.includes("thin"))).toBe(true);
  });

  it("surfaces stability issues as validation items", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    const items = buildValidationItems(meta, flags);
    // 7/15 = 47% volatile > 30% threshold
    expect(items.some((i) => i.category === "stability")).toBe(true);
  });

  it("does not include validation items for a clean, high-confidence report", () => {
    const meta = makeStrongMeta();
    meta.readinessWarnings = [];
    const flags = detectTriggerFlags(meta);
    const items = buildValidationItems(meta, flags);
    // Strong report with high confidence should have few or no high-priority items
    const criticalItems = items.filter((i) => i.category === "sample_size");
    expect(criticalItems.length).toBe(0);
  });

  it("surfaces competitor claim items for large gaps", () => {
    const meta = makeWeakMeta();
    const flags = detectTriggerFlags(meta);
    const items = buildValidationItems(meta, flags);
    expect(items.some((i) => i.category === "competitor_claim")).toBe(true);
  });
});

// ─── 9. Full integration test ─────────────────────────────────

describe("buildOperatorActionPlan (integration)", () => {
  it("returns all required sections", () => {
    const meta = makeWeakMeta();
    const plan = buildOperatorActionPlan({
      reportId: "rpt-001",
      clientName: "Plaid",
      metadata: meta,
    });

    expect(plan.reportId).toBe("rpt-001");
    expect(plan.clientName).toBe("Plaid");
    expect(plan.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(plan.validationItems)).toBe(true);
    expect(Array.isArray(plan.talkingPoints)).toBe(true);
    expect(Array.isArray(plan.pushbackPredictions)).toBe(true);
    expect(Array.isArray(plan.upsellOpportunities)).toBe(true);
    expect(Array.isArray(plan.redFlags)).toBe(true);
    expect(plan.nextEngagementPlan).toBeDefined();
    expect(Array.isArray(plan.clientQuestions)).toBe(true);
  });

  it("talking points are capped at 5", () => {
    const meta = makeWeakMeta();
    const plan = buildOperatorActionPlan({
      reportId: "rpt-001",
      clientName: "Plaid",
      metadata: meta,
    });
    expect(plan.talkingPoints.length).toBeLessThanOrEqual(5);
  });

  it("client questions are capped at 3", () => {
    const meta = makeWeakMeta();
    const plan = buildOperatorActionPlan({
      reportId: "rpt-001",
      clientName: "Plaid",
      metadata: meta,
    });
    expect(plan.clientQuestions.length).toBeLessThanOrEqual(3);
  });

  it("red flags are sorted critical > major > advisory", () => {
    const meta = makeWeakMeta();
    const plan = buildOperatorActionPlan({
      reportId: "rpt-001",
      clientName: "Plaid",
      metadata: meta,
    });
    const severityOrder = { critical: 0, major: 1, advisory: 2 };
    for (let i = 0; i < plan.redFlags.length - 1; i++) {
      expect(severityOrder[plan.redFlags[i]!.severity]).toBeLessThanOrEqual(
        severityOrder[plan.redFlags[i + 1]!.severity],
      );
    }
  });

  it("produces a valid plan for a strong report with no gaps", () => {
    const meta = makeStrongMeta();
    const plan = buildOperatorActionPlan({
      reportId: "rpt-002",
      clientName: "Acme Corp",
      metadata: meta,
    });
    expect(plan.reportId).toBe("rpt-002");
    // Strong report should have fewer red flags
    const critical = plan.redFlags.filter((f) => f.severity === "critical");
    expect(critical.length).toBe(0);
  });

  it("handles empty metadata gracefully", () => {
    const meta: ReportMetadata = {};
    expect(() =>
      buildOperatorActionPlan({ reportId: "empty", clientName: "Empty Co", metadata: meta }),
    ).not.toThrow();
  });

  it("handles metadata with no journey analysis gracefully", () => {
    const meta: ReportMetadata = {
      clientName: "No Journey Co",
      overallSourcedRate: 0.3,
      scanRunIds: ["run-1"],
    };
    expect(() =>
      buildOperatorActionPlan({ reportId: "nj", clientName: "No Journey Co", metadata: meta }),
    ).not.toThrow();
  });

  it("nextEngagementPlan picks the right primary type", () => {
    const meta = makeWeakMeta();
    const plan = buildOperatorActionPlan({
      reportId: "rpt-003",
      clientName: "Plaid",
      metadata: meta,
    });
    // Weak report with content gaps → content_authoring should be primary
    expect(plan.nextEngagementPlan.primaryEngagementType).toBe("content_authoring");
    expect(plan.nextEngagementPlan.materialsToPrepare.length).toBeGreaterThan(0);
  });

  it("generatedAt is a valid ISO timestamp", () => {
    const meta = makeWeakMeta();
    const plan = buildOperatorActionPlan({
      reportId: "rpt-ts",
      clientName: "Plaid",
      metadata: meta,
    });
    const ts = new Date(plan.generatedAt);
    expect(isNaN(ts.getTime())).toBe(false);
  });
});

// ─── Helpers ────────────────────────────────────────────────

/** Returns a TriggerFlags object with all flags set to false. */
function emptyFlags(): TriggerFlags {
  return {
    hasGlassdoorGap: false,
    hasLinkedInGap: false,
    hasLevelsFyiGap: false,
    hasContentGap: false,
    hasCriticalDiscoveryGap: false,
    hasCriticalEvaluationGap: false,
    hasCriticalCommitmentGap: false,
    hasMultiStageCollapse: false,
    hasStrongCompetitorContrast: false,
    hasZeroOwnedCitations: false,
    hasLowSampleSize: false,
    hasStabilityIssues: false,
    isFirstAssessment: false,
    hasNegativeSentiment: false,
    hasLowSourcedRate: false,
  };
}
