import { describe, it, expect } from "vitest";
import {
  generateBoundaryQueries,
  detectVisibilityBoundary,
  parseBoundarySpecificity,
  classifyNonBoundaryDiscoveryResult,
  hasSufficientBoundaryData,
  filterBoundaryResults,
  SPECIFICITY_ORDER,
} from "../visibility-boundary";
import type {
  BoundaryDetectionInput,
  SpecificityLevel,
} from "../visibility-boundary";

// ─── Helpers ─────────────────────────────────────────────────

function makeResult(
  specificity: SpecificityLevel,
  mentioned: boolean,
  competitorMentions?: Array<{ name: string; mentioned: boolean }>,
): BoundaryDetectionInput["results"][number] {
  return {
    intent: `boundary:${specificity}`,
    mentioned,
    metadata: competitorMentions ? { competitorMentions } : null,
  };
}

// ─── parseBoundarySpecificity ─────────────────────────────────

describe("parseBoundarySpecificity", () => {
  it("parses 'boundary:broad'", () => {
    expect(parseBoundarySpecificity("boundary:broad")).toBe("broad");
  });

  it("parses 'boundary:industry' with trailing context", () => {
    expect(parseBoundarySpecificity("boundary:industry [priority: 7]")).toBe(
      "industry",
    );
  });

  it("parses 'boundary:niche'", () => {
    expect(parseBoundarySpecificity("boundary:niche")).toBe("niche");
  });

  it("parses 'boundary:hyper_specific'", () => {
    expect(
      parseBoundarySpecificity("boundary:hyper_specific"),
    ).toBe("hyper_specific");
  });

  it("returns null for non-boundary intent", () => {
    expect(parseBoundarySpecificity("Industry employer ranking")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseBoundarySpecificity("")).toBeNull();
  });
});

// ─── generateBoundaryQueries ──────────────────────────────────

describe("generateBoundaryQueries", () => {
  const baseInput = {
    role: "Sales",
    industry: "Hospitality",
    nicheKeywords: ["timeshare", "vacation ownership"],
    geography: "Orlando",
  };

  it("returns queries for all 4 specificity levels when geography is provided", () => {
    const queries = generateBoundaryQueries(baseInput);
    const levels = new Set(queries.map((q) => q.specificity));
    expect(levels).toContain("broad");
    expect(levels).toContain("industry");
    expect(levels).toContain("niche");
    expect(levels).toContain("hyper_specific");
  });

  it("produces broad and industry queries for each family (6 families x 2 = 12 always-present)", () => {
    const queries = generateBoundaryQueries({
      ...baseInput,
      nicheKeywords: ["timeshare"],
      geography: undefined,
    });
    const broadCount = queries.filter((q) => q.specificity === "broad").length;
    const industryCount = queries.filter(
      (q) => q.specificity === "industry",
    ).length;
    expect(broadCount).toBe(6);
    expect(industryCount).toBe(6);
  });

  it("produces niche queries for each keyword per family", () => {
    const queries = generateBoundaryQueries({
      ...baseInput,
      geography: undefined,
    });
    // 2 keywords * 6 families
    const nicheCount = queries.filter((q) => q.specificity === "niche").length;
    expect(nicheCount).toBe(12);
  });

  it("skips hyper_specific level when geography is not provided", () => {
    const queries = generateBoundaryQueries({
      ...baseInput,
      geography: undefined,
    });
    const hyperCount = queries.filter(
      (q) => q.specificity === "hyper_specific",
    ).length;
    expect(hyperCount).toBe(0);
  });

  it("produces hyper_specific queries for each keyword per family when geography is provided", () => {
    const queries = generateBoundaryQueries(baseInput);
    // 2 keywords * 6 families
    const hyperCount = queries.filter(
      (q) => q.specificity === "hyper_specific",
    ).length;
    expect(hyperCount).toBe(12);
  });

  it("all queries have stage DISCOVERY", () => {
    const queries = generateBoundaryQueries(baseInput);
    expect(queries.every((q) => q.stage === "DISCOVERY")).toBe(true);
  });

  it("all queries have non-empty text", () => {
    const queries = generateBoundaryQueries(baseInput);
    expect(queries.every((q) => q.text.length > 0)).toBe(true);
  });

  it("broad queries do not contain industry or niche terms", () => {
    const queries = generateBoundaryQueries({
      role: "Sales",
      industry: "Hospitality",
      nicheKeywords: ["timeshare"],
      geography: "Orlando",
    });
    const broadQueries = queries.filter((q) => q.specificity === "broad");
    // Broad queries should not reference hospitality or timeshare
    for (const q of broadQueries) {
      expect(q.text.toLowerCase()).not.toContain("timeshare");
    }
  });

  it("handles single niche keyword", () => {
    const queries = generateBoundaryQueries({
      role: "Sales",
      industry: "Hospitality",
      nicheKeywords: ["timeshare"],
      geography: "Orlando",
    });
    // 6 families * (1 broad + 1 industry + 1 niche + 1 hyper_specific)
    expect(queries.length).toBe(24);
  });
});

// ─── detectVisibilityBoundary ─────────────────────────────────

describe("detectVisibilityBoundary", () => {
  it("returns firstAppearsAt='niche' when client appears only at niche", () => {
    const results: BoundaryDetectionInput["results"] = [
      makeResult("broad", false),
      makeResult("broad", false),
      makeResult("industry", false),
      makeResult("industry", false),
      makeResult("niche", true),
      makeResult("niche", false),
    ];

    const boundary = detectVisibilityBoundary({
      results,
      clientName: "HGV",
      competitors: [],
    });

    expect(boundary.firstAppearsAt).toBe("niche");
    expect(boundary.rateByLevel.niche.queryCount).toBe(2);
    expect(boundary.rateByLevel.niche.rate).toBe(0.5);
    expect(boundary.consistencyAtBoundary).toBe(0.5);
  });

  it("returns firstAppearsAt='broad' when client appears at broad level", () => {
    const results: BoundaryDetectionInput["results"] = [
      makeResult("broad", true),
      makeResult("broad", false),
      makeResult("industry", true),
      makeResult("niche", true),
    ];

    const boundary = detectVisibilityBoundary({
      results,
      clientName: "Marriott",
      competitors: [],
    });

    expect(boundary.firstAppearsAt).toBe("broad");
    expect(boundary.rateByLevel.broad.rate).toBe(0.5);
    expect(boundary.consistencyAtBoundary).toBe(0.5);
  });

  it("returns firstAppearsAt='never' when client never appears", () => {
    const results: BoundaryDetectionInput["results"] = [
      makeResult("broad", false),
      makeResult("industry", false),
      makeResult("niche", false),
    ];

    const boundary = detectVisibilityBoundary({
      results,
      clientName: "HGV",
      competitors: [],
    });

    expect(boundary.firstAppearsAt).toBe("never");
    expect(boundary.consistencyAtBoundary).toBe(0);
  });

  it("computes competitor boundary from metadata.competitorMentions", () => {
    const results: BoundaryDetectionInput["results"] = [
      makeResult("broad", false, [{ name: "Marriott", mentioned: true }]),
      makeResult("broad", false, [{ name: "Marriott", mentioned: true }]),
      makeResult("niche", true, [{ name: "Marriott", mentioned: false }]),
    ];

    const boundary = detectVisibilityBoundary({
      results,
      clientName: "HGV",
      competitors: [{ name: "Marriott" }],
    });

    expect(boundary.firstAppearsAt).toBe("niche");
    expect(boundary.competitorBoundaries).toHaveLength(1);
    expect(boundary.competitorBoundaries[0].name).toBe("Marriott");
    expect(boundary.competitorBoundaries[0].firstAppearsAt).toBe("broad");
  });

  it("narrative reflects competitor appearing at broader level than client", () => {
    const results: BoundaryDetectionInput["results"] = [
      makeResult("broad", false, [{ name: "Marriott", mentioned: true }]),
      makeResult("industry", false, [{ name: "Marriott", mentioned: true }]),
      makeResult("niche", true, [{ name: "Marriott", mentioned: true }]),
    ];

    const boundary = detectVisibilityBoundary({
      results,
      clientName: "HGV",
      competitors: [{ name: "Marriott" }],
    });

    expect(boundary.boundaryNarrative).toContain("niche");
    expect(boundary.boundaryNarrative).toContain("Marriott");
    expect(boundary.boundaryNarrative.toLowerCase()).toContain("broad");
  });

  it("narrative when client never appears mentions the competitor if available", () => {
    const results: BoundaryDetectionInput["results"] = [
      makeResult("broad", false, [{ name: "Marriott", mentioned: true }]),
      makeResult("industry", false, [{ name: "Marriott", mentioned: false }]),
    ];

    const boundary = detectVisibilityBoundary({
      results,
      clientName: "HGV",
      competitors: [{ name: "Marriott" }],
    });

    expect(boundary.firstAppearsAt).toBe("never");
    expect(boundary.boundaryNarrative).toContain("HGV");
    expect(boundary.boundaryNarrative).toContain("Marriott");
  });

  it("returns gracefully when no results provided", () => {
    const boundary = detectVisibilityBoundary({
      results: [],
      clientName: "HGV",
      competitors: [{ name: "Marriott" }],
    });

    expect(boundary.firstAppearsAt).toBe("never");
    expect(boundary.consistencyAtBoundary).toBe(0);
    expect(boundary.rateByLevel.broad.queryCount).toBe(0);
    expect(boundary.competitorBoundaries).toHaveLength(1);
    expect(boundary.competitorBoundaries[0].firstAppearsAt).toBe("never");
  });

  it("ignores results with non-boundary intent", () => {
    const results: BoundaryDetectionInput["results"] = [
      { intent: "Industry employer ranking", mentioned: true, metadata: null },
      { intent: "Career development discovery", mentioned: true, metadata: null },
      makeResult("niche", true),
    ];

    const boundary = detectVisibilityBoundary({
      results,
      clientName: "HGV",
      competitors: [],
    });

    // Only the niche result should count
    expect(boundary.rateByLevel.niche.queryCount).toBe(1);
    expect(boundary.rateByLevel.broad.queryCount).toBe(0);
    expect(boundary.firstAppearsAt).toBe("niche");
  });
});

// ─── hasSufficientBoundaryData ────────────────────────────────

describe("hasSufficientBoundaryData", () => {
  it("returns false when no results", () => {
    expect(hasSufficientBoundaryData([])).toBe(false);
  });

  it("returns false when only one specificity level has results", () => {
    const results = [
      { intent: "boundary:broad", mentioned: false, metadata: null },
      { intent: "boundary:broad", mentioned: true, metadata: null },
    ];
    expect(hasSufficientBoundaryData(results)).toBe(false);
  });

  it("returns true when two or more levels have results", () => {
    const results = [
      { intent: "boundary:broad", mentioned: false, metadata: null },
      { intent: "boundary:niche", mentioned: true, metadata: null },
    ];
    expect(hasSufficientBoundaryData(results)).toBe(true);
  });

  it("returns false for non-boundary results", () => {
    const results = [
      { intent: "Industry employer ranking", mentioned: true, metadata: null },
      { intent: "Career advice", mentioned: false, metadata: null },
    ];
    expect(hasSufficientBoundaryData(results)).toBe(false);
  });
});

// ─── filterBoundaryResults ────────────────────────────────────

describe("filterBoundaryResults", () => {
  it("returns only results with boundary intent", () => {
    const results = [
      { intent: "boundary:broad", mentioned: false, metadata: null },
      { intent: "Industry employer ranking", mentioned: true, metadata: null },
      { intent: "boundary:niche", mentioned: true, metadata: null },
    ];
    const filtered = filterBoundaryResults(results);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((r) => r.intent.includes("boundary:"))).toBe(true);
  });

  it("returns empty array when no boundary results", () => {
    const results = [
      { intent: "Career advice", mentioned: true, metadata: null },
    ];
    expect(filterBoundaryResults(results)).toHaveLength(0);
  });
});

// ─── classifyNonBoundaryDiscoveryResult ───────────────────────

describe("classifyNonBoundaryDiscoveryResult", () => {
  const CLIENT = "Acme Corp";
  const NICHE = ["timeshare", "vacation ownership"];
  const INDUSTRY = "Hospitality";

  it("returns null when the query contains the client name (name-specific query)", () => {
    expect(classifyNonBoundaryDiscoveryResult(
      "best companies like Acme Corp to work for",
      CLIENT,
      NICHE,
      INDUSTRY,
    )).toBeNull();
  });

  it("returns 'niche' when a niche keyword matches", () => {
    expect(classifyNonBoundaryDiscoveryResult(
      "best timeshare companies for sales reps",
      CLIENT,
      NICHE,
      INDUSTRY,
    )).toBe("niche");
    expect(classifyNonBoundaryDiscoveryResult(
      "top vacation ownership employers",
      CLIENT,
      NICHE,
      INDUSTRY,
    )).toBe("niche");
  });

  it("returns 'industry' when the industry label matches but no niche keyword", () => {
    expect(classifyNonBoundaryDiscoveryResult(
      "best hospitality companies for sales",
      CLIENT,
      NICHE,
      INDUSTRY,
    )).toBe("industry");
  });

  it("returns 'broad' when neither niche nor industry matches", () => {
    expect(classifyNonBoundaryDiscoveryResult(
      "best companies to work for in sales",
      CLIENT,
      NICHE,
      INDUSTRY,
    )).toBe("broad");
  });

  it("returns 'broad' when no nicheKeywords or industry provided", () => {
    expect(classifyNonBoundaryDiscoveryResult(
      "top companies hiring sales professionals",
      CLIENT,
    )).toBe("broad");
  });

  it("is case-insensitive for client name check", () => {
    expect(classifyNonBoundaryDiscoveryResult(
      "ACME CORP culture review",
      CLIENT,
      NICHE,
      INDUSTRY,
    )).toBeNull();
  });
});

// ─── detectVisibilityBoundary with non-boundary Discovery results ──

describe("detectVisibilityBoundary — non-boundary Discovery classification", () => {
  it("classifies non-boundary Discovery results heuristically", () => {
    const results = [
      // Broad (no niche, no industry, no client name)
      {
        intent: "employer-reputation",
        queryText: "best companies for sales jobs",
        stage: "DISCOVERY",
        mentioned: true,
        metadata: null,
      },
      // Industry
      {
        intent: "employer-reputation",
        queryText: "best hospitality companies for sales",
        stage: "DISCOVERY",
        mentioned: false,
        metadata: null,
      },
      // Niche
      {
        intent: "employer-reputation",
        queryText: "top timeshare companies for sales reps",
        stage: "DISCOVERY",
        mentioned: true,
        metadata: null,
      },
    ];

    const boundary = detectVisibilityBoundary({
      results,
      clientName: "Acme Corp",
      competitors: [],
      nicheKeywords: ["timeshare"],
      industry: "Hospitality",
    });

    // broad: 1 query, 1 mention → rate 1.0
    expect(boundary.rateByLevel.broad.queryCount).toBe(1);
    expect(boundary.rateByLevel.broad.rate).toBe(1);

    // industry: 1 query, 0 mentions → rate 0
    expect(boundary.rateByLevel.industry.queryCount).toBe(1);
    expect(boundary.rateByLevel.industry.rate).toBe(0);

    // niche: 1 query, 1 mention → rate 1.0
    expect(boundary.rateByLevel.niche.queryCount).toBe(1);
    expect(boundary.rateByLevel.niche.rate).toBe(1);
  });

  it("skips non-boundary Discovery results that name the client", () => {
    const results = [
      {
        intent: "employer-reputation",
        queryText: "Is Acme Corp a good place to work",
        stage: "DISCOVERY",
        mentioned: true,
        metadata: null,
      },
    ];
    const boundary = detectVisibilityBoundary({
      results,
      clientName: "Acme Corp",
      competitors: [],
    });
    // No level should have any queries — the name-specific query is skipped
    for (const level of ["broad", "industry", "niche", "hyper_specific"] as const) {
      expect(boundary.rateByLevel[level].queryCount).toBe(0);
    }
  });

  it("combines boundary-tagged and non-boundary Discovery results", () => {
    const results = [
      // Explicitly boundary-tagged
      {
        intent: "boundary:broad",
        mentioned: false,
        metadata: null,
      },
      // Non-boundary Discovery
      {
        intent: "employer-reputation",
        queryText: "top timeshare companies hiring sales reps",
        stage: "DISCOVERY",
        mentioned: true,
        metadata: null,
      },
    ];
    const boundary = detectVisibilityBoundary({
      results,
      clientName: "Acme Corp",
      competitors: [],
      nicheKeywords: ["timeshare"],
    });

    // boundary:broad → 1 broad result, not mentioned
    expect(boundary.rateByLevel.broad.queryCount).toBe(1);
    expect(boundary.rateByLevel.broad.rate).toBe(0);

    // non-boundary timeshare → niche, mentioned
    expect(boundary.rateByLevel.niche.queryCount).toBe(1);
    expect(boundary.rateByLevel.niche.rate).toBe(1);
  });
});

// ─── hasSufficientBoundaryData with non-boundary Discovery context ──

describe("hasSufficientBoundaryData with context", () => {
  it("counts non-boundary Discovery results toward level threshold when context provided", () => {
    const results = [
      {
        intent: "employer-reputation",
        queryText: "best companies for sales",
        stage: "DISCOVERY",
        mentioned: true,
        metadata: null,
      },
      {
        intent: "employer-reputation",
        queryText: "best hospitality companies for sales",
        stage: "DISCOVERY",
        mentioned: false,
        metadata: null,
      },
    ];
    // Without context: no boundary tags → false
    expect(hasSufficientBoundaryData(results)).toBe(false);
    // With context: broad + industry = 2 levels → true
    expect(hasSufficientBoundaryData(results, {
      clientName: "Acme Corp",
      industry: "Hospitality",
    })).toBe(true);
  });
});

// ─── SPECIFICITY_ORDER ────────────────────────────────────────

describe("SPECIFICITY_ORDER", () => {
  it("is ordered from broadest to narrowest", () => {
    expect(SPECIFICITY_ORDER[0]).toBe("broad");
    expect(SPECIFICITY_ORDER[SPECIFICITY_ORDER.length - 1]).toBe("hyper_specific");
  });

  it("contains all four levels", () => {
    expect(SPECIFICITY_ORDER).toHaveLength(4);
  });
});
