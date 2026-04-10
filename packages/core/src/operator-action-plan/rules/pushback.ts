// ── Operator Action Plan — Pushback Rule Table ───────────────
//
// Static rule table for Section C: Predicted Pushback.
// Each rule has a trigger condition (function of TriggerFlags) and
// pushback content. These are JSON-literal data, not classes.
//
// Rules reference report-specific numbers via template placeholders:
//   {clientName}   — the client's company name
//   {n}            — total query count
//   {sourcedPct}   — overall sourced rate as a percentage
//   {competitor}   — top competitor name
//   {criticalStage} — name of the critical gap stage
//   {funnelPct}    — funnel throughput as a percentage
//
// Placeholders are resolved at render time (builders/talking-points.ts
// or the UI layer). The rule table stores templates, not interpolated strings.
//
// ── Known coverage gaps ─────────────────────────────────────
//
// This table intentionally does NOT cover situational objections — the most
// common real objections in enterprise sales:
//
//   - "We're in a hiring freeze."
//   - "This isn't a priority this quarter."
//   - "Budget cycle is locked until Q3."
//   - "We just got a new CHRO — she wants to set her own agenda first."
//
// These are not report-derived. No combination of journeyAnalysis, confidence,
// or competitors tells us the client froze hiring last week. Attempting to
// trigger them from metadata would produce false positives and undermine
// trust in the rest of the action plan.
//
// Where they belong: a separate sales onboarding playbook (not in scope here).
// The action plan handles report-derived objections; the onboarding playbook
// handles situational ones.

import type { TriggerFlags, PushbackPrediction } from "../types";

interface PushbackRule {
  triggerId: string;
  condition: (flags: TriggerFlags) => boolean;
  anticipatedObjection: string;
  preparedResponse: string;
  supportingEvidence: string;
}

export const PUSHBACK_RULES: PushbackRule[] = [
  {
    triggerId: "glassdoor_investment_objection",
    condition: (f) => f.hasGlassdoorGap,
    anticipatedObjection: "But we already invest heavily in Glassdoor",
    preparedResponse:
      "Right — and that's exactly why the gap is surprising. In the Discovery queries we ran, AI cited glassdoor.com but not {clientName} specifically. The presence exists; the authority signal does not. That's a content and review-volume problem, not a 'do we have a page' problem.",
    supportingEvidence:
      "Glassdoor.com appears in competitor citation sources at this stage but is absent from {clientName} citations. This is visible in the gap domains for the Discovery stage.",
  },
  {
    triggerId: "single_scan_credibility_objection",
    condition: (f) => f.isFirstAssessment,
    anticipatedObjection: "How do I know this isn't just one bad day with the AI?",
    preparedResponse:
      "Fair question. This report is built from {n} queries across multiple models. For any finding in the report, we can re-run it live. We also track stability — findings labeled as volatile are specifically those that showed inconsistency across runs.",
    supportingEvidence:
      "Total query count ({n}) and stability classifications are visible in the scan detail. Volatile findings are explicitly flagged in the red flags section.",
  },
  {
    triggerId: "recruiter_relationship_deflection",
    condition: (f) => f.hasCriticalEvaluationGap || f.hasCriticalDiscoveryGap,
    anticipatedObjection:
      "Our recruiters say candidates love us once they're talking to us",
    preparedResponse:
      "That's consistent with what we found — it's the stages before the recruiter call where the pipeline is leaking. At current rates, {funnelPct}% of AI-researching candidates reach the comparison stage with {clientName} in the running. The issue isn't closing; it's being on the list.",
    supportingEvidence:
      "Funnel throughput rate and critical gap stage ({criticalStage}) are derived from the journey analysis. Discovery and Evaluation mention rates show where {clientName} drops off before candidates reach recruiter outreach.",
  },
  {
    triggerId: "size_vs_visibility_objection",
    condition: (f) => f.hasStrongCompetitorContrast,
    anticipatedObjection:
      "We're bigger than {competitor} — why are they beating us here?",
    preparedResponse:
      "Size and AI surfacing aren't correlated. {competitor} has dense presence on employer platforms that AI indexes heavily — Glassdoor, builtin.com, levels.fyi — and that presence drives the gap. Revenue and headcount aren't what the model is trained on; indexed content is.",
    supportingEvidence:
      "Competitor gap domains in the report show exactly which platforms {competitor} is cited from that {clientName} is not. The gap is platform presence, not company size.",
  },
  {
    triggerId: "sourcing_methodology_objection",
    condition: (f) => f.hasLowSourcedRate,
    anticipatedObjection: "Where is this data coming from?",
    preparedResponse:
      "The AI responses themselves are the data — {n} outputs from actual queries. Sourcing rate is intentionally one of our metrics: a {sourcedPct}% sourced rate tells us AI is recalling {clientName} from training memory rather than fresh indexed content. That's a finding, not a weakness in the method — it means the content landscape is thin.",
    supportingEvidence:
      "Overall sourced rate ({sourcedPct}%) and per-stage sourced rates are in the report metadata. Low sourced rates are surfaced as advisory red flags when below 40%.",
  },
];

/**
 * Apply all pushback rules to the given trigger flags.
 * Returns predictions for every rule whose condition is satisfied.
 */
export function buildPushbackPredictions(
  flags: TriggerFlags,
): PushbackPrediction[] {
  return PUSHBACK_RULES.filter((rule) => rule.condition(flags)).map((rule) => ({
    anticipatedObjection: rule.anticipatedObjection,
    preparedResponse: rule.preparedResponse,
    supportingEvidence: rule.supportingEvidence,
    triggerId: rule.triggerId,
  }));
}
