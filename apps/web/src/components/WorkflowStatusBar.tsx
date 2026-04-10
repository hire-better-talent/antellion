"use client";

import { useTransition } from "react";
import { Badge } from "@antellion/ui";
import { completeScan, cancelScan, startAutomatedScan } from "@/app/(dashboard)/actions/scans";
import { approveResult, rejectResult, flagResultForReview, bulkApproveResults } from "@/app/(dashboard)/actions/result-workflow";
import { updateReportStatus } from "@/app/(dashboard)/actions/reports";

type BadgeVariant = "default" | "success" | "warning" | "danger";

const scanStatusVariant: Record<string, BadgeVariant> = {
  PENDING: "default",
  RUNNING: "warning",
  COMPLETED: "success",
  FAILED: "danger",
  CANCELLED: "default",
};

const resultStatusVariant: Record<string, BadgeVariant> = {
  CAPTURED: "default",
  NEEDS_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const reportStatusVariant: Record<string, BadgeVariant> = {
  DRAFT: "default",
  GENERATING: "warning",
  REVIEW: "warning",
  PUBLISHED: "success",
  ARCHIVED: "default",
};

const statusDescriptions: Record<string, string> = {
  // Scan
  PENDING: "Scan is queued and waiting to start.",
  RUNNING: "Scan is in progress. Record results for each query.",
  COMPLETED: "All results recorded. Ready for report generation.",
  FAILED: "Scan encountered an error.",
  CANCELLED: "Scan was cancelled.",
  // Result
  CAPTURED: "Result recorded. Review and approve to include in reports.",
  NEEDS_REVIEW: "Flagged for analyst review before inclusion.",
  APPROVED: "Result approved and included in reporting.",
  REJECTED: "Result excluded from reporting.",
  // Report
  DRAFT: "Report is in draft state.",
  GENERATING: "Report is being generated.",
  REVIEW: "Report is ready for review. Approve to publish.",
  PUBLISHED: "Report is published and available for export.",
  ARCHIVED: "Report has been archived.",
};

interface WorkflowStatusBarProps {
  entityType: "scan" | "result" | "report";
  status: string;
  entityId: string;
  resultCount?: number;
  queryCount?: number;
  /** True when the scan already has automated=true in metadata (worker is running) */
  isAutomated?: boolean;
}

export function WorkflowStatusBar({
  entityType,
  status,
  entityId,
  resultCount,
  queryCount,
  isAutomated,
}: WorkflowStatusBarProps) {
  const [pending, startTransition] = useTransition();

  const variantMap =
    entityType === "scan"
      ? scanStatusVariant
      : entityType === "result"
        ? resultStatusVariant
        : reportStatusVariant;

  const variant = variantMap[status] ?? "default";
  const description = statusDescriptions[status] ?? "";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {/* Scan actions */}
        {entityType === "scan" && status === "RUNNING" && (
          <>
            {typeof resultCount === "number" && typeof queryCount === "number" && (
              <span className="text-xs text-gray-500">
                {resultCount} / {queryCount} results
              </span>
            )}
            {isAutomated ? (
              <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                Auto-scan running...
              </span>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("Run this scan automatically via the OpenAI API? The worker will execute all pending queries.")) {
                    startTransition(() => startAutomatedScan(entityId));
                  }
                }}
                className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                {pending ? "Starting..." : "Auto-scan"}
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Approve ALL scan results and their evidence? This cannot be undone.")) {
                  startTransition(async () => {
                    await bulkApproveResults(entityId);
                  });
                }
              }}
              className="rounded-md border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              {pending ? "Approving..." : "Bulk approve all"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => completeScan(entityId))}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {pending ? "Completing..." : "Complete scan"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Cancel this scan? You can delete it afterward.")) {
                  startTransition(() => cancelScan(entityId));
                }
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {pending ? "Cancelling..." : "Cancel scan"}
            </button>
          </>
        )}

        {/* Bulk approve for completed scans */}
        {entityType === "scan" && status === "COMPLETED" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Approve ALL scan results and their evidence? This cannot be undone.")) {
                startTransition(async () => {
                  await bulkApproveResults(entityId);
                });
              }
            }}
            className="rounded-md border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
          >
            {pending ? "Approving..." : "Bulk approve all results"}
          </button>
        )}

        {/* Result actions */}
        {entityType === "result" && status === "CAPTURED" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => approveResult(entityId).then(() => {}))}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => flagResultForReview(entityId).then(() => {}))}
              className="rounded-md border border-yellow-300 bg-white px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
            >
              Flag for review
            </button>
          </>
        )}

        {entityType === "result" && status === "NEEDS_REVIEW" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => approveResult(entityId).then(() => {}))}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const note = window.prompt("Rejection note (required):");
                if (!note || note.trim().length === 0) return;
                startTransition(() => rejectResult(entityId, note).then(() => {}));
              }}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}

        {/* Report actions */}
        {entityType === "report" && status === "DRAFT" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => updateReportStatus(entityId, "REVIEW"))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Submit for review
          </button>
        )}

        {entityType === "report" && status === "REVIEW" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => updateReportStatus(entityId, "PUBLISHED"))}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {pending ? "Publishing..." : "Publish"}
          </button>
        )}
      </div>
    </div>
  );
}
