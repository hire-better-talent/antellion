"use client";

import { useActionState, useState, useEffect } from "react";
import { createEngagement } from "@/app/(dashboard)/actions/diagnostic";
import type { ActionState } from "@/lib/actions";
import { fieldError } from "@/lib/actions";

const ARCHETYPES = [
  {
    value: "EARLY_CAREER",
    label: "Early-career",
    description: "0-3 yrs, entry-level",
    defaultSeed:
      "You are an early-career candidate (0-3 years of experience) evaluating potential employers. You care about learning opportunities, mentorship, culture fit, and starting salary.",
  },
  {
    value: "MID_CAREER_IC",
    label: "Mid-career IC",
    description: "4-8 yrs, individual contributor",
    defaultSeed:
      "You are a mid-career individual contributor (4-8 years of experience) evaluating potential employers. You care about compensation, growth trajectory, technical challenges, and work-life balance.",
  },
  {
    value: "SENIOR_IC",
    label: "Senior IC",
    description: "8-15 yrs, specialist/principal",
    defaultSeed:
      "You are a senior individual contributor (8-15 years of experience) evaluating potential employers. You care about engineering quality, autonomy, impact, equity compensation, and leadership quality.",
  },
  {
    value: "MANAGER",
    label: "Manager",
    description: "5+ yrs, people leadership",
    defaultSeed:
      "You are a people manager (5+ years of experience) evaluating potential employers. You care about company culture, leadership quality, management philosophy, headcount growth, and career advancement.",
  },
  {
    value: "EXECUTIVE",
    label: "Executive",
    description: "VP / C-level",
    defaultSeed:
      "You are a VP or C-level executive candidate evaluating potential employers. You care about company vision, board composition, executive team quality, financial health, and strategic positioning.",
  },
] as const;

interface SelectedPersona {
  archetype: string;
  label: string;
  intent: string;
  seedContext: string;
}

export default function NewDiagnosticPage() {
  const [state, action, pending] = useActionState<
    (ActionState & { engagementId?: string }) | null,
    FormData
  >(createEngagement, null);
  const [selectedPersonas, setSelectedPersonas] = useState<SelectedPersona[]>([]);
  const [categoryName, setCategoryName] = useState("");

  function deriveSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  function togglePersona(archetype: (typeof ARCHETYPES)[number]) {
    setSelectedPersonas((prev) => {
      const existing = prev.find((p) => p.archetype === archetype.value);
      if (existing) {
        return prev.filter((p) => p.archetype !== archetype.value);
      }
      if (prev.length >= 3) return prev; // max 3
      return [
        ...prev,
        {
          archetype: archetype.value,
          label: `${archetype.label} — ${categoryName || "this role"}`,
          intent: archetype.description,
          seedContext: archetype.defaultSeed,
        },
      ];
    });
  }

  // Redirect on success
  useEffect(() => {
    if (state?.engagementId) {
      window.location.href = `/diagnostic/${state.engagementId}`;
    }
  }, [state?.engagementId]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Diagnostic Engagement</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI Visibility Diagnostic — $4,900 fixed-fee
        </p>
      </div>

      <form action={action} className="space-y-8">
        {/* Client */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Client</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
                Client ID
              </label>
              <input
                id="clientId"
                name="clientId"
                type="text"
                required
                placeholder="cuid..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">
                Find the client ID on the Clients page. The client must already exist.
              </p>
              {fieldError(state, "clientId") && (
                <p className="text-xs text-red-600 mt-1">{fieldError(state, "clientId")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Job Category */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Job Category</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="jobCategoryName" className="block text-sm font-medium text-gray-700 mb-1">
                Category name
              </label>
              <input
                id="jobCategoryName"
                name="jobCategoryName"
                type="text"
                required
                placeholder="e.g. Software Engineering"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">
                Created automatically if it does not exist. Seeds 5 default personas.
              </p>
            </div>
            <input
              type="hidden"
              name="jobCategorySlug"
              value={deriveSlug(categoryName)}
            />
          </div>
        </div>

        {/* Personas */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Personas</h2>
          <p className="text-sm text-gray-500 mb-4">
            Select 3 archetypes for this engagement. Labels and seed context will be scoped to the job category.
          </p>
          <div className="space-y-2">
            {ARCHETYPES.map((archetype) => {
              const selected = selectedPersonas.some((p) => p.archetype === archetype.value);
              const disabled = !selected && selectedPersonas.length >= 3;
              return (
                <button
                  key={archetype.value}
                  type="button"
                  onClick={() => togglePersona(archetype)}
                  disabled={disabled}
                  className={`w-full text-left border rounded-md px-4 py-3 text-sm transition-colors ${
                    selected
                      ? "border-gray-900 bg-gray-50"
                      : disabled
                      ? "border-gray-100 text-gray-300 cursor-not-allowed"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="font-medium text-gray-900">{archetype.label}</div>
                  <div className="text-xs text-gray-400">{archetype.description}</div>
                </button>
              );
            })}
          </div>
          {selectedPersonas.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Selected: {selectedPersonas.map((p) => p.archetype).join(", ")}
            </p>
          )}
          {fieldError(state, "personas") && (
            <p className="text-xs text-red-600 mt-1">{fieldError(state, "personas")}</p>
          )}
          <input
            type="hidden"
            name="personas"
            value={JSON.stringify(selectedPersonas)}
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Scoping notes, client context, special instructions..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>

        {/* Error */}
        {state?.message && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending || selectedPersonas.length !== 3 || !categoryName}
            className="inline-flex items-center rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? "Creating..." : "Create Engagement"}
          </button>
          <a
            href="/diagnostic"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
