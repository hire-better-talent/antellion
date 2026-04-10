"use client";

import { useState, useTransition } from "react";
import { generateSupplementalQueries } from "@/app/(dashboard)/actions/queries";

interface GenerateStrategicQueriesButtonProps {
  clientId: string;
}

/**
 * Button that triggers LLM supplemental query generation for a client.
 *
 * Renders only when the parent passes it (i.e. when the client has
 * competitors configured and at least one completed scan).
 *
 * On success: shows count and link to the new cluster.
 * On error: shows the error message inline.
 */
export function GenerateStrategicQueriesButton({
  clientId,
}: GenerateStrategicQueriesButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    queryCount?: number;
    clusterId?: string;
    message?: string;
  } | null>(null);

  function handleClick() {
    const confirmed = window.confirm(
      "Generate 20-30 strategic queries using AI?\n\n" +
        "This calls the Anthropic API to create bespoke queries tailored to this client's competitive landscape. " +
        "The queries will be placed in a new cluster called \"AI-Generated — Strategic Depth\" for your review.\n\n" +
        "Estimated time: 10-20 seconds.",
    );
    if (!confirmed) return;

    setResult(null);
    startTransition(async () => {
      const res = await generateSupplementalQueries(clientId);
      setResult(res ?? null);
    });
  }

  if (result?.queryCount !== undefined && result.clusterId) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-green-700">
          {result.queryCount} strategic queries generated.
        </span>
        <a
          href={`/queries/${result.clusterId}`}
          className="inline-flex items-center rounded-md border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
        >
          Review cluster
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Generating..." : "Generate strategic queries"}
      </button>
      {result?.message && (
        <p className="text-xs text-red-600">{result.message}</p>
      )}
    </div>
  );
}
