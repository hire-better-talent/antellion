"use client";

import { useActionState } from "react";
import { useEffect } from "react";
import { publishEngagement } from "@/app/(dashboard)/actions/diagnostic";
import type { ActionState } from "@/lib/actions";

interface Props {
  params: Promise<{ engagementId: string }>;
}

// Server-compatible publish page.
// Fetch validation state from the API and render the gate + publish form.

export default function PublishPage({ params }: Props) {
  const engagementId =
    typeof window !== "undefined"
      ? window.location.pathname.split("/")[3] ?? ""
      : "";

  const [state, action, pending] = useActionState<
    (ActionState & { shareToken?: string }) | null,
    FormData
  >(publishEngagement, null);

  // Redirect to success state after publish
  useEffect(() => {
    if (state?.shareToken) {
      const APP_URL =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
      window.location.href = `${APP_URL}/diagnostic/${state.shareToken}`;
    }
  }, [state?.shareToken]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <a
            href={`/diagnostic/${engagementId}`}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Engagement
          </a>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600">Publish</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Publish Diagnostic Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Once published, a tokenized link will be generated for the client.
          The refund guarantee requires 10 approved material findings.
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Before publishing</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex gap-2">
            <span className="text-gray-400">1.</span>
            All 10+ findings have been approved with narratives
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400">2.</span>
            Each finding has at least one evidence scan result
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400">3.</span>
            The Finding Audit Appendix will be frozen at publish time
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400">4.</span>
            The client link will be publicly accessible (no login required)
          </li>
        </ul>
      </div>

      {state?.message && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Publish blocked</p>
          <p>{state.message}</p>
          <p className="mt-2 text-xs text-red-500">
            Return to <a href={`/diagnostic/${engagementId}/findings`} className="underline">Findings Review</a>{" "}
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
    </div>
  );
}
