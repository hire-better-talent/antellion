"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/actions";
import { fieldError } from "@/lib/actions";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import { buildBusinessContext } from "@antellion/core";
import { generateSupplementalQueries } from "@/app/(dashboard)/actions/queries";

interface ClientOption {
  id: string;
  name: string;
  domain: string;
  nicheKeywords?: string | null;
  industry?: string | null;
  description?: string | null;
  knownFor?: string | null;
  revenueScale?: string | null;
  headquarters?: string | null;
  employeeCount?: number | null;
}

interface GenerateQueriesFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  clients: ClientOption[];
  preselectedClientId?: string;
}

export function GenerateQueriesForm({
  action,
  clients,
  preselectedClientId,
}: GenerateQueriesFormProps) {
  const [state, formAction] = useActionState(action, null);
  const [selectedClientId, setSelectedClientId] = useState(
    preselectedClientId ?? "",
  );
  const [includeStrategic, setIncludeStrategic] = useState(false);
  const [strategicResult, setStrategicResult] = useState<{
    queryCount?: number;
    clusterId?: string;
    message?: string;
  } | null>(null);
  const [isStrategicPending, startStrategicTransition] = useTransition();

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const nicheKeywords = selectedClient?.nicheKeywords
    ?.split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0) ?? [];
  const hasNicheKeywords = nicheKeywords.length > 0;

  const [businessContext, setBusinessContext] = useState(() => {
    const preselected = clients.find((c) => c.id === (preselectedClientId ?? ""));
    return preselected ? buildBusinessContext(preselected) : "";
  });

  function handleClientChange(newId: string) {
    setSelectedClientId(newId);
    const client = clients.find((c) => c.id === newId);
    setBusinessContext(client ? buildBusinessContext(client) : "");
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

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
          value={selectedClientId}
          onChange={(e) => handleClientChange(e.target.value)}
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

        {/* Niche keyword awareness hint */}
        {selectedClientId && (
          <div className="mt-2">
            {hasNicheKeywords ? (
              <p className="text-xs text-green-700">
                Boundary queries will be generated using:{" "}
                <span className="font-medium">{nicheKeywords.join(", ")}</span>
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Add niche keywords to the{" "}
                <Link
                  href={`/clients/${selectedClientId}/edit`}
                  className="font-medium underline hover:text-gray-700"
                >
                  client profile
                </Link>{" "}
                to enable visibility boundary analysis.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <FormField
            label="Job category"
            name="roleTitle"
            placeholder="Software Engineer"
            required
            error={fieldError(state, "roleTitle")}
          />
          <p className="mt-1 text-xs text-gray-500">
            Use a broad category (e.g., &quot;Software Engineer&quot;), not a specific title (e.g., &quot;Senior Backend Engineer&quot;). The assessment evaluates company-level visibility for this talent segment.
          </p>
        </div>
        <div>
          <FormField
            label="Geography"
            name="geography"
            placeholder="Seattle, WA"
            error={fieldError(state, "geography")}
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional. Leave blank for remote-first or nationally distributed companies. Queries will omit location qualifiers.
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="businessContext"
          className="block text-sm font-medium text-gray-700"
        >
          Business context
        </label>
        <textarea
          id="businessContext"
          name="businessContext"
          value={businessContext}
          onChange={(e) => setBusinessContext(e.target.value)}
          rows={4}
          placeholder="Auto-populated from client profile. Edit to add context."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Auto-generated from client profile. Edit freely — this context shapes query generation.
        </p>
        {fieldError(state, "businessContext") && (
          <p className="mt-1 text-sm text-red-600">
            {fieldError(state, "businessContext")}
          </p>
        )}
      </div>

      {/* Strategic queries toggle — shown when a client is selected */}
      {selectedClientId && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={includeStrategic}
              onChange={(e) => {
                setIncludeStrategic(e.target.checked);
                setStrategicResult(null);
              }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Also generate AI strategic queries
              </span>
              <p className="mt-0.5 text-xs text-gray-500">
                After template queries are generated, call Anthropic to create 20-30 bespoke queries
                targeting competitive gaps. Placed in a separate "AI-Generated — Strategic Depth" cluster.
              </p>
            </div>
          </label>

          {includeStrategic && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              {strategicResult?.queryCount !== undefined && strategicResult.clusterId ? (
                <p className="text-sm text-green-700">
                  {strategicResult.queryCount} strategic queries generated.{" "}
                  <a
                    href={`/queries/${strategicResult.clusterId}`}
                    className="font-medium underline hover:text-green-800"
                  >
                    Review cluster
                  </a>
                </p>
              ) : (
                <button
                  type="button"
                  disabled={isStrategicPending}
                  onClick={() => {
                    setStrategicResult(null);
                    startStrategicTransition(async () => {
                      const res = await generateSupplementalQueries(selectedClientId);
                      setStrategicResult(res ?? null);
                    });
                  }}
                  className="inline-flex items-center rounded-md border border-brand-300 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStrategicPending ? "Generating strategic queries..." : "Run strategic query generation"}
                </button>
              )}
              {strategicResult?.message && (
                <p className="mt-1 text-xs text-red-600">{strategicResult.message}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
        <SubmitButton label="Generate queries" pendingLabel="Generating..." />
        <Link
          href="/queries"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
