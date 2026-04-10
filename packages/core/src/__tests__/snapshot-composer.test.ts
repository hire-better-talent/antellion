import { describe, it, expect } from "vitest";
import { composeSnapshot } from "../snapshot-composer";
import type { SnapshotInput } from "../snapshot-composer";
import type { ScanComparisonResult } from "../scan-comparison";

// ─── Fixtures ────────────────────────────────────────────────

function makeComparison(
  overrides: Partial<ScanComparisonResult> = {},
): ScanComparisonResult {
  return {
    totalQueries: 10,
    completedQueries: 10,
    clientMentionRate: 0.4,
    avgVisibilityScore: 55,
    avgSentimentScore: 0.2,
    entityMentions: [
      { name: "Meridian Tech", isClient: true, mentionCount: 4, mentionRate: 0.4 },
      { name: "Apex Cloud", isClient: false, mentionCount: 7, mentionRate: 0.7 },
      { name: "NovaBridge", isClient: false, mentionCount: 3, mentionRate: 0.3 },
    ],
    citations: {
      totalDomains: 5,
      clientExclusiveDomains: ["meridiantech.com"],
      gapDomains: ["glassdoor.com", "levels.fyi", "blind.com", "reddit.com"],
      sharedDomains: ["linkedin.com"],
      domainFrequency: [
        { domain: "linkedin.com", count: 6 },
        { domain: "glassdoor.com", count: 4 },
        { domain: "levels.fyi", count: 2 },
        { domain: "blind.com", count: 2 },
        { domain: "reddit.com", count: 1 },
        { domain: "meridiantech.com", count: 1 },
      ],
    },
    ...overrides,
  };
}

const BASE_INPUT: SnapshotInput = {
  clientName: "Meridian Technologies",
  clientDomain: "meridiantech.com",
  industry: "Enterprise Software",
  scanComparison: makeComparison(),
  competitors: [
    { name: "Apex Cloud", domain: "apexcloud.com" },
    { name: "NovaBridge", domain: "novabridge.io" },
  ],
};

// ─── Basic generation ────────────────────────────────────────

describe("composeSnapshot", () => {
  it("returns a complete snapshot structure", () => {
    const snapshot = composeSnapshot(BASE_INPUT);

    expect(snapshot.title).toContain("Meridian Technologies");
    expect(snapshot.clientName).toBe("Meridian Technologies");
    expect(snapshot.clientDomain).toBe("meridiantech.com");
    expect(snapshot.industry).toBe("Enterprise Software");
    expect(snapshot.generatedAt).toBeTruthy();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.summary.length).toBeGreaterThan(0);
  });

  it("generatedAt is a valid ISO date string", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    expect(() => new Date(snapshot.generatedAt)).not.toThrow();
    expect(new Date(snapshot.generatedAt).toISOString()).toBe(snapshot.generatedAt);
  });
});

// ─── Metrics ─────────────────────────────────────────────────

describe("metrics", () => {
  it("computes correct mentionRate and label", () => {
    const snapshot = composeSnapshot(BASE_INPUT);

    expect(snapshot.metrics.mentionRate).toBe(0.4);
    expect(snapshot.metrics.mentionRateLabel).toBe("40%");
  });

  it("assigns correct mentionTier for moderate rate", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    expect(snapshot.metrics.mentionTier).toBe("Moderate");
  });

  it("assigns Strong tier for high mention rate", () => {
    const snapshot = composeSnapshot({
      ...BASE_INPUT,
      scanComparison: makeComparison({ clientMentionRate: 0.8 }),
    });
    expect(snapshot.metrics.mentionTier).toBe("Strong");
  });

  it("assigns Limited tier for low mention rate", () => {
    const snapshot = composeSnapshot({
      ...BASE_INPUT,
      scanComparison: makeComparison({ clientMentionRate: 0.25 }),
    });
    expect(snapshot.metrics.mentionTier).toBe("Limited");
  });

  it("assigns Minimal tier for very low mention rate", () => {
    const snapshot = composeSnapshot({
      ...BASE_INPUT,
      scanComparison: makeComparison({ clientMentionRate: 0.1 }),
    });
    expect(snapshot.metrics.mentionTier).toBe("Minimal");
  });

  it("computes correct timesMentioned and queriesEvaluated", () => {
    const snapshot = composeSnapshot(BASE_INPUT);

    expect(snapshot.metrics.timesMentioned).toBe(4);
    expect(snapshot.metrics.queriesEvaluated).toBe(10);
  });

  it("sentiment is positive for positive score", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    // avgSentimentScore: 0.2 → "slightly positive"
    expect(snapshot.metrics.sentiment.toLowerCase()).toContain("positive");
  });

  it("sentiment is neutral for null score", () => {
    const snapshot = composeSnapshot({
      ...BASE_INPUT,
      scanComparison: makeComparison({ avgSentimentScore: null }),
    });
    expect(snapshot.metrics.sentiment.toLowerCase()).toBe("neutral");
  });
});

// ─── Zero and 100% mention rate ──────────────────────────────

describe("edge case mention rates", () => {
  it("handles zero mention rate without errors", () => {
    const comparison = makeComparison({
      clientMentionRate: 0,
      entityMentions: [
        { name: "Meridian Tech", isClient: true, mentionCount: 0, mentionRate: 0 },
        { name: "Apex Cloud", isClient: false, mentionCount: 5, mentionRate: 0.5 },
      ],
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.metrics.mentionRate).toBe(0);
    expect(snapshot.metrics.mentionRateLabel).toBe("0%");
    expect(snapshot.metrics.mentionTier).toBe("Minimal");
    expect(snapshot.metrics.timesMentioned).toBe(0);
  });

  it("handles 100% mention rate without errors", () => {
    const comparison = makeComparison({
      clientMentionRate: 1,
      entityMentions: [
        { name: "Meridian Tech", isClient: true, mentionCount: 10, mentionRate: 1 },
        { name: "Apex Cloud", isClient: false, mentionCount: 6, mentionRate: 0.6 },
      ],
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.metrics.mentionRate).toBe(1);
    expect(snapshot.metrics.mentionRateLabel).toBe("100%");
    expect(snapshot.metrics.mentionTier).toBe("Strong");
    expect(snapshot.metrics.timesMentioned).toBe(10);
  });
});

// ─── Top competitor ──────────────────────────────────────────

describe("topCompetitor", () => {
  it("identifies the highest-mention-rate competitor", () => {
    const snapshot = composeSnapshot(BASE_INPUT);

    expect(snapshot.topCompetitor).not.toBeNull();
    expect(snapshot.topCompetitor?.name).toBe("Apex Cloud");
    expect(snapshot.topCompetitor?.mentionRate).toBe(0.7);
    expect(snapshot.topCompetitor?.mentionRateLabel).toBe("70%");
  });

  it("computes gapPp correctly", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    // 0.7 - 0.4 = 0.3 → 30pp
    expect(snapshot.topCompetitor?.gapPp).toBe(30);
  });

  it("provides a multiple string", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    // 0.7 / 0.4 in IEEE 754 is ~1.7499..., so toFixed(1) → "1.7"
    expect(snapshot.topCompetitor?.multiple).toContain("1.7x");
  });

  it("returns null topCompetitor when no competitors in entity mentions", () => {
    const comparison = makeComparison({
      entityMentions: [
        { name: "Meridian Tech", isClient: true, mentionCount: 4, mentionRate: 0.4 },
      ],
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.topCompetitor).toBeNull();
  });

  it("returns null topCompetitor when competitors array is empty and no entityMentions", () => {
    const comparison = makeComparison({
      entityMentions: [
        { name: "Meridian Tech", isClient: true, mentionCount: 4, mentionRate: 0.4 },
      ],
    });
    const snapshot = composeSnapshot({
      ...BASE_INPUT,
      competitors: [],
      scanComparison: comparison,
    });

    expect(snapshot.topCompetitor).toBeNull();
  });
});

// ─── Citation gaps ───────────────────────────────────────────

describe("citationGaps", () => {
  it("returns up to 3 citation gaps", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    // gapDomains has 4 entries; should be capped at 3
    expect(snapshot.citationGaps.length).toBe(3);
  });

  it("each gap has domain, sourceType, and action", () => {
    const snapshot = composeSnapshot(BASE_INPUT);

    for (const gap of snapshot.citationGaps) {
      expect(gap.domain.length).toBeGreaterThan(0);
      expect(gap.sourceType.length).toBeGreaterThan(0);
      expect(gap.action.length).toBeGreaterThan(0);
    }
  });

  it("uses known sourceType for glassdoor.com", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    const glassdoor = snapshot.citationGaps.find((g) => g.domain === "glassdoor.com");

    expect(glassdoor).toBeDefined();
    expect(glassdoor?.sourceType).toBe("Employee review site");
  });

  it("returns empty citationGaps when no gap domains", () => {
    const comparison = makeComparison({
      citations: {
        totalDomains: 1,
        clientExclusiveDomains: ["meridiantech.com"],
        gapDomains: [],
        sharedDomains: ["linkedin.com"],
        domainFrequency: [{ domain: "linkedin.com", count: 4 }],
      },
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.citationGaps).toHaveLength(0);
  });

  it("returns exactly 3 gaps even when fewer are present", () => {
    const comparison = makeComparison({
      citations: {
        totalDomains: 3,
        clientExclusiveDomains: [],
        gapDomains: ["glassdoor.com", "levels.fyi"],
        sharedDomains: ["linkedin.com"],
        domainFrequency: [],
      },
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.citationGaps.length).toBe(2);
  });
});

// ─── Summary ─────────────────────────────────────────────────

describe("summary", () => {
  it("contains the upsell sentence about the full Assessment", () => {
    const snapshot = composeSnapshot(BASE_INPUT);

    expect(snapshot.summary).toContain(
      "A full AI Employer Visibility Assessment would evaluate",
    );
    expect(snapshot.summary).toContain("prioritized remediation plan");
  });

  it("contains the client name", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    expect(snapshot.summary).toContain("Meridian Technologies");
  });

  it("contains the top competitor name", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    expect(snapshot.summary).toContain("Apex Cloud");
  });

  it("mentions the client mention rate percentage", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    expect(snapshot.summary).toContain("40%");
  });

  it("handles no competitor gracefully in summary", () => {
    const comparison = makeComparison({
      entityMentions: [
        { name: "Meridian Tech", isClient: true, mentionCount: 4, mentionRate: 0.4 },
      ],
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.summary).not.toContain("undefined");
    expect(snapshot.summary).toContain("No competitor benchmark data");
  });

  it("mentions citation gap count in summary", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    // gapDomains has 4 entries
    expect(snapshot.summary).toContain("4 citation source");
  });

  it("handles no citation gaps gracefully in summary", () => {
    const comparison = makeComparison({
      citations: {
        totalDomains: 0,
        clientExclusiveDomains: [],
        gapDomains: [],
        sharedDomains: [],
        domainFrequency: [],
      },
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.summary).toContain("No citation gaps");
  });

  it("uses singular grammar for exactly 1 citation gap", () => {
    const comparison = makeComparison({
      citations: {
        totalDomains: 2,
        clientExclusiveDomains: [],
        gapDomains: ["glassdoor.com"],
        sharedDomains: ["linkedin.com"],
        domainFrequency: [],
      },
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.summary).toContain("1 citation source was identified");
    expect(snapshot.summary).not.toMatch(/1 citation sources/);
  });

  it("uses plural grammar for multiple citation gaps", () => {
    const snapshot = composeSnapshot(BASE_INPUT);
    // gapDomains has 4 entries
    expect(snapshot.summary).toContain("4 citation sources were identified");
  });
});

// ─── Multiple / comparison text ─────────────────────────────

describe("snapshotMultiple (via topCompetitor.multiple)", () => {
  it("says 'significantly more visible' when client rate is zero", () => {
    const comparison = makeComparison({
      clientMentionRate: 0,
      entityMentions: [
        { name: "Meridian Tech", isClient: true, mentionCount: 0, mentionRate: 0 },
        { name: "Apex Cloud", isClient: false, mentionCount: 5, mentionRate: 0.5 },
      ],
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.topCompetitor?.multiple).toBe("significantly more visible");
  });

  it("says 'roughly equally visible' when rates are similar", () => {
    const comparison = makeComparison({
      clientMentionRate: 0.5,
      entityMentions: [
        { name: "Meridian Tech", isClient: true, mentionCount: 5, mentionRate: 0.5 },
        { name: "Apex Cloud", isClient: false, mentionCount: 5, mentionRate: 0.5 },
      ],
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.topCompetitor?.multiple).toBe("roughly equally visible");
  });

  it("uses integer format for extreme ratios (>=10x)", () => {
    const comparison = makeComparison({
      clientMentionRate: 0.05,
      entityMentions: [
        { name: "Meridian Tech", isClient: true, mentionCount: 1, mentionRate: 0.05 },
        { name: "Apex Cloud", isClient: false, mentionCount: 10, mentionRate: 1.0 },
      ],
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.topCompetitor?.multiple).toBe("20x more visible");
  });

  it("negative gapPp when client is ahead of competitor", () => {
    const comparison = makeComparison({
      clientMentionRate: 0.8,
      entityMentions: [
        { name: "Meridian Tech", isClient: true, mentionCount: 8, mentionRate: 0.8 },
        { name: "Apex Cloud", isClient: false, mentionCount: 3, mentionRate: 0.3 },
      ],
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.topCompetitor?.gapPp).toBe(-50);
    expect(snapshot.topCompetitor?.multiple).toBe("roughly equally visible");
  });
});

// ─── Empty entityMentions ───────────────────────────────────

describe("empty entityMentions", () => {
  it("handles completely empty entityMentions without errors", () => {
    const comparison = makeComparison({
      clientMentionRate: 0,
      entityMentions: [],
      citations: {
        totalDomains: 0,
        clientExclusiveDomains: [],
        gapDomains: [],
        sharedDomains: [],
        domainFrequency: [],
      },
    });
    const snapshot = composeSnapshot({ ...BASE_INPUT, scanComparison: comparison });

    expect(snapshot.metrics.timesMentioned).toBe(0);
    expect(snapshot.metrics.mentionRate).toBe(0);
    expect(snapshot.topCompetitor).toBeNull();
    expect(snapshot.citationGaps).toHaveLength(0);
    expect(snapshot.summary).not.toContain("undefined");
  });
});

// ─── Industry omitted ───────────────────────────────────────

describe("optional fields", () => {
  it("industry is undefined when not provided", () => {
    const input: SnapshotInput = {
      ...BASE_INPUT,
      industry: undefined,
    };
    const snapshot = composeSnapshot(input);

    expect(snapshot.industry).toBeUndefined();
    // Must not render as the string "undefined"
    expect(snapshot.title).not.toContain("undefined");
    expect(snapshot.summary).not.toContain("undefined");
  });
});
