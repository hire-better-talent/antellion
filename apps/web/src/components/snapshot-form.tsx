"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSnapshotScan } from "@/app/(dashboard)/actions/snapshots";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import { fieldError } from "@/lib/actions";

interface Competitor {
  name: string;
  domain: string;
}

interface SnapshotFormProps {
  prefill?: {
    prospectName: string;
    prospectDomain: string;
    industry: string;
    nicheKeywords?: string;
    geography?: string;
    competitors: Array<{ name: string; domain: string }>;
  };
}

const EMPTY_COMPETITOR: Competitor = { name: "", domain: "" };
const MIN_COMPETITORS = 2;
const MAX_COMPETITORS = 5;

export function SnapshotForm({ prefill }: SnapshotFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(createSnapshotScan, null);
  const [competitors, setCompetitors] = useState<Competitor[]>(
    prefill?.competitors && prefill.competitors.length >= MIN_COMPETITORS
      ? prefill.competitors.map((c) => ({ ...c }))
      : [{ ...EMPTY_COMPETITOR }, { ...EMPTY_COMPETITOR }],
  );

  // Redirect on success
  useEffect(() => {
    if (state && "scanId" in state && state.scanId) {
      router.push(`/snapshots/${state.scanId}`);
    }
  }, [state, router]);

  function addCompetitor() {
    if (competitors.length < MAX_COMPETITORS) {
      setCompetitors((prev) => [...prev, { ...EMPTY_COMPETITOR }]);
    }
  }

  function removeCompetitor(index: number) {
    if (competitors.length > MIN_COMPETITORS) {
      setCompetitors((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function updateCompetitor(
    index: number,
    field: keyof Competitor,
    value: string,
  ) {
    setCompetitors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  return (
    <form action={formAction} className="space-y-0">
      {state?.message && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Hidden field: competitors as JSON — empty rows filtered to avoid Zod validation noise */}
      <input
        type="hidden"
        name="competitors"
        value={JSON.stringify(
          competitors.filter((c) => c.name.trim() !== "" && c.domain.trim() !== ""),
        )}
      />

      {/* ── Section 1: Prospect Details ──────────────────────── */}
      <div className="space-y-5 pb-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Prospect details
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            The company you are evaluating for AI hiring visibility.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Company name"
            name="prospectName"
            placeholder="Acme Corp"
            defaultValue={prefill?.prospectName}
            required
            error={fieldError(state, "prospectName")}
          />
          <FormField
            label="Domain"
            name="prospectDomain"
            placeholder="acme.com"
            defaultValue={prefill?.prospectDomain}
            required
            error={fieldError(state, "prospectDomain")}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Industry"
            name="industry"
            placeholder="Enterprise Software"
            defaultValue={prefill?.industry}
            required
            error={fieldError(state, "industry")}
          />
          <div>
            <FormField
              label="Niche keywords"
              name="nicheKeywords"
              placeholder="climate tech, carbon credits, sustainability"
              defaultValue={prefill?.nicheKeywords}
              error={fieldError(state, "nicheKeywords")}
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated terms for the prospect&apos;s specific niche
            </p>
          </div>
        </div>

        <div className="sm:max-w-sm">
          <FormField
            label="Geography"
            name="geography"
            placeholder="San Francisco Bay Area"
            defaultValue={prefill?.geography}
            error={fieldError(state, "geography")}
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave blank for remote-first or nationally distributed companies
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* ── Section 2: Competitors ───────────────────────────── */}
      <div className="space-y-5 py-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Competitors</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Enter the prospect&apos;s primary talent competitors. Choose
            well-known companies — obscure competitors may produce weak
            findings.
          </p>
        </div>

        <div className="space-y-3">
          {competitors.map((competitor, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div>
                  {index === 0 && (
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Company name
                    </label>
                  )}
                  <input
                    type="text"
                    value={competitor.name}
                    onChange={(e) =>
                      updateCompetitor(index, "name", e.target.value)
                    }
                    placeholder="Stripe"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  {index === 0 && (
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Domain
                    </label>
                  )}
                  <input
                    type="text"
                    value={competitor.domain}
                    onChange={(e) =>
                      updateCompetitor(index, "domain", e.target.value)
                    }
                    placeholder="stripe.com"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className={index === 0 ? "mt-5" : ""}>
                <button
                  type="button"
                  onClick={() => removeCompetitor(index)}
                  disabled={competitors.length <= MIN_COMPETITORS}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Remove competitor"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M2 8a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {competitors.length < MAX_COMPETITORS && (
          <button
            type="button"
            onClick={addCompetitor}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
            Add competitor
          </button>
        )}
      </div>

      <div className="border-t border-gray-200" />

      {/* ── Section 3: Target Role ───────────────────────────── */}
      <div className="space-y-5 py-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Target role</h2>
        </div>

        <div className="sm:max-w-sm">
          <FormField
            label="Role title"
            name="roleTitle"
            placeholder="Software Engineer"
            required
            error={fieldError(state, "roleTitle")}
          />
          <p className="mt-1 text-xs text-gray-500">
            The role you&apos;d mention in the DM. Use a broad category (e.g.,
            &quot;Software Engineer&quot;), not a specific title.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* ── Section 4: Confirm & Scan ────────────────────────── */}
      <div className="space-y-5 pt-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Confirm and scan
          </h2>
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          100 queries will be generated and scanned automatically. Estimated
          cost: ~$3.50. Estimated time: 2&ndash;4 minutes.
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton
            label="Run snapshot scan"
            pendingLabel="Creating snapshot..."
          />
        </div>
      </div>
    </form>
  );
}
