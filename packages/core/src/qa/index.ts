// ── Types ──
export type {
  QAStatus,
  QACheckOutcome,
  QACheckSeverity,
  QACheckResult,
  QACheckContext,
  QARunResult,
  QACheckFn,
} from "./types";

// ── Checks ──
export {
  ALL_CHECKS,
  MIN_SUMMARY_LENGTH,
  MIN_CONFIDENCE_SCORE,
  MIN_CITATION_RATE,
  MIN_SECTIONS,
} from "./checks";

// ── Runner ──
export { runQAChecks } from "./runner";
