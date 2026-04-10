import { z } from "zod";
import { QUERY_THEMES } from "./query-intelligence";
import type { QueryTheme, QuerySource } from "./query-intelligence";
import { classifyQueryStage } from "./decision-journey/classifier";
import type { DecisionStage } from "./decision-journey/types";

// ─── Constants ───────────────────────────────────────────────

/** Maximum number of supplemental queries accepted, even if the LLM returns more. */
const MAX_SUPPLEMENTAL_QUERIES = 30;

/** Minimum word count for a query to be considered valid. */
const MIN_WORD_COUNT = 5;

const VALID_STAGES: DecisionStage[] = [
  "DISCOVERY",
  "EVALUATION",
  "CONSIDERATION",
  "COMMITMENT",
];

// ─── Input / Output types ────────────────────────────────────

export interface SupplementalQueryInput {
  clientName: string;
  clientDomain: string;
  industry: string;
  description?: string;
  roleTitle: string;
  geography?: string;
  competitors: Array<{ name: string; domain?: string }>;
  nicheKeywords?: string[];
  /** All existing query texts across all clusters for this client + role. Used for dedup prompt context. */
  existingQueryTexts: string[];
  /** Optional scan findings to focus the LLM on genuine gaps. */
  scanSummary?: {
    mentionRate: number;
    topThemes: string[];
    gapThemes: string[];
    competitorMentionRates: Record<string, number>;
  };
}

export interface SupplementalQuery {
  text: string;
  theme: QueryTheme;
  stage: DecisionStage;
  rationale: string;
  source: QuerySource; // always "llm" for supplemental queries
}

// ─── Zod schema for LLM output validation ───────────────────

const SupplementalQueryItemSchema = z.object({
  text: z.string().min(1),
  theme: z.enum(QUERY_THEMES),
  stage: z.enum(["DISCOVERY", "EVALUATION", "CONSIDERATION", "COMMITMENT"] as [
    DecisionStage,
    DecisionStage,
    DecisionStage,
    DecisionStage,
  ]),
  rationale: z.string().min(1),
});

const SupplementalQueryArraySchema = z.array(SupplementalQueryItemSchema);

// ─── Validation ──────────────────────────────────────────────

/**
 * Parse and validate the LLM's raw JSON response into `SupplementalQuery[]`.
 *
 * Validation pipeline:
 * 1. Strip markdown code fences if the LLM wrapped its JSON.
 * 2. JSON.parse — if it fails, return [].
 * 3. Zod array validation — drops any item that fails the schema.
 * 4. Minimum word count filter — drops queries shorter than 5 words.
 * 5. Stage validation — additional guard (Zod already enforces this via enum).
 * 6. Cap at MAX_SUPPLEMENTAL_QUERIES.
 * 7. Tag all survivors with source: "llm".
 *
 * @param raw       The raw string returned by the LLM.
 * @param clientName  Used in the generic-query filter (queries that are just
 *                  "What is it like to work at {clientName}" are dropped).
 */
export function validateSupplementalQueries(
  raw: unknown,
  clientName: string,
): SupplementalQuery[] {
  if (typeof raw !== "string" || !raw.trim()) return [];

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const clientLower = clientName.toLowerCase().trim();

  const valid: SupplementalQuery[] = [];

  for (const item of parsed) {
    // Zod validates theme, stage, and non-empty text/rationale.
    const result = SupplementalQueryItemSchema.safeParse(item);
    if (!result.success) continue;

    const { text, theme, stage, rationale } = result.data;

    // Minimum word count — single-word or fragment queries add no value.
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < MIN_WORD_COUNT) continue;

    // Filter out queries that are just the canonical generic template:
    // "what is it like to work at {company}" — that query is already in
    // every template set and adds no supplemental value.
    const textLower = text.toLowerCase();
    if (
      textLower.includes("what is it like to work at") &&
      textLower.includes(clientLower)
    ) {
      continue;
    }

    // Stage must be one of the 4 valid values (Zod enum already enforces this,
    // but we keep an explicit guard as documentation of the invariant).
    if (!VALID_STAGES.includes(stage)) continue;

    valid.push({ text, theme, stage, rationale, source: "llm" });

    if (valid.length >= MAX_SUPPLEMENTAL_QUERIES) break;
  }

  return valid;
}

// ─── Stage verification ──────────────────────────────────────

/**
 * Verify and, where necessary, correct the LLM's stage assignment for each
 * supplemental query.
 *
 * Rules (per spec R6):
 * - LLM said CONSIDERATION but classifier says DISCOVERY (no company name in
 *   the query): override to DISCOVERY. This rule is deterministic and correct.
 * - All other disagreements: keep the LLM's assignment. The LLM has broader
 *   context about the query's purpose than the keyword classifier.
 *
 * Disagreements are collected and returned for logging/prompt-tuning analysis.
 */
export function verifySupplementalStages(
  queries: SupplementalQuery[],
  clientName: string,
  competitorNames: string[],
): {
  queries: SupplementalQuery[];
  disagreements: Array<{ text: string; llmStage: string; classifierStage: string; overridden: boolean }>;
} {
  const disagreements: Array<{
    text: string;
    llmStage: string;
    classifierStage: string;
    overridden: boolean;
  }> = [];

  const verified = queries.map((q) => {
    const classifierStage = classifyQueryStage(q.text, clientName, competitorNames);

    if (classifierStage === q.stage) return q;

    const overridden =
      q.stage === "CONSIDERATION" && classifierStage === "DISCOVERY";

    disagreements.push({
      text: q.text,
      llmStage: q.stage,
      classifierStage,
      overridden,
    });

    if (overridden) {
      return { ...q, stage: "DISCOVERY" as DecisionStage };
    }

    return q;
  });

  return { queries: verified, disagreements };
}
