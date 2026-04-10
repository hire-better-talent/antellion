"use client";

import { useActionState, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/actions";
import { fieldError } from "@/lib/actions";
import { SubmitButton } from "./submit-button";
import { CopyButton } from "./CopyButton";
import { extractCitationsFromResponse } from "@antellion/core";
import type { ExtractedCitation } from "@antellion/core";

interface RecordResultFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  scanRunId: string;
  queryId: string;
  queryText: string;
  cancelHref: string;
}

// ─── Citation suggestion state ───────────────────────────────

interface SuggestionState {
  citation: ExtractedCitation;
  status: "pending" | "accepted" | "dismissed";
}

// ─── Helpers ─────────────────────────────────────────────────

function appendToSources(existing: string, addition: string): string {
  const trimmed = existing.trimEnd();
  if (!trimmed) return addition;
  // Avoid double-appending something already in the field
  if (trimmed.toLowerCase().includes(addition.toLowerCase())) return existing;
  return trimmed + "\n" + addition;
}

function citationValue(c: ExtractedCitation): string {
  return c.url ?? c.domain;
}

// ─── Suggestion Pill ─────────────────────────────────────────

interface SuggestionPillProps {
  suggestion: SuggestionState;
  onAdd: () => void;
  onDismiss: () => void;
}

function SuggestionPill({ suggestion, onAdd, onDismiss }: SuggestionPillProps) {
  const { citation, status } = suggestion;
  const isAccepted = status === "accepted";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
        isAccepted
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
      }`}
    >
      {citation.confidence === "high" && !isAccepted && (
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" title="Explicit URL found" />
      )}
      <span className="max-w-[160px] truncate" title={citationValue(citation)}>
        {citation.domain}
      </span>
      {isAccepted ? (
        <span className="text-green-600" aria-label="Added">
          &#10003;
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={onAdd}
            className="ml-0.5 rounded text-gray-400 hover:text-gray-700 focus:outline-none"
            aria-label={`Add ${citation.domain} to sources`}
            title="Add to sources"
          >
            +
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded text-gray-300 hover:text-gray-500 focus:outline-none"
            aria-label={`Dismiss ${citation.domain}`}
            title="Dismiss"
          >
            &times;
          </button>
        </>
      )}
    </span>
  );
}

// ─── Main form ───────────────────────────────────────────────

export function RecordResultForm({
  action,
  scanRunId,
  queryId,
  queryText,
  cancelHref,
}: RecordResultFormProps) {
  const [state, formAction] = useActionState(action, null);

  // Controlled fields
  const [responseText, setResponseText] = useState("");
  const [sourcesText, setSourcesText] = useState("");

  // Citation suggestion state
  const [suggestions, setSuggestions] = useState<SuggestionState[]>([]);
  const suggestionsRef = useRef<SuggestionState[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref in sync with state so pill action callbacks don't go stale
  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  // ── Extraction logic ────────────────────────────────────────

  const runExtraction = useCallback((text: string) => {
    const extracted = extractCitationsFromResponse(text);
    if (extracted.length === 0) return;

    setSuggestions((prev) => {
      const existingDomains = new Set(prev.map((s) => s.citation.domain));
      const toAdd = extracted.filter((c) => !existingDomains.has(c.domain));
      if (toAdd.length === 0) return prev;
      return [
        ...prev,
        ...toAdd.map((c) => ({ citation: c, status: "pending" as const })),
      ];
    });
  }, []);

  // Debounced extraction on response text change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!responseText.trim()) return;

    debounceRef.current = setTimeout(() => {
      runExtraction(responseText);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [responseText, runExtraction]);

  // Also run on blur for immediate feedback
  const handleResponseBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runExtraction(responseText);
  }, [responseText, runExtraction]);

  // ── Pill actions ────────────────────────────────────────────

  const handleAdd = useCallback((domain: string) => {
    const match = suggestionsRef.current.find((s) => s.citation.domain === domain);
    setSuggestions((prev) =>
      prev.map((s) =>
        s.citation.domain === domain ? { ...s, status: "accepted" } : s
      )
    );
    if (match) {
      setSourcesText((prev) => appendToSources(prev, citationValue(match.citation)));
    }
  }, []);

  const handleDismiss = useCallback((domain: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.citation.domain === domain ? { ...s, status: "dismissed" } : s
      )
    );
  }, []);

  const handleAddAll = useCallback(() => {
    const pending = suggestionsRef.current.filter((s) => s.status === "pending");
    if (pending.length === 0) return;

    setSuggestions((prev) =>
      prev.map((s) => (s.status === "pending" ? { ...s, status: "accepted" } : s))
    );

    setSourcesText((prev) => {
      let updated = prev;
      for (const s of pending) {
        updated = appendToSources(updated, citationValue(s.citation));
      }
      return updated;
    });
  }, []);

  // ── Visible suggestions ─────────────────────────────────────

  const visibleSuggestions = suggestions.filter((s) => s.status !== "dismissed");
  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const hasSuggestions = visibleSuggestions.length > 0;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="scanRunId" value={scanRunId} />
      <input type="hidden" name="queryId" value={queryId} />

      {state?.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Query being answered */}
      <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Query
          </p>
          <CopyButton text={queryText} />
        </div>
        <p className="mt-1 text-sm font-medium text-gray-900">{queryText}</p>
      </div>

      {/* Response textarea — controlled so we can extract citations */}
      <div>
        <label
          htmlFor="response"
          className="block text-sm font-medium text-gray-700"
        >
          AI response
        </label>
        <textarea
          id="response"
          name="response"
          placeholder="Paste the full AI model response here..."
          rows={10}
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          onBlur={handleResponseBlur}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
            fieldError(state, "response")
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-brand-500 focus:ring-brand-500"
          }`}
        />
        {fieldError(state, "response") && (
          <p className="mt-1 text-sm text-red-600">
            {fieldError(state, "response")}
          </p>
        )}
      </div>

      {/* Citation suggestions — shown when extraction finds results */}
      {hasSuggestions && (
        <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Detected sources — click{" "}
              <span className="font-medium text-gray-700">+</span> to add to
              sources field:
            </p>
            {pendingCount > 1 && (
              <button
                type="button"
                onClick={handleAddAll}
                className="flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                Add all ({pendingCount})
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleSuggestions.map((s) => (
              <SuggestionPill
                key={s.citation.domain}
                suggestion={s}
                onAdd={() => handleAdd(s.citation.domain)}
                onDismiss={() => handleDismiss(s.citation.domain)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sources textarea — controlled so we can append accepted suggestions */}
      <div>
        <label
          htmlFor="citedDomains"
          className="block text-sm font-medium text-gray-700"
        >
          Sources
        </label>
        <textarea
          id="citedDomains"
          name="citedDomains"
          placeholder="Paste sources in any format — ChatGPT citations, URLs, or domain names"
          rows={4}
          value={sourcesText}
          onChange={(e) => setSourcesText(e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
            fieldError(state, "citedDomains")
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-brand-500 focus:ring-brand-500"
          }`}
        />
        {fieldError(state, "citedDomains") && (
          <p className="mt-1 text-sm text-red-600">
            {fieldError(state, "citedDomains")}
          </p>
        )}
        <p className="mt-1.5 text-xs text-gray-400">
          Accepts ChatGPT-style citations, full URLs, or bare domains. One per
          line or comma-separated.
        </p>
      </div>

      <p className="text-xs text-gray-400">
        The system will automatically analyze the response for client and
        competitor mentions, compute visibility and sentiment scores, and
        extract cited sources.
      </p>

      <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
        <SubmitButton label="Save result" pendingLabel="Analyzing..." />
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
