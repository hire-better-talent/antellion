import { describe, it, expect } from "vitest";
import { discoverCompetitors } from "../competitor-discovery";
import type { DiscoveredCompetitor } from "../competitor-discovery";

// ─── Helpers ────────────────────────────────────────────────

function makeResults(
  responses: string[],
): Array<{ response: string; mentioned: boolean; metadata: unknown }> {
  return responses.map((r) => ({ response: r, mentioned: false, metadata: null }));
}

function names(found: DiscoveredCompetitor[]): string[] {
  return found.map((c) => c.name);
}

function namesLower(found: DiscoveredCompetitor[]): string[] {
  return found.map((c) => c.name.toLowerCase());
}

// ─── Existing tests — must keep passing ─────────────────────

describe("discoverCompetitors", () => {
  it("extracts companies from a numbered list", () => {
    const results = makeResults([
      "Top employers for engineers:\n1. Stripe\n2. Block\n3. Datadog",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    expect(names(found)).toContain("Stripe");
    expect(names(found)).toContain("Block");
    expect(names(found)).toContain("Datadog");
  });

  it("extracts companies from a bulleted list", () => {
    const results = makeResults([
      "Engineers often consider:\n- Stripe\n- Figma\n- Notion",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    expect(names(found)).toContain("Stripe");
    expect(names(found)).toContain("Figma");
    expect(names(found)).toContain("Notion");
  });

  it("extracts a company from 'work at X' pattern", () => {
    const results = makeResults([
      "Many engineers prefer to work at Stripe for its compensation and culture.",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    expect(names(found)).toContain("Stripe");
  });

  it("excludes the client name from results", () => {
    const results = makeResults([
      "Top companies:\n1. Acme Corp\n2. Stripe\n3. Block",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    expect(names(found)).not.toContain("Acme Corp");
  });

  it("excludes already-known competitors from results", () => {
    const results = makeResults([
      "Compare Stripe vs Block — both offer strong engineering culture and salary.",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", ["Stripe"]);
    expect(names(found)).not.toContain("Stripe");
  });

  it("returns empty when no company-like names are found", () => {
    const results = makeResults([
      "There are many opportunities for engineers in the current market.",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    for (const c of found) {
      expect(c.name.toLowerCase()).not.toMatch(
        /^(?:the company|tech companies|many companies)$/,
      );
    }
  });

  it("aggregates mentionCount across multiple responses", () => {
    const results = makeResults([
      "Work at Stripe is highly competitive. Stripe offers great equity.",
      "Stripe is one of the top fintech employers. Salary at Stripe is strong.",
      "Datadog is also a great place for engineers.",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);

    const stripe = found.find((c) => c.name === "Stripe");
    const datadog = found.find((c) => c.name === "Datadog");

    expect(stripe).toBeDefined();
    expect(datadog).toBeDefined();
    expect(stripe!.mentionCount).toBe(2);
    expect(datadog!.mentionCount).toBe(1);
  });

  it("returns results sorted by mentionCount descending", () => {
    const results = makeResults([
      "Joining Stripe is popular among backend engineers.",
      "Stripe leads in compensation. Block also has strong equity.",
      "Block hiring is competitive. Figma is growing fast.",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);

    for (let i = 1; i < found.length; i++) {
      expect(found[i].mentionCount).toBeLessThanOrEqual(found[i - 1].mentionCount);
    }
  });

  it("filters out common false positives", () => {
    const results = makeResults([
      "Tech Companies are exploring remote work. The Company often hires Senior Engineers " +
        "across many companies. Top Companies include various employers.",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    const lower = namesLower(found);
    expect(lower).not.toContain("tech companies");
    expect(lower).not.toContain("the company");
    expect(lower).not.toContain("many companies");
    expect(lower).not.toContain("top companies");
  });

  it("handles empty results array gracefully", () => {
    const found = discoverCompetitors([], "Acme Corp", []);
    expect(found).toEqual([]);
  });

  it("handles empty response strings", () => {
    const results = makeResults(["", "   "]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    expect(Array.isArray(found)).toBe(true);
  });

  it("extracts company from 'companies like X' pattern", () => {
    const results = makeResults([
      "You might consider companies like Stripe or employers like Datadog for this role.",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    expect(names(found)).toContain("Stripe");
    expect(names(found)).toContain("Datadog");
  });

  it("extracts both sides of a 'vs' comparison", () => {
    const results = makeResults([
      "Stripe vs Block — which fintech employer offers better compensation and remote work?",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    expect(names(found)).toContain("Stripe");
    expect(names(found)).toContain("Block");
  });

  it("returns at most 20 results", () => {
    const companies = [
      "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta",
      "Theta", "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi",
      "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega",
    ];
    const response =
      "Top employers for engineers:\n" +
      companies.map((c, i) => `${i + 1}. ${c} Corp`).join("\n");
    const results = makeResults([response]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    expect(found.length).toBeLessThanOrEqual(20);
  });

  it("includes at least one mentionContext when a match is found", () => {
    const results = makeResults([
      "Work at Stripe is highly regarded by engineers seeking strong compensation.",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    const stripe = found.find((c) => c.name === "Stripe");
    if (stripe) {
      expect(stripe.mentionContexts.length).toBeGreaterThan(0);
      expect(typeof stripe.mentionContexts[0]).toBe("string");
    }
  });

  it("case-insensitive exclusion of known competitors", () => {
    const results = makeResults([
      "Engineers often join STRIPE for its culture and equity benefits.",
    ]);
    const found = discoverCompetitors(results, "Acme Corp", ["stripe"]);
    expect(namesLower(found)).not.toContain("stripe");
  });

  // ─── New tests ───────────────────────────────────────────────

  it("detects hospitality competitors in realistic prose (no numbered list)", () => {
    const response = `
When candidates consider sales roles in the vacation ownership industry, they often
evaluate employers like Marriott Vacations Worldwide, Wyndham Destinations, and
Bluegreen Vacations. Holiday Inn Club Vacations is also frequently cited. These
organizations compete for the same pool of experienced timeshare sales professionals.
Travel + Leisure Co has grown its sales force significantly in recent years and is
considered a peer by most recruiters in the space.
    `;
    const results = makeResults([response]);
    const found = discoverCompetitors(results, "Hilton Grand Vacations", []);
    const lower = namesLower(found);

    expect(lower.some((n) => n.includes("marriott"))).toBe(true);
    expect(lower.some((n) => n.includes("wyndham"))).toBe(true);
    expect(lower.some((n) => n.includes("bluegreen"))).toBe(true);
    expect(lower.some((n) => n.includes("holiday inn"))).toBe(true);
    expect(lower.some((n) => n.includes("travel"))).toBe(true);
  });

  it("detects bold-formatted company names (markdown stripped before extraction)", () => {
    const response = `
Top employers in the hospitality sales space include **Marriott**, **Wyndham**, and
**Bluegreen Vacations**. Candidates frequently compare **Hilton Grand Vacations** to
these competitors before accepting an offer.
    `;
    const results = makeResults([response]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    const lower = namesLower(found);

    expect(lower.some((n) => n.includes("marriott"))).toBe(true);
    expect(lower.some((n) => n.includes("wyndham"))).toBe(true);
    expect(lower.some((n) => n.includes("bluegreen"))).toBe(true);
  });

  it("detects known companies even when not consistently capitalized", () => {
    const response = `
Many candidates look at marriott and wyndham destinations when exploring vacation
sales careers. Some also consider BLUEGREEN VACATIONS or holiday inn club vacations.
    `;
    const results = makeResults([response]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    const lower = namesLower(found);

    expect(lower.some((n) => n.includes("marriott"))).toBe(true);
    expect(lower.some((n) => n.includes("wyndham"))).toBe(true);
    expect(lower.some((n) => n.includes("bluegreen"))).toBe(true);
    expect(lower.some((n) => n.includes("holiday inn"))).toBe(true);
  });

  it("known companies are detected case-insensitively across multiple forms", () => {
    const response =
      "GOOGLE and meta both offer strong benefits. " +
      "stripe is popular among fintech candidates alongside GOLDMAN SACHS.";
    const results = makeResults([response]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    const lower = namesLower(found);

    expect(lower.some((n) => n.includes("google"))).toBe(true);
    expect(lower.some((n) => n.includes("meta"))).toBe(true);
    expect(lower.some((n) => n.includes("stripe"))).toBe(true);
    expect(lower.some((n) => n.includes("goldman sachs"))).toBe(true);
  });

  it("does not surface the client even when mentioned prominently in text", () => {
    const response = `
Hilton Grand Vacations has a strong sales culture. Many candidates compare
Hilton Grand Vacations to Marriott Vacations Worldwide and Wyndham Destinations.
Hilton Grand Vacations recruiters are very active on LinkedIn.
    `;
    const results = makeResults([response]);
    const found = discoverCompetitors(results, "Hilton Grand Vacations", []);
    const lower = namesLower(found);

    expect(lower.some((n) => n.includes("hilton grand vacations"))).toBe(false);
    expect(lower.some((n) => n.includes("marriott"))).toBe(true);
    expect(lower.some((n) => n.includes("wyndham"))).toBe(true);
  });

  it("extracts a list of three competitors after 'such as'", () => {
    const response =
      "Sales professionals often move to organizations such as Marriott, Wyndham, and Bluegreen " +
      "after gaining experience in the timeshare industry.";
    const results = makeResults([response]);
    const found = discoverCompetitors(results, "Acme Corp", []);
    const lower = namesLower(found);

    expect(lower.some((n) => n.includes("marriott"))).toBe(true);
    expect(lower.some((n) => n.includes("wyndham"))).toBe(true);
    expect(lower.some((n) => n.includes("bluegreen"))).toBe(true);
  });

  it("handles a response with only unknown companies in prose", () => {
    // Company that's not in the known list but appears in a clear pattern
    const response =
      "Sales professionals often consider joining Sunterra Resorts or Vida Vacations " +
      "when looking for resort sales roles.";
    const results = makeResults([response]);
    // Should not throw; may or may not find results depending on pattern matching
    const found = discoverCompetitors(results, "Acme Corp", []);
    expect(Array.isArray(found)).toBe(true);
  });
});
