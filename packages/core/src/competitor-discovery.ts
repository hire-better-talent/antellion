// ─── Types ──────────────────────────────────────────────────

export interface DiscoveredCompetitor {
  name: string;
  mentionCount: number;
  mentionContexts: string[];
}

// ─── Constants ──────────────────────────────────────────────

/**
 * Well-known companies that AI models frequently reference as employers.
 * Matched case-insensitively against response text. This is the highest-signal
 * extraction strategy — a known company mentioned once is a valid candidate.
 *
 * Extend this list as new verticals are onboarded. Prefer the most-referenced
 * canonical form (e.g. "Goldman Sachs" not "Goldman").
 */
export const KNOWN_COMPANIES: string[] = [
  // Tech — FAANG / large cap
  "Google",
  "Meta",
  "Amazon",
  "Apple",
  "Microsoft",
  "Netflix",

  // Tech — SaaS / cloud / infrastructure
  "Stripe",
  "Shopify",
  "Salesforce",
  "Oracle",
  "SAP",
  "ServiceNow",
  "Workday",
  "Adobe",
  "Intuit",
  "Block",
  "Square",
  "Coinbase",
  "Robinhood",
  "Datadog",
  "Snowflake",
  "Databricks",
  "Palantir",
  "Cloudflare",
  "Figma",
  "Notion",
  "Slack",
  "Zoom",
  "Twilio",
  "HubSpot",
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "GitHub",
  "GitLab",
  "Atlassian",
  "MongoDB",
  "Elastic",
  "Confluent",
  "HashiCorp",
  "Vercel",

  // Tech — mobility / marketplace
  "Uber",
  "Lyft",
  "DoorDash",
  "Instacart",
  "Airbnb",
  "Expedia",
  "Booking.com",
  "Zillow",
  "Redfin",
  "Compass",

  // Tech — hardware / semiconductor / EV
  "Tesla",
  "SpaceX",
  "Rivian",
  "Lucid",
  "NVIDIA",
  "AMD",
  "Intel",
  "Qualcomm",
  "Broadcom",

  // Enterprise SaaS (vertical)
  "ServiceTitan",
  "Procore",
  "Toast",
  "Veeva",
  "Braze",
  "Amplitude",
  "Klaviyo",
  "Datto",
  "ConnectWise",

  // Finance — banking / investment
  "JPMorgan",
  "Goldman Sachs",
  "Morgan Stanley",
  "Bank of America",
  "Citigroup",
  "Wells Fargo",
  "Capital One",
  "American Express",
  "Visa",
  "Mastercard",
  "PayPal",
  "Fidelity",
  "Vanguard",
  "BlackRock",
  "Citadel",
  "Two Sigma",
  "Jane Street",
  "DE Shaw",

  // Consulting / professional services
  "McKinsey",
  "BCG",
  "Bain",
  "Deloitte",
  "Accenture",
  "PwC",
  "EY",
  "KPMG",

  // Healthcare
  "UnitedHealth",
  "CVS Health",
  "Anthem",
  "Kaiser Permanente",
  "Epic Systems",
  "Cerner",
  "Veeva Systems",

  // Retail / consumer
  "Walmart",
  "Target",
  "Costco",
  "Nike",
  "Starbucks",
  "Disney",
  "Procter & Gamble",
  "Unilever",
  "Coca-Cola",
  "PepsiCo",

  // Hospitality / travel / timeshare
  "Marriott",
  "Hilton",
  "Hyatt",
  "IHG",
  "Wyndham",
  "Accor",
  "Marriott Vacations",
  "Marriott Vacations Worldwide",
  "Hilton Grand Vacations",
  "Wyndham Destinations",
  "Bluegreen Vacations",
  "Bluegreen",
  "Travel + Leisure",
  "Travel + Leisure Co",
  "Holiday Inn Club Vacations",
  "Holiday Inn",
  "Four Seasons",
  "Ritz-Carlton",
  "Sands",
  "Las Vegas Sands",
  "MGM Resorts",
  "Caesars Entertainment",
  "Vail Resorts",
  "Club Med",
  "Diamond Resorts",
  "Westgate Resorts",
  "Exploria Resorts",
  "Vacasa",
  "Vrbo",

  // Staffing / HR
  "Randstad",
  "ManpowerGroup",
  "Adecco",
  "Robert Half",
  "Korn Ferry",
];

/**
 * Generic terms that look like company names but are not.
 * Filtered out before returning candidates to the caller.
 */
const FALSE_POSITIVE_BLOCKLIST = new Set([
  // generic "company" phrases
  "the company",
  "a company",
  "tech companies",
  "technology companies",
  "many companies",
  "other companies",
  "these companies",
  "top companies",
  "best companies",
  "leading companies",
  "major companies",
  "most companies",
  "some companies",
  "large companies",
  "small companies",
  "various companies",
  "several companies",
  "hospitality companies",
  "travel companies",
  "timeshare companies",
  "resort companies",
  "vacation companies",
  "sales companies",
  "fintech companies",
  "saas companies",
  "ai companies",
  "healthcare companies",

  // startup / generic business
  "startup",
  "startups",
  "your company",
  "their company",
  "this company",
  "our company",

  // geography
  "new york",
  "san francisco",
  "los angeles",
  "silicon valley",
  "new england",
  "north america",
  "united states",
  "san jose",
  "austin",
  "seattle",
  "boston",
  "chicago",
  "las vegas",
  "orlando",
  "miami",
  "denver",
  "nashville",
  "united kingdom",

  // job / role terms
  "remote work",
  "work from home",
  "software engineer",
  "senior engineer",
  "product manager",
  "data scientist",
  "machine learning",
  "artificial intelligence",
  "natural language",
  "open source",
  "full stack",
  "back end",
  "front end",
  "job seekers",
  "job candidates",
  "tech talent",
  "engineering talent",
  "sales professionals",
  "sales representatives",
  "account executives",
  "sales executives",
  "sales managers",
  "vacation ownership",
  "timeshare industry",
  "hospitality industry",
  "travel industry",
  "hospitality sector",

  // common prose phrases that pattern-match poorly
  "best places",
  "great place",
  "good place",
  "known for",
  "well known",
  "well-known",
  "high-end",
  "top-tier",
  "world-class",
]);

/**
 * Maximum number of discovered competitors to return.
 */
const MAX_RESULTS = 20;

/**
 * A candidate must appear in at least this many distinct responses to be
 * surfaced. Kept at 1 — a single mention from a known company or a clear
 * pattern hit is worth surfacing for operator review.
 */
const MIN_RESPONSE_APPEARANCES = 1;

// ─── Utility ─────────────────────────────────────────────────

/**
 * Strips common markdown formatting from text before extraction.
 * Removes bold (**text** / __text__), italic (*text* / _text_),
 * and ATX-style headers (## Heading).
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold**
    .replace(/__([^_]+)__/g, "$1") // __bold__
    .replace(/\*([^*]+)\*/g, "$1") // *italic*
    .replace(/_([^_]+)_/g, "$1") // _italic_
    .replace(/^#{1,6}\s+/gm, ""); // ## headers
}

/**
 * Extracts a snippet of up to 100 characters centered on the match position
 * within the source text.
 */
function extractContext(text: string, matchIndex: number): string {
  const radius = 50;
  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(text.length, matchIndex + radius);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

/**
 * Returns true if the candidate string should be filtered as a false positive.
 */
function isFalsePositive(candidate: string): boolean {
  const lower = candidate.toLowerCase().trim();
  if (FALSE_POSITIVE_BLOCKLIST.has(lower)) return true;
  if (candidate.length < 2) return true;
  if (/^\d+$/.test(candidate)) return true;
  return false;
}

/**
 * Normalizes a candidate name for deduplication: trims, collapses whitespace,
 * and title-cases the result so "stripe" and "Stripe" resolve to the same key.
 */
function normalizeCandidate(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CandidateHit {
  name: string;
  context: string;
}

// ─── Source/platform references to exclude ───────────────────

/**
 * Companies that are commonly mentioned as SOURCES or PLATFORMS
 * rather than as employer competitors. When these names appear in
 * source-reference context ("according to X", "reviews on X", "data from X"),
 * they are not competitor signals.
 */
const SOURCE_PLATFORM_NAMES = new Set([
  "glassdoor", "indeed", "linkedin", "levels.fyi", "payscale",
  "blind", "reddit", "quora", "builtin", "comparably",
  "salary.com", "kununu", "leetcode", "github", "stackoverflow",
  "stack overflow", "ziprecruiter", "monster", "careerbuilder",
  "handshake", "angellist", "wellfound", "teamblind", "fishbowl",
]);

/**
 * Phrases that indicate a company name is being referenced as a source,
 * not as an employer competitor. Checked in a window around the match.
 */
const SOURCE_CONTEXT_PHRASES = [
  "according to",
  "reviews on",
  "data from",
  "reported on",
  "listed on",
  "based on",
  "sourced from",
  "ratings on",
  "found on",
  "available on",
  "published on",
  "per the",
  "survey by",
  "report by",
  "study by",
];

/**
 * Phrases that indicate a company IS being referenced as an employer.
 * If these appear near the company name, it's a competitor signal.
 */
const EMPLOYER_CONTEXT_PHRASES = [
  "work at", "working at", "work for", "working for",
  "jobs at", "careers at", "hiring at", "employed at",
  "join", "joining",
  "offers competitive", "offers strong",
  "is known for", "is a great", "is a top",
  "employees at", "staff at", "teams at",
  "also consider", "consider applying",
  "similar to", "compete with", "competes with",
  "compared to", "versus", " vs ",
  "like working at", "culture at",
  "compensation at", "salary at", "pay at",
  "hires", "recruits", "employs",
];

/**
 * Checks whether a company mention is in source-reference context
 * (and should be excluded) vs employer context (should be included).
 */
function isSourceReference(text: string, matchIndex: number, companyName: string): boolean {
  // If it's a known source/platform, check context carefully
  const isKnownPlatform = SOURCE_PLATFORM_NAMES.has(companyName.toLowerCase());

  // Get a window of text around the match
  const windowStart = Math.max(0, matchIndex - 80);
  const windowEnd = Math.min(text.length, matchIndex + companyName.length + 80);
  const window = text.slice(windowStart, windowEnd).toLowerCase();

  // If employer context phrases are present, it's a competitor — even for platforms
  const hasEmployerContext = EMPLOYER_CONTEXT_PHRASES.some(p => window.includes(p));
  if (hasEmployerContext) return false; // not a source reference, it's an employer mention

  // If source context phrases are present, it's a source reference
  const hasSourceContext = SOURCE_CONTEXT_PHRASES.some(p => window.includes(p));
  if (hasSourceContext) return true;

  // Known platforms without employer context are assumed to be source references
  if (isKnownPlatform) return true;

  // Unknown companies without source context are assumed to be employer mentions
  return false;
}

// ─── Strategy 1: Known company database ──────────────────────

/**
 * Case-insensitive scan for every known company name within the text.
 * Filters out matches that appear in source-reference context.
 */
function extractKnownCompanies(text: string): CandidateHit[] {
  const hits: CandidateHit[] = [];

  // Sort longest-first to prefer specific names over prefixes
  const sorted = [...KNOWN_COMPANIES].sort((a, b) => b.length - a.length);

  for (const company of sorted) {
    const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, "gi");
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      // Skip if this is a source/platform reference, not an employer mention
      if (isSourceReference(text, m.index, company)) continue;

      hits.push({
        name: company,
        context: extractContext(text, m.index),
      });
    }
  }

  return hits;
}

// ─── Strategy 2: Pattern-based extraction ────────────────────

/**
 * Applies improved regex patterns to a single (markdown-stripped) response.
 * Patterns are case-insensitive and match multi-word names more liberally.
 */
function extractByPatterns(text: string): CandidateHit[] {
  const hits: CandidateHit[] = [];

  // Helper: extract a comma-or-"and"-separated list of names starting at pos
  // e.g. "Marriott, Wyndham, and Bluegreen Vacations" → three names
  function extractNameList(src: string, startIndex: number): void {
    // Grab up to ~120 chars after the trigger phrase
    const window = src.slice(startIndex, startIndex + 120);
    // Split on commas and the word "and"/"or", stopping at sentence boundary
    const segment = window.split(/[.!?\n]/)[0] ?? "";
    const parts = segment.split(/,\s*|\s+and\s+|\s+or\s+/);
    for (const part of parts) {
      const trimmed = part.trim().replace(/[.!?;:]+$/, "");
      if (trimmed.length > 0) {
        hits.push({
          name: trimmed,
          context: extractContext(src, startIndex),
        });
      }
    }
  }

  // ── Pattern 1: "companies like X, Y, and Z" / "such as X, Y" / "including X, Y"
  const listIntroPattern =
    /(?:companies like|such as|including|employers like|employers such as|organizations like|brands like|employers including)\s+/gi;
  let m: RegExpExecArray | null;
  while ((m = listIntroPattern.exec(text)) !== null) {
    extractNameList(text, m.index + m[0].length);
  }

  // ── Pattern 2: "X vs Y", "X versus Y", "X compared to Y"
  const wordChunk = "[\\w][\\w .&+'-]{1,40}";
  const vsPattern = new RegExp(
    `(${wordChunk})\\s+(?:vs\\.?|versus|compared to|over)\\s+(${wordChunk})`,
    "gi",
  );
  while ((m = vsPattern.exec(text)) !== null) {
    hits.push({ name: m[1].trim(), context: extractContext(text, m.index) });
    hits.push({ name: m[2].trim(), context: extractContext(text, m.index) });
  }

  // ── Pattern 3: numbered / bulleted lists
  // Matches "1. Some Company Name" or "- Some Company Name" or "• Name"
  const listItemPattern =
    /(?:^|\n)\s*(?:\d+[.)]\s*|[-*•]\s*)([A-Za-z][A-Za-z0-9 &.+'-]{1,60})/gm;
  while ((m = listItemPattern.exec(text)) !== null) {
    const name = m[1].trim().split(/[,:;—]/)[0]?.trim() ?? "";
    if (name) hits.push({ name, context: extractContext(text, m.index) });
  }

  // ── Pattern 4: "work at X", "join X", "role at X", etc. (case-insensitive)
  const workAtPattern =
    /(?:work(?:ing)? at|join(?:ing)?|engineer(?:s)? at|hiring at|role at|position at|job at|employed at|employed by|career at|careers at)\s+([A-Za-z][A-Za-z0-9 &.+'-]{1,50})/gi;
  while ((m = workAtPattern.exec(text)) !== null) {
    const name = m[1].trim().split(/[,;.!?]/)[0]?.trim() ?? "";
    if (name) hits.push({ name, context: extractContext(text, m.index) });
  }

  // ── Pattern 5: "also consider X", "consider X", "look at X", "explore X"
  const considerPattern =
    /(?:also consider|consider|look at|explore|check out)\s+([A-Za-z][A-Za-z0-9 &.+'-]{1,50})/gi;
  while ((m = considerPattern.exec(text)) !== null) {
    const name = m[1].trim().split(/[,;.!?]/)[0]?.trim() ?? "";
    if (name) hits.push({ name, context: extractContext(text, m.index) });
  }

  return hits;
}

// ─── Strategy 3: Sentence-level company signal ───────────────

const EMPLOYER_SENTENCE_PATTERNS: RegExp[] = [
  // "{Name} is known for" / "{Name} offers" / "{Name} provides"
  /\b([A-Za-z][A-Za-z0-9 &.+'-]{1,40})\s+(?:is known for|offers|provides|features)\b/gi,
  // "at {Name}, employees" / "working at {Name}" / "at {Name}'s"
  /\bat\s+([A-Za-z][A-Za-z0-9 &.+'-]{1,40})(?:'s|,|\s+(?:employees|sales|team|culture|career))/gi,
  // "{Name}'s sales team" / "{Name}'s culture"
  /\b([A-Za-z][A-Za-z0-9 &.+'-]{1,40})'s\s+(?:sales|culture|team|compensation|benefits|reps|recruiters)\b/gi,
  // "like {Name} and {Name}" in general prose
  /\blike\s+([A-Za-z][A-Za-z0-9 &.+'-]{1,40})\s+and\s+([A-Za-z][A-Za-z0-9 &.+'-]{1,40})\b/gi,
];

function extractBySentencePatterns(text: string): CandidateHit[] {
  const hits: CandidateHit[] = [];

  for (const pattern of EMPLOYER_SENTENCE_PATTERNS) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      for (let g = 1; g < m.length; g++) {
        if (m[g]) {
          hits.push({
            name: m[g].trim(),
            context: extractContext(text, m.index),
          });
        }
      }
    }
  }

  return hits;
}

// ─── Orchestrator ─────────────────────────────────────────────

/**
 * Applies all three extraction strategies to a single response text and
 * returns every (candidate, context) pair found.
 *
 * Strategy 1 (known companies) runs first and is highest-signal.
 * Strategy 2 (improved patterns) is medium-signal.
 * Strategy 3 (sentence-level) is lowest-signal and most likely to false-positive.
 */
function extractCandidatesFromResponse(text: string): CandidateHit[] {
  const clean = stripMarkdown(text);
  return [
    ...extractKnownCompanies(clean),
    ...extractByPatterns(clean),
    ...extractBySentencePatterns(clean),
  ];
}

// ─── Main export ─────────────────────────────────────────────

/**
 * Heuristic competitor discovery from scan response texts.
 *
 * Scans all response texts for company-like names that are not the client
 * and not already known competitors. Returns candidates sorted by the number
 * of distinct responses they appeared in, descending.
 *
 * This is intentionally heuristic — false positives are expected and the
 * operator reviews the list before adding any competitor.
 *
 * @param results          Scan result payloads (response text + metadata).
 * @param clientName       The client company name to exclude from results.
 * @param knownCompetitors Already-tracked competitor names to exclude.
 */
export function discoverCompetitors(
  results: Array<{
    response: string;
    mentioned: boolean;
    metadata: unknown;
  }>,
  clientName: string,
  knownCompetitors: string[],
): DiscoveredCompetitor[] {
  // Build exclusion set (client + known competitors), normalized to lowercase
  const excluded = new Set<string>();
  excluded.add(clientName.toLowerCase().trim());
  for (const name of knownCompetitors) {
    excluded.add(name.toLowerCase().trim());
  }

  // Map from normalized key → { canonical name, responseSet, contexts }
  const accumulator = new Map<
    string,
    { canonical: string; responseIndices: Set<number>; contexts: string[] }
  >();

  for (let i = 0; i < results.length; i++) {
    const { response } = results[i];
    if (!response || !response.trim()) continue;

    const hits = extractCandidatesFromResponse(response);

    for (const { name, context } of hits) {
      const canonical = normalizeCandidate(name);
      const key = canonical.toLowerCase();

      if (excluded.has(key)) continue;
      if (isFalsePositive(canonical)) continue;

      const entry = accumulator.get(key) ?? {
        canonical,
        responseIndices: new Set<number>(),
        contexts: [],
      };

      entry.responseIndices.add(i);

      // Keep up to 3 context snippets per candidate
      if (entry.contexts.length < 3 && context.length > 0) {
        entry.contexts.push(context);
      }

      accumulator.set(key, entry);
    }
  }

  // Filter by minimum appearances and convert to output shape
  const candidates: DiscoveredCompetitor[] = [];
  for (const { canonical, responseIndices, contexts } of accumulator.values()) {
    if (responseIndices.size < MIN_RESPONSE_APPEARANCES) continue;
    candidates.push({
      name: canonical,
      mentionCount: responseIndices.size,
      mentionContexts: contexts,
    });
  }

  // Sort descending by mention count, then alphabetically for stability
  candidates.sort((a, b) => {
    if (b.mentionCount !== a.mentionCount) return b.mentionCount - a.mentionCount;
    return a.name.localeCompare(b.name);
  });

  return candidates.slice(0, MAX_RESULTS);
}
