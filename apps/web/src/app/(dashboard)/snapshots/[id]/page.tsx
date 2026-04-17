import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@antellion/db";
import type { SnapshotSummary, SnapshotInterpretation } from "@antellion/core";
import { PageHeader } from "@/components/page-header";
import { ScanProgressBar } from "@/components/ScanProgressBar";
import { Card, CardHeader, CardBody, Badge } from "@antellion/ui";
import { getOrganizationId } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { CopyProspectLinkButton } from "./copy-prospect-link-button";
import { RawResultsSection } from "./raw-results-section";
import { CollapsibleSection } from "./collapsible-section";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Types ────────────────────────────────────────────────────

interface SnapshotMetadata {
  snapshot?: boolean;
  prospectName?: string;
  roleTitle?: string;
  industry?: string;
  competitors?: string[];
  snapshotSummary?: SnapshotSummary;
}

interface ScanResultRow {
  id: string;
  queryId: string;
  response: string;
  mentioned: boolean;
  visibilityScore: number | null;
  sentimentScore: number | null;
  citations: { domain: string; url: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────

function parseMeta(metadata: unknown): SnapshotMetadata {
  if (!metadata || typeof metadata !== "object") return {};
  return metadata as SnapshotMetadata;
}

// ─── Finding strength badge ──────────────────────────────────

function FindingStrengthBadge({
  strength,
}: {
  strength: "strong" | "moderate" | "weak";
}) {
  const map: Record<string, { variant: "success" | "warning" | "danger"; label: string }> = {
    strong: { variant: "success", label: "Strong finding" },
    moderate: { variant: "warning", label: "Moderate finding" },
    weak: { variant: "danger", label: "Weak finding" },
  };
  const { variant, label } = map[strength] ?? { variant: "default" as const, label: strength };
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Category border color ──────────────────────────────────

function categoryBorderClass(
  category: SnapshotSummary["primaryHook"]["category"],
): string {
  switch (category) {
    case "discovery_absence":
      return "border-l-4 border-l-red-500";
    case "competitor_contrast":
      return "border-l-4 border-l-orange-500";
    case "reputation":
      return "border-l-4 border-l-yellow-500";
    case "citation_gap":
      return "border-l-4 border-l-blue-500";
    default:
      return "border-l-4 border-l-gray-300";
  }
}

// ─── Snapshot header ─────────────────────────────────────────

function SnapshotHeader({
  prospectName,
  industry,
  roleTitle,
  date,
  queryCount,
  scanRunId,
}: {
  prospectName: string;
  industry: string;
  roleTitle: string;
  date: Date;
  queryCount: number;
  scanRunId?: string;
}) {
  return (
    <div>
      <PageHeader
        title={`Snapshot: ${prospectName}`}
        description={
          <span className="flex items-center gap-2 flex-wrap">
            <span>{industry}</span>
            <span className="text-gray-300">|</span>
            <span>{roleTitle}</span>
            <span className="text-gray-300">|</span>
            <span>{formatDate(date)}</span>
            <span className="text-gray-300">|</span>
            <span>{queryCount} queries</span>
          </span>
        }
        action={
          <div className="flex items-center gap-3">
            {scanRunId && <CopyProspectLinkButton scanRunId={scanRunId} />}
            {scanRunId && (
              <Link
                href={`/snapshots/${scanRunId}/action-plan`}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Action plan
              </Link>
            )}
            <PrintButton />
            <Link
              href="/snapshots"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              All snapshots
            </Link>
          </div>
        }
      />
    </div>
  );
}

// ─── Hero finding ────────────────────────────────────────────
// Full-width, dominant. The first thing the operator sees.
// One sentence problem, who is beating them, why it matters.

function HeroFinding({
  hook,
  summary,
  prospectName,
}: {
  hook: SnapshotSummary["primaryHook"];
  summary: SnapshotSummary;
  prospectName: string;
}) {
  const borderClass = categoryBorderClass(hook.category);
  const tier = summary.visibilityTier ?? "low";

  const topComp = summary.discovery.competitorRanking[0];
  const prospectPct = Math.round(summary.discoveryMentionRate * 100);
  const competitorPct = topComp ? Math.round(topComp.mentionRate * 100) : 0;

  // High visibility: prospect is the anchor (they're winning)
  // Low/moderate visibility: competitor is the anchor (they're losing)
  const isHighVis = tier === "high";

  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${borderClass}`}>
      {/* Top bar */}
      <div className="flex items-center justify-end px-6 py-3 border-b border-gray-100">
        <FindingStrengthBadge strength={hook.findingStrength} />
      </div>

      {/* Headline */}
      <div className="px-6 pt-5 pb-2">
        <h2 className="text-xl font-bold leading-snug text-gray-900 sm:text-2xl">
          {hook.headline}
        </h2>
      </div>

      {/* Evidence */}
      <div className="px-6 pb-4">
        <p className="text-sm leading-relaxed text-gray-600">
          {hook.evidence}
        </p>
      </div>

      {/* Comparison bar — direction flips based on visibility tier */}
      {topComp && (
        <div className="mx-6 mb-4 rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            {isHighVis ? (
              <>
                <span className="text-gray-600">
                  <span className="font-semibold text-green-700">{prospectName}</span>
                  {" "}leads at {prospectPct}% discovery rate
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  Nearest competitor: <span className="font-semibold text-gray-900">{topComp.name}</span>
                  {" "}at {competitorPct}%
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">{topComp.name}</span>
                  {" "}appears in {competitorPct}% of discovery queries
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">{prospectName}</span>
                  {" "}appears in {prospectPct}%
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quotable text */}
      {hook.quotableText && (
        <div className="px-6 pb-5">
          <blockquote className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm italic leading-relaxed text-gray-700">
              &ldquo;{hook.quotableText}&rdquo;
            </p>
            <p className="mt-1 text-xs text-gray-400">AI response excerpt</p>
          </blockquote>
        </div>
      )}

      {/* Weak finding warning */}
      {hook.findingStrength === "weak" && (
        <div className="mx-6 mb-5 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Limited gaps found.</span> This
            prospect may not be a strong cold DM candidate. Consider skipping
            or using a softer outreach approach.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Supporting evidence strip ──────────────────────────────
// Condensed: discovery scorecard + top gap queries in one compact section.

function SupportingEvidence({
  summary,
  prospectName,
}: {
  summary: SnapshotSummary;
  prospectName: string;
}) {
  const { discovery } = summary;
  const tier = summary.visibilityTier ?? "low";
  const isHighVis = tier === "high";

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Supporting Evidence
        </h3>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Discovery scorecard row */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Discovery Rate
            </span>
            <span className="text-sm font-semibold tabular-nums text-gray-900">
              {discovery.prospectMentioned}/{discovery.queriesRun} queries
            </span>
          </div>

          {/* Progress bars */}
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-gray-700">{prospectName}</span>
                <span className="tabular-nums text-gray-500">
                  {Math.round(discovery.mentionRate * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-brand-500"
                  style={{ width: `${Math.round(discovery.mentionRate * 100)}%` }}
                />
              </div>
            </div>

            {discovery.competitorRanking.slice(0, 2).map((comp) => (
              <div key={comp.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">{comp.name}</span>
                  <span className="tabular-nums text-gray-500">
                    {Math.round(comp.mentionRate * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-gray-400"
                    style={{ width: `${Math.round(comp.mentionRate * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top gap queries — styled differently based on visibility tier */}
        {discovery.topGapQueries.length > 0 && (
          <div className="px-6 py-4">
            <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${
              isHighVis ? "text-gray-500" : "text-red-600"
            }`}>
              {isHighVis ? "Queries Where Competitors Appeared Instead" : "Top Gap Queries"}
            </p>
            <div className="space-y-2">
              {discovery.topGapQueries.slice(0, 3).map((gap, idx) => (
                <div
                  key={idx}
                  className={`rounded-md border px-3 py-2 ${
                    isHighVis
                      ? "border-gray-200 bg-gray-50"
                      : "border-red-100 bg-red-50"
                  }`}
                >
                  <p className="text-xs text-gray-700">
                    &ldquo;{gap.queryText}&rdquo;
                  </p>
                  {gap.competitorsMentioned.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      AI mentioned: {gap.competitorsMentioned.join(", ")}
                      {!gap.prospectMentioned && (
                        <span className={`font-medium ${
                          isHighVis ? "text-gray-600" : "text-red-600"
                        }`}>
                          {" "}-- not {prospectName}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Interpretation section (above the fold) ─────────────────
// Analyst-prepared: primary takeaway, 1 strength, 2 opportunities, bridge.

function InterpretationSection({
  interpretation,
}: {
  interpretation: SnapshotInterpretation;
}) {
  const { primaryTakeaway, strength, opportunities, bridge } = interpretation;

  return (
    <div className="space-y-4">
      {/* Primary takeaway */}
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Primary Takeaway
        </p>
        <p className="text-lg font-medium leading-relaxed text-gray-900">
          {primaryTakeaway}
        </p>
      </div>

      {/* Interpretation cards: strength wider, opportunities stacked beside it */}
      <div className="grid gap-4 sm:grid-cols-5">
        {/* Strength card — spans 3 of 5 columns for visual prominence */}
        <div className="sm:col-span-3 rounded-lg border border-gray-200 bg-white border-l-4 border-l-green-500">
          <div className="px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-1">
              {strength.label}
            </p>
            <p className="text-sm font-semibold text-gray-900 mb-2">
              {strength.title}
            </p>
            <p className="text-sm leading-relaxed text-gray-600">
              {strength.detail}
            </p>
          </div>
        </div>

        {/* Opportunity cards — stacked in remaining 2 columns */}
        <div className="sm:col-span-2 flex flex-col gap-4">
          {/* Opportunity 1 card */}
          <div className="flex-1 rounded-lg border border-gray-200 bg-white border-l-4 border-l-amber-500">
            <div className="px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                {opportunities[0].label}
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {opportunities[0].title}
              </p>
              <p className="text-xs leading-relaxed text-gray-600">
                {opportunities[0].detail}
              </p>
            </div>
          </div>

          {/* Opportunity 2 card */}
          <div className="flex-1 rounded-lg border border-gray-200 bg-white border-l-4 border-l-red-500">
            <div className="px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-1">
                {opportunities[1].label}
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {opportunities[1].title}
              </p>
              <p className="text-xs leading-relaxed text-gray-600">
                {opportunities[1].detail}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bridge paragraph */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-6 py-4">
        <p className="text-sm leading-relaxed text-gray-600">
          {bridge}
        </p>
      </div>
    </div>
  );
}

// ─── Competitor contrast detail (collapsible) ────────────────

function CompetitorContrastDetail({
  contrast,
}: {
  contrast: SnapshotSummary["competitorContrast"];
}) {
  if (contrast.competitorSummaries.length === 0) return null;

  return (
    <div className="space-y-3">
      {contrast.competitorSummaries.map((cs) => (
        <div key={cs.competitorName} className="rounded-md border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-900">vs {cs.competitorName}</span>
            <span className="text-xs text-gray-500">
              {cs.competitorFavoredCount} of {cs.queriesRun} favored competitor
            </span>
          </div>
          {cs.worstExcerpt && (
            <blockquote className="rounded border border-orange-100 bg-orange-50 px-3 py-2 mb-2">
              <p className="text-xs italic text-gray-700 leading-relaxed">
                &ldquo;{cs.worstExcerpt}&rdquo;
              </p>
            </blockquote>
          )}
          {cs.worstDimension && (
            <p className="text-xs text-gray-400">
              Weakest query: &ldquo;{cs.worstDimension}&rdquo;
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Reputation detail (collapsible) ─────────────────────────

function ReputationDetail({
  reputation,
}: {
  reputation: SnapshotSummary["reputation"];
}) {
  const sentimentLabel =
    reputation.avgSentiment > 0.15
      ? "Positive"
      : reputation.avgSentiment < -0.15
        ? "Negative"
        : "Neutral";

  const sentimentVariant: "success" | "danger" | "default" =
    reputation.avgSentiment > 0.15
      ? "success"
      : reputation.avgSentiment < -0.15
        ? "danger"
        : "default";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Avg sentiment:</span>
        <span className="font-medium tabular-nums text-gray-900">
          {reputation.avgSentiment > 0 ? "+" : ""}
          {reputation.avgSentiment.toFixed(2)}
        </span>
        <Badge variant={sentimentVariant}>{sentimentLabel}</Badge>
      </div>

      {reputation.worstResponse && (
        <div className="space-y-2">
          {reputation.worstResponse.keyIssue && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">Key issue:</span>{" "}
              {reputation.worstResponse.keyIssue.replace(/_/g, " ")}
            </p>
          )}
          <blockquote className="rounded border border-yellow-100 bg-yellow-50 px-3 py-2">
            <p className="text-xs italic text-gray-700 leading-relaxed">
              &ldquo;{reputation.worstResponse.responseExcerpt}&rdquo;
            </p>
          </blockquote>
        </div>
      )}

      {reputation.recurringThemes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {reputation.recurringThemes.map((theme) => (
            <span
              key={theme}
              className="inline-flex rounded bg-yellow-50 px-2 py-0.5 text-xs text-yellow-700"
            >
              {theme}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Citation gap detail (collapsible) ───────────────────────

function CitationGapDetail({
  citationGap,
  prospectName,
}: {
  citationGap: SnapshotSummary["citationGap"];
  prospectName: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">{prospectName}</span>
          <span className="tabular-nums font-medium text-gray-900">
            {citationGap.prospectOwnedCitations} owned{" "}
            <span className="text-gray-400 font-normal">
              / {citationGap.prospectTotalCitations} total
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Competitors</span>
          <span className="tabular-nums font-medium text-gray-600">
            {citationGap.competitorOwnedCitations} citations
          </span>
        </div>
      </div>

      {citationGap.finding && (
        <p className="text-xs text-gray-600 leading-relaxed">
          {citationGap.finding}
        </p>
      )}

      {citationGap.gapPlatforms.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Missing from:</p>
          <div className="flex flex-wrap gap-1.5">
            {citationGap.gapPlatforms.map((platform) => (
              <span
                key={platform}
                className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default async function SnapshotFindingsPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const scan = await prisma.scanRun.findFirst({
    where: { id, client: { organizationId }, queryDepth: "snapshot" },
    include: {
      client: { select: { id: true, name: true, domain: true } },
      results: {
        select: {
          id: true,
          queryId: true,
          response: true,
          mentioned: true,
          visibilityScore: true,
          sentimentScore: true,
          citations: { select: { domain: true, url: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!scan) notFound();

  const meta = parseMeta(scan.metadata);
  const isRunning =
    scan.status === "RUNNING" || scan.status === "PENDING";
  const isCompleted = scan.status === "COMPLETED";

  const prospectName =
    meta.prospectName ?? scan.client.name;
  const industry = meta.industry ?? "";
  const roleTitle = meta.roleTitle ?? "";
  const summary = meta.snapshotSummary ?? null;

  // ── Running / Pending state ──────────────────────────────
  if (isRunning) {
    return (
      <div className="space-y-6">
        <SnapshotHeader
          prospectName={prospectName}
          industry={industry}
          roleTitle={roleTitle}
          date={scan.createdAt}
          queryCount={scan.queryCount}
          scanRunId={id}
        />

        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm font-medium text-gray-700">
              Scan in progress
            </p>
            <ScanProgressBar
              scanId={id}
              initialResultCount={scan.resultCount}
              queryCount={scan.queryCount}
              polling
            />
            <p className="text-xs text-gray-500">
              Running query {scan.resultCount} of {scan.queryCount}. This page
              will refresh automatically when the scan completes.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ── Completed but summary not yet ready ──────────────────
  if (isCompleted && !summary) {
    return (
      <div className="space-y-6">
        <SnapshotHeader
          prospectName={prospectName}
          industry={industry}
          roleTitle={roleTitle}
          date={scan.createdAt}
          queryCount={scan.queryCount}
          scanRunId={id}
        />

        <Card>
          <CardBody>
            <p className="text-sm text-gray-700">Summary is being computed.</p>
            <p className="mt-1 text-xs text-gray-500">
              This usually takes a few seconds.{" "}
              <Link
                href={`/snapshots/${id}`}
                className="text-brand-600 underline underline-offset-2 hover:text-brand-700"
              >
                Refresh
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ── Failed / Cancelled state ─────────────────────────────
  if (!isCompleted && !isRunning) {
    return (
      <div className="space-y-6">
        <SnapshotHeader
          prospectName={prospectName}
          industry={industry}
          roleTitle={roleTitle}
          date={scan.createdAt}
          queryCount={scan.queryCount}
          scanRunId={id}
        />

        <Card>
          <CardBody>
            <p className="text-sm text-gray-700">
              Scan status:{" "}
              <span className="font-medium">{scan.status}</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              This scan did not complete.{" "}
              <Link
                href="/snapshots/new"
                className="text-brand-600 underline underline-offset-2 hover:text-brand-700"
              >
                Run a new snapshot
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ── Completed with summary ───────────────────────────────
  if (!summary) notFound(); // type narrowing guard

  const results = scan.results as ScanResultRow[];

  return (
    <div className="space-y-6">
      <SnapshotHeader
        prospectName={prospectName}
        industry={industry}
        roleTitle={roleTitle}
        date={scan.createdAt}
        queryCount={scan.queryCount}
        scanRunId={id}
      />

      {/* ═══ ABOVE THE FOLD: Interpretation ═══ */}

      {/* Interpretation layer -- analyst-prepared summary */}
      <InterpretationSection interpretation={summary.interpretation} />

      {/* ═══ BELOW THE FOLD: Collapsible detail sections ═══ */}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Detailed Findings
        </p>

        {/* Primary hook finding (moved from above the fold) */}
        <CollapsibleSection
          title="Primary Finding"
          subtitle={summary.primaryHook.headline.slice(0, 80) + (summary.primaryHook.headline.length > 80 ? "..." : "")}
        >
          <HeroFinding
            hook={summary.primaryHook}
            summary={summary}
            prospectName={prospectName}
          />
        </CollapsibleSection>

        {/* Discovery evidence */}
        <CollapsibleSection
          title="Discovery Evidence"
          subtitle={`${summary.discovery.prospectMentioned}/${summary.discovery.queriesRun} discovery queries mention ${prospectName}`}
        >
          <SupportingEvidence summary={summary} prospectName={prospectName} />
        </CollapsibleSection>

        {/* Competitor contrast */}
        {summary.competitorContrast.competitorSummaries.length > 0 && (
          <CollapsibleSection
            title="Competitor Contrast"
            subtitle={`How AI frames direct comparisons across ${summary.competitorContrast.queriesRun} queries`}
          >
            <CompetitorContrastDetail contrast={summary.competitorContrast} />
          </CollapsibleSection>
        )}

        {/* Reputation */}
        <CollapsibleSection
          title="Reputation Analysis"
          subtitle="AI framing when candidates research directly"
        >
          <ReputationDetail reputation={summary.reputation} />
        </CollapsibleSection>

        {/* Citation gap */}
        <CollapsibleSection
          title="Citation Analysis"
          subtitle="Owned citations vs competitor citations"
        >
          <CitationGapDetail
            citationGap={summary.citationGap}
            prospectName={prospectName}
          />
        </CollapsibleSection>

        {/* Discovery theme breakdown */}
        {summary.discovery.themeBreakdown.length > 0 && (
          <CollapsibleSection
            title="Discovery by Theme"
            subtitle="Mention rate broken down by candidate intent theme"
          >
            <div className="space-y-2">
              {summary.discovery.themeBreakdown.map((theme) => (
                <div key={theme.theme} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">{theme.theme}</span>
                  <span className="text-sm tabular-nums text-gray-500">
                    {theme.prospectMentioned}/{theme.queriesRun}
                    <span className="ml-1 text-xs text-gray-400">
                      ({Math.round(theme.mentionRate * 100)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Full gap queries */}
        {summary.discovery.topGapQueries.length > 3 && (
          <CollapsibleSection
            title="All Gap Queries"
            subtitle={`${summary.discovery.topGapQueries.length} queries where competitors outperform`}
          >
            <div className="space-y-2">
              {summary.discovery.topGapQueries.map((gap, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-red-100 bg-red-50 px-3 py-2 space-y-1"
                >
                  <p className="text-xs text-gray-700">
                    <span className="font-medium">Q{idx + 1}:</span>{" "}
                    &ldquo;{gap.queryText}&rdquo;
                  </p>
                  {gap.responseExcerpt && (
                    <p className="text-xs text-gray-600 italic">
                      &ldquo;{gap.responseExcerpt}&rdquo;
                    </p>
                  )}
                  {gap.competitorsMentioned.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Competitors mentioned: {gap.competitorsMentioned.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Raw results -- full 100-query breakdown */}
        <RawResultsSection results={results} />
      </div>
    </div>
  );
}
