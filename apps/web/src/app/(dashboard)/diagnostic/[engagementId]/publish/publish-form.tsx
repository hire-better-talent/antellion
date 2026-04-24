"use client";

import { useActionState, useEffect } from "react";
import { publishEngagement } from "@/app/(dashboard)/actions/diagnostic";
import type { ActionState } from "@/lib/actions";

interface Props {
  engagementId: string;
}

/**
 * Client component: publish button + gate error banner.
 *
 * Receives engagementId as a prop from the server shell so we never
 * derive it from window.location. Redirects to the public report on success.
 */
export function PublishForm({ engagementId }: Props) {
  const [state, action, pending] = useActionState<
    (ActionState & { shareToken?: string }) | null,
    FormData
  >(publishEngagement, null);

  useEffect(() => {
    if (state?.shareToken) {
      const APP_URL =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
      window.location.href = `${APP_URL}/diagnostic/${state.shareToken}`;
    }
  }, [state?.shareToken]);

  return (
    <>
      {state?.message && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Publish blocked</p>
          <p>{state.message}</p>
          <p className="mt-2 text-xs text-red-500">
            Return to{" "}
            <a href={`/diagnostic/${engagementId}/findings`} className="underline">
              Findings Review
            </a>{" "}
            to approve more material findings.
          </p>
        </div>
      )}

      <form action={action}>
        <input type="hidden" name="engagementId" value={engagementId} />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? "Publishing..." : "Publish Report"}
          </button>
          <a
            href={`/diagnostic/${engagementId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </a>
        </div>
      </form>
    </>
  );
}
