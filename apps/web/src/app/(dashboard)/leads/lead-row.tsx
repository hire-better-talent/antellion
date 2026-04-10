"use client";

import { useState } from "react";
import Link from "next/link";
import { updateLeadNotes, updateLeadStatus } from "./actions";

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  NEW: { label: "New", color: "bg-blue-100 text-blue-800" },
  CONTACTED: { label: "Contacted", color: "bg-yellow-100 text-yellow-800" },
  SNAPSHOT_SENT: {
    label: "Snapshot Sent",
    color: "bg-green-100 text-green-800",
  },
  CONVERTED: { label: "Converted", color: "bg-purple-100 text-purple-800" },
  DECLINED: { label: "Declined", color: "bg-gray-100 text-gray-600" },
};

const STATUSES = [
  "NEW",
  "CONTACTED",
  "SNAPSHOT_SENT",
  "CONVERTED",
  "DECLINED",
] as const;

interface Lead {
  id: string;
  companyName: string;
  companyDomain: string;
  contactName: string;
  contactEmail: string;
  contactTitle: string | null;
  topCompetitor: string | null;
  primaryRole: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
}

export function LeadRow({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lead.status);

  const badge = STATUS_BADGE[currentStatus] ?? STATUS_BADGE.NEW;

  async function handleSaveNotes() {
    setSaving(true);
    try {
      await updateLeadNotes(lead.id, notes);
    } catch {
      // Silently fail — notes are non-critical
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    setCurrentStatus(newStatus);
    try {
      await updateLeadStatus(lead.id, newStatus);
    } catch {
      setCurrentStatus(lead.status); // revert on failure
    }
  }

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="whitespace-nowrap px-4 py-3 text-sm">
          <div className="font-medium text-gray-900">{lead.companyName}</div>
          <div className="text-xs text-gray-500">{lead.companyDomain}</div>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
          {lead.contactName}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
          <a
            href={`mailto:${lead.contactEmail}`}
            className="hover:text-gray-900 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {lead.contactEmail}
          </a>
        </td>
        <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-500 lg:table-cell">
          {lead.contactTitle ?? "--"}
        </td>
        <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-500 md:table-cell">
          {lead.topCompetitor ?? "--"}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm">
          <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${badge.color}`}
          >
            {badge.label}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
          {lead.createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
          <Link
            href={`/snapshots/new?prospectName=${encodeURIComponent(lead.companyName)}&prospectDomain=${encodeURIComponent(lead.companyDomain)}${lead.topCompetitor ? `&competitor=${encodeURIComponent(lead.topCompetitor)}` : ""}`}
            className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            onClick={(e) => e.stopPropagation()}
          >
            Run Snapshot
          </Link>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={8} className="bg-gray-50 px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Status selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600">
                  Status
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_BADGE[s].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Details */}
              <div className="space-y-1 text-sm text-gray-600">
                {lead.primaryRole && (
                  <p>
                    <span className="font-medium text-gray-700">
                      Primary role:
                    </span>{" "}
                    {lead.primaryRole}
                  </p>
                )}
                {lead.topCompetitor && (
                  <p>
                    <span className="font-medium text-gray-700">
                      Top competitor:
                    </span>{" "}
                    {lead.topCompetitor}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Add internal notes about this lead..."
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="mt-2 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save notes"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
