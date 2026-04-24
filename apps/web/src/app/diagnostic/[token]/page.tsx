import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@antellion/db";
import { buildAuditAppendix, validateDiagnosticDelivery } from "@antellion/core";
import type { AuditEntry, FindingRecord } from "@antellion/core";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

// ─── Types ────────────────────────────────────────────────────

interface FindingRow {
  id: string;
  index: number;
  namedIssue: string;
  narrative: string | null;
  actionableCategory: string;
  stage: string | null;
  modelName: string | null;
  personaId: string | null;
  status: "DRAFT" | "APPROVED" | "REJECTED";
  evidenceScanResultIds: string[];
  evidenceCitations: Array<{ domain: string; count: number }> | null;
  approvedById: string | null;
  approvedAt: Date | null;
  auditEntry: {
    hasNamedIssue: boolean;
    hasEvidence: boolean;
    hasActionableCategory: boolean;
    isMaterial: boolean;
    evidenceCount: number;
    actionableCategoryCopy: string;
  } | null;
}

// ─── Metadata ─────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;

  const engagement = await prisma.engagement.findFirst({
    where: {
      shareToken: token,
      shareTokenRevokedAt: null,
      status: "PUBLISHED",
    },
    select: {
      client: { select: { name: true } },
      jobCategory: { select: { name: true } },
    },
  });

  if (!engagement) {
    return { title: "Diagnostic Report Unavailable | Antellion" };
  }

  return {
    title: `AI Visibility Diagnostic — ${engagement.client.name} | Antellion`,
    description: `AI employer visibility diagnostic for ${engagement.client.name} (${engagement.jobCategory.name}). Prepared by Antellion.`,
    robots: { index: false, follow: false },
  };
}

// ─── Finding category labels ──────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  ZERO_PRESENCE: "Zero presence",
  COMPETITOR_DOMINANCE: "Competitor dominance",
  SENTIMENT_DIVERGENCE: "Sentiment divergence",
  CITATION_MONOCULTURE: "Citation monoculture",
  PERSONA_INVISIBILITY: "Persona invisibility",
  NARRATIVE_INCONSISTENCY: "Narrative inconsistency",
  ZERO_CITATION: "Zero citation",
  CONTENT_GAP: "Content gap",
  COMPETITIVE_POSITIONING: "Competitive positioning",
  EMPLOYER_BRAND: "Employer brand",
  OTHER: "Other",
};

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  CONSIDERATION: "Consideration",
  EVALUATION: "Evaluation",
  COMMITMENT: "Commitment",
};

// ─── Page ─────────────────────────────────────────────────────

export default async function DiagnosticReportPage({ params }: Props) {
  const { token } = await params;

  const engagement = await prisma.engagement.findFirst({
    where: {
      shareToken: token,
      shareTokenRevokedAt: null,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      client: {
        select: {
          name: true,
          industry: true,
          competitors: { select: { name: true, domain: true } },
        },
      },
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
        where: { status: "APPROVED" },
        select: {
          id: true,
          index: true,
          namedIssue: true,
          narrative: true,
          actionableCategory: true,
          stage: true,
          modelName: true,
          personaId: true,
          status: true,
          evidenceScanResultIds: true,
          evidenceCitations: true,
          approvedById: true,
          approvedAt: true,
          auditEntries: {
            select: {
              hasNamedIssue: true,
              hasEvidence: true,
              hasActionableCategory: true,
              isMaterial: true,
              evidenceCount: true,
              actionableCategoryCopy: true,
            },
          },
        },
        orderBy: { index: "asc" },
      },
      scanRuns: {
        where: { status: "COMPLETED" },
        select: {
          id: true,
          completedAt: true,
          resultCount: true,
          metadata: true,
        },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!engagement) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Diagnostic report unavailable
          </h1>
          <p className="text-sm text-gray-500">
            This link may have expired or been revoked. Contact{" "}
            <a
              href="mailto:jordan@antellion.com"
              className="underline underline-offset-2 hover:text-gray-700"
            >
              jordan@antellion.com
            </a>{" "}
            if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const findings = engagement.findings.map((f) => ({
    ...f,
    status: f.status as "DRAFT" | "APPROVED" | "REJECTED",
    evidenceScanResultIds: f.evidenceScanResultIds as string[],
    evidenceCitations: f.evidenceCitations as Array<{ domain: string; count: number }> | null,
    auditEntry: f.auditEntries[0] ?? null,
  })) satisfies FindingRow[];

  const latestScan = engagement.scanRuns[0];
  const scanMeta = latestScan?.metadata as Record<string, unknown> | null;
  const modelList = Array.isArray(scanMeta?.models)
    ? (scanMeta.models as string[])
    : ["ChatGPT", "Claude", "Gemini", "Perplexity"];

  // Build audit appendix
  const auditFindingRecords: Array<FindingRecord & { index: number; approvedById: string | null; approvedAt: Date | null }> =
    findings.map((f) => ({
      id: f.id,
      index: f.index,
      namedIssue: f.namedIssue,
      evidenceScanResultIds: f.evidenceScanResultIds,
      actionableCategory: f.actionableCategory,
      status: f.status,
      approvedById: f.approvedById,
      approvedAt: f.approvedAt,
    }));
  const auditAppendix = buildAuditAppendix(auditFindingRecords);

  const personaLabels = engagement.personas.map((ep) =>
    ep.labelOverride ?? ep.persona.label,
  );

  const scanDate = latestScan?.completedAt ?? engagement.updatedAt;
  const totalResponses = latestScan?.resultCount ?? 0;

  // Compute per-stage finding counts
  const stageFindings: Record<string, FindingRow[]> = {};
  for (const stage of ["DISCOVERY", "CONSIDERATION", "EVALUATION", "COMMITMENT"]) {
    stageFindings[stage] = findings.filter((f) => f.stage === stage);
  }
  const noStageFindings = findings.filter((f) => !f.stage);

  // Compute citation domain frequency across all finding evidence
  const citationCounts = new Map<string, number>();
  for (const f of findings) {
    for (const c of f.evidenceCitations ?? []) {
      citationCounts.set(c.domain, (citationCounts.get(c.domain) ?? 0) + c.count);
    }
  }
  const topCitations = Array.from(citationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { break-before: page; }
          .avoid-break { break-inside: avoid; }
          body { font-size: 11pt; }
          a { color: inherit; text-decoration: none; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-6 py-12 bg-white print:px-0 print:py-0">

        {/* ── Cover ──────────────────────────────────────────── */}
        <div className="mb-16 print:mb-8">
          <div className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-6">
            Antellion — AI Visibility Diagnostic
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-3xl">
            {engagement.client.name}
          </h1>
          <p className="text-lg text-gray-600 mb-1">
            {engagement.jobCategory.name} — Employer AI Visibility Assessment
          </p>
          <p className="text-sm text-gray-400">
            Scan completed{" "}
            {scanDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4">
            {[
              { label: "Queries", value: "40" },
              { label: "AI Models", value: "4" },
              { label: "Personas", value: String(engagement.personas.length) },
              { label: "Responses Captured", value: String(totalResponses) },
            ].map((stat) => (
              <div key={stat.label} className="border border-gray-200 rounded-lg p-4 text-center print:rounded-none print:border-gray-300">
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Executive Summary ───────────────────────────────── */}
        <section className="mb-12 avoid-break">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Executive Summary
          </h2>
          <p className="text-gray-700 mb-3">
            This AI Visibility Diagnostic assesses how{" "}
            <strong>{engagement.client.name}</strong> appears across the four
            leading AI systems candidates use to research employers — ChatGPT,
            Claude, Gemini, and Perplexity — for{" "}
            <strong>{engagement.jobCategory.name}</strong> candidates.
          </p>
          <p className="text-gray-700 mb-3">
            The assessment covers {engagement.personas.length} candidate
            personas ({personaLabels.join(", ")}), across 40 candidate-intent
            queries mapped to the four hiring journey stages (Discovery,
            Consideration, Evaluation, Commitment). A total of{" "}
            {totalResponses > 0 ? totalResponses.toLocaleString() : "up to 480"}{" "}
            AI responses were captured and scored.
          </p>
          <p className="text-gray-700">
            The Diagnostic surfaced{" "}
            <strong>{findings.length} material finding{findings.length !== 1 ? "s" : ""}</strong>{" "}
            with specific named issues, data evidence, and actionable remediation
            categories. Each finding is enumerated in the Finding Audit Appendix
            (Section 9) with a deterministic 3-criteria check that substantiates
            the Antellion delivery guarantee.
          </p>
        </section>

        {/* ── Methodology ─────────────────────────────────────── */}
        <section className="mb-12 avoid-break page-break">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Methodology and Scope
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  ["AI Models", modelList.join(", ")],
                  ["Candidate Personas", personaLabels.join("; ")],
                  ["Queries", "40 (10 per journey stage)"],
                  ["Journey Stages", "Discovery, Consideration, Evaluation, Commitment"],
                  [
                    "Competitors Benchmarked",
                    engagement.client.competitors.map((c) => c.name).join(", ") || "N/A",
                  ],
                  ["Conversational Depth", "Single-turn (no follow-up probing)"],
                  ["Total Responses", totalResponses > 0 ? totalResponses.toLocaleString() : "Up to 480"],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-700 w-48">{label}</td>
                    <td className="py-2 text-gray-600">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Each query was run independently across all AI models with a neutral
            system prompt. Responses were scored on visibility (did the company
            appear), sentiment, co-mention rate (which competitors appeared
            alongside), and citation sources (which platforms AI drew from).
          </p>
        </section>

        {/* ── Per-stage summaries ──────────────────────────────── */}
        <section className="mb-12 page-break">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Per-Stage Finding Summaries
          </h2>
          {(["DISCOVERY", "CONSIDERATION", "EVALUATION", "COMMITMENT"] as const).map(
            (stage) => {
              const stageRows = stageFindings[stage] ?? [];
              return (
                <div key={stage} className="mb-6 avoid-break">
                  <h3 className="text-base font-semibold text-gray-800 mb-2">
                    {STAGE_LABELS[stage]} Stage
                  </h3>
                  {stageRows.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No findings flagged at this stage.</p>
                  ) : (
                    <ul className="space-y-1">
                      {stageRows.map((f) => (
                        <li key={f.id} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-gray-400 shrink-0">#{f.index}</span>
                          <span>{f.namedIssue}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            },
          )}
          {noStageFindings.length > 0 && (
            <div className="mb-6 avoid-break">
              <h3 className="text-base font-semibold text-gray-800 mb-2">
                Cross-Stage Findings
              </h3>
              <ul className="space-y-1">
                {noStageFindings.map((f) => (
                  <li key={f.id} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-gray-400 shrink-0">#{f.index}</span>
                    <span>{f.namedIssue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Citation Source Inventory ────────────────────────── */}
        {topCitations.length > 0 && (
          <section className="mb-12 avoid-break">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
              Citation Source Inventory
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Platforms AI models drew from across finding evidence. Higher citation
              frequency indicates greater platform influence on the narrative.
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left font-medium text-gray-700">Domain</th>
                  <th className="py-2 text-right font-medium text-gray-700">Citation Count</th>
                </tr>
              </thead>
              <tbody>
                {topCitations.map(([domain, count]) => (
                  <tr key={domain} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{domain}</td>
                    <td className="py-2 text-right text-gray-500">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ── Findings List ────────────────────────────────────── */}
        <section className="mb-12 page-break">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Findings ({findings.length})
          </h2>
          {findings.length === 0 && (
            <p className="text-sm text-gray-400 italic">No findings have been approved yet.</p>
          )}
          <div className="space-y-8">
            {findings.map((finding) => (
              <div key={finding.id} className="avoid-break">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-sm font-bold text-gray-400 shrink-0 mt-0.5">
                    #{finding.index}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">
                      {finding.namedIssue}
                    </h3>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="inline-block text-xs font-medium bg-gray-100 text-gray-600 rounded px-2 py-0.5">
                        {CATEGORY_LABELS[finding.actionableCategory] ?? finding.actionableCategory}
                      </span>
                      {finding.stage && (
                        <span className="inline-block text-xs bg-blue-50 text-blue-700 rounded px-2 py-0.5">
                          {STAGE_LABELS[finding.stage] ?? finding.stage}
                        </span>
                      )}
                      {finding.modelName && (
                        <span className="inline-block text-xs bg-purple-50 text-purple-700 rounded px-2 py-0.5">
                          {finding.modelName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {finding.narrative && (
                  <div className="ml-8 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {finding.narrative}
                  </div>
                )}
                {(finding.evidenceCitations ?? []).length > 0 && (
                  <div className="ml-8 mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Citation sources:</p>
                    <div className="flex flex-wrap gap-1">
                      {(finding.evidenceCitations ?? []).map((c) => (
                        <span
                          key={c.domain}
                          className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-600"
                        >
                          {c.domain} ({c.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Finding Audit Appendix ───────────────────────────── */}
        <section className="mb-12 page-break">
          <h2 className="text-xl font-bold text-gray-900 mb-2 border-b border-gray-200 pb-2">
            Finding Audit Appendix
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Each finding is enumerated below with a deterministic 3-criteria check.
            This appendix substantiates the Antellion delivery guarantee: a finding is
            material if it has (1) a specific named issue, (2) at least one data
            evidence record, and (3) an actionable remediation category.
          </p>
          <p className="text-sm font-semibold text-gray-700 mb-4">
            Total material findings: {auditAppendix.length} of {findings.length} approved
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="py-2 px-2 text-left font-semibold text-gray-600">#</th>
                  <th className="py-2 px-2 text-left font-semibold text-gray-600">Named Issue</th>
                  <th className="py-2 px-2 text-center font-semibold text-gray-600">Named Issue</th>
                  <th className="py-2 px-2 text-center font-semibold text-gray-600">Evidence</th>
                  <th className="py-2 px-2 text-center font-semibold text-gray-600">Actionable</th>
                  <th className="py-2 px-2 text-center font-semibold text-gray-600">Material</th>
                </tr>
              </thead>
              <tbody>
                {auditAppendix.map((entry) => (
                  <tr key={entry.findingId} className="border-b border-gray-100">
                    <td className="py-2 px-2 text-gray-500">{entry.index}</td>
                    <td className="py-2 px-2 text-gray-700 max-w-xs">{entry.namedIssue.slice(0, 100)}{entry.namedIssue.length > 100 ? "…" : ""}</td>
                    <td className="py-2 px-2 text-center">{entry.hasNamedIssue ? "Y" : "N"}</td>
                    <td className="py-2 px-2 text-center">{entry.hasEvidence ? `Y (${entry.evidenceCount})` : "N"}</td>
                    <td className="py-2 px-2 text-center">{entry.hasActionableCategory ? "Y" : "N"}</td>
                    <td className="py-2 px-2 text-center font-semibold text-green-700">{entry.isMaterial ? "Y" : "N"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="border-t border-gray-200 pt-6 mt-12 text-xs text-gray-400">
          <p>
            Prepared by Hire Better Talent LLC, d/b/a Antellion. This report is
            confidential and intended solely for the use of the named client.
            For questions contact{" "}
            <a href="mailto:jordan@antellion.com" className="underline">
              jordan@antellion.com
            </a>
            .
          </p>
          <p className="mt-1">
            Antellion AI Visibility Diagnostic — Delivered{" "}
            {scanDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </footer>
      </div>
    </>
  );
}
