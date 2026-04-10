"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/actions";
import { fieldError } from "@/lib/actions";
import { SubmitButton } from "./submit-button";
import { enrichCompetitorProfile } from "@/app/(dashboard)/actions/competitors";

interface CompetitorFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    name: string;
    domain: string;
    industry?: string | null;
    description?: string | null;
    careerUrl?: string | null;
  };
  submitLabel: string;
  cancelHref: string;
}

export function CompetitorForm({
  action,
  defaultValues,
  submitLabel,
  cancelHref,
}: CompetitorFormProps) {
  const [state, formAction] = useActionState(action, null);
  const isEdit = !!defaultValues;

  const [name, setName] = useState(defaultValues?.name ?? "");
  const [domain, setDomain] = useState(defaultValues?.domain ?? "");
  const [industry, setIndustry] = useState(defaultValues?.industry ?? "");
  const [description, setDescription] = useState(
    defaultValues?.description ?? "",
  );
  const [careerUrl, setCareerUrl] = useState(defaultValues?.careerUrl ?? "");

  const [isPending, startTransition] = useTransition();

  const canEnrich =
    !isEdit && name.trim().length >= 2 && domain.includes(".");

  function handleEnrich() {
    startTransition(async () => {
      const result = await enrichCompetitorProfile(name.trim(), domain.trim());
      if (!result) return;
      if (!industry.trim()) setIndustry(result.industry);
      if (!description.trim()) setDescription(result.description);
    });
  }

  const inputClass = (hasError: boolean) =>
    `mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
      hasError
        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
        : "border-gray-300 focus:border-brand-500 focus:ring-brand-500"
    }`;

  const nameError = fieldError(state, "name");
  const domainError = fieldError(state, "domain");
  const industryError = fieldError(state, "industry");
  const descriptionError = fieldError(state, "description");

  return (
    <form action={formAction} className="space-y-6">
      {state?.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Company name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Apex Cloud Systems"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass(!!nameError)}
          />
          {nameError && (
            <p className="mt-1 text-sm text-red-600">{nameError}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="domain"
            className="block text-sm font-medium text-gray-700"
          >
            Domain <span className="text-red-500">*</span>
          </label>
          <input
            id="domain"
            name="domain"
            type="text"
            placeholder="apexcloudsystems.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required={!isEdit}
            disabled={isEdit}
            className={`${inputClass(!!domainError)} ${isEdit ? "bg-gray-50 text-gray-500" : ""}`}
          />
          {domainError && (
            <p className="mt-1 text-sm text-red-600">{domainError}</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="industry"
            className="block text-sm font-medium text-gray-700"
          >
            Industry
          </label>
          {canEnrich && (
            <button
              type="button"
              onClick={handleEnrich}
              disabled={isPending}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {isPending ? "Looking up..." : "Auto-fill from AI"}
            </button>
          )}
        </div>
        <input
          id="industry"
          name="industry"
          type="text"
          placeholder="Enterprise Software"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className={inputClass(!!industryError)}
        />
        {industryError && (
          <p className="mt-1 text-sm text-red-600">{industryError}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="How this competitor competes for the same talent pool..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={inputClass(!!descriptionError)}
        />
        {descriptionError && (
          <p className="mt-1 text-sm text-red-600">{descriptionError}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="careerUrl"
          className="block text-sm font-medium text-gray-700"
        >
          Career site URL
        </label>
        <input
          id="careerUrl"
          name="careerUrl"
          type="url"
          placeholder="https://careers.competitor.com"
          value={careerUrl}
          onChange={(e) => setCareerUrl(e.target.value)}
          className={inputClass(!!fieldError(state, "careerUrl"))}
        />
        {fieldError(state, "careerUrl") && (
          <p className="mt-1 text-sm text-red-600">
            {fieldError(state, "careerUrl")}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The competitor&apos;s primary career/jobs page.
        </p>
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
