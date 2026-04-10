import type { QACheckContext, QACheckResult, QARunResult, QAStatus } from "./types";
import { ALL_CHECKS } from "./checks";

/**
 * Run all QA checks against the given context.
 *
 * Each check runs independently — a crash in one check does not
 * prevent the others from running.
 *
 * Status computation:
 * - FAIL if any BLOCKING check has outcome FAIL
 * - CONDITIONAL_PASS if all BLOCKING pass but any WARNING-severity check has FAIL or WARNING outcome
 * - PASS if everything passes or is skipped
 */
export function runQAChecks(ctx: QACheckContext): QARunResult {
  const checks: QACheckResult[] = [];

  for (const checkFn of ALL_CHECKS) {
    try {
      checks.push(checkFn(ctx));
    } catch (err) {
      // Extract the checkKey from the function name if possible; fall back to "unknown"
      const fnName = checkFn.name || "unknown";
      checks.push({
        checkKey: `error.${fnName}`,
        category: "ERROR",
        severity: "BLOCKING",
        outcome: "FAIL",
        detail: `Check threw an error: ${err instanceof Error ? err.message : String(err)}`,
        expected: null,
        actual: null,
      });
    }
  }

  const status = computeOverallStatus(checks);

  return { checks, status };
}

function computeOverallStatus(checks: QACheckResult[]): QAStatus {
  const hasBlockingFail = checks.some(
    (c) => c.severity === "BLOCKING" && c.outcome === "FAIL",
  );

  if (hasBlockingFail) {
    return "FAIL";
  }

  const hasWarningIssue = checks.some(
    (c) =>
      c.severity === "WARNING" &&
      (c.outcome === "FAIL" || c.outcome === "WARNING"),
  );

  if (hasWarningIssue) {
    return "CONDITIONAL_PASS";
  }

  return "PASS";
}
