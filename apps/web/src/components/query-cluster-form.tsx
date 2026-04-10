"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/actions";
import { fieldError } from "@/lib/actions";
import { FormField } from "./form-field";
import { FormTextarea } from "./form-textarea";
import { SubmitButton } from "./submit-button";

interface QueryClusterFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues: {
    name: string;
    intent?: string | null;
  };
  cancelHref: string;
}

export function QueryClusterForm({
  action,
  defaultValues,
  cancelHref,
}: QueryClusterFormProps) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-6">
      {state?.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <FormField
        label="Cluster name"
        name="name"
        placeholder="Reputation & Brand"
        defaultValue={defaultValues.name}
        required
        error={fieldError(state, "name")}
      />

      <FormTextarea
        label="Intent"
        name="intent"
        placeholder="What candidate behavior does this cluster represent?"
        defaultValue={defaultValues.intent ?? undefined}
        rows={2}
        error={fieldError(state, "intent")}
      />

      <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
        <SubmitButton label="Save changes" />
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
