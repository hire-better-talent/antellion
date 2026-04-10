"use client";

import { useState, useRef, useCallback } from "react";
import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/actions";
import { fieldError } from "@/lib/actions";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import { AssessmentReadinessCheck } from "./AssessmentReadinessCheck";

interface ScanOption {
  id: string;
  queryCount: number;
  resultCount: number;
  focusArea?: string;
  createdAt: string;
}

interface ClientOption {
  id: string;
  name: string;
  domain: string;
  scans: ScanOption[];
}

interface GenerateReportFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  clients: ClientOption[];
  preselectedClientId?: string;
}

export function GenerateReportForm({
  action,
  clients,
  preselectedClientId,
}: GenerateReportFormProps) {
  const [state, formAction] = useActionState(action, null);
  const [selectedClientId, setSelectedClientId] = useState(
    preselectedClientId ?? "",
  );

  // Track which scans are selected (for readiness check input)
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const scans = selectedClient?.scans ?? [];

  // Initialize checked scans: all scans for the selected client
  const [checkedScanIds, setCheckedScanIds] = useState<Set<string>>(
    new Set(scans.map((s) => s.id)),
  );

  // When client changes, reset checked scans to all scans of the new client
  const handleClientChange = useCallback(
    (newClientId: string) => {
      setSelectedClientId(newClientId);
      const newClient = clients.find((c) => c.id === newClientId);
      setCheckedScanIds(new Set((newClient?.scans ?? []).map((s) => s.id)));
      setShowReadinessCheck(false);
    },
    [clients],
  );

  const handleScanToggle = useCallback(
    (scanId: string, checked: boolean) => {
      setCheckedScanIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(scanId);
        } else {
          next.delete(scanId);
        }
        return next;
      });
      // Reset readiness check if scan selection changes
      setShowReadinessCheck(false);
    },
    [],
  );

  // Readiness check state
  const [showReadinessCheck, setShowReadinessCheck] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // When readiness check passes (no warnings) or operator proceeds despite warnings,
  // submit the actual form.
  const submitForm = useCallback(() => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  }, []);

  const handleGenerateClick = useCallback(() => {
    if (!selectedClientId || checkedScanIds.size === 0) return;
    setShowReadinessCheck(true);
  }, [selectedClientId, checkedScanIds]);

  const titlePlaceholder = selectedClient
    ? `${selectedClient.name} - AI Visibility Audit - ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
    : "e.g. Acme Corp - AI Visibility Audit - April 1, 2026";

  const selectedScanIds = [...checkedScanIds];

  return (
    <div className="space-y-6">
      <form ref={formRef} action={formAction} className="space-y-6">
        {state?.message && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        {/* Client selector */}
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
        </div>

        {/* Completed scans */}
        {selectedClientId && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Completed scans <span className="text-red-500">*</span>
            </label>
            {scans.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                No completed scans for this client.{" "}
                <Link
                  href={`/scans/new?clientId=${selectedClientId}`}
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  Run a scan first.
                </Link>
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {scans.map((scan) => (
                  <label
                    key={scan.id}
                    className="flex items-center gap-3 rounded-md border border-gray-200 px-4 py-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      name="scanRunIds"
                      value={scan.id}
                      checked={checkedScanIds.has(scan.id)}
                      onChange={(e) =>
                        handleScanToggle(scan.id, e.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">
                        {scan.createdAt}
                      </span>
                      {scan.focusArea && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-700/10">
                          {scan.focusArea}
                        </span>
                      )}
                      <span className="ml-2 text-gray-500">
                        {scan.resultCount} / {scan.queryCount} queries answered
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {fieldError(state, "scanRunIds") && (
              <p className="mt-1 text-sm text-red-600">
                {fieldError(state, "scanRunIds")}
              </p>
            )}
          </div>
        )}

        <FormField
          label="Report title"
          name="title"
          placeholder={titlePlaceholder}
          error={fieldError(state, "title")}
        />

        {/* Action buttons: show "Generate report" or the pending SubmitButton */}
        <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
          {showReadinessCheck ? (
            /* While readiness check runs or user reviews warnings, the form
               may be submitted via requestSubmit(). SubmitButton detects
               pending state via useFormStatus and shows the spinner. */
            <SubmitButton label="Generate report" pendingLabel="Generating..." />
          ) : (
            <>
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={!selectedClientId || checkedScanIds.size === 0}
                className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Generate report
              </button>
              <Link
                href="/reports"
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
            </>
          )}
        </div>
      </form>

      {/* Readiness check — shown after "Generate report" is clicked */}
      {showReadinessCheck && selectedClientId && (
        <AssessmentReadinessCheck
          clientId={selectedClientId}
          scanRunIds={selectedScanIds}
          onProceed={submitForm}
        />
      )}
    </div>
  );
}
