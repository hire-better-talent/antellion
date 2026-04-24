import { describe, it, expect } from "vitest";
import { extractCandidateFindings } from "../diagnostic/findings";
import type { ScanResultInput } from "../diagnostic/findings";

// ── Helpers ─────────────────────────────────────────────────

function makeResult(overrides: Partial<ScanResultInput> = {}): ScanResultInput {
  return {
    id: `result-${Math.random().toString(36).slice(2, 8)}`,
    queryId: "q1",
    queryText: "What is it like to work at Acme Corp?",
    stage: "DISCOVERY",
    modelName: "gpt-4o",
    personaId: "persona-1",
    personaLabel: "New-grad SWE",
    mentioned: false,
    visibilityScore: 10,
    sentimentScore: 0,
    response: "Acme Corp is a well-known technology company.",
    citationDomains: [],
    competitorMentions: [],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe("extractCandidateFindings", () => {
  it("returns empty array when given no results", () => {
    const findings = extractCandidateFindings([], "Acme Corp");
    expect(findings).toEqual([]);
  });

  describe("zero-presence findings", () => {
    it("flags a query where all results show the client as invisible", () => {
      const results: ScanResultInput[] = [
        makeResult({ queryId: "q1", modelName: "gpt-4o", mentioned: false, visibilityScore: 5 }),
        makeResult({ queryId: "q1", modelName: "claude-3-5", mentioned: false, visibilityScore: 10 }),
        makeResult({ queryId: "q1", modelName: "gemini", mentioned: false, visibilityScore: 8 }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      const zeroPresence = findings.filter((f) => f.actionableCategory === "ZERO_PRESENCE");

      expect(zeroPresence.length).toBeGreaterThanOrEqual(1);
      const f = zeroPresence[0]!;
      expect(f.evidenceScanResultIds.length).toBeGreaterThanOrEqual(2);
      expect(f.namedIssue).toContain("Zero presence");
    });

    it("does NOT flag a query where at least one result shows the client", () => {
      const results: ScanResultInput[] = [
        makeResult({ queryId: "q1", modelName: "gpt-4o", mentioned: true, visibilityScore: 80 }),
        makeResult({ queryId: "q1", modelName: "claude-3-5", mentioned: false, visibilityScore: 5 }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      const zeroPresence = findings.filter((f) => f.actionableCategory === "ZERO_PRESENCE");
      expect(zeroPresence).toHaveLength(0);
    });

    it("requires at least 2 results to flag zero-presence", () => {
      const results: ScanResultInput[] = [
        makeResult({ queryId: "q1", modelName: "gpt-4o", mentioned: false, visibilityScore: 5 }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      const zeroPresence = findings.filter((f) => f.actionableCategory === "ZERO_PRESENCE");
      expect(zeroPresence).toHaveLength(0);
    });
  });

  describe("competitor dominance findings", () => {
    it("flags competitor dominance on own-name queries", () => {
      const results: ScanResultInput[] = [
        makeResult({
          queryId: "q2",
          queryText: "Acme Corp engineering culture", // contains client name
          modelName: "gpt-4o",
          mentioned: false,
          competitorMentions: [{ name: "Rival Co", mentioned: true }],
        }),
        makeResult({
          queryId: "q2",
          queryText: "Acme Corp engineering culture",
          modelName: "claude-3-5",
          mentioned: false,
          competitorMentions: [{ name: "Rival Co", mentioned: true }],
        }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      const dominance = findings.filter((f) => f.actionableCategory === "COMPETITOR_DOMINANCE");

      expect(dominance.length).toBeGreaterThanOrEqual(1);
      const f = dominance[0]!;
      expect(f.namedIssue).toContain("Rival Co");
      expect(f.competitorName).toBe("Rival Co");
    });

    it("does NOT flag competitor dominance on non-own-name queries", () => {
      const results: ScanResultInput[] = [
        makeResult({
          queryId: "q3",
          queryText: "best tech company benefits", // no client name
          modelName: "gpt-4o",
          mentioned: false,
          competitorMentions: [{ name: "Rival Co", mentioned: true }],
        }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      const dominance = findings.filter((f) => f.actionableCategory === "COMPETITOR_DOMINANCE");
      expect(dominance).toHaveLength(0);
    });
  });

  describe("sentiment divergence findings", () => {
    it("flags large sentiment gap across models", () => {
      const results: ScanResultInput[] = [
        makeResult({
          queryId: "q4",
          modelName: "gpt-4o",
          sentimentScore: 0.8, // very positive
        }),
        makeResult({
          queryId: "q4",
          modelName: "perplexity",
          sentimentScore: -0.3, // negative
        }),
        makeResult({
          queryId: "q4",
          modelName: "gemini",
          sentimentScore: 0.1,
        }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      const divergence = findings.filter((f) => f.actionableCategory === "SENTIMENT_DIVERGENCE");
      expect(divergence.length).toBeGreaterThanOrEqual(1);
    });

    it("does NOT flag small sentiment gap", () => {
      const results: ScanResultInput[] = [
        makeResult({ queryId: "q4", modelName: "gpt-4o", sentimentScore: 0.3 }),
        makeResult({ queryId: "q4", modelName: "claude-3-5", sentimentScore: 0.1 }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      const divergence = findings.filter((f) => f.actionableCategory === "SENTIMENT_DIVERGENCE");
      expect(divergence).toHaveLength(0);
    });
  });

  describe("citation monoculture findings", () => {
    it("flags when a single domain dominates citations", () => {
      const results: ScanResultInput[] = Array.from({ length: 10 }, (_, i) =>
        makeResult({
          queryId: `q${i}`,
          citationDomains: ["glassdoor.com", "glassdoor.com", "glassdoor.com", "linkedin.com"],
        }),
      );

      const findings = extractCandidateFindings(results, "Acme Corp");
      const monoculture = findings.filter((f) => f.actionableCategory === "CITATION_MONOCULTURE");
      expect(monoculture.length).toBeGreaterThanOrEqual(1);
      expect(monoculture[0]!.namedIssue).toContain("glassdoor.com");
    });
  });

  describe("persona-specific invisibility findings", () => {
    it("flags when company is visible for one persona but not another", () => {
      const results: ScanResultInput[] = [
        makeResult({
          queryId: "q5",
          modelName: "gpt-4o",
          personaId: "persona-senior",
          personaLabel: "Senior IC",
          mentioned: true,
          visibilityScore: 80,
        }),
        makeResult({
          queryId: "q5",
          modelName: "gpt-4o",
          personaId: "persona-junior",
          personaLabel: "Early-career",
          mentioned: false,
          visibilityScore: 5,
        }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      const invisibility = findings.filter((f) => f.actionableCategory === "PERSONA_INVISIBILITY");
      expect(invisibility.length).toBeGreaterThanOrEqual(1);
      expect(invisibility[0]!.namedIssue).toContain("Early-career");
    });
  });

  describe("zero-citation findings", () => {
    it("flags queries with narrative but no citations", () => {
      const longResponse = "A".repeat(150); // > 100 chars threshold
      const results: ScanResultInput[] = [
        makeResult({
          queryId: "q6",
          modelName: "gpt-4o",
          response: longResponse,
          citationDomains: [],
        }),
        makeResult({
          queryId: "q6",
          modelName: "claude-3-5",
          response: longResponse,
          citationDomains: [],
        }),
        makeResult({
          queryId: "q6",
          modelName: "gemini",
          response: longResponse,
          citationDomains: [],
        }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      const zeroCitation = findings.filter((f) => f.actionableCategory === "ZERO_CITATION");
      expect(zeroCitation.length).toBeGreaterThanOrEqual(1);
    });

    it("does NOT flag when some results have citations", () => {
      const longResponse = "A".repeat(150);
      const results: ScanResultInput[] = [
        makeResult({
          queryId: "q6",
          response: longResponse,
          citationDomains: ["somesite.com"],
        }),
        makeResult({
          queryId: "q6",
          modelName: "claude-3-5",
          response: longResponse,
          citationDomains: [],
        }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      const zeroCitation = findings.filter((f) => f.actionableCategory === "ZERO_CITATION");
      expect(zeroCitation).toHaveLength(0);
    });
  });

  describe("output constraints", () => {
    it("returns at most 30 findings", () => {
      // Generate many diverse results that would trigger many rules
      const results: ScanResultInput[] = Array.from({ length: 40 }, (_, i) =>
        makeResult({
          queryId: `q${i}`,
          queryText: `Acme Corp query ${i}`,
          modelName: i % 2 === 0 ? "gpt-4o" : "claude-3-5",
          mentioned: false,
          visibilityScore: 5,
        }),
      );

      const findings = extractCandidateFindings(results, "Acme Corp");
      expect(findings.length).toBeLessThanOrEqual(30);
    });

    it("each finding has at least one evidence scan result ID", () => {
      const results: ScanResultInput[] = [
        makeResult({ queryId: "q1", mentioned: false, visibilityScore: 5 }),
        makeResult({ queryId: "q1", modelName: "claude-3-5", mentioned: false, visibilityScore: 5 }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      for (const f of findings) {
        expect(f.evidenceScanResultIds.length).toBeGreaterThan(0);
      }
    });

    it("each finding has a namedIssue and actionableCategory", () => {
      const results: ScanResultInput[] = [
        makeResult({ queryId: "q1", mentioned: false, visibilityScore: 5 }),
        makeResult({ queryId: "q1", modelName: "claude-3-5", mentioned: false, visibilityScore: 5 }),
      ];

      const findings = extractCandidateFindings(results, "Acme Corp");
      for (const f of findings) {
        expect(f.namedIssue.length).toBeGreaterThan(0);
        expect(f.actionableCategory.length).toBeGreaterThan(0);
      }
    });
  });
});
