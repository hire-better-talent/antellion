// ── Operator Action Plan — Client Questions Rule Table ────────
//
// Static rule table for Section G: Questions to Ask the Client.
// Triggered by the same TriggerFlags that feed the upsell rules,
// so every live upsell has a discovery question aligned to it.
//
// Output is capped at MAX_CLIENT_QUESTIONS (3) per report.
// The build function walks triggers in DEFAULT_UPSELL_PRIORITY order
// so the questions align with the primary upsell.

import type { TriggerFlags, ClientQuestion } from "../types";

export const MAX_CLIENT_QUESTIONS = 3;

interface QuestionRule {
  triggerId: string;
  condition: (flags: TriggerFlags) => boolean;
  question: string;
  purpose: string;
  naturalTransition: string;
}

export const QUESTION_RULES: QuestionRule[] = [
  {
    triggerId: "glassdoor_ownership_question",
    condition: (f) => f.hasGlassdoorGap,
    question: "Who owns your Glassdoor response strategy today?",
    purpose:
      "Surfaces internal ownership before proposing a Glassdoor response playbook in the content retainer pitch. If no one owns it, the upsell writes itself.",
    naturalTransition:
      "If the answer is 'no one' or 'HR does it ad hoc,' that opens directly to: 'We can put a response playbook in place as the first content sprint deliverable.'",
  },
  {
    triggerId: "no_baseline_question",
    condition: (f) => f.isFirstAssessment,
    question: "How are you currently tracking employer brand performance?",
    purpose:
      "Scopes whether the client has any existing measurement framework, which determines whether the upsell is 'we replace your current method' or 'we fill a gap that doesn't exist yet.'",
    naturalTransition:
      "If they have nothing: 'The quarterly monitoring subscription turns this one-time snapshot into a continuous visibility tracker.' If they have something: 'We can integrate with what you're already doing.'",
  },
  {
    triggerId: "critical_stage_channels_question",
    condition: (f) => f.hasCriticalDiscoveryGap || f.hasCriticalEvaluationGap,
    question:
      "Which recruiting channels are you relying on most right now for top-of-funnel candidates?",
    purpose:
      "Maps the AI visibility gap to the channels the client already cares about. If they rely on referrals, the AI gap matters less right now. If they're running paid JD campaigns, AI discovery is directly competing.",
    naturalTransition:
      "Regardless of their answer, pivot to: 'The candidates using AI to build their shortlist are a segment your current channels don't capture — that's the gap this report is measuring.'",
  },
  {
    triggerId: "competitor_benchmarking_question",
    condition: (f) => f.hasStrongCompetitorContrast,
    question:
      "Have you done any structured benchmarking against your top competitors on employer brand before?",
    purpose:
      "Determines whether the competitor contrast findings are new information or confirm something they already suspected. New information creates urgency; confirmation validates the method.",
    naturalTransition:
      "Either way: 'This report gives you a repeatable, AI-specific benchmark. The question now is whether you want to track it quarterly or act on it once.'",
  },
  {
    triggerId: "content_pipeline_question",
    condition: (f) => f.hasContentGap,
    question:
      "Do you have a content creation pipeline for career-focused content today?",
    purpose:
      "Scopes whether the upsell is 'we draft for you' or 'we train your existing team.' If they have writers or an agency, the pitch is strategy and platform targeting, not content production.",
    naturalTransition:
      "'Whether you have an existing team or not, the gap domains in this report give us an exact execution list — these are the platforms where we need content in place for AI to start citing you.'",
  },
  {
    triggerId: "employer_brand_ownership_question",
    condition: (f) => f.hasZeroOwnedCitations,
    question: "Who manages your employer brand content strategy internally?",
    purpose:
      "Identifies the buying center. Zero owned citations means the employer brand content function is either absent, understaffed, or not producing indexed content. Understanding who owns it determines who to sell to.",
    naturalTransition:
      "'The sourcing rate in this report tells us AI has almost nothing indexed to draw from for {clientName}. Whatever that team is producing, it is not reaching the platforms AI indexes. That is the gap we fix.'",
  },
  {
    triggerId: "volatility_review_cadence_question",
    condition: (f) => f.hasStabilityIssues,
    question:
      "How often does your team revisit your employer brand positioning — annually, quarterly, or on an event-driven basis?",
    purpose:
      "Surfaces their current review cadence. If annual, the monitoring subscription creates a quarterly check-in that is materially better than their current approach. If ad hoc, the pitch is 'we make it systematic.'",
    naturalTransition:
      "'The volatility in this assessment means your AI visibility is actively shifting. Without quarterly measurement, you won't know if the changes you make are working until the next annual review — by which time the signal may have moved again.'",
  },
];

/**
 * Apply all question rules to the given trigger flags.
 * Returns matching ClientQuestion entries (before MAX_CLIENT_QUESTIONS cap).
 * Callers should apply the priority cap using DEFAULT_UPSELL_PRIORITY ordering.
 */
export function buildClientQuestions(
  flags: TriggerFlags,
): ClientQuestion[] {
  return QUESTION_RULES.filter((rule) => rule.condition(flags)).map((rule) => ({
    question: rule.question,
    purpose: rule.purpose,
    naturalTransition: rule.naturalTransition,
    triggerId: rule.triggerId,
  }));
}
