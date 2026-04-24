import { prisma } from "@antellion/db";
import { getOrganizationId } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  SCOPING: "Scoping",
  SCANNING: "Scanning",
  REVIEW: "Review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

const STATUS_COLORS: Record<string, string> = {
  SCOPING: "bg-gray-100 text-gray-600",
  SCANNING: "bg-blue-50 text-blue-700",
  REVIEW: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  PUBLISHED: "bg-green-100 text-green-800 font-semibold",
};

export default async function DiagnosticListPage() {
  const organizationId = await getOrganizationId();

  const engagements = await prisma.engagement.findMany({
    where: { organizationId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      shareToken: true,
      client: { select: { name: true, domain: true } },
      jobCategory: { select: { name: true } },
      personas: {
        select: { persona: { select: { label: true } }, labelOverride: true },
        orderBy: { sortOrder: "asc" },
      },
      findings: {
        select: { status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagnostic Engagements</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI Visibility Diagnostics — $4,900 fixed-fee, 10-business-day delivery
          </p>
        </div>
        <Link
          href="/diagnostic/new"
          className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          New Diagnostic
        </Link>
      </div>

      {engagements.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-base">No diagnostic engagements yet.</p>
          <Link
            href="/diagnostic/new"
            className="mt-4 inline-block text-sm text-gray-700 underline underline-offset-2"
          >
            Create your first Diagnostic
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {engagements.map((eng) => {
            const approvedCount = eng.findings.filter((f) => f.status === "APPROVED").length;
            const draftCount = eng.findings.filter((f) => f.status === "DRAFT").length;
            const personaLabels = eng.personas
              .slice(0, 3)
              .map((ep) => ep.labelOverride ?? ep.persona.label)
              .join(", ");

            return (
              <div
                key={eng.id}
                className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-gray-900">
                        {eng.client.name}
                      </h2>
                      <span className="text-gray-400">&mdash;</span>
                      <span className="text-sm text-gray-600">{eng.jobCategory.name}</span>
                      <span
                        className={`inline-block text-xs rounded-full px-2.5 py-0.5 ${STATUS_COLORS[eng.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {STATUS_LABELS[eng.status] ?? eng.status}
                      </span>
                    </div>
                    {personaLabels && (
                      <p className="text-xs text-gray-400 mt-1">
                        Personas: {personaLabels}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {eng.findings.length > 0
                        ? `${approvedCount} approved / ${draftCount} draft / ${eng.findings.length} total findings`
                        : "No findings yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {eng.status === "PUBLISHED" && eng.shareToken && (
                      <a
                        href={`${APP_URL}/diagnostic/${eng.shareToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline underline-offset-2"
                      >
                        View report
                      </a>
                    )}
                    <Link
                      href={`/diagnostic/${eng.id}`}
                      className="text-xs text-gray-700 border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
