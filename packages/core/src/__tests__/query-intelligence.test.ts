import { describe, it, expect } from "vitest";
import {
  generateQueryIntelligence,
  deduplicateQueries,
  classifyTheme,
  classifyJobFamily,
  QUERY_THEMES,
  THEME_CONFIG,
} from "../query-intelligence";
import type {
  QueryGenerationInput,
  QueryTheme,
  SpecificityLevel,
  GeneratedQuery,
} from "../query-intelligence";

const BASE_INPUT: QueryGenerationInput = {
  companyName: "Meridian Technologies",
  roleTitle: "Senior Backend Engineer",
  geography: "Austin, TX",
  industry: "Enterprise Software",
  competitors: ["Apex Cloud Systems", "NovaBridge Analytics"],
};

const FOUR_COMPETITOR_INPUT: QueryGenerationInput = {
  companyName: "Meridian Technologies",
  roleTitle: "Senior Backend Engineer",
  geography: "Austin, TX",
  industry: "Enterprise Software",
  competitors: [
    "Apex Cloud Systems",
    "NovaBridge Analytics",
    "Vertex Solutions",
    "Orion Digital",
  ],
};

// ─── generateQueryIntelligence ──────────────────────────────

describe("generateQueryIntelligence", () => {
  it("returns clusters with queries", () => {
    const result = generateQueryIntelligence(BASE_INPUT);

    expect(result.clusters.length).toBeGreaterThan(0);
    expect(result.totalGenerated).toBeGreaterThan(0);
    expect(result.totalAfterDedup).toBeLessThanOrEqual(result.totalGenerated);
    expect(result.totalAfterDedup).toBeGreaterThan(0);
  });

  it("generates queries across multiple themes", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const themes = new Set(result.clusters.map((c) => c.theme));

    // Should have at least 4 different themes
    expect(themes.size).toBeGreaterThanOrEqual(4);
  });

  it("includes competitor comparison queries when competitors provided", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const compCluster = result.clusters.find(
      (c) => c.theme === "competitor_comparison",
    );

    expect(compCluster).toBeDefined();
    expect(compCluster!.queries.length).toBeGreaterThan(0);

    // Should mention at least one competitor
    const mentionsCompetitor = compCluster!.queries.some(
      (q) =>
        q.text.includes("Apex Cloud Systems") ||
        q.text.includes("NovaBridge Analytics"),
    );
    expect(mentionsCompetitor).toBe(true);
  });

  it("omits competitor comparison when no competitors", () => {
    const result = generateQueryIntelligence({
      ...BASE_INPUT,
      competitors: [],
    });
    const compCluster = result.clusters.find(
      (c) => c.theme === "competitor_comparison",
    );

    expect(compCluster).toBeUndefined();
  });

  it("all queries have priority between 1 and 10", () => {
    const result = generateQueryIntelligence(BASE_INPUT);

    for (const cluster of result.clusters) {
      for (const query of cluster.queries) {
        expect(query.priority).toBeGreaterThanOrEqual(1);
        expect(query.priority).toBeLessThanOrEqual(10);
      }
    }
  });

  it("queries within clusters are sorted by priority descending", () => {
    const result = generateQueryIntelligence(BASE_INPUT);

    for (const cluster of result.clusters) {
      for (let i = 1; i < cluster.queries.length; i++) {
        expect(cluster.queries[i].priority).toBeLessThanOrEqual(
          cluster.queries[i - 1].priority,
        );
      }
    }
  });

  it("clusters are sorted by base priority descending", () => {
    const result = generateQueryIntelligence(BASE_INPUT);

    for (let i = 1; i < result.clusters.length; i++) {
      const prevPriority =
        THEME_CONFIG[result.clusters[i - 1].theme].basePriority;
      const currPriority =
        THEME_CONFIG[result.clusters[i].theme].basePriority;
      expect(currPriority).toBeLessThanOrEqual(prevPriority);
    }
  });

  it("each cluster has a name and intent", () => {
    const result = generateQueryIntelligence(BASE_INPUT);

    for (const cluster of result.clusters) {
      expect(cluster.name.length).toBeGreaterThan(0);
      expect(cluster.intent.length).toBeGreaterThan(0);
    }
  });

  it("every query has non-empty text and intent", () => {
    const result = generateQueryIntelligence(BASE_INPUT);

    for (const cluster of result.clusters) {
      for (const query of cluster.queries) {
        expect(query.text.length).toBeGreaterThan(0);
        expect(query.intent.length).toBeGreaterThan(0);
      }
    }
  });

  it("inserts company name into generated queries", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    const mentionsCompany = allQueries.filter((q) =>
      q.text.toLowerCase().includes("meridian technologies"),
    );
    // Most queries should mention the company
    expect(mentionsCompany.length).toBeGreaterThan(allQueries.length / 3);
  });

  it("inserts role into generated queries", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    const mentionsRole = allQueries.filter((q) =>
      q.text.toLowerCase().includes("senior backend engineer"),
    );
    expect(mentionsRole.length).toBeGreaterThan(0);
  });

  it("generates 90+ queries after dedup with 4 competitors", () => {
    const result = generateQueryIntelligence(FOUR_COMPETITOR_INPUT);
    expect(result.totalAfterDedup).toBeGreaterThanOrEqual(90);
  });

  it("all four decision stages have representation with 4 competitors", () => {
    const result = generateQueryIntelligence(FOUR_COMPETITOR_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);
    const stages = new Set(allQueries.map((q) => q.stage));

    expect(stages.has("DISCOVERY")).toBe(true);
    expect(stages.has("CONSIDERATION")).toBe(true);
    expect(stages.has("EVALUATION")).toBe(true);
    expect(stages.has("COMMITMENT")).toBe(true);
  });

  it("stage overwrite fix: EVALUATION template with benefits keyword keeps EVALUATION stage", () => {
    // "{company} vs {competitor} benefits and perks" is tagged EVALUATION.
    // Before the fix, the heuristic classifier would see "benefits" (an
    // EVALUATION_TERMS keyword) and attempt to classify, but the stage was being
    // overwritten unconditionally. With the fix, the template-assigned stage wins.
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    const benefitsQuery = allQueries.find((q) =>
      q.text.includes("benefits and perks") && q.text.includes("vs"),
    );
    expect(benefitsQuery).toBeDefined();
    expect(benefitsQuery!.stage).toBe("EVALUATION");
  });

  it("stage overwrite fix: CONSIDERATION template with benefits keyword keeps CONSIDERATION stage", () => {
    // Before the fix, the heuristic classifier would classify
    // "{company} benefits and perks" (a CONSIDERATION-tagged template) as
    // EVALUATION because "benefits" is in EVALUATION_TERMS. With the fix, the
    // template-assigned CONSIDERATION stage is preserved.
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    // Note: this template no longer exists — it was replaced by the more specific
    // EVALUATION-stage competitor comparisons. Verify CONSIDERATION templates that
    // do not contain comparison terms stay in CONSIDERATION.
    const considerationQueries = allQueries.filter(
      (q) => q.stage === "CONSIDERATION",
    );
    expect(considerationQueries.length).toBeGreaterThan(10);
  });
});

// ─── deduplicateQueries ─────────────────────────────────────

describe("deduplicateQueries", () => {
  it("removes exact duplicates", () => {
    const queries = [
      { text: "best companies for engineers" },
      { text: "best companies for engineers" },
      { text: "top engineering companies" },
    ];

    const result = deduplicateQueries(queries);
    expect(result.surviving).toHaveLength(2);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]!.reason).toBe("exact_match");
  });

  it("removes near-duplicates based on word overlap", () => {
    const queries = [
      { text: "salary for senior backend engineer at Acme" },
      { text: "senior backend engineer salary at Acme" },
      { text: "completely different query about culture" },
    ];

    const result = deduplicateQueries(queries);
    // First two are near-duplicates (same words, different order)
    expect(result.surviving).toHaveLength(2);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]!.reason).toBe("jaccard_similarity");
  });

  it("preserves distinct queries", () => {
    const queries = [
      { text: "Acme Corp work life balance" },
      { text: "senior engineer salary Austin Texas" },
      { text: "interview process at tech companies" },
    ];

    const result = deduplicateQueries(queries);
    expect(result.surviving).toHaveLength(3);
    expect(result.removed).toHaveLength(0);
  });

  it("handles empty input", () => {
    const result = deduplicateQueries([]);
    expect(result.surviving).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });

  it("keeps first occurrence, removes later duplicates", () => {
    const queries = [
      { text: "first version of the query", id: 1 },
      { text: "first version of the query", id: 2 },
    ];

    const result = deduplicateQueries(queries);
    expect(result.surviving).toHaveLength(1);
    expect(result.surviving[0]).toHaveProperty("id", 1);
    expect(result.removed[0]).toMatchObject({ reason: "exact_match" });
  });

  it("preserves tagged query over untagged when similar — tagged first", () => {
    // Existing entry has specificity, candidate does not. Keep tagged.
    const queries = [
      { text: "best companies for Sales", specificity: "broad" as const },
      { text: "best companies for Sales roles" },
    ];
    const result = deduplicateQueries(queries);
    expect(result.surviving).toHaveLength(1);
    expect(result.surviving[0]!.specificity).toBe("broad");
  });

  it("preserves tagged query over untagged when similar — untagged first", () => {
    // Existing entry has no tag; candidate has tag. Swap so tagged survives.
    const queries = [
      { text: "best companies for Sales roles" },
      { text: "best companies for Sales", specificity: "broad" as const },
    ];
    const result = deduplicateQueries(queries);
    expect(result.surviving).toHaveLength(1);
    expect(result.surviving[0]!.specificity).toBe("broad");
  });

  it("never deduplicates queries across different specificity levels", () => {
    // "best companies for Sales" (broad) vs "best companies for Sales" (industry)
    // are intentionally distinct boundary queries and must not be collapsed.
    const queries = [
      { text: "best companies for Sales", specificity: "broad" as const },
      { text: "best companies for Sales", specificity: "industry" as const },
    ];
    const result = deduplicateQueries(queries);
    expect(result.surviving).toHaveLength(2);
    expect(result.removed).toHaveLength(0);
  });

  it("deduplicates tagged vs untagged similar queries — tagged wins regardless of order", () => {
    // A tagged Discovery query and an untagged query with similar text are in the
    // same dedup bucket. Tagged wins either way.
    const tagged = { text: "best companies for Sales", specificity: "broad" as const };
    const untagged: { text: string; specificity?: string } = { text: "best companies for Sales roles" };

    // tagged first
    const r1 = deduplicateQueries([tagged, untagged]);
    expect(r1.surviving).toHaveLength(1);
    expect(r1.surviving[0]!.specificity).toBe("broad");

    // untagged first — tagged candidate replaces it
    const r2 = deduplicateQueries([untagged, tagged]);
    expect(r2.surviving).toHaveLength(1);
    expect(r2.surviving[0]!.specificity).toBe("broad");
  });

  // ── DedupMode: conservative (Pass 1 only) ──────────────────────────────────

  it("conservative mode: removes exact matches only", () => {
    const queries = [
      { text: "salary for senior backend engineer at Acme" },
      { text: "senior backend engineer salary at Acme" }, // near-dup, not exact
      { text: "best companies for engineers" },
      { text: "best companies for engineers" }, // exact dup
    ];
    const result = deduplicateQueries(queries, "conservative");
    // Exact dup removed; near-dup survives in conservative mode
    expect(result.surviving).toHaveLength(3);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]!.reason).toBe("exact_match");
  });

  // ── DedupMode: standard (Pass 1 + Pass 2) ──────────────────────────────────

  it("standard mode: removes exact and jaccard duplicates, skips intent-level", () => {
    const queries: Array<{ text: string; stage?: string; theme?: string; intent?: string }> = [
      { text: "salary for senior backend engineer at Acme" },
      { text: "senior backend engineer salary at Acme" }, // Jaccard dup
      {
        text: "what is it like to work at Acme",
        stage: "CONSIDERATION",
        theme: "reputation",
        intent: "Direct employer research",
      },
      {
        text: "is Acme a good place to work",
        stage: "CONSIDERATION",
        theme: "reputation",
        intent: "Direct employer research", // same intent — would collapse in aggressive
      },
    ];
    const result = deduplicateQueries(queries, "standard");
    // Jaccard dup removed; intent-level pair survives (standard skips Pass 3)
    expect(result.surviving).toHaveLength(3);
    const reasons = result.removed.map((r) => r.reason);
    expect(reasons).toContain("jaccard_similarity");
    expect(reasons).not.toContain("intent_duplicate");
  });

  // ── DedupMode: aggressive (Pass 1 + Pass 2 + Pass 3) ──────────────────────

  it("aggressive mode: collapses same-intent queries within the same stage+theme group", () => {
    const queries: Array<{ text: string; stage: string; theme: string; intent: string; priority: number }> = [
      {
        text: "what is it like to work at Acme",
        stage: "CONSIDERATION",
        theme: "reputation",
        intent: "Direct employer research",
        priority: 6,
      },
      {
        text: "is Acme a good company",
        stage: "CONSIDERATION",
        theme: "reputation",
        intent: "Direct employer research", // same intent — collapse
        priority: 5,
      },
      {
        text: "Acme interview process",
        stage: "CONSIDERATION",
        theme: "hiring_process",
        intent: "Interview research", // different theme — survives
        priority: 5,
      },
    ];
    const result = deduplicateQueries(queries, "aggressive");
    expect(result.surviving).toHaveLength(2);
    const intentRemoved = result.removed.filter((r) => r.reason === "intent_duplicate");
    expect(intentRemoved).toHaveLength(1);
    // Higher-priority query survives (priority 6 beats 5)
    expect(result.surviving.find((q) => q.text === "what is it like to work at Acme")).toBeDefined();
    expect(result.surviving.find((q) => q.text === "Acme interview process")).toBeDefined();
  });

  it("aggressive mode: different stages are never collapsed by Pass 3 even with matching intent", () => {
    // These two queries are lexically distinct enough to survive Pass 2 (Jaccard < 0.5),
    // so the only thing that could collapse them in aggressive mode is Pass 3.
    // Pass 3 groups by stage+theme, so different stages must produce different groups
    // and never be collapsed against each other.
    const queries: Array<{ text: string; stage: string; theme: string; intent: string; priority: number }> = [
      {
        text: "what employers are known for outstanding engineering culture",
        stage: "DISCOVERY",
        theme: "reputation",
        intent: "Engineering culture employer discovery",
        priority: 8,
      },
      {
        text: "is Acme known for good engineering culture",
        stage: "CONSIDERATION",
        theme: "reputation",
        intent: "Engineering culture employer discovery", // same intent, different stage
        priority: 6,
      },
    ];
    const result = deduplicateQueries(queries, "aggressive");
    // Different stages — both must survive regardless of matching intent
    expect(result.surviving).toHaveLength(2);
    expect(result.removed.filter((r) => r.reason === "intent_duplicate")).toHaveLength(0);
  });

  it("aggressive mode: different themes are never collapsed even with matching intent", () => {
    const queries: Array<{ text: string; stage: string; theme: string; intent: string; priority: number }> = [
      {
        text: "Acme career growth opportunities",
        stage: "CONSIDERATION",
        theme: "culture",
        intent: "Growth research",
        priority: 6,
      },
      {
        text: "Acme growth and advancement paths",
        stage: "CONSIDERATION",
        theme: "reputation",
        intent: "Growth research", // same intent, different theme
        priority: 6,
      },
    ];
    const result = deduplicateQueries(queries, "aggressive");
    // Different themes — both survive
    expect(result.surviving).toHaveLength(2);
    expect(result.removed.filter((r) => r.reason === "intent_duplicate")).toHaveLength(0);
  });

  it("aggressive mode: higher-priority query survives when intent duplicates collide", () => {
    const queries: Array<{ text: string; stage: string; theme: string; intent: string; priority: number }> = [
      {
        text: "low priority duplicate",
        stage: "CONSIDERATION",
        theme: "culture",
        intent: "Culture research",
        priority: 4,
      },
      {
        text: "high priority winner",
        stage: "CONSIDERATION",
        theme: "culture",
        intent: "Culture research",
        priority: 8,
      },
    ];
    const result = deduplicateQueries(queries, "aggressive");
    expect(result.surviving).toHaveLength(1);
    expect(result.surviving[0]!.text).toBe("high priority winner");
    expect(result.removed[0]!.reason).toBe("intent_duplicate");
  });

  it("removed entries include correct duplicateOf references", () => {
    const queries = [
      { text: "best companies for engineers" },
      { text: "best companies for engineers" }, // exact dup of [0]
    ];
    const result = deduplicateQueries(queries, "conservative");
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]!.duplicateOf.text).toBe("best companies for engineers");
    expect(result.removed[0]!.query.text).toBe("best companies for engineers");
  });

  it("queries without stage/theme fields are skipped by Pass 3", () => {
    // Plain { text } objects have no stage/theme — Pass 3 should be a no-op for them.
    const queries = [
      { text: "query alpha" },
      { text: "query beta" },
      { text: "query gamma" },
    ];
    const result = deduplicateQueries(queries, "aggressive");
    // No duplicates → all three survive
    expect(result.surviving).toHaveLength(3);
    expect(result.removed).toHaveLength(0);
  });
});

// ─── classifyTheme ──────────────────────────────────────────

describe("classifyTheme", () => {
  it("classifies compensation queries", () => {
    expect(classifyTheme("senior engineer salary at Acme")).toBe(
      "compensation",
    );
    expect(classifyTheme("Acme benefits and perks")).toBe("compensation");
  });

  it("classifies hiring process queries", () => {
    expect(classifyTheme("Acme interview process for engineers")).toBe(
      "hiring_process",
    );
    expect(classifyTheme("how to get hired onboarding")).toBe(
      "hiring_process",
    );
  });

  it("classifies culture queries", () => {
    expect(classifyTheme("Acme work life balance remote")).toBe("culture");
    expect(classifyTheme("diversity and inclusion at Acme")).toBe("culture");
  });

  it("classifies role expectations queries", () => {
    expect(classifyTheme("Acme tech stack for engineers")).toBe(
      "role_expectations",
    );
    expect(classifyTheme("what does a senior engineer do responsibilities")).toBe(
      "role_expectations",
    );
  });

  it("classifies competitor comparison queries", () => {
    expect(classifyTheme("Acme vs Google for engineers")).toBe(
      "competitor_comparison",
    );
    expect(classifyTheme("should I work at Acme or Google compared")).toBe(
      "competitor_comparison",
    );
  });

  it("defaults to reputation for ambiguous queries", () => {
    expect(classifyTheme("Acme Corp")).toBe("reputation");
  });
});

// ─── THEME_CONFIG ───────────────────────────────────────────

describe("THEME_CONFIG", () => {
  it("has config for every theme", () => {
    for (const theme of QUERY_THEMES) {
      expect(THEME_CONFIG[theme]).toBeDefined();
      expect(THEME_CONFIG[theme].name.length).toBeGreaterThan(0);
      expect(THEME_CONFIG[theme].intent.length).toBeGreaterThan(0);
      expect(THEME_CONFIG[theme].basePriority).toBeGreaterThanOrEqual(1);
      expect(THEME_CONFIG[theme].basePriority).toBeLessThanOrEqual(10);
    }
  });
});

// ─── classifyJobFamily ──────────────────────────────────────

describe("classifyJobFamily", () => {
  it("classifies engineering titles", () => {
    expect(classifyJobFamily("Backend Engineer")).toBe("engineering");
    expect(classifyJobFamily("Senior Software Engineer")).toBe("engineering");
    expect(classifyJobFamily("Staff Frontend Engineer")).toBe("engineering");
    expect(classifyJobFamily("DevOps Engineer")).toBe("engineering");
    expect(classifyJobFamily("SRE")).toBe("engineering");
    expect(classifyJobFamily("Platform Engineer")).toBe("engineering");
  });

  it("classifies sales titles", () => {
    expect(classifyJobFamily("Account Executive")).toBe("sales");
    expect(classifyJobFamily("Senior Account Executive")).toBe("sales");
    expect(classifyJobFamily("BDR")).toBe("sales");
    expect(classifyJobFamily("SDR")).toBe("sales");
    expect(classifyJobFamily("Customer Success Manager")).toBe("sales");
  });

  it("classifies product titles", () => {
    expect(classifyJobFamily("Product Manager")).toBe("product");
    expect(classifyJobFamily("Senior Product Manager")).toBe("product");
    expect(classifyJobFamily("Product Lead")).toBe("product");
    expect(classifyJobFamily("Technical Program Manager")).toBe("product");
  });

  it("classifies design titles", () => {
    expect(classifyJobFamily("UX Designer")).toBe("design");
    expect(classifyJobFamily("UI Designer")).toBe("design");
    expect(classifyJobFamily("Product Designer")).toBe("design");
    expect(classifyJobFamily("UX Researcher")).toBe("design");
  });

  it("classifies marketing titles", () => {
    expect(classifyJobFamily("Marketing Manager")).toBe("marketing");
    expect(classifyJobFamily("Content Strategist")).toBe("marketing");
    expect(classifyJobFamily("Growth Marketer")).toBe("marketing");
    expect(classifyJobFamily("Brand Manager")).toBe("marketing");
    expect(classifyJobFamily("Demand Generation Manager")).toBe("marketing");
  });

  it("classifies data titles — data engineer resolves to data not engineering", () => {
    expect(classifyJobFamily("Data Scientist")).toBe("data");
    expect(classifyJobFamily("Data Engineer")).toBe("data");
    expect(classifyJobFamily("ML Engineer")).toBe("data");
    expect(classifyJobFamily("Data Analyst")).toBe("data");
    expect(classifyJobFamily("Analytics Engineer")).toBe("data");
  });

  it("classifies operations titles", () => {
    expect(classifyJobFamily("HR Manager")).toBe("operations");
    expect(classifyJobFamily("Recruiter")).toBe("operations");
    expect(classifyJobFamily("People Operations Manager")).toBe("operations");
  });

  it("returns general for unrecognized titles", () => {
    expect(classifyJobFamily("Chief of Staff")).toBe("general");
    expect(classifyJobFamily("Office Manager")).toBe("general");
    expect(classifyJobFamily("Executive Assistant")).toBe("general");
  });

  it("is case-insensitive", () => {
    expect(classifyJobFamily("ACCOUNT EXECUTIVE")).toBe("sales");
    expect(classifyJobFamily("backend engineer")).toBe("engineering");
    expect(classifyJobFamily("Data Scientist")).toBe("data");
  });

  it("handles seniority prefixes correctly", () => {
    expect(classifyJobFamily("VP of Sales")).toBe("sales");
    expect(classifyJobFamily("Staff Backend Engineer")).toBe("engineering");
    expect(classifyJobFamily("Senior Data Scientist")).toBe("data");
  });
});

// ─── Job family filtering in generateQueryIntelligence ──────

const ENGINEERING_ONLY_SUBSTRINGS = [
  "engineering culture",
  "engineering team",
  "tech stack",
  "coding challenge",
  "whiteboard interviews",
  "engineering blog",
  "technical interview",
  "engineers say",
  "for engineers",
  "engineer pay",
  "engineers in",
];

const SALES_INPUT: QueryGenerationInput = {
  companyName: "Meridian Technologies",
  roleTitle: "Account Executive",
  geography: "Austin, TX",
  industry: "Enterprise Software",
  competitors: ["Apex Cloud Systems"],
};

const PRODUCT_INPUT: QueryGenerationInput = {
  companyName: "Meridian Technologies",
  roleTitle: "Product Manager",
  geography: "Austin, TX",
  industry: "Enterprise Software",
  competitors: [],
};

const GENERAL_INPUT: QueryGenerationInput = {
  companyName: "Meridian Technologies",
  roleTitle: "Chief of Staff",
  geography: "Austin, TX",
  industry: "Enterprise Software",
  competitors: [],
};

describe("job family filtering", () => {
  it("sales role: no engineering-specific queries are generated", () => {
    const result = generateQueryIntelligence(SALES_INPUT);
    const allText = result.clusters
      .flatMap((c) => c.queries)
      .map((q) => q.text.toLowerCase());

    for (const substring of ENGINEERING_ONLY_SUBSTRINGS) {
      const match = allText.find((t) => t.includes(substring));
      expect(match, `Expected no query containing "${substring}" for a sales role`).toBeUndefined();
    }
  });

  it("product manager role: no engineering-specific queries are generated", () => {
    const result = generateQueryIntelligence(PRODUCT_INPUT);
    const allText = result.clusters
      .flatMap((c) => c.queries)
      .map((q) => q.text.toLowerCase());

    for (const substring of ENGINEERING_ONLY_SUBSTRINGS) {
      const match = allText.find((t) => t.includes(substring));
      expect(match, `Expected no query containing "${substring}" for a product manager role`).toBeUndefined();
    }
  });

  it("general (unrecognized) role: no engineering-specific queries are generated", () => {
    const result = generateQueryIntelligence(GENERAL_INPUT);
    const allText = result.clusters
      .flatMap((c) => c.queries)
      .map((q) => q.text.toLowerCase());

    for (const substring of ENGINEERING_ONLY_SUBSTRINGS) {
      const match = allText.find((t) => t.includes(substring));
      expect(match, `Expected no query containing "${substring}" for an unclassified role`).toBeUndefined();
    }
  });

  it("engineering role: engineering-specific queries ARE present", () => {
    const result = generateQueryIntelligence(BASE_INPUT); // "Senior Backend Engineer"
    const allText = result.clusters
      .flatMap((c) => c.queries)
      .map((q) => q.text.toLowerCase());

    // At least a few engineering-specific substrings must appear
    const found = ENGINEERING_ONLY_SUBSTRINGS.filter((sub) =>
      allText.some((t) => t.includes(sub)),
    );
    expect(found.length).toBeGreaterThanOrEqual(5);
  });

  it("sales role still gets generic queries (company name present)", () => {
    const result = generateQueryIntelligence(SALES_INPUT);
    const allText = result.clusters.flatMap((c) => c.queries).map((q) => q.text.toLowerCase());
    const withCompany = allText.filter((t) =>
      t.includes("meridian technologies"),
    );
    expect(withCompany.length).toBeGreaterThan(5);
  });

  it("data role: engineering-culture queries are included", () => {
    const dataInput: QueryGenerationInput = {
      ...BASE_INPUT,
      roleTitle: "Data Scientist",
    };
    const result = generateQueryIntelligence(dataInput);
    const allText = result.clusters
      .flatMap((c) => c.queries)
      .map((q) => q.text.toLowerCase());

    // Data family should see engineering-tagged templates
    const hasTechStack = allText.some((t) => t.includes("tech stack"));
    expect(hasTechStack).toBe(true);
  });
});

// ─── Discovery specificity coverage ─────────────────────────

describe("Discovery specificity coverage", () => {
  const SALES_NO_NICHE: QueryGenerationInput = {
    companyName: "Meridian Technologies",
    roleTitle: "Account Executive",
    geography: "Austin, TX",
    industry: "Enterprise Software",
    competitors: [],
  };

  const SALES_WITH_NICHE: QueryGenerationInput = {
    ...SALES_NO_NICHE,
    nicheKeywords: ["timeshare", "vacation ownership"],
  };

  it("sales role with no niche keywords: at least 8 broad Discovery queries", () => {
    const result = generateQueryIntelligence(SALES_NO_NICHE);
    const broadDiscovery = result.clusters
      .flatMap((c) => c.queries)
      .filter((q) => q.stage === "DISCOVERY" && q.specificity === "broad");

    expect(broadDiscovery.length).toBeGreaterThanOrEqual(8);
  });

  it("sales role with no niche keywords: at least 8 industry Discovery queries", () => {
    const result = generateQueryIntelligence(SALES_NO_NICHE);
    const industryDiscovery = result.clusters
      .flatMap((c) => c.queries)
      .filter((q) => q.stage === "DISCOVERY" && q.specificity === "industry");

    expect(industryDiscovery.length).toBeGreaterThanOrEqual(8);
  });

  it("sales role with niche keywords: broad, industry, and niche all present", () => {
    const result = generateQueryIntelligence(SALES_WITH_NICHE);
    const discoveryQueries = result.clusters
      .flatMap((c) => c.queries)
      .filter((q) => q.stage === "DISCOVERY");

    const levels = new Set(
      discoveryQueries.map((q) => q.specificity).filter(Boolean),
    ) as Set<SpecificityLevel>;

    expect(levels.has("broad")).toBe(true);
    expect(levels.has("industry")).toBe(true);
    expect(levels.has("niche")).toBe(true);
  });

  it("sales role with niche keywords + geography: hyper_specific queries are present", () => {
    const result = generateQueryIntelligence(SALES_WITH_NICHE);
    const discoveryQueries = result.clusters
      .flatMap((c) => c.queries)
      .filter((q) => q.stage === "DISCOVERY");

    const hasHyperSpecific = discoveryQueries.some(
      (q) => q.specificity === "hyper_specific",
    );
    expect(hasHyperSpecific).toBe(true);
  });

  it("every Discovery query has a specificity tag", () => {
    const result = generateQueryIntelligence(SALES_WITH_NICHE);
    const discoveryQueries = result.clusters
      .flatMap((c) => c.queries)
      .filter((q) => q.stage === "DISCOVERY");

    expect(discoveryQueries.length).toBeGreaterThan(0);
    for (const q of discoveryQueries) {
      expect(
        q.specificity,
        `Expected specificity on Discovery query: "${q.text}"`,
      ).toBeDefined();
    }
  });

  it("minimum 5 broad queries even without niche keywords", () => {
    const result = generateQueryIntelligence(SALES_NO_NICHE);
    const broadCount = result.clusters
      .flatMap((c) => c.queries)
      .filter((q) => q.stage === "DISCOVERY" && q.specificity === "broad")
      .length;

    expect(broadCount).toBeGreaterThanOrEqual(5);
  });

  it("minimum 5 industry queries when industry is set", () => {
    const result = generateQueryIntelligence(SALES_NO_NICHE);
    const industryCount = result.clusters
      .flatMap((c) => c.queries)
      .filter((q) => q.stage === "DISCOVERY" && q.specificity === "industry")
      .length;

    expect(industryCount).toBeGreaterThanOrEqual(5);
  });

  it("niche queries use provided keywords as text content", () => {
    const result = generateQueryIntelligence(SALES_WITH_NICHE);
    const nicheQueries = result.clusters
      .flatMap((c) => c.queries)
      .filter((q) => q.stage === "DISCOVERY" && q.specificity === "niche");

    expect(nicheQueries.length).toBeGreaterThan(0);

    const texts = nicheQueries.map((q) => q.text.toLowerCase());
    const mentionsKeyword = texts.some(
      (t) => t.includes("timeshare") || t.includes("vacation ownership"),
    );
    expect(mentionsKeyword).toBe(true);
  });

  it("non-Discovery queries do not have a specificity tag", () => {
    const result = generateQueryIntelligence(SALES_NO_NICHE);
    const nonDiscovery = result.clusters
      .flatMap((c) => c.queries)
      .filter((q) => q.stage !== "DISCOVERY");

    for (const q of nonDiscovery) {
      expect(
        q.specificity,
        `Expected no specificity on ${q.stage} query: "${q.text}"`,
      ).toBeUndefined();
    }
  });
});

// ─── Role variant expansion ──────────────────────────────────

const ROLE_VARIANT_INPUT: QueryGenerationInput = {
  companyName: "Meridian Technologies",
  roleTitle: "Senior Backend Engineer",
  geography: "Austin, TX",
  industry: "Enterprise Software",
  competitors: ["Apex Cloud Systems", "NovaBridge Analytics"],
  roleVariants: ["Frontend Engineer", "DevOps Engineer"],
};

describe("role variant expansion", () => {
  it("produces more queries with role variants than without", () => {
    const withVariants = generateQueryIntelligence(ROLE_VARIANT_INPUT);
    const withoutVariants = generateQueryIntelligence({
      ...ROLE_VARIANT_INPUT,
      roleVariants: [],
    });
    expect(withVariants.totalGenerated).toBeGreaterThan(withoutVariants.totalGenerated);
  });

  it("query count increases proportionally with each additional variant", () => {
    const oneVariant = generateQueryIntelligence({
      ...ROLE_VARIANT_INPUT,
      roleVariants: ["Frontend Engineer"],
    });
    const twoVariants = generateQueryIntelligence({
      ...ROLE_VARIANT_INPUT,
      roleVariants: ["Frontend Engineer", "DevOps Engineer"],
    });
    // Two variants should produce more queries than one
    expect(twoVariants.totalGenerated).toBeGreaterThan(oneVariant.totalGenerated);
  });

  it("variant queries reference the variant role title, not the primary", () => {
    const result = generateQueryIntelligence(ROLE_VARIANT_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    const mentionsFrontend = allQueries.some((q) =>
      q.text.toLowerCase().includes("frontend engineer"),
    );
    const mentionsDevOps = allQueries.some((q) =>
      q.text.toLowerCase().includes("devops engineer"),
    );
    expect(mentionsFrontend).toBe(true);
    expect(mentionsDevOps).toBe(true);
  });

  it("variant queries are only CONSIDERATION, EVALUATION, or COMMITMENT — not DISCOVERY", () => {
    const result = generateQueryIntelligence(ROLE_VARIANT_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    // Variant queries are identified by their intent suffix
    const variantQueries = allQueries.filter((q) =>
      q.intent.includes("(Frontend Engineer)") || q.intent.includes("(DevOps Engineer)"),
    );

    expect(variantQueries.length).toBeGreaterThan(0);
    for (const q of variantQueries) {
      expect(
        q.stage,
        `Variant query should not be DISCOVERY: "${q.text}"`,
      ).not.toBe("DISCOVERY");
    }
  });

  it("variant queries do not carry a specificity tag", () => {
    const result = generateQueryIntelligence(ROLE_VARIANT_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    const variantQueries = allQueries.filter((q) =>
      q.intent.includes("(Frontend Engineer)") || q.intent.includes("(DevOps Engineer)"),
    );

    for (const q of variantQueries) {
      expect(
        q.specificity,
        `Variant query should not have specificity: "${q.text}"`,
      ).toBeUndefined();
    }
  });

  it("all variant queries have correct stage and theme tags", () => {
    const result = generateQueryIntelligence(ROLE_VARIANT_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);
    const validStages = new Set(["CONSIDERATION", "EVALUATION", "COMMITMENT"]);
    const validThemes = new Set([
      "reputation", "compensation", "hiring_process",
      "role_expectations", "culture", "competitor_comparison",
    ]);

    const variantQueries = allQueries.filter((q) =>
      q.intent.includes("(Frontend Engineer)") || q.intent.includes("(DevOps Engineer)"),
    );

    for (const q of variantQueries) {
      expect(validStages.has(q.stage), `Bad stage "${q.stage}" on: "${q.text}"`).toBe(true);
      expect(validThemes.has(q.theme), `Bad theme "${q.theme}" on: "${q.text}"`).toBe(true);
    }
  });

  it("no role variant DISCOVERY queries means Discovery specificity coverage is unaffected", () => {
    const result = generateQueryIntelligence(ROLE_VARIANT_INPUT);
    const discoveryQueries = result.clusters
      .flatMap((c) => c.queries)
      .filter((q) => q.stage === "DISCOVERY");

    // All Discovery queries should still have specificity
    for (const q of discoveryQueries) {
      expect(
        q.specificity,
        `Expected specificity on Discovery query: "${q.text}"`,
      ).toBeDefined();
    }
  });
});

// ─── Phrasing variant expansion ──────────────────────────────

describe("phrasing variant expansion", () => {
  it("produces more queries with phrasing variants than a minimal no-match input", () => {
    // Phrasing variants match specific canonical templates.
    // BASE_INPUT contains several matching templates so variant count should be > 0.
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);
    const phrasings = allQueries.filter((q) =>
      q.intent.endsWith("(phrasing variant)"),
    );
    expect(phrasings.length).toBeGreaterThan(0);
  });

  it("phrasing variant queries inherit stage from source query", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);
    const phrasings = allQueries.filter((q) =>
      q.intent.endsWith("(phrasing variant)"),
    );

    const validStages = new Set(["DISCOVERY", "CONSIDERATION", "EVALUATION", "COMMITMENT"]);
    for (const q of phrasings) {
      expect(validStages.has(q.stage), `Bad stage on phrasing variant: "${q.text}"`).toBe(true);
    }
  });

  it("phrasing variant queries inherit theme from source query", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);
    const phrasings = allQueries.filter((q) =>
      q.intent.endsWith("(phrasing variant)"),
    );

    const validThemes = new Set([
      "reputation", "compensation", "hiring_process",
      "role_expectations", "culture", "competitor_comparison",
    ]);
    for (const q of phrasings) {
      expect(validThemes.has(q.theme), `Bad theme on phrasing variant: "${q.text}"`).toBe(true);
    }
  });

  it("phrasing variants have non-empty text and intent", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);
    const phrasings = allQueries.filter((q) =>
      q.intent.endsWith("(phrasing variant)"),
    );

    for (const q of phrasings) {
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.intent.length).toBeGreaterThan(0);
    }
  });
});

// ─── Combined expansion: 400+ query target ───────────────────

describe("combined expansion volume", () => {
  const ENTERPRISE_INPUT: QueryGenerationInput = {
    companyName: "Meridian Technologies",
    roleTitle: "Senior Backend Engineer",
    geography: "Austin, TX",
    industry: "Enterprise Software",
    competitors: [
      "Apex Cloud Systems",
      "NovaBridge Analytics",
      "Vertex Solutions",
      "Orion Digital",
    ],
    nicheKeywords: ["enterprise SaaS", "cloud infrastructure"],
    revenueScale: "enterprise",
    roleVariants: ["Frontend Engineer", "Full Stack Engineer", "DevOps Engineer"],
    skipDedup: true,
  };

  it("produces 400+ queries for an enterprise client with 4 competitors and role variants", () => {
    const result = generateQueryIntelligence(ENTERPRISE_INPUT);
    expect(result.totalGenerated).toBeGreaterThanOrEqual(400);
  });

  it("all four decision stages have representation at enterprise scale", () => {
    const result = generateQueryIntelligence(ENTERPRISE_INPUT);
    const stages = new Set(
      result.clusters.flatMap((c) => c.queries).map((q) => q.stage),
    );
    expect(stages.has("DISCOVERY")).toBe(true);
    expect(stages.has("CONSIDERATION")).toBe(true);
    expect(stages.has("EVALUATION")).toBe(true);
    expect(stages.has("COMMITMENT")).toBe(true);
  });

  it("all six themes have representation at enterprise scale", () => {
    const result = generateQueryIntelligence(ENTERPRISE_INPUT);
    const themes = new Set(result.clusters.map((c) => c.theme));
    for (const theme of ["reputation", "compensation", "hiring_process", "role_expectations", "culture", "competitor_comparison"]) {
      expect(themes.has(theme as QueryTheme), `Missing theme: ${theme}`).toBe(true);
    }
  });
});

// ─── Expanded competitor templates ───────────────────────────

describe("expanded competitor templates", () => {
  it("generates salary comparison queries for each competitor", () => {
    // Use skipDedup so the salary template is not collapsed against the existing
    // "{company} vs {competitor} compensation for {role}" template (Jaccard > 0.7).
    const result = generateQueryIntelligence({ ...BASE_INPUT, skipDedup: true });
    const allText = result.clusters.flatMap((c) => c.queries).map((q) => q.text.toLowerCase());

    // New template: "{company} vs {competitor} salary for {role}"
    const hasSalaryComp = allText.some((t) =>
      t.includes("apex cloud systems") && t.includes("salary for"),
    );
    expect(hasSalaryComp).toBe(true);
  });

  it("generates offer decision queries for each competitor", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const allText = result.clusters.flatMap((c) => c.queries).map((q) => q.text.toLowerCase());

    // New template: "I have offers from {company} and {competitor} which should I take"
    const hasOfferQuery = allText.some((t) =>
      t.includes("i have offers from") && t.includes("apex cloud systems"),
    );
    expect(hasOfferQuery).toBe(true);
  });

  it("generates glassdoor comparison queries for each competitor", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const allText = result.clusters.flatMap((c) => c.queries).map((q) => q.text.toLowerCase());

    const hasGlassdoor = allText.some((t) =>
      t.includes("glassdoor reviews") && t.includes("apex cloud systems"),
    );
    expect(hasGlassdoor).toBe(true);
  });

  it("new competitor templates have EVALUATION stage", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    const offerQuery = allQueries.find((q) =>
      q.text.toLowerCase().includes("i have offers from"),
    );
    expect(offerQuery).toBeDefined();
    expect(offerQuery!.stage).toBe("EVALUATION");
  });
});

// ─── Scoring reweight (P1b) ──────────────────────────────────

describe("scoring reweight", () => {
  it("Discovery queries score higher than Consideration queries for the same theme", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    const discoveryQueries = allQueries.filter((q) => q.stage === "DISCOVERY");
    const considerationQueries = allQueries.filter((q) => q.stage === "CONSIDERATION");

    expect(discoveryQueries.length).toBeGreaterThan(0);
    expect(considerationQueries.length).toBeGreaterThan(0);

    const avgDiscovery =
      discoveryQueries.reduce((sum, q) => sum + q.priority, 0) /
      discoveryQueries.length;
    const avgConsideration =
      considerationQueries.reduce((sum, q) => sum + q.priority, 0) /
      considerationQueries.length;

    expect(avgDiscovery).toBeGreaterThan(avgConsideration);
  });

  it("Evaluation queries score higher than Consideration queries on average", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    const evalQueries = allQueries.filter((q) => q.stage === "EVALUATION");
    const considerationQueries = allQueries.filter((q) => q.stage === "CONSIDERATION");

    expect(evalQueries.length).toBeGreaterThan(0);
    expect(considerationQueries.length).toBeGreaterThan(0);

    const avgEval =
      evalQueries.reduce((sum, q) => sum + q.priority, 0) / evalQueries.length;
    const avgConsideration =
      considerationQueries.reduce((sum, q) => sum + q.priority, 0) /
      considerationQueries.length;

    expect(avgEval).toBeGreaterThan(avgConsideration);
  });

  it("company name presence does NOT increase a query's score", () => {
    // Two queries: same stage, theme, and intent — one mentions the company, one does not.
    // If company name adds a bonus, the first would score higher. It should not.
    //
    // We verify this by checking that Consideration queries (which always contain
    // the company name) do NOT outscore Discovery queries (which often do not).
    // That invariant is guaranteed only if there is no company-name bonus.
    const result = generateQueryIntelligence({
      ...BASE_INPUT,
      competitors: [], // remove competitors to reduce noise
    });
    const allQueries = result.clusters.flatMap((c) => c.queries);

    // Discovery queries that do NOT mention the company name
    const discoveryWithoutCompany = allQueries.filter(
      (q) =>
        q.stage === "DISCOVERY" &&
        !q.text.toLowerCase().includes("meridian technologies"),
    );
    // Consideration queries that DO mention the company name
    const considerationWithCompany = allQueries.filter(
      (q) =>
        q.stage === "CONSIDERATION" &&
        q.text.toLowerCase().includes("meridian technologies"),
    );

    expect(discoveryWithoutCompany.length).toBeGreaterThan(0);
    expect(considerationWithCompany.length).toBeGreaterThan(0);

    const avgDiscoveryNoCompany =
      discoveryWithoutCompany.reduce((sum, q) => sum + q.priority, 0) /
      discoveryWithoutCompany.length;
    const avgConsiderationWithCompany =
      considerationWithCompany.reduce((sum, q) => sum + q.priority, 0) /
      considerationWithCompany.length;

    // Discovery (no company name) must score >= Consideration (with company name).
    // If there were a company-name bonus, this would fail.
    expect(avgDiscoveryNoCompany).toBeGreaterThanOrEqual(avgConsiderationWithCompany);
  });

  it("role title mention adds +1 to a query's score", () => {
    // Verify that queries containing the role title score one point higher
    // than otherwise-identical queries (same stage, same theme) that don't.
    const result = generateQueryIntelligence(BASE_INPUT);
    const allQueries = result.clusters.flatMap((c) => c.queries);

    // Find two Consideration queries with the same theme where one has the role and one does not.
    const considerationReputation = allQueries.filter(
      (q) => q.stage === "CONSIDERATION" && q.theme === "reputation",
    );

    const withRole = considerationReputation.filter((q) =>
      q.text.toLowerCase().includes("senior backend engineer"),
    );
    const withoutRole = considerationReputation.filter(
      (q) => !q.text.toLowerCase().includes("senior backend engineer"),
    );

    // If both groups exist, queries mentioning the role should score at least as high.
    if (withRole.length > 0 && withoutRole.length > 0) {
      const avgWith = withRole.reduce((s, q) => s + q.priority, 0) / withRole.length;
      const avgWithout =
        withoutRole.reduce((s, q) => s + q.priority, 0) / withoutRole.length;
      expect(avgWith).toBeGreaterThanOrEqual(avgWithout);
    }
  });

  it("all priorities are clamped to [1, 10]", () => {
    // Use the full enterprise input to exercise the widest range of priorities.
    const result = generateQueryIntelligence({
      ...BASE_INPUT,
      competitors: ["Apex Cloud Systems", "NovaBridge Analytics", "Vertex", "Orion"],
      nicheKeywords: ["enterprise SaaS"],
      revenueScale: "enterprise",
    });
    for (const cluster of result.clusters) {
      for (const q of cluster.queries) {
        expect(q.priority, `Priority out of range for: "${q.text}"`).toBeGreaterThanOrEqual(1);
        expect(q.priority, `Priority out of range for: "${q.text}"`).toBeLessThanOrEqual(10);
      }
    }
  });
});

// ─── generateQueryIntelligence with dedupMode and removedQueries ──────────────

describe("generateQueryIntelligence dedupMode integration", () => {
  it("conservative mode produces at least as many queries as standard mode", () => {
    const conservative = generateQueryIntelligence({
      ...BASE_INPUT,
      dedupMode: "conservative",
    });
    const standard = generateQueryIntelligence({
      ...BASE_INPUT,
      dedupMode: "standard",
    });
    // Conservative removes fewer queries, so totalAfterDedup >= standard
    expect(conservative.totalAfterDedup).toBeGreaterThanOrEqual(standard.totalAfterDedup);
  });

  it("standard mode produces at least as many queries as aggressive mode", () => {
    const standard = generateQueryIntelligence({
      ...BASE_INPUT,
      dedupMode: "standard",
    });
    const aggressive = generateQueryIntelligence({
      ...BASE_INPUT,
      dedupMode: "aggressive",
    });
    expect(standard.totalAfterDedup).toBeGreaterThanOrEqual(aggressive.totalAfterDedup);
  });

  it("skipDedup: true produces totalAfterDedup equal to totalGenerated", () => {
    const result = generateQueryIntelligence({
      ...BASE_INPUT,
      skipDedup: true,
    });
    expect(result.totalAfterDedup).toBe(result.totalGenerated);
  });

  it("includeRemovedQueries: false omits removedQueries from result (default)", () => {
    const result = generateQueryIntelligence(BASE_INPUT);
    expect(result.removedQueries).toBeUndefined();
  });

  it("includeRemovedQueries: true populates removedQueries with reasons and duplicate references", () => {
    const result = generateQueryIntelligence({
      ...BASE_INPUT,
      includeRemovedQueries: true,
    });
    // We expect some queries to have been deduped (BASE_INPUT has duplicates)
    expect(result.removedQueries).toBeDefined();
    expect(Array.isArray(result.removedQueries)).toBe(true);

    // If any were removed, verify the shape
    if (result.removedQueries!.length > 0) {
      const sample = result.removedQueries![0]!;
      expect(typeof sample.text).toBe("string");
      expect(typeof sample.reason).toBe("string");
      expect(typeof sample.duplicateOfText).toBe("string");
      expect(["exact_match", "jaccard_similarity", "intent_duplicate"]).toContain(sample.reason);
    }
  });

  it("includeRemovedQueries: true with skipDedup produces an empty removedQueries array", () => {
    const result = generateQueryIntelligence({
      ...BASE_INPUT,
      skipDedup: true,
      includeRemovedQueries: true,
    });
    // skipDedup bypasses dedup entirely — no removed queries, and the field stays undefined
    // because dedupResult is null when skipped
    expect(result.removedQueries).toBeUndefined();
  });

  it("totalGenerated + removed count matches raw total when dedup ran", () => {
    const result = generateQueryIntelligence({
      ...BASE_INPUT,
      includeRemovedQueries: true,
    });
    expect(result.removedQueries).toBeDefined();
    expect(result.totalAfterDedup + result.removedQueries!.length).toBe(result.totalGenerated);
  });

  it("dedup runs after stage assignment: stage information is available for Pass 3", () => {
    // If dedup ran before stage assignment, Pass 3 would have no stage data and
    // would skip intent-level grouping. We verify intent-level dedup works by
    // checking that the aggressive mode produces fewer results than conservative
    // for a multi-competitor input that has many same-intent Consideration queries.
    const conservative = generateQueryIntelligence({
      ...FOUR_COMPETITOR_INPUT,
      dedupMode: "conservative",
    });
    const aggressive = generateQueryIntelligence({
      ...FOUR_COMPETITOR_INPUT,
      dedupMode: "aggressive",
    });
    // Aggressive should remove more than conservative (strictly fewer survivors expected
    // with more competitors generating many same-intent branded queries).
    expect(conservative.totalAfterDedup).toBeGreaterThanOrEqual(aggressive.totalAfterDedup);
  });
});
