"use client";

import { useState, useTransition } from "react";

interface DeleteButtonProps {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
}

export function DeleteButton({
  action,
  confirmMessage,
  label = "Delete",
}: DeleteButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Deleting..." : label}
      </button>
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
