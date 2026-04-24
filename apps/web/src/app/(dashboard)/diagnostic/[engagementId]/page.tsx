import { notFound } from "next/navigation";
import { prisma } from "@antellion/db";
import { getOrganizationId } from "@/lib/auth";
import Link from "next/link";
import { validateDiagnosticDelivery } from "@antellion/core";
import type { FindingRecord } from "@antellion/core";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ engagementId: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  SCOPING: "Scoping",
  SCANNING: "Scanning",
  REVIEW: "Review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

export default async function DiagnosticDetailPage({ params }: Props) {
  const { engagementId } = await params;
  const organizationId = await getOrganizationId();

  const engagement = await prisma.engagement.findFirst({
    where: { id: engagementId, organizationId },
    select: {
      id: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      shareToken: true,
      shareTokenRevokedAt: true,
      client: { select: { name: true, domain: true } },
      jobCategory: { select: { name: true } },
      personas: {
        select: {
          persona: { select: { label: true, archetype: true, intent: true } },
          labelOverride: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      findings: {
        select: {
          id: true,
          index: true,
          namedIssue: true,
          actionableCategory: true,
          status: true,
          evidenceScanResultIds: true,
        },
        orderBy: { index: "asc" },
      },
      scanRuns: {
        select: {
          id: true,
          status: true,
          queryCount: true,
          resultCount: true,
          startedAt: true,
          completedAt: true,
          metadata: true,
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  if (!engagement) return notFound();

  const findingRecords: FindingRecord[] = engagement.findings.map((f) => ({
    id: f.id,
    namedIssue: f.namedIssue,
    evidenceScanResultIds: f.evidenceScanResultIds as string[],
    actionableCategory: f.actionableCategory,
    status: f.status as "DRAFT" | "APPROVED" | "REJECTED",
  }));

  const validation = validateDiagnosticDelivery(findingRecords);

  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const latestScan = engagement.scanRuns[0];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/diagnostic" className="text-sm text-gray-400 hover:text-gray-600">
              Diagnostics
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">{engagement.client.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {engagement.client.name}
          </h1>
          <p className="text-sm text-gray-500">{engagement.jobCategory.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-gray-600 border border-gray-200 rounded-full px-3 py-1">
            {STATUS_LABELS[engagement.status] ?? engagement.status}
          </span>
          {engagement.status === "PUBLISHED" && engagement.shareToken && !engagement.shareTokenRevokedAt && (
            <a
              href={`${APP_URL}/diagnostic/${engagement.shareToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-50 transition-colors"
            >
              View report
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Personas */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Personas
          </h3>
          <ul className="space-y-1">
            {engagement.personas.map((ep, i) => (
              <li key={i} className="text-sm text-gray-700">
                {ep.labelOverride ?? ep.persona.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Scan status */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Scan Progress
          </h3>
          {latestScan ? (
            <div className="text-sm space-y-1">
              <p className="text-gray-700">
                Status: <span className="font-medium">{latestScan.status}</span>
              </p>
              <p className="text-gray-500">
                {latestScan.resultCount}/{latestScan.queryCount} results
              </p>
              {latestScan.completedAt && (
                <p className="text-gray-400 text-xs">
                  Completed {latestScan.completedAt.toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No scan run yet</p>
          )}
        </div>

        {/* Findings summary */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Findings
          </h3>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium text-green-700">{validation.approvedCount}</span>{" "}
              <span className="text-gray-500">approved</span>
            </p>
            <p>
              <span className="font-medium text-gray-700">{validation.draftCount}</span>{" "}
              <span className="text-gray-500">draft</span>
            </p>
            <p>
              <span className="font-medium text-gray-400">{validation.rejectedCount}</span>{" "}
              <span className="text-gray-500">rejected</span>
            </p>
          </div>
        </div>
      </div>

      {/* Refund gate status */}
      <div
        className={`rounded-lg border px-5 py-4 mb-6 ${
          validation.valid
            ? "border-green-200 bg-green-50"
            : "border-yellow-200 bg-yellow-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Delivery gate: {validation.approvedMaterialCount}/{validation.required} material findings
            </p>
            {!validation.valid && (
              <p className="text-xs text-yellow-700 mt-0.5">
                {validation.shortfall} more approved material findings needed before publish is enabled.
              </p>
            )}
            {validation.valid && (
              <p className="text-xs text-green-700 mt-0.5">
                Refund threshold met. Publish is available.
              </p>
            )}
          </div>
          {validation.valid && engagement.status !== "PUBLISHED" && (
            <Link
              href={`/diagnostic/${engagement.id}/publish`}
              className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Publish
            </Link>
          )}
          {!validation.valid && (
            <span className="text-xs text-yellow-600 border border-yellow-300 rounded-full px-3 py-1">
              Publish blocked
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href={`/diagnostic/${engagement.id}/findings`}
          className="inline-flex items-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Review Findings ({engagement.findings.length})
        </Link>
        {engagement.status === "REVIEW" && (
          <Link
            href={`/diagnostic/${engagement.id}/publish`}
            className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              validation.valid
                ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-700"
                : "border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Publish Diagnostic
          </Link>
        )}
      </div>

      {/* Notes */}
      {engagement.notes && (
        <div className="mt-8 border-t border-gray-100 pt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Scoping Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{engagement.notes}</p>
        </div>
      )}
    </div>
  );
}
