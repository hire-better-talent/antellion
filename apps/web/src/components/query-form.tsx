"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/actions";
import { fieldError } from "@/lib/actions";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

interface QueryFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Hidden field — only set for add (not edit). */
  queryClusterId?: string;
  defaultValues?: {
    text: string;
    intent?: string | null;
  };
  submitLabel: string;
  cancelHref: string;
}

export function QueryForm({
  action,
  queryClusterId,
  defaultValues,
  submitLabel,
  cancelHref,
}: QueryFormProps) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-6">
      {queryClusterId && (
        <input type="hidden" name="queryClusterId" value={queryClusterId} />
      )}

      {state?.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <FormField
        label="Query text"
        name="text"
        placeholder="best companies for senior engineers in Austin"
        defaultValue={defaultValues?.text}
        required
        error={fieldError(state, "text")}
      />

      <FormField
        label="Intent"
        name="intent"
        placeholder="What the candidate is trying to learn"
        defaultValue={defaultValues?.intent ?? undefined}
        error={fieldError(state, "intent")}
      />

      <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
        <SubmitButton label={submitLabel} />
        <Link
          href={cancelHref}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
