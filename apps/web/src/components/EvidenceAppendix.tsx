import { prisma } from "@antellion/db";

interface EvidenceAppendixProps {
  reportId: string;
}

interface SectionSummary {
  heading: string;
  queryCount: number;
  avgConfidence: number | null;
  topItems: {
    queryText: string | null;
    mentioned: boolean | null;
    visibilityScore: number | null;
    sentimentScore: number | null;
  }[];
}

function confidenceTierLabel(score: number): string {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.4) return "MEDIUM";
  return "LOW";
}

function formatSentiment(score: number | null): string {
  if (score === null) return "—";
  if (score > 0) return `+${score.toFixed(1)}`;
  if (score < 0) return score.toFixed(1);
  return "0.0";
}

async function buildSectionSummaries(reportId: string): Promise<SectionSummary[]> {
  const links = await prisma.reportEvidence.findMany({
    where: { reportId },
    orderBy: [{ sectionHeading: "asc" }, { sortOrder: "asc" }],
    select: {
      sectionHeading: true,
      scanEvidence: {
        select: {
          confidenceScore: true,
          scanResult: {
            select: {
              mentioned: true,
              visibilityScore: true,
              sentimentScore: true,
              query: { select: { text: true } },
            },
          },
        },
      },
    },
  });

  if (links.length === 0) return [];

  // Group by section heading
  const sectionMap = new Map<
    string,
    {
      confidenceScores: number[];
      items: SectionSummary["topItems"];
    }
  >();

  for (const link of links) {
    const heading = link.sectionHeading ?? "General";
    const entry = sectionMap.get(heading) ?? { confidenceScores: [], items: [] };

    if (link.scanEvidence.confidenceScore !== null) {
      entry.confidenceScores.push(link.scanEvidence.confidenceScore);
    }

    entry.items.push({
      queryText: link.scanEvidence.scanResult.query?.text ?? null,
      mentioned: link.scanEvidence.scanResult.mentioned,
      visibilityScore: link.scanEvidence.scanResult.visibilityScore,
      sentimentScore: link.scanEvidence.scanResult.sentimentScore,
    });

    sectionMap.set(heading, entry);
  }

  return [...sectionMap.entries()].map(([heading, data]) => {
    const scores = data.confidenceScores;
    const avgConfidence =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

    return {
      heading,
      queryCount: data.items.length,
      avgConfidence,
      topItems: data.items.slice(0, 5),
    };
  });
}

async function getReportEvidenceMeta(reportId: string): Promise<{
  totalLinks: number;
  totalUnique: number;
  approvedCount: number;
  avgConfidence: number | null;
  modelName: string | null;
}> {
  const links = await prisma.reportEvidence.findMany({
    where: { reportId },
    select: {
      scanEvidence: {
        select: {
          id: true,
          status: true,
          modelName: true,
          confidenceScore: true,
        },
      },
    },
  });

  if (links.length === 0) {
    return { totalLinks: 0, totalUnique: 0, approvedCount: 0, avgConfidence: null, modelName: null };
  }

  const uniqueMap = new Map(links.map((l) => [l.scanEvidence.id, l.scanEvidence]));
  const unique = [...uniqueMap.values()];
  const approvedCount = unique.filter((e) => e.status === "APPROVED").length;

  const scores = unique
    .map((e) => e.confidenceScore)
    .filter((s): s is number => s !== null);
  const avgConfidence =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  // Use the most common model name
  const modelCounts = new Map<string, number>();
  for (const e of unique) {
    const c = modelCounts.get(e.modelName) ?? 0;
    modelCounts.set(e.modelName, c + 1);
  }
  const modelName =
    modelCounts.size > 0
      ? [...modelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      : null;

  return {
    totalLinks: links.length,
    totalUnique: unique.length,
    approvedCount,
    avgConfidence,
    modelName,
  };
}

export async function EvidenceAppendix({ reportId }: EvidenceAppendixProps) {
  const [meta, sections] = await Promise.all([
    getReportEvidenceMeta(reportId),
    buildSectionSummaries(reportId),
  ]);

  // If there's no evidence data, render nothing (gate for legacy reports)
  if (meta.totalLinks === 0 || sections.length === 0) return null;

  const methodologyLine = [
    `${meta.totalLinks} candidate-intent quer${meta.totalLinks !== 1 ? "ies" : "y"}`,
    `across ${sections.length} theme${sections.length !== 1 ? "s" : ""}`,
    meta.modelName ? `evaluated against ${meta.modelName}` : null,
    meta.avgConfidence !== null
      ? `Average confidence: ${confidenceTierLabel(meta.avgConfidence)} (${Math.round(meta.avgConfidence * 100)}%)`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      {/* Force page break before appendix */}
      <section
        className="mt-16 page-break"
        aria-label="Evidence Appendix"
      >
        {/* Section header */}
        <div className="mb-8 border-b border-gray-300 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
            Appendix
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">
            Evidence Basis
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Assessment methodology: {methodologyLine}.
          </p>
        </div>

        {/* Per-section tables */}
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.heading} className="break-inside-avoid">
              {/* Section heading + stats */}
              <div className="mb-3 flex flex-wrap items-baseline gap-3">
                <h3 className="text-base font-semibold text-gray-900">
                  {section.heading}
                </h3>
                <span className="text-sm text-gray-500">
                  {section.queryCount} quer{section.queryCount !== 1 ? "ies" : "y"}
                </span>
                {section.avgConfidence !== null && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-sm text-gray-500">
                      Avg confidence:{" "}
                      <span className="font-medium text-gray-700">
                        {confidenceTierLabel(section.avgConfidence)}{" "}
                        ({Math.round(section.avgConfidence * 100)}%)
                      </span>
                    </span>
                  </>
                )}
              </div>

              {/* Query summary table */}
              <div className="overflow-hidden rounded border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Query
                      </th>
                      <th className="w-24 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Mentioned
                      </th>
                      <th className="w-20 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Visibility
                      </th>
                      <th className="w-20 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Sentiment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.topItems.map((item, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 last:border-0 even:bg-gray-50/50"
                      >
                        <td className="px-3 py-2 text-gray-700">
                          {item.queryText ?? (
                            <span className="italic text-gray-400">
                              Query not available
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.mentioned === null ? (
                            <span className="text-gray-400">—</span>
                          ) : item.mentioned ? (
                            <span className="font-medium text-green-700">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                          {item.visibilityScore !== null
                            ? item.visibilityScore
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                          {formatSentiment(item.sentimentScore)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {section.queryCount > 5 && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Showing top 5 of {section.queryCount} queries for this section.
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Appendix footer note */}
        <p className="mt-10 text-xs text-gray-400">
          Evidence records represent AI model responses collected during the
          assessment scan. Confidence scores reflect the quality and consistency
          of retrieved information. All evidence shown has been reviewed by a
          Antellion analyst.
        </p>
      </section>
    </>
  );
}
