/**
 * response-themes.ts
 *
 * Extracts qualitative themes from AI response texts using keyword matching.
 * No LLM calls -- pure heuristic extraction that runs at report generation time.
 *
 * Surfaces:
 *   - Positive and negative employer attributes AI highlights
 *   - Companies mentioned that are NOT in the tracked competitor set
 *   - How AI frames the company's industry identity (tech vs retail, etc.)
 *   - Whether AI has specific vs vague compensation data
 *   - Whether AI has specific vs vague culture data
 */

import { KNOWN_COMPANIES } from "./competitor-discovery";

// ─── Output type ─────────────────────────────────────────────

export interface ResponseThemes {
  /** Positive attributes AI highlights about the company (e.g. "innovative", "strong benefits") */
  positiveAttributes: string[];
  /** Negative attributes or warnings AI mentions (e.g. "bureaucratic", "below market pay") */
  negativeAttributes: string[];
  /** Companies AI mentions that are NOT in the tracked competitor list */
  unsolicitedCompetitors: string[];
  /** How AI categorizes the company's industry identity */
  industryFraming: string;
  /** Whether AI provides specific compensation data, vague references, or nothing */
  compensationDetail: "specific" | "vague" | "absent";
  /** Whether AI provides specific culture details, vague references, or nothing */
  cultureDetail: "specific" | "vague" | "absent";
}

// ─── Keyword dictionaries ────────────────────────────────────

/** Positive attribute patterns — each entry is [keyword/phrase to match, label to surface]. */
const POSITIVE_PATTERNS: Array<[RegExp, string]> = [
  [/\binnovati(?:ve|on|ng)\b/i, "innovative"],
  [/\bcutting[- ]edge\b/i, "cutting-edge technology"],
  [/\bgreat (?:culture|work culture|company culture)\b/i, "strong culture"],
  [/\bstrong (?:benefits|benefit package)\b/i, "strong benefits"],
  [/\bcareer (?:growth|advancement|development|progression)\b/i, "career growth"],
  [/\bcompetitive (?:salary|pay|compensation|total comp)\b/i, "competitive compensation"],
  [/\bwork[- ]life balance\b/i, "work-life balance"],
  [/\bmission[- ]driven\b/i, "mission-driven"],
  [/\bdiverse|diversity|inclusive|inclusion\b/i, "diversity and inclusion"],
  [/\bremote[- ](?:friendly|first|work)\b/i, "remote-friendly"],
  [/\bemployee (?:ownership|stock|equity)\b/i, "employee equity"],
  [/\blearning (?:opportunities|culture)\b/i, "learning culture"],
  [/\bstable|stability\b/i, "stability"],
  [/\bimpactful|meaningful work\b/i, "meaningful work"],
  [/\bsign-?on bonus\b/i, "sign-on bonus"],
  [/\bgood (?:pay|compensation|salary)\b/i, "good compensation"],
  [/\bgenerous (?:pto|vacation|time off|parental leave|benefits)\b/i, "generous benefits"],
  [/\btop[- ]tier (?:talent|team|engineering)\b/i, "top-tier talent"],
  [/\bscale|at scale\b/i, "operates at scale"],
  [/\bopen source|open-source\b/i, "open source contributor"],
];

/** Negative attribute patterns — these surface concerns or caveats in AI descriptions. */
const NEGATIVE_PATTERNS: Array<[RegExp, string]> = [
  [/\bbureaucra(?:tic|cy)\b/i, "bureaucratic"],
  [/\bslow[- ](?:moving|paced|to change)\b/i, "slow-moving"],
  [/\boutdated (?:technology|tech|stack|tools|practices)\b/i, "outdated technology"],
  [/\bhigh (?:turnover|attrition)\b/i, "high turnover"],
  [/\bbelow[- ]?market (?:pay|compensation|salary)\b/i, "below-market pay"],
  [/\brigid|inflexible\b/i, "rigid culture"],
  [/\bcorporate (?:bureaucracy|red tape|politics)\b/i, "corporate bureaucracy"],
  [/\blong (?:hours|work hours|working hours)\b/i, "long hours"],
  [/\bburnout\b/i, "burnout risk"],
  [/\bpoor (?:management|leadership|work-life)\b/i, "management concerns"],
  [/\blimited (?:growth|advancement|mobility)\b/i, "limited growth"],
  [/\blegacy (?:systems?|code|tech|technology|infrastructure)\b/i, "legacy technology"],
  [/\bmicromanag/i, "micromanagement"],
  [/\bnot (?:known|recognized) (?:as|for) (?:a )?tech\b/i, "not recognized as tech employer"],
  [/\bwork-life (?:balance )?(?:can be|is|may be) (?:challenging|difficult|poor)\b/i, "work-life balance concerns"],
  [/\blayoff|downsiz/i, "layoff concerns"],
  [/\breturn[- ]to[- ]office|RTO\b/i, "return-to-office policy"],
];

/** Patterns that indicate tech-employer framing vs traditional industry framing. */
const TECH_FRAMING_PATTERNS: RegExp[] = [
  /\btech(?:nology)? company\b/i,
  /\bengineering[- ](?:first|driven|focused|led)\b/i,
  /\bplatform company\b/i,
  /\btech employer\b/i,
  /\bsoftware (?:company|organization)\b/i,
  /\bdigital[- ](?:first|native|transformation leader)\b/i,
];

const TRADITIONAL_FRAMING_PATTERNS: Array<[RegExp, string]> = [
  [/\bretail(?:er| company| giant| chain)\b/i, "retail company"],
  [/\bbank(?:ing)?(?:\s+(?:company|institution|firm))?\b/i, "banking institution"],
  [/\bfinancial (?:services|institution)\b/i, "financial services company"],
  [/\bconsumer (?:goods|products) company\b/i, "consumer goods company"],
  [/\bhealthcare (?:company|organization|provider)\b/i, "healthcare company"],
  [/\bmanufactur(?:ing|er)\b/i, "manufacturing company"],
  [/\benergy company\b/i, "energy company"],
  [/\bhospitality (?:company|group)\b/i, "hospitality company"],
  [/\binsurance (?:company|provider)\b/i, "insurance company"],
  [/\btelecommunications?\b/i, "telecommunications company"],
  [/\btransportation (?:company|provider)\b/i, "transportation company"],
  [/\bpharmaceutical\b/i, "pharmaceutical company"],
];

/** Patterns that indicate specific compensation data vs vague references. */
const SPECIFIC_COMP_PATTERNS: RegExp[] = [
  /\$\s*\d{2,3}[kK]/,              // $150k
  /\$\s*\d{3},?\d{3}/,             // $150,000 or $150000
  /\b\d{2,3}[kK]\s*[-–]\s*\d{2,3}[kK]\b/, // 120k-180k
  /\b(?:RSU|restricted stock)\b/i,
  /\b(?:equity|stock option|stock grant)\b.*\b(?:\$|vesting|shares)\b/i,
  /\bsign[- ]?on\s+bonus\s*(?:of\s*)?\$\d/i,
  /\b(?:base salary|total comp|base pay)\s+(?:of\s+)?\$\d/i,
  /\bband\s+\d|level\s+\d.*\$\d/i,
];

const VAGUE_COMP_PATTERNS: RegExp[] = [
  /\bcompetitive (?:salary|pay|compensation)\b/i,
  /\battractive (?:salary|pay|compensation|package)\b/i,
  /\bgood (?:salary|pay|compensation)\b/i,
  /\bwell[- ]compensated\b/i,
  /\bsalary\b/i,
  /\bcompensation\b/i,
];

/** Patterns for culture detail specificity. */
const SPECIFIC_CULTURE_PATTERNS: RegExp[] = [
  /\b(?:glassdoor|comparably|indeed)\s+(?:rating|score|review)\s*(?:of\s*)?\d/i,
  /\b\d+(?:\.\d+)?(?:\/5| out of 5| stars?)\b/i,
  /\b(?:4-day|four-day) work week\b/i,
  /\bunlimited (?:PTO|vacation|time off)\b/i,
  /\b(?:hybrid|remote|in-office)\s+(?:\d|three|two|four)\s+days?\b/i,
  /\bemployee (?:NPS|net promoter)\b/i,
  /\b(?:employee|culture)\s+(?:rating|score)\b/i,
];

const VAGUE_CULTURE_PATTERNS: RegExp[] = [
  /\bgood (?:culture|work culture|environment)\b/i,
  /\bnice (?:culture|work environment|place to work)\b/i,
  /\bculture\b/i,
  /\bwork environment\b/i,
  /\bteam environment\b/i,
];

// ─── Extraction logic ────────────────────────────────────────

function matchPatterns(
  text: string,
  patterns: Array<[RegExp, string]>,
): string[] {
  const matches = new Set<string>();
  for (const [pattern, label] of patterns) {
    if (pattern.test(text)) {
      matches.add(label);
    }
  }
  return [...matches];
}

function detectDetailLevel(
  text: string,
  specificPatterns: RegExp[],
  vaguePatterns: RegExp[],
): "specific" | "vague" | "absent" {
  for (const pattern of specificPatterns) {
    if (pattern.test(text)) return "specific";
  }
  for (const pattern of vaguePatterns) {
    if (pattern.test(text)) return "vague";
  }
  return "absent";
}

function detectIndustryFraming(
  text: string,
  clientName: string,
): string {
  // Look for sentences that contain the client name and a framing pattern
  // First check for tech framing
  const clientLower = clientName.toLowerCase();
  const sentences = text.split(/[.!?\n]+/);

  let hasTechFraming = false;
  let traditionalFraming: string | null = null;

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    // Only consider sentences that reference the client
    if (!lower.includes(clientLower)) continue;

    for (const pattern of TECH_FRAMING_PATTERNS) {
      if (pattern.test(sentence)) {
        hasTechFraming = true;
      }
    }
    for (const [pattern, label] of TRADITIONAL_FRAMING_PATTERNS) {
      if (pattern.test(sentence)) {
        traditionalFraming = label;
      }
    }
  }

  // If both, note the tension
  if (hasTechFraming && traditionalFraming) {
    return `${traditionalFraming} with tech presence`;
  }
  if (hasTechFraming) return "tech employer";
  if (traditionalFraming) return traditionalFraming;

  // Fallback: check the entire text (not just client-specific sentences)
  for (const pattern of TECH_FRAMING_PATTERNS) {
    if (pattern.test(text)) return "tech employer";
  }
  for (const [pattern, label] of TRADITIONAL_FRAMING_PATTERNS) {
    if (pattern.test(text)) return label;
  }

  return "not clearly categorized";
}

/**
 * Scans response texts for company names from the KNOWN_COMPANIES list that
 * are NOT the client and NOT in the known competitor set.
 */
function detectUnsolicitedCompetitors(
  responses: string[],
  clientName: string,
  knownCompetitors: string[],
): string[] {
  const excluded = new Set<string>();
  excluded.add(clientName.toLowerCase().trim());
  for (const name of knownCompetitors) {
    excluded.add(name.toLowerCase().trim());
  }

  // Count mentions across responses
  const mentionCounts = new Map<string, number>();

  for (const response of responses) {
    if (!response || !response.trim()) continue;
    const lower = response.toLowerCase();

    for (const company of KNOWN_COMPANIES) {
      const companyLower = company.toLowerCase();
      if (excluded.has(companyLower)) continue;

      // Word boundary match to avoid partial matches
      const regex = new RegExp(`\\b${escapeRegex(company)}\\b`, "i");
      if (regex.test(response)) {
        mentionCounts.set(company, (mentionCounts.get(company) ?? 0) + 1);
      }
    }
  }

  // Return companies mentioned in 2+ responses, sorted by frequency
  return [...mentionCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 5);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Main export ─────────────────────────────────────────────

/**
 * Extracts qualitative themes from an array of AI response texts.
 *
 * @param responses     Array of raw AI response texts (from ScanResult.response)
 * @param clientName    The client company name
 * @param knownCompetitors Names of tracked competitors (to exclude from unsolicited detection)
 */
export function extractResponseThemes(
  responses: string[],
  clientName: string,
  knownCompetitors: string[] = [],
): ResponseThemes {
  // Concatenate all responses for aggregate analysis
  const allText = responses.filter(Boolean).join("\n\n");

  if (!allText.trim()) {
    return {
      positiveAttributes: [],
      negativeAttributes: [],
      unsolicitedCompetitors: [],
      industryFraming: "not clearly categorized",
      compensationDetail: "absent",
      cultureDetail: "absent",
    };
  }

  const positiveAttributes = matchPatterns(allText, POSITIVE_PATTERNS);
  const negativeAttributes = matchPatterns(allText, NEGATIVE_PATTERNS);
  const unsolicitedCompetitors = detectUnsolicitedCompetitors(
    responses,
    clientName,
    knownCompetitors,
  );
  const industryFraming = detectIndustryFraming(allText, clientName);
  const compensationDetail = detectDetailLevel(
    allText,
    SPECIFIC_COMP_PATTERNS,
    VAGUE_COMP_PATTERNS,
  );
  const cultureDetail = detectDetailLevel(
    allText,
    SPECIFIC_CULTURE_PATTERNS,
    VAGUE_CULTURE_PATTERNS,
  );

  return {
    positiveAttributes,
    negativeAttributes,
    unsolicitedCompetitors,
    industryFraming,
    compensationDetail,
    cultureDetail,
  };
}

/**
 * Extracts themes for a specific stage from the responses assigned to that stage.
 * Convenience wrapper that calls extractResponseThemes on a filtered set.
 */
export function extractStageThemes(
  stageResponses: string[],
  clientName: string,
  knownCompetitors: string[] = [],
): ResponseThemes {
  return extractResponseThemes(stageResponses, clientName, knownCompetitors);
}
