import { isEmployerRelevantDomain } from "./employer-platforms";

// ─── Hook scoring constants ──────────────────────────────────
// Named exports so they can be tuned after production data review.

// ─── Visibility tier ─────────────────────────────────────────

export type VisibilityTier = "high" | "moderate" | "low";

export const HIGH_VISIBILITY_THRESHOLD = 0.3;
export const MODERATE_VISIBILITY_THRESHOLD = 0.1;

export function classifyVisibilityTier(discoveryMentionRate: number): VisibilityTier {
  if (discoveryMentionRate > HIGH_VISIBILITY_THRESHOLD) return "high";
  if (discoveryMentionRate >= MODERATE_VISIBILITY_THRESHOLD) return "moderate";
  return "low";
}

// ─── Tier-aware base scores ──────────────────────────────────
// Each tier adjusts which hook categories are most relevant.
// LOW: discovery absence is the story (prospect invisible).
// MODERATE: mixed; contrast is the sharpest angle.
// HIGH: prospect is strong; contrast, citation, and reputation
//       are actionable — discovery absence is misleading.

const TIER_BASE_SCORES: Record<VisibilityTier, {
  discovery: number;
  contrast: number;
  citation: number;
  reputation: number;
}> = {
  low:      { discovery: 100, contrast: 80, citation: 70, reputation: 60 },
  moderate: { discovery: 70,  contrast: 90, citation: 70, reputation: 65 },
  high:     { discovery: 40,  contrast: 100, citation: 85, reputation: 80 },
};

// Legacy constants kept for backward-compatible test imports.
// They now reflect the LOW tier defaults (original behavior).
export const DISCOVERY_BASE = 100;
export const CONTRAST_BASE = 80;
export const CITATION_BASE = 70;
export const REPUTATION_BASE = 60;

export const TOTAL_ABSENCE_BONUS = 30;
export const COMPETITOR_DOMINANCE_THRESHOLD = 30; // of 65 discovery queries
export const COMPETITOR_DOMINANCE_BONUS = 20;
export const GAP_MULTIPLIER = 50;
export const COMPETITOR_FAVORED_BONUS = 40;
export const MULTI_COMPETITOR_FAVORED_BONUS = 15; // bonus when 2+ competitors favored
export const STRONG_SENTIMENT_THRESHOLD = 0.3;
export const STRONG_SENTIMENT_BONUS = 20;
export const NEGATIVE_FRAMING_BONUS = 40;
export const PRODUCT_FOCUS_BONUS = 30;
export const ZERO_OWNED_CITATIONS_BONUS = 40;
export const RICH_COMPETITOR_CITATIONS_THRESHOLD = 3;
export const RICH_COMPETITOR_CITATIONS_BONUS = 20;

// Finding strength thresholds
const STRONG_THRESHOLD = 130;
const MODERATE_THRESHOLD = 90;

// ─── Input type ──────────────────────────────────────────────

export interface SnapshotResultData {
  queryText: string;
  category: "discovery" | "competitor_contrast" | "reputation" | "citation_source";
  competitorName?: string; // for contrast queries
  prospectName: string;
  prospectDomain?: string; // when available, used directly in citation gap analysis
  industry?: string; // threaded to DM template
  competitors: Array<{ name: string; domain: string }>;
  // Result data
  mentioned: boolean;
  visibilityScore: number | null;
  sentimentScore: number | null;
  response: string;
  citationDomains: string[]; // domains from citations
  // Optional: theme tag on discovery queries (used for themeBreakdown)
  theme?: string;
}

// ─── Output types ────────────────────────────────────────────

export interface SnapshotInterpretation {
  primaryTakeaway: string;
  strength: {
    label: string;
    title: string;
    detail: string;
    source: "discovery" | "contrast" | "reputation" | "citation";
  };
  opportunities: [
    {
      label: string;
      title: string;
      detail: string;
      source: "discovery_gap" | "contrast" | "citation" | "reputation";
    },
    {
      label: string;
      title: string;
      detail: string;
      source: "discovery_gap" | "contrast" | "citation" | "reputation";
    },
  ];
  bridge: string;
}

export interface SnapshotSummary {
  // ── Top-level scoreboard ──
  prospectName: string;
  totalQueries: number;
  discoveryMentionRate: number;
  discoveryMentionCount: number;
  overallMentionRate: number;
  visibilityTier: VisibilityTier;

  // ── Discovery findings ──
  discovery: {
    queriesRun: number;
    prospectMentioned: number;
    /** Prospect mention rate across discovery queries (prospectMentioned / queriesRun) */
    mentionRate: number;
    /** Competitor mention counts across all discovery queries, ranked by frequency */
    competitorRanking: Array<{
      name: string;
      /** Number of discovery queries where this competitor was mentioned */
      mentioned: number;
      /** Alias for mentioned — kept for backward compatibility */
      mentionCount: number;
      mentionRate: number;
    }>;
    topCompetitorName: string;
    topCompetitorMentioned: number;
    /** Top 5 most damning discovery queries (prospect absent, most competitors present) */
    topGapQueries: Array<{
      queryText: string;
      competitorsMentioned: string[];
      prospectMentioned: boolean;
      responseExcerpt: string;
    }>;
    /** Theme-level breakdown: mention rate by theme across discovery queries */
    themeBreakdown: Array<{
      theme: string;
      queriesRun: number;
      prospectMentioned: number;
      mentionRate: number;
    }>;
    allResults: Array<{
      queryText: string;
      prospectMentioned: boolean;
      competitorsMentioned: string[];
    }>;
  };

  // ── Competitor contrast findings ──
  competitorContrast: {
    queriesRun: number;
    /** Per-competitor summary across all dimensions */
    competitorSummaries: Array<{
      competitorName: string;
      queriesRun: number;
      competitorFavoredCount: number;
      prospectFavoredCount: number;
      neutralCount: number;
      favorRate: number;
      /** The dimension/query text where the prospect fared worst vs. this competitor */
      worstDimension: string | null;
      /** Response excerpt from the worst-performing comparison query */
      worstExcerpt: string | null;
    }>;
    worstComparison: {
      queryText: string;
      competitorName: string;
      responseExcerpt: string;
      prospectSentiment: number;
      competitorFavored: boolean;
    } | null;
    allResults: Array<{
      queryText: string;
      competitorName: string;
      prospectSentiment: number;
      responseExcerpt: string;
      competitorFavored: boolean;
    }>;
  };

  // ── Reputation findings ──
  reputation: {
    queriesRun: number;
    avgSentiment: number;
    narrativeConsistency: "consistent" | "varied" | "contradictory";
    recurringThemes: string[];
    worstResponse: {
      queryText: string;
      responseExcerpt: string;
      sentiment: number;
      keyIssue: string;
    } | null;
  };

  // ── Citation gap findings ──
  citationGap: {
    prospectOwnedCitations: number;
    prospectTotalCitations: number;
    competitorOwnedCitations: number;
    /** Employer-relevant platforms cited when competitors appear but prospect does not */
    gapPlatforms: string[];
    finding: string;
    /** Count of employer-relevant platform citations in responses where prospect IS mentioned */
    prospectEmployerCitations: number;
    /** Count of employer-relevant platform citations in responses where competitors appear but prospect does NOT */
    competitorEmployerCitations: number;
  };

  // ── DM-ready hook ──
  primaryHook: {
    category: "discovery_absence" | "competitor_contrast" | "reputation" | "citation_gap";
    headline: string;
    evidence: string;
    quotableText: string;
    findingStrength: "strong" | "moderate" | "weak";
  };

  // ── Interpretation layer ──
  interpretation: SnapshotInterpretation;

  // ── DM template ──
  dmTemplate: string;
}

// ─── Markdown stripping ──────────────────────────────────────

/**
 * Strips common markdown formatting from AI response text so that sentence
 * extraction and phrase matching work on clean prose.
 *
 * Handles:
 *  - ATX headings: `### `, `## `, `# ` at the start of a line
 *  - Bold markers: `**text**`
 *  - Italic markers: `*text*` (single asterisk)
 *  - Bullet prefixes: `- ` or `* ` at the start of a line
 *  - Inline links: `[text](url)` → `text`
 *  - Collapsed blank lines: multiple consecutive newlines → one newline
 *  - Leading/trailing whitespace on each line
 */
export function stripMarkdown(text: string): string {
  return text
    // Inline links: keep the visible text, drop the URL
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // ATX headings — remove `### `, `## `, `# ` at start of line
    .replace(/^#{1,6}\s+/gm, "")
    // Bold: **text**
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    // Italic: *text* (single asterisk, not at word boundary with **)
    .replace(/\*([^*]+)\*/g, "$1")
    // Bullet list prefixes: `- ` or `* ` at start of a line
    .replace(/^[-*]\s+/gm, "")
    // Trim each line
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    // Collapse multiple newlines to single
    .replace(/\n{2,}/g, "\n");
}

// ─── Sentence splitting ──────────────────────────────────────

/**
 * Splits text into sentences, respecting common abbreviations to avoid
 * false splits on "Mr.", "Inc.", "vs.", etc.
 *
 * Key behavior: abbreviation periods are only suppressed when they are NOT
 * at the end of a sentence (i.e., when followed by whitespace + a letter or digit).
 * If an abbreviation like "Inc." ends a sentence, the period is preserved as the
 * sentence boundary.
 */
export function splitSentences(text: string): string[] {
  if (!text.trim()) return [];

  // Protect abbreviation periods to avoid false sentence splits:
  //  - Title abbreviations (Mr, Mrs, Ms, Dr, Prof, Sr, Jr) are always protected because
  //    they are always followed by a proper name (uppercase) and never end a sentence.
  //  - Corporate/phrase abbreviations (Inc, Corp, Ltd, Co, vs, etc, e.g, i.e, U.S, U.K)
  //    are only protected when mid-sentence (followed by lowercase), so they can still
  //    act as sentence terminators when they end a clause (e.g., "... at Acme Inc. He").
  const ABBREV_MARKER = "\x00";

  const protected_ = text
    // Title abbreviations: always protect (they precede proper names and never end sentences)
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr)\./gi, (m) => m.slice(0, -1) + ABBREV_MARKER)
    // Corporate/phrase abbreviations: only protect when followed by a LOWERCASE letter.
    // Note: the `i` flag must NOT be used here, because it would make [a-z] match uppercase
    // letters too — which is exactly the case we want to exclude (sentence boundaries).
    .replace(
      /\b(Inc|Corp|Ltd|Co|vs|etc|e\.g|i\.e|U\.S|U\.K)\.(?=\s+[a-z])/g,
      (m) => m.slice(0, -1) + ABBREV_MARKER,
    )
    // Protect decimal numbers like 3.14
    .replace(/(\d)\.(\d)/g, `$1${ABBREV_MARKER}$2`);

  // Split on sentence-ending punctuation followed by whitespace
  const raw = protected_.split(/(?<=[.!?])\s+/);

  return raw
    .map((s) => s.replace(new RegExp(ABBREV_MARKER, "g"), ".").trim())
    .filter((s) => s.length > 0);
}

// ─── Quotable text extraction ────────────────────────────────

/**
 * Extracts the most quotable sentence from an AI response for DM use.
 *
 * Rules (evaluated in order, first match wins):
 *  1. Sentence naming a competitor but NOT the prospect
 *  2. Sentence with negative/cautionary framing about the prospect
 *  3. List of companies where the prospect is absent (a sentence naming
 *     multiple competitors together)
 *  4. LLM extraction fallback — deferred, returns null (caller handles)
 *  5. First 200 chars as last resort
 */
export function extractQuotableText(
  response: string,
  prospectName: string,
  competitorNames: string[],
): string {
  // Strip markdown, then collapse remaining newlines to spaces so
  // "Procore\nOpen Communication: ..." becomes a continuous sentence
  // rather than two fragments that confuse the splitter.
  const cleaned = stripMarkdown(response).replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
  const sentences = splitSentences(cleaned);
  const prospectLower = prospectName.toLowerCase();

  const mentionsProspect = (s: string) =>
    s.toLowerCase().includes(prospectLower);

  const mentionsAnyCompetitor = (s: string) => {
    const lower = s.toLowerCase();
    return competitorNames.some((c) => lower.includes(c.toLowerCase()));
  };

  const competitorCount = (s: string) => {
    const lower = s.toLowerCase();
    return competitorNames.filter((c) => lower.includes(c.toLowerCase())).length;
  };

  // Rule 1: sentence naming a competitor but NOT the prospect.
  // Skip very short fragments (bare company names that survived markdown stripping).
  // A quotable sentence should be at least 40 characters to be useful in a DM.
  const MIN_QUOTABLE_LENGTH = 40;
  for (const sentence of sentences) {
    if (
      sentence.trim().length >= MIN_QUOTABLE_LENGTH &&
      mentionsAnyCompetitor(sentence) &&
      !mentionsProspect(sentence)
    ) {
      return sentence.trim();
    }
  }

  // Rule 2: sentence with negative/cautionary framing about the prospect
  const NEGATIVE_MARKERS = [
    "not mentioned",
    "not listed",
    "absent",
    "not appear",
    "does not appear",
    "isn't mentioned",
    "wasn't mentioned",
    "limited visibility",
    "lacks",
    "weak",
    "poor",
    "negative",
    "concerns",
    "struggles",
    "difficulty",
    "challenges",
    "historically",
    "used to be",
    "outdated",
    "no longer",
  ];
  for (const sentence of sentences) {
    if (!mentionsProspect(sentence)) continue;
    const lower = sentence.toLowerCase();
    if (NEGATIVE_MARKERS.some((m) => lower.includes(m))) {
      return sentence.trim();
    }
  }

  // Rule 3: sentence naming multiple competitors (list pattern — prospect absent)
  // Pick the sentence with the most competitor mentions where prospect is absent
  let bestListSentence: string | null = null;
  let bestListCount = 1; // require at least 2 competitor mentions for a "list"
  for (const sentence of sentences) {
    if (mentionsProspect(sentence)) continue;
    if (sentence.trim().length < MIN_QUOTABLE_LENGTH) continue;
    const count = competitorCount(sentence);
    if (count > bestListCount) {
      bestListCount = count;
      bestListSentence = sentence;
    }
  }
  if (bestListSentence) {
    return bestListSentence.trim();
  }

  // Rule 4: LLM extraction fallback — deferred, return null; caller handles
  // (This function returns a string, so we fall through to Rule 5)

  // Rule 5: first substantive sentence from the cleaned text, or first 200 chars
  const fallbackText = stripMarkdown(response).replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
  const fallbackSentences = splitSentences(fallbackText);
  const substantive = fallbackSentences.find(
    (s) => s.trim().length >= MIN_QUOTABLE_LENGTH,
  );
  return substantive?.trim() ?? fallbackText.slice(0, 200).trim();
}

// ─── Reputation issue classifier ────────────────────────────

const OUTDATED_MARKERS = [
  "historically",
  "used to be",
  "used to have",
  "in the past",
  "previously",
  "has been known to",
  "was once",
  "no longer",
  "at one time",
  "formerly known",
];

const PRODUCT_MARKERS = [
  "software",
  "platform",
  "product",
  "solution",
  "application",
  "tool",
  "service offering",
  "technology",
  "saas",
  "customers",
  "clients",
  "subscription",
  "pricing",
];

const EMPLOYER_MARKERS = [
  "employees",
  "work culture",
  "employer",
  "workplace",
  "benefits",
  "career",
  "hiring",
  "interview",
  "team",
  "manager",
  "remote",
  "office",
  "salary",
  "compensation",
];

const NEGATIVE_SENTIMENT_MARKERS = [
  "poor",
  "negative",
  "concerns",
  "complaints",
  "difficult",
  "issues",
  "problems",
  "challenges",
  "mixed reviews",
  "not recommended",
  "underpaid",
  "toxic",
  "turnover",
  "layoffs",
  "lack of",
  "limited",
];

/**
 * Classifies the primary issue in a reputation query response.
 *
 * Returns one of:
 *  - "unsourced_claims": AI makes claims with no citations
 *  - "product_focus": Response is about the product, not employer brand
 *  - "negative_framing": Clear negative sentiment
 *  - "outdated_info": Response contains temporal hedging language
 */
export function classifyReputationIssue(
  response: string,
  prospectName: string,
  citationCount: number,
): string {
  const lower = response.toLowerCase();

  // Check for outdated info first — temporal hedging is explicit
  if (OUTDATED_MARKERS.some((m) => lower.includes(m))) {
    return "outdated_info";
  }

  // Product focus: more product markers than employer markers
  const productScore = PRODUCT_MARKERS.filter((m) => lower.includes(m)).length;
  const employerScore = EMPLOYER_MARKERS.filter((m) => lower.includes(m)).length;
  if (productScore > employerScore && productScore >= 2) {
    return "product_focus";
  }

  // Negative framing: explicit negative signals
  const negativeScore = NEGATIVE_SENTIMENT_MARKERS.filter((m) => lower.includes(m)).length;
  if (negativeScore >= 2) {
    return "negative_framing";
  }

  // Unsourced claims: AI makes assertions without citation support
  if (citationCount === 0) {
    return "unsourced_claims";
  }

  // Default to unsourced if nothing else fires
  return "unsourced_claims";
}

// ─── Competitor favor detection ──────────────────────────────

const COMPETITOR_FAVOR_PHRASES = [
  "better choice",
  "stronger choice",
  "clear winner",
  "strongly recommend",
  "generally preferred",
  "widely regarded",
  "better option",
  "stronger candidate",
  "better fit",
  "edge over",
  "advantage over",
  "outperforms",
  "more competitive",
  "higher rated",
  "more highly rated",
  "better reputation",
  "better employer",
  "better culture",
  "better pay",
  "better benefits",
  "more innovative",
  "stronger engineering",
  "stronger culture",
  "broader recognition",
];

/**
 * Returns true if the response appears to favor the competitor over the prospect.
 * Heuristic: competitor is named near positive phrases, or explicit comparison language
 * places the competitor ahead.
 */
function isCompetitorFavored(
  response: string,
  prospectName: string,
  competitorName: string,
): boolean {
  // Strip markdown for phrase-proximity detection so that bold markers and
  // heading prefixes don't shift the string offsets used in the proximity check.
  const lower = stripMarkdown(response).toLowerCase();
  const prospectLower = prospectName.toLowerCase();
  const competitorLower = competitorName.toLowerCase();

  // Check each favor phrase and see if it's closer to the competitor name
  for (const phrase of COMPETITOR_FAVOR_PHRASES) {
    const phraseIdx = lower.indexOf(phrase);
    if (phraseIdx === -1) continue;

    const prospectIdx = lower.lastIndexOf(prospectLower, phraseIdx);
    const competitorIdx = lower.lastIndexOf(competitorLower, phraseIdx);

    // Competitor is the nearest named entity before the favor phrase
    if (competitorIdx > prospectIdx && competitorIdx !== -1) {
      return true;
    }

    // Or phrase appears right after competitor name (within 200 chars)
    const competitorAfterIdx = lower.indexOf(competitorLower, phraseIdx);
    if (competitorAfterIdx !== -1 && competitorAfterIdx - phraseIdx < 200) {
      return true;
    }
  }

  return false;
}

// ─── Narrative consistency classifier ───────────────────────

/**
 * Classifies how consistent AI reputation responses are across queries.
 *
 * - "consistent": majority of responses share the same primary issue classification
 * - "contradictory": responses contain mutually contradictory signals (positive + negative)
 * - "varied": neither consistent nor contradictory — mixed bag of issues
 */
function classifyNarrativeConsistency(
  issues: string[],
  sentiments: number[],
): "consistent" | "varied" | "contradictory" {
  if (issues.length === 0) return "consistent";

  // Count issue frequencies
  const issueCounts: Record<string, number> = {};
  for (const issue of issues) {
    issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
  }

  const topCount = Math.max(...Object.values(issueCounts));
  const consistencyRate = topCount / issues.length;

  // Contradictory: mix of clearly positive and clearly negative sentiments
  const positiveCount = sentiments.filter((s) => s > STRONG_SENTIMENT_THRESHOLD).length;
  const negativeCount = sentiments.filter((s) => s < -STRONG_SENTIMENT_THRESHOLD).length;
  if (positiveCount >= 1 && negativeCount >= 1) {
    return "contradictory";
  }

  // Consistent: same primary issue in >= 60% of responses
  if (consistencyRate >= 0.6) {
    return "consistent";
  }

  return "varied";
}

/**
 * Extracts recurring themes from reputation responses.
 * A theme is "recurring" if it appears in 3+ responses (or 30% of responses if < 10).
 */
function extractRecurringThemes(
  issues: string[],
  responses: string[],
): string[] {
  const threshold = Math.max(3, Math.ceil(issues.length * 0.3));
  const issueCounts: Record<string, number> = {};

  for (const issue of issues) {
    issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
  }

  const recurring: string[] = [];

  // Map issue codes to readable theme names
  const issueLabels: Record<string, string> = {
    product_focus: "product-focused responses",
    outdated_info: "outdated information",
    negative_framing: "negative framing",
    unsourced_claims: "unsourced claims",
  };

  for (const [issue, count] of Object.entries(issueCounts)) {
    if (count >= threshold) {
      recurring.push(issueLabels[issue] ?? issue);
    }
  }

  // Also check if Glassdoor / review sites appear in multiple responses
  const reviewSiteCount = responses.filter((r) =>
    r.toLowerCase().includes("glassdoor") ||
    r.toLowerCase().includes("indeed") ||
    r.toLowerCase().includes("blind") ||
    r.toLowerCase().includes("levels.fyi"),
  ).length;
  if (reviewSiteCount >= threshold) {
    recurring.push("third-party review site references");
  }

  return recurring;
}

// ─── Hook scorer ─────────────────────────────────────────────

interface DiscoveryMetrics {
  prospectMentionRate: number;
  topCompetitorMentionRate: number;
  topCompetitorMentioned: number;
  topCompetitorName: string;
  prospectMentionCount: number;
  queriesRun: number;
}

interface ContrastMetrics {
  competitorFavored: boolean;
  multipleCompetitorsFavored: boolean;
  prospectSentiment: number;
  competitorName: string;
  queryText: string;
  responseExcerpt: string;
}

interface ReputationMetrics {
  worstSentiment: number;
  keyIssue: string;
}

interface CitationMetrics {
  prospectOwnedCitations: number;
  competitorOwnedCitations: number;
}

type HookScoreResult = {
  score: number;
  headline: string;
  evidence: string;
  quotableText: string;
};

export function scoreHook(
  category: "discovery_absence" | "competitor_contrast" | "reputation" | "citation_gap",
  metrics: DiscoveryMetrics | ContrastMetrics | ReputationMetrics | CitationMetrics,
  tier: VisibilityTier = "low",
): HookScoreResult {
  const bases = TIER_BASE_SCORES[tier];

  switch (category) {
    case "discovery_absence": {
      const m = metrics as DiscoveryMetrics;
      const gap = m.topCompetitorMentionRate - m.prospectMentionRate;
      let score = bases.discovery;
      // For high-visibility prospects, only reward meaningful gaps.
      // A negative gap (prospect ahead) should not inflate the score.
      score += Math.max(0, gap) * GAP_MULTIPLIER;
      if (m.prospectMentionRate === 0) score += TOTAL_ABSENCE_BONUS;
      if (m.topCompetitorMentioned >= COMPETITOR_DOMINANCE_THRESHOLD) score += COMPETITOR_DOMINANCE_BONUS;

      const prospectCount = m.prospectMentionCount;
      const totalQueries = m.queriesRun;
      const prospectPct = Math.round(m.prospectMentionRate * 100);
      const competitorPct = Math.round(m.topCompetitorMentionRate * 100);

      let headline: string;
      let evidence: string;

      if (tier === "high") {
        // Prospect is dominant — frame around where gaps remain
        const absentCount = totalQueries - prospectCount;
        headline = absentCount > 0
          ? `Your company appears in ${prospectPct}% of discovery queries — ahead of all competitors tested. But ${absentCount} queries still surface competitors instead.`
          : `Your company appears in ${prospectPct}% of discovery queries — ahead of all competitors tested. Nearest competitor: ${m.topCompetitorName} at ${competitorPct}%.`;
        evidence =
          `${m.topCompetitorName} appears in ${competitorPct}% of discovery results. ` +
          `Your company leads at ${prospectPct}%. ` +
          (absentCount > 0
            ? `${absentCount} of ${totalQueries} queries still omit your company — potential openings for competitors.`
            : `Complete coverage across all ${totalQueries} discovery queries.`);
      } else {
        // Low/moderate — original underdog framing
        headline =
          prospectCount === 0
            ? `Across ${totalQueries} candidate discovery queries, ${m.topCompetitorName} is mentioned ${competitorPct}% of the time. Your company: 0%.`
            : `Across ${totalQueries} candidate discovery queries, ${m.topCompetitorName} is mentioned ${competitorPct}% of the time. Your company: ${prospectPct}%.`;
        evidence =
          `When candidates use AI to discover employers in your space, ${m.topCompetitorName} is present in ${competitorPct}% of results. ` +
          (prospectCount === 0
            ? `Your company is not mentioned in any of them. This is a verifiable absence, not a subjective assessment.`
            : `Your company appears in ${prospectPct}% — a ${Math.round(Math.max(0, gap) * 100)} percentage point gap.`);
      }

      return { score, headline, evidence, quotableText: "" };
    }

    case "competitor_contrast": {
      const m = metrics as ContrastMetrics;
      let score = bases.contrast;
      if (m.competitorFavored) score += COMPETITOR_FAVORED_BONUS;
      if (m.multipleCompetitorsFavored) score += MULTI_COMPETITOR_FAVORED_BONUS;
      if (Math.abs(m.prospectSentiment) > STRONG_SENTIMENT_THRESHOLD) score += STRONG_SENTIMENT_BONUS;

      let headline: string;
      if (tier === "high") {
        headline = m.competitorFavored
          ? `When candidates compare you with ${m.competitorName}, AI highlights their advantages over your company.`
          : `In head-to-head AI comparisons with ${m.competitorName}, the narrative tilts against your company on key dimensions.`;
      } else {
        headline = m.competitorFavored
          ? `When candidates ask AI to compare you with ${m.competitorName}, the AI favors ${m.competitorName}.`
          : `AI comparison queries for your company vs. ${m.competitorName} show a meaningful sentiment gap.`;
      }

      const evidence = `Query: "${m.queryText}". ${m.competitorFavored ? `The AI response favors ${m.competitorName} over your company.` : `Your company receives neutral-to-mixed framing in the comparison.`}`;

      return { score, headline, evidence, quotableText: m.responseExcerpt };
    }

    case "reputation": {
      const m = metrics as ReputationMetrics;
      let score = bases.reputation;
      if (m.worstSentiment < -STRONG_SENTIMENT_THRESHOLD) score += NEGATIVE_FRAMING_BONUS;
      if (m.keyIssue === "product_focus") score += PRODUCT_FOCUS_BONUS;

      const issueLabels: Record<string, string> = {
        unsourced_claims: "AI is making claims about your employer brand with no sourced citations",
        product_focus: "AI describes your product — not your employer brand — when candidates research you as an employer",
        negative_framing: "AI uses negative framing when describing your company as an employer",
        outdated_info: "AI is drawing on outdated information when describing your employer reputation",
      };

      let headline: string;
      if (tier === "high") {
        // High visibility makes reputation issues more impactful — more people see them
        const highVisLabels: Record<string, string> = {
          unsourced_claims: "AI mentions your company frequently, but makes employer brand claims with no sourced citations",
          product_focus: "Despite strong AI visibility, candidates searching your employer brand get product descriptions instead",
          negative_framing: "AI mentions your company frequently, but the narrative emphasizes negative themes",
          outdated_info: "AI features your company prominently, but draws on outdated information about your employer reputation",
        };
        headline = highVisLabels[m.keyIssue] ?? issueLabels[m.keyIssue] ?? "AI reputation responses for your company show quality issues.";
      } else {
        headline = issueLabels[m.keyIssue] ?? "AI reputation responses for your company show quality issues.";
      }

      const evidence =
        `Candidate-facing queries about your employer reputation returned responses that show: ${issueLabels[m.keyIssue] ?? m.keyIssue}. ` +
        (m.worstSentiment < -STRONG_SENTIMENT_THRESHOLD
          ? `Sentiment in the worst response is negative (score: ${m.worstSentiment.toFixed(2)}).`
          : `This undermines how candidates perceive you as an employer.`);

      return { score, headline, evidence, quotableText: "" };
    }

    case "citation_gap": {
      const m = metrics as CitationMetrics;
      let score = bases.citation;
      if (m.prospectOwnedCitations === 0) score += ZERO_OWNED_CITATIONS_BONUS;
      if (m.competitorOwnedCitations >= RICH_COMPETITOR_CITATIONS_THRESHOLD) score += RICH_COMPETITOR_CITATIONS_BONUS;

      let headline: string;
      if (tier === "high" && m.prospectOwnedCitations === 0) {
        headline = `Despite strong AI visibility, your company has zero citations from content you control.`;
      } else {
        headline =
          m.prospectOwnedCitations === 0
            ? `AI cites zero sources you own when making claims about your employer brand.`
            : `Your company has significantly fewer sourced citations than your competitors in AI responses.`;
      }

      const evidence =
        `Across all scan queries, your company has ${m.prospectOwnedCitations} owned citations in AI responses. ` +
        (m.competitorOwnedCitations > 0
          ? `Competitors have ${m.competitorOwnedCitations}. `
          : "") +
        `This means AI is making claims about you as an employer without linking to any content you control.`;

      return { score, headline, evidence, quotableText: "" };
    }
  }
}

// ─── Finding strength classifier ────────────────────────────

function findingStrength(score: number): "strong" | "moderate" | "weak" {
  if (score >= STRONG_THRESHOLD) return "strong";
  if (score >= MODERATE_THRESHOLD) return "moderate";
  return "weak";
}

// ─── Main computation function ───────────────────────────────

export function computeSnapshotSummary(results: SnapshotResultData[]): SnapshotSummary {
  if (results.length === 0) {
    return buildEmptySummary();
  }

  const prospectName = results[0].prospectName;
  const allCompetitors = results[0].competitors;
  const competitorNames = allCompetitors.map((c) => c.name);
  const competitorDomains = allCompetitors.map((c) => c.domain);

  // ── Group by category ─────────────────────────────────────
  const discoveryResults = results.filter((r) => r.category === "discovery");
  const contrastResults = results.filter((r) => r.category === "competitor_contrast");
  const reputationResults = results.filter((r) => r.category === "reputation");
  const citationResults = results.filter((r) => r.category === "citation_source");

  // ── Top-level scoreboard ──────────────────────────────────
  const totalMentioned = results.filter((r) => r.mentioned).length;
  const overallMentionRate = results.length > 0 ? totalMentioned / results.length : 0;

  const discoveryMentioned = discoveryResults.filter((r) => r.mentioned).length;
  const discoveryMentionRate =
    discoveryResults.length > 0 ? discoveryMentioned / discoveryResults.length : 0;

  // ── Discovery analysis ────────────────────────────────────

  // Count how many times each competitor is mentioned across discovery results
  const competitorDiscoveryCounts: Record<string, number> = {};
  for (const name of competitorNames) {
    competitorDiscoveryCounts[name] = 0;
  }

  const discoveryAllResults: SnapshotSummary["discovery"]["allResults"] = discoveryResults.map(
    (r) => {
      const mentioned: string[] = [];
      for (const comp of allCompetitors) {
        const lowerResponse = r.response.toLowerCase();
        if (lowerResponse.includes(comp.name.toLowerCase())) {
          mentioned.push(comp.name);
          competitorDiscoveryCounts[comp.name] =
            (competitorDiscoveryCounts[comp.name] ?? 0) + 1;
        }
      }
      return {
        queryText: r.queryText,
        prospectMentioned: r.mentioned,
        competitorsMentioned: mentioned,
      };
    },
  );

  // Build competitor ranking sorted by mention rate descending
  const competitorRanking: SnapshotSummary["discovery"]["competitorRanking"] = competitorNames
    .map((name) => {
      const count = competitorDiscoveryCounts[name] ?? 0;
      const rate = discoveryResults.length > 0 ? count / discoveryResults.length : 0;
      return {
        name,
        mentioned: count,
        mentionCount: count,
        mentionRate: rate,
      };
    })
    .sort((a, b) => b.mentionRate - a.mentionRate);

  // Find top competitor (most mentioned in discovery)
  let topCompetitorName = competitorNames[0] ?? "";
  let topCompetitorMentioned = 0;
  for (const [name, count] of Object.entries(competitorDiscoveryCounts)) {
    if (count > topCompetitorMentioned) {
      topCompetitorMentioned = count;
      topCompetitorName = name;
    }
  }

  // Top gap queries: prospect absent, sorted by most competitors present (up to 5)
  const gapCandidates = discoveryResults
    .map((r, i) => ({ r, row: discoveryAllResults[i]! }))
    .filter(({ r }) => !r.mentioned)
    .sort((a, b) => b.row.competitorsMentioned.length - a.row.competitorsMentioned.length)
    .slice(0, 5);

  const topGapQueries: SnapshotSummary["discovery"]["topGapQueries"] = gapCandidates.map(
    ({ r, row }) => ({
      queryText: r.queryText,
      competitorsMentioned: row.competitorsMentioned,
      prospectMentioned: false,
      responseExcerpt: extractDiscoveryExcerpt(r.response, competitorNames),
    }),
  );

  // If fewer than 5 absent queries, fill with the worst gap queries that do mention prospect
  if (topGapQueries.length < 5 && discoveryResults.length > 0) {
    const alreadyIncluded = new Set(topGapQueries.map((q) => q.queryText));
    const fallbacks = discoveryResults
      .map((r, i) => ({ r, row: discoveryAllResults[i]! }))
      .filter(({ r }) => r.mentioned && !alreadyIncluded.has(r.queryText))
      .slice(0, 5 - topGapQueries.length);

    for (const { r, row } of fallbacks) {
      topGapQueries.push({
        queryText: r.queryText,
        competitorsMentioned: row.competitorsMentioned,
        prospectMentioned: true,
        responseExcerpt: extractDiscoveryExcerpt(r.response, competitorNames),
      });
    }
  }

  // Theme breakdown: group by result.theme if available, else derive from query position
  const themeMap: Record<string, { queriesRun: number; prospectMentioned: number }> = {};

  for (const r of discoveryResults) {
    const theme = r.theme ?? inferThemeFromQuery(r.queryText);
    if (!themeMap[theme]) {
      themeMap[theme] = { queriesRun: 0, prospectMentioned: 0 };
    }
    themeMap[theme].queriesRun++;
    if (r.mentioned) themeMap[theme].prospectMentioned++;
  }

  const themeBreakdown: SnapshotSummary["discovery"]["themeBreakdown"] = Object.entries(themeMap)
    .map(([theme, data]) => ({
      theme,
      queriesRun: data.queriesRun,
      prospectMentioned: data.prospectMentioned,
      mentionRate: data.queriesRun > 0 ? data.prospectMentioned / data.queriesRun : 0,
    }))
    .sort((a, b) => a.mentionRate - b.mentionRate); // worst themes first

  // ── Competitor contrast analysis ──────────────────────────

  // Per-competitor aggregates
  const competitorContrastMap: Record<
    string,
    {
      queriesRun: number;
      competitorFavoredCount: number;
      prospectFavoredCount: number;
      neutralCount: number;
      worstScore: number;
      worstDimension: string | null;
      worstExcerpt: string | null;
    }
  > = {};

  const contrastAllResults: SnapshotSummary["competitorContrast"]["allResults"] = [];
  let worstComparison: SnapshotSummary["competitorContrast"]["worstComparison"] = null;
  let worstContrastScore = -Infinity;

  for (const r of contrastResults) {
    const competitorName = r.competitorName ?? (competitorNames[0] ?? "Competitor");
    const sentiment = r.sentimentScore ?? 0;
    const favored = isCompetitorFavored(r.response, prospectName, competitorName);
    const responseExcerpt = extractQuotableText(r.response, prospectName, [
      competitorName,
      ...competitorNames,
    ]);

    // Update per-competitor aggregate
    if (!competitorContrastMap[competitorName]) {
      competitorContrastMap[competitorName] = {
        queriesRun: 0,
        competitorFavoredCount: 0,
        prospectFavoredCount: 0,
        neutralCount: 0,
        worstScore: -Infinity,
        worstDimension: null,
        worstExcerpt: null,
      };
    }
    const agg = competitorContrastMap[competitorName]!;
    agg.queriesRun++;
    if (favored) {
      agg.competitorFavoredCount++;
    } else if (sentiment > STRONG_SENTIMENT_THRESHOLD) {
      agg.prospectFavoredCount++;
    } else {
      agg.neutralCount++;
    }

    // Track the worst result per competitor for worstDimension / worstExcerpt
    const perCompetitorScore = (favored ? 2 : 0) + (sentiment < 0 ? 1 : 0) - sentiment;
    if (perCompetitorScore > agg.worstScore) {
      agg.worstScore = perCompetitorScore;
      agg.worstDimension = r.queryText;
      agg.worstExcerpt = responseExcerpt;
    }

    contrastAllResults.push({
      queryText: r.queryText,
      competitorName,
      prospectSentiment: sentiment,
      responseExcerpt,
      competitorFavored: favored,
    });

    // Score this comparison: favored + low sentiment = worst
    const score = (favored ? 2 : 0) + (sentiment < 0 ? 1 : 0) - sentiment;
    if (score > worstContrastScore) {
      worstContrastScore = score;
      worstComparison = {
        queryText: r.queryText,
        competitorName,
        responseExcerpt,
        prospectSentiment: sentiment,
        competitorFavored: favored,
      };
    }
  }

  const competitorSummaries: SnapshotSummary["competitorContrast"]["competitorSummaries"] =
    Object.entries(competitorContrastMap).map(([competitorName, agg]) => ({
      competitorName,
      queriesRun: agg.queriesRun,
      competitorFavoredCount: agg.competitorFavoredCount,
      prospectFavoredCount: agg.prospectFavoredCount,
      neutralCount: agg.neutralCount,
      favorRate: agg.queriesRun > 0 ? agg.competitorFavoredCount / agg.queriesRun : 0,
      worstDimension: agg.worstDimension,
      worstExcerpt: agg.worstExcerpt,
    }));

  // How many distinct competitors were favored at least once
  const competitorsFavoredCount = competitorSummaries.filter((s) => s.competitorFavoredCount > 0).length;

  // ── Reputation analysis ───────────────────────────────────

  const reputationSentiments = reputationResults
    .map((r) => r.sentimentScore ?? 0);
  const avgSentiment =
    reputationSentiments.length > 0
      ? reputationSentiments.reduce((a, b) => a + b, 0) / reputationSentiments.length
      : 0;

  const reputationIssues: string[] = [];
  let worstResponse: SnapshotSummary["reputation"]["worstResponse"] = null;
  let worstSentimentValue = Infinity;

  for (const r of reputationResults) {
    const sentiment = r.sentimentScore ?? 0;
    const keyIssue = classifyReputationIssue(r.response, prospectName, r.citationDomains.length);
    reputationIssues.push(keyIssue);

    if (sentiment < worstSentimentValue) {
      worstSentimentValue = sentiment;
      worstResponse = {
        queryText: r.queryText,
        responseExcerpt: extractQuotableText(r.response, prospectName, competitorNames),
        sentiment,
        keyIssue,
      };
    }
  }

  const narrativeConsistency = classifyNarrativeConsistency(reputationIssues, reputationSentiments);
  const recurringThemes = extractRecurringThemes(
    reputationIssues,
    reputationResults.map((r) => r.response),
  );

  // ── Citation gap analysis ─────────────────────────────────

  // Use the explicit prospectDomain when provided (stored in scan metadata via H1 fix).
  // Fall back to the name-matching heuristic for older scans that pre-date the fix.
  const prospectDomainGuess =
    results[0]?.prospectDomain ?? inferProspectDomain(prospectName, results);

  let prospectOwnedCitations = 0;
  let prospectTotalCitations = 0;
  let competitorOwnedCitations = 0;

  // Employer-relevant citation counts (filtered to the ~30 known employer platforms)
  let prospectEmployerCitations = 0;
  let competitorEmployerCitations = 0;

  const citationsForProspect = new Set<string>();
  const citationsForCompetitors = new Set<string>();

  for (const r of results) {
    for (const domain of r.citationDomains) {
      const isProspectDomain = prospectDomainGuess
        ? domain.toLowerCase() === prospectDomainGuess.toLowerCase()
        : false;
      const isCompetitorDomain = competitorDomains.some(
        (cd) => cd.toLowerCase() === domain.toLowerCase(),
      );

      if (r.mentioned) {
        prospectTotalCitations++;
        if (isProspectDomain) {
          prospectOwnedCitations++;
          citationsForProspect.add(domain);
        }
        if (isEmployerRelevantDomain(domain)) {
          prospectEmployerCitations++;
        }
      }

      if (isCompetitorDomain) {
        competitorOwnedCitations++;
        citationsForCompetitors.add(domain);
      }
    }
  }

  // Gap platforms: domains cited for competitors but never for prospect.
  // Also add general platform gaps — domains that appear in competitor-mentioning responses
  // but never in prospect-mentioning responses (citation "presence" by platform).
  // In both cases, filter to employer-relevant platforms only so that junk domains
  // (asymm.com, softgist.com, etc.) are excluded from the actionable gap list.
  const prospectResponseDomains = new Set<string>();
  const competitorResponseDomains = new Set<string>();

  for (const r of results) {
    if (r.mentioned) {
      for (const d of r.citationDomains) prospectResponseDomains.add(d);
    }
    // Check if any competitor is mentioned in this response
    const lowerResp = r.response.toLowerCase();
    const competitorMentionedInResponse = competitorNames.some((c) =>
      lowerResp.includes(c.toLowerCase()),
    );
    if (competitorMentionedInResponse && !r.mentioned) {
      for (const d of r.citationDomains) {
        competitorResponseDomains.add(d);
        if (isEmployerRelevantDomain(d)) {
          competitorEmployerCitations++;
        }
      }
    }
  }

  // Only employer-relevant platforms surfaced as actionable gaps
  const ownedGaps = [...citationsForCompetitors].filter(
    (d) => !citationsForProspect.has(d) && isEmployerRelevantDomain(d),
  );
  const platformGaps = [...competitorResponseDomains].filter(
    (d) => !prospectResponseDomains.has(d) && isEmployerRelevantDomain(d),
  );
  const allGapPlatforms = Array.from(new Set([...ownedGaps, ...platformGaps]));

  // Build a human-readable citation finding that names specific employer platforms
  const citationFinding = buildCitationFinding(
    prospectName,
    prospectOwnedCitations,
    competitorOwnedCitations,
    allGapPlatforms,
    competitorEmployerCitations,
  );

  // ── Hook selection ────────────────────────────────────────

  const topCompetitorMentionRate =
    discoveryResults.length > 0 ? topCompetitorMentioned / discoveryResults.length : 0;

  // Classify visibility tier to drive hook scoring, headline framing, and DM template
  const visibilityTier = classifyVisibilityTier(discoveryMentionRate);

  const discoveryHook = scoreHook("discovery_absence", {
    prospectMentionRate: discoveryMentionRate,
    topCompetitorMentionRate,
    topCompetitorMentioned,
    topCompetitorName,
    prospectMentionCount: discoveryMentioned,
    queriesRun: discoveryResults.length,
  } as DiscoveryMetrics, visibilityTier);

  const contrastHook =
    worstComparison !== null
      ? scoreHook("competitor_contrast", {
          competitorFavored: worstComparison.competitorFavored,
          multipleCompetitorsFavored: competitorsFavoredCount >= 2,
          prospectSentiment: worstComparison.prospectSentiment,
          competitorName: worstComparison.competitorName,
          queryText: worstComparison.queryText,
          responseExcerpt: worstComparison.responseExcerpt,
        } as ContrastMetrics, visibilityTier)
      : { score: 0, headline: "", evidence: "", quotableText: "" };

  const reputationHook = scoreHook("reputation", {
    worstSentiment: worstSentimentValue === Infinity ? 0 : worstSentimentValue,
    keyIssue: worstResponse?.keyIssue ?? "unsourced_claims",
  } as ReputationMetrics, visibilityTier);

  const citationHook = scoreHook("citation_gap", {
    prospectOwnedCitations,
    competitorOwnedCitations,
  } as CitationMetrics, visibilityTier);

  // Tie-breaking order: discovery > contrast > reputation > citations
  const candidates: Array<{
    category: SnapshotSummary["primaryHook"]["category"];
    result: HookScoreResult;
  }> = [
    { category: "discovery_absence", result: discoveryHook },
    { category: "competitor_contrast", result: contrastHook },
    { category: "reputation", result: reputationHook },
    { category: "citation_gap", result: citationHook },
  ];

  let winner = candidates[0];
  for (const candidate of candidates.slice(1)) {
    if (candidate.result.score > winner.result.score) {
      winner = candidate;
    }
  }

  // Enrich quotableText for discovery and citation winners using quotable extraction.
  // If the extracted text is a label pattern (not prose), fall back to the evidence string
  // which is always formatted as a sentence.
  let quotableText = winner.result.quotableText;
  if (winner.category === "discovery_absence" && topGapQueries.length > 0) {
    // Use the top gap query's response for the quotable
    const topGap = topGapQueries[0]!;
    const gapResult = discoveryResults.find((r) => r.queryText === topGap.queryText);
    if (gapResult) {
      const extracted = extractQuotableText(gapResult.response, prospectName, competitorNames);
      quotableText = isLabelPattern(extracted) ? winner.result.evidence : extracted;
    }
  } else if (winner.category === "citation_gap" && reputationResults.length > 0) {
    if (worstResponse) {
      const excerpt = worstResponse.responseExcerpt;
      quotableText = isLabelPattern(excerpt) ? winner.result.evidence : excerpt;
    }
  } else if (winner.category === "reputation" && worstResponse) {
    const excerpt = worstResponse.responseExcerpt;
    quotableText = isLabelPattern(excerpt) ? winner.result.evidence : excerpt;
  }

  // ── Assemble base summary ───────────────────────────────

  const industry = results[0]?.industry;

  const baseSummary = {
    prospectName,
    totalQueries: results.length,
    discoveryMentionRate,
    discoveryMentionCount: discoveryMentioned,
    overallMentionRate,
    visibilityTier,

    discovery: {
      queriesRun: discoveryResults.length,
      prospectMentioned: discoveryMentioned,
      mentionRate: discoveryMentionRate,
      competitorRanking,
      topCompetitorName,
      topCompetitorMentioned,
      topGapQueries,
      themeBreakdown,
      allResults: discoveryAllResults,
    },

    competitorContrast: {
      queriesRun: contrastResults.length,
      competitorSummaries,
      worstComparison,
      allResults: contrastAllResults,
    },

    reputation: {
      queriesRun: reputationResults.length,
      avgSentiment,
      narrativeConsistency,
      recurringThemes,
      worstResponse,
    },

    citationGap: {
      prospectOwnedCitations,
      prospectTotalCitations,
      competitorOwnedCitations,
      gapPlatforms: allGapPlatforms,
      finding: citationFinding,
      prospectEmployerCitations,
      competitorEmployerCitations,
    },

    primaryHook: {
      category: winner.category,
      headline: winner.result.headline,
      evidence: winner.result.evidence,
      quotableText,
      findingStrength: findingStrength(winner.result.score),
    },
  } as const;

  // ── Build interpretation first, then DM from interpretation ──

  const interpretation = buildInterpretation(baseSummary, visibilityTier);

  const dmTemplate = buildDmTemplate(
    prospectName,
    interpretation,
    industry,
    visibilityTier,
  );

  return {
    ...baseSummary,
    interpretation,
    dmTemplate,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Returns true if a sentence looks like a data label pattern rather than prose.
 * Catches patterns like "Procore - Focus: Construction management software." or
 * "Procore Open Communication: Emphasizes transparency and open communication."
 * These are scraped list items, not quotable sentences.
 *
 * Exported so callers (e.g. snapshot display layer) can also reject label-pattern
 * text before rendering quotable content in UI.
 */
export function isLabelPattern(text: string): boolean {
  // Detects scraped data label patterns like:
  //   "Procore Open Communication: Emphasizes transparency..."  (no space before colon)
  //   "Procore - Focus: Construction management software."      (dash separator)
  //   "ServiceTitan: Field service management company."         (bare colon)
  //
  // Pattern: sentence starts with one or more Title-Case words, then an optional
  // space, then a dash or colon, then a space. The word-group + separator must
  // appear at the start of the sentence.
  //
  // Does NOT match prose like:
  //   "Procore is widely regarded as the clear winner..."
  //   "Candidates often consider one key factor: culture."   (lowercase lead word in phrase)
  return /^[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)* ?[-–:][ ]/.test(text.trim());
}

/**
 * Extracts a response excerpt for discovery scorecard.
 *
 * Priority order:
 *  1. Sentence mentioning MULTIPLE competitor names (list pattern) — most narrative
 *  2. Sentence mentioning any competitor and is long enough to be useful
 *  3. Sentence with 2+ commas (likely a list)
 *  4. Fallback to first 300 chars of the cleaned text
 *
 * Filters:
 *  - Skips sentences under 20 chars (bare label fragments)
 *  - Skips sentences that match isLabelPattern (data labels, not prose)
 */
function extractDiscoveryExcerpt(response: string, competitorNames: string[]): string {
  const clean = stripMarkdown(response).replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
  const sentences = splitSentences(clean);

  const MIN_EXCERPT_LENGTH = 20;

  const usable = sentences.filter(
    (s) => s.trim().length >= MIN_EXCERPT_LENGTH && !isLabelPattern(s),
  );

  // Pass 1: prefer sentences mentioning MULTIPLE competitors (most narrative)
  let bestMulti: string | null = null;
  let bestMultiCount = 1; // require at least 2 competitor mentions
  for (const sentence of usable) {
    const lower = sentence.toLowerCase();
    const count = competitorNames.filter((c) => lower.includes(c.toLowerCase())).length;
    if (count > bestMultiCount) {
      bestMultiCount = count;
      bestMulti = sentence;
    }
  }
  if (bestMulti) return bestMulti.trim();

  // Pass 2: first usable sentence mentioning any competitor
  for (const sentence of usable) {
    const lower = sentence.toLowerCase();
    if (competitorNames.some((c) => lower.includes(c.toLowerCase()))) {
      return sentence.trim();
    }
  }

  // Pass 3: first usable sentence with list-like patterns (2+ commas)
  for (const sentence of usable) {
    if ((sentence.match(/,/g) || []).length >= 2) {
      return sentence.trim();
    }
  }

  // Fallback to first 300 chars of the cleaned text
  return clean.slice(0, 300).trim();
}

/**
 * Attempts to infer the prospect's domain from result data.
 * The SnapshotResultData doesn't carry prospect domain directly, so we use
 * a simple heuristic: look for any cited domain that resembles the prospect name.
 */
function inferProspectDomain(
  prospectName: string,
  results: SnapshotResultData[],
): string | null {
  const namePart = prospectName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const allDomains = results.flatMap((r) => r.citationDomains);

  for (const domain of allDomains) {
    const domainBase = domain.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]/g, "");
    if (domainBase === namePart || domainBase.includes(namePart) || namePart.includes(domainBase)) {
      return domain;
    }
  }

  return null;
}

/**
 * Builds a human-readable citation finding that references specific employer
 * platforms by name rather than generic "sourced citations" language.
 *
 * Examples:
 *   "Competitors are cited alongside glassdoor.com and levels.fyi. ServiceTitan
 *    appears in zero responses citing these platforms."
 *   "AI cites glassdoor.com and linkedin.com in 12 responses about competing
 *    employers. Your company is not mentioned in any of them."
 */
function buildCitationFinding(
  prospectName: string,
  prospectOwnedCitations: number,
  competitorOwnedCitations: number,
  gapPlatforms: string[],
  competitorEmployerCitations: number,
): string {
  // If we have named employer gap platforms, produce a specific platform finding
  if (gapPlatforms.length > 0) {
    const platformList =
      gapPlatforms.length === 1
        ? gapPlatforms[0]!
        : gapPlatforms.length === 2
          ? `${gapPlatforms[0]} and ${gapPlatforms[1]}`
          : `${gapPlatforms.slice(0, 2).join(", ")}, and ${gapPlatforms[2]}`;

    const countClause =
      competitorEmployerCitations > 0
        ? ` (${competitorEmployerCitations} ${competitorEmployerCitations === 1 ? "time" : "times"})`
        : "";

    return (
      `Competitors are cited alongside ${platformList}${countClause}. ` +
      `${prospectName} appears in zero responses citing these platforms.`
    );
  }

  // No employer-relevant gap platforms found — fall back to owned citation counts
  if (prospectOwnedCitations === 0 && competitorOwnedCitations > 0) {
    return `0 sourced citations vs competitor's ${competitorOwnedCitations}`;
  }
  if (prospectOwnedCitations === 0) {
    return `0 sourced citations found for ${prospectName}`;
  }
  return (
    `${prospectOwnedCitations} sourced citation${prospectOwnedCitations === 1 ? "" : "s"} ` +
    `vs competitor's ${competitorOwnedCitations}`
  );
}

/**
 * Infers a theme label from query text when no explicit theme tag is available.
 * Uses keyword matching against the 10 discovery themes.
 */
function inferThemeFromQuery(queryText: string): string {
  const lower = queryText.toLowerCase();

  if (lower.includes("compensation") || lower.includes("pay") || lower.includes("salary") || lower.includes("paying")) {
    return "compensation";
  }
  if (lower.includes("culture") || lower.includes("values") || lower.includes("environment") || lower.includes("happy")) {
    return "culture";
  }
  if (lower.includes("career") || lower.includes("growth") || lower.includes("development") || lower.includes("promote")) {
    return "career growth";
  }
  if (lower.includes("work life balance") || lower.includes("work-life") || lower.includes("flexibility") || lower.includes("balance")) {
    return "work-life balance";
  }
  if (lower.includes("remote") || lower.includes("hybrid")) {
    return "remote & hybrid";
  }
  if (lower.includes("diversity") || lower.includes("inclusion") || lower.includes("women")) {
    return "diversity & inclusion";
  }
  if (lower.includes("innovation") || lower.includes("technology") || lower.includes("engineering") || lower.includes("innovative")) {
    return "innovation";
  }
  if (lower.includes("leadership") || lower.includes("management") || lower.includes("managed")) {
    return "leadership";
  }
  if (lower.includes("benefits") || lower.includes("perks")) {
    return "benefits";
  }

  return "general reputation";
}

/**
 * Extracts a human-readable dimension label from a contrast query text.
 *
 * Maps query patterns like "which has better culture" or "career growth"
 * to clean labels like "culture" or "career growth".
 */
function extractDimensionFromQuery(queryText: string): string | null {
  const lower = queryText.toLowerCase();
  if (lower.includes("culture")) return "culture";
  if (lower.includes("career growth") || lower.includes("growth opportunities")) return "career growth";
  if (lower.includes("pay") || lower.includes("compensation") || lower.includes("salary")) return "compensation";
  if (lower.includes("engineering") || lower.includes("innovative") || lower.includes("innovation")) return "engineering";
  if (lower.includes("work-life") || lower.includes("balance")) return "work-life balance";
  return null;
}

// ─── Interpretation builder ──────────────────────────────────
//
// Produces the curated "analyst-prepared" interpretation layer for the
// snapshot page: 1 strength, 2 opportunities (different types), a
// primary takeaway sentence, and a bridge to the full assessment.

type InterpretationSourceSummary = Omit<SnapshotSummary, "interpretation" | "dmTemplate">;

// ─── Multi-dimensional scoring model ────────────────────────
//
// ASSESSMENT OF PRIOR MODEL (preserved for posterity):
//
// 1. Single-score ranking. Every candidate gets one number, collapsing
//    commercial urgency, specificity, and actionability into a single
//    magnitude value. A generic "absent from 65 queries" discovery gap
//    (score 405) always buries a pointed "AI favors Stripe over you on
//    culture" contrast finding (score 130) even though the latter is
//    far more likely to make a TA leader care.
//
// 2. No role-specific weighting. The strength card and both opportunity
//    cards used the same scoring dimensions. Card 1 (trigger) and Card 2
//    (lever) should optimize for urgency and actionability respectively.
//
// 3. No redundancy penalty. Two discovery_gap candidates could both win,
//    producing two nearly identical opportunity cards that repeat the
//    same problem in different words.
//
// 4. Tier awareness was limited to multipliers on theme/reputation
//    strength scores. The opportunity side had no tier-driven rebalancing.
//    At HIGH vis, a broad discovery gap is less interesting than at LOW vis.
//
// 5. Broad discovery strength always dominated at HIGH vis despite the
//    0.7 multiplier. A 49% broad rate (score ~99*0.7=69) still beat a
//    55% theme rate (score ~85*1.3=110) only when the theme rate was very
//    high. Mid-range themes (50-55%) were undersurfaced.
//
// 6. No specificity scoring. A finding that names "Procore on culture"
//    was scored the same as "competitors in some queries" despite being
//    far more commercially useful in outreach.
//
// 7. No actionability scoring. "Publish on Levels.fyi" and "improve
//    overall presence" were weighted identically.

// ─── Subset bias diagnosis ───────────────────────────────────
//
// WHERE SUBSET BIAS ENTERS THE RANKING:
//
// 1. rankStrengths() theme candidates: scored on themePct (e.g. 80% of 5
//    queries) with no sample-size normalization. A 4/5 theme beats a
//    26/65 broad signal even though 5 queries of support < 26.
// 2. rankOpportunities() discovery gap: magnitude/urgency driven by
//    topGapQueries (capped at 5) and absentCount from the capped list,
//    not the full (queriesRun - prospectMentioned).
// 3. rankOpportunities() weak theme: only requires queriesRun >= 2,
//    so a 2-query theme at 0% can become an opportunity card.
// 4. compositeScore(): dimension weights never account for sample size.
//    A finding backed by 3 queries gets the same weight as one backed by 50.
// 5. Strength theme eligibility: no minimum queriesRun, so a 3-query
//    theme at 100% beats a 65-query broad rate at 35%.
//
// FIX: SupportMetadata + coverage multiplier + minimum support thresholds.

/**
 * Tracks how many queries back a finding and what fraction of the scan
 * that represents. Used to prevent narrow subsets from dominating ranking.
 */
export interface SupportMetadata {
  /** How many queries back this finding */
  supportCount: number;
  /** How many queries in this finding's category */
  categoryTotal: number;
  /** Total queries in the scan (typically 100) */
  fullScanTotal: number;
  /** supportCount / categoryTotal */
  supportRate: number;
  /** supportCount / fullScanTotal */
  coverageOfFullScan: number;
  /** supportCount >= 20 or covers >30% of scan */
  isBroadPattern: boolean;
}

function buildSupport(
  supportCount: number,
  categoryTotal: number,
  fullScanTotal: number,
): SupportMetadata {
  return {
    supportCount,
    categoryTotal,
    fullScanTotal,
    supportRate: categoryTotal > 0 ? supportCount / categoryTotal : 0,
    coverageOfFullScan: fullScanTotal > 0 ? supportCount / fullScanTotal : 0,
    isBroadPattern: supportCount >= 20 || (fullScanTotal > 0 && supportCount / fullScanTotal > 0.3),
  };
}

/**
 * Coverage multiplier: rewards findings backed by larger samples.
 * Ranges from 0.4 (tiny sample, 1-5 queries) to 1.0 (broad pattern, 20+ queries).
 *
 * - 1-5 queries: 40-55% of raw score
 * - 10 queries: ~70%
 * - 20+ queries: 100%
 *
 * Never reduces a score to zero — small findings can still win if
 * dramatically stronger on other dimensions.
 */
export function coverageMultiplier(support: SupportMetadata): number {
  return Math.min(1.0, 0.4 + 0.6 * Math.min(support.supportCount / 20, 1));
}

// ─── Minimum support thresholds ──────────────────────────────

/** Minimum queries for a theme to be eligible as the strength card. */
export const MIN_THEME_STRENGTH_QUERIES = 8;
/** Minimum queries for a reputation finding to be eligible as the strength card. */
export const MIN_REPUTATION_STRENGTH_QUERIES = 5;
/** Minimum gap queries for a discovery gap opportunity to be eligible. */
export const MIN_GAP_OPPORTUNITY_QUERIES = 5;
/** Minimum contrast queries for a contrast opportunity to be eligible. */
export const MIN_CONTRAST_OPPORTUNITY_QUERIES = 3;
/** Minimum queries for a weak theme opportunity to be eligible. */
export const MIN_WEAK_THEME_QUERIES = 5;

/**
 * Multi-dimensional candidate score.
 * Each finding is evaluated on four axes before being weighted per card role.
 */
export interface CandidateScore {
  /** Raw signal strength — how big is this finding? (0-100) */
  magnitude: number;
  /** Commercial urgency — does this imply candidate loss or competitive displacement? (0-100) */
  urgency: number;
  /** Specificity — named competitors, themes, platforms, concrete numbers? (0-100) */
  specificity: number;
  /** Actionability — clear intervention point? (0-100) */
  actionability: number;
}

/** Card role determines how the four dimensions are weighted. */
type CardRole = "strength" | "trigger" | "lever";

const ROLE_WEIGHTS: Record<CardRole, { magnitude: number; urgency: number; specificity: number; actionability: number }> = {
  strength: { magnitude: 0.3, urgency: 0.1, specificity: 0.4, actionability: 0.2 },
  trigger:  { magnitude: 0.3, urgency: 0.4, specificity: 0.2, actionability: 0.1 },
  lever:    { magnitude: 0.2, urgency: 0.1, specificity: 0.3, actionability: 0.4 },
};

function compositeScore(dims: CandidateScore, role: CardRole): number {
  const w = ROLE_WEIGHTS[role];
  return dims.magnitude * w.magnitude + dims.urgency * w.urgency + dims.specificity * w.specificity + dims.actionability * w.actionability;
}

/** Threshold below which a strength candidate gets the "Relative Bright Spot" label. */
const WEAK_STRENGTH_THRESHOLD = 22;

/**
 * Redundancy penalty: same source type across cards → penalize the weaker one.
 * Returns a multiplier (1.0 = no penalty, 0.7 = 30% penalty, etc.).
 */
const SAME_SOURCE_PENALTY = 0.7;   // opp1 & opp2 share source type
const STRENGTH_OVERLAP_PENALTY = 0.8; // strength & opportunity share source

// ─── Semantic coherence metadata ─────────────────────────────
//
// WHY THIS EXISTS: Strength and opportunity candidates are scored independently.
// The source-type redundancy penalty (above) prevents two discovery_gap cards
// from co-occurring, but it cannot detect SEMANTIC contradictions. For example,
// "Strong culture theme visibility" (source: discovery) and "Competitors win on
// culture" (source: contrast) have DIFFERENT source types so the penalty never
// fires — yet the pair is contradictory: the strength says culture is strong
// while the opportunity says culture is weak.
//
// CandidateMetadata tags each candidate with its semantic dimension, named
// competitor, scope, and polarity so that a post-selection coherence check
// can detect and resolve these contradictions without changing scoring logic.

interface CandidateMetadata {
  /** Which theme/dimension this finding is about (undefined = broad/general) */
  dimension?: string;        // "culture", "compensation", "career growth", "leadership", etc.
  /** Which specific competitor is named (undefined = general) */
  namedCompetitor?: string;  // "Procore", "AppFolio", etc.
  /** Scope: is this about broad presence or a specific slice? */
  scope: "broad" | "theme" | "competitor" | "platform";
  /** Polarity: is this finding positive or negative about the prospect? */
  polarity: "positive" | "negative";
}

interface StrengthCandidate {
  dims: CandidateScore;
  support: SupportMetadata;
  title: string;
  detail: string;
  source: SnapshotInterpretation["strength"]["source"];
  meta: CandidateMetadata;
  /** When true, this candidate does not meet minimum support thresholds for its card type. */
  belowThreshold?: boolean;
}

interface OpportunityCandidate {
  dims: CandidateScore;
  support: SupportMetadata;
  title: string;
  detail: string;
  source: SnapshotInterpretation["opportunities"][0]["source"];
  type: "visibility" | "citation_narrative";
  meta: CandidateMetadata;
  /** When true, this candidate does not meet minimum support thresholds for its card type. */
  belowThreshold?: boolean;
}

/** Scored strength candidate, used internally for coherence resolution. */
interface RankedStrength {
  composite: number;
  label: string;
  title: string;
  detail: string;
  source: SnapshotInterpretation["strength"]["source"];
  meta: CandidateMetadata;
  support: SupportMetadata;
  belowThreshold?: boolean;
}

/**
 * Returns ALL strength candidates, ranked by composite score.
 * The caller picks the winner (normally index 0) and can fall back
 * to later indices when the coherence check flags a contradiction.
 */
function rankStrengths(
  s: InterpretationSourceSummary,
): RankedStrength[] {
  const candidates: StrengthCandidate[] = [];
  const pct = Math.round(s.discoveryMentionRate * 100);
  const isHighVis = s.visibilityTier === "high";
  const isLowVis = s.visibilityTier === "low";
  const fullScanTotal = s.totalQueries;

  // ── Candidate generation ──────────────────────────────────

  // Strong discovery presence (broad — always backed by the full discovery set)
  if (s.discoveryMentionRate > 0.3) {
    const supportCount = s.discovery.prospectMentioned;
    candidates.push({
      dims: {
        magnitude: Math.min(100, 40 + pct),
        urgency: 10,    // a strength doesn't create urgency
        // Broad discovery is less specific — no named theme or competitor
        specificity: isHighVis ? 15 : 40, // at HIGH vis, broad rate is table stakes
        actionability: 20,
      },
      support: buildSupport(supportCount, s.discovery.queriesRun, fullScanTotal),
      title: "Strong broad discovery visibility",
      detail:
        `${s.prospectName} appears in ${pct}% of broad employer discovery queries, the highest among assessed competitors. ` +
        `When candidates ask AI "who are the best companies to work for" in this space, ${s.prospectName} is frequently named.`,
      source: "discovery",
      meta: { scope: "broad", polarity: "positive" },
    });
  }

  // Dominant vs competitors
  const topComp = s.discovery.competitorRanking[0];
  if (topComp && s.discoveryMentionRate > topComp.mentionRate * 2 && s.discoveryMentionRate > 0.1) {
    const compPct = Math.round(topComp.mentionRate * 100);
    const gap = pct - compPct;
    const supportCount = s.discovery.prospectMentioned;
    candidates.push({
      dims: {
        magnitude: Math.min(100, 30 + gap * 2),
        urgency: 10,
        // Names the top competitor — moderate specificity
        specificity: 45 + (gap > 20 ? 15 : 0),
        actionability: 25,
      },
      support: buildSupport(supportCount, s.discovery.queriesRun, fullScanTotal),
      title: `Dominant over competitors in discovery`,
      detail:
        `${s.prospectName} appears in ${pct}% of discovery queries vs ${topComp.name} at ${compPct}% — ` +
        `a ${gap} percentage point lead that gives ${s.prospectName} the strongest AI presence among the competitors tested.`,
      source: "discovery",
      meta: { scope: "competitor", namedCompetitor: topComp.name, polarity: "positive" },
    });
  }

  // Strong theme — sorted worst-first, so iterate in reverse for best theme
  const bestThemes = [...s.discovery.themeBreakdown].sort((a, b) => b.mentionRate - a.mentionRate);
  for (const theme of bestThemes) {
    if (theme.mentionRate > 0.5) {
      const themePct = Math.round(theme.mentionRate * 100);
      const themeSupport = buildSupport(theme.prospectMentioned, theme.queriesRun, fullScanTotal);
      candidates.push({
        dims: {
          magnitude: Math.min(100, 20 + themePct),
          urgency: 10,
          // Names a specific theme — high specificity
          specificity: 60 + (themePct > 70 ? 15 : 0),
          actionability: 35, // theme strengths imply a defensible position
        },
        support: themeSupport,
        title: `Strong ${theme.theme} theme visibility`,
        detail:
          `${s.prospectName} appears in ${themePct}% of ${theme.theme} queries — ` +
          `${theme.prospectMentioned} of ${theme.queriesRun} queries in this theme mention the company.`,
        source: "discovery",
        meta: { dimension: theme.theme, scope: "theme", polarity: "positive" },
        // Theme strengths need minimum support to be eligible as the top card
        belowThreshold: theme.queriesRun < MIN_THEME_STRENGTH_QUERIES,
      });
      break; // only pick the best theme
    }
  }

  // Positive reputation
  if (s.reputation.avgSentiment > 0.1 && (!s.reputation.worstResponse || !s.reputation.worstResponse.keyIssue.includes("negative"))) {
    candidates.push({
      dims: {
        magnitude: Math.min(100, 20 + s.reputation.avgSentiment * 100),
        urgency: 10,
        specificity: 35, // reputation framing is moderately specific
        actionability: 30,
      },
      support: buildSupport(s.reputation.queriesRun, s.reputation.queriesRun, fullScanTotal),
      title: "Positive employer reputation framing",
      detail:
        `AI frames ${s.prospectName} positively when candidates research the company directly, ` +
        `with an average sentiment score of ${s.reputation.avgSentiment > 0 ? "+" : ""}${s.reputation.avgSentiment.toFixed(2)} across ${s.reputation.queriesRun} reputation queries.`,
      source: "reputation",
      meta: { scope: "broad", polarity: "positive" },
      belowThreshold: s.reputation.queriesRun < MIN_REPUTATION_STRENGTH_QUERIES,
    });
  }

  // Good citation coverage
  if (s.citationGap.prospectEmployerCitations > 5) {
    candidates.push({
      dims: {
        magnitude: Math.min(100, 15 + s.citationGap.prospectEmployerCitations * 3),
        urgency: 5,
        specificity: 30,
        actionability: 25,
      },
      // Citation coverage is derived from all queries — broad support
      support: buildSupport(s.citationGap.prospectEmployerCitations, fullScanTotal, fullScanTotal),
      title: "Good employer citation coverage",
      detail:
        `AI cites ${s.citationGap.prospectEmployerCitations} employer-relevant sources when discussing ${s.prospectName}, ` +
        `providing candidates with sourced information about the company as an employer.`,
      source: "citation",
      meta: { scope: "broad", polarity: "positive" },
    });
  }

  // Moderate discovery (weaker positive)
  if (s.discoveryMentionRate >= 0.1 && s.discoveryMentionRate <= 0.3) {
    const supportCount = s.discovery.prospectMentioned;
    candidates.push({
      dims: {
        // At LOW vis, any genuine discovery presence is more valuable.
        // Moderate discovery is a real positive — not exciting, but genuine.
        magnitude: isLowVis ? 40 + pct : 25 + pct,
        urgency: 10,
        specificity: 20,
        actionability: 20,
      },
      support: buildSupport(supportCount, s.discovery.queriesRun, fullScanTotal),
      title: "Moderate discovery presence",
      detail:
        `${s.prospectName} appears in ${pct}% of discovery queries — not invisible, ` +
        `but below the threshold where AI consistently surfaces the company to candidates.`,
      source: "discovery",
      meta: { scope: "broad", polarity: "positive" },
    });
  }

  // ── Score with coverage multiplier, rank, and return all ──────

  // Check if ALL candidates are below threshold — if so, relax thresholds
  const allBelowThreshold = candidates.length > 0 && candidates.every(c => c.belowThreshold);

  const scored: RankedStrength[] = candidates
    .map(c => {
      const rawComposite = compositeScore(c.dims, "strength");
      const cm = coverageMultiplier(c.support);
      // Below-threshold candidates get a heavy penalty (25% of score) unless
      // ALL candidates are below threshold (fallback mode)
      const thresholdPenalty = (c.belowThreshold && !allBelowThreshold) ? 0.25 : 1.0;
      return {
        composite: rawComposite * cm * thresholdPenalty,
        label: "", // filled below
        title: c.title,
        detail: c.detail,
        source: c.source,
        meta: c.meta,
        support: c.support,
        belowThreshold: c.belowThreshold,
      };
    })
    .sort((a, b) => b.composite - a.composite)
    .map(c => ({
      ...c,
      label: c.composite < WEAK_STRENGTH_THRESHOLD ? "Relative Bright Spot" : "Where You Win",
    }));

  // Always include fallbacks so the coherence resolver has alternatives
  const fallbackSupport = buildSupport(s.discovery.prospectMentioned, s.discovery.queriesRun, fullScanTotal);
  if (s.discoveryMentionRate > 0) {
    scored.push({
      composite: 0,
      label: "Relative Bright Spot",
      title: "Some discovery presence exists",
      detail:
        `${s.prospectName} appears in ${pct}% of discovery queries. While below average, ` +
        `this is a foundation that targeted content investment can build on.`,
      source: "discovery",
      meta: { scope: "broad", polarity: "positive" },
      support: fallbackSupport,
    });
  }

  scored.push({
    composite: 0,
    label: "Relative Bright Spot",
    title: "AI knows the company exists",
    detail:
      `While ${s.prospectName} does not appear in any discovery queries, AI does reference the company ` +
      `in direct reputation queries. The company has a starting point for building visibility.`,
    source: "reputation",
    meta: { scope: "broad", polarity: "positive" },
    support: buildSupport(s.reputation.queriesRun, s.reputation.queriesRun, fullScanTotal),
  });

  return scored;
}

/** Legacy wrapper — picks the top-ranked strength. */
function selectStrength(
  s: InterpretationSourceSummary,
): SnapshotInterpretation["strength"] {
  const ranked = rankStrengths(s);
  const best = ranked[0]!;
  return { label: best.label, title: best.title, detail: best.detail, source: best.source };
}

/** Scored opportunity candidate, used internally for coherence resolution. */
interface RankedOpportunity {
  triggerScore: number;
  leverScore: number;
  title: string;
  detail: string;
  source: SnapshotInterpretation["opportunities"][0]["source"];
  type: "visibility" | "citation_narrative";
  meta: CandidateMetadata;
  support: SupportMetadata;
  belowThreshold?: boolean;
}

/**
 * Returns ALL opportunity candidates, scored for both trigger and lever roles.
 * The caller picks the pair (normally top-trigger + top-lever-with-penalties)
 * and can swap when the coherence check flags a contradiction with the strength.
 */
function rankOpportunities(
  s: InterpretationSourceSummary,
): RankedOpportunity[] {
  const candidates: OpportunityCandidate[] = [];
  const isHighVis = s.discoveryMentionRate > HIGH_VISIBILITY_THRESHOLD;
  const fullScanTotal = s.totalQueries;

  // ── Visibility / competitive gap candidates ────────────────

  // Discovery gap — rank based on FULL discovery analysis, not just topGapQueries.
  // topGapQueries is used for detail text (evidence) only; ranking uses:
  //   totalAbsent = queriesRun - prospectMentioned (the full gap breadth)
  const totalAbsent = s.discovery.queriesRun - s.discovery.prospectMentioned;
  if (totalAbsent > 0) {
    const topGap = s.discovery.topGapQueries[0];
    const competitorList = topGap ? formatList(topGap.competitorsMentioned.slice(0, 3)) : "";
    // Use full absent count, not the capped topGapQueries list
    const totalDiscovery = s.discovery.queriesRun;

    let gapTitle: string;
    let gapDetail: string;

    if (isHighVis && totalAbsent > 0) {
      gapTitle = "Specific discovery gaps despite strong visibility";
      gapDetail =
        `Despite strong overall visibility, ${s.prospectName} is absent from ${totalAbsent} of ${totalDiscovery} discovery queries ` +
        `where competitors like ${competitorList || "others"} appear instead — these are the specific queries worth investigating.`;
    } else {
      gapTitle = "Absent from key discovery queries";
      gapDetail =
        `In ${totalAbsent} of ${totalDiscovery} discovery queries, AI recommends ${competitorList || "competitors"} but not ${s.prospectName}. ` +
        `These are high-intent queries where candidates are actively looking for employers.`;
    }

    // Specificity: names competitors from the gap queries
    const hasNamedCompetitors = topGap != null && topGap.competitorsMentioned.length > 0;
    // Urgency: based on the FULL discovery absence, not capped gap list
    const discoveryAbsencePct = Math.round((1 - s.discoveryMentionRate) * 100);
    const gapUrgency = isHighVis
      ? Math.min(100, 20 + totalAbsent * 0.5 + (discoveryAbsencePct > 70 ? 10 : 0))
      : Math.min(100, 35 + discoveryAbsencePct * 0.4 + (totalAbsent > 30 ? 15 : 0) + (s.discoveryMentionRate === 0 ? 20 : 0));

    // Discovery gap support = total absent queries from the full scan
    const gapSupport = buildSupport(totalAbsent, totalDiscovery, fullScanTotal);
    // Reduce urgency when gap queries are sparse (fewer than MIN_GAP_OPPORTUNITY_QUERIES absent)
    const gapAbsentQueries = s.discovery.topGapQueries.filter(g => !g.prospectMentioned).length;
    const narrowGapUrgencyPenalty = gapAbsentQueries < MIN_GAP_OPPORTUNITY_QUERIES && totalAbsent < MIN_GAP_OPPORTUNITY_QUERIES
      ? 0.7 : 1.0;

    candidates.push({
      dims: {
        magnitude: Math.min(100, 30 + discoveryAbsencePct * 0.5 + totalAbsent * 0.5),
        urgency: Math.round(gapUrgency * narrowGapUrgencyPenalty),
        specificity: hasNamedCompetitors ? 45 : 20,
        actionability: 30, // generic — no clear single intervention point
      },
      support: gapSupport,
      title: gapTitle,
      detail: gapDetail,
      source: "discovery_gap",
      type: "visibility",
      meta: { scope: "broad", polarity: "negative" },
      belowThreshold: totalAbsent < MIN_GAP_OPPORTUNITY_QUERIES,
    });
  }

  // Competitor favored in contrast
  const favoredCompetitors = s.competitorContrast.competitorSummaries.filter(
    cs => cs.competitorFavoredCount > 0,
  );
  if (favoredCompetitors.length > 0) {
    const totalFavored = favoredCompetitors.reduce((sum, cs) => sum + cs.competitorFavoredCount, 0);
    const favoredNames = favoredCompetitors.map(cs => cs.competitorName);
    const dimensionsUsed: string[] = [];
    for (const cs of favoredCompetitors) {
      if (cs.worstDimension) {
        const dim = extractDimensionFromQuery(cs.worstDimension);
        if (dim && !dimensionsUsed.includes(dim)) dimensionsUsed.push(dim);
      }
    }
    const dimText = dimensionsUsed.length > 0 ? ` on ${formatList(dimensionsUsed)}` : "";

    // Determine metadata: if all favored dimensions collapse to a single theme, tag it.
    // Otherwise this is a broad competitive issue.
    const contrastMeta: CandidateMetadata = dimensionsUsed.length === 1
      ? { dimension: dimensionsUsed[0], scope: "competitor", polarity: "negative",
          namedCompetitor: favoredNames.length === 1 ? favoredNames[0] : undefined }
      : { scope: "competitor", polarity: "negative",
          namedCompetitor: favoredNames.length === 1 ? favoredNames[0] : undefined };

    const contrastSupport = buildSupport(totalFavored, s.competitorContrast.queriesRun, fullScanTotal);

    candidates.push({
      dims: {
        magnitude: Math.min(100, 40 + totalFavored * 12),
        // Competitor explicitly favored = high urgency (candidate loss)
        urgency: Math.min(100, 60 + totalFavored * 8 + (favoredCompetitors.length > 1 ? 15 : 0)),
        // Names specific competitors and dimensions
        specificity: Math.min(100, 40 + favoredNames.length * 15 + dimensionsUsed.length * 10),
        actionability: 30 + dimensionsUsed.length * 10,
      },
      support: contrastSupport,
      title: "Competitive comparison vulnerability",
      detail:
        `When candidates directly compare ${s.prospectName} against ${formatList(favoredNames)}, ` +
        `AI highlights competitors' advantages${dimText}. ` +
        `${favoredCompetitors.length} of ${s.competitorContrast.competitorSummaries.length} competitors ` +
        `${favoredCompetitors.length === 1 ? "was" : "were"} favored in head-to-head queries.`,
      source: "contrast",
      type: "visibility",
      meta: contrastMeta,
      belowThreshold: totalFavored < MIN_CONTRAST_OPPORTUNITY_QUERIES,
    });
  }

  // Weak theme
  const weakThemes = s.discovery.themeBreakdown.filter(t => t.mentionRate < 0.1 && t.queriesRun >= 2);
  if (weakThemes.length > 0) {
    const worst = weakThemes[0]!; // already sorted worst-first
    const themePct = Math.round(worst.mentionRate * 100);
    const weakThemeSupport = buildSupport(worst.queriesRun - worst.prospectMentioned, worst.queriesRun, fullScanTotal);

    candidates.push({
      dims: {
        magnitude: Math.min(100, 30 + (10 - themePct) * 5),
        urgency: 35, // moderate — specific theme weakness
        specificity: 55, // names a specific theme
        actionability: 40, // theme-specific content is actionable
      },
      support: weakThemeSupport,
      title: `Weak ${worst.theme} visibility`,
      detail:
        `${s.prospectName} appears in only ${themePct}% of ${worst.theme} queries ` +
        `(${worst.prospectMentioned} of ${worst.queriesRun}). ` +
        `Candidates asking about ${worst.theme} are unlikely to discover the company.`,
      source: "discovery_gap",
      type: "visibility",
      meta: { dimension: worst.theme, scope: "theme", polarity: "negative" },
      belowThreshold: worst.queriesRun < MIN_WEAK_THEME_QUERIES,
    });
  }

  // ── Citation / source / narrative gap candidates ───────────

  // Zero owned citations — derived from full citation analysis across ALL queries
  if (s.citationGap.prospectOwnedCitations === 0) {
    const citationDetail = s.citationGap.prospectTotalCitations > 0
      ? `Across queries mentioning ${s.prospectName}, AI cited ${s.citationGap.prospectTotalCitations} third-party sources ` +
        `but none from the company's own domain. No content from ${s.prospectName}'s website appears in AI's employer narrative.`
      : `AI cites zero sources from ${s.prospectName}'s own domain. Every claim AI makes about ${s.prospectName} as an employer ` +
        `is unsourced or drawn from third parties, giving the company no control over its AI narrative.`;

    // Citation analysis spans all queries (not just citation_source category)
    candidates.push({
      dims: {
        magnitude: 70,
        urgency: 50 + (s.citationGap.competitorOwnedCitations > 0 ? 20 : 0),
        specificity: 40, // "zero owned" is concrete but not platform-specific
        actionability: 60, // clear lever: publish content on your own domain
      },
      support: buildSupport(fullScanTotal, fullScanTotal, fullScanTotal), // analyzed across ALL queries
      title: "Zero owned citations",
      detail: citationDetail,
      source: "citation",
      type: "citation_narrative",
      meta: { scope: "platform", polarity: "negative" },
    });
  }

  // Employer platform gaps
  if (s.citationGap.gapPlatforms.length > 0) {
    const platformList = formatList(s.citationGap.gapPlatforms.slice(0, 3));
    candidates.push({
      dims: {
        magnitude: Math.min(100, 40 + s.citationGap.gapPlatforms.length * 10),
        urgency: 30,
        // Names specific platforms — high specificity and actionability
        specificity: Math.min(100, 50 + s.citationGap.gapPlatforms.length * 15),
        actionability: Math.min(100, 60 + s.citationGap.gapPlatforms.length * 10),
      },
      support: buildSupport(fullScanTotal, fullScanTotal, fullScanTotal), // analyzed across ALL queries
      title: "Missing from employer platforms",
      detail:
        `Competitors are cited alongside ${platformList}, but ${s.prospectName} is absent from these sources. ` +
        `These platforms are where candidates validate employer claims.`,
      source: "citation",
      type: "citation_narrative",
      meta: { scope: "platform", polarity: "negative" },
    });
  }

  // Negative reputation framing
  if (s.reputation.worstResponse?.keyIssue === "negative_framing") {
    candidates.push({
      dims: {
        magnitude: 60,
        urgency: 55 + (Math.abs(s.reputation.worstResponse.sentiment) > 0.5 ? 15 : 0),
        specificity: 35, // mentions negative framing but not always specific
        actionability: 25, // hard to fix AI narrative directly
      },
      support: buildSupport(s.reputation.queriesRun, s.reputation.queriesRun, fullScanTotal),
      title: "Negative reputation framing in AI responses",
      detail:
        `AI uses negative framing when describing ${s.prospectName} as an employer. ` +
        `The worst reputation query (sentiment: ${s.reputation.worstResponse.sentiment.toFixed(2)}) ` +
        `surfaces concerns that candidates will see when researching the company.`,
      source: "reputation",
      type: "citation_narrative",
      meta: { scope: "broad", polarity: "negative" },
    });
  }

  // Narrative inconsistency
  if (s.reputation.narrativeConsistency === "contradictory") {
    candidates.push({
      dims: {
        magnitude: 40,
        urgency: 35,
        specificity: 25,
        actionability: 30,
      },
      support: buildSupport(s.reputation.queriesRun, s.reputation.queriesRun, fullScanTotal),
      title: "Contradictory AI narrative",
      detail:
        `AI gives contradictory answers about ${s.prospectName} as an employer — some responses are positive ` +
        `while others are negative. This inconsistency undermines candidate confidence.`,
      source: "reputation",
      type: "citation_narrative",
      meta: { scope: "broad", polarity: "negative" },
    });
  }

  // Low sourced rate
  const totalResponses = s.totalQueries;
  const sourcedRate = totalResponses > 0
    ? (s.citationGap.prospectTotalCitations > 0 ? s.citationGap.prospectTotalCitations / totalResponses : 0)
    : 0;
  if (sourcedRate < 0.5 && s.citationGap.prospectOwnedCitations > 0) {
    candidates.push({
      dims: {
        magnitude: 30,
        urgency: 20,
        specificity: 15,
        actionability: 25,
      },
      support: buildSupport(fullScanTotal, fullScanTotal, fullScanTotal),
      title: "Low citation sourcing rate",
      detail:
        `AI sources information about ${s.prospectName} in fewer than half of responses. ` +
        `Most claims about the company as an employer are unsourced assertions.`,
      source: "citation",
      type: "citation_narrative",
      meta: { scope: "broad", polarity: "negative" },
    });
  }

  // Product focus in reputation
  if (s.reputation.worstResponse?.keyIssue === "product_focus") {
    candidates.push({
      dims: {
        magnitude: 50,
        urgency: 40,
        specificity: 45, // identifies a specific narrative problem
        actionability: 50, // clear fix: produce employer-specific content
      },
      support: buildSupport(s.reputation.queriesRun, s.reputation.queriesRun, fullScanTotal),
      title: "AI describes the product, not the employer",
      detail:
        `When candidates ask about ${s.prospectName} as an employer, AI responds with product descriptions ` +
        `instead of employer brand information. The company's identity as a workplace is not established in AI.`,
      source: "reputation",
      type: "citation_narrative",
      meta: { scope: "broad", polarity: "negative" },
    });
  }

  // ── Score all candidates with coverage multiplier ──────────

  // Check if ALL candidates are below threshold
  const allBelowThreshold = candidates.length > 0 && candidates.every(c => c.belowThreshold);

  return candidates.map(c => {
    const cm = coverageMultiplier(c.support);
    const thresholdPenalty = (c.belowThreshold && !allBelowThreshold) ? 0.25 : 1.0;
    return {
      triggerScore: compositeScore(c.dims, "trigger") * cm * thresholdPenalty,
      leverScore: compositeScore(c.dims, "lever") * cm * thresholdPenalty,
      title: c.title,
      detail: c.detail,
      source: c.source,
      type: c.type,
      meta: c.meta,
      support: c.support,
      belowThreshold: c.belowThreshold,
    };
  });
}

/**
 * Selects the best (opp1, opp2) pair from ranked candidates, applying
 * source-type redundancy penalties. Returns the pair as output cards.
 */
function pickOpportunityPair(
  ranked: RankedOpportunity[],
  strengthSource?: SnapshotInterpretation["strength"]["source"],
  excludeIndices: Set<number> = new Set(),
): SnapshotInterpretation["opportunities"] {
  const available = ranked.filter((_, i) => !excludeIndices.has(i));

  // Sort by trigger score to find opp1 candidate
  const byTrigger = [...available].sort((a, b) => b.triggerScore - a.triggerScore);

  if (byTrigger.length === 0) {
    return [
      {
        label: "Where You're Missing",
        title: "Limited data for gap analysis",
        detail: `The snapshot did not surface enough data to identify a specific visibility gap.`,
        source: "discovery_gap" as const,
      },
      {
        label: "Biggest Opportunity",
        title: "Limited data for narrative analysis",
        detail: `The snapshot did not surface enough data to identify a specific citation or narrative gap.`,
        source: "citation" as const,
      },
    ];
  }

  // Pick opp1 as the highest trigger-scored candidate
  const opp1 = byTrigger[0]!;

  // Pick opp2: score remaining candidates for lever role, with redundancy penalties
  const remaining = available.filter(c => c !== opp1);
  const opp2Candidates = remaining.map(c => {
    let adjustedScore = c.leverScore;

    // Redundancy penalty: same source type as opp1
    if (c.source === opp1.source) {
      adjustedScore *= SAME_SOURCE_PENALTY;
    }

    // Redundancy penalty: same source as strength card
    if (strengthSource) {
      const strengthSourceAsOppSource = mapStrengthSourceToOppSource(strengthSource);
      if (strengthSourceAsOppSource && c.source === strengthSourceAsOppSource) {
        adjustedScore *= STRENGTH_OVERLAP_PENALTY;
      }
    }

    return { ...c, adjustedLeverScore: adjustedScore };
  });

  opp2Candidates.sort((a, b) => b.adjustedLeverScore - a.adjustedLeverScore);

  const selectedOpp2 = opp2Candidates[0] ?? {
    title: "Limited data for narrative analysis",
    detail: `The snapshot did not surface enough data to identify a specific citation or narrative gap.`,
    source: "citation" as const,
    type: "citation_narrative" as const,
  };

  return [
    {
      label: "Where You're Missing",
      title: opp1.title,
      detail: opp1.detail,
      source: opp1.source,
    },
    {
      label: "Biggest Opportunity",
      title: selectedOpp2.title,
      detail: selectedOpp2.detail,
      source: selectedOpp2.source,
    },
  ];
}

/** Legacy wrapper used by tests that test opportunity selection in isolation. */
function selectOpportunities(
  s: InterpretationSourceSummary,
  strengthSource?: SnapshotInterpretation["strength"]["source"],
): SnapshotInterpretation["opportunities"] {
  const ranked = rankOpportunities(s);
  return pickOpportunityPair(ranked, strengthSource);
}

/** Maps strength source types to their opportunity-source equivalents for redundancy checks. */
function mapStrengthSourceToOppSource(
  src: SnapshotInterpretation["strength"]["source"],
): SnapshotInterpretation["opportunities"][0]["source"] | null {
  switch (src) {
    case "discovery": return "discovery_gap";
    case "contrast": return "contrast";
    case "citation": return "citation";
    case "reputation": return "reputation";
    default: return null;
  }
}

/**
 * Builds a high-visibility takeaway that reads like an analyst wrote it
 * for this specific company by matching strength/opportunity source pairings.
 *
 * Returns null when no specific pairing matches (caller falls back to generic).
 */
function buildSpecificHighVisTakeaway(
  name: string,
  pct: number,
  s: InterpretationSourceSummary,
  strength: SnapshotInterpretation["strength"],
  opp1: SnapshotInterpretation["opportunities"][0],
  opp2: SnapshotInterpretation["opportunities"][1],
): string | null {
  const oppSources = [opp1.source, opp2.source];

  // Pattern 1: strength=discovery, opportunity=contrast
  // "Well-known broadly, but loses the narrative in direct comparisons"
  if (strength.source === "discovery" && oppSources.includes("contrast")) {
    const favoredComps = s.competitorContrast.competitorSummaries
      .filter(cs => cs.competitorFavoredCount > 0);
    const compName = favoredComps[0]?.competitorName;
    if (compName) {
      return (
        `${name} is well-known to AI when candidates search broadly — appearing in ${pct}% of discovery queries — ` +
        `but loses the narrative when they compare directly against ${compName}.`
      );
    }
  }

  // Pattern 2: strength=discovery (theme), opportunity=citation
  // "AI recognizes the theme, but can't back it up with citations"
  if (strength.source === "discovery" && strength.title.includes("theme") && oppSources.includes("citation")) {
    const themeMatch = strength.title.match(/strong (.+) theme/i);
    const themeName = themeMatch ? themeMatch[1] : null;
    if (themeName) {
      const citOpp = opp1.source === "citation" ? opp1 : opp2;
      const isZeroCitations = citOpp.title.toLowerCase().includes("zero owned");
      return isZeroCitations
        ? `AI recognizes ${name}'s ${themeName} reputation, but can't back it up — zero employer citations from ${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com appear in any response.`
        : `AI recognizes ${name}'s ${themeName} reputation, but the citation sources are thin — competitors have stronger sourcing from employer platforms.`;
    }
  }

  // Pattern 3: strength=reputation, opportunity=discovery_gap or contrast
  // "AI recommends them as an employer, but candidates have to ask directly"
  if (strength.source === "reputation" && oppSources.includes("discovery_gap")) {
    return (
      `AI recommends ${name} as a strong employer when candidates ask directly, ` +
      `but the company rarely surfaces in open-ended discovery queries — candidates have to already know to ask.`
    );
  }

  // Pattern 4: strength=discovery, opportunity=citation (no theme match)
  // "Visible broadly, but no owned content backing the narrative"
  if (strength.source === "discovery" && !strength.title.includes("theme") && oppSources.includes("citation")) {
    const citOpp = opp1.source === "citation" ? opp1 : opp2;
    const isZeroCitations = citOpp.title.toLowerCase().includes("zero owned");
    if (isZeroCitations) {
      return (
        `${name} appears in ${pct}% of AI discovery queries, but none of that visibility is backed by content the company controls — ` +
        `every claim AI makes about ${name} as an employer is unsourced or from third parties.`
      );
    }
  }

  return null;
}

/**
 * Builds a moderate-visibility takeaway by matching strength/opportunity pairings.
 * Moderate companies have *some* presence but notable gaps.
 *
 * Returns null when no specific pairing matches (caller falls back to generic).
 */
function buildSpecificModVisTakeaway(
  name: string,
  pct: number,
  s: InterpretationSourceSummary,
  strength: SnapshotInterpretation["strength"],
  opp1: SnapshotInterpretation["opportunities"][0],
  opp2: SnapshotInterpretation["opportunities"][1],
): string | null {
  const oppSources = [opp1.source, opp2.source];

  // Pattern 1: discovery strength + contrast weakness
  // "Shows up sometimes, but loses the comparison"
  if (strength.source === "discovery" && oppSources.includes("contrast")) {
    const favoredComps = s.competitorContrast.competitorSummaries
      .filter(cs => cs.competitorFavoredCount > 0);
    const compName = favoredComps[0]?.competitorName;
    if (compName) {
      return (
        `${name} appears in some AI employer queries, but loses the comparison when candidates ` +
        `evaluate them against ${compName} directly.`
      );
    }
  }

  // Pattern 2: theme strength + citation weakness
  // "AI knows the theme, but all third-party sourced"
  if (strength.source === "discovery" && strength.title.includes("theme") && oppSources.includes("citation")) {
    const themeMatch = strength.title.match(/strong (.+) theme/i);
    const themeName = themeMatch ? themeMatch[1] : null;
    if (themeName) {
      return (
        `AI associates ${name} with ${themeName}, but the narrative is entirely sourced from ` +
        `third parties — nothing from ${name}'s own content.`
      );
    }
  }

  // Pattern 3: reputation strength + discovery gap
  // "Positive when asked directly, but invisible in discovery"
  if (strength.source === "reputation" && oppSources.includes("discovery_gap")) {
    return (
      `When candidates ask about ${name} directly, AI is positive — but it rarely surfaces ` +
      `${name} in broader employer discovery queries.`
    );
  }

  return null;
}

/**
 * Builds a low-visibility takeaway by matching strength/opportunity pairings.
 * Low companies are mostly invisible with perhaps a narrow foothold.
 *
 * Returns null when no specific pairing matches (caller falls back to generic).
 */
function buildSpecificLowVisTakeaway(
  name: string,
  pct: number,
  s: InterpretationSourceSummary,
  strength: SnapshotInterpretation["strength"],
  opp1: SnapshotInterpretation["opportunities"][0],
  opp2: SnapshotInterpretation["opportunities"][1],
): string | null {
  const oppSources = [opp1.source, opp2.source];
  const absentPct = 100 - pct;

  // Pattern 1: any strength + discovery gap
  // "Has a foothold in X, but invisible in N% of queries"
  if (oppSources.includes("discovery_gap") && strength.label !== "Relative Bright Spot") {
    const strengthContext = strength.source === "reputation"
      ? "direct employer queries"
      : strength.source === "discovery" && strength.title.includes("theme")
        ? strength.title.match(/strong (.+) theme/i)?.[1] ?? "niche"
        : "a narrow set of queries";
    return (
      `${name} has a foothold in ${strengthContext}, but remains invisible in ` +
      `${absentPct}% of the queries candidates use to discover employers.`
    );
  }

  // Pattern 2: discovery gap + citation gap (both missing)
  // "Never recommended AND no owned content"
  if (oppSources.includes("discovery_gap") && oppSources.includes("citation")) {
    const citOpp = opp1.source === "citation" ? opp1 : opp2;
    const isZeroCitations = citOpp.title.toLowerCase().includes("zero owned");
    if (isZeroCitations) {
      return (
        `AI almost never recommends ${name} to candidates researching employers, and when it does, ` +
        `it can't cite any content from ${name}'s own domain.`
      );
    }
  }

  return null;
}

function buildPrimaryTakeaway(
  s: InterpretationSourceSummary,
  strength: SnapshotInterpretation["strength"],
  opp1: SnapshotInterpretation["opportunities"][0],
  opp2: SnapshotInterpretation["opportunities"][1],
): string {
  const pct = Math.round(s.discoveryMentionRate * 100);
  const name = s.prospectName;

  // Build opportunity summaries — short clauses that read naturally after the subject
  function summarizeOpp(opp: SnapshotInterpretation["opportunities"][0]): string {
    if (opp.source === "contrast") {
      const favoredCount = s.competitorContrast.competitorSummaries.filter(cs => cs.competitorFavoredCount > 0).length;
      if (favoredCount > 0) {
        return `loses ground in head-to-head comparisons`;
      }
    }
    if (opp.source === "discovery_gap") {
      if (opp.title.toLowerCase().includes("absent") || opp.title.toLowerCase().includes("gaps")) {
        return `is absent from key discovery queries where competitors appear`;
      }
      if (opp.title.toLowerCase().includes("weak")) {
        const themeMatch = opp.title.match(/weak (.+) visibility/i);
        return themeMatch ? `drops in ${themeMatch[1]} queries` : `has weak visibility in specific query themes`;
      }
    }
    if (opp.source === "citation") {
      if (opp.title.toLowerCase().includes("zero owned")) {
        return `has no owned content in AI's citation sources`;
      }
      if (opp.title.toLowerCase().includes("platform")) {
        return `is missing from key employer platforms that competitors appear on`;
      }
      return `has thin citation coverage compared to competitors`;
    }
    if (opp.source === "reputation") {
      if (opp.title.toLowerCase().includes("negative")) {
        return `gets negative framing from AI as an employer`;
      }
      if (opp.title.toLowerCase().includes("product")) {
        return `gets product descriptions instead of employer brand narratives from AI`;
      }
      if (opp.title.toLowerCase().includes("contradictory")) {
        return `gets contradictory narratives from AI`;
      }
    }
    return opp.title.toLowerCase();
  }

  const oppSummary1 = summarizeOpp(opp1);
  const oppSummary2 = summarizeOpp(opp2);

  // ── HIGH visibility: try strength/opportunity-specific pairings first
  if (s.discoveryMentionRate > HIGH_VISIBILITY_THRESHOLD) {
    const specific = buildSpecificHighVisTakeaway(name, pct, s, strength, opp1, opp2);
    if (specific) return specific;

    // Fallback: generic high-vis template
    const topComp = s.discovery.competitorRanking[0];
    const compClause = topComp
      ? ` while ${topComp.name} appears in ${Math.round(topComp.mentionRate * 100)}%`
      : "";

    return (
      `${name} dominates AI employer visibility among assessed competitors at ${pct}%${compClause}, ` +
      `but ${oppSummary1} and ${oppSummary2}.`
    );
  }

  // ── MODERATE visibility: try specific pairings first, then generic
  if (s.discoveryMentionRate >= MODERATE_VISIBILITY_THRESHOLD) {
    const specific = buildSpecificModVisTakeaway(name, pct, s, strength, opp1, opp2);
    if (specific) return specific;

    const topComp = s.discovery.competitorRanking[0];
    const compClause = topComp
      ? ` while ${topComp.name} appears in ${Math.round(topComp.mentionRate * 100)}%`
      : "";

    return (
      `${name} has uneven AI visibility — appearing in ${pct}% of employer queries${compClause} — ` +
      `but ${oppSummary1} and ${oppSummary2}.`
    );
  }

  // ── LOW visibility: try specific pairings first, then generic
  {
    const specific = buildSpecificLowVisTakeaway(name, pct, s, strength, opp1, opp2);
    if (specific) return specific;

    const topComp = s.discovery.competitorRanking[0];
    if (topComp && topComp.mentionRate > 0) {
      return (
        `AI rarely surfaces ${name} when candidates research employers in this space — appearing in just ${pct}% of discovery queries ` +
        `while ${topComp.name} appears in ${Math.round(topComp.mentionRate * 100)}%.`
      );
    }
    return (
      `${name} has minimal AI visibility when candidates search for employers in this space — ` +
      `${oppSummary1} and ${oppSummary2}.`
    );
  }
}

function buildBridge(tier: VisibilityTier): string {
  switch (tier) {
    case "high":
      return (
        "This snapshot captures the broad picture. The full assessment maps every competitive comparison, " +
        "identifies which content gaps matter most, and produces a prioritized remediation plan."
      );
    case "moderate":
      return (
        "The snapshot surfaces the most visible patterns. The full assessment tests 200-600 queries, " +
        "covers all competitors, and delivers a stage-by-stage action plan."
      );
    case "low":
      return (
        "Even a limited presence creates a foundation to build on. The full assessment identifies " +
        "exactly where to invest for maximum visibility impact."
      );
  }
}

// ─── Semantic coherence check ────────────────────────────────
//
// Runs AFTER initial selection. Detects contradictions between the
// strength card and either opportunity card based on shared semantic
// dimension with conflicting polarity. This is a filter, not a scoring
// dimension — it does not change candidate scores.

/**
 * Checks whether a strength and an opportunity contradict each other.
 *
 * A contradiction exists when:
 * 1. Same dimension + conflicting polarity (e.g., "culture is strong" + "culture is weak")
 * 2. Same named competitor + conflicting polarity (e.g., "ahead of Procore" + "Procore wins")
 * 3. Same narrow scope + same dimension + conflicting polarity
 *
 * A valid tension is NOT a contradiction:
 * - Strength is broad ("strong overall visibility") + opportunity is theme/competitor-specific
 * - Different dimensions entirely
 */
function isContradiction(
  strengthMeta: CandidateMetadata,
  oppMeta: CandidateMetadata,
): boolean {
  // Different polarity is a prerequisite for contradiction
  if (strengthMeta.polarity === oppMeta.polarity) return false;

  // Rule 1: Same dimension + conflicting polarity
  // Only contradicts when both are specific (not one broad + one themed)
  if (
    strengthMeta.dimension &&
    oppMeta.dimension &&
    strengthMeta.dimension === oppMeta.dimension
  ) {
    // If the strength is broad scope and the opp is more specific, it's a valid tension
    if (strengthMeta.scope === "broad" && oppMeta.scope !== "broad") return false;
    // Same dimension, at least one is narrow → contradiction
    return true;
  }

  // Rule 2: Same named competitor + conflicting polarity
  if (
    strengthMeta.namedCompetitor &&
    oppMeta.namedCompetitor &&
    strengthMeta.namedCompetitor === oppMeta.namedCompetitor
  ) {
    return true;
  }

  return false;
}

/**
 * Checks the 3-card set for semantic contradictions.
 * Returns which opportunity slot(s) conflict with the strength, if any.
 */
function checkCoherence(
  strengthMeta: CandidateMetadata,
  opp1Meta: CandidateMetadata,
  opp2Meta: CandidateMetadata,
): { isCoherent: boolean; conflictsWith: "opp1" | "opp2" | "both" | null } {
  const opp1Conflicts = isContradiction(strengthMeta, opp1Meta);
  const opp2Conflicts = isContradiction(strengthMeta, opp2Meta);

  if (opp1Conflicts && opp2Conflicts) {
    return { isCoherent: false, conflictsWith: "both" };
  }
  if (opp1Conflicts) {
    return { isCoherent: false, conflictsWith: "opp1" };
  }
  if (opp2Conflicts) {
    return { isCoherent: false, conflictsWith: "opp2" };
  }
  return { isCoherent: true, conflictsWith: null };
}

export function buildInterpretation(
  summary: InterpretationSourceSummary,
  visibilityTier: VisibilityTier,
): SnapshotInterpretation {
  const rankedStrengths = rankStrengths(summary);
  const rankedOpps = rankOpportunities(summary);

  // Initial selection: best strength + best opportunity pair
  let strengthPick = rankedStrengths[0]!;
  let oppPair = pickOpportunityPair(rankedOpps, strengthPick.source);

  // Find the metadata for the initially selected opportunity cards
  function findOppMeta(title: string): CandidateMetadata {
    const match = rankedOpps.find(o => o.title === title);
    return match?.meta ?? { scope: "broad", polarity: "negative" };
  }

  // ── Coherence resolution ────────────────────────────────────
  const coherence = checkCoherence(
    strengthPick.meta,
    findOppMeta(oppPair[0].title),
    findOppMeta(oppPair[1].title),
  );

  if (!coherence.isCoherent) {
    // Strategy 1: Try swapping the contradicting opportunity for the next-best
    //             that doesn't contradict the current strength.
    const conflictingOppTitle = coherence.conflictsWith === "opp1" || coherence.conflictsWith === "both"
      ? oppPair[0].title
      : oppPair[1].title;

    // Find alternatives: all opp candidates except the conflicting one(s)
    const excludeSet = new Set<number>();
    for (let i = 0; i < rankedOpps.length; i++) {
      const opp = rankedOpps[i]!;
      if (isContradiction(strengthPick.meta, opp.meta)) {
        excludeSet.add(i);
      }
    }

    if (excludeSet.size < rankedOpps.length) {
      // There are non-contradicting opportunities available — rebuild the pair
      const newPair = pickOpportunityPair(rankedOpps, strengthPick.source, excludeSet);
      // Verify the new pair is actually coherent
      const recheck = checkCoherence(
        strengthPick.meta,
        findOppMeta(newPair[0].title),
        findOppMeta(newPair[1].title),
      );
      if (recheck.isCoherent) {
        oppPair = newPair;
      } else {
        // Strategy 2: Swap the strength instead
        resolveBySwappingStrength();
      }
    } else {
      // All opportunities contradict this strength — swap the strength
      resolveBySwappingStrength();
    }
  }

  function resolveBySwappingStrength(): void {
    // Try each alternative strength in rank order
    for (let si = 1; si < rankedStrengths.length; si++) {
      const altStrength = rankedStrengths[si]!;
      const altPair = pickOpportunityPair(rankedOpps, altStrength.source);
      const altCoherence = checkCoherence(
        altStrength.meta,
        findOppMeta(altPair[0].title),
        findOppMeta(altPair[1].title),
      );
      if (altCoherence.isCoherent) {
        strengthPick = altStrength;
        oppPair = altPair;
        return;
      }
    }

    // Strategy 3 (very rare): all strength/opp combos contradict.
    // Prefer the broadest strength — it has the least chance of semantic conflict.
    const broadest = rankedStrengths.find(s => s.meta.scope === "broad");
    if (broadest && broadest !== strengthPick) {
      strengthPick = broadest;
      // Exclude only the opportunities that conflict with this broad strength
      const excludeSet = new Set<number>();
      for (let i = 0; i < rankedOpps.length; i++) {
        if (isContradiction(broadest.meta, rankedOpps[i]!.meta)) {
          excludeSet.add(i);
        }
      }
      oppPair = pickOpportunityPair(rankedOpps, broadest.source, excludeSet);
    }
    // If even that doesn't work, keep the original selection — rare enough
    // that a marginal contradiction is better than no output at all.
  }

  const strength: SnapshotInterpretation["strength"] = {
    label: strengthPick.label,
    title: strengthPick.title,
    detail: strengthPick.detail,
    source: strengthPick.source,
  };
  const opportunities = oppPair;
  const primaryTakeaway = buildPrimaryTakeaway(summary, strength, opportunities[0], opportunities[1]);
  const bridge = buildBridge(visibilityTier);

  return { primaryTakeaway, strength, opportunities, bridge };
}

// ─── DM template builder ─────────────────────────────────────
//
// Consumes the interpretation layer directly so the DM mirrors the
// interpretation cards. When the operator reads the DM and then looks
// at the interpretation, they see the same story.

function buildDmTemplate(
  prospectName: string,
  interpretation: SnapshotInterpretation,
  industry?: string,
  tier: VisibilityTier = "low",
): string {
  const industryText = industry || "your space";

  // Build the "fair + pointed" pivot: acknowledge strength, then gap
  const strengthBrief = summarizeStrengthForDm(interpretation.strength);
  const opp = interpretation.opportunities[0];
  const oppDetail = summarizeOppForDm(opp);
  const pivotLine = `${strengthBrief} — but ${lowercaseFirst(opp.title)}: ${oppDetail}`;

  return (
    `Hi {first_name},\n\n` +
    `We ran an AI employer visibility assessment on ${prospectName} — ` +
    `100 queries across what candidates ask about employers in ${industryText}.\n\n` +
    `${interpretation.primaryTakeaway}\n\n` +
    `${pivotLine}\n\n` +
    `The full diagnostic maps where the remaining gaps are and what to prioritize first. ` +
    `Happy to share if useful.`
  );
}

/**
 * Produces a brief (< 15 word) DM-friendly summary of the strength card.
 * Used as the positive acknowledgement before the pivot to the gap.
 */
function summarizeStrengthForDm(strength: SnapshotInterpretation["strength"]): string {
  if (strength.source === "discovery") {
    // Extract percentage if present in the title/detail
    const pctMatch = strength.detail.match(/(\d+)% of/);
    if (pctMatch) {
      return `AI mentions the company in ${pctMatch[1]}% of employer queries`;
    }
    return strength.title;
  }
  if (strength.source === "reputation") {
    return "AI frames the company positively when candidates ask directly";
  }
  if (strength.source === "citation") {
    return "The company has some citation coverage in AI responses";
  }
  if (strength.source === "contrast") {
    return "The company holds its own in some head-to-head comparisons";
  }
  return strength.title;
}

/**
 * Lowercases the first character of a string unless it looks like a proper noun.
 * Used to make opportunity titles read naturally mid-sentence.
 */
function lowercaseFirst(s: string): string {
  if (!s) return s;
  // Don't lowercase "AI" or "Zero" which read awkwardly lowercased in DM copy
  if (/^(AI |Zero )/.test(s)) return s;
  return s[0]!.toLowerCase() + s.slice(1);
}

/**
 * Summarizes an opportunity card into a brief DM-appropriate detail clause.
 * Extracts the first concrete sentence from the opportunity detail.
 */
function summarizeOppForDm(opp: SnapshotInterpretation["opportunities"][0]): string {
  // Use the first sentence of the detail for a tight DM summary.
  const sentences = splitSentences(opp.detail);
  if (sentences.length > 0) {
    return sentences[0]!;
  }
  return opp.detail.slice(0, 200);
}

/**
 * Formats a string list with Oxford comma.
 * ["A"] → "A"
 * ["A", "B"] → "A and B"
 * ["A", "B", "C"] → "A, B, and C"
 */
function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

/**
 * Returns a minimal valid SnapshotSummary for edge cases (empty results).
 */
function buildEmptySummary(): SnapshotSummary {
  const hook: SnapshotSummary["primaryHook"] = {
    category: "discovery_absence",
    headline: "No scan results available.",
    evidence: "This snapshot has no results to analyze.",
    quotableText: "",
    findingStrength: "weak",
  };

  const emptyInterpretation: SnapshotInterpretation = {
    primaryTakeaway: "No scan results available.",
    strength: {
      label: "Where You Win",
      title: "No data available",
      detail: "This snapshot has no results to analyze.",
      source: "discovery",
    },
    opportunities: [
      {
        label: "Where You're Missing",
        title: "No data available",
        detail: "This snapshot has no results to analyze.",
        source: "discovery_gap",
      },
      {
        label: "Biggest Opportunity",
        title: "No data available",
        detail: "This snapshot has no results to analyze.",
        source: "citation",
      },
    ],
    bridge: "Run a snapshot scan to generate findings.",
  };

  return {
    prospectName: "",
    totalQueries: 0,
    discoveryMentionRate: 0,
    discoveryMentionCount: 0,
    overallMentionRate: 0,
    visibilityTier: "low" as VisibilityTier,
    discovery: {
      queriesRun: 0,
      prospectMentioned: 0,
      mentionRate: 0,
      competitorRanking: [],
      topCompetitorName: "",
      topCompetitorMentioned: 0,
      topGapQueries: [],
      themeBreakdown: [],
      allResults: [],
    },
    competitorContrast: {
      queriesRun: 0,
      competitorSummaries: [],
      worstComparison: null,
      allResults: [],
    },
    reputation: {
      queriesRun: 0,
      avgSentiment: 0,
      narrativeConsistency: "consistent",
      recurringThemes: [],
      worstResponse: null,
    },
    citationGap: {
      prospectOwnedCitations: 0,
      prospectTotalCitations: 0,
      competitorOwnedCitations: 0,
      gapPlatforms: [],
      finding: "No citation data available.",
      prospectEmployerCitations: 0,
      competitorEmployerCitations: 0,
    },
    primaryHook: hook,
    interpretation: emptyInterpretation,
    dmTemplate: buildDmTemplate("", emptyInterpretation),
  };
}
