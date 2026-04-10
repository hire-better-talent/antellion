/**
 * CitationPlaybook
 *
 * Replaces the flat Citation Ecosystem gap table with an actionable
 * "Monday morning" remediation playbook. Renders:
 *   1. Priority-ranked playbook cards for citation gaps (sorted by stage impact)
 *   2. Defensible advantages section for platforms where client IS cited
 *
 * Each gap card shows: rank, platform name, source type badge, control level
 * badge with rationale, stage badge, multi-step actions with owners, and
 * a "why it matters" explanation.
 *
 * Server component — no interactivity.
 */

import {
  classifySource,
  sourceTypeLabel,
  controlLevelColor,
  getRemediation,
  BRAND_TOKENS,
} from "@antellion/core";
import type {
  SourceClassification,
  CitationRemediation,
} from "@antellion/core";
import type { JourneyStageData } from "./journey-types";

// ─── Types ──────────────────────────────────────────────────

interface CitationPlaybookProps {
  stages: JourneyStageData[];
  printMode?: boolean;
}

interface EnrichedGap {
  domain: string;
  classification: SourceClassification;
  remediation: CitationRemediation;
  affectedStages: string[];
  /** Numeric sort key: lower = higher priority (Evaluation first, then Consideration, then Discovery, then Commitment) */
  stagePriority: number;
}

// ─── Stage priority ordering ────────────────────────────────
// Evaluation first (candidates actively comparing offers), then
// Consideration (narrowing list), then Discovery (awareness), then Commitment.

const STAGE_PRIORITY: Record<string, number> = {
  EVALUATION: 1,
  CONSIDERATION: 2,
  DISCOVERY: 3,
  COMMITMENT: 4,
};

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  CONSIDERATION: "Consideration",
  EVALUATION: "Evaluation",
  COMMITMENT: "Commitment",
};

// ─── Badge components ───────────────────────────────────────

function SourceTypeBadge({ sourceType, printMode }: { sourceType: string; printMode: boolean }) {
  const label = sourceTypeLabel(sourceType as Parameters<typeof sourceTypeLabel>[0]) ?? sourceType;
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={
        printMode
          ? { border: "1px solid #D1D5DB", color: "#374151" }
          : {
              backgroundColor: `${BRAND_TOKENS.accentPrimary}14`,
              color: BRAND_TOKENS.accentPrimary,
              border: `1px solid ${BRAND_TOKENS.accentPrimary}33`,
            }
      }
    >
      {label}
    </span>
  );
}

function ControlLevelBadge({ level, printMode }: { level: string; printMode: boolean }) {
  const colors = controlLevelColor(level as Parameters<typeof controlLevelColor>[0]);
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
        printMode
          ? "border border-gray-300 text-gray-700"
          : `${colors.bg} ${colors.text}`
      }`}
    >
      {colors.label}
    </span>
  );
}

function StageBadge({ stage, printMode }: { stage: string; printMode: boolean }) {
  const label = STAGE_LABELS[stage] ?? stage;
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={
        printMode
          ? { border: "1px solid #D1D5DB", color: "#374151" }
          : {
              backgroundColor: `${BRAND_TOKENS.accentPrimary}14`,
              color: BRAND_TOKENS.accentPrimary,
              border: `1px solid ${BRAND_TOKENS.accentPrimary}33`,
            }
      }
    >
      {label}
    </span>
  );
}

// ─── Gap card ───────────────────────────────────────────────

function PlaybookCard({
  gap,
  rank,
  printMode,
}: {
  gap: EnrichedGap;
  rank: number;
  printMode: boolean;
}) {
  const { classification, remediation, affectedStages } = gap;

  return (
    <div
      className="rounded-lg p-5"
      style={{
        border: `1px solid ${BRAND_TOKENS.reportBorder}`,
        backgroundColor: BRAND_TOKENS.reportBg,
      }}
    >
      {/* Header: rank, platform name, badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={
            printMode
              ? { border: `1px solid ${BRAND_TOKENS.reportBorder}`, color: BRAND_TOKENS.reportText }
              : { backgroundColor: BRAND_TOKENS.accentPrimary, color: BRAND_TOKENS.textPrimary }
          }
        >
          {rank}
        </span>
        <span className="text-sm font-semibold" style={{ color: BRAND_TOKENS.reportText }}>
          {classification.platformName}
        </span>
        <SourceTypeBadge sourceType={classification.sourceType} printMode={printMode} />
        <ControlLevelBadge level={classification.controlLevel} printMode={printMode} />
        {affectedStages.map((stage) => (
          <StageBadge key={stage} stage={stage} printMode={printMode} />
        ))}
      </div>

      {/* Control rationale */}
      <p className="text-xs text-gray-500 mb-3 italic">
        {classification.controlRationale}
      </p>

      {/* Why it matters */}
      <div className="mb-3">
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-1"
          style={{ color: BRAND_TOKENS.accentPrimary }}
        >
          Why it matters
        </p>
        <p className="text-sm leading-relaxed text-gray-700">
          {remediation.whyItMatters}
        </p>
      </div>

      {/* Action steps */}
      <div className="mb-3">
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: BRAND_TOKENS.accentPrimary }}
        >
          Action steps
        </p>
        <div className="space-y-2">
          {remediation.steps.map((step, i) => (
            <div
              key={i}
              className="rounded p-3 text-sm"
              style={{
                border: `1px solid ${BRAND_TOKENS.reportBorder}`,
                backgroundColor: printMode ? BRAND_TOKENS.reportBg : BRAND_TOKENS.reportSurface,
              }}
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-xs font-bold text-gray-400 mt-0.5">
                  {i + 1}.
                </span>
                <div className="flex-1">
                  <p className="text-gray-900">{step.action}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>
                      <span className="font-medium text-gray-600">Owner:</span>{" "}
                      {step.owner}
                    </span>
                    <span>
                      <span className="font-medium text-gray-600">Effort:</span>{" "}
                      {step.effort}
                    </span>
                    <span>
                      <span className="font-medium text-gray-600">When:</span>{" "}
                      {step.timeframe}
                    </span>
                  </div>
                  {step.prerequisite && (
                    <p className="mt-1 text-xs text-amber-600">
                      Prerequisite: {step.prerequisite}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expected outcome */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-1"
          style={{ color: BRAND_TOKENS.accentPrimary }}
        >
          Expected outcome
        </p>
        <p className="text-sm leading-relaxed text-gray-700">
          {remediation.expectedOutcome}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────

export function CitationPlaybook({ stages, printMode = false }: CitationPlaybookProps) {
  // Collect gap domains across all stages, tracking which stages each domain affects
  const gapDomainStages: Record<string, Set<string>> = {};
  for (const stage of stages) {
    for (const domain of stage.gapDomains) {
      const normalized = domain.toLowerCase().replace(/^www\./, "");
      if (!gapDomainStages[normalized]) {
        gapDomainStages[normalized] = new Set();
      }
      gapDomainStages[normalized].add(stage.stage);
    }
  }

  // Collect cited domains across all stages
  const allCitedDomains = Array.from(
    new Set(stages.flatMap((s) => s.citedDomains)),
  );

  // Build enriched gap entries
  const gaps: EnrichedGap[] = Object.entries(gapDomainStages).map(
    ([domain, stageSet]) => {
      const classification = classifySource(domain);
      const remediation = getRemediation(domain);
      const affectedStages = Array.from(stageSet);

      // Primary sort: best (lowest number) stage priority among affected stages
      const stagePriority = Math.min(
        ...affectedStages.map((s) => STAGE_PRIORITY[s] ?? 99),
      );

      return {
        domain,
        classification,
        remediation,
        affectedStages,
        stagePriority,
      };
    },
  );

  // Sort: stage priority first (Evaluation first), then control level (high-control
  // gaps are more actionable so they sort higher), then alphabetical
  const CONTROL_PRIORITY: Record<string, number> = { high: 1, medium: 2, low: 3 };
  gaps.sort((a, b) => {
    if (a.stagePriority !== b.stagePriority) return a.stagePriority - b.stagePriority;
    const aCtrl = CONTROL_PRIORITY[a.classification.controlLevel] ?? 99;
    const bCtrl = CONTROL_PRIORITY[b.classification.controlLevel] ?? 99;
    if (aCtrl !== bCtrl) return aCtrl - bCtrl;
    return a.domain.localeCompare(b.domain);
  });

  // Nothing to render if no gaps and no cited domains
  if (gaps.length === 0 && allCitedDomains.length === 0) return null;

  return (
    <div>
      {/* Intro text */}
      <p className="text-sm leading-relaxed text-gray-700 mb-4">
        AI does not invent employer information. It synthesizes answers from
        indexed sources. The platforms below are ones where competitors are cited
        but your company is not. Each gap represents a source that AI models
        reference when candidates make hiring decisions — and where your absence
        directly reduces your visibility.
      </p>

      {/* Priority summary bar */}
      {gaps.length > 0 && (
        <div
          className="mb-5 rounded px-4 py-3 text-sm"
          style={{
            border: `1px solid ${BRAND_TOKENS.reportBorder}`,
            backgroundColor: BRAND_TOKENS.reportSurface,
          }}
        >
          <span className="text-gray-600">
            {gaps.length} citation gap{gaps.length !== 1 ? "s" : ""} identified
          </span>
          {(() => {
            const highControl = gaps.filter((g) => g.classification.controlLevel === "high").length;
            const medControl = gaps.filter((g) => g.classification.controlLevel === "medium").length;
            const lowControl = gaps.filter((g) => g.classification.controlLevel === "low").length;
            return (
              <>
                {highControl > 0 && (
                  <span className="ml-2 inline-flex items-center rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    {highControl} high control
                  </span>
                )}
                {medControl > 0 && (
                  <span className="ml-2 inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {medControl} medium control
                  </span>
                )}
                {lowControl > 0 && (
                  <span className="ml-2 inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                    {lowControl} low control
                  </span>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Playbook cards */}
      {gaps.length > 0 && (
        <div className="space-y-4 mb-6">
          {gaps.map((gap, i) => (
            <PlaybookCard
              key={gap.domain}
              gap={gap}
              rank={i + 1}
              printMode={printMode}
            />
          ))}
        </div>
      )}

      {/* Defensible advantages */}
      {allCitedDomains.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: BRAND_TOKENS.accentPrimary }}
          >
            Defensible advantages
          </p>
          <p className="text-sm text-gray-600 mb-3">
            You are cited on the following sources where your competitors may not be.
            Protect these advantages by maintaining current, accurate content.
          </p>
          <div className="flex flex-wrap gap-2">
            {allCitedDomains.map((domain) => {
              const classification = classifySource(domain);
              return (
                <div
                  key={domain}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                    printMode
                      ? "border border-gray-300 text-gray-700"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  <span className="font-medium">{classification.platformName}</span>
                  <span className="text-green-500">
                    {classification.controlLevel === "high" ? "(you control)" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
