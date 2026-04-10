import { describe, it, expect } from "vitest";
import {
  computeCrossSegmentSummary,
  type SegmentSummaryInput,
} from "../decision-journey/cross-segment-summary";

// ─── Helpers ─────────────────────────────────────────────────

function makeSegment(
  name: string,
  earnedVisibilityRate: number,
  earnedVisibilityTier: string,
  gapDomains: string[] = [],
  overallPositioning = "CONTENDER",
): SegmentSummaryInput {
  return { name, earnedVisibilityRate, earnedVisibilityTier, gapDomains, overallPositioning };
}

const CLIENT = "Home Depot";

// ─── Tests ───────────────────────────────────────────────────

describe("computeCrossSegmentSummary", () => {
  describe("strongestSegment / weakestSegment", () => {
    it("identifies correct strongest and weakest by earnedVisibilityRate", () => {
      const segments = [
        makeSegment("Software Engineer", 0.6, "strong"),
        makeSegment("Retail Store Manager", 0.15, "weak"),
        makeSegment("Supply Chain", 0.35, "moderate"),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.strongestSegment.name).toBe("Software Engineer");
      expect(result.strongestSegment.earnedVisibilityRate).toBe(0.6);
      expect(result.strongestSegment.earnedVisibilityTier).toBe("strong");

      expect(result.weakestSegment.name).toBe("Retail Store Manager");
      expect(result.weakestSegment.earnedVisibilityRate).toBe(0.15);
    });

    it("handles two segments", () => {
      const segments = [
        makeSegment("Tech", 0.55, "strong"),
        makeSegment("Retail", 0.1, "invisible"),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.segmentCount).toBe(2);
      expect(result.strongestSegment.name).toBe("Tech");
      expect(result.weakestSegment.name).toBe("Retail");
    });

    it("returns same segment as both strongest and weakest when all rates are identical", () => {
      // When all rates are equal, the first one wins (no tie-breaking needed)
      const segments = [
        makeSegment("A", 0.3, "moderate"),
        makeSegment("B", 0.3, "moderate"),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.strongestSegment.earnedVisibilityRate).toBe(0.3);
      expect(result.weakestSegment.earnedVisibilityRate).toBe(0.3);
    });
  });

  describe("commonGaps", () => {
    it("returns domains present in all segment gap lists", () => {
      const segments = [
        makeSegment("Seg A", 0.4, "moderate", ["glassdoor.com", "linkedin.com", "levels.fyi"]),
        makeSegment("Seg B", 0.3, "moderate", ["glassdoor.com", "indeed.com", "levels.fyi"]),
        makeSegment("Seg C", 0.2, "weak", ["glassdoor.com", "levels.fyi", "builtin.com"]),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.commonGaps).toEqual(["glassdoor.com", "levels.fyi"]);
    });

    it("returns empty when no domain is common to all segments", () => {
      const segments = [
        makeSegment("A", 0.4, "moderate", ["glassdoor.com"]),
        makeSegment("B", 0.3, "moderate", ["indeed.com"]),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.commonGaps).toEqual([]);
    });

    it("returns all gaps when only one segment exists", () => {
      const segments = [
        makeSegment("A", 0.4, "moderate", ["glassdoor.com", "linkedin.com"]),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      // With one segment, "common" means present in that one segment
      expect(result.commonGaps).toEqual(["glassdoor.com", "linkedin.com"]);
    });

    it("returns empty when no gap domains exist in any segment", () => {
      const segments = [
        makeSegment("A", 0.6, "strong", []),
        makeSegment("B", 0.5, "strong", []),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.commonGaps).toEqual([]);
    });
  });

  describe("segmentSpecificGaps", () => {
    it("excludes common gaps from segment-specific gaps", () => {
      const segments = [
        makeSegment("A", 0.4, "moderate", ["glassdoor.com", "linkedin.com"]),
        makeSegment("B", 0.3, "moderate", ["glassdoor.com", "levels.fyi"]),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.commonGaps).toEqual(["glassdoor.com"]);
      expect(result.segmentSpecificGaps).toEqual([
        { segment: "A", gaps: ["linkedin.com"] },
        { segment: "B", gaps: ["levels.fyi"] },
      ]);
    });

    it("produces empty segment-specific gaps when all gaps are common", () => {
      const segments = [
        makeSegment("A", 0.4, "moderate", ["glassdoor.com"]),
        makeSegment("B", 0.3, "moderate", ["glassdoor.com"]),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.commonGaps).toEqual(["glassdoor.com"]);
      expect(result.segmentSpecificGaps).toEqual([
        { segment: "A", gaps: [] },
        { segment: "B", gaps: [] },
      ]);
    });
  });

  describe("summaryNarrative", () => {
    it("generates narrative with invisible weakest tier", () => {
      const segments = [
        makeSegment("Software Engineer", 0.65, "strong"),
        makeSegment("Retail", 0.05, "invisible"),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.summaryNarrative).toContain("Home Depot");
      expect(result.summaryNarrative).toContain("Software Engineer");
      expect(result.summaryNarrative).toContain("Retail");
      expect(result.summaryNarrative).toContain("nearly invisible");
    });

    it("generates narrative for moderate gap (non-invisible weakest)", () => {
      const segments = [
        makeSegment("Tech", 0.6, "strong"),
        makeSegment("Operations", 0.25, "weak"),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.summaryNarrative).toContain("Home Depot");
      expect(result.summaryNarrative).toContain("Tech");
      expect(result.summaryNarrative).toContain("Operations");
      // Should contain the point gap since delta is > 0.1 and not invisible
      expect(result.summaryNarrative).toMatch(/\d+-point gap/);
    });

    it("generates consistent narrative when all segments are similar (<10pt delta)", () => {
      const segments = [
        makeSegment("A", 0.42, "moderate"),
        makeSegment("B", 0.38, "moderate"),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.summaryNarrative).toContain("consistent");
    });

    it("includes client name in all narrative variants", () => {
      const variants = [
        [makeSegment("X", 0.7, "strong"), makeSegment("Y", 0.01, "invisible")],
        [makeSegment("X", 0.5, "strong"), makeSegment("Y", 0.2, "weak")],
        [makeSegment("X", 0.4, "moderate"), makeSegment("Y", 0.35, "moderate")],
      ];

      for (const segs of variants) {
        const result = computeCrossSegmentSummary(CLIENT, segs);
        expect(result.summaryNarrative).toContain(CLIENT);
      }
    });
  });

  describe("segmentCount", () => {
    it("reports correct segment count", () => {
      const segments = [
        makeSegment("A", 0.5, "strong"),
        makeSegment("B", 0.3, "moderate"),
        makeSegment("C", 0.1, "invisible"),
      ];

      const result = computeCrossSegmentSummary(CLIENT, segments);

      expect(result.segmentCount).toBe(3);
    });
  });

  describe("error handling", () => {
    it("throws when called with empty segments array", () => {
      expect(() => computeCrossSegmentSummary(CLIENT, [])).toThrow();
    });
  });
});
