import { notFound } from "next/navigation";
import { prisma } from "@antellion/db";
import type {
  ReportSection,
  ReportSubsection,
  ReportTable,
  CoverPage,
  GeneratedRecommendation,
} from "@antellion/core";
import { PrintButton } from "./print-button";
import { getOrganizationId } from "@/lib/auth";
import { JourneyReportRenderer } from "@/components/report/JourneyReportRenderer";
import { extractJourneyMetadata } from "@/components/report/journey-types";
import { EvidenceAppendix } from "@/components/EvidenceAppendix";

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Metadata parsing ────────────────────────────────────────

interface ReportMetadata {
  sections: ReportSection[];
  coverPage: CoverPage | null;
  recommendations: GeneratedRecommendation[];
  scanRunIds: string[];
}

function parseReportMetadata(raw: unknown): ReportMetadata {
  if (!raw || typeof raw !== "object") {
    return { sections: [], coverPage: null, recommendations: [], scanRunIds: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    sections: Array.isArray(obj.sections) ? (obj.sections as ReportSection[]) : [],
    coverPage:
      obj.coverPage && typeof obj.coverPage === "object"
        ? (obj.coverPage as CoverPage)
        : null,
    recommendations: Array.isArray(obj.recommendations)
      ? (obj.recommendations as GeneratedRecommendation[])
      : [],
    scanRunIds: Array.isArray(obj.scanRunIds) ? (obj.scanRunIds as string[]) : [],
  };
}



// ─── Label maps ─────────────────────────────────────────────

const priorityLabels: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const categoryLabels: Record<string, string> = {
  CONTENT_GAP: "Content and Citation Gap",
  COMPETITIVE_POSITIONING: "Competitive Positioning",
  EMPLOYER_BRAND: "Employer Brand Signal",
  TECHNICAL_REPUTATION: "Technical Reputation",
  COMPENSATION_PERCEPTION: "Compensation Perception",
  CULTURE_SIGNAL: "Culture and Workplace Signal",
  DIVERSITY_INCLUSION: "Diversity, Equity, and Inclusion",
  OTHER: "Strategic Opportunity",
};

const priorityBadgeClass: Record<string, string> = {
  CRITICAL: "bg-red-50 text-red-700 border border-red-200",
  HIGH: "bg-orange-50 text-orange-700 border border-orange-200",
  MEDIUM: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  LOW: "bg-gray-100 text-gray-600 border border-gray-200",
};

// ─── Helpers ────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isNumeric(value: string | number | null): boolean {
  if (value === null) return false;
  if (typeof value === "number") return true;
  return /^[+-]?\d+(\.\d+)?(%|pp)?$/.test(String(value).trim());
}

// ─── Cover page ─────────────────────────────────────────────

function CoverPageView({
  cover,
  generatedDate,
}: {
  cover: CoverPage;
  generatedDate: string;
}) {
  return (
    <div
      className="cover-page flex min-h-screen flex-col items-center justify-center px-16 py-20 text-center"
      style={{ pageBreakAfter: "always" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400"
        style={{ letterSpacing: "0.2em" }}
      >
        Antellion
      </p>

      <h1 className="mt-8 text-4xl font-bold leading-tight tracking-tight text-gray-900">
        {cover.documentTitle}
      </h1>

      <div className="mt-10 border-t border-gray-200 pt-10">
        <p className="text-2xl font-semibold text-gray-900">{cover.clientName}</p>
        {cover.industry && (
          <p className="mt-2 text-base text-gray-500">{cover.industry}</p>
        )}
        <p className="mt-1 text-sm text-gray-400">{cover.clientDomain}</p>
      </div>

      <div className="mt-10 space-y-1">
        <p className="text-sm text-gray-500">
          Assessment date: {cover.assessmentDate || generatedDate}
        </p>
      </div>

      <div className="mt-16 border-t border-gray-100 pt-8">
        <p className="text-xs text-gray-400">{cover.confidentialityLine}</p>
        <p className="mt-1 text-xs text-gray-400">Prepared by Antellion</p>
      </div>
    </div>
  );
}

// ─── Summary renderer ────────────────────────────────────────
// Handles \n\n paragraph breaks and \n- bullet items

function SummaryRenderer({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n/);

  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-700">
      {paragraphs.map((block, i) => {
        const lines = block.split("\n");
        const bulletLines = lines.filter((l) => l.startsWith("- "));
        const textLines = lines.filter((l) => !l.startsWith("- "));
        const hasLabel = textLines.length > 0 && textLines[0]?.trim();

        if (bulletLines.length > 0 && textLines.length === 0) {
          // Pure bullet block
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {bulletLines.map((item, j) => (
                <li key={j}>{item.replace(/^-\s*/, "")}</li>
              ))}
            </ul>
          );
        }

        if (bulletLines.length > 0 && hasLabel) {
          // Label line followed by bullets
          return (
            <div key={i}>
              <p>{textLines.join(" ")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {bulletLines.map((item, j) => (
                  <li key={j}>{item.replace(/^-\s*/, "")}</li>
                ))}
              </ul>
            </div>
          );
        }

        // Plain paragraph
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}

// ─── Table renderer ──────────────────────────────────────────

function ReportTableView({ table }: { table: ReportTable }) {
  return (
    <div className="break-inside-avoid overflow-hidden rounded border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {table.headers.map((header, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-gray-100 last:border-0 even:bg-gray-50/50"
            >
              {row.map((cell, ci) => {
                const cellStr = cell === null ? "—" : String(cell);
                const numeric = isNumeric(cell);
                return (
                  <td
                    key={ci}
                    className={`px-4 py-2.5 text-gray-700 ${ci === 0 ? "font-medium text-gray-900" : ""} ${numeric && ci > 0 ? "tabular-nums" : ""}`}
                  >
                    {cellStr}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Subsection renderer ─────────────────────────────────────

function SubsectionView({ subsection }: { subsection: ReportSubsection }) {
  return (
    <div className="break-inside-avoid mt-6">
      <h3 className="text-sm font-semibold text-gray-800">{subsection.heading}</h3>

      {subsection.body && (
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          {subsection.body}
        </p>
      )}

      {subsection.table && (
        <div className="mt-3">
          <ReportTableView table={subsection.table} />
        </div>
      )}

      {subsection.items && subsection.items.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {subsection.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Section renderer ────────────────────────────────────────

function ReportSectionView({
  section,
  index,
}: {
  section: ReportSection;
  index: number;
}) {
  return (
    <section className={`mt-12 ${index === 0 ? "page-break" : ""}`}>
      <h2 className="text-xl font-bold text-gray-900">{section.heading}</h2>

      {section.body && (
        <div className="mt-3">
          <SummaryRenderer text={section.body} />
        </div>
      )}

      {section.subsections && section.subsections.length > 0 && (
        <div className="mt-4 space-y-0">
          {section.subsections.map((sub) => (
            <SubsectionView key={sub.heading} subsection={sub} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Enriched recommendation card (legacy format) ────────────

function EnrichedRecommendationCard({
  rec,
  index,
}: {
  rec: GeneratedRecommendation;
  index: number;
}) {
  const badgeClass =
    priorityBadgeClass[rec.priority] ?? priorityBadgeClass.MEDIUM;

  return (
    <div className="break-inside-avoid border-b border-gray-200 pb-8 pt-8 first:pt-0">
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-500">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{rec.title}</h3>
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}
            >
              {priorityLabels[rec.priority] ?? rec.priority}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {categoryLabels[rec.category] ?? rec.category}
          </p>

          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            {rec.description}
          </p>

          {rec.rationale && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Rationale
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                {rec.rationale}
              </p>
            </div>
          )}

          {rec.actions && rec.actions.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Recommended actions
              </p>
              <ol className="mt-2 space-y-1.5">
                {rec.actions.map((action, ai) => (
                  <li key={ai} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold text-gray-500">
                      {ai + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-6 text-xs text-gray-500">
            {rec.impact && (
              <div>
                <span className="font-medium text-gray-600">Impact: </span>
                {rec.impact}
              </div>
            )}
            {rec.effortDetail ? (
              <div>
                <span className="font-medium text-gray-600">Effort: </span>
                {rec.effortDetail}
              </div>
            ) : rec.effort ? (
              <div>
                <span className="font-medium text-gray-600">Effort: </span>
                {rec.effort}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recommendations summary table ──────────────────────────

function RecsTable({
  recs,
  startIndex,
}: {
  recs: GeneratedRecommendation[];
  startIndex: number;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-300 text-left text-gray-500">
          <th className="pb-2 pr-4 font-medium">#</th>
          <th className="pb-2 pr-4 font-medium">Recommendation</th>
          <th className="pb-2 pr-4 font-medium">Category</th>
          <th className="pb-2 pr-4 font-medium">Priority</th>
          <th className="pb-2 font-medium">Effort</th>
        </tr>
      </thead>
      <tbody>
        {recs.map((rec, i) => (
          <tr
            key={i}
            className="border-b border-gray-100 align-top"
          >
            <td className="py-3 pr-4 text-gray-400">{startIndex + i + 1}</td>
            <td className="py-3 pr-4">
              <p className="font-medium text-gray-900">{rec.title}</p>
              <p className="mt-1 text-gray-600">{rec.description}</p>
              {rec.impact && (
                <p className="mt-1 text-xs text-gray-400">Impact: {rec.impact}</p>
              )}
            </td>
            <td className="py-3 pr-4 text-gray-600">
              {categoryLabels[rec.category] ?? rec.category}
            </td>
            <td className="py-3 pr-4 text-gray-600">
              {priorityLabels[rec.priority] ?? rec.priority}
            </td>
            <td className="py-3 text-gray-600">{rec.effort || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default async function ReportExportPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const report = await prisma.report.findFirst({
    where: { id, client: { organizationId } },
    include: {
      client: { select: { name: true, domain: true, industry: true } },
      recommendations: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!report) notFound();
  if (report.status !== "PUBLISHED" && report.status !== "ARCHIVED") {
    notFound();
  }

  const meta = parseReportMetadata(report.metadata);

  // Detect journey-format report
  const journeyMeta = extractJourneyMetadata(report.metadata);

  const sections = meta.sections;
  const coverPage = meta.coverPage;
  const generatedDate = formatDate(report.generatedAt ?? report.createdAt);

  // Enriched recommendations come from metadata (set by the backend when composing).
  // Fall back to the plain DB recommendation records for old reports.
  const enrichedRecs = meta.recommendations.length > 0 ? meta.recommendations : null;
  const dbRecs = report.recommendations;

  // Determine whether we have enriched top-3 data for the detailed card layout.
  // An enriched recommendation is one with rationale or actions.
  const hasEnrichedRecs =
    enrichedRecs !== null &&
    enrichedRecs.slice(0, 3).some((r) => r.rationale || (r.actions && r.actions.length > 0));

  // For rendering: use enriched recs if available, fall back to DB shape
  const displayRecs: GeneratedRecommendation[] = enrichedRecs
    ? enrichedRecs
    : dbRecs.map((r) => ({
        category: r.category,
        priority: r.priority,
        title: r.title,
        description: r.description ?? "",
        impact: r.impact ?? "",
        effort: r.effort ?? "",
      }));

  const topDisplayRecs = displayRecs.slice(0, 3);
  const remainingDisplayRecs = displayRecs.slice(3);

  return (
    <>
      {/* Print-specific overrides — embedded so the page is self-contained */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4;
                margin: 20mm 18mm 25mm 18mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print { display: none !important; }
              .page-break { break-before: page; }
              .cover-page { break-after: page; }
              .journey-section { break-before: page; }
              .journey-section:first-child { break-before: avoid; }
              .print-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 6mm 18mm;
                border-top: 1px solid #e5e7eb;
                background: white;
                display: flex !important;
                justify-content: space-between;
                font-size: 10px;
                color: #9ca3af;
              }
            }
            @media screen {
              .print-only { display: none; }
              .print-footer { display: none; }
            }
          `,
        }}
      />

      {/* Fixed footer — only renders in print */}
      <div className="print-footer">
        <span>Confidential — {report.client.name}</span>
        <span>Antellion — {generatedDate}</span>
      </div>

      <div className="mx-auto max-w-3xl px-8 py-12">
        {/* Toolbar — hidden when printing */}
        <div className="no-print mb-8 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <a
            href={`/reports/${id}`}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to report
          </a>
          <PrintButton />
        </div>

        {/* ═══ Cover page ═══ */}
        {/* Journey-format reports render their own cover page inside JourneyReportRenderer. */}
        {/* Only render the legacy CoverPageView for non-journey reports. */}
        {!journeyMeta && (
          coverPage ? (
            <CoverPageView cover={coverPage} generatedDate={generatedDate} />
          ) : (
            /* Fallback document header for old reports without a cover page */
            <header className="border-b border-gray-300 pb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Antellion
              </p>
              <h1 className="mt-3 text-2xl font-bold text-gray-900">
                {report.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-6 text-sm text-gray-500">
                <span>{report.client.name}</span>
                <span>{report.client.domain}</span>
                {report.client.industry && (
                  <span>{report.client.industry}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-400">
                Generated {generatedDate}
              </p>
            </header>
          )
        )}

        {/* ═══ Journey-format report ═══ */}
        {journeyMeta ? (
          <div>
            <JourneyReportRenderer
              meta={journeyMeta}
              summary={report.summary}
              printMode={true}
              clientDomain={report.client.domain ?? undefined}
              clientIndustry={report.client.industry ?? undefined}
            />
          </div>
        ) : (
          <>
            {/* ═══ Legacy: Executive summary ═══ */}
            {report.summary && (
              <section className={`${coverPage ? "mt-12" : "mt-10"}`}>
                <h2 className="text-xl font-bold text-gray-900">
                  Executive Summary
                </h2>
                <div className="mt-4">
                  <SummaryRenderer text={report.summary} />
                </div>
              </section>
            )}

            {/* ═══ Legacy: Findings sections ═══ */}
            {sections.map((section, i) => (
              <ReportSectionView key={section.heading} section={section} index={i} />
            ))}

            {/* ═══ Legacy: Recommendations ═══ */}
            {dbRecs.length > 0 && (
              <section className="mt-12 page-break">
                <h2 className="text-xl font-bold text-gray-900">
                  Recommendations
                </h2>

                {hasEnrichedRecs ? (
                  <>
                    {/* Top 3 — detailed enriched cards */}
                    <div className="mt-6">
                      {topDisplayRecs.map((rec, i) => (
                        <EnrichedRecommendationCard key={i} rec={rec} index={i} />
                      ))}
                    </div>

                    {/* Remaining 4+ — summary table */}
                    {remainingDisplayRecs.length > 0 && (
                      <div className="mt-10">
                        <h3 className="mb-4 text-sm font-semibold text-gray-700">
                          Further opportunities
                        </h3>
                        <RecsTable
                          recs={remainingDisplayRecs}
                          startIndex={topDisplayRecs.length}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  /* Old reports without enriched data — all in table */
                  <div className="mt-6">
                    <RecsTable recs={displayRecs} startIndex={0} />
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ═══ Evidence Appendix (optional — only renders when evidence exists) ═══ */}
        <EvidenceAppendix reportId={id} />

        {/* ═══ Footer ═══ */}
        <footer className="no-print mt-16 border-t border-gray-300 pt-6">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Confidential — {report.client.name}</span>
            <span>Antellion — {generatedDate}</span>
          </div>
        </footer>
      </div>
    </>
  );
}
