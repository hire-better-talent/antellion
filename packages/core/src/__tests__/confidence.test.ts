import { describe, it, expect } from "vitest";
import {
  confidenceTier,
  computeResultConfidence,
  computeFindingConfidence,
  TIER_LOW_CEILING,
  TIER_MEDIUM_CEILING,
  SCORE_FLOOR,
} from "../confidence";
import { applyPenalties } from "../confidence";
import type { ResultConfidenceInput, FindingConfidenceInput } from "../confidence";

// ── confidenceTier ──────────────────────────────────────────

describe("confidenceTier", () => {
  it("returns LOW for score 0", () => {
    expect(confidenceTier(0)).toBe("LOW");
  });

  it("returns LOW for score 39 (just below boundary)", () => {
    expect(confidenceTier(39)).toBe("LOW");
  });

  it("returns MEDIUM for score 40 (boundary)", () => {
    expect(confidenceTier(40)).toBe("MEDIUM");
  });

  it("returns MEDIUM for score 69 (just below HIGH boundary)", () => {
    expect(confidenceTier(69)).toBe("MEDIUM");
  });

  it("returns HIGH for score 70 (boundary)", () => {
    expect(confidenceTier(70)).toBe("HIGH");
  });

  it("returns HIGH for score 100", () => {
    expect(confidenceTier(100)).toBe("HIGH");
  });

  it("boundary values match exported thresholds", () => {
    expect(TIER_LOW_CEILING).toBe(40);
    expect(TIER_MEDIUM_CEILING).toBe(70);
  });
});

// ── computeResultConfidence ─────────────────────────────────

describe("computeResultConfidence", () => {
  const fullInput: ResultConfidenceInput = {
    responseLength: 600,
    hasVisibilityScore: true,
    hasSentimentScore: true,
    citationCount: 3,
    mentioned: true,
  };

  it("returns a high score for a well-formed result", () => {
    const result = computeResultConfidence(fullInput);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.tier).toBe("HIGH");
    expect(result.penalties).toHaveLength(0);
  });

  it("penalizes short responses", () => {
    const shortResult = computeResultConfidence({
      ...fullInput,
      responseLength: 30,
    });
    const longResult = computeResultConfidence({
      ...fullInput,
      responseLength: 600,
    });
    expect(shortResult.score).toBeLessThan(longResult.score);
  });

  it("penalizes missing scores", () => {
    const noScores = computeResultConfidence({
      ...fullInput,
      hasVisibilityScore: false,
      hasSentimentScore: false,
    });
    const withScores = computeResultConfidence(fullInput);
    expect(noScores.score).toBeLessThan(withScores.score);
  });

  it("gives partial credit for one score present", () => {
    const oneScore = computeResultConfidence({
      ...fullInput,
      hasSentimentScore: false,
    });
    const bothScores = computeResultConfidence(fullInput);
    const noScores = computeResultConfidence({
      ...fullInput,
      hasVisibilityScore: false,
      hasSentimentScore: false,
    });
    expect(oneScore.score).toBeLessThan(bothScores.score);
    expect(oneScore.score).toBeGreaterThan(noScores.score);
  });

  it("penalizes missing citations", () => {
    const noCitations = computeResultConfidence({
      ...fullInput,
      citationCount: 0,
    });
    const withCitations = computeResultConfidence(fullInput);
    expect(noCitations.score).toBeLessThan(withCitations.score);
  });

  it("gives lower but still meaningful score for not-mentioned results", () => {
    const notMentioned = computeResultConfidence({
      ...fullInput,
      mentioned: false,
    });
    expect(notMentioned.score).toBeGreaterThanOrEqual(40);
    expect(notMentioned.score).toBeLessThan(
      computeResultConfidence(fullInput).score,
    );
  });

  it("returns score between 0 and 100", () => {
    const result = computeResultConfidence(fullInput);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns correct factors structure", () => {
    const result = computeResultConfidence(fullInput);
    expect(result.factors).toHaveProperty("sampleSize");
    expect(result.factors).toHaveProperty("signalConsistency");
    expect(result.factors).toHaveProperty("citationCoverage");
    expect(result.factors).toHaveProperty("responseQuality");
  });

  it("worst-case result still produces a valid score", () => {
    const worst = computeResultConfidence({
      responseLength: 0,
      hasVisibilityScore: false,
      hasSentimentScore: false,
      citationCount: 0,
      mentioned: false,
    });
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
    expect(worst.tier).toBe("LOW");
  });
});

// ── computeFindingConfidence ────────────────────────────────

describe("computeFindingConfidence", () => {
  function makeResults(
    count: number,
    overrides?: Partial<FindingConfidenceInput["results"][0]>,
  ): FindingConfidenceInput["results"] {
    return Array.from({ length: count }, () => ({
      mentioned: true,
      visibilityScore: 70,
      sentimentScore: 0.5,
      citationCount: 2,
      responseLength: 400,
      ...overrides,
    }));
  }

  it("returns LOW confidence for 3 results (small sample, penalties)", () => {
    const result = computeFindingConfidence({
      results: makeResults(3),
      scanRunCount: 1,
      scanCompleteness: 0.5,
    });
    // 3 results gets: insufficient_sample (-20), single_scan (-10), incomplete_scan (-15)
    expect(result.tier).toBe("LOW");
    expect(result.penalties.length).toBeGreaterThan(0);
  });

  it("returns HIGH confidence for 20 results with 90% mention rate", () => {
    const results = [
      ...makeResults(18, { mentioned: true }),
      ...makeResults(2, { mentioned: false }),
    ];
    const result = computeFindingConfidence({
      results,
      scanRunCount: 2,
      scanCompleteness: 1.0,
    });
    expect(result.tier).toBe("HIGH");
  });

  it("returns MEDIUM for 20 results with 50% mention rate (low consistency)", () => {
    const results = [
      ...makeResults(10, { mentioned: true }),
      ...makeResults(10, { mentioned: false }),
    ];
    const result = computeFindingConfidence({
      results,
      scanRunCount: 2,
      scanCompleteness: 1.0,
    });
    // 50/50 split gives signalConsistency = 0, which drags down the score
    expect(result.tier).toBe("MEDIUM");
    expect(result.score).toBeLessThan(70);
  });

  it("handles 5 results with 100% mention rate (high consistency, moderate sample)", () => {
    const result = computeFindingConfidence({
      results: makeResults(5, { mentioned: true }),
      scanRunCount: 1,
      scanCompleteness: 1.0,
    });
    // 100% mention rate = maximum consistency
    // But single_scan penalty (-10) applies
    expect(result.factors.signalConsistency).toBe(100);
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it("returns higher score with more results", () => {
    const small = computeFindingConfidence({
      results: makeResults(5),
      scanRunCount: 2,
      scanCompleteness: 1.0,
    });
    const large = computeFindingConfidence({
      results: makeResults(25),
      scanRunCount: 2,
      scanCompleteness: 1.0,
    });
    expect(large.score).toBeGreaterThan(small.score);
  });

  it("handles empty results", () => {
    const result = computeFindingConfidence({
      results: [],
      scanRunCount: 1,
      scanCompleteness: 0,
    });
    expect(result.score).toBe(SCORE_FLOOR);
    expect(result.tier).toBe("LOW");
  });

  it("penalizes results with no citations", () => {
    const withCitations = computeFindingConfidence({
      results: makeResults(20, { citationCount: 3 }),
      scanRunCount: 2,
      scanCompleteness: 1.0,
    });
    const noCitations = computeFindingConfidence({
      results: makeResults(20, { citationCount: 0 }),
      scanRunCount: 2,
      scanCompleteness: 1.0,
    });
    expect(noCitations.score).toBeLessThan(withCitations.score);
  });

  it("penalizes short average response lengths", () => {
    const shortResponses = computeFindingConfidence({
      results: makeResults(20, { responseLength: 50 }),
      scanRunCount: 2,
      scanCompleteness: 1.0,
    });
    const longResponses = computeFindingConfidence({
      results: makeResults(20, { responseLength: 500 }),
      scanRunCount: 2,
      scanCompleteness: 1.0,
    });
    expect(shortResponses.score).toBeLessThan(longResponses.score);
  });
});

// ── applyPenalties ──────────────────────────────────────────

describe("applyPenalties", () => {
  it("applies insufficient_sample penalty when < 5 results", () => {
    const { score, penalties } = applyPenalties(80, {
      resultCount: 3,
      scanRunCount: 2,
      scanCompleteness: 1.0,
    });
    expect(penalties).toContainEqual(
      expect.objectContaining({ rule: "insufficient_sample" }),
    );
    expect(score).toBe(60);
  });

  it("applies single_scan penalty when scanRunCount < 2", () => {
    const { score, penalties } = applyPenalties(80, {
      resultCount: 10,
      scanRunCount: 1,
      scanCompleteness: 1.0,
    });
    expect(penalties).toContainEqual(
      expect.objectContaining({ rule: "single_scan" }),
    );
    expect(score).toBe(70);
  });

  it("applies incomplete_scan penalty when completeness < 0.7", () => {
    const { score, penalties } = applyPenalties(80, {
      resultCount: 10,
      scanRunCount: 2,
      scanCompleteness: 0.5,
    });
    expect(penalties).toContainEqual(
      expect.objectContaining({ rule: "incomplete_scan" }),
    );
    expect(score).toBe(65);
  });

  it("applies near_fifty penalty when mention rate is 0.4-0.6 AND < 10 results", () => {
    const { score, penalties } = applyPenalties(80, {
      resultCount: 8,
      scanRunCount: 2,
      scanCompleteness: 1.0,
      mentionRate: 0.5,
    });
    expect(penalties).toContainEqual(
      expect.objectContaining({ rule: "near_fifty" }),
    );
    expect(score).toBe(70);
  });

  it("does NOT apply near_fifty penalty when >= 10 results", () => {
    const { penalties } = applyPenalties(80, {
      resultCount: 10,
      scanRunCount: 2,
      scanCompleteness: 1.0,
      mentionRate: 0.5,
    });
    expect(penalties).not.toContainEqual(
      expect.objectContaining({ rule: "near_fifty" }),
    );
  });

  it("does NOT apply near_fifty penalty when mentionRate is outside 0.4-0.6", () => {
    const { penalties } = applyPenalties(80, {
      resultCount: 5,
      scanRunCount: 2,
      scanCompleteness: 1.0,
      mentionRate: 0.8,
    });
    expect(penalties).not.toContainEqual(
      expect.objectContaining({ rule: "near_fifty" }),
    );
  });

  it("applies all penalties cumulatively", () => {
    const { score, penalties } = applyPenalties(80, {
      resultCount: 3,
      scanRunCount: 1,
      scanCompleteness: 0.5,
      mentionRate: 0.5,
    });
    // insufficient_sample (-20) + single_scan (-10) + incomplete_scan (-15) + near_fifty (-10) = -55
    expect(penalties).toHaveLength(4);
    // 80 - 55 = 25, which is above floor
    expect(score).toBe(25);
  });

  it("enforces floor of 5", () => {
    const { score } = applyPenalties(10, {
      resultCount: 1,
      scanRunCount: 1,
      scanCompleteness: 0.1,
      mentionRate: 0.5,
    });
    // 10 - 20 - 10 - 15 - 10 = -45, floor is 5
    expect(score).toBe(SCORE_FLOOR);
  });

  it("returns no penalties when all conditions are good", () => {
    const { score, penalties } = applyPenalties(80, {
      resultCount: 20,
      scanRunCount: 3,
      scanCompleteness: 1.0,
      mentionRate: 0.9,
    });
    expect(penalties).toHaveLength(0);
    expect(score).toBe(80);
  });

  it("returns no penalties when mentionRate is undefined", () => {
    const { penalties } = applyPenalties(80, {
      resultCount: 20,
      scanRunCount: 3,
      scanCompleteness: 1.0,
    });
    expect(penalties).toHaveLength(0);
  });
});
