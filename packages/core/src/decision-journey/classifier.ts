import type { DecisionStage } from "./types";

// ─── Term lists ──────────────────────────────────────────────

/** Terms that signal Commitment intent (action/process specifics). */
const COMMITMENT_TERMS = [
  "interview",
  "hiring process",
  "how to get hired",
  "how to apply",
  "application process",
  "onboarding",
  "offer",
  "first 90 days",
  "first day",
  "negotiate",
  "negotiation",
  "start date",
];

/** Terms that signal Evaluation intent (comparison or benchmarking). */
const EVALUATION_TERMS = [
  " vs ",
  " versus ",
  " compared to ",
  " compare ",
  " or ",
  "better than",
  "salary",
  "compensation",
  "pay ",
  "pays ",
  "equity",
  "stock",
  "benefits",
  "perks",
];

// ─── Classifier ──────────────────────────────────────────────

/**
 * Classifies a single query into a candidate decision stage.
 *
 * Rules applied in priority order:
 * 1. DISCOVERY — query does NOT contain the client name
 * 2. COMMITMENT — query contains the client name AND contains commitment terms
 * 3. EVALUATION — query contains the client name AND comparison/benchmarking terms
 *    OR contains two company names with comparison language
 * 4. CONSIDERATION — default for any company-specific query not matching above
 *
 * @param queryText      The raw query string.
 * @param clientName     The client's company name.
 * @param competitorNames  Names of all known competitors.
 * @returns The classified DecisionStage.
 */
export function classifyQueryStage(
  queryText: string,
  clientName: string,
  competitorNames: string[],
): DecisionStage {
  if (!queryText) return "DISCOVERY";

  const lower = queryText.toLowerCase();
  const clientLower = clientName.toLowerCase().trim();

  // ── Rule 1: DISCOVERY ──
  // Query does not reference the client by name at all.
  if (!lower.includes(clientLower)) {
    return "DISCOVERY";
  }

  // ── Rule 2: COMMITMENT ──
  // Query names the client AND contains action/process terms.
  if (COMMITMENT_TERMS.some((term) => lower.includes(term))) {
    return "COMMITMENT";
  }

  // ── Rule 3: EVALUATION ──
  // Query names the client AND contains comparison or benchmarking terms.
  // Also triggers if a competitor name appears alongside comparison language.
  const hasComparisonTerm = EVALUATION_TERMS.some((term) =>
    lower.includes(term),
  );

  if (hasComparisonTerm) {
    return "EVALUATION";
  }

  // Check for two company names with any comparison language
  const mentionsCompetitor = competitorNames.some((c) =>
    lower.includes(c.toLowerCase().trim()),
  );
  if (mentionsCompetitor) {
    // Client + competitor both named → comparison context
    return "EVALUATION";
  }

  // ── Rule 4: CONSIDERATION (default) ──
  return "CONSIDERATION";
}
