// ── Snapshot Action Plan — Public Exports ─────────────────────
//
// Deterministic operator briefing built from SnapshotSummary stored in
// ScanRun.metadata. No LLM calls. No DB writes.

export { buildSnapshotActionPlan } from "./build";

export type {
  SnapshotActionPlan,
  SnapshotTalkingPoint,
  SnapshotPushbackItem,
  SnapshotReplyTemplate,
  SnapshotReplyTemplateVariant,
} from "./types";
