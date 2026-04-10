import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@antellion/db";
import type { ReportSection, ReportSubsection, ReportTable } from "@antellion/core";
import { PageHeader } from "@/components/page-header";
import { StatusPipeline } from "@/components/StatusPipeline";
import { WorkflowStatusBar } from "@/components/WorkflowStatusBar";
import { Card, CardHeader, CardBody, Badge } from "@antellion/ui";
import { DeleteButton } from "@/components/delete-button";
import { EvidencePanel } from "@/components/EvidencePanel";
import { QAStatusBadge } from "@/components/QAStatusBadge";
import { EvidenceBadge } from "@/components/EvidenceBadge";
import { deleteReport } from "@/app/(dashboard)/actions/reports";
import { getReportQA } from "@/app/(dashboard)/actions/qa";
import { formatLongDate } from "@/lib/format";
import { getOrganizationId } from "@/lib/auth";
import { JourneyReportRenderer } from "@/components/report/JourneyReportRenderer";
import { extractJourneyMetadata } from "@/components/report/journey-types";
import { EvidenceSummaryBar } from "@/components/EvidenceSummaryBar";

interface Props {
  params: Promise<{ id: string }>;
}

const priorityColors: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-gray-100 text-gray-700",
};

const categoryLabels: Record<string, string> = {
  CONTENT_GAP: "Content gap",
  COMPETITIVE_POSITIONING: "Competitive positioning",
  EMPLOYER_BRAND: "Employer brand",
  TECHNICAL_REPUTATION: "Technical reputation",
  COMPENSATION_PERCEPTION: "Compensation",
  CULTURE_SIGNAL: "Culture",
  DIVERSITY_INCLUSION: "DEI",
  OTHER: "Other",
};

// Steps that represent the linear report lifecycle (ARCHIVED is terminal, not a step)
const REPORT_STEPS = ["DRAFT", "GENERATING", "REVIEW", "PUBLISHED"];

function DashboardTableView({ table }: { table: ReportTable }) {
  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {table.headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-100 last:border-0 even:bg-gray-50/50">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-3 py-2 text-gray-700 ${ci === 0 ? "font-medium text-gray-900" : ""}`}
                >
                  {cell === null ? "—" : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DashboardSubsectionView({ subsection }: { subsection: ReportSubsection }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {subsection.heading}
      </p>
      {subsection.body && (
        <p className="mt-1 text-sm text-gray-700">{subsection.body}</p>
      )}
      {subsection.table && (
        <div className="mt-2">
          <DashboardTableView table={subsection.table} />
        </div>
      )}
      {subsection.items && subsection.items.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-sm text-gray-600">
          {subsection.items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReadinessWarningBanner({
  warnings,
}: {
  warnings: Array<{ severity: string; title: string; description: string }>;
}) {
  const criticalCount = warnings.filter((w) => w.severity === "critical").length;
  const warningCount = warnings.filter((w) => w.severity === "warning").length;
  const infoCount = warnings.filter((w) => w.severity === "info").length;

  const summaryParts: string[] = [];
  if (criticalCount > 0) summaryParts.push(`${criticalCount} critical`);
  if (warningCount > 0) summaryParts.push(`${warningCount} warning`);
  if (infoCount > 0) summaryParts.push(`${infoCount} info`);

  return (
    <details className="rounded-md border border-amber-200 bg-amber-50">
      <summary className="cursor-pointer px-4 py-3 text-sm text-amber-800">
        <span className="font-medium">
          This report was generated with {warnings.length} readiness{" "}
          {warnings.length === 1 ? "warning" : "warnings"}
        </span>
        {" "}({summaryParts.join(", ")})
      </summary>
      <ul className="space-y-2 border-t border-amber-200 px-4 pb-3 pt-3">
        {warnings.map((w, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-0.5 inline-block shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold uppercase ${
                w.severity === "critical"
                  ? "bg-red-100 text-red-700"
                  : w.severity === "warning"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-blue-100 text-blue-700"
              }`}
            >
              {w.severity}
            </span>
            <div>
              <span className="font-medium text-gray-900">{w.title}</span>
              <span className="text-gray-600"> &mdash; {w.description}</span>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const report = await prisma.report.findFirst({
    where: { id, client: { organizationId } },
    include: {
      client: { select: { id: true, name: true, domain: true, industry: true } },
      recommendations: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!report) notFound();

  const qa = await getReportQA(id);

  const metaRaw = report.metadata;

  // Detect journey-format report
  const journeyMeta = extractJourneyMetadata(metaRaw);

  const sections: ReportSection[] =
    metaRaw &&
    typeof metaRaw === "object" &&
    !Array.isArray(metaRaw) &&
    Array.isArray((metaRaw as Record<string, unknown>).sections)
      ? ((metaRaw as Record<string, unknown>).sections as ReportSection[])
      : [];

  // Extract overall confidence from metadata (may be absent for older reports)
  const overallConfidence: { score: number; tier: string } | null = (() => {
    if (!metaRaw || typeof metaRaw !== "object" || Array.isArray(metaRaw)) {
      return null;
    }
    const meta = metaRaw as Record<string, unknown>;
    const conf = meta.confidence;
    if (!conf || typeof conf !== "object" || Array.isArray(conf)) return null;
    const overall = (conf as Record<string, unknown>).overall;
    if (
      !overall ||
      typeof overall !== "object" ||
      Array.isArray(overall) ||
      typeof (overall as Record<string, unknown>).score !== "number" ||
      typeof (overall as Record<string, unknown>).tier !== "string"
    ) {
      return null;
    }
    return {
      score: (overall as Record<string, unknown>).score as number,
      tier: (overall as Record<string, unknown>).tier as string,
    };
  })();

  // Extract readiness warnings from metadata (may be absent for older reports)
  const readinessWarnings: Array<{
    severity: string;
    title: string;
    description: string;
  }> = (() => {
    if (!metaRaw || typeof metaRaw !== "object" || Array.isArray(metaRaw)) {
      return [];
    }
    const meta = metaRaw as Record<string, unknown>;
    if (!Array.isArray(meta.readinessWarnings)) return [];
    return meta.readinessWarnings as Array<{
      severity: string;
      title: string;
      description: string;
    }>;
  })();

  const canExport =
    report.status === "PUBLISHED" || report.status === "ARCHIVED";

  // Pipeline shows the linear steps; archived reports get their own treatment
  const pipelineSteps =
    report.status === "ARCHIVED" ? [...REPORT_STEPS, "ARCHIVED"] : REPORT_STEPS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={report.title}
        description={`${report.client.name} · ${formatLongDate(report.generatedAt ?? report.createdAt)}`}
        action={
          <div className="flex items-center gap-3">
            {canExport && (
              <Link
                href={`/reports/${id}/export`}
                target="_blank"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Export
              </Link>
            )}
            <DeleteButton
              action={deleteReport.bind(null, id)}
              confirmMessage="Delete this report and all its recommendations?"
            />
          </div>
        }
      />

      {/* Tab navigation — Report / QA Review / Action Plan (Internal) */}
      <nav className="flex items-center gap-1 border-b border-gray-200 pb-0" aria-label="Report tabs">
        <span className="rounded-t-md border border-b-0 border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900">
          Report
        </span>
        <Link
          href={`/reports/${id}/qa`}
          className="rounded-t-md border border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-700"
        >
          QA Review
        </Link>
        <Link
          href={`/reports/${id}/action-plan`}
          className="flex items-center gap-1.5 rounded-t-md border border-transparent px-4 py-2 text-sm font-medium text-red-600 hover:border-red-200 hover:bg-red-50"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Action Plan (Internal)
        </Link>
      </nav>

      {/* Status pipeline */}
      <StatusPipeline steps={pipelineSteps} currentStep={report.status} />

      {/* Workflow status bar — hides for published/archived where no actions remain */}
      {report.status !== "PUBLISHED" && report.status !== "ARCHIVED" && (
        <WorkflowStatusBar
          entityType="report"
          status={report.status}
          entityId={id}
        />
      )}

      {/* QA status + overall confidence */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm font-medium text-gray-500">QA:</span>
        {qa ? (
          <>
            <QAStatusBadge status={qa.status} />
            <Link
              href={`/reports/${id}/qa`}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              View QA Review &rarr;
            </Link>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-400">Not run</span>
            <Link
              href={`/reports/${id}/qa`}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Run QA &rarr;
            </Link>
          </>
        )}
        {overallConfidence !== null && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-500">
              Confidence:
            </span>
            <EvidenceBadge
              confidenceScore={overallConfidence.score / 100}
              size="md"
            />
          </>
        )}
      </div>

      {/* Readiness warnings — shown when report was generated with data gaps */}
      {readinessWarnings.length > 0 && (
        <ReadinessWarningBanner warnings={readinessWarnings} />
      )}

      {/* Evidence summary bar — shown when linked evidence exists */}
      <EvidenceSummaryBar reportId={id} />

      {/* ── Report body — anchor target for "View evidence trail" ──────── */}
      <div id="evidence-trail">

      {/* ── Journey-format report (new renderer) ────────────────────────── */}
      {journeyMeta ? (
        <JourneyReportRenderer
          meta={journeyMeta}
          summary={report.summary}
          printMode={false}
          clientDomain={report.client.domain ?? undefined}
          clientIndustry={report.client.industry ?? undefined}
          evidencePanel={(sectionHeading) => (
            <EvidencePanel reportId={id} sectionHeading={sectionHeading} />
          )}
        />
      ) : (
        <>
          {/* ── Legacy report: executive summary ─────────────────────────── */}
          {report.summary && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-900">
                  Executive summary
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-sm leading-relaxed text-gray-700">
                  {report.summary}
                </p>
              </CardBody>
            </Card>
          )}

          {/* ── Legacy report: sections ───────────────────────────────────── */}
          {sections.length > 0 && (
            <div className="space-y-4">
              {sections.map((section) => (
                <Card key={section.heading}>
                  <CardHeader>
                    <h2 className="text-sm font-semibold text-gray-900">
                      {section.heading}
                    </h2>
                  </CardHeader>
                  <CardBody>
                    {section.body && (
                      <p className="text-sm leading-relaxed text-gray-700">
                        {section.body}
                      </p>
                    )}
                    {section.subsections && section.subsections.length > 0 && (
                      <div className="divide-y divide-gray-100">
                        {section.subsections.map((sub) => (
                          <DashboardSubsectionView
                            key={sub.heading}
                            subsection={sub}
                          />
                        ))}
                      </div>
                    )}
                    <EvidencePanel
                      reportId={id}
                      sectionHeading={section.heading}
                    />
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {/* ── Legacy report: recommendations ───────────────────────────── */}
          {report.recommendations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Recommendations ({report.recommendations.length})
              </h2>

              {report.recommendations.map((rec, i) => (
                <Card key={rec.id}>
                  <CardBody>
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">
                            {rec.title}
                          </h3>
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityColors[rec.priority] ?? priorityColors.MEDIUM}`}
                          >
                            {rec.priority}
                          </span>
                          <Badge>
                            {categoryLabels[rec.category] ?? rec.category}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-gray-700">
                          {rec.description}
                        </p>
                        <div className="mt-3 flex gap-6 text-xs text-gray-500">
                          {rec.impact && (
                            <div>
                              <span className="font-medium text-gray-600">
                                Impact:
                              </span>{" "}
                              {rec.impact}
                            </div>
                          )}
                          {rec.effort && (
                            <div>
                              <span className="font-medium text-gray-600">
                                Effort:
                              </span>{" "}
                              {rec.effort}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      </div>{/* end #evidence-trail */}
    </div>
  );
}
