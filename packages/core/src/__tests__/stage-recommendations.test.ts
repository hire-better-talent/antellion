import { describe, it, expect } from "vitest";
import {
  generateStageRecommendations,
  computeRecommendationPriority,
  computeFunnelImpactSummary,
  type RecommendationInput,
  type StageRecommendation,
} from "../decision-journey/recommendations";
import type { JourneyAnalysis, StageVisibility } from "../decision-journey/types";

// ─── Helpers ──────────────────────────────────────────────────

const CLIENT_NAME = "Meridian Technologies";

function makeStageVisibility(
  stage: StageVisibility["stage"],
  mentionRate: number,
  overrides: Partial<StageVisibility> = {},
): StageVisibility {
  const positioning =
    mentionRate < 0.2
      ? "INVISIBLE"
      : mentionRate < 0.4
        ? "PERIPHERAL"
        : mentionRate >= 0.7
          ? "CHAMPION"
          : "CONTENDER";

  const metricType: StageVisibility["metricType"] =
    stage === "DISCOVERY" || stage === "EVALUATION" ? "visibility" : "positioning";

  return {
    stage,
    mentionRate,
    avgVisibility: mentionRate * 70,
    avgSentiment: 0.1,
    resultCount: 10,
    positioning,
    topCompetitor: { name: "Apex Cloud", mentionRate: 0.75 },
    gapVsTopCompetitor: Math.max(0, 0.75 - mentionRate),
    citedDomains: [],
    gapDomains: [],
    metricType,
    sourcedRate: 0,
    ...overrides,
  };
}

function makeJourney(
  stages: StageVisibility[],
  overrides: Partial<JourneyAnalysis> = {},
): JourneyAnalysis {
  const funnelThroughput =
    stages.length > 0
      ? stages.reduce((p, s) => p * s.mentionRate, 1)
      : 0;
  const lowestRate = Math.min(...stages.map((s) => s.mentionRate));
  const criticalGapStage =
    lowestRate < 0.3
      ? stages.find((s) => s.mentionRate === lowestRate)!.stage
      : null;

  const earnedStages = stages.filter(
    (s) => s.stage === "DISCOVERY" || s.stage === "EVALUATION",
  );
  const earnedVisibilityRate =
    earnedStages.length > 0
      ? earnedStages.reduce((sum, s) => sum + s.mentionRate, 0) / earnedStages.length
      : 0;
  const earnedVisibilityTier: JourneyAnalysis["earnedVisibilityTier"] =
    earnedVisibilityRate >= 0.5
      ? "strong"
      : earnedVisibilityRate >= 0.3
        ? "moderate"
        : earnedVisibilityRate >= 0.15
          ? "weak"
          : "invisible";

  return {
    stages,
    funnelThroughput,
    criticalGapStage,
    overallPositioning: "CONTENDER",
    earnedVisibilityRate,
    earnedVisibilityTier,
    ...overrides,
  };
}

function makeInput(
  journey: JourneyAnalysis,
  overrides: Partial<RecommendationInput> = {},
): RecommendationInput {
  return {
    journey,
    comparison: {
      clientMentionRate: 0.45,
      avgSentimentScore: 0.1,
      entityMentions: [
        { name: CLIENT_NAME, isClient: true, mentionRate: 0.45 },
        { name: "Apex Cloud", isClient: false, mentionRate: 0.75 },
      ],
      citationAnalysis: {
        gapDomains: [],
        clientExclusiveDomains: [],
      },
    },
    client: {
      name: CLIENT_NAME,
      contentAssetTypes: ["CAREERS_PAGE"],
      competitors: [{ name: "Apex Cloud" }],
    },
    ...overrides,
  };
}

// ─── Generation tests ─────────────────────────────────────────

describe("generateStageRecommendations — generation", () => {
  it("Discovery rate 0.2 generates CRITICAL Discovery recommendation", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.2),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const discoveryRecs = plan.recommendations.filter(
      (r) => r.stage === "DISCOVERY",
    );
    expect(discoveryRecs.length).toBeGreaterThan(0);
    expect(discoveryRecs[0]!.priority).toBe("CRITICAL");
  });

  it("Evaluation rate 0.15 with comp platform gaps generates platform-specific rec with levels.fyi", () => {
    const journey = makeJourney([
      makeStageVisibility("EVALUATION", 0.15, {
        gapDomains: ["levels.fyi", "glassdoor.com"],
      }),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const levelsFyiRec = plan.recommendations.find(
      (r) => r.id === "evaluation-comp-data-levels-fyi",
    );
    expect(levelsFyiRec).toBeDefined();
    expect(levelsFyiRec!.priority).toBe("CRITICAL");
    expect(levelsFyiRec!.targetPlatforms).toContain("levels.fyi");
    expect(levelsFyiRec!.actions.some((a) => a.includes("levels.fyi"))).toBe(true);
  });

  it("Consideration negative sentiment generates perception recommendation", () => {
    const journey = makeJourney([
      makeStageVisibility("CONSIDERATION", 0.5, { avgSentiment: -0.4 }),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const sentimentRec = plan.recommendations.find(
      (r) => r.id === "consideration-address-negative-perception",
    );
    expect(sentimentRec).toBeDefined();
    expect(sentimentRec!.priority).toBe("HIGH");
  });

  it("Commitment strong (0.8) generates no Commitment recommendation", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.7),
      makeStageVisibility("COMMITMENT", 0.8),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const commitmentRecs = plan.recommendations.filter(
      (r) => r.stage === "COMMITMENT",
    );
    expect(commitmentRecs.length).toBe(0);
  });

  it("All stages strong generates only LOW/MEDIUM recommendations at most", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.75),
      makeStageVisibility("CONSIDERATION", 0.7, { avgSentiment: 0.2 }),
      makeStageVisibility("EVALUATION", 0.65),
      makeStageVisibility("COMMITMENT", 0.6),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const criticalOrHigh = plan.recommendations.filter(
      (r) => r.priority === "CRITICAL" || r.priority === "HIGH",
    );
    expect(criticalOrHigh.length).toBe(0);
  });

  it("Gap domains matching known DISCOVERY platform use platform-specific actions", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.25, {
        gapDomains: ["builtin.com"],
      }),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const builtinRec = plan.recommendations.find(
      (r) => r.id === "discovery-platform-builtin-com",
    );
    expect(builtinRec).toBeDefined();
    expect(builtinRec!.actions[0]).toContain("builtin.com");
    expect(builtinRec!.actions[0]).toContain("Create a company profile");
  });

  it("Gap domains matching known EVALUATION compensation platform use platform-specific actions", () => {
    const journey = makeJourney([
      makeStageVisibility("EVALUATION", 0.2, {
        gapDomains: ["payscale.com"],
      }),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const payscaleRec = plan.recommendations.find(
      (r) => r.id === "evaluation-comp-data-payscale-com",
    );
    expect(payscaleRec).toBeDefined();
    expect(payscaleRec!.title).toContain("payscale.com");
    expect(payscaleRec!.actions[0]).toContain("salary band data");
  });

  it("Funnel throughput < 0.1 generates multi-stage collapse warning", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.2),
      makeStageVisibility("EVALUATION", 0.15),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const collapseRec = plan.recommendations.find(
      (r) => r.id === "cross-stage-pipeline-collapse",
    );
    expect(collapseRec).toBeDefined();
    expect(collapseRec!.priority).toBe("CRITICAL");
    expect(collapseRec!.summary).toContain("%");
  });

  it("Funnel throughput >= 0.1 does not generate multi-stage collapse recommendation", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.6),
      makeStageVisibility("EVALUATION", 0.4),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const collapseRec = plan.recommendations.find(
      (r) => r.id === "cross-stage-pipeline-collapse",
    );
    expect(collapseRec).toBeUndefined();
  });

  it("Consideration PERIPHERAL positioning generates profile depth recommendation", () => {
    const journey = makeJourney([
      makeStageVisibility("CONSIDERATION", 0.35, {
        positioning: "PERIPHERAL",
        avgSentiment: 0.1,
      }),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const profileRec = plan.recommendations.find(
      (r) => r.id === "consideration-strengthen-profile-depth",
    );
    expect(profileRec).toBeDefined();
  });

  it("No recommendations generated for stages that have no data (empty stages array)", () => {
    const journey: JourneyAnalysis = {
      stages: [],
      funnelThroughput: 0,
      criticalGapStage: null,
      overallPositioning: "INVISIBLE",
    };
    const plan = generateStageRecommendations(makeInput(journey));
    // No stage recs should be generated, no collapse since throughput math on empty = 0
    // The cross-stage collapse only fires if funnelThroughput < 0.1 AND stages.length > 0,
    // but with 0 stages there are no per-stage recs either
    expect(plan.recommendations.length).toBe(0);
  });

  it("Evidence basis is non-empty for all generated recommendations", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.2),
      makeStageVisibility("EVALUATION", 0.15, { gapDomains: ["levels.fyi"] }),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    for (const rec of plan.recommendations) {
      expect(rec.evidenceBasis.length).toBeGreaterThan(0);
    }
  });
});

// ─── Priority tests ───────────────────────────────────────────

describe("computeRecommendationPriority", () => {
  it("Discovery 0.2 → CRITICAL", () => {
    expect(computeRecommendationPriority("DISCOVERY", 0.2, false)).toBe("CRITICAL");
  });

  it("Discovery 0.29 → CRITICAL", () => {
    expect(computeRecommendationPriority("DISCOVERY", 0.29, false)).toBe("CRITICAL");
  });

  it("Discovery 0.4 → HIGH", () => {
    expect(computeRecommendationPriority("DISCOVERY", 0.4, false)).toBe("HIGH");
  });

  it("Evaluation 0.15 → CRITICAL", () => {
    expect(computeRecommendationPriority("EVALUATION", 0.15, false)).toBe("CRITICAL");
  });

  it("Evaluation 0.4 → HIGH", () => {
    expect(computeRecommendationPriority("EVALUATION", 0.4, false)).toBe("HIGH");
  });

  it("Consideration 0.3 → HIGH", () => {
    expect(computeRecommendationPriority("CONSIDERATION", 0.3, false)).toBe("HIGH");
  });

  it("Consideration 0.5 → MEDIUM", () => {
    expect(computeRecommendationPriority("CONSIDERATION", 0.5, false)).toBe("MEDIUM");
  });

  it("Commitment 0.4, only gap → HIGH", () => {
    expect(computeRecommendationPriority("COMMITMENT", 0.4, true)).toBe("HIGH");
  });

  it("Commitment 0.4, not only gap → MEDIUM", () => {
    expect(computeRecommendationPriority("COMMITMENT", 0.4, false)).toBe("MEDIUM");
  });

  it("Commitment 0.3, not only gap → MEDIUM", () => {
    expect(computeRecommendationPriority("COMMITMENT", 0.3, false)).toBe("MEDIUM");
  });

  it("All rates above 0.5 → MEDIUM for non-commitment stages with moderate rates", () => {
    // Rates >= 0.5 fall through to MEDIUM for DISCOVERY/EVALUATION
    // (they won't produce recs since the generators gate at 0.5, but the function itself)
    expect(computeRecommendationPriority("DISCOVERY", 0.6, false)).toBe("MEDIUM");
    expect(computeRecommendationPriority("EVALUATION", 0.55, false)).toBe("MEDIUM");
  });

  it("No CRITICAL when all mention rates are above 0.3", () => {
    const rates: Array<[ReturnType<typeof computeRecommendationPriority>["length"] extends never ? never : Parameters<typeof computeRecommendationPriority>[0], number]> = [
      ["DISCOVERY", 0.35],
      ["EVALUATION", 0.35],
      ["CONSIDERATION", 0.45],
      ["COMMITMENT", 0.45],
    ];
    for (const [stage, rate] of rates) {
      expect(computeRecommendationPriority(stage, rate, false)).not.toBe("CRITICAL");
    }
  });
});

// ─── Funnel impact summary tests ──────────────────────────────

describe("computeFunnelImpactSummary", () => {
  it("Critical gap identified → summary includes throughput improvement estimate", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.8),
      makeStageVisibility("EVALUATION", 0.2),
    ]);
    const summary = computeFunnelImpactSummary(journey, "EVALUATION");
    expect(summary).toContain("Evaluation");
    expect(summary).toContain("%");
    expect(summary).toContain("~");
  });

  it("No critical gap → generic improvement message", () => {
    const journey: JourneyAnalysis = {
      stages: [makeStageVisibility("DISCOVERY", 0.7)],
      funnelThroughput: 0.7,
      criticalGapStage: null,
      overallPositioning: "CONTENDER",
    };
    const summary = computeFunnelImpactSummary(journey, null);
    expect(summary).toContain("addressing remaining gaps");
    expect(summary).toContain("70%");
  });

  it("Zero funnelThroughput handles gracefully", () => {
    const journey: JourneyAnalysis = {
      stages: [makeStageVisibility("DISCOVERY", 0.0)],
      funnelThroughput: 0,
      criticalGapStage: "DISCOVERY",
      overallPositioning: "INVISIBLE",
    };
    // Should not throw; clamped to 0.01 for division
    const summary = computeFunnelImpactSummary(journey, "DISCOVERY");
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(0);
  });

  it("Critical gap stage not in stages array → returns generic message", () => {
    const journey: JourneyAnalysis = {
      stages: [makeStageVisibility("DISCOVERY", 0.5)],
      funnelThroughput: 0.5,
      criticalGapStage: "EVALUATION", // not in stages
      overallPositioning: "CONTENDER",
    };
    const summary = computeFunnelImpactSummary(journey, "EVALUATION");
    expect(summary).toContain("addressing remaining gaps");
  });
});

// ─── Structure tests ──────────────────────────────────────────

describe("generateStageRecommendations — structure", () => {
  it("Every recommendation has all required fields non-empty", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.25, {
        gapDomains: ["builtin.com"],
      }),
      makeStageVisibility("CONSIDERATION", 0.35, {
        avgSentiment: -0.3,
      }),
      makeStageVisibility("EVALUATION", 0.15, {
        gapDomains: ["levels.fyi"],
      }),
      makeStageVisibility("COMMITMENT", 0.4),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));

    for (const rec of plan.recommendations) {
      expect(rec.id.length, `${rec.id}: id must be non-empty`).toBeGreaterThan(0);
      expect(rec.stage.length, `${rec.id}: stage must be non-empty`).toBeGreaterThan(0);
      expect(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).toContain(rec.priority);
      expect(rec.title.length, `${rec.id}: title must be non-empty`).toBeGreaterThan(0);
      expect(rec.summary.length, `${rec.id}: summary must be non-empty`).toBeGreaterThan(0);
      expect(rec.whyItMatters.length, `${rec.id}: whyItMatters must be non-empty`).toBeGreaterThan(0);
      expect(rec.actions.length, `${rec.id}: actions must be non-empty`).toBeGreaterThan(0);
      for (const action of rec.actions) {
        expect(action.length, `${rec.id}: each action must be non-empty`).toBeGreaterThan(0);
      }
      expect(rec.evidenceBasis.length, `${rec.id}: evidenceBasis must be non-empty`).toBeGreaterThan(0);
      expect(rec.expectedImpact.length, `${rec.id}: expectedImpact must be non-empty`).toBeGreaterThan(0);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(rec.effort);
      expect(rec.timeframe.length, `${rec.id}: timeframe must be non-empty`).toBeGreaterThan(0);
    }
  });

  it("Recommendations are sorted CRITICAL first, then HIGH, MEDIUM, LOW", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.2),
      makeStageVisibility("CONSIDERATION", 0.35, { avgSentiment: -0.3 }),
      makeStageVisibility("EVALUATION", 0.15, { gapDomains: ["levels.fyi"] }),
      makeStageVisibility("COMMITMENT", 0.4),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const priorities = plan.recommendations.map((r) => r.priority);
    for (let i = 1; i < priorities.length; i++) {
      expect(
        priorityOrder[priorities[i]!],
      ).toBeGreaterThanOrEqual(priorityOrder[priorities[i - 1]!]);
    }
  });

  it("No duplicate recommendation IDs", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.2, { gapDomains: ["builtin.com"] }),
      makeStageVisibility("CONSIDERATION", 0.3, { avgSentiment: -0.2 }),
      makeStageVisibility("EVALUATION", 0.15, { gapDomains: ["levels.fyi", "payscale.com"] }),
      makeStageVisibility("COMMITMENT", 0.35),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const ids = plan.recommendations.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("RemediationPlan counts match recommendation array", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.15),
      makeStageVisibility("EVALUATION", 0.1),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const actualCritical = plan.recommendations.filter(
      (r) => r.priority === "CRITICAL",
    ).length;
    const actualHigh = plan.recommendations.filter(
      (r) => r.priority === "HIGH",
    ).length;
    expect(plan.criticalCount).toBe(actualCritical);
    expect(plan.highCount).toBe(actualHigh);
  });

  it("topPriorityStage is null when there are no recommendations", () => {
    const journey: JourneyAnalysis = {
      stages: [],
      funnelThroughput: 0,
      criticalGapStage: null,
      overallPositioning: "INVISIBLE",
    };
    const plan = generateStageRecommendations(makeInput(journey));
    expect(plan.topPriorityStage).toBeNull();
  });

  it("funnelImpactSummary is a non-empty string", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.5),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    expect(plan.funnelImpactSummary.length).toBeGreaterThan(0);
  });
});

// ─── Strategic recommendation tests ───────────────────────────

describe("generateStageRecommendations — strategic recommendations", () => {
  it("plan includes strategicRecommendations array", () => {
    const journey = makeJourney([makeStageVisibility("DISCOVERY", 0.2)]);
    const plan = generateStageRecommendations(makeInput(journey));
    expect(Array.isArray(plan.strategicRecommendations)).toBe(true);
  });

  it("strategic recs group by stage — one per gap stage", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.2),
      makeStageVisibility("EVALUATION", 0.15, { gapDomains: ["levels.fyi"] }),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const stages = plan.strategicRecommendations.map((s) => s.stage);
    expect(stages).toContain("DISCOVERY");
    expect(stages).toContain("EVALUATION");
    // No duplicates
    expect(new Set(stages).size).toBe(stages.length);
  });

  it("each strategic rec has tacticalActions that are a subset of the flat list", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.2),
      makeStageVisibility("EVALUATION", 0.15, { gapDomains: ["levels.fyi"] }),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const flatIds = new Set(plan.recommendations.map((r) => r.id));
    for (const sr of plan.strategicRecommendations) {
      expect(sr.strategicTitle.length).toBeGreaterThan(0);
      expect(sr.strategicSummary.length).toBeGreaterThan(0);
      expect(sr.tacticalActions.length).toBeGreaterThan(0);
      for (const ta of sr.tacticalActions) {
        expect(flatIds.has(ta.id)).toBe(true);
      }
    }
  });

  it("strategic priority matches highest-priority tactical in that stage", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.15), // CRITICAL
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const discoverySr = plan.strategicRecommendations.find(
      (s) => s.stage === "DISCOVERY",
    );
    expect(discoverySr).toBeDefined();
    expect(discoverySr!.priority).toBe("CRITICAL");
  });

  it("strategic title references niche keyword when provided", () => {
    const journey = makeJourney([makeStageVisibility("DISCOVERY", 0.2)]);
    const plan = generateStageRecommendations({
      ...makeInput(journey),
      client: {
        ...makeInput(journey).client,
        nicheKeywords: ["timeshare"],
        industry: "Hospitality",
      },
    });
    const discoverySr = plan.strategicRecommendations.find(
      (s) => s.stage === "DISCOVERY",
    );
    expect(discoverySr).toBeDefined();
    expect(discoverySr!.strategicTitle.toLowerCase()).toContain("timeshare");
  });

  it("cross-stage collapse rec does not generate a strategic rec by itself", () => {
    // Multi-stage collapse (funnelThroughput < 0.1) produces a cross-stage rec.
    // It should NOT create a strategic rec because it's not stage-specific.
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.05),
      makeStageVisibility("EVALUATION", 0.05),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    // cross-stage-pipeline-collapse should NOT appear in strategic recs
    const collapseInStrategic = plan.strategicRecommendations.some(
      (s) => s.id === "cross-stage-pipeline-collapse",
    );
    expect(collapseInStrategic).toBe(false);
    // But it should still be in the flat list
    const collapseInFlat = plan.recommendations.some(
      (r) => r.id === "cross-stage-pipeline-collapse",
    );
    expect(collapseInFlat).toBe(true);
  });
});

// ─── Employer-platform filter in gap domains ──────────────────

describe("generateStageRecommendations — employer-platform filter on gap domains", () => {
  it("general presence fallback excludes non-employer gap domains from targetPlatforms", () => {
    const journey = makeJourney([
      makeStageVisibility("DISCOVERY", 0.2, {
        // Mix of employer-relevant and non-relevant domains
        gapDomains: ["barrons.com", "forbes.com", "builtin.com"],
      }),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const discoveryRec = plan.recommendations.find((r) =>
      r.stage === "DISCOVERY",
    );
    expect(discoveryRec).toBeDefined();
    // barrons.com and forbes.com must not appear in targetPlatforms
    for (const platform of discoveryRec!.targetPlatforms) {
      expect(["barrons.com", "forbes.com"]).not.toContain(platform);
    }
  });

  it("Evaluation fallback excludes non-employer gap domains", () => {
    const journey = makeJourney([
      makeStageVisibility("EVALUATION", 0.2, {
        // Only non-employer domain in gaps — no comp platforms
        gapDomains: ["techcrunch.com", "businessinsider.com"],
      }),
    ]);
    const plan = generateStageRecommendations(makeInput(journey));
    const evalRec = plan.recommendations.find((r) => r.stage === "EVALUATION");
    expect(evalRec).toBeDefined();
    // targetPlatforms for the fallback rec should default to known platforms, not the news domains
    for (const platform of evalRec!.targetPlatforms) {
      expect(["techcrunch.com", "businessinsider.com"]).not.toContain(platform);
    }
  });
});
