import { describe, it, expect } from "vitest";
import type { SnapshotSummary } from "../snapshot-summary";
import { PUSHBACK_RULES, selectQuestionsToAsk } from "../snapshot-action-plan/rules";
import { buildSnapshotActionPlan } from "../snapshot-action-plan/build";

// ─── Fixtures ─────────────────────────────────────────────────

function makeSnapshotSummary(overrides: Partial<SnapshotSummary> = {}): SnapshotSummary {
  return {
    prospectName: "Plaid",
    totalQueries: 30,
    discoveryMentionRate: 0.08,
    discoveryMentionCount: 2,
    overallMentionRate: 0.15,
    visibilityTier: "low",
    discovery: {
      queriesRun: 15,
      prospectMentioned: 2,
      mentionRate: 0.08,
      competitorRanking: [
        { name: "Stripe", mentioned: 10, mentionCount: 10, mentionRate: 0.67 },
        { name: "Square", mentioned: 6, mentionCount: 6, mentionRate: 0.4 },
      ],
      topCompetitorName: "Stripe",
      topCompetitorMentioned: 10,
      topGapQueries: [
        {
          queryText: "best fintech companies to work for",
          competitorsMentioned: ["Stripe", "Square"],
          prospectMentioned: false,
          responseExcerpt: "Stripe and Square are among the top fintech employers.",
        },
      ],
      themeBreakdown: [],
      allResults: [],
    },
    competitorContrast: {
      queriesRun: 10,
      competitorSummaries: [
        {
          competitorName: "Stripe",
          queriesRun: 5,
          competitorFavoredCount: 4,
          prospectFavoredCount: 1,
          neutralCount: 0,
          favorRate: 0.8,
          worstDimension: "engineering culture",
          worstExcerpt: "Stripe is generally regarded as stronger for engineers.",
        },
        {
          competitorName: "Square",
          queriesRun: 5,
          competitorFavoredCount: 2,
          prospectFavoredCount: 2,
          neutralCount: 1,
          favorRate: 0.4,
          worstDimension: null,
          worstExcerpt: null,
        },
      ],
      worstComparison: {
        queryText: "Plaid vs Stripe for engineers",
        competitorName: "Stripe",
        responseExcerpt: "Stripe is generally regarded as stronger.",
        prospectSentiment: -0.2,
        competitorFavored: true,
      },
      allResults: [],
    },
    reputation: {
      queriesRun: 5,
      avgSentiment: 0.1,
      narrativeConsistency: "consistent",
      recurringThemes: ["compensation", "culture"],
      worstResponse: null,
    },
    citationGap: {
      prospectOwnedCitations: 1,
      prospectTotalCitations: 3,
      competitorOwnedCitations: 8,
      gapPlatforms: ["glassdoor.com", "levels.fyi", "blind.com"],
      finding: "Plaid is absent from 3 employer-relevant platforms.",
      prospectEmployerCitations: 1,
      competitorEmployerCitations: 8,
    },
    primaryHook: {
      category: "discovery_absence",
      headline: "Plaid appears in only 8% of AI discovery responses.",
      evidence: "8% mention rate vs 67% for Stripe across 15 discovery queries.",
      quotableText: "Stripe and Square are frequently cited. Plaid does not appear.",
      findingStrength: "strong",
    },
    interpretation: {
      primaryTakeaway: "Plaid has critical discovery absence.",
      strength: {
        label: "Reputation",
        title: "Consistent narrative",
        detail: "Positive reputation signal.",
        source: "reputation",
      },
      opportunities: [
        {
          label: "Discovery",
          title: "Extreme gap",
          detail: "Absent from 92% of discovery queries.",
          source: "discovery_gap",
        },
        {
          label: "Contrast",
          title: "Stripe dominates",
          detail: "Stripe leads in 80% of comparisons.",
          source: "contrast",
        },
      ],
      bridge: "The full assessment maps every query.",
    },
    ...overrides,
  };
}

// ─── Tests: PUSHBACK_RULES ────────────────────────────────────

describe("PUSHBACK_RULES", () => {
  it("contains between 4 and 6 pushback items", () => {
    expect(PUSHBACK_RULES.length).toBeGreaterThanOrEqual(4);
    expect(PUSHBACK_RULES.length).toBeLessThanOrEqual(6);
  });

  it("each item has a non-empty pushback and counter", () => {
    for (const item of PUSHBACK_RULES) {
      expect(item.pushback.length).toBeGreaterThan(0);
      expect(item.counter.length).toBeGreaterThan(0);
    }
  });
});

// ─── Tests: selectQuestionsToAsk ─────────────────────────────

describe("selectQuestionsToAsk", () => {
  it("returns exactly 3 questions for a typical summary", () => {
    const questions = selectQuestionsToAsk(makeSnapshotSummary());
    expect(questions).toHaveLength(3);
  });

  it("all questions are non-empty strings", () => {
    const questions = selectQuestionsToAsk(makeSnapshotSummary());
    for (const q of questions) {
      expect(typeof q).toBe("string");
      expect(q.length).toBeGreaterThan(0);
    }
  });

  it("includes a platform-specific question when citation gap platforms exist", () => {
    const questions = selectQuestionsToAsk(makeSnapshotSummary());
    expect(questions[0]).toMatch(/glassdoor|levels|blind/i);
  });

  it("handles no citation gap platforms gracefully", () => {
    const summary = makeSnapshotSummary({
      citationGap: {
        prospectOwnedCitations: 2,
        prospectTotalCitations: 4,
        competitorOwnedCitations: 3,
        gapPlatforms: [],
        finding: "No significant gap.",
        prospectEmployerCitations: 2,
        competitorEmployerCitations: 3,
      },
    });
    const questions = selectQuestionsToAsk(summary);
    expect(questions).toHaveLength(3);
    // Fallback question should mention LinkedIn/Glassdoor
    expect(questions[0]).toMatch(/LinkedIn|Glassdoor/i);
  });
});

// ─── Tests: buildSnapshotActionPlan ──────────────────────────

describe("buildSnapshotActionPlan", () => {
  it("returns correct shape for a typical snapshot summary", () => {
    const summary = makeSnapshotSummary();
    const plan = buildSnapshotActionPlan("run-1", summary);

    expect(plan.scanRunId).toBe("run-1");
    expect(plan.prospectName).toBe("Plaid");
    expect(plan.generatedAt).toBeTruthy();
    expect(plan.talkingPoints).toHaveLength(3);
    expect(plan.predictedPushback.length).toBeGreaterThanOrEqual(4);
    expect(plan.predictedPushback.length).toBeLessThanOrEqual(6);
    expect(plan.questionsToAsk).toHaveLength(3);
    expect(plan.replyTemplates).toHaveLength(2);
    expect(plan.replyTemplates[0]!.variant).toBe("interested");
    expect(plan.replyTemplates[1]!.variant).toBe("not_now");
    expect(plan.fullAssessmentPitch.length).toBeGreaterThan(0);
  });

  it("produces exactly 3 talking points", () => {
    const plan = buildSnapshotActionPlan("run-1", makeSnapshotSummary());
    expect(plan.talkingPoints).toHaveLength(3);
  });

  it("talking points include label, detail, metric, and hookScore", () => {
    const plan = buildSnapshotActionPlan("run-1", makeSnapshotSummary());
    for (const tp of plan.talkingPoints) {
      expect(tp.label.length).toBeGreaterThan(0);
      expect(tp.detail.length).toBeGreaterThan(0);
      expect(tp.metric.length).toBeGreaterThan(0);
      expect(typeof tp.hookScore).toBe("number");
    }
  });

  it("produces 4-6 pushback items", () => {
    const plan = buildSnapshotActionPlan("run-1", makeSnapshotSummary());
    expect(plan.predictedPushback.length).toBeGreaterThanOrEqual(4);
    expect(plan.predictedPushback.length).toBeLessThanOrEqual(6);
  });

  it("produces sensible output when there are no competitor gaps", () => {
    const summary = makeSnapshotSummary({
      competitorContrast: {
        queriesRun: 0,
        competitorSummaries: [],
        worstComparison: null,
        allResults: [],
      },
      citationGap: {
        prospectOwnedCitations: 3,
        prospectTotalCitations: 3,
        competitorOwnedCitations: 0,
        gapPlatforms: [],
        finding: "No citation gap.",
        prospectEmployerCitations: 3,
        competitorEmployerCitations: 0,
      },
    });

    const plan = buildSnapshotActionPlan("run-1", summary);

    // Should still produce 3 talking points — not empty even with no competitor gaps
    expect(plan.talkingPoints).toHaveLength(3);
    expect(plan.questionsToAsk).toHaveLength(3);
    expect(plan.predictedPushback.length).toBeGreaterThan(0);
  });

  it("fullAssessmentPitch mentions the prospect name", () => {
    const plan = buildSnapshotActionPlan("run-1", makeSnapshotSummary());
    expect(plan.fullAssessmentPitch).toContain("Plaid");
  });

  it("reply templates use warm peer-to-peer tone, not vendor tone", () => {
    const plan = buildSnapshotActionPlan("run-1", makeSnapshotSummary());
    const interestedBody = plan.replyTemplates.find((t) => t.variant === "interested")?.body ?? "";

    expect(interestedBody).toMatch(/Here is why I reached out/);
    expect(interestedBody).not.toMatch(/I built a tool/);
    expect(interestedBody).toMatch(/Jordan Ellison/);
  });
});
