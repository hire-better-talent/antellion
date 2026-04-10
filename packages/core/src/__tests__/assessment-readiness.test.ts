import { describe, it, expect } from "vitest";
import {
  assessReadiness,
  MIN_DISCOVERY_QUERIES,
  MIN_EVALUATION_QUERIES,
  MIN_TOTAL_RESULTS,
  MIN_READINESS_CITATION_RATE,
} from "../assessment-readiness";
import type { ReadinessInput, ReadinessWarning } from "../assessment-readiness";

// ── Helper ──────────────────────────────────────────────────────────

/** Returns a fully healthy input — no warnings expected. */
function healthyInput(): ReadinessInput {
  return {
    discoveryQueryCount: 20,
    evaluationQueryCount: 15,
    totalApprovedResults: 120,
    competitorCount: 3,
    citationRate: 0.55,
    scanCount: 2,
    hasNicheKeywords: true,
    stageDistribution: {
      DISCOVERY: 30,
      CONSIDERATION: 25,
      EVALUATION: 35,
      COMMITMENT: 30,
    },
  };
}

/** Convenience: find warnings by severity. */
function bySeverity(
  warnings: ReadinessWarning[],
  severity: ReadinessWarning["severity"],
): ReadinessWarning[] {
  return warnings.filter((w) => w.severity === severity);
}

/** Convenience: find a warning by title substring. */
function byTitle(
  warnings: ReadinessWarning[],
  substring: string,
): ReadinessWarning | undefined {
  return warnings.find((w) =>
    w.title.toLowerCase().includes(substring.toLowerCase()),
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe("assessReadiness", () => {
  describe("healthy assessment — no warnings", () => {
    it("returns empty array when all data is sufficient", () => {
      const warnings = assessReadiness(healthyInput());
      expect(warnings).toEqual([]);
    });

    it("returns empty array at exact threshold boundaries", () => {
      const input: ReadinessInput = {
        discoveryQueryCount: MIN_DISCOVERY_QUERIES, // exactly 10
        evaluationQueryCount: MIN_EVALUATION_QUERIES, // exactly 8
        totalApprovedResults: MIN_TOTAL_RESULTS, // exactly 50
        competitorCount: 1,
        citationRate: MIN_READINESS_CITATION_RATE, // exactly 0.1
        scanCount: 2,
        hasNicheKeywords: true,
        stageDistribution: {
          DISCOVERY: 15,
          CONSIDERATION: 10,
          EVALUATION: 15,
          COMMITMENT: 10,
        },
      };
      expect(assessReadiness(input)).toEqual([]);
    });
  });

  describe("Discovery coverage", () => {
    it("emits critical warning when discovery queries are 0", () => {
      const input = { ...healthyInput(), discoveryQueryCount: 0 };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "Discovery data is thin");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("critical");
      expect(w!.suggestedAction.actionType).toBe("generate_queries");
    });

    it("emits critical warning when discovery queries below threshold", () => {
      const input = { ...healthyInput(), discoveryQueryCount: 5 };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "Discovery data is thin");
      expect(w).toBeDefined();
      expect(w!.description).toContain("5");
    });

    it("does not warn at exactly the threshold", () => {
      const input = {
        ...healthyInput(),
        discoveryQueryCount: MIN_DISCOVERY_QUERIES,
      };
      const warnings = assessReadiness(input);
      expect(byTitle(warnings, "Discovery data is thin")).toBeUndefined();
    });
  });

  describe("Evaluation coverage", () => {
    it("emits critical warning when evaluation queries are 0", () => {
      const input = { ...healthyInput(), evaluationQueryCount: 0 };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "Evaluation data is limited");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("critical");
    });

    it("emits critical warning when below threshold", () => {
      const input = { ...healthyInput(), evaluationQueryCount: 3 };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "Evaluation data is limited");
      expect(w).toBeDefined();
      expect(w!.description).toContain("3");
    });

    it("does not warn at exactly the threshold", () => {
      const input = {
        ...healthyInput(),
        evaluationQueryCount: MIN_EVALUATION_QUERIES,
      };
      expect(
        byTitle(assessReadiness(input), "Evaluation data is limited"),
      ).toBeUndefined();
    });
  });

  describe("Total approved results", () => {
    it("emits warning when results below threshold", () => {
      const input = { ...healthyInput(), totalApprovedResults: 30 };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "Approved result count is low");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("warning");
      expect(w!.description).toContain("30");
      expect(w!.suggestedAction.actionType).toBe("run_scan");
    });

    it("does not warn at exactly the threshold", () => {
      const input = {
        ...healthyInput(),
        totalApprovedResults: MIN_TOTAL_RESULTS,
      };
      expect(
        byTitle(assessReadiness(input), "Approved result count"),
      ).toBeUndefined();
    });
  });

  describe("No competitors", () => {
    it("emits critical warning when competitor count is 0", () => {
      const input = { ...healthyInput(), competitorCount: 0 };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "No competitors configured");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("critical");
      expect(w!.suggestedAction.actionType).toBe("add_competitors");
    });

    it("does not warn when at least 1 competitor exists", () => {
      const input = { ...healthyInput(), competitorCount: 1 };
      expect(
        byTitle(assessReadiness(input), "No competitors"),
      ).toBeUndefined();
    });
  });

  describe("Citation rate", () => {
    it("emits warning when citation rate is 0", () => {
      const input = { ...healthyInput(), citationRate: 0 };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "Very few citations");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("warning");
      expect(w!.description).toContain("0%");
      expect(w!.suggestedAction.actionType).toBe("verify_citations");
    });

    it("emits warning when citation rate is 2%", () => {
      const input = { ...healthyInput(), citationRate: 0.02 };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "Very few citations");
      expect(w).toBeDefined();
      expect(w!.description).toContain("2%");
    });

    it("does not warn at exactly the threshold", () => {
      const input = {
        ...healthyInput(),
        citationRate: MIN_READINESS_CITATION_RATE,
      };
      expect(
        byTitle(assessReadiness(input), "Very few citations"),
      ).toBeUndefined();
    });
  });

  describe("Single scan", () => {
    it("emits info warning when scan count is 1", () => {
      const input = { ...healthyInput(), scanCount: 1 };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "Single scan");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("info");
      expect(w!.suggestedAction.actionType).toBe("run_scan");
    });

    it("does not warn when scan count is 2+", () => {
      const input = { ...healthyInput(), scanCount: 2 };
      expect(
        byTitle(assessReadiness(input), "Single scan"),
      ).toBeUndefined();
    });

    it("does not warn when scan count is 0", () => {
      // 0 scans is a different problem (no data at all); single-scan info is specifically for 1
      const input = { ...healthyInput(), scanCount: 0 };
      expect(
        byTitle(assessReadiness(input), "Single scan"),
      ).toBeUndefined();
    });
  });

  describe("No niche keywords", () => {
    it("emits info warning when niche keywords are missing", () => {
      const input = { ...healthyInput(), hasNicheKeywords: false };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "No niche keywords");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("info");
      expect(w!.suggestedAction.actionType).toBe("add_role_variant");
    });

    it("does not warn when niche keywords are present", () => {
      const input = { ...healthyInput(), hasNicheKeywords: true };
      expect(
        byTitle(assessReadiness(input), "No niche keywords"),
      ).toBeUndefined();
    });
  });

  describe("Missing stage coverage", () => {
    it("emits warning for each stage with 0 results", () => {
      const input: ReadinessInput = {
        ...healthyInput(),
        stageDistribution: {
          DISCOVERY: 10,
          CONSIDERATION: 0,
          EVALUATION: 0,
          COMMITMENT: 5,
        },
      };
      const warnings = assessReadiness(input);
      expect(byTitle(warnings, "Consideration stage")).toBeDefined();
      expect(byTitle(warnings, "Evaluation stage")).toBeDefined();
      expect(byTitle(warnings, "Discovery stage")).toBeUndefined();
      expect(byTitle(warnings, "Commitment stage")).toBeUndefined();
    });

    it("emits warning when a stage is entirely absent from distribution", () => {
      const input: ReadinessInput = {
        ...healthyInput(),
        stageDistribution: {
          DISCOVERY: 10,
          // CONSIDERATION, EVALUATION, COMMITMENT all missing
        },
      };
      const warnings = assessReadiness(input);
      const stageWarnings = warnings.filter((w) =>
        w.title.includes("stage"),
      );
      expect(stageWarnings).toHaveLength(3);
    });

    it("does not warn when all stages have results", () => {
      const warnings = assessReadiness(healthyInput());
      const stageWarnings = warnings.filter((w) =>
        w.title.includes("stage"),
      );
      expect(stageWarnings).toHaveLength(0);
    });

    it("stage warnings are severity 'warning'", () => {
      const input: ReadinessInput = {
        ...healthyInput(),
        stageDistribution: {
          DISCOVERY: 10,
          CONSIDERATION: 0,
          EVALUATION: 15,
          COMMITMENT: 10,
        },
      };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "Consideration stage");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("warning");
    });
  });

  describe("Multiple warnings combine correctly", () => {
    it("returns multiple warnings for a thin assessment", () => {
      const input: ReadinessInput = {
        discoveryQueryCount: 2,
        evaluationQueryCount: 1,
        totalApprovedResults: 10,
        competitorCount: 0,
        citationRate: 0.0,
        scanCount: 1,
        hasNicheKeywords: false,
        stageDistribution: {
          DISCOVERY: 5,
          CONSIDERATION: 0,
          EVALUATION: 5,
          COMMITMENT: 0,
        },
      };
      const warnings = assessReadiness(input);

      // Should have: discovery critical, evaluation critical, no competitors critical,
      // low results warning, low citations warning, consideration stage warning,
      // commitment stage warning, single scan info, no niche keywords info
      expect(warnings.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe("Sorting by severity", () => {
    it("critical warnings appear before warning warnings", () => {
      const input: ReadinessInput = {
        ...healthyInput(),
        discoveryQueryCount: 3, // critical
        totalApprovedResults: 20, // warning
        scanCount: 1, // info
      };
      const warnings = assessReadiness(input);
      expect(warnings.length).toBeGreaterThanOrEqual(3);

      const criticalIdx = warnings.findIndex((w) => w.severity === "critical");
      const warningIdx = warnings.findIndex((w) => w.severity === "warning");
      const infoIdx = warnings.findIndex((w) => w.severity === "info");

      // Critical should appear first
      if (criticalIdx >= 0 && warningIdx >= 0) {
        expect(criticalIdx).toBeLessThan(warningIdx);
      }
      // Warning should appear before info
      if (warningIdx >= 0 && infoIdx >= 0) {
        expect(warningIdx).toBeLessThan(infoIdx);
      }
    });

    it("all critical warnings are grouped together", () => {
      const input: ReadinessInput = {
        discoveryQueryCount: 2,
        evaluationQueryCount: 1,
        totalApprovedResults: 10,
        competitorCount: 0,
        citationRate: 0.0,
        scanCount: 1,
        hasNicheKeywords: false,
        stageDistribution: {
          DISCOVERY: 5,
          CONSIDERATION: 0,
          EVALUATION: 5,
          COMMITMENT: 0,
        },
      };
      const warnings = assessReadiness(input);
      const criticals = bySeverity(warnings, "critical");
      expect(criticals.length).toBeGreaterThanOrEqual(3);

      // All critical warnings should be at the front
      for (let i = 0; i < criticals.length; i++) {
        expect(warnings[i].severity).toBe("critical");
      }
    });
  });

  describe("clientId in suggested action hrefs", () => {
    it("includes clientId in href when provided", () => {
      const input = { ...healthyInput(), discoveryQueryCount: 2 };
      const warnings = assessReadiness(input, "client-123");
      const w = byTitle(warnings, "Discovery data is thin");
      expect(w!.suggestedAction.href).toContain("client-123");
    });

    it("omits href when clientId is not provided", () => {
      const input = { ...healthyInput(), discoveryQueryCount: 2 };
      const warnings = assessReadiness(input);
      const w = byTitle(warnings, "Discovery data is thin");
      expect(w!.suggestedAction.href).toBeUndefined();
    });

    it("verify_citations action never has href regardless of clientId", () => {
      const input = { ...healthyInput(), citationRate: 0.01 };
      const warnings = assessReadiness(input, "client-123");
      const w = byTitle(warnings, "Very few citations");
      expect(w!.suggestedAction.href).toBeUndefined();
    });
  });
});
