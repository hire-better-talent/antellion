// ── Types ────────────────────────────────────────────────────
export type {
  TransitionContext,
  TransitionResult,
  TransitionLogEntry,
} from "./types";

// ── Scan rules ───────────────────────────────────────────────
export {
  validateScanCompletion,
  validateScanDeletion,
  validateScanCancellation,
  validateScanPreflight,
} from "./scan-rules";
export type {
  QueryClusterReviewStatus,
  ScanPreflightCluster,
  ScanPreflightOptions,
  ScanPreflightResult,
} from "./scan-rules";

// ── ScanResult rules ─────────────────────────────────────────
export {
  validateResultTransition,
  shouldAutoFlag,
  AUTO_FLAG_VISIBILITY_THRESHOLD,
} from "./result-rules";

// ── Report rules ─────────────────────────────────────────────
export { validateReportGeneration, validateReportTransition } from "./report-rules";
