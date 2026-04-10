import { describe, it, expect } from "vitest";
import { composeReport } from "../report-composer";
import type { ReportInput } from "../report-composer";
import type { ScanComparisonResult } from "../scan-comparison";

function makeComparison(
  overrides: Partial<ScanComparisonResult> = {},
): ScanComparisonResult {
  return {
    totalQueries: 8,
    completedQueries: 6,
    clientMentionRate: 0.67,
    avgVisibilityScore: 55,
    avgSentimentScore: 0.3,
    entityMentions: [
      { name: "Meridian Tech", isClient: true, mentionCount: 4, mentionRate: 0.67 },
      { name: "Apex Cloud", isClient: false, mentionCount: 5, mentionRate: 0.83 },
      { name: "NovaBridge", isClient: false, mentionCount: 2, mentionRate: 0.33 },
    ],
    citations: {
      totalDomains: 5,
      clientExclusiveDomains: ["meridiantech.com"],
      gapDomains: ["levels.fyi", "blind.com"],
      sharedDomains: ["glassdoor.com", "linkedin.com"],
      domainFrequency: [
        { domain: "glassdoor.com", count: 4 },
        { domain: "linkedin.com", count: 3 },
        { domain: "levels.fyi", count: 2 },
        { domain: "blind.com", count: 1 },
        { domain: "meridiantech.com", count: 1 },
      ],
    },
    ...overrides,
  };
}

const BASE_INPUT: ReportInput = {
  clientName: "Meridian Technologies",
  clientDomain: "meridiantech.com",
  industry: "Enterprise Software",
  scanComparison: makeComparison(),
  competitors: [
    { name: "Apex Cloud", domain: "apexcloud.com" },
    { name: "NovaBridge", domain: "novabridge.io" },
  ],
  contentAssetTypes: ["CAREERS_PAGE"],
};

describe("composeReport", () => {
  it("returns a complete report structure", () => {
    const report = composeReport(BASE_INPUT);

    expect(report.title).toContain("Meridian Technologies");
    expect(report.summary.length).toBeGreaterThan(0);
    expect(report.sections.length).toBeGreaterThanOrEqual(3);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it("includes three sections: visibility, competitor, citation", () => {
    const report = composeReport(BASE_INPUT);
    const headings = report.sections.map((s) => s.heading);

    expect(headings).toContain("Visibility findings");
    expect(headings).toContain("Competitor analysis");
    expect(headings).toContain("Citation patterns");
  });

  it("each section has a non-empty body", () => {
    const report = composeReport(BASE_INPUT);

    for (const section of report.sections) {
      expect(section.body.length).toBeGreaterThan(0);
    }
  });
});

describe("executive summary", () => {
  it("mentions client mention rate", () => {
    const report = composeReport(BASE_INPUT);
    expect(report.summary).toContain("67%");
  });

  it("mentions visibility tier", () => {
    const report = composeReport(BASE_INPUT);
    // Summary now uses advisory language ("strong visibility") rather than raw score
    expect(report.summary).toContain("strong visibility");
  });

  it("mentions citation gaps (employer-relevant platforms only)", () => {
    const report = composeReport(BASE_INPUT);
    // gapDomains in BASE_INPUT: ["levels.fyi", "blind.com"]
    // Only levels.fyi is in EMPLOYER_RELEVANT_PLATFORMS — blind.com is excluded.
    // The summary should reference 1 employer platform gap (not 2 citation gaps).
    expect(report.summary).toContain("1 employer platform gap");
    expect(report.summary).toContain("levels.fyi");
  });

  it("notes competitor lead when applicable", () => {
    const report = composeReport(BASE_INPUT);
    expect(report.summary).toContain("Apex Cloud");
    // Advisory language frames the gap as hiring risk with a visibility multiple
    expect(report.summary).toContain("percentage points");
  });

  it("notes client lead when applicable", () => {
    const input = {
      ...BASE_INPUT,
      scanComparison: makeComparison({
        clientMentionRate: 0.9,
        entityMentions: [
          { name: "Meridian Tech", isClient: true, mentionCount: 7, mentionRate: 0.9 },
          { name: "Apex Cloud", isClient: false, mentionCount: 3, mentionRate: 0.5 },
        ],
      }),
    };
    const report = composeReport(input);
    expect(report.summary).toContain("leads all assessed competitors");
  });

  it("handles zero completed queries", () => {
    const input = {
      ...BASE_INPUT,
      scanComparison: makeComparison({
        completedQueries: 0,
        clientMentionRate: 0,
        avgVisibilityScore: null,
        avgSentimentScore: null,
        entityMentions: [],
        citations: {
          totalDomains: 0,
          clientExclusiveDomains: [],
          gapDomains: [],
          sharedDomains: [],
          domainFrequency: [],
        },
      }),
    };
    const report = composeReport(input);
    expect(report.summary).toContain("No scan data");
  });
});

describe("visibility section", () => {
  it("reports mention count and rate in advisory language", () => {
    const report = composeReport(BASE_INPUT);
    const vis = report.sections.find((s) => s.heading === "Visibility findings")!;
    // Advisory language uses "in 4 responses" rather than "4 of 6"
    expect(vis.body).toContain("in 4 responses");
    expect(vis.body).toContain("two-thirds");
  });

  it("flags low visibility as a significant gap", () => {
    const input = {
      ...BASE_INPUT,
      scanComparison: makeComparison({ clientMentionRate: 0.2 }),
    };
    const report = composeReport(input);
    const vis = report.sections.find((s) => s.heading === "Visibility findings")!;
    // Advisory language frames low visibility as pipeline leakage
    expect(vis.body).toContain("pipeline leakage");
  });
});

describe("competitor section", () => {
  it("identifies competitors leading the client", () => {
    const report = composeReport(BASE_INPUT);
    const comp = report.sections.find((s) => s.heading === "Competitor analysis")!;
    expect(comp.body).toContain("Apex Cloud");
    expect(comp.body).toContain("captures candidate attention");
  });

  it("identifies trailing competitors", () => {
    const report = composeReport(BASE_INPUT);
    const comp = report.sections.find((s) => s.heading === "Competitor analysis")!;
    expect(comp.body).toContain("NovaBridge");
  });

  it("reports largest visibility gap", () => {
    const report = composeReport(BASE_INPUT);
    const comp = report.sections.find((s) => s.heading === "Competitor analysis")!;
    // Apex is 83%, client is 67%, gap = 16pp
    expect(comp.body).toContain("16 percentage points");
  });
});

describe("citation section", () => {
  it("reports total domains", () => {
    const report = composeReport(BASE_INPUT);
    const cit = report.sections.find((s) => s.heading === "Citation patterns")!;
    expect(cit.body).toContain("5 unique sources");
  });

  it("lists gap domains in subsection table", () => {
    const report = composeReport(BASE_INPUT);
    const cit = report.sections.find((s) => s.heading === "Citation patterns")!;
    // Gap domains are now in the "Citation gaps and recommended actions" subsection table
    const gapSubsection = cit.subsections?.find((s) => s.heading.includes("Citation gaps"));
    expect(gapSubsection).toBeDefined();
    const allCells = gapSubsection!.table!.rows.flat().map(String);
    expect(allCells).toContain("levels.fyi");
    expect(allCells).toContain("blind.com");
  });
});

describe("recommendations", () => {
  it("generates content gap recommendation for citation gaps", () => {
    const report = composeReport(BASE_INPUT);
    const rec = report.recommendations.find((r) => r.category === "CONTENT_GAP" && r.title.includes("citation"));
    expect(rec).toBeDefined();
    expect(rec!.description).toContain("levels.fyi");
  });

  it("generates competitive positioning rec when competitor leads", () => {
    const report = composeReport(BASE_INPUT);
    const rec = report.recommendations.find(
      (r) => r.category === "COMPETITIVE_POSITIONING",
    );
    expect(rec).toBeDefined();
    expect(rec!.title).toContain("Apex Cloud");
  });

  it("generates technical reputation rec when no blog content", () => {
    const input = { ...BASE_INPUT, contentAssetTypes: ["CAREERS_PAGE"] };
    const report = composeReport(input);
    const rec = report.recommendations.find(
      (r) => r.category === "TECHNICAL_REPUTATION",
    );
    expect(rec).toBeDefined();
  });

  it("skips technical reputation rec when blog exists", () => {
    const input = {
      ...BASE_INPUT,
      contentAssetTypes: ["CAREERS_PAGE", "BLOG_POST"],
    };
    const report = composeReport(input);
    const rec = report.recommendations.find(
      (r) => r.category === "TECHNICAL_REPUTATION",
    );
    expect(rec).toBeUndefined();
  });

  it("generates culture signal rec for negative sentiment", () => {
    const input = {
      ...BASE_INPUT,
      scanComparison: makeComparison({ avgSentimentScore: -0.5 }),
    };
    const report = composeReport(input);
    const rec = report.recommendations.find(
      (r) => r.category === "CULTURE_SIGNAL",
    );
    expect(rec).toBeDefined();
    expect(rec!.priority).toBe("HIGH");
  });

  it("skips culture signal rec for positive sentiment", () => {
    const report = composeReport(BASE_INPUT);
    const rec = report.recommendations.find(
      (r) => r.category === "CULTURE_SIGNAL",
    );
    expect(rec).toBeUndefined();
  });

  it("generates careers page rec when missing", () => {
    const input = { ...BASE_INPUT, contentAssetTypes: [] };
    const report = composeReport(input);
    const rec = report.recommendations.find(
      (r) => r.title.includes("careers page"),
    );
    expect(rec).toBeDefined();
  });

  it("sorts recommendations by priority", () => {
    const report = composeReport(BASE_INPUT);
    const priorities = report.recommendations.map((r) => r.priority);
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    for (let i = 1; i < priorities.length; i++) {
      expect(order[priorities[i] as keyof typeof order]).toBeGreaterThanOrEqual(
        order[priorities[i - 1] as keyof typeof order],
      );
    }
  });

  it("every recommendation has all required fields", () => {
    const report = composeReport(BASE_INPUT);
    for (const rec of report.recommendations) {
      expect(rec.category.length).toBeGreaterThan(0);
      expect(rec.priority.length).toBeGreaterThan(0);
      expect(rec.title.length).toBeGreaterThan(0);
      expect(rec.description.length).toBeGreaterThan(0);
      expect(rec.impact.length).toBeGreaterThan(0);
      expect(rec.effort.length).toBeGreaterThan(0);
    }
  });

  it("enriches top 3 recommendations with rationale and actions", () => {
    const report = composeReport(BASE_INPUT);
    const top3 = report.recommendations.slice(0, 3);
    for (const rec of top3) {
      expect(rec.rationale).toBeDefined();
      expect(rec.rationale!.length).toBeGreaterThan(0);
      expect(rec.actions).toBeDefined();
      expect(rec.actions!.length).toBeGreaterThan(0);
      expect(rec.effortDetail).toBeDefined();
    }
  });

  it("does not enrich recommendations beyond the top 3", () => {
    const input = { ...BASE_INPUT, contentAssetTypes: [] };
    const report = composeReport(input);
    // Should have at least 4 recs (content gap, competitive positioning, employer brand, technical reputation, careers page)
    expect(report.recommendations.length).toBeGreaterThanOrEqual(4);
    const beyond3 = report.recommendations.slice(3);
    for (const rec of beyond3) {
      // Recs after top 3 should not have enrichment
      expect(rec.rationale).toBeUndefined();
      expect(rec.actions).toBeUndefined();
    }
  });

  it("generates valid category enum values only", () => {
    const validCategories = [
      "CONTENT_GAP",
      "COMPETITIVE_POSITIONING",
      "EMPLOYER_BRAND",
      "TECHNICAL_REPUTATION",
      "COMPENSATION_PERCEPTION",
      "CULTURE_SIGNAL",
      "DIVERSITY_INCLUSION",
      "OTHER",
    ];
    const report = composeReport(BASE_INPUT);
    for (const rec of report.recommendations) {
      expect(validCategories).toContain(rec.category);
    }
  });

  it("generates valid priority enum values only", () => {
    const validPriorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    const report = composeReport(BASE_INPUT);
    for (const rec of report.recommendations) {
      expect(validPriorities).toContain(rec.priority);
    }
  });
});

// ─── Edge case: zero competitors ─────────────────────────────

describe("zero competitors", () => {
  const noCompInput: ReportInput = {
    clientName: "SoloCorp",
    clientDomain: "solocorp.com",
    industry: "Fintech",
    scanComparison: makeComparison({
      entityMentions: [
        { name: "SoloCorp", isClient: true, mentionCount: 4, mentionRate: 0.67 },
      ],
      citations: {
        totalDomains: 2,
        clientExclusiveDomains: ["solocorp.com"],
        gapDomains: [],
        sharedDomains: ["glassdoor.com"],
        domainFrequency: [
          { domain: "glassdoor.com", count: 3 },
          { domain: "solocorp.com", count: 1 },
        ],
      },
    }),
    competitors: [],
    contentAssetTypes: ["CAREERS_PAGE"],
  };

  it("produces a valid report without crashing", () => {
    const report = composeReport(noCompInput);
    expect(report.title).toContain("SoloCorp");
    expect(report.sections.length).toBeGreaterThanOrEqual(3);
  });

  it("competitor section says no data available", () => {
    const report = composeReport(noCompInput);
    const comp = report.sections.find((s) => s.heading === "Competitor analysis")!;
    expect(comp.body).toContain("No competitor data");
  });

  it("summary does not mention competitor advantage", () => {
    const report = composeReport(noCompInput);
    expect(report.summary).not.toContain("percentage point advantage");
  });

  it("does not generate competitive positioning recommendation", () => {
    const report = composeReport(noCompInput);
    const rec = report.recommendations.find(
      (r) => r.category === "COMPETITIVE_POSITIONING",
    );
    expect(rec).toBeUndefined();
  });
});

// ─── Edge case: empty citations ──────────────────────────────

describe("empty citations", () => {
  const noCitInput: ReportInput = {
    ...BASE_INPUT,
    scanComparison: makeComparison({
      citations: {
        totalDomains: 0,
        clientExclusiveDomains: [],
        gapDomains: [],
        sharedDomains: [],
        domainFrequency: [],
      },
    }),
  };

  it("citation section says no data available", () => {
    const report = composeReport(noCitInput);
    const cit = report.sections.find((s) => s.heading === "Citation patterns")!;
    expect(cit.body).toContain("No citation data");
    expect(cit.subsections).toBeUndefined();
  });

  it("does not generate content gap recommendation", () => {
    const report = composeReport(noCitInput);
    const rec = report.recommendations.find(
      (r) => r.category === "CONTENT_GAP" && r.title.includes("citation"),
    );
    expect(rec).toBeUndefined();
  });
});

// ─── Edge case: 100% mention rate ────────────────────────────

describe("100% mention rate", () => {
  it("produces valid output with perfect visibility", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      scanComparison: makeComparison({
        clientMentionRate: 1.0,
        entityMentions: [
          { name: "Meridian Tech", isClient: true, mentionCount: 6, mentionRate: 1.0 },
          { name: "Apex Cloud", isClient: false, mentionCount: 3, mentionRate: 0.5 },
        ],
      }),
    };
    const report = composeReport(input);
    expect(report.summary).toContain("100%");
    expect(report.summary).toContain("leads all assessed competitors");
  });
});

// ─── Edge case: 0% mention rate with completed queries ───────

describe("0% mention rate with completed queries", () => {
  it("produces valid output describing minimal visibility", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      scanComparison: makeComparison({
        clientMentionRate: 0,
        entityMentions: [
          { name: "Meridian Tech", isClient: true, mentionCount: 0, mentionRate: 0 },
          { name: "Apex Cloud", isClient: false, mentionCount: 5, mentionRate: 0.83 },
        ],
      }),
    };
    const report = composeReport(input);
    expect(report.summary).toContain("0%");
    // Should describe minimal visibility, not "No scan data"
    expect(report.summary).not.toContain("No scan data");
    const vis = report.sections.find((s) => s.heading === "Visibility findings")!;
    expect(vis.body).toContain("pipeline leakage");
  });
});

// ─── Edge case: sentiment at exactly 0 ──────────────────────

describe("sentiment at exactly zero", () => {
  it("treats zero sentiment as neutral, not slightly negative", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      scanComparison: makeComparison({ avgSentimentScore: 0 }),
    };
    const report = composeReport(input);
    const vis = report.sections.find((s) => s.heading === "Visibility findings")!;
    expect(vis.body).toContain("neutral");
    expect(vis.body).not.toContain("slightly negative");
  });

  it("does not generate culture signal recommendation for zero sentiment", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      scanComparison: makeComparison({ avgSentimentScore: 0 }),
    };
    const report = composeReport(input);
    const rec = report.recommendations.find(
      (r) => r.category === "CULTURE_SIGNAL",
    );
    expect(rec).toBeUndefined();
  });
});

// ─── Edge case: query theme breakdown ────────────────────────

describe("query intent map section", () => {
  it("is included when queryThemeBreakdown is provided", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      queryThemeBreakdown: [
        { theme: "Reputation", queryCount: 3, mentionCount: 2, mentionRate: 0.67 },
        { theme: "Compensation", queryCount: 3, mentionCount: 0, mentionRate: 0 },
      ],
    };
    const report = composeReport(input);
    const intentSection = report.sections.find(
      (s) => s.heading === "Query intent map",
    );
    expect(intentSection).toBeDefined();
    expect(intentSection!.subsections).toBeDefined();
    expect(intentSection!.subsections!.length).toBe(1);
    // Table should have 2 rows (one per theme)
    expect(intentSection!.subsections![0].table!.rows.length).toBe(2);
  });

  it("is omitted when queryThemeBreakdown is undefined", () => {
    const report = composeReport(BASE_INPUT);
    const intentSection = report.sections.find(
      (s) => s.heading === "Query intent map",
    );
    expect(intentSection).toBeUndefined();
  });

  it("is omitted when queryThemeBreakdown is empty array", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      queryThemeBreakdown: [],
    };
    const report = composeReport(input);
    const intentSection = report.sections.find(
      (s) => s.heading === "Query intent map",
    );
    expect(intentSection).toBeUndefined();
  });

  it("highlights critical gaps in themes with low mention rate", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      queryThemeBreakdown: [
        { theme: "Reputation", queryCount: 3, mentionCount: 2, mentionRate: 0.67 },
        { theme: "Compensation", queryCount: 3, mentionCount: 0, mentionRate: 0 },
      ],
    };
    const report = composeReport(input);
    const intentSection = report.sections.find(
      (s) => s.heading === "Query intent map",
    )!;
    expect(intentSection.body).toContain("below 20% mention rate");
    expect(intentSection.body).toContain("Compensation");
  });
});

// ─── Edge case: assessment scope section ─────────────────────

describe("assessment scope section", () => {
  it("is always the first section", () => {
    const report = composeReport(BASE_INPUT);
    expect(report.sections[0].heading).toBe("Assessment scope and methodology");
  });

  it("lists client and competitors in companies assessed", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      assessmentScope: {
        competitorNames: ["Apex Cloud", "NovaBridge"],
        totalQueries: 8,
        completedQueries: 6,
        queryThemes: ["Reputation", "Compensation"],
        scanDateRange: null,
        aiModels: [],
      },
    };
    const report = composeReport(input);
    const scope = report.sections[0];
    const companiesSubsection = scope.subsections?.find(
      (s) => s.heading === "Companies assessed",
    );
    expect(companiesSubsection).toBeDefined();
    expect(companiesSubsection!.items).toContain("Meridian Technologies");
    expect(companiesSubsection!.items).toContain("Apex Cloud");
    expect(companiesSubsection!.items).toContain("NovaBridge");
  });

  it("works without assessmentScope by deriving from scan data", () => {
    const report = composeReport(BASE_INPUT);
    const scope = report.sections[0];
    expect(scope.body).toContain("companies");
    expect(scope.subsections).toBeDefined();
    expect(scope.subsections!.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Edge case: cover page ──────────────────────────────────

describe("cover page", () => {
  it("includes client details", () => {
    const report = composeReport(BASE_INPUT);
    expect(report.coverPage.clientName).toBe("Meridian Technologies");
    expect(report.coverPage.clientDomain).toBe("meridiantech.com");
    expect(report.coverPage.industry).toBe("Enterprise Software");
  });

  it("works without industry", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      industry: undefined,
    };
    const report = composeReport(input);
    expect(report.coverPage.industry).toBeUndefined();
  });

  it("includes confidentiality line", () => {
    const report = composeReport(BASE_INPUT);
    expect(report.coverPage.confidentialityLine.length).toBeGreaterThan(0);
  });
});

// ─── Edge case: enrichment with fewer than 3 recommendations ─

describe("enrichment with fewer than 3 recommendations", () => {
  it("handles a single recommendation without crashing", () => {
    // To produce only 1 rec: high mention rate, no gaps, positive sentiment, has blog, has careers
    const input: ReportInput = {
      clientName: "PerfectCorp",
      clientDomain: "perfectcorp.com",
      industry: "Tech",
      scanComparison: makeComparison({
        clientMentionRate: 0.9,
        avgSentimentScore: 0.5,
        entityMentions: [
          { name: "PerfectCorp", isClient: true, mentionCount: 5, mentionRate: 0.9 },
          { name: "Rival", isClient: false, mentionCount: 3, mentionRate: 0.5 },
        ],
        citations: {
          totalDomains: 2,
          clientExclusiveDomains: ["perfectcorp.com"],
          gapDomains: [],
          sharedDomains: ["glassdoor.com"],
          domainFrequency: [
            { domain: "glassdoor.com", count: 3 },
            { domain: "perfectcorp.com", count: 1 },
          ],
        },
      }),
      competitors: [{ name: "Rival", domain: "rival.com" }],
      contentAssetTypes: ["CAREERS_PAGE", "BLOG_POST"],
    };
    const report = composeReport(input);
    // Should not crash even if there's only 1 or 0 recs
    expect(report.recommendations.length).toBeLessThanOrEqual(3);
    for (const rec of report.recommendations) {
      // All recs should be enriched since there are 3 or fewer
      expect(rec.rationale).toBeDefined();
    }
  });

  it("handles zero recommendations gracefully", () => {
    // High mention rate, no gaps, positive sentiment, has blog + careers, all competitors trailing
    const input: ReportInput = {
      clientName: "PerfectCorp",
      clientDomain: "perfectcorp.com",
      industry: "Tech",
      scanComparison: makeComparison({
        clientMentionRate: 0.95,
        avgSentimentScore: 0.8,
        entityMentions: [
          { name: "PerfectCorp", isClient: true, mentionCount: 6, mentionRate: 0.95 },
        ],
        citations: {
          totalDomains: 2,
          clientExclusiveDomains: ["perfectcorp.com"],
          gapDomains: [],
          sharedDomains: ["glassdoor.com"],
          domainFrequency: [
            { domain: "glassdoor.com", count: 3 },
            { domain: "perfectcorp.com", count: 1 },
          ],
        },
      }),
      competitors: [],
      contentAssetTypes: ["CAREERS_PAGE", "BLOG_POST"],
    };
    const report = composeReport(input);
    // With perfect data there should be no recs (or very few)
    // Main thing: no crash
    expect(report.recommendations).toBeDefined();
    expect(report.summary.length).toBeGreaterThan(0);
  });
});

// ─── Edge case: single competitor ────────────────────────────

describe("single competitor", () => {
  it("produces valid competitor section with one competitor", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      scanComparison: makeComparison({
        entityMentions: [
          { name: "Meridian Tech", isClient: true, mentionCount: 4, mentionRate: 0.67 },
          { name: "Apex Cloud", isClient: false, mentionCount: 5, mentionRate: 0.83 },
        ],
      }),
      competitors: [{ name: "Apex Cloud", domain: "apexcloud.com" }],
    };
    const report = composeReport(input);
    const comp = report.sections.find((s) => s.heading === "Competitor analysis")!;
    expect(comp.body).toContain("Apex Cloud");
    // Should have a comparison table subsection
    expect(comp.subsections).toBeDefined();
    expect(comp.subsections!.length).toBe(1);
    // Table should have 2 rows (client + 1 competitor)
    expect(comp.subsections![0].table!.rows.length).toBe(2);
  });
});

// ─── Edge case: no industry provided ─────────────────────────

describe("no industry", () => {
  it("uses generic phrasing instead of industry name", () => {
    const input: ReportInput = {
      ...BASE_INPUT,
      industry: undefined,
    };
    const report = composeReport(input);
    expect(report.summary).toContain("employers in this space");
    expect(report.summary).not.toContain("undefined");
  });
});
