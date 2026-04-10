"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/actions";
import { fieldError } from "@/lib/actions";
import { FormField } from "./form-field";
import { FormTextarea } from "./form-textarea";
import { SubmitButton } from "./submit-button";

const REVENUE_SCALE_OPTIONS = [
  { value: "", label: "Select scale..." },
  { value: "startup", label: "Startup (< 50 employees)" },
  { value: "growth", label: "Growth (50-500 employees)" },
  { value: "mid-market", label: "Mid-Market (500-5,000 employees)" },
  { value: "enterprise", label: "Enterprise (5,000-50,000 employees)" },
  { value: "fortune500", label: "Fortune 500 (50,000+ employees)" },
] as const;

interface ClientFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    name: string;
    domain: string;
    industry?: string | null;
    description?: string | null;
    nicheKeywords?: string | null;
    employeeCount?: number | null;
    headquarters?: string | null;
    additionalLocations?: string | null;
    publiclyTraded?: boolean | null;
    revenueScale?: string | null;
    knownFor?: string | null;
    careerUrl?: string | null;
  };
  submitLabel: string;
  cancelHref: string;
}

export function ClientForm({
  action,
  defaultValues,
  submitLabel,
  cancelHref,
}: ClientFormProps) {
  const [state, formAction] = useActionState(action, null);
  const isEdit = !!defaultValues;

  return (
    <form action={formAction} className="space-y-6">
      {state?.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          label="Company name"
          name="name"
          placeholder="Acme Corp"
          defaultValue={defaultValues?.name}
          required
          error={fieldError(state, "name")}
        />
        <FormField
          label="Domain"
          name="domain"
          placeholder="acme.com"
          defaultValue={defaultValues?.domain}
          required={!isEdit}
          disabled={isEdit}
          error={fieldError(state, "domain")}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          label="Industry"
          name="industry"
          placeholder="Enterprise Software"
          defaultValue={defaultValues?.industry ?? undefined}
          error={fieldError(state, "industry")}
        />
        <div>
          <FormField
            label="Career site URL"
            name="careerUrl"
            placeholder="https://careers.acme.com"
            defaultValue={defaultValues?.careerUrl ?? undefined}
            error={fieldError(state, "careerUrl")}
          />
          <p className="mt-1 text-xs text-gray-500">
            The company&apos;s primary career/jobs page. Used for citation matching and remediation recommendations.
          </p>
        </div>
      </div>

      <FormTextarea
        label="Description"
        name="description"
        placeholder="Brief description of the company, its engineering org, and hiring context..."
        defaultValue={defaultValues?.description ?? undefined}
        rows={4}
        error={fieldError(state, "description")}
      />

      <div>
        <FormField
          label="Niche keywords"
          name="nicheKeywords"
          placeholder="timeshare, vacation ownership, resort sales"
          defaultValue={defaultValues?.nicheKeywords ?? undefined}
          error={fieldError(state, "nicheKeywords")}
        />
        <p className="mt-1 text-xs text-gray-500">
          Comma-separated terms that describe your client&apos;s specific business model. Used to test how deep into their niche AI recognizes them.
        </p>
      </div>

      {/* ── Company Profile ─────────────────────────────────── */}
      <div className="space-y-4 rounded-md border border-gray-200 bg-gray-50/50 p-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Company profile</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Optional. Providing company context improves query generation for enterprise clients.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="revenueScale"
              className="block text-sm font-medium text-gray-700"
            >
              Company scale
            </label>
            <select
              id="revenueScale"
              name="revenueScale"
              defaultValue={defaultValues?.revenueScale ?? ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {REVENUE_SCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldError(state, "revenueScale") && (
              <p className="mt-1 text-sm text-red-600">
                {fieldError(state, "revenueScale")}
              </p>
            )}
          </div>

          <FormField
            label="Employee count"
            name="employeeCount"
            type="number"
            placeholder="10000"
            defaultValue={defaultValues?.employeeCount?.toString() ?? undefined}
            error={fieldError(state, "employeeCount")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Headquarters"
            name="headquarters"
            placeholder="Atlanta, GA"
            defaultValue={defaultValues?.headquarters ?? undefined}
            error={fieldError(state, "headquarters")}
          />
          <FormField
            label="Additional locations"
            name="additionalLocations"
            placeholder="Austin, TX; New York, NY; San Francisco, CA"
            defaultValue={defaultValues?.additionalLocations ?? undefined}
            error={fieldError(state, "additionalLocations")}
          />
        </div>

        <div>
          <FormTextarea
            label="Known for"
            name="knownFor"
            placeholder="Home improvement retail, largest home improvement retailer in the US"
            defaultValue={defaultValues?.knownFor ?? undefined}
            rows={2}
            error={fieldError(state, "knownFor")}
          />
          <p className="mt-1 text-xs text-gray-500">
            What is this company primarily famous for? Used to test whether AI recognizes the company as an employer beyond its core business.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="publiclyTraded"
            name="publiclyTraded"
            type="checkbox"
            defaultChecked={defaultValues?.publiclyTraded ?? false}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="publiclyTraded" className="text-sm text-gray-700">
            Publicly traded
          </label>
        </div>
      </div>

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
