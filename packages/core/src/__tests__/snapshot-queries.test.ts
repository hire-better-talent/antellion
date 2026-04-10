import { describe, it, expect } from "vitest";
import { generateSnapshotQueries } from "../snapshot-queries";
import type { SnapshotQueryInput, SnapshotQuery } from "../snapshot-queries";

// ─── Fixtures ────────────────────────────────────────────────

const BASE_INPUT: SnapshotQueryInput = {
  prospectName: "Meridian Technologies",
  prospectDomain: "meridiantech.com",
  industry: "fintech",
  roleTitle: "Software Engineer",
  competitors: [
    { name: "Stripe", domain: "stripe.com" },
    { name: "Plaid", domain: "plaid.com" },
    { name: "Brex", domain: "brex.com" },
  ],
};

function makeInput(overrides: Partial<SnapshotQueryInput> = {}): SnapshotQueryInput {
  return { ...BASE_INPUT, ...overrides };
}

function byCategory(queries: SnapshotQuery[], category: SnapshotQuery["category"]) {
  return queries.filter((q) => q.category === category);
}

// ─── 1. Total count ───────────────────────────────────────────

describe("generateSnapshotQueries — total count", () => {
  it("returns exactly 100 queries with 3 competitors", () => {
    expect(generateSnapshotQueries(BASE_INPUT)).toHaveLength(100);
  });

  it("returns exactly 100 queries with 2 competitors", () => {
    const input = makeInput({
      competitors: [
        { name: "Stripe", domain: "stripe.com" },
        { name: "Plaid", domain: "plaid.com" },
      ],
    });
    expect(generateSnapshotQueries(input)).toHaveLength(100);
  });

  it("returns exactly 100 queries with 1 competitor", () => {
    const input = makeInput({
      competitors: [{ name: "Stripe", domain: "stripe.com" }],
    });
    expect(generateSnapshotQueries(input)).toHaveLength(100);
  });

  it("returns exactly 100 queries with niche keywords", () => {
    expect(generateSnapshotQueries(makeInput({ nicheKeywords: ["payments"] }))).toHaveLength(100);
  });

  it("returns exactly 100 queries with geography", () => {
    expect(generateSnapshotQueries(makeInput({ geography: "New York" }))).toHaveLength(100);
  });

  it("returns exactly 100 queries with both niche and geography", () => {
    expect(
      generateSnapshotQueries(makeInput({ nicheKeywords: ["payments"], geography: "New York" })),
    ).toHaveLength(100);
  });

  it("all queries have non-empty text", () => {
    const queries = generateSnapshotQueries(BASE_INPUT);
    for (const q of queries) {
      expect(q.text.trim()).not.toBe("");
    }
  });
});

// ─── 2. Category distribution ────────────────────────────────

describe("generateSnapshotQueries — category distribution", () => {
  it("produces the correct distribution: 65/18/10/7", () => {
    const queries = generateSnapshotQueries(BASE_INPUT);
    expect(byCategory(queries, "discovery")).toHaveLength(65);
    expect(byCategory(queries, "competitor_contrast")).toHaveLength(18);
    expect(byCategory(queries, "reputation")).toHaveLength(10);
    expect(byCategory(queries, "citation_source")).toHaveLength(7);
  });

  it("distribution holds with 2 competitors", () => {
    const queries = generateSnapshotQueries(
      makeInput({
        competitors: [
          { name: "Stripe", domain: "stripe.com" },
          { name: "Plaid", domain: "plaid.com" },
        ],
      }),
    );
    expect(byCategory(queries, "discovery")).toHaveLength(65);
    expect(byCategory(queries, "competitor_contrast")).toHaveLength(18);
    expect(byCategory(queries, "reputation")).toHaveLength(10);
    expect(byCategory(queries, "citation_source")).toHaveLength(7);
  });

  it("distribution holds with 1 competitor", () => {
    const queries = generateSnapshotQueries(
      makeInput({ competitors: [{ name: "Stripe", domain: "stripe.com" }] }),
    );
    expect(byCategory(queries, "discovery")).toHaveLength(65);
    expect(byCategory(queries, "competitor_contrast")).toHaveLength(18);
    expect(byCategory(queries, "reputation")).toHaveLength(10);
    expect(byCategory(queries, "citation_source")).toHaveLength(7);
  });
});

// ─── 3. Discovery absence rule ───────────────────────────────

describe("generateSnapshotQueries — discovery absence rule", () => {
  it("no discovery query contains the prospect company name", () => {
    const queries = generateSnapshotQueries(BASE_INPUT);
    const discovery = byCategory(queries, "discovery");
    const prospectLower = BASE_INPUT.prospectName.toLowerCase();
    for (const q of discovery) {
      expect(q.text.toLowerCase()).not.toContain(prospectLower);
    }
  });

  it("discovery absence holds with niche keywords", () => {
    const queries = generateSnapshotQueries(makeInput({ nicheKeywords: ["payments"] }));
    const prospectLower = BASE_INPUT.prospectName.toLowerCase();
    for (const q of byCategory(queries, "discovery")) {
      expect(q.text.toLowerCase()).not.toContain(prospectLower);
    }
  });

  it("discovery absence holds with geography", () => {
    const queries = generateSnapshotQueries(makeInput({ geography: "Austin" }));
    const prospectLower = BASE_INPUT.prospectName.toLowerCase();
    for (const q of byCategory(queries, "discovery")) {
      expect(q.text.toLowerCase()).not.toContain(prospectLower);
    }
  });

  it("discovery queries contain industry and/or role variables", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const withIndustry = discovery.filter((q) => q.text.toLowerCase().includes("fintech"));
    expect(withIndustry.length).toBeGreaterThan(0);
  });
});

// ─── 4. Discovery theme coverage ─────────────────────────────

describe("generateSnapshotQueries — discovery theme coverage", () => {
  it("at least 5 queries cover general reputation theme (T1)", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    // T1 proxies: top/best companies, on my radar, on my shortlist, recommend working at, avoid, etc.
    const t1 = discovery.filter(
      (q) =>
        q.text.includes("top companies") ||
        q.text.includes("best companies") ||
        q.text.includes("top rated") ||
        q.text.includes("on my radar") ||
        q.text.includes("on my shortlist") ||
        q.text.includes("should be on my") ||
        q.text.includes("looking for a") ||
        q.text.includes("recommend working at") ||
        q.text.includes("should I avoid") ||
        q.text.includes("most respected") ||
        q.text.includes("treating employees well") ||
        q.text.includes("great places to work") ||
        q.text.includes("best employers") ||
        q.text.includes("top employers"),
    );
    expect(t1.length).toBeGreaterThanOrEqual(5);
  });

  it("at least 5 queries cover compensation theme (T2)", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const t2 = discovery.filter(
      (q) =>
        q.text.includes("highest paying") ||
        q.text.includes("best paying") ||
        q.text.includes("pay") ||
        q.text.includes("compensation") ||
        q.text.includes("equity"),
    );
    expect(t2.length).toBeGreaterThanOrEqual(5);
  });

  it("at least 5 queries cover culture theme (T3)", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const t3 = discovery.filter(
      (q) =>
        q.text.includes("culture") ||
        q.text.includes("happiest") ||
        q.text.includes("employee satisfaction") ||
        q.text.includes("happy") ||
        q.text.includes("treats employees"),
    );
    expect(t3.length).toBeGreaterThanOrEqual(5);
  });

  it("at least 5 queries cover career growth theme (T4)", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const t4 = discovery.filter(
      (q) =>
        q.text.includes("career") ||
        q.text.includes("growth") ||
        q.text.includes("develop") ||
        q.text.includes("management") ||
        q.text.includes("mentorship") ||
        q.text.includes("promote"),
    );
    expect(t4.length).toBeGreaterThanOrEqual(5);
  });

  it("at least 5 queries cover work-life balance theme (T5)", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const t5 = discovery.filter(
      (q) =>
        q.text.includes("work life balance") ||
        q.text.includes("flexibility") ||
        q.text.includes("flexible") ||
        q.text.includes("remote") ||
        q.text.includes("hybrid"),
    );
    expect(t5.length).toBeGreaterThanOrEqual(5);
  });

  it("at least 4 queries cover remote work theme (T10)", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const t10 = discovery.filter(
      (q) =>
        q.text.includes("remote") ||
        q.text.includes("hybrid") ||
        q.text.includes("flexibility") ||
        q.text.includes("work flexibility"),
    );
    expect(t10.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── 5. Phrasing variety ─────────────────────────────────────

describe("generateSnapshotQueries — phrasing variety", () => {
  it("not all discovery queries start with 'best'", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const startWithBest = discovery.filter((q) => q.text.toLowerCase().startsWith("best"));
    expect(startWithBest.length).toBeLessThan(discovery.length);
  });

  it("contains first-person conversational queries", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const firstPerson = discovery.filter(
      (q) =>
        q.text.startsWith("I'm") ||
        q.text.startsWith("I want") ||
        q.text.startsWith("where should I"),
    );
    expect(firstPerson.length).toBeGreaterThanOrEqual(5);
  });

  it("contains 'which' research-phrased queries", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const which = discovery.filter((q) => q.text.toLowerCase().startsWith("which"));
    expect(which.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── 6. Competitor contrast — 3 competitors (full coverage) ──

describe("generateSnapshotQueries — 3 competitors", () => {
  it("all 18 contrast queries contain the prospect name", () => {
    const contrast = byCategory(generateSnapshotQueries(BASE_INPUT), "competitor_contrast");
    for (const q of contrast) {
      expect(q.text).toContain("Meridian Technologies");
    }
  });

  it("all 18 contrast queries contain their competitorName", () => {
    const contrast = byCategory(generateSnapshotQueries(BASE_INPUT), "competitor_contrast");
    for (const q of contrast) {
      expect(q.competitorName).toBeDefined();
      expect(q.text).toContain(q.competitorName!);
    }
  });

  it("all 3 competitors appear in contrast queries", () => {
    const contrast = byCategory(generateSnapshotQueries(BASE_INPUT), "competitor_contrast");
    const names = new Set(contrast.map((q) => q.competitorName));
    expect(names.has("Stripe")).toBe(true);
    expect(names.has("Plaid")).toBe(true);
    expect(names.has("Brex")).toBe(true);
  });

  it("only the first 3 competitors are used when more than 3 are provided", () => {
    const input = makeInput({
      competitors: [
        { name: "Stripe", domain: "stripe.com" },
        { name: "Plaid", domain: "plaid.com" },
        { name: "Brex", domain: "brex.com" },
        { name: "Chime", domain: "chime.com" },
      ],
    });
    const contrast = byCategory(generateSnapshotQueries(input), "competitor_contrast");
    const names = new Set(contrast.map((q) => q.competitorName));
    expect(names.has("Chime")).toBe(false);
    expect(names.has("Brex")).toBe(true);
  });
});

// ─── 7. Competitor contrast — 2 competitors ──────────────────

describe("generateSnapshotQueries — 2 competitors", () => {
  const TWO_COMP = makeInput({
    competitors: [
      { name: "Stripe", domain: "stripe.com" },
      { name: "Plaid", domain: "plaid.com" },
    ],
  });

  it("still produces exactly 18 contrast queries", () => {
    expect(byCategory(generateSnapshotQueries(TWO_COMP), "competitor_contrast")).toHaveLength(18);
  });

  it("both competitors appear in contrast queries", () => {
    const contrast = byCategory(generateSnapshotQueries(TWO_COMP), "competitor_contrast");
    const names = new Set(contrast.map((q) => q.competitorName));
    expect(names.has("Stripe")).toBe(true);
    expect(names.has("Plaid")).toBe(true);
  });

  it("total is still 100", () => {
    expect(generateSnapshotQueries(TWO_COMP)).toHaveLength(100);
  });
});

// ─── 8. Competitor contrast — 1 competitor ───────────────────

describe("generateSnapshotQueries — single competitor fallback", () => {
  const ONE_COMP = makeInput({
    competitors: [{ name: "Stripe", domain: "stripe.com" }],
  });

  it("still produces exactly 18 contrast queries", () => {
    expect(byCategory(generateSnapshotQueries(ONE_COMP), "competitor_contrast")).toHaveLength(18);
  });

  it("all contrast queries use the only competitor", () => {
    const contrast = byCategory(generateSnapshotQueries(ONE_COMP), "competitor_contrast");
    for (const q of contrast) {
      expect(q.competitorName).toBe("Stripe");
    }
  });

  it("total is still 100", () => {
    expect(generateSnapshotQueries(ONE_COMP)).toHaveLength(100);
  });
});

// ─── 9. Reputation queries ────────────────────────────────────

describe("generateSnapshotQueries — reputation queries", () => {
  it("all reputation queries contain the prospect name", () => {
    const rep = byCategory(generateSnapshotQueries(BASE_INPUT), "reputation");
    for (const q of rep) {
      expect(q.text).toContain("Meridian Technologies");
    }
  });

  it("reputation queries do not have a competitorName field", () => {
    const rep = byCategory(generateSnapshotQueries(BASE_INPUT), "reputation");
    for (const q of rep) {
      expect(q.competitorName).toBeUndefined();
    }
  });

  it("covers direct evaluation angle", () => {
    const rep = byCategory(generateSnapshotQueries(BASE_INPUT), "reputation");
    const hasEval = rep.some((q) => q.text.includes("good company to work for"));
    expect(hasEval).toBe(true);
  });

  it("covers review-seeking angle", () => {
    const rep = byCategory(generateSnapshotQueries(BASE_INPUT), "reputation");
    const hasReview = rep.some((q) => q.text.includes("reviews"));
    expect(hasReview).toBe(true);
  });

  it("covers pros/cons angle", () => {
    const rep = byCategory(generateSnapshotQueries(BASE_INPUT), "reputation");
    const hasProsCons = rep.some((q) => q.text.includes("pros and cons"));
    expect(hasProsCons).toBe(true);
  });
});

// ─── 10. Citation probe queries ───────────────────────────────

describe("generateSnapshotQueries — citation probe queries", () => {
  it("all citation queries contain the prospect name", () => {
    const cit = byCategory(generateSnapshotQueries(BASE_INPUT), "citation_source");
    for (const q of cit) {
      expect(q.text).toContain("Meridian Technologies");
    }
  });

  it("S7 uses the first competitor name", () => {
    const cit = byCategory(generateSnapshotQueries(BASE_INPUT), "citation_source");
    const s7 = cit.find((q) => q.text.includes("employer reputation sources"));
    expect(s7).toBeDefined();
    expect(s7!.text).toContain("Stripe");
  });

  it("citation queries do not have a competitorName field", () => {
    const cit = byCategory(generateSnapshotQueries(BASE_INPUT), "citation_source");
    for (const q of cit) {
      expect(q.competitorName).toBeUndefined();
    }
  });

  it("engineering role uses 'engineering blog and tech culture' for S2", () => {
    const cit = byCategory(generateSnapshotQueries(BASE_INPUT), "citation_source");
    const s2 = cit.find((q) => q.text.includes("blog"));
    expect(s2?.text).toBe("Meridian Technologies engineering blog and tech culture");
  });

  it("non-engineering role uses 'company culture and careers blog' for S2", () => {
    const cit = byCategory(
      generateSnapshotQueries(makeInput({ roleTitle: "Account Executive" })),
      "citation_source",
    );
    const s2 = cit.find((q) => q.text.includes("blog"));
    expect(s2?.text).toBe("Meridian Technologies company culture and careers blog");
  });

  it("marketing role uses non-engineering S2", () => {
    const cit = byCategory(
      generateSnapshotQueries(makeInput({ roleTitle: "Senior Marketing Manager" })),
      "citation_source",
    );
    const s2 = cit.find((q) => q.text.includes("blog"));
    expect(s2?.text).toContain("company culture and careers blog");
  });
});

// ─── 11. Niche keyword incorporation ─────────────────────────

describe("generateSnapshotQueries — niche keywords", () => {
  const NICHE = makeInput({ nicheKeywords: ["payments"] });

  it("total is still 100", () => {
    expect(generateSnapshotQueries(NICHE)).toHaveLength(100);
  });

  it("at least one discovery query contains the niche keyword", () => {
    const discovery = byCategory(generateSnapshotQueries(NICHE), "discovery");
    const withNiche = discovery.filter((q) => q.text.includes("payments"));
    expect(withNiche.length).toBeGreaterThanOrEqual(1);
  });

  it("'best {niche} companies to work for' is included", () => {
    const discovery = byCategory(generateSnapshotQueries(NICHE), "discovery");
    const found = discovery.find((q) => q.text === "best payments companies to work for");
    expect(found).toBeDefined();
  });

  it("'top {niche} companies for {role}' is included", () => {
    const discovery = byCategory(generateSnapshotQueries(NICHE), "discovery");
    const found = discovery.find((q) => q.text === "top payments companies for Software Engineer");
    expect(found).toBeDefined();
  });

  it("niche keyword does not appear in non-discovery queries", () => {
    const queries = generateSnapshotQueries(NICHE);
    const nonDiscovery = queries.filter((q) => q.category !== "discovery");
    // Niche keyword used in discovery templates only
    for (const q of nonDiscovery) {
      // Citation and reputation queries use the prospect name, not niche
      if (q.category === "reputation" || q.category === "citation_source") {
        expect(q.text).not.toContain("payments");
      }
    }
  });
});

// ─── 12. Geography incorporation ─────────────────────────────

describe("generateSnapshotQueries — geography", () => {
  const GEO = makeInput({ geography: "New York" });

  it("total is still 100", () => {
    expect(generateSnapshotQueries(GEO)).toHaveLength(100);
  });

  it("at least one discovery query contains the geography", () => {
    const discovery = byCategory(generateSnapshotQueries(GEO), "discovery");
    const withGeo = discovery.filter((q) => q.text.includes("New York"));
    expect(withGeo.length).toBeGreaterThanOrEqual(1);
  });

  it("'best {industry} companies to work for in {geography}' is included", () => {
    const discovery = byCategory(generateSnapshotQueries(GEO), "discovery");
    const found = discovery.find(
      (q) => q.text === "best fintech companies to work for in New York",
    );
    expect(found).toBeDefined();
  });

  it("'top {industry} employers in {geography} for {role}' is included", () => {
    const discovery = byCategory(generateSnapshotQueries(GEO), "discovery");
    const found = discovery.find(
      (q) => q.text === "top fintech employers in New York for Software Engineer",
    );
    expect(found).toBeDefined();
  });
});

// ─── 13. Niche + geography together ──────────────────────────

describe("generateSnapshotQueries — niche and geography together", () => {
  const BOTH = makeInput({ nicheKeywords: ["payments"], geography: "San Francisco" });

  it("total is still 100", () => {
    expect(generateSnapshotQueries(BOTH)).toHaveLength(100);
  });

  it("niche queries are present", () => {
    const discovery = byCategory(generateSnapshotQueries(BOTH), "discovery");
    const withNiche = discovery.filter((q) => q.text.includes("payments"));
    expect(withNiche.length).toBeGreaterThanOrEqual(1);
  });

  it("geography queries are present", () => {
    const discovery = byCategory(generateSnapshotQueries(BOTH), "discovery");
    const withGeo = discovery.filter((q) => q.text.includes("San Francisco"));
    expect(withGeo.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── 14. competitorName field correctness ────────────────────

describe("generateSnapshotQueries — competitorName field", () => {
  it("all contrast queries have a non-empty competitorName", () => {
    const contrast = byCategory(generateSnapshotQueries(BASE_INPUT), "competitor_contrast");
    for (const q of contrast) {
      expect(q.competitorName).toBeDefined();
      expect(q.competitorName!.trim()).not.toBe("");
    }
  });

  it("non-contrast queries never have a competitorName", () => {
    const queries = generateSnapshotQueries(BASE_INPUT);
    for (const q of queries.filter((q) => q.category !== "competitor_contrast")) {
      expect(q.competitorName).toBeUndefined();
    }
  });
});

// ─── 15. Variable substitution correctness ───────────────────

describe("generateSnapshotQueries — template variable substitution", () => {
  it("industry appears in many discovery queries", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const withIndustry = discovery.filter((q) => q.text.includes("fintech"));
    expect(withIndustry.length).toBeGreaterThanOrEqual(20);
  });

  it("role title appears in multiple discovery queries", () => {
    const discovery = byCategory(generateSnapshotQueries(BASE_INPUT), "discovery");
    const withRole = discovery.filter((q) =>
      q.text.toLowerCase().includes("software engineer"),
    );
    expect(withRole.length).toBeGreaterThanOrEqual(10);
  });

  it("prospect name appears in all reputation queries", () => {
    const rep = byCategory(generateSnapshotQueries(BASE_INPUT), "reputation");
    for (const q of rep) {
      expect(q.text).toContain("Meridian Technologies");
    }
  });

  it("prospect name appears in all citation probe queries", () => {
    const cit = byCategory(generateSnapshotQueries(BASE_INPUT), "citation_source");
    for (const q of cit) {
      expect(q.text).toContain("Meridian Technologies");
    }
  });
});
