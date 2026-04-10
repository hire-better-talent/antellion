// ─── Types ──────────────────────────────────────────────────

export interface CompetitorMention {
  name: string;
  domain: string;
  mentioned: boolean;
}

export interface ResponseAnalysis {
  clientMentioned: boolean;
  visibilityScore: number;
  sentimentScore: number;
  competitorMentions: CompetitorMention[];
  citedDomains: string[];
}

export interface AnalysisInput {
  response: string;
  clientName: string;
  clientDomain: string;
  competitors: { name: string; domain: string }[];
  rawCitedDomains: string;
}

export interface ParsedCitation {
  url: string;
  domain: string;
  title: string | null;
}

// ─── Mention detection ──────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsName(text: string, name: string): boolean {
  // Case-insensitive whole-word-ish match.
  // Uses word boundaries where possible, falls back to includes.
  const lower = text.toLowerCase();
  const target = name.toLowerCase();
  if (target.length < 3) return lower.includes(target);

  // Try word-boundary regex for multi-word names
  try {
    const pattern = new RegExp(`\\b${escapeRegex(target)}\\b`, "i");
    return pattern.test(text);
  } catch {
    return lower.includes(target);
  }
}

/**
 * Checks if a name is mentioned in the text, EXCLUDING positions where a
 * longer name already claims the match. Prevents "Hilton" from matching
 * inside "Hilton Grand Vacations."
 *
 * @param text       The AI response text
 * @param name       The name to search for (e.g., "Hilton")
 * @param longerNames Names that are superstrings of `name` (e.g., "Hilton Grand Vacations", "Hilton Worldwide")
 */
function containsNameExclusive(
  text: string,
  name: string,
  longerNames: string[],
): boolean {
  const lower = text.toLowerCase();
  const target = name.toLowerCase();
  if (target.length < 3) {
    // Too short for exclusive matching — fall back to basic
    return lower.includes(target);
  }

  try {
    const pattern = new RegExp(`\\b${escapeRegex(target)}\\b`, "gi");
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(lower)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      // Check if this match position is part of a longer name
      let claimedByLonger = false;
      for (const longer of longerNames) {
        const longerLower = longer.toLowerCase();
        // Find all occurrences of the longer name and see if any overlap this match
        let searchFrom = 0;
        while (true) {
          const longerPos = lower.indexOf(longerLower, searchFrom);
          if (longerPos === -1) break;
          const longerEnd = longerPos + longerLower.length;
          // If the short match falls within the longer match range, it's claimed
          if (matchStart >= longerPos && matchEnd <= longerEnd) {
            claimedByLonger = true;
            break;
          }
          searchFrom = longerPos + 1;
        }
        if (claimedByLonger) break;
      }

      if (!claimedByLonger) {
        return true; // Found a standalone mention not part of a longer name
      }
    }

    return false;
  } catch {
    return lower.includes(target);
  }
}

// ─── Citation parsing ───────────────────────────────────────

/**
 * Extract a bare domain from a URL string.
 * Strips protocol, www prefix, and everything after the first path segment.
 */
function extractDomain(rawUrl: string): string {
  return rawUrl
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
    .trim();
}

/**
 * Parse raw citation input in any of the supported formats into structured citations.
 *
 * Accepts:
 *   - ChatGPT-style:   [1]: https://example.com/path "Title text"
 *   - Plain URLs:      https://www.glassdoor.com/Reviews/...
 *   - Bare domains:    glassdoor.com
 *   - Mixed content, separated by newlines or commas
 *
 * Deduplicates by domain, keeping the first occurrence with the most complete data.
 */
export function parseCitations(raw: string): ParsedCitation[] {
  if (!raw.trim()) return [];

  const results: ParsedCitation[] = [];
  const seenDomains = new Set<string>();

  // Split on newlines first; within each line also split on commas that are
  // clearly between distinct entries (not inside a quoted title)
  const lines = raw.split(/\n/);

  for (const line of lines) {
    // A single line may contain comma-separated entries if there are no ChatGPT
    // brackets involved. We handle ChatGPT format first per line, then fall
    // through to splitting on commas for the remainder.
    const chatGptPattern = /\[\d+\]:\s*(https?:\/\/\S+?)(?:\s+"([^"]*)")?\s*(?=$|\[|\n)/g;
    const chatGptMatches = [...line.matchAll(chatGptPattern)];

    if (chatGptMatches.length > 0) {
      for (const match of chatGptMatches) {
        const url = match[1].trim();
        const title = match[2]?.trim() || null;
        const domain = extractDomain(url);
        if (!domain.includes(".")) continue;
        if (!seenDomains.has(domain)) {
          seenDomains.add(domain);
          results.push({ url, domain, title });
        }
      }
      continue;
    }

    // Not a ChatGPT line — split on commas and process each segment
    const segments = line.split(",");
    for (const segment of segments) {
      const s = segment.trim();
      if (!s) continue;

      // Plain URL
      const urlMatch = s.match(/^https?:\/\/\S+/);
      if (urlMatch) {
        const url = urlMatch[0].replace(/[.,;]+$/, ""); // strip trailing punctuation
        const domain = extractDomain(url);
        if (!domain.includes(".")) continue;
        if (!seenDomains.has(domain)) {
          seenDomains.add(domain);
          results.push({ url, domain, title: null });
        }
        continue;
      }

      // Bare domain — validate it actually looks like a domain
      const domain = extractDomain(s);
      if (!domain.includes(".")) continue;
      // Domain must be short, have no spaces, and look like a real hostname
      if (domain.length > 80) continue;
      if (/\s/.test(domain)) continue;
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(domain)) continue;
      if (!seenDomains.has(domain)) {
        seenDomains.add(domain);
        results.push({
          url: `https://${domain}`,
          domain,
          title: null,
        });
      }
    }
  }

  return results;
}

/**
 * Parse user-entered cited domains and return bare domain strings.
 * Accepts any format supported by parseCitations (ChatGPT-style, URLs, bare domains).
 * Kept for backward compatibility — prefers parseCitations for new callsites.
 */
export function parseCitedDomains(input: string): string[] {
  return parseCitations(input).map((c) => c.domain);
}

// ─── Visibility scoring ─────────────────────────────────────

// Employer-specific sentiment signals.
// These must be phrases unlikely to appear in neutral technical descriptions.
// Single common words like "strong", "best", "limited" fire on nearly every response.
const POSITIVE_SIGNALS = [
  "highly recommended",
  "great place to work",
  "excellent employer",
  "top employer",
  "well-regarded employer",
  "strong employer brand",
  "employees love",
  "positive reviews",
  "highly rated",
  "award-winning culture",
  "great benefits",
  "competitive compensation",
  "strong work-life balance",
  "employees report high satisfaction",
  "well-known for treating employees well",
];

const NEGATIVE_SIGNALS = [
  "poor reviews",
  "poor reputation",
  "high turnover",
  "negative reviews",
  "employees complain",
  "below market",
  "underpaid",
  "poor work-life balance",
  "weak engineering",
  "weak culture",
  "toxic culture",
  "layoffs",
  "declining reputation",
  "declining employee",
  "not recommended",
  "concerns about management",
  "lack of transparency",
  "limited growth opportunities",
  "struggles to retain",
  "struggling with",
];

/**
 * Heuristic visibility score (0–100).
 * - 0 if client not mentioned
 * - Higher if mentioned early, mentioned multiple times, or near positive signals
 */
function scoreVisibility(response: string, clientName: string): number {
  const lower = response.toLowerCase();
  const name = clientName.toLowerCase();

  if (!lower.includes(name)) return 0;

  // Count mentions
  const parts = lower.split(name);
  const mentions = parts.length - 1;

  // Base: 25 + 15 per mention, capped at 70
  let score = Math.min(70, 25 + mentions * 15);

  // Early mention bonus (first 20% of response)
  const firstMentionPos = lower.indexOf(name);
  if (firstMentionPos < response.length * 0.2) score += 15;

  // Positive signal bonus (employer-specific phrases)
  const positiveCount = POSITIVE_SIGNALS.filter((p) => lower.includes(p)).length;
  if (positiveCount > 0) score += Math.min(15, positiveCount * 5);

  // Negative signal penalty (employer-specific phrases)
  const negativeCount = NEGATIVE_SIGNALS.filter((p) => lower.includes(p)).length;
  if (negativeCount > 0) score -= Math.min(15, negativeCount * 5);

  return Math.min(100, Math.max(0, score));
}

/**
 * Heuristic sentiment score (-1 to 1).
 * Counts employer-specific positive/negative phrase matches.
 * Uses multi-word phrases to avoid false positives from common words.
 * Returns 0 (neutral) when no employer-specific signals are found.
 */
function scoreSentiment(response: string): number {
  const lower = response.toLowerCase();
  let positive = 0;
  let negative = 0;

  for (const phrase of POSITIVE_SIGNALS) {
    if (lower.includes(phrase)) positive++;
  }
  for (const phrase of NEGATIVE_SIGNALS) {
    if (lower.includes(phrase)) negative++;
  }

  const total = positive + negative;
  if (total === 0) return 0;

  // Scale to -1..1, capped to avoid extremes on few matches
  const raw = (positive - negative) / total;
  // Dampen: require multiple signals to reach extremes
  const dampened = raw * Math.min(1, total / 4);
  return Math.round(dampened * 100) / 100;
}

// ─── Orchestrator ───────────────────────────────────────────

export function analyzeResponse(input: AnalysisInput): ResponseAnalysis {
  const clientMentioned =
    containsName(input.response, input.clientName) ||
    containsName(input.response, input.clientDomain);

  // Build a list of all entity names for exclusive matching.
  // This prevents "Hilton" from matching inside "Hilton Grand Vacations."
  const allEntityNames = [
    input.clientName,
    ...input.competitors.map((c) => c.name),
  ];

  const competitorMentions: CompetitorMention[] = input.competitors.map(
    (c) => {
      // Find all names that are superstrings of this competitor's name
      const longerNames = allEntityNames.filter(
        (n) =>
          n.toLowerCase() !== c.name.toLowerCase() &&
          n.toLowerCase().includes(c.name.toLowerCase()) &&
          n.length > c.name.length,
      );

      return {
        name: c.name,
        domain: c.domain,
        mentioned:
          containsNameExclusive(input.response, c.name, longerNames) ||
          containsName(input.response, c.domain),
      };
    },
  );

  const visibilityScore = scoreVisibility(input.response, input.clientName);
  const sentimentScore = scoreSentiment(input.response);
  const citedDomains = parseCitedDomains(input.rawCitedDomains);

  return {
    clientMentioned,
    visibilityScore,
    sentimentScore,
    competitorMentions,
    citedDomains,
  };
}
