// ─── Types ──────────────────────────────────────────────────

export interface SignalYieldInput {
  // This result's data
  mentioned: boolean;
  visibilityScore: number;
  sentimentScore: number;
  citationCount: number;
  responseLength: number;
  competitorMentions: Array<{ name: string; mentioned: boolean }>;

  // Context from other results in the same scan
  isNovelCompetitorMention: boolean; // this result mentions a competitor not seen in prior results
  isNovelCitation: boolean;          // this result cites a domain not seen in prior results
  isDuplicateResponse: boolean;      // response is near-identical to another result (Jaccard > 0.8)
}

export interface SignalYield {
  score: number; // 0-100
  tier: "high" | "medium" | "low" | "zero";
  factors: {
    mentionSignal: number;    // 0-30: was the client mentioned?
    competitorSignal: number; // 0-20: competitor data captured
    citationSignal: number;   // 0-20: sources identified
    noveltySignal: number;    // 0-20: new info not in other results
    depthSignal: number;      // 0-10: response length/detail
  };
  flags: string[]; // ["novel_competitor", "novel_citation", "duplicate_response", "zero_signal"]
}

// ─── Scoring constants ───────────────────────────────────────

const MENTION_BASE = 20;
const MENTION_HIGH_VISIBILITY_BONUS = 10;
const MENTION_MAX = 30;

const COMPETITOR_PER_MENTION = 5;
const COMPETITOR_MAX_BASE = 20;
const COMPETITOR_NOVEL_BONUS = 10;

const CITATION_BASE = 10;
const CITATION_NOVEL_BONUS = 10;
const CITATION_MAX = 20;

const NOVELTY_BOTH = 20;
const NOVELTY_ONE = 15;
const NOVELTY_NONE = 0;

const DEPTH_MEDIUM = 5;  // responseLength > 500
const DEPTH_HIGH = 10;   // responseLength > 1000

const TIER_HIGH_THRESHOLD = 60;
const TIER_MEDIUM_THRESHOLD = 30;

// ─── Scoring function ────────────────────────────────────────

export function scoreQuerySignal(input: SignalYieldInput): SignalYield {
  const flags: string[] = [];

  // Duplicate response suppresses novelty — flag immediately
  if (input.isDuplicateResponse) {
    flags.push("duplicate_response");
  }
  if (input.isNovelCompetitorMention) {
    flags.push("novel_competitor");
  }
  if (input.isNovelCitation) {
    flags.push("novel_citation");
  }

  // ── Mention signal (0-30) ─────────────────────────────────
  let mentionSignal = 0;
  if (input.mentioned) {
    mentionSignal = MENTION_BASE;
    if (input.visibilityScore > 50) {
      mentionSignal += MENTION_HIGH_VISIBILITY_BONUS;
    }
  }
  mentionSignal = Math.min(MENTION_MAX, mentionSignal);

  // ── Competitor signal (0-20) ──────────────────────────────
  const mentionedCompetitorCount = input.competitorMentions.filter(
    (c) => c.mentioned,
  ).length;
  let competitorSignal = Math.min(
    COMPETITOR_MAX_BASE,
    mentionedCompetitorCount * COMPETITOR_PER_MENTION,
  );
  if (input.isNovelCompetitorMention) {
    competitorSignal += COMPETITOR_NOVEL_BONUS;
  }
  // Cap at 20 total (novel bonus can push past COMPETITOR_MAX_BASE but
  // the overall factor ceiling is still 20)
  competitorSignal = Math.min(COMPETITOR_MAX_BASE, competitorSignal);

  // ── Citation signal (0-20) ────────────────────────────────
  let citationSignal = 0;
  if (input.citationCount > 0) {
    citationSignal = CITATION_BASE;
  }
  if (input.isNovelCitation) {
    citationSignal += CITATION_NOVEL_BONUS;
  }
  citationSignal = Math.min(CITATION_MAX, citationSignal);

  // ── Novelty signal (0-20) — zeroed for duplicate responses ──
  let noveltySignal: number;
  if (input.isDuplicateResponse) {
    noveltySignal = NOVELTY_NONE;
  } else if (input.isNovelCompetitorMention && input.isNovelCitation) {
    noveltySignal = NOVELTY_BOTH;
  } else if (input.isNovelCompetitorMention || input.isNovelCitation) {
    noveltySignal = NOVELTY_ONE;
  } else {
    noveltySignal = NOVELTY_NONE;
  }

  // ── Depth signal (0-10) ───────────────────────────────────
  let depthSignal = 0;
  if (input.responseLength > 1000) {
    depthSignal = DEPTH_HIGH;
  } else if (input.responseLength > 500) {
    depthSignal = DEPTH_MEDIUM;
  }

  // ── Total ─────────────────────────────────────────────────
  const score = Math.min(
    100,
    Math.max(
      0,
      mentionSignal + competitorSignal + citationSignal + noveltySignal + depthSignal,
    ),
  );

  if (score === 0) {
    flags.push("zero_signal");
  }

  // ── Tier ──────────────────────────────────────────────────
  let tier: SignalYield["tier"];
  if (score >= TIER_HIGH_THRESHOLD) {
    tier = "high";
  } else if (score >= TIER_MEDIUM_THRESHOLD) {
    tier = "medium";
  } else if (score > 0) {
    tier = "low";
  } else {
    tier = "zero";
  }

  return {
    score,
    tier,
    factors: {
      mentionSignal,
      competitorSignal,
      citationSignal,
      noveltySignal,
      depthSignal,
    },
    flags,
  };
}

// ─── Jaccard similarity helper ───────────────────────────────

/**
 * Compute Jaccard similarity between two strings based on word sets.
 * Returns a value in [0, 1] where 1 means identical word content.
 *
 * This is an approximation of near-duplicate detection. The standard
 * threshold for "near-identical" is 0.8.
 */
export function jaccardSimilarity(a: string, b: string): number {
  const wordsOf = (text: string): Set<string> =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 0),
    );

  const setA = wordsOf(a);
  const setB = wordsOf(b);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const word of setA) {
    if (setB.has(word)) intersectionSize++;
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return intersectionSize / unionSize;
}

export const DUPLICATE_JACCARD_THRESHOLD = 0.8;
