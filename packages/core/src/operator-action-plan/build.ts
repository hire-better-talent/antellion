// ── Operator Action Plan — Build function ────────────────────
//
// Pure transform: ReportMetadata + client context → OperatorActionPlan.
// No LLM calls. No DB writes. Reads what generateReport() already wrote.
//
// Phase 1: deterministic rules only.
// Phase 2 (after 3–5 real deliveries): add LLM synthesis for pushback.

import type { ReportMetadata, OperatorActionPlan } from "./types";
import { detectTriggerFlags } from "./trigger-detection";
import { buildValidationItems } from "./builders/validation";
import { buildTalkingPoints, MAX_TALKING_POINTS } from "./builders/talking-points";
import { buildRedFlags } from "./builders/red-flags";
import { buildNextEngagementPlan } from "./builders/next-engagement";
import { buildPushbackPredictions } from "./rules/pushback";
import { buildUpsellOpportunities } from "./rules/upsell";
import { buildClientQuestions, MAX_CLIENT_QUESTIONS } from "./rules/questions";
import { DEFAULT_UPSELL_PRIORITY } from "./rules/next-engagement";

export interface OperatorActionPlanInput {
  reportId: string;
  clientName: string;
  metadata: ReportMetadata;
  /**
   * Domains of content assets already created for this client.
   * Used for platform-gap detection in trigger flags.
   */
  contentAssetDomains?: string[];
}

/**
 * Build the complete Operator Action Plan from existing report metadata.
 *
 * This is the only public entry point for Phase 1. Callers pass the
 * report's id, the client's display name, and the raw metadata JSON
 * (cast from Prisma's JSON column — same pattern as other metadata consumers).
 *
 * Design note (future auth):
 *   When multi-org auth ships and role checks are real, the page that calls
 *   this function should gate on `role: "OPERATOR" | "OWNER"` before calling.
 *   The transform itself has no access control — that belongs in the route.
 */
export function buildOperatorActionPlan(
  input: OperatorActionPlanInput,
): OperatorActionPlan {
  const { reportId, clientName, metadata } = input;

  // ── Compute trigger flags once ────────────────────────────
  // All builders consume the same flags object — one source of truth
  // for which conditions fired on this report.
  const flags = detectTriggerFlags(metadata);

  // ── Build each section ────────────────────────────────────

  const validationItems = buildValidationItems(metadata, flags);

  // Top MAX_TALKING_POINTS by compelling score (builder already sorts and caps)
  const talkingPoints = buildTalkingPoints(metadata, flags).slice(0, MAX_TALKING_POINTS);

  const pushbackPredictions = buildPushbackPredictions(flags);

  // Upsell opportunities (unsorted — next-engagement builder uses priority list)
  const upsellOpportunities = buildUpsellOpportunities(flags);

  // Red flags sorted critical > major > advisory (builder handles sort)
  const redFlags = buildRedFlags(metadata, flags);

  // Next engagement: derived from upsell list + DEFAULT_UPSELL_PRIORITY
  const nextEngagementPlan = buildNextEngagementPlan(metadata, flags, upsellOpportunities);

  // Client questions: select in DEFAULT_UPSELL_PRIORITY order, cap at MAX_CLIENT_QUESTIONS
  const allQuestions = buildClientQuestions(flags);
  const clientQuestions = selectQuestionsInPriorityOrder(allQuestions).slice(
    0,
    MAX_CLIENT_QUESTIONS,
  );

  return {
    reportId,
    clientName,
    generatedAt: new Date().toISOString(),
    validationItems,
    talkingPoints,
    pushbackPredictions,
    upsellOpportunities,
    redFlags,
    nextEngagementPlan,
    clientQuestions,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Select client questions in DEFAULT_UPSELL_PRIORITY order.
 *
 * The priority list controls the upsell ordering; questions are coupled to
 * upsell triggers. We walk the priority list and pull the question whose
 * triggerId aligns with the engagement type that fired first.
 *
 * Questions whose triggerIds don't match a priority-list upsell are appended
 * in their original rule-table order after the priority-ordered ones.
 */
function selectQuestionsInPriorityOrder(
  questions: ReturnType<typeof buildClientQuestions>,
) {
  // Map from upsell engagementType to the paired triggerId(s) in QUESTION_RULES
  const PRIORITY_TRIGGER_MAP: Record<string, string[]> = {
    content_authoring: ["glassdoor_ownership_question", "content_pipeline_question"],
    monitoring: ["volatility_review_cadence_question"],
    advisory: ["competitor_benchmarking_question"],
    snapshot_upgrade: ["no_baseline_question"],
    full_assessment: ["no_baseline_question", "critical_stage_channels_question"],
  };

  const prioritized: typeof questions = [];
  const remaining: typeof questions = [];
  const addedIds = new Set<string>();

  for (const engagementType of DEFAULT_UPSELL_PRIORITY) {
    const triggerIds = PRIORITY_TRIGGER_MAP[engagementType] ?? [];
    for (const triggerId of triggerIds) {
      const q = questions.find((q) => q.triggerId === triggerId);
      if (q && !addedIds.has(q.triggerId)) {
        prioritized.push(q);
        addedIds.add(q.triggerId);
      }
    }
  }

  for (const q of questions) {
    if (!addedIds.has(q.triggerId)) {
      remaining.push(q);
    }
  }

  return [...prioritized, ...remaining];
}
