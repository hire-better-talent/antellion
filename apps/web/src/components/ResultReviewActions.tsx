"use client";

import { useTransition } from "react";
import {
  approveResult,
  rejectResult,
  flagResultForReview,
} from "@/app/(dashboard)/actions/result-workflow";

interface ResultReviewActionsProps {
  resultId: string;
  currentStatus: "CAPTURED" | "NEEDS_REVIEW";
}

export function ResultReviewActions({
  resultId,
  currentStatus,
}: ResultReviewActionsProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => approveResult(resultId).then(() => {}))
        }
        className="rounded px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
      >
        Approve
      </button>

      {currentStatus === "CAPTURED" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => flagResultForReview(resultId).then(() => {}))
          }
          className="rounded px-2 py-0.5 text-xs font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
        >
          Flag
        </button>
      )}

      {currentStatus === "NEEDS_REVIEW" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const note = window.prompt("Rejection note (required):");
            if (!note || note.trim().length === 0) return;
            startTransition(() => rejectResult(resultId, note).then(() => {}));
          }}
          className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Reject
        </button>
      )}
    </div>
  );
}
