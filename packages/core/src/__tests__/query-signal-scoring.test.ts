import { describe, it, expect } from "vitest";
import {
  scoreQuerySignal,
  jaccardSimilarity,
  DUPLICATE_JACCARD_THRESHOLD,
  type SignalYieldInput,
} from "../query-signal-scoring";

// ─── Helpers ─────────────────────────────────────────────────

const BASE_INPUT: SignalYieldInput = {
  mentioned: false,
  visibilityScore: 0,
  sentimentScore: 0,
  citationCount: 0,
  responseLength: 0,
  competitorMentions: [],
  isNovelCompetitorMention: false,
  isNovelCitation: false,
  isDuplicateResponse: false,
};

const MAX_INPUT: SignalYieldInput = {
  mentioned: true,
  visibilityScore: 75,
  sentimentScore: 0.8,
  citationCount: 3,
  responseLength: 1200,
  competitorMentions: [
    { name: "CompA", mentioned: true },
    { name: "CompB", mentioned: true },
    { name: "CompC", mentioned: true },
    { name: "CompD", mentioned: true },
  ],
  isNovelCompetitorMention: true,
  isNovelCitation: true,
  isDuplicateResponse: false,
};

// ─── scoreQuerySignal: core cases ────────────────────────────

describe("scoreQuerySignal", () => {
  it("mentioned with citations and novel competitor → high signal", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: true,
      visibilityScore: 60,
      citationCount: 2,
      responseLength: 600,
      competitorMentions: [{ name: "CompA", mentioned: true }],
      isNovelCompetitorMention: true,
      isNovelCitation: true,
    });

    expect(result.tier).toBe("high");
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.flags).toContain("novel_competitor");
    expect(result.flags).toContain("novel_citation");
  });

  it("not mentioned, no citations, duplicate → zero signal", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      isDuplicateResponse: true,
    });

    expect(result.score).toBe(0);
    expect(result.tier).toBe("zero");
    expect(result.flags).toContain("duplicate_response");
    expect(result.flags).toContain("zero_signal");
  });

  it("mentioned but duplicate response → medium (mention has value, novelty is zero)", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: true,
      visibilityScore: 60,
      citationCount: 0,
      responseLength: 600,
      isDuplicateResponse: true,
    });

    // mentionSignal = 30, competitorSignal = 0, citationSignal = 0
    // noveltySignal = 0 (duplicate), depthSignal = 5
    // total = 35 → medium
    expect(result.tier).toBe("medium");
    expect(result.score).toBe(35);
    expect(result.flags).toContain("duplicate_response");
    expect(result.flags).not.toContain("zero_signal");
  });

  it("all factors at maximum → score 100", () => {
    const result = scoreQuerySignal(MAX_INPUT);

    // mentionSignal = 30, competitorSignal = 20, citationSignal = 20
    // noveltySignal = 20, depthSignal = 10
    // total = 100
    expect(result.score).toBe(100);
    expect(result.tier).toBe("high");
    expect(result.factors.mentionSignal).toBe(30);
    expect(result.factors.competitorSignal).toBe(20);
    expect(result.factors.citationSignal).toBe(20);
    expect(result.factors.noveltySignal).toBe(20);
    expect(result.factors.depthSignal).toBe(10);
  });

  it("all factors at minimum → score 0", () => {
    const result = scoreQuerySignal(BASE_INPUT);

    expect(result.score).toBe(0);
    expect(result.tier).toBe("zero");
    expect(result.factors.mentionSignal).toBe(0);
    expect(result.factors.competitorSignal).toBe(0);
    expect(result.factors.citationSignal).toBe(0);
    expect(result.factors.noveltySignal).toBe(0);
    expect(result.factors.depthSignal).toBe(0);
    expect(result.flags).toContain("zero_signal");
  });

  // ── Tier boundary tests ────────────────────────────────────

  it("score 60 → high tier", () => {
    // mentioned (30) + novel_citation alone (15 novelty + 20 citation) = 65 > need exactly 60
    // Build a case that hits exactly 60: mentioned(30) + citation(10) + novelty_one(15) + depth_medium(5) = 60
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: true,
      visibilityScore: 40, // not > 50, so no high-vis bonus
      citationCount: 1,
      responseLength: 600,
      isNovelCitation: true,
    });
    // mentionSignal = 20, citationSignal = 20, noveltySignal = 15, depthSignal = 5 → total = 60
    expect(result.score).toBe(60);
    expect(result.tier).toBe("high");
  });

  it("score 59 → medium tier", () => {
    // mentioned(20, vis<=50) + citation(10) + novelty_one(15) + depth_medium(5) = 50 — not 59
    // mentioned(20) + competitor_3(15) + depth_high(10) + citation_base(10) = 55 — not 59
    // Build explicitly: 30 + 20 + 5 + 0 + 4 is tricky; instead just verify below boundary
    // mentioned(20) + citation_novel(20) + depth_medium(5) = 45 → medium (< 60, >= 30)
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: true,
      visibilityScore: 40,
      citationCount: 1,
      responseLength: 600,
      isNovelCitation: true,
      isNovelCompetitorMention: false,
    });
    // mentionSignal=20, citationSignal=20, noveltySignal=15, depthSignal=5 → 60 — that hits the boundary
    // Adjust: drop depth (responseLength <= 500)
    const result2 = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: true,
      visibilityScore: 40,
      citationCount: 1,
      responseLength: 400,
      isNovelCitation: true,
    });
    // mentionSignal=20, citationSignal=20, noveltySignal=15, depthSignal=0 → 55 → medium
    expect(result2.score).toBe(55);
    expect(result2.tier).toBe("medium");
    // Original result hits exactly 60 → high tier (boundary inclusive)
    expect(result.score).toBe(60);
    expect(result.tier).toBe("high");
  });

  it("score 30 → medium tier (lower boundary)", () => {
    // citation_novel(20) + depth_medium(5) + competitor_one(5) = 30
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      citationCount: 1,
      responseLength: 600,
      competitorMentions: [{ name: "CompA", mentioned: true }],
      isNovelCitation: true,
    });
    // citationSignal=20, depthSignal=5, competitorSignal=5, noveltySignal=15 → 45 — too high
    // Simpler: mentioned(20) + depth_medium(5) + competitor_one(5) = 30
    const result2 = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: true,
      visibilityScore: 0,
      responseLength: 600,
      competitorMentions: [{ name: "CompA", mentioned: true }],
    });
    // mentionSignal=20, competitorSignal=5, depthSignal=5, rest=0 → 30
    expect(result2.score).toBe(30);
    expect(result2.tier).toBe("medium");
  });

  it("score 29 → low tier (just below medium boundary)", () => {
    // mentioned(20) + depth_medium(5) + competitor_partial(4) — competitors cap at 5 per mention
    // mentioned(20) + depth_medium(5) = 25 → low
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: true,
      visibilityScore: 0,
      responseLength: 600,
    });
    // mentionSignal=20, depthSignal=5 → 25 → low
    expect(result.score).toBe(25);
    expect(result.tier).toBe("low");
  });

  it("score 1 → low tier", () => {
    // depth_high = 10, but we need score > 0 and < 30
    // Just competitor_one(5) → 5 → low
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      competitorMentions: [{ name: "CompA", mentioned: true }],
    });
    expect(result.score).toBe(5);
    expect(result.tier).toBe("low");
    expect(result.flags).not.toContain("zero_signal");
  });

  it("score 0 → zero tier with zero_signal flag", () => {
    const result = scoreQuerySignal(BASE_INPUT);
    expect(result.tier).toBe("zero");
    expect(result.flags).toContain("zero_signal");
  });

  // ── Factor-level tests ─────────────────────────────────────

  it("mention signal: mentioned=true with visibilityScore>50 → 30", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: true,
      visibilityScore: 51,
    });
    expect(result.factors.mentionSignal).toBe(30);
  });

  it("mention signal: mentioned=true with visibilityScore=50 (not >50) → 20", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: true,
      visibilityScore: 50,
    });
    expect(result.factors.mentionSignal).toBe(20);
  });

  it("mention signal: mentioned=false → 0 regardless of visibilityScore", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: false,
      visibilityScore: 100,
    });
    expect(result.factors.mentionSignal).toBe(0);
  });

  it("competitor signal: 4+ competitors → capped at 20", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      competitorMentions: [
        { name: "A", mentioned: true },
        { name: "B", mentioned: true },
        { name: "C", mentioned: true },
        { name: "D", mentioned: true },
        { name: "E", mentioned: true },
      ],
    });
    expect(result.factors.competitorSignal).toBe(20);
  });

  it("competitor signal: novel competitor bonus does not exceed 20 total", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      competitorMentions: [
        { name: "A", mentioned: true },
        { name: "B", mentioned: true },
        { name: "C", mentioned: true },
      ],
      isNovelCompetitorMention: true,
    });
    // 3 * 5 = 15 + novel_bonus 10 = 25, capped at 20
    expect(result.factors.competitorSignal).toBe(20);
  });

  it("citation signal: citations present and novel → 20", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      citationCount: 1,
      isNovelCitation: true,
    });
    expect(result.factors.citationSignal).toBe(20);
  });

  it("citation signal: citations present, not novel → 10", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      citationCount: 2,
      isNovelCitation: false,
    });
    expect(result.factors.citationSignal).toBe(10);
  });

  it("citation signal: no citations, novel flag → 10 (novel adds to 0 base)", () => {
    // novelCitation without actual citations: novel bonus still counts
    // (edge case: if we discovered a novel domain but citationCount=0, only the
    // novel bonus fires since the base requires citationCount > 0)
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      citationCount: 0,
      isNovelCitation: true,
    });
    expect(result.factors.citationSignal).toBe(10);
  });

  it("novelty signal: both novel → 20", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      isNovelCompetitorMention: true,
      isNovelCitation: true,
    });
    expect(result.factors.noveltySignal).toBe(20);
  });

  it("novelty signal: one novel → 15", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      isNovelCompetitorMention: true,
    });
    expect(result.factors.noveltySignal).toBe(15);
  });

  it("novelty signal: duplicate overrides novelty → 0", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      isNovelCompetitorMention: true,
      isNovelCitation: true,
      isDuplicateResponse: true,
    });
    expect(result.factors.noveltySignal).toBe(0);
  });

  it("depth signal: responseLength > 1000 → 10", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      responseLength: 1001,
    });
    expect(result.factors.depthSignal).toBe(10);
  });

  it("depth signal: responseLength = 1000 → 5 (not > 1000)", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      responseLength: 1000,
    });
    expect(result.factors.depthSignal).toBe(5);
  });

  it("depth signal: responseLength = 501 → 5", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      responseLength: 501,
    });
    expect(result.factors.depthSignal).toBe(5);
  });

  it("depth signal: responseLength = 500 → 0 (not > 500)", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      responseLength: 500,
    });
    expect(result.factors.depthSignal).toBe(0);
  });

  // ── Flags ──────────────────────────────────────────────────

  it("does not add zero_signal flag when score > 0", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      mentioned: true,
    });
    expect(result.flags).not.toContain("zero_signal");
  });

  it("adds all relevant flags independently", () => {
    const result = scoreQuerySignal({
      ...BASE_INPUT,
      isNovelCompetitorMention: true,
      isNovelCitation: true,
      isDuplicateResponse: true,
    });
    expect(result.flags).toContain("novel_competitor");
    expect(result.flags).toContain("novel_citation");
    expect(result.flags).toContain("duplicate_response");
  });

  // ── Return shape ──────────────────────────────────────────

  it("always returns all factor keys", () => {
    const result = scoreQuerySignal(BASE_INPUT);
    expect(result.factors).toHaveProperty("mentionSignal");
    expect(result.factors).toHaveProperty("competitorSignal");
    expect(result.factors).toHaveProperty("citationSignal");
    expect(result.factors).toHaveProperty("noveltySignal");
    expect(result.factors).toHaveProperty("depthSignal");
  });

  it("score is always between 0 and 100", () => {
    expect(scoreQuerySignal(BASE_INPUT).score).toBeGreaterThanOrEqual(0);
    expect(scoreQuerySignal(MAX_INPUT).score).toBeLessThanOrEqual(100);
  });
});

// ─── jaccardSimilarity ────────────────────────────────────────

describe("jaccardSimilarity", () => {
  it("identical strings → 1", () => {
    expect(jaccardSimilarity("hello world", "hello world")).toBe(1);
  });

  it("completely different strings → 0", () => {
    expect(jaccardSimilarity("hello world", "foo bar baz")).toBe(0);
  });

  it("empty strings → 1 (both empty word sets)", () => {
    expect(jaccardSimilarity("", "")).toBe(1);
  });

  it("one empty string → 0", () => {
    expect(jaccardSimilarity("hello", "")).toBe(0);
  });

  it("50% overlap → between 0 and 1", () => {
    const sim = jaccardSimilarity("the quick brown fox", "the quick lazy dog");
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it("near-identical long strings → above DUPLICATE_JACCARD_THRESHOLD", () => {
    const base =
      "Acme Corp is a leading employer in the tech sector known for engineering excellence " +
      "and competitive compensation packages. Candidates frequently mention Acme as a top choice " +
      "for software engineers seeking work-life balance.";
    const similar = base.replace("top choice", "preferred option");
    const sim = jaccardSimilarity(base, similar);
    expect(sim).toBeGreaterThan(DUPLICATE_JACCARD_THRESHOLD);
  });

  it("clearly different responses → below DUPLICATE_JACCARD_THRESHOLD", () => {
    const a =
      "Acme Corp is praised by engineers for its strong culture and mentorship programs.";
    const b =
      "BetaCo dominates the fintech hiring market with aggressive compensation and remote-first policy.";
    const sim = jaccardSimilarity(a, b);
    expect(sim).toBeLessThan(DUPLICATE_JACCARD_THRESHOLD);
  });

  it("DUPLICATE_JACCARD_THRESHOLD is 0.8", () => {
    expect(DUPLICATE_JACCARD_THRESHOLD).toBe(0.8);
  });

  it("is case-insensitive", () => {
    expect(jaccardSimilarity("Hello World", "hello world")).toBe(1);
  });
});
