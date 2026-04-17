// ── Snapshot Action Plan — Types ──────────────────────────────
//
// Operator-facing briefing derived from SnapshotSummary.
// No LLM calls. No DB writes. Pure transform.
//
// Note: types are prefixed with "Snapshot" to avoid collision with
// the OperatorActionPlan's TalkingPoint / PushbackPrediction types
// when both are re-exported from packages/core.

// ─── Talking Points ───────────────────────────────────────────

export interface SnapshotTalkingPoint {
  /** Short label for quick reference (e.g. "Discovery absence"). */
  label: string;
  /** One-sentence finding the operator delivers verbally. */
  detail: string;
  /** Supporting metric to quote (e.g. "8% vs 64% for Stripe"). */
  metric: string;
  /** 0–1 normalized hook score; higher = lead with this point. */
  hookScore: number;
}

// ─── Pushback Items ───────────────────────────────────────────

export interface SnapshotPushbackItem {
  /** The exact pushback quote (what the prospect says). */
  pushback: string;
  /** One-paragraph counter the operator delivers. */
  counter: string;
}

// ─── Reply Templates ──────────────────────────────────────────

export type SnapshotReplyTemplateVariant = "interested" | "not_now";

export interface SnapshotReplyTemplate {
  variant: SnapshotReplyTemplateVariant;
  /** Short label for UI rendering. */
  label: string;
  /** Full email body text. */
  body: string;
}

// ─── Complete plan ────────────────────────────────────────────

export interface SnapshotActionPlan {
  scanRunId: string;
  prospectName: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
  /** Top 3 findings ranked by hookScore descending. */
  talkingPoints: SnapshotTalkingPoint[];
  /** 4–6 static pushback entries triggered by the Snapshot shape. */
  predictedPushback: SnapshotPushbackItem[];
  /** 3 rule-based questions triggered by the Snapshot shape. */
  questionsToAsk: string[];
  /** 2 reply email templates (interested / not_now). */
  replyTemplates: SnapshotReplyTemplate[];
  /** Single-sentence upsell pitch tying together prospect name, worst gap, and citation gap. */
  fullAssessmentPitch: string;
}
