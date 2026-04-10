"use client";

import { useTransition, useState } from "react";
import type { ActionState } from "@/lib/actions";

interface AddDiscoveredCompetitorButtonProps {
  action: () => Promise<ActionState>;
  competitorName: string;
}

export function AddDiscoveredCompetitorButton({
  action,
  competitorName,
}: AddDiscoveredCompetitorButtonProps) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await action();
      if (result?.message?.includes("already exists")) {
        setError("Already tracked");
        setDone(true);
      } else if (result?.errors) {
        setError("Failed to add");
      } else {
        setDone(true);
        setError(null);
      }
    });
  }

  if (done && !error) {
    return (
      <span className="inline-flex items-center rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        Added
      </span>
    );
  }

  if (done && error) {
    return (
      <span className="inline-flex items-center rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
        {error}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center rounded-md border border-brand-200 bg-white px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
    >
      {pending ? "Adding..." : `Add ${competitorName}`}
    </button>
  );
}
