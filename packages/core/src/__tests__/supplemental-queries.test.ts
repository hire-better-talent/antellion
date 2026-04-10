import { describe, it, expect } from "vitest";
import {
  validateSupplementalQueries,
  verifySupplementalStages,
} from "../supplemental-queries";
import type { SupplementalQuery } from "../supplemental-queries";

// ─── Helpers ────────────────────────────────────────────────

function makeItem(overrides?: Partial<{
  text: string;
  theme: string;
  stage: string;
  rationale: string;
}>) {
  return {
    text: "how does Acme Corp compare to Stripe for engineers",
    theme: "competitor_comparison",
    stage: "EVALUATION",
    rationale: "Targets direct competitive comparison not in templates.",
    ...overrides,
  };
}

function toRawJSON(items: unknown[]): string {
  return JSON.stringify(items);
}

// ─── validateSupplementalQueries ────────────────────────────

describe("validateSupplementalQueries", () => {
  it("returns valid queries from a well-formed JSON array", () => {
    const raw = toRawJSON([
      makeItem({ text: "best fintech companies for engineers to work at in New York" }),
      makeItem({ text: "which fintech employers offer the best equity compensation packages" }),
    ]);

    const result = validateSupplementalQueries(raw, "Acme Corp");

    expect(result).toHaveLength(2);
    expect(result[0]!.source).toBe("llm");
    expect(result[1]!.source).toBe("llm");
  });

  it("returns empty array for malformed JSON", () => {
    expect(validateSupplementalQueries("this is not json", "Acme Corp")).toEqual([]);
    expect(validateSupplementalQueries("{}", "Acme Corp")).toEqual([]);
    expect(validateSupplementalQueries("[invalid json]", "Acme Corp")).toEqual([]);
  });

  it("returns empty array for non-string input", () => {
    expect(validateSupplementalQueries(null, "Acme Corp")).toEqual([]);
    expect(validateSupplementalQueries(undefined, "Acme Corp")).toEqual([]);
    expect(validateSupplementalQueries(42, "Acme Corp")).toEqual([]);
    expect(validateSupplementalQueries([], "Acme Corp")).toEqual([]);
  });

  it("returns empty array for an empty JSON array", () => {
    expect(validateSupplementalQueries("[]", "Acme Corp")).toEqual([]);
  });

  it("filters out queries with empty text", () => {
    const raw = toRawJSON([makeItem({ text: "" })]);
    expect(validateSupplementalQueries(raw, "Acme Corp")).toEqual([]);
  });

  it("filters out queries with fewer than 5 words", () => {
    const raw = toRawJSON([
      makeItem({ text: "Acme Corp vs Stripe" }),  // 4 words
      makeItem({ text: "best tech companies to work for" }),  // 6 words — should survive
    ]);

    const result = validateSupplementalQueries(raw, "Acme Corp");

    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("best tech companies to work for");
  });

  it("filters out queries with invalid theme", () => {
    const raw = toRawJSON([makeItem({ theme: "vibes_check" })]);
    expect(validateSupplementalQueries(raw, "Acme Corp")).toEqual([]);
  });

  it("filters out queries with invalid stage", () => {
    const raw = toRawJSON([makeItem({ stage: "INTEREST" })]);
    expect(validateSupplementalQueries(raw, "Acme Corp")).toEqual([]);
  });

  it("filters out the canonical generic template query for the client", () => {
    const raw = toRawJSON([
      makeItem({ text: "what is it like to work at Acme Corp" }),
      makeItem({ text: "best fintech companies for engineers in New York City today" }), // should survive
    ]);

    const result = validateSupplementalQueries(raw, "Acme Corp");

    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("best fintech companies for engineers in New York City today");
  });

  it("preserves source: 'llm' on all outputs", () => {
    const raw = toRawJSON([
      makeItem({ text: "which cloud companies have the best work life balance for engineers" }),
      makeItem({ text: "top employers for senior engineers at fintech growth stage startups" }),
    ]);

    const result = validateSupplementalQueries(raw, "Acme Corp");

    expect(result.every((q) => q.source === "llm")).toBe(true);
  });

  it("caps output at 30 queries even when more are provided", () => {
    const items = Array.from({ length: 40 }, (_, i) =>
      makeItem({ text: `best employer for software engineers option ${i + 1} across industries` }),
    );
    const raw = toRawJSON(items);

    const result = validateSupplementalQueries(raw, "Acme Corp");

    expect(result.length).toBeLessThanOrEqual(30);
  });

  it("strips markdown code fences from the LLM response", () => {
    const inner = toRawJSON([
      makeItem({ text: "which fintech companies have the best engineering culture in 2025" }),
    ]);
    const raw = `\`\`\`json\n${inner}\n\`\`\``;

    const result = validateSupplementalQueries(raw, "Acme Corp");

    expect(result).toHaveLength(1);
  });

  it("handles partial arrays — drops invalid items but keeps valid ones", () => {
    const raw = toRawJSON([
      makeItem({ text: "best engineering culture in fintech companies right now" }),
      makeItem({ theme: "invalid_theme" }),
      makeItem({ text: "short" }),
      makeItem({ text: "which employers offer the most competitive total compensation for engineers" }),
    ]);

    const result = validateSupplementalQueries(raw, "Acme Corp");

    expect(result).toHaveLength(2);
  });

  it("accepts all 6 valid themes", () => {
    const themes = [
      "reputation",
      "compensation",
      "hiring_process",
      "role_expectations",
      "culture",
      "competitor_comparison",
    ] as const;

    for (const theme of themes) {
      const raw = toRawJSON([makeItem({ theme, text: "is this a valid query with enough words" })]);
      const result = validateSupplementalQueries(raw, "Acme Corp");
      expect(result).toHaveLength(1);
      expect(result[0]!.theme).toBe(theme);
    }
  });

  it("accepts all 4 valid stages", () => {
    const stages = ["DISCOVERY", "EVALUATION", "CONSIDERATION", "COMMITMENT"] as const;

    for (const stage of stages) {
      const raw = toRawJSON([makeItem({ stage, text: "engineering leaders with best reputation in fintech sector" })]);
      const result = validateSupplementalQueries(raw, "Acme Corp");
      expect(result).toHaveLength(1);
      expect(result[0]!.stage).toBe(stage);
    }
  });
});

// ─── verifySupplementalStages ────────────────────────────────

describe("verifySupplementalStages", () => {
  function makeQuery(overrides?: Partial<SupplementalQuery>): SupplementalQuery {
    return {
      text: "best companies for engineers in fintech sector right now",
      theme: "reputation",
      stage: "DISCOVERY",
      rationale: "Test query.",
      source: "llm",
      ...overrides,
    };
  }

  it("overrides CONSIDERATION to DISCOVERY when query has no client name", () => {
    const query = makeQuery({
      text: "best fintech employers for software engineers who value work life balance",
      stage: "CONSIDERATION",
    });

    const { queries, disagreements } = verifySupplementalStages(
      [query],
      "Acme Corp",
      [],
    );

    expect(queries[0]!.stage).toBe("DISCOVERY");
    expect(disagreements).toHaveLength(1);
    expect(disagreements[0]!.overridden).toBe(true);
  });

  it("keeps LLM stage for EVALUATION disagreements (classifier says CONSIDERATION)", () => {
    // A subtle comparison query that classifier misses but LLM knows is evaluation
    const query = makeQuery({
      text: "Acme Corp engineering team reputation versus industry peers",
      stage: "EVALUATION",
    });

    // Classifier would say EVALUATION here too because of "versus" — use a cleaner case
    const query2 = makeQuery({
      text: "Acme Corp technical leadership credibility and product quality assessment",
      stage: "EVALUATION",
      // classifier will say CONSIDERATION (no comparison terms) — LLM says EVALUATION
    });

    const { queries } = verifySupplementalStages([query2], "Acme Corp", []);

    // LLM's EVALUATION assignment is kept
    expect(queries[0]!.stage).toBe("EVALUATION");
  });

  it("does not override when LLM and classifier agree", () => {
    const query = makeQuery({
      text: "best tech companies to work for in the fintech industry today",
      stage: "DISCOVERY",
    });

    const { queries, disagreements } = verifySupplementalStages(
      [query],
      "Acme Corp",
      [],
    );

    expect(queries[0]!.stage).toBe("DISCOVERY");
    expect(disagreements).toHaveLength(0);
  });

  it("returns all queries when there are no disagreements", () => {
    const queries = [
      makeQuery({ text: "best employers for senior engineers in cloud infrastructure space" }),
      makeQuery({ text: "Acme Corp vs Stripe for engineers salary and equity", stage: "EVALUATION" }),
    ];

    const { queries: verified } = verifySupplementalStages(queries, "Acme Corp", [
      "Stripe",
    ]);

    expect(verified).toHaveLength(2);
  });

  it("preserves all other fields on overridden queries", () => {
    const query = makeQuery({
      text: "top rated employers for backend engineers at growth stage startups",
      stage: "CONSIDERATION",
      theme: "reputation",
      rationale: "Tests gap not covered by templates.",
    });

    const { queries } = verifySupplementalStages([query], "Acme Corp", []);

    expect(queries[0]!.theme).toBe("reputation");
    expect(queries[0]!.rationale).toBe("Tests gap not covered by templates.");
    expect(queries[0]!.source).toBe("llm");
    expect(queries[0]!.stage).toBe("DISCOVERY");
  });
});
