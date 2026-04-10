"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/actions";
import { fieldError } from "@/lib/actions";
import { FormField } from "./form-field";
import { FormTextarea } from "./form-textarea";
import { SubmitButton } from "./submit-button";

const ASSET_TYPES = [
  { value: "CAREERS_PAGE", label: "Careers page" },
  { value: "JOB_POSTING", label: "Job posting" },
  { value: "BLOG_POST", label: "Blog post" },
  { value: "PRESS_RELEASE", label: "Press release" },
  { value: "SOCIAL_PROFILE", label: "Social profile" },
  { value: "REVIEW_SITE", label: "Review site" },
  { value: "OTHER", label: "Other" },
] as const;

interface ClientOption {
  id: string;
  name: string;
  domain: string;
}

interface ContentAssetFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  clients?: ClientOption[];
  defaultValues?: {
    clientId?: string;
    url: string;
    title?: string | null;
    assetType: string;
    content?: string | null;
  };
  submitLabel: string;
  cancelHref: string;
}

export function ContentAssetForm({
  action,
  clients,
  defaultValues,
  submitLabel,
  cancelHref,
}: ContentAssetFormProps) {
  const [state, formAction] = useActionState(action, null);
  const isEdit = !!defaultValues?.url;

  return (
    <form action={formAction} className="space-y-6">
      {state?.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Client selector (create only) */}
      {clients && !isEdit && (
        <div>
          <label
            htmlFor="clientId"
            className="block text-sm font-medium text-gray-700"
          >
            Client <span className="text-red-500">*</span>
          </label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={defaultValues?.clientId ?? ""}
            required
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
              fieldError(state, "clientId")
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-brand-500 focus:ring-brand-500"
            }`}
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.domain})
              </option>
            ))}
          </select>
          {fieldError(state, "clientId") && (
            <p className="mt-1 text-sm text-red-600">
              {fieldError(state, "clientId")}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          label="URL"
          name="url"
          type="url"
          placeholder="https://example.com/careers"
          defaultValue={defaultValues?.url}
          required={!isEdit}
          disabled={isEdit}
          error={fieldError(state, "url")}
        />
        <div>
          <label
            htmlFor="assetType"
            className="block text-sm font-medium text-gray-700"
          >
            Asset type <span className="text-red-500">*</span>
          </label>
          <select
            id="assetType"
            name="assetType"
            defaultValue={defaultValues?.assetType ?? ""}
            required
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
              fieldError(state, "assetType")
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-brand-500 focus:ring-brand-500"
            }`}
          >
            <option value="">Select type...</option>
            {ASSET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {fieldError(state, "assetType") && (
            <p className="mt-1 text-sm text-red-600">
              {fieldError(state, "assetType")}
            </p>
          )}
        </div>
      </div>

      <FormField
        label="Title"
        name="title"
        placeholder="Careers at Acme Corp"
        defaultValue={defaultValues?.title ?? undefined}
        error={fieldError(state, "title")}
      />

      <FormTextarea
        label="Content / Notes"
        name="content"
        placeholder="Optional notes about this asset, its relevance, or content summary..."
        defaultValue={defaultValues?.content ?? undefined}
        rows={4}
        error={fieldError(state, "content")}
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
