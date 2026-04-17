import type { PublicSnapshotSummary } from "@antellion/core";

// ─── Types ────────────────────────────────────────────────────

interface ProspectSnapshotViewProps {
  summary: PublicSnapshotSummary;
  prospectName: string;
  scanDate: Date;
  queryCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatScanDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Cover header ─────────────────────────────────────────────

function CoverHeader({
  prospectName,
  scanDate,
  queryCount,
}: {
  prospectName: string;
  scanDate: Date;
  queryCount: number;
}) {
  return (
    <div className="border-b border-gray-100 pb-8 mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-2">
            AI Visibility Snapshot
          </p>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            {prospectName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>{queryCount} queries tested</span>
            <span aria-hidden="true">&middot;</span>
            <span>Assessed {formatScanDate(scanDate)}</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <img
            src="/logo-horizontal-dark.svg"
            alt="Antellion"
            className="h-8 opacity-70"
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = "none";
              const sibling = img.nextElementSibling as HTMLElement | null;
              if (sibling) sibling.style.display = "block";
            }}
          />
          <span
            className="hidden text-sm font-semibold text-gray-400"
            aria-hidden="true"
          >
            Antellion
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Executive framing ────────────────────────────────────────

function ExecutiveFraming({
  summary,
  prospectName,
}: {
  summary: PublicSnapshotSummary;
  prospectName: string;
}) {
  const { visibilityTier } = summary;
  const mentionPct = pct(summary.discoveryMentionRate);
  const topComp = summary.discovery.competitorRanking.at(0);

  let framing: string;

  if (visibilityTier === "high") {
    framing = `${prospectName} has measurable presence in AI-generated employer responses — appearing in ${mentionPct} of candidate-intent queries we tested. That said, the assessment identifies areas where competitors are named instead, and where content gaps create risk in direct comparison queries.`;
  } else if (visibilityTier === "moderate") {
    framing = `${prospectName} appears in ${mentionPct} of the AI employer queries we tested. The assessment shows a mixed picture: some visibility, but meaningful gaps where competitors are named in your place — particularly in discovery queries candidates use to find employers in your category.`;
  } else {
    const compNote =
      topComp
        ? ` By comparison, ${topComp.name} appeared in ${pct(topComp.mentionRate)} of the same queries.`
        : "";
    framing = `${prospectName} appeared in ${mentionPct} of the AI employer queries we tested — a rate that puts the company largely absent from the candidate discovery process as AI becomes a primary research tool.${compNote} The assessment maps where this gap is most acute and which surfaces are driving competitor visibility.`;
  }

  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Assessment Summary
      </h2>
      <p className="text-base leading-relaxed text-gray-700">{framing}</p>
    </div>
  );
}

// ─── Discovery scoreboard ─────────────────────────────────────

function DiscoveryScoreboard({
  summary,
  prospectName,
}: {
  summary: PublicSnapshotSummary;
  prospectName: string;
}) {
  const { discovery } = summary;
  const allEntries = [
    { name: prospectName, mentionRate: discovery.mentionRate, isProspect: true },
    ...discovery.competitorRanking.map((c) => ({
      name: c.name,
      mentionRate: c.mentionRate,
      isProspect: false,
    })),
  ].sort((a, b) => b.mentionRate - a.mentionRate);

  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Discovery Ranking
      </h2>
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                Company
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">
                Mention rate
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">
                Queries
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allEntries.map((entry, idx) => (
              <tr
                key={entry.name}
                className={entry.isProspect ? "bg-blue-50/50" : "bg-white"}
              >
                <td className="px-4 py-3 font-medium">
                  <span className={entry.isProspect ? "text-blue-800" : "text-gray-700"}>
                    {idx + 1}. {entry.name}
                  </span>
                  {entry.isProspect && (
                    <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                      you
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`tabular-nums font-semibold ${entry.isProspect ? "text-blue-700" : "text-gray-600"}`}>
                    {pct(entry.mentionRate)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-400 tabular-nums text-xs hidden sm:table-cell">
                  {Math.round(entry.mentionRate * discovery.queriesRun)}/{discovery.queriesRun}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-xs text-gray-400">
        Across {discovery.queriesRun} candidate discovery queries
      </p>
    </div>
  );
}

// ─── Top 5 gap queries ────────────────────────────────────────

function GapQueriesSection({
  gaps,
}: {
  gaps: PublicSnapshotSummary["discovery"]["topGapQueries"];
}) {
  if (gaps.length === 0) return null;

  const topFive = gaps.slice(0, 5);

  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Queries Where Competitors Appeared Instead
      </h2>
      <div className="space-y-2">
        {topFive.map((gap, idx) => (
          <div
            key={idx}
            className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3"
          >
            <p className="text-sm text-gray-800">
              &ldquo;{gap.queryText}&rdquo;
            </p>
            {gap.competitorsMentioned.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                AI named:{" "}
                <span className="font-medium text-gray-700">
                  {gap.competitorsMentioned.join(", ")}
                </span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Competitor contrast table ────────────────────────────────

function CompetitorContrastSection({
  contrast,
}: {
  contrast: PublicSnapshotSummary["competitorContrast"];
}) {
  if (contrast.competitorSummaries.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Head-to-Head Comparison
      </h2>
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                Competitor
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">
                Queries
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">
                AI favored them
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {contrast.competitorSummaries.map((cs) => (
              <tr key={cs.competitorName}>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {cs.competitorName}
                </td>
                <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                  {cs.queriesRun}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={cs.favorRate > 0.5 ? "font-semibold text-orange-700" : "text-gray-600"}>
                    {cs.competitorFavoredCount}/{cs.queriesRun}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {contrast.worstComparison && (
        <div className="mt-3 rounded-md border border-orange-100 bg-orange-50 px-4 py-3">
          <p className="text-xs font-semibold text-orange-700 mb-1">Sharpest contrast query</p>
          <p className="text-xs text-gray-600 italic leading-relaxed">
            &ldquo;{contrast.worstComparison.responseExcerpt}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Reputation section ───────────────────────────────────────

function ReputationSection({
  reputation,
}: {
  reputation: PublicSnapshotSummary["reputation"];
}) {
  const consistencyLabel: Record<string, string> = {
    consistent: "Consistent",
    varied: "Varied",
    contradictory: "Contradictory",
  };

  const consistencyColor: Record<string, string> = {
    consistent: "text-green-700",
    varied: "text-yellow-700",
    contradictory: "text-red-700",
  };

  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Reputation Signal
      </h2>
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Narrative consistency: </span>
            <span className={`font-semibold ${consistencyColor[reputation.narrativeConsistency] ?? "text-gray-700"}`}>
              {consistencyLabel[reputation.narrativeConsistency] ?? reputation.narrativeConsistency}
            </span>
          </div>
        </div>

        {reputation.recurringThemes.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Recurring themes in AI responses:</p>
            <div className="flex flex-wrap gap-1.5">
              {reputation.recurringThemes.map((theme) => (
                <span
                  key={theme}
                  className="inline-flex rounded bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-600"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {reputation.worstResponse && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Representative AI response excerpt:</p>
            <blockquote className="rounded border border-gray-200 bg-white px-3 py-2.5">
              <p className="text-sm italic leading-relaxed text-gray-700">
                &ldquo;{reputation.worstResponse.responseExcerpt}&rdquo;
              </p>
            </blockquote>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Citation gap section ─────────────────────────────────────

function CitationGapSection({
  citationGap,
  prospectName,
}: {
  citationGap: PublicSnapshotSummary["citationGap"];
  prospectName: string;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Citation Coverage
      </h2>
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Your owned citations</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {citationGap.prospectOwnedCitations}
              <span className="text-sm font-normal text-gray-400">
                /{citationGap.prospectTotalCitations}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Competitor citations</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {citationGap.competitorOwnedCitations}
            </p>
          </div>
        </div>

        {citationGap.finding && (
          <p className="text-sm text-gray-600 leading-relaxed">
            {citationGap.finding}
          </p>
        )}

        {citationGap.gapPlatforms.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Platforms where competitors are cited but you are not:</p>
            <div className="flex flex-wrap gap-1.5">
              {citationGap.gapPlatforms.map((platform) => (
                <span
                  key={platform}
                  className="inline-flex rounded bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-600"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CTA ──────────────────────────────────────────────────────

function ProspectCTA({ prospectName }: { prospectName: string }) {
  const subject = encodeURIComponent(`Full Assessment — ${prospectName}`);

  return (
    <div className="my-8 rounded-lg border border-gray-200 bg-gray-50 px-6 py-6 text-center">
      <h2 className="text-base font-semibold text-gray-900 mb-2">
        See the full assessment
      </h2>
      <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
        The full assessment covers all 100 queries, includes prioritized remediation recommendations, and maps the complete competitive gap across every theme.
      </p>
      <a
        href={`mailto:jordan@antellion.com?subject=${subject}`}
        className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
      >
        Request full assessment
      </a>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────

function ProspectFooter() {
  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <p className="text-xs text-gray-400 text-center">
        Prepared by Antellion. Questions:{" "}
        <a href="mailto:jordan@antellion.com" className="underline underline-offset-2 hover:text-gray-600">
          jordan@antellion.com
        </a>
      </p>
    </div>
  );
}

// ─── Root view ────────────────────────────────────────────────

export function ProspectSnapshotView({
  summary,
  prospectName,
  scanDate,
  queryCount,
}: ProspectSnapshotViewProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8 sm:py-14">
        <CoverHeader
          prospectName={prospectName}
          scanDate={scanDate}
          queryCount={queryCount}
        />

        <ExecutiveFraming summary={summary} prospectName={prospectName} />

        <DiscoveryScoreboard summary={summary} prospectName={prospectName} />

        <GapQueriesSection gaps={summary.discovery.topGapQueries} />

        <CompetitorContrastSection contrast={summary.competitorContrast} />

        <ReputationSection reputation={summary.reputation} />

        <CitationGapSection
          citationGap={summary.citationGap}
          prospectName={prospectName}
        />

        <ProspectCTA prospectName={prospectName} />

        <ProspectFooter />
      </div>
    </div>
  );
}
