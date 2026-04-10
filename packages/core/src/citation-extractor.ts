// ─── Types ──────────────────────────────────────────────────

export interface ExtractedCitation {
  domain: string;
  url: string | null;      // full URL if found in text
  context: string;         // short excerpt showing where it was referenced
  confidence: "high" | "medium"; // high = full URL found, medium = platform name mentioned
}

// ─── Known platforms ────────────────────────────────────────

/**
 * Maps platform name references (as they appear in prose) to canonical domains.
 * Keys are lowercased. Multiple keys may map to the same domain (aliases).
 */
export const KNOWN_PLATFORMS: Record<string, string> = {
  "glassdoor": "glassdoor.com",
  "indeed": "indeed.com",
  "linkedin": "linkedin.com",
  "levels.fyi": "levels.fyi",
  "blind": "blind.app",
  "teamblind": "blind.app",
  "built in": "builtin.com",
  "builtin": "builtin.com",
  "comparably": "comparably.com",
  "payscale": "payscale.com",
  "salary.com": "salary.com",
  "kununu": "kununu.com",
  "repvue": "repvue.com",
  "wellfound": "wellfound.com",
  "angellist": "wellfound.com",
  "leetcode": "leetcode.com",
  "reddit": "reddit.com",
  "quora": "quora.com",
  "ziprecruiter": "ziprecruiter.com",
  "monster": "monster.com",
  "careerbliss": "careerbliss.com",
  "fairygodboss": "fairygodboss.com",
};

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Extract a bare domain from a URL string.
 * Strips protocol, www prefix, and everything from the first path segment onward.
 * Preserves subdomains other than www. Returns lowercase.
 */
function extractDomainFromUrl(rawUrl: string): string {
  return rawUrl
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .toLowerCase()
    .trim();
}

/**
 * Extract a ~60 character context window around a match index in the text.
 * Includes partial words at boundaries rather than cutting mid-word awkwardly.
 */
function extractContext(text: string, matchIndex: number, matchLength: number): string {
  const WINDOW = 30; // chars on each side
  const start = Math.max(0, matchIndex - WINDOW);
  const end = Math.min(text.length, matchIndex + matchLength + WINDOW);
  let excerpt = text.slice(start, end).trim();

  // Add ellipsis when we've truncated
  if (start > 0) excerpt = "\u2026" + excerpt;
  if (end < text.length) excerpt = excerpt + "\u2026";

  return excerpt;
}

// ─── Extractor ───────────────────────────────────────────────

/**
 * Scan an AI response text and extract potential citation sources.
 *
 * Extraction strategy:
 * 1. Find explicit URLs via regex — these are "high" confidence.
 * 2. Find known platform name mentions in prose — these are "medium" confidence.
 * 3. Dedup by domain, keeping the highest confidence version.
 * 4. Return sorted: high confidence first, then medium.
 *
 * This function is pure (no IO, no side effects) and safe to call client-side.
 */
export function extractCitationsFromResponse(responseText: string): ExtractedCitation[] {
  if (!responseText.trim()) return [];

  const byDomain = new Map<string, ExtractedCitation>();

  // ── Pass 1: explicit URLs ──────────────────────────────────
  // Match http/https URLs; stop at whitespace or common trailing punctuation.
  const urlPattern = /https?:\/\/[^\s<>"')\]]+/g;
  let urlMatch: RegExpExecArray | null;

  while ((urlMatch = urlPattern.exec(responseText)) !== null) {
    const rawUrl = urlMatch[0].replace(/[.,;:)]+$/, ""); // strip trailing punctuation
    const domain = extractDomainFromUrl(rawUrl);
    if (!domain || !domain.includes(".")) continue;

    const context = extractContext(responseText, urlMatch.index, rawUrl.length);

    // High confidence always wins over medium; keep first high if multiple
    const existing = byDomain.get(domain);
    if (!existing || existing.confidence === "medium") {
      byDomain.set(domain, { domain, url: rawUrl, context, confidence: "high" });
    }
  }

  // ── Pass 2: known platform name mentions ──────────────────
  const lowerText = responseText.toLowerCase();

  for (const [platformName, canonicalDomain] of Object.entries(KNOWN_PLATFORMS)) {
    // Skip if we already have a high-confidence entry for this domain
    const existing = byDomain.get(canonicalDomain);
    if (existing?.confidence === "high") continue;

    // Build a word-boundary-aware search for the platform name
    // For multi-word names (e.g. "built in") we search case-insensitively
    const lowerName = platformName.toLowerCase();
    const idx = lowerText.indexOf(lowerName);
    if (idx === -1) continue;

    // Guard against partial-word matches for single-word names
    // (e.g. "blind" should not fire inside "blindsided")
    if (!platformName.includes(" ")) {
      const before = idx > 0 ? lowerText[idx - 1] : " ";
      const after = idx + lowerName.length < lowerText.length
        ? lowerText[idx + lowerName.length]
        : " ";
      const wordChar = /[a-z0-9_-]/;
      if (wordChar.test(before) || wordChar.test(after)) continue;
    }

    const context = extractContext(responseText, idx, platformName.length);

    if (!existing) {
      byDomain.set(canonicalDomain, {
        domain: canonicalDomain,
        url: null,
        context,
        confidence: "medium",
      });
    }
    // If existing is already medium, keep the first one (no update needed)
  }

  // ── Sort: high confidence first, then medium ───────────────
  const results = Array.from(byDomain.values());
  results.sort((a, b) => {
    if (a.confidence === b.confidence) return 0;
    return a.confidence === "high" ? -1 : 1;
  });

  return results;
}
