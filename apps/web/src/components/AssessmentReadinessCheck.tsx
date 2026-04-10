"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import type { ReadinessWarning, ReadinessSeverity } from "@antellion/core";
import { checkReportReadiness } from "@/app/(dashboard)/actions/reports";

// ── Severity styling ────────────────────────────────────────────────

const severityStyles: Record<
  ReadinessSeverity,
  { bg: string; border: string; text: string; label: string }
> = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    label: "CRITICAL",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    label: "WARNING",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    label: "INFO",
  },
};

// ── Component ───────────────────────────────────────────────────────

interface AssessmentReadinessCheckProps {
  clientId: string;
  scanRunIds: string[];
  /** Called when the operator chooses to proceed despite warnings, or no warnings exist. */
  onProceed: () => void;
}

export function AssessmentReadinessCheck({
  clientId,
  scanRunIds,
  onProceed,
}: AssessmentReadinessCheckProps) {
  const [warnings, setWarnings] = useState<ReadinessWarning[] | null>(null);
  const [checking, startCheck] = useTransition();
  const hasRun = useRef(false);

  // Run the check automatically when the component mounts.
  // Uses a ref guard to prevent double-fire in React strict mode.
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    startCheck(async () => {
      const result = await checkReportReadiness(clientId, scanRunIds);
      if (result.length === 0) {
        onProceed();
      } else {
        setWarnings(result);
      }
    });
  }, [clientId, scanRunIds, onProceed]);

  const handleProceed = useCallback(() => {
    onProceed();
  }, [onProceed]);

  // While checking: show a loading indicator
  if (warnings === null) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          {checking ? "Checking assessment readiness..." : "Preparing..."}
        </p>
      </div>
    );
  }

  // Group by severity
  const criticals = warnings.filter((w) => w.severity === "critical");
  const warningLevel = warnings.filter((w) => w.severity === "warning");
  const infos = warnings.filter((w) => w.severity === "info");

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Assessment Readiness Check
      </h3>

      <div className="mt-4 space-y-3">
        {criticals.length > 0 && (
          <WarningGroup severity="critical" warnings={criticals} />
        )}
        {warningLevel.length > 0 && (
          <WarningGroup severity="warning" warnings={warningLevel} />
        )}
        {infos.length > 0 && (
          <WarningGroup severity="info" warnings={infos} />
        )}
      </div>

      <div className="mt-5 flex items-center gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={handleProceed}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Proceed anyway
        </button>
        <span className="text-xs text-gray-400">
          {criticals.length > 0
            ? `${criticals.length} critical issue${criticals.length > 1 ? "s" : ""} detected`
            : `${warnings.length} issue${warnings.length > 1 ? "s" : ""} detected`}
        </span>
      </div>
    </div>
  );
}

// ── WarningGroup sub-component ──────────────────────────────────────

function WarningGroup({
  severity,
  warnings,
}: {
  severity: ReadinessSeverity;
  warnings: ReadinessWarning[];
}) {
  const style = severityStyles[severity];

  return (
    <div className={`rounded-md border ${style.border} ${style.bg} p-3`}>
      <p className={`text-xs font-semibold uppercase ${style.text}`}>
        {style.label}
      </p>
      <ul className="mt-2 space-y-2">
        {warnings.map((w, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${style.text}`}>
                {w.title}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                {w.description}
              </p>
              {w.suggestedAction.href ? (
                <Link
                  href={w.suggestedAction.href}
                  className="mt-1 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  {w.suggestedAction.label} &rarr;
                </Link>
              ) : (
                <p className="mt-1 text-xs italic text-gray-500">
                  {w.suggestedAction.label}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
