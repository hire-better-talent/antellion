import { describe, it, expect } from "vitest";
import {
  toPublicSnapshotSummary,
  type SnapshotSummary,
  type PublicSnapshotSummary,
} from "../snapshot-summary";

// ─── Fixture ─────────────────────────────────────────────────

function makeFullSummary(): SnapshotSummary {
  return {
    prospectName: "Plaid",
    totalQueries: 100,
    discoveryMentionRate: 0.08,
    discoveryMentionCount: 5,
    overallMentionRate: 0.12,
    visibilityTier: "low",

    discovery: {
      queriesRun: 65,
      prospectMentioned: 5,
      mentionRate: 0.077,
      competitorRanking: [
        { name: "Stripe", mentioned: 40, mentionCount: 40, mentionRate: 0.615 },
      ],
      topCompetitorName: "Stripe",
      topCompetitorMentioned: 40,
      topGapQueries: [
        {
          queryText: "best fintech employers",
          competitorsMentioned: ["Stripe"],
          prospectMentioned: false,
          responseExcerpt: "Stripe is a top fintech employer.",
        },
      ],
      themeBreakdown: [
        { theme: "culture", queriesRun: 10, prospectMentioned: 1, mentionRate: 0.1 },
      ],
      allResults: [
        {
          queryText: "best fintech employers",
          prospectMentioned: false,
          competitorsMentioned: ["Stripe"],
        },
      ],
    },

    competitorContrast: {
      queriesRun: 18,
      competitorSummaries: [
        {
          competitorName: "Stripe",
          queriesRun: 9,
          competitorFavoredCount: 7,
          prospectFavoredCount: 1,
          neutralCount: 1,
          favorRate: 0.78,
          worstDimension: "engineering culture",
          worstExcerpt: "Stripe is generally preferred.",
        },
      ],
      worstComparison: {
        queryText: "Plaid vs Stripe for engineers",
        competitorName: "Stripe",
        responseExcerpt: "Stripe is the stronger choice.",
        prospectSentiment: -0.4,
        competitorFavored: true,
      },
      allResults: [
        {
          queryText: "Plaid vs Stripe",
          competitorName: "Stripe",
          prospectSentiment: -0.4,
          responseExcerpt: "Stripe is the stronger choice.",
          competitorFavored: true,
        },
      ],
    },

    reputation: {
      queriesRun: 10,
      avgSentiment: -0.1,
      narrativeConsistency: "varied",
      recurringThemes: ["fintech", "API-focused"],
      worstResponse: {
        queryText: "what is it like to work at Plaid",
        responseExcerpt: "Plaid is primarily known for its tech.",
        sentiment: -0.3,
        keyIssue: "product focus over employer brand",
      },
    },

    citationGap: {
      prospectOwnedCitations: 1,
      prospectTotalCitations: 5,
      competitorOwnedCitations: 8,
      gapPlatforms: ["LinkedIn", "Glassdoor"],
      finding: "Competitors dominate employer-relevant citations.",
      prospectEmployerCitations: 1,
      competitorEmployerCitations: 8,
    },

    // Operator-only fields
    primaryHook: {
      category: "discovery_absence",
      headline: "Plaid is invisible in 92% of AI employer queries",
      evidence: "Only 5 of 65 discovery queries mentioned Plaid.",
      quotableText: "Stripe appeared in 40 of the same queries where Plaid did not appear at all.",
      findingStrength: "strong",
    },

    interpretation: {
      primaryTakeaway: "Plaid has a critical discovery gap.",
      strength: {
        label: "Reputation",
        title: "Neutral reputation signal",
        detail: "Plaid gets a neutral reputation score.",
        source: "reputation",
      },
      opportunities: [
        {
          label: "Discovery",
          title: "Not mentioned in most queries",
          detail: "Plaid absent from 92% of discovery queries.",
          source: "discovery_gap",
        },
        {
          label: "Citations",
          title: "No owned citations",
          detail: "Competitors dominate citation surfaces.",
          source: "citation",
        },
      ],
      bridge: "Fixing discovery gaps would materially improve AI visibility.",
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────

describe("toPublicSnapshotSummary", () => {
  it("excludes primaryHook entirely", () => {
    const full = makeFullSummary();
    const pub = toPublicSnapshotSummary(full);

    expect(pub).not.toHaveProperty("primaryHook");
  });

  it("excludes interpretation entirely", () => {
    const full = makeFullSummary();
    const pub = toPublicSnapshotSummary(full);

    expect(pub).not.toHaveProperty("interpretation");
  });

  it("excludes discovery.allResults", () => {
    const full = makeFullSummary();
    const pub = toPublicSnapshotSummary(full);

    expect(pub.discovery).not.toHaveProperty("allResults");
  });

  it("excludes competitorContrast.allResults", () => {
    const full = makeFullSummary();
    const pub = toPublicSnapshotSummary(full);

    expect(pub.competitorContrast).not.toHaveProperty("allResults");
  });

  it("preserves top-level scoreboard fields unchanged", () => {
    const full = makeFullSummary();
    const pub = toPublicSnapshotSummary(full);

    expect(pub.prospectName).toBe("Plaid");
    expect(pub.totalQueries).toBe(100);
    expect(pub.discoveryMentionRate).toBe(0.08);
    expect(pub.discoveryMentionCount).toBe(5);
    expect(pub.overallMentionRate).toBe(0.12);
    expect(pub.visibilityTier).toBe("low");
  });

  it("preserves discovery fields needed by the public view", () => {
    const full = makeFullSummary();
    const pub = toPublicSnapshotSummary(full);

    expect(pub.discovery.queriesRun).toBe(65);
    expect(pub.discovery.mentionRate).toBe(0.077);
    expect(pub.discovery.topGapQueries).toHaveLength(1);
    expect(pub.discovery.topGapQueries[0]?.queryText).toBe("best fintech employers");
    expect(pub.discovery.competitorRanking[0]?.name).toBe("Stripe");
    expect(pub.discovery.themeBreakdown[0]?.theme).toBe("culture");
  });

  it("preserves competitorContrast fields needed by the public view", () => {
    const full = makeFullSummary();
    const pub = toPublicSnapshotSummary(full);

    expect(pub.competitorContrast.competitorSummaries).toHaveLength(1);
    expect(pub.competitorContrast.competitorSummaries[0]?.competitorName).toBe("Stripe");
    expect(pub.competitorContrast.worstComparison?.competitorName).toBe("Stripe");
  });

  it("preserves reputation fields needed by the public view", () => {
    const full = makeFullSummary();
    const pub = toPublicSnapshotSummary(full);

    expect(pub.reputation.narrativeConsistency).toBe("varied");
    expect(pub.reputation.recurringThemes).toEqual(["fintech", "API-focused"]);
    expect(pub.reputation.worstResponse?.responseExcerpt).toBe("Plaid is primarily known for its tech.");
  });

  it("preserves citationGap fields needed by the public view", () => {
    const full = makeFullSummary();
    const pub = toPublicSnapshotSummary(full);

    expect(pub.citationGap.prospectOwnedCitations).toBe(1);
    expect(pub.citationGap.prospectTotalCitations).toBe(5);
    expect(pub.citationGap.competitorOwnedCitations).toBe(8);
    expect(pub.citationGap.gapPlatforms).toEqual(["LinkedIn", "Glassdoor"]);
    expect(pub.citationGap.finding).toBe("Competitors dominate employer-relevant citations.");
  });

  it("handles null worstComparison and worstResponse correctly", () => {
    const full = makeFullSummary();
    full.competitorContrast.worstComparison = null;
    full.reputation.worstResponse = null;

    const pub = toPublicSnapshotSummary(full);

    expect(pub.competitorContrast.worstComparison).toBeNull();
    expect(pub.reputation.worstResponse).toBeNull();
  });

  it("is pure — same input produces same output", () => {
    const full = makeFullSummary();
    const pub1 = toPublicSnapshotSummary(full);
    const pub2 = toPublicSnapshotSummary(full);

    expect(pub1).toEqual(pub2);
  });

  it("does not mutate the input summary", () => {
    const full = makeFullSummary();
    const hookBefore = full.primaryHook.headline;
    toPublicSnapshotSummary(full);

    expect(full.primaryHook.headline).toBe(hookBefore);
  });

  it("satisfies the PublicSnapshotSummary type (structural check)", () => {
    const full = makeFullSummary();
    // If this compiles, the return type is assignable to PublicSnapshotSummary.
    const pub: PublicSnapshotSummary = toPublicSnapshotSummary(full);
    expect(pub).toBeDefined();
  });
});
