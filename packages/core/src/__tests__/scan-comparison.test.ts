import { describe, it, expect } from "vitest";
import { computeScanComparison } from "../scan-comparison";
import type { ScanResultData } from "../scan-comparison";

function makeResult(
  overrides: Partial<ScanResultData> = {},
): ScanResultData {
  return {
    mentioned: false,
    visibilityScore: null,
    sentimentScore: null,
    metadata: null,
    citations: [],
    ...overrides,
  };
}

const COMPETITOR_META = {
  competitorMentions: [
    { name: "Apex Cloud", domain: "apex.com", mentioned: true },
    { name: "NovaBridge", domain: "novabridge.io", mentioned: false },
  ],
};

// ─── Basic structure ────────────────────────────────────────

describe("computeScanComparison", () => {
  it("returns correct structure for empty results", () => {
    const result = computeScanComparison("Acme Corp", [], 5);

    expect(result.totalQueries).toBe(5);
    expect(result.completedQueries).toBe(0);
    expect(result.clientMentionRate).toBe(0);
    expect(result.avgVisibilityScore).toBeNull();
    expect(result.avgSentimentScore).toBeNull();
    expect(result.entityMentions).toHaveLength(0);
    expect(result.citations.totalDomains).toBe(0);
  });

  it("computes client mention rate", () => {
    const results = [
      makeResult({ mentioned: true }),
      makeResult({ mentioned: true }),
      makeResult({ mentioned: false }),
      makeResult({ mentioned: true }),
    ];

    const comp = computeScanComparison("Acme Corp", results, 4);
    expect(comp.clientMentionRate).toBe(0.75);
  });

  it("computes average visibility score", () => {
    const results = [
      makeResult({ visibilityScore: 60 }),
      makeResult({ visibilityScore: 80 }),
      makeResult({ visibilityScore: null }),
    ];

    const comp = computeScanComparison("Acme Corp", results, 3);
    expect(comp.avgVisibilityScore).toBe(70);
  });

  it("computes average sentiment score", () => {
    const results = [
      makeResult({ sentimentScore: 0.5 }),
      makeResult({ sentimentScore: -0.3 }),
    ];

    const comp = computeScanComparison("Acme Corp", results, 2);
    expect(comp.avgSentimentScore).toBe(0.1);
  });

  it("returns null averages when no scores present", () => {
    const results = [makeResult(), makeResult()];
    const comp = computeScanComparison("Acme Corp", results, 2);
    expect(comp.avgVisibilityScore).toBeNull();
    expect(comp.avgSentimentScore).toBeNull();
  });
});

// ─── Entity mentions ────────────────────────────────────────

describe("entity mentions", () => {
  it("includes client as first entry marked isClient", () => {
    const results = [makeResult({ mentioned: true })];
    const comp = computeScanComparison("Acme Corp", results, 1);

    expect(comp.entityMentions[0].name).toBe("Acme Corp");
    expect(comp.entityMentions[0].isClient).toBe(true);
    expect(comp.entityMentions[0].mentionCount).toBe(1);
    expect(comp.entityMentions[0].mentionRate).toBe(1);
  });

  it("aggregates competitor mentions across results", () => {
    const results = [
      makeResult({
        mentioned: true,
        metadata: {
          competitorMentions: [
            { name: "Apex", domain: "apex.com", mentioned: true },
            { name: "Nova", domain: "nova.io", mentioned: false },
          ],
        },
      }),
      makeResult({
        mentioned: false,
        metadata: {
          competitorMentions: [
            { name: "Apex", domain: "apex.com", mentioned: true },
            { name: "Nova", domain: "nova.io", mentioned: true },
          ],
        },
      }),
    ];

    const comp = computeScanComparison("Client", results, 2);

    const apex = comp.entityMentions.find((e) => e.name === "Apex");
    expect(apex).toBeDefined();
    expect(apex!.mentionCount).toBe(2);
    expect(apex!.mentionRate).toBe(1);
    expect(apex!.isClient).toBe(false);

    const nova = comp.entityMentions.find((e) => e.name === "Nova");
    expect(nova!.mentionCount).toBe(1);
    expect(nova!.mentionRate).toBe(0.5);
  });

  it("sorts competitors by mention count descending", () => {
    const results = [
      makeResult({
        metadata: {
          competitorMentions: [
            { name: "Rare", domain: "r.com", mentioned: false },
            { name: "Common", domain: "c.com", mentioned: true },
          ],
        },
      }),
      makeResult({
        metadata: {
          competitorMentions: [
            { name: "Rare", domain: "r.com", mentioned: true },
            { name: "Common", domain: "c.com", mentioned: true },
          ],
        },
      }),
    ];

    const comp = computeScanComparison("Client", results, 2);
    const competitors = comp.entityMentions.filter((e) => !e.isClient);

    expect(competitors[0].name).toBe("Common");
    expect(competitors[1].name).toBe("Rare");
  });

  it("handles results without competitor metadata", () => {
    const results = [
      makeResult({ mentioned: true, metadata: null }),
      makeResult({ mentioned: false, metadata: { source: "manual" } }),
    ];

    const comp = computeScanComparison("Client", results, 2);
    // Only client entry, no competitors
    expect(comp.entityMentions).toHaveLength(1);
    expect(comp.entityMentions[0].isClient).toBe(true);
  });
});

// ─── Citation analysis ──────────────────────────────────────

describe("citation analysis", () => {
  it("counts total unique domains", () => {
    const results = [
      makeResult({
        mentioned: true,
        citations: [{ domain: "glassdoor.com" }, { domain: "linkedin.com" }],
      }),
      makeResult({
        mentioned: false,
        citations: [{ domain: "glassdoor.com" }, { domain: "indeed.com" }],
      }),
    ];

    const comp = computeScanComparison("Client", results, 2);
    expect(comp.citations.totalDomains).toBe(3);
  });

  it("identifies client-exclusive domains", () => {
    const results = [
      makeResult({
        mentioned: true,
        citations: [{ domain: "careers.acme.com" }, { domain: "shared.com" }],
      }),
      makeResult({
        mentioned: false,
        citations: [{ domain: "shared.com" }, { domain: "competitor-blog.com" }],
      }),
    ];

    const comp = computeScanComparison("Client", results, 2);
    expect(comp.citations.clientExclusiveDomains).toContain("careers.acme.com");
    expect(comp.citations.clientExclusiveDomains).not.toContain("shared.com");
  });

  it("identifies gap domains (only in client-absent responses)", () => {
    const results = [
      makeResult({
        mentioned: true,
        citations: [{ domain: "glassdoor.com" }],
      }),
      makeResult({
        mentioned: false,
        citations: [{ domain: "glassdoor.com" }, { domain: "levels.fyi" }],
      }),
    ];

    const comp = computeScanComparison("Client", results, 2);
    expect(comp.citations.gapDomains).toContain("levels.fyi");
    expect(comp.citations.gapDomains).not.toContain("glassdoor.com");
  });

  it("identifies shared domains", () => {
    const results = [
      makeResult({
        mentioned: true,
        citations: [{ domain: "glassdoor.com" }],
      }),
      makeResult({
        mentioned: false,
        citations: [{ domain: "glassdoor.com" }],
      }),
    ];

    const comp = computeScanComparison("Client", results, 2);
    expect(comp.citations.sharedDomains).toContain("glassdoor.com");
  });

  it("sorts domain frequency descending", () => {
    const results = [
      makeResult({
        mentioned: true,
        citations: [{ domain: "a.com" }, { domain: "b.com" }],
      }),
      makeResult({
        mentioned: true,
        citations: [{ domain: "b.com" }, { domain: "c.com" }],
      }),
      makeResult({
        mentioned: false,
        citations: [{ domain: "b.com" }],
      }),
    ];

    const comp = computeScanComparison("Client", results, 3);
    expect(comp.citations.domainFrequency[0].domain).toBe("b.com");
    expect(comp.citations.domainFrequency[0].count).toBe(3);
  });

  it("handles results with no citations", () => {
    const results = [makeResult({ mentioned: true }), makeResult()];
    const comp = computeScanComparison("Client", results, 2);

    expect(comp.citations.totalDomains).toBe(0);
    expect(comp.citations.gapDomains).toHaveLength(0);
    expect(comp.citations.clientExclusiveDomains).toHaveLength(0);
    expect(comp.citations.sharedDomains).toHaveLength(0);
  });

  it("handles null domains in citations", () => {
    const results = [
      makeResult({
        mentioned: true,
        citations: [{ domain: null }, { domain: "valid.com" }],
      }),
    ];

    const comp = computeScanComparison("Client", results, 1);
    expect(comp.citations.totalDomains).toBe(1);
  });
});

// ─── Full integration ───────────────────────────────────────

describe("full scan comparison", () => {
  it("computes a realistic scan comparison", () => {
    const results: ScanResultData[] = [
      makeResult({
        mentioned: true,
        visibilityScore: 72,
        sentimentScore: 0.4,
        metadata: COMPETITOR_META,
        citations: [
          { domain: "glassdoor.com" },
          { domain: "linkedin.com" },
        ],
      }),
      makeResult({
        mentioned: true,
        visibilityScore: 55,
        sentimentScore: 0.2,
        metadata: {
          competitorMentions: [
            { name: "Apex Cloud", domain: "apex.com", mentioned: false },
            { name: "NovaBridge", domain: "novabridge.io", mentioned: true },
          ],
        },
        citations: [{ domain: "glassdoor.com" }, { domain: "indeed.com" }],
      }),
      makeResult({
        mentioned: false,
        visibilityScore: 0,
        sentimentScore: 0,
        metadata: COMPETITOR_META,
        citations: [
          { domain: "levels.fyi" },
          { domain: "glassdoor.com" },
        ],
      }),
    ];

    const comp = computeScanComparison("Meridian Tech", results, 5);

    // Structure
    expect(comp.totalQueries).toBe(5);
    expect(comp.completedQueries).toBe(3);

    // Client stats
    expect(comp.clientMentionRate).toBeCloseTo(2 / 3);
    expect(comp.avgVisibilityScore).toBeCloseTo(42.33);

    // Mentions: client first, competitors sorted by count
    expect(comp.entityMentions[0].name).toBe("Meridian Tech");
    expect(comp.entityMentions[0].mentionCount).toBe(2);

    const apex = comp.entityMentions.find((e) => e.name === "Apex Cloud");
    expect(apex!.mentionCount).toBe(2); // mentioned in result 1 and 3

    const nova = comp.entityMentions.find((e) => e.name === "NovaBridge");
    expect(nova!.mentionCount).toBe(1); // mentioned in result 2 only

    // Citations
    expect(comp.citations.totalDomains).toBe(4);
    expect(comp.citations.sharedDomains).toContain("glassdoor.com");
    expect(comp.citations.gapDomains).toContain("levels.fyi");
    expect(comp.citations.clientExclusiveDomains).toEqual(
      expect.arrayContaining(["indeed.com", "linkedin.com"]),
    );
  });
});
