"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  label: string;
  pendingLabel?: string;
}

export function SubmitButton({ label, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-gradient btn-glow w-full rounded-xl px-6 py-4 text-base font-semibold text-white transition-all disabled:opacity-50"
    >
      {pending ? (pendingLabel ?? "Saving...") : label}
    </button>
  );
}
