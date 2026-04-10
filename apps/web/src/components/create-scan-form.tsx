"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/actions";
import { fieldError } from "@/lib/actions";
import { SubmitButton } from "./submit-button";

const AI_MODEL_OPTIONS = [
  { label: "ChatGPT (GPT-4o)", value: "gpt-4o" },
  { label: "ChatGPT (GPT-4o mini)", value: "gpt-4o-mini" },
  { label: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" },
  { label: "Claude Haiku", value: "claude-haiku-4-5-20251001" },
  { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
  { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro-preview-05-06" },
  { label: "Manual (copy/paste)", value: "manual" },
] as const;

const QUERY_DEPTH_OPTIONS = [
  {
    value: "First Layer",
    label: "First Layer",
    description: "Single query per topic, no follow-up actions taken",
  },
  {
    value: "Conversational",
    label: "Conversational",
    description: "Follow-up queries within the same session",
  },
  {
    value: "Multi-Session",
    label: "Multi-Session",
    description: "Separate sessions with different entry points",
  },
] as const;

interface ClusterOption {
  id: string;
  name: string;
  queryCount: number;
  createdAt?: string | Date;
  scanned?: boolean;
}

interface ClientOption {
  id: string;
  name: string;
  domain: string;
  defaultFocusArea?: string;
  queryClusters: ClusterOption[];
}

interface CreateScanFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  clients: ClientOption[];
  preselectedClientId?: string;
}

export function CreateScanForm({
  action,
  clients,
  preselectedClientId,
}: CreateScanFormProps) {
  const [state, formAction] = useActionState(action, null);
  const [selectedClientId, setSelectedClientId] = useState(
    preselectedClientId ?? "",
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const clusters = selectedClient?.queryClusters ?? [];

  // When a client is selected, auto-populate focusArea from the client's default
  const defaultFocusArea = selectedClient?.defaultFocusArea ?? "";
  const [focusArea, setFocusArea] = useState(defaultFocusArea);

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    setFocusArea(client?.defaultFocusArea ?? "");
  }

  return (
    <form action={formAction} className="space-y-6">
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

      {/* Assessment parameters */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* AI Model */}
        <div>
          <label
            htmlFor="aiModel"
            className="block text-sm font-medium text-gray-700"
          >
            AI Model
          </label>
          <select
            id="aiModel"
            name="aiModel"
            defaultValue="gpt-4o"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {AI_MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Query Depth */}
        <div>
          <label
            htmlFor="queryDepth"
            className="block text-sm font-medium text-gray-700"
          >
            Query Depth
          </label>
          <select
            id="queryDepth"
            name="queryDepth"
            defaultValue="First Layer"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {QUERY_DEPTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            How deep each query session goes
          </p>
        </div>

        {/* Focus Area */}
        <div>
          <label
            htmlFor="focusArea"
            className="block text-sm font-medium text-gray-700"
          >
            Focus Area
          </label>
          <input
            id="focusArea"
            name="focusArea"
            type="text"
            value={focusArea}
            onChange={(e) => setFocusArea(e.target.value)}
            placeholder="e.g. Sales, Software Engineering"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Role type covered by this scan
          </p>
        </div>
      </div>

      {/* Query cluster selection */}
      {selectedClientId && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Query clusters <span className="text-red-500">*</span>
          </label>
          {clusters.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              No query clusters for this client.{" "}
              <Link
                href={`/queries/generate?clientId=${selectedClientId}`}
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Generate queries first.
              </Link>
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {clusters.map((cluster) => {
                const date = cluster.createdAt
                  ? new Date(cluster.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : null;
                return (
                  <label
                    key={cluster.id}
                    className={`flex items-center gap-3 rounded-md border px-4 py-3 hover:bg-gray-50 ${
                      cluster.scanned
                        ? "border-gray-200 bg-gray-50"
                        : "border-brand-200 bg-brand-50/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="queryClusterIds"
                      value={cluster.id}
                      defaultChecked={!cluster.scanned}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {cluster.name}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {cluster.queryCount} queries
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {date && (
                          <span className="text-xs text-gray-400">{date}</span>
                        )}
                        {cluster.scanned ? (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            scanned
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                            new
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {fieldError(state, "queryClusterIds") && (
            <p className="mt-1 text-sm text-red-600">
              {fieldError(state, "queryClusterIds")}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
        <SubmitButton label="Start scan" pendingLabel="Creating..." />
        <Link
          href="/scans"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
