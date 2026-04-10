/**
 * JourneyReportRenderer
 *
 * Renders all sections of a journey-format report. Used by both the dashboard
 * detail page (screen mode) and the export page (print mode).
 *
 * Report structure (updated 2026-04-01):
 *   0. Executive Decision Page -- top risks, priority actions, expected outcomes
 *   1. Executive Summary -- bullet-point format, scannable in 30 seconds
 *   2. Discovery Visibility -- Broad / Industry / Niche subsections from boundary data
 *   3. Competitive Evaluation -- Compensation / Culture / Competitive Positioning
 *   4. Candidate Commitment -- Interview / Compensation Details / Application
 *   5. Citation Playbook -- actionable remediation playbook per citation gap
 *   6. Baseline Metrics -- track in next assessment
 *   7. Recommended Actions -- full sequenced timeline
 *
 * The component is a server component -- no interactivity. The EvidencePanel
 * (client component) is passed as an optional render prop so the export page can
 * omit it.
 */

import type { ReactNode, JSX } from "react";
import type { JourneyMetadata, JourneyStageData, SegmentData } from "./journey-types";
import { BRAND_TOKENS } from "@antellion/core";
import { CompetitorMatrix } from "./CompetitorMatrix";
import { CompetitorComparisonTable } from "./CompetitorComparisonTable";
import { RecommendationCard } from "./RecommendationCard";
import { PositioningBadge, PositioningBadgePrint } from "./PositioningBadge";
import { CrossSegmentSummaryBlock } from "./CrossSegmentSummaryBlock";
import { CitationPlaybook } from "./CitationPlaybook";
import { MethodologySection } from "./MethodologySection";
import { EffortImpactMatrix } from "./EffortImpactMatrix";
import { CoverPage } from "./CoverPage";
import { ExecutiveSummaryCard } from "./ExecutiveSummaryCard";
import { BaselineComparisonSection } from "./BaselineComparisonSection";
import {
  SectionEvidenceBasis,
  deriveSectionConfidence,
  type SectionEvidenceBasisProps,
} from "./SectionEvidenceBasis";
import { StabilityCount } from "./StabilityBadge";

type SpecificityLevel = "broad" | "industry" | "niche" | "hyper_specific";

interface JourneyReportRendererProps {
  meta: JourneyMetadata;
  summary?: string | null;
  /** When true, applies print-optimised styles throughout */
  printMode?: boolean;
  /**
   * Optional render prop for the evidence panel.
   * Dashboard page passes this; export page omits it.
   */
  evidencePanel?: (sectionHeading: string) => ReactNode;
  /**
   * Optional render prop for the executive summary block above the journey.
   * Passed by the export page which renders its own SummaryRenderer.
   */
  summaryBlock?: ReactNode;
  /**
   * Client domain — passed from the report page for the cover page.
   * Optional: cover page renders without it if not available.
   */
  clientDomain?: string | null;
  /**
   * Client industry — passed from the report page for the cover page.
   * Optional: cover page renders without it if not available.
   */
  clientIndustry?: string | null;
}

// ─── Types for recommendations ──────────────────────────────

type Recommendation = JourneyMetadata["remediationPlan"]["recommendations"][number];

// ─── Helpers ─────────────────────────────────────────────────

function formatPct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function mentionRateColorClass(rate: number, printMode: boolean): string {
  if (printMode) return "font-bold text-gray-900";
  if (rate >= 0.6) return "font-bold text-green-700";
  if (rate >= 0.3) return "font-bold text-amber-700";
  return "font-bold text-red-700";
}

// ─── Source quality badge ─────────────────────────────────────

interface SourceQualityInfo {
  label: string;
  note: string | null;
  colorClass: string;
}

function getSourceQualityInfo(
  sourcedRate: number,
  printMode: boolean,
): SourceQualityInfo {
  if (sourcedRate >= 0.7) {
    return {
      label: "Strong source coverage",
      note: null,
      colorClass: printMode
        ? "text-gray-700 border border-gray-300"
        : "text-green-700 bg-green-50",
    };
  }
  if (sourcedRate >= 0.4) {
    return {
      label: "Moderate source coverage",
      note: null,
      colorClass: printMode
        ? "text-gray-700 border border-gray-300"
        : "text-amber-700 bg-amber-50",
    };
  }
  return {
    label: "Limited source coverage",
    note: "Most findings at this stage are based on AI's training data rather than currently indexed sources.",
    colorClass: printMode
      ? "text-gray-700 border border-gray-300"
      : "text-red-700 bg-red-50",
  };
}

function SourceQualityBadge({
  sourcedRate,
  printMode,
}: {
  sourcedRate: number;
  printMode: boolean;
}) {
  const info = getSourceQualityInfo(sourcedRate, printMode);
  return (
    <span>
      <span
        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${info.colorClass}`}
      >
        {info.label}
      </span>
      {info.note && (
        <span className="ml-2 text-xs text-gray-500">{info.note}</span>
      )}
    </span>
  );
}

// ─── Section wrapper ─────────────────────────────────────────

function Section({
  heading,
  subtitle,
  children,
  printMode,
  evidencePanel,
  evidenceBasis,
}: {
  heading: string;
  subtitle?: string;
  children: ReactNode;
  printMode?: boolean;
  evidencePanel?: (sectionHeading: string) => ReactNode;
  evidenceBasis?: Omit<SectionEvidenceBasisProps, "printMode">;
}) {
  return (
    <div
      className={printMode ? "mt-12 page-break" : "space-y-4"}
      style={
        printMode
          ? {
              borderTop: `3px solid ${BRAND_TOKENS.accentPrimary}`,
              paddingTop: "20px",
            }
          : {
              borderLeft: `3px solid ${BRAND_TOKENS.accentPrimary}`,
              paddingLeft: "16px",
            }
      }
    >
      {printMode ? (
        <h2
          className="text-xl font-bold"
          style={{ color: BRAND_TOKENS.reportText }}
        >
          {heading}
        </h2>
      ) : (
        <h2
          className="text-lg font-semibold"
          style={{ color: BRAND_TOKENS.reportText }}
        >
          {heading}
        </h2>
      )}
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      )}
      {evidenceBasis && (
        <SectionEvidenceBasis {...evidenceBasis} printMode={printMode} />
      )}
      <div className={printMode ? "mt-4" : ""}>{children}</div>
      {!printMode && evidencePanel && evidencePanel(heading)}
    </div>
  );
}

// ─── Subsection wrapper ───────────────────────────────────────

function Subsection({
  heading,
  children,
  printMode,
}: {
  heading: string;
  children: ReactNode;
  printMode?: boolean;
}) {
  return (
    <div className={printMode ? "mt-6 break-inside-avoid" : "mt-4"}>
      {printMode ? (
        <h3 className="text-sm font-semibold text-gray-800">{heading}</h3>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {heading}
        </p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}

// ─── Section close-out footer ────────────────────────────────

function SectionCloseOut({
  whatThisMeans,
  whatToDoNext,
  howToMeasure,
  printMode,
}: {
  whatThisMeans: string;
  whatToDoNext: string;
  howToMeasure: string;
  printMode: boolean;
}) {
  return (
    <div
      className="mt-6 rounded-lg p-5"
      style={{
        border: `1px solid ${BRAND_TOKENS.reportBorder}`,
        backgroundColor: BRAND_TOKENS.reportSurface,
      }}
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: BRAND_TOKENS.accentPrimary }}
          >
            What this means
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            {whatThisMeans}
          </p>
        </div>
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: BRAND_TOKENS.accentPrimary }}
          >
            What to do next
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            {whatToDoNext}
          </p>
        </div>
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: BRAND_TOKENS.accentPrimary }}
          >
            How to measure improvement
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            {howToMeasure}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Theme insights display ──────────────────────────────────

type ThemeData = NonNullable<JourneyStageData["themes"]>;

const COMP_DETAIL_LABELS: Record<string, string> = {
  specific: "AI provides specific salary ranges and compensation details",
  vague: "AI describes compensation in vague terms without specifics",
  absent: "AI has no compensation data to reference",
};

const CULTURE_DETAIL_LABELS: Record<string, string> = {
  specific: "AI cites specific culture data (ratings, policies, programs)",
  vague: "AI describes culture in general terms without specifics",
  absent: "AI has no culture data to reference",
};

function detailBadgeClass(level: string, printMode: boolean): string {
  if (printMode) return "text-gray-900 font-semibold";
  if (level === "specific") return "text-green-700 bg-green-50 rounded px-1.5 py-0.5";
  if (level === "vague") return "text-amber-700 bg-amber-50 rounded px-1.5 py-0.5";
  return "text-red-700 bg-red-50 rounded px-1.5 py-0.5";
}

function ThemeInsights({
  themes,
  clientName,
  printMode,
  compact = false,
}: {
  themes: ThemeData;
  clientName: string;
  printMode: boolean;
  /** Compact mode shows fewer items — used inside subsection cards */
  compact?: boolean;
}) {
  const hasPositive = themes.positiveAttributes.length > 0;
  const hasNegative = themes.negativeAttributes.length > 0;
  const hasUnsolicited = themes.unsolicitedCompetitors.length > 0;
  const hasAnyContent = hasPositive || hasNegative || hasUnsolicited ||
    themes.compensationDetail !== "absent" || themes.cultureDetail !== "absent" ||
    themes.industryFraming !== "not clearly categorized";

  if (!hasAnyContent) return null;

  return (
    <div
      className="mt-4 rounded-lg p-4"
      style={{
        border: `1px solid ${printMode ? BRAND_TOKENS.reportBorder : BRAND_TOKENS.accentPrimary + "33"}`,
        backgroundColor: printMode ? BRAND_TOKENS.reportBg : `${BRAND_TOKENS.accentPrimary}08`,
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: BRAND_TOKENS.accentPrimary }}
      >
        AI Narrative Analysis
      </p>

      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        {/* Industry framing */}
        {themes.industryFraming !== "not clearly categorized" && (
          <div className="text-sm">
            <span className="text-gray-500">AI frames {clientName} as: </span>
            <span className="font-semibold text-gray-900">
              {themes.industryFraming}
            </span>
          </div>
        )}

        {/* Compensation specificity */}
        {themes.compensationDetail !== "absent" && (
          <div className="text-sm">
            <span className="text-gray-500">Compensation data: </span>
            <span className={`text-xs font-medium ${detailBadgeClass(themes.compensationDetail, printMode)}`}>
              {themes.compensationDetail}
            </span>
          </div>
        )}

        {/* Culture specificity */}
        {themes.cultureDetail !== "absent" && (
          <div className="text-sm">
            <span className="text-gray-500">Culture data: </span>
            <span className={`text-xs font-medium ${detailBadgeClass(themes.cultureDetail, printMode)}`}>
              {themes.cultureDetail}
            </span>
          </div>
        )}
      </div>

      {/* Positive attributes */}
      {hasPositive && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">AI highlights:</p>
          <div className="flex flex-wrap gap-1.5">
            {themes.positiveAttributes.slice(0, compact ? 4 : 8).map((attr) => (
              <span
                key={attr}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  printMode
                    ? "border border-gray-300 text-gray-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {attr}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Negative attributes */}
      {hasNegative && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">AI concerns:</p>
          <div className="flex flex-wrap gap-1.5">
            {themes.negativeAttributes.slice(0, compact ? 4 : 8).map((attr) => (
              <span
                key={attr}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  printMode
                    ? "border border-gray-300 text-gray-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {attr}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unsolicited competitors */}
      {hasUnsolicited && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">
            Unexpected competitors (AI mentions these as alternatives, not in tracked set):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {themes.unsolicitedCompetitors.map((name) => (
              <span
                key={name}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  printMode
                    ? "border border-gray-300 text-gray-700"
                    : "bg-purple-50 text-purple-700"
                }`}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline recommendation block ─────────────────────────────

interface SequencedRec extends Recommendation {
  whyNow?: string;
  doBefore?: string;
  doAfter?: string;
}

function buildRecSequencing(recs: Recommendation[]): SequencedRec[] {
  // Sort by priority order then timeframe
  const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sorted = [...recs].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 2;
    const pb = PRIORITY_ORDER[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    // Within same priority, sort by timeframe (shorter = earlier)
    const timeframeOrder = (tf: string) => {
      if (/30|immediate|now|urgent/i.test(tf)) return 0;
      if (/60|short/i.test(tf)) return 1;
      if (/90|medium/i.test(tf)) return 2;
      return 3;
    };
    return timeframeOrder(a.timeframe) - timeframeOrder(b.timeframe);
  });

  return sorted.map((rec, idx): SequencedRec => {
    // Why now
    let whyNow: string | undefined;
    if (rec.priority === "CRITICAL") {
      whyNow = "This is the most impactful gap in your AI-influenced pipeline — every week without action compounds the visibility gap.";
    } else if (rec.priority === "HIGH") {
      whyNow = "This is the next highest-impact action once critical items are addressed.";
    }

    // Before / after based on same-platform adjacency
    const prevRec = idx > 0 ? sorted[idx - 1] : undefined;
    const nextRec = idx < sorted.length - 1 ? sorted[idx + 1] : undefined;

    // Profile creation before solicitation logic
    const isProfileCreate = /create|establish|set.?up|claim/i.test(rec.title);
    const isProfileStrengthen = /strengthen|update|improve|optimize|add|solicit|request/i.test(rec.title);

    let doBefore: string | undefined;
    let doAfter: string | undefined;

    if (prevRec) {
      const samePlatform = rec.targetPlatforms.some((p) =>
        prevRec.targetPlatforms.some((pp) => pp.toLowerCase() === p.toLowerCase()),
      );
      if (samePlatform && isProfileStrengthen) {
        doBefore = prevRec.title;
      } else if (prevRec.priority === "CRITICAL" && rec.priority !== "CRITICAL") {
        doBefore = prevRec.title;
      }
    }

    if (nextRec) {
      const samePlatform = rec.targetPlatforms.some((p) =>
        nextRec.targetPlatforms.some((np) => np.toLowerCase() === p.toLowerCase()),
      );
      if (samePlatform && isProfileCreate) {
        doAfter = nextRec.title;
      } else if (rec.priority === "CRITICAL" && nextRec.priority !== "CRITICAL") {
        doAfter = nextRec.title;
      }
    }

    return { ...rec, whyNow, doBefore, doAfter };
  });
}

function InlineRecommendations({
  recs,
  printMode,
}: {
  recs: Recommendation[];
  printMode: boolean;
}) {
  if (recs.length === 0) return null;
  const sequenced = buildRecSequencing(recs);
  return (
    <div
      className="mt-4 space-y-3"
      style={
        !printMode
          ? { borderLeft: `2px solid ${BRAND_TOKENS.accentPrimary}33`, paddingLeft: "16px" }
          : undefined
      }
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: BRAND_TOKENS.accentPrimary }}
      >
        Recommendation{recs.length > 1 ? "s" : ""}
      </p>
      {sequenced.map((rec) => (
        <RecommendationCard
          key={rec.id}
          id={rec.id}
          stage={rec.stage}
          priority={rec.priority}
          title={rec.title}
          summary={rec.summary}
          whyItMatters={rec.whyItMatters}
          targetPlatforms={rec.targetPlatforms}
          actions={rec.actions}
          evidenceBasis={rec.evidenceBasis}
          expectedImpact={rec.expectedImpact}
          effort={rec.effort}
          timeframe={rec.timeframe}
          whyNow={rec.whyNow}
          doBefore={rec.doBefore}
          doAfter={rec.doAfter}
          printMode={printMode}
        />
      ))}
    </div>
  );
}

// ─── Executive Decision Page ─────────────────────────────────

function deriveTopRisks(meta: JourneyMetadata): Array<{ risk: string; consequence: string }> {
  const { journeyAnalysis, clientName, competitors, remediationPlan } = meta;
  const { stages } = journeyAnalysis;
  const risks: Array<{ risk: string; consequence: string }> = [];

  // Risk 1: worst-performing stage
  const worstStage = [...stages].sort((a, b) => a.mentionRate - b.mentionRate)[0];
  if (worstStage && worstStage.mentionRate < 0.3) {
    const stageLabel = worstStage.label ?? worstStage.stage;
    const rate = worstStage.mentionRate;
    const consequence = rate === 0
      ? `${clientName} does not appear in any ${stageLabel.toLowerCase()} queries — most candidates using AI for employer research at this stage will not encounter ${clientName}.`
      : `${clientName} appears in only ${formatPct(rate)} of ${stageLabel.toLowerCase()} queries — most candidates using AI for employer research at this stage will not encounter ${clientName}.`;
    risks.push({
      risk: `${stageLabel} stage invisible`,
      consequence,
    });
  }

  // Risk 2: top competitor gap
  const discoveryStage = stages.find((s) => s.stage === "DISCOVERY");
  const primaryCompetitor = competitors.find((c) => c.threatLevel === "Primary") ?? competitors[0];
  if (primaryCompetitor && discoveryStage) {
    const compDiscStage = primaryCompetitor.stages.find((s) => s.stage === "DISCOVERY");
    if (compDiscStage && compDiscStage.mentionRate > discoveryStage.mentionRate) {
      const gap = Math.round((compDiscStage.mentionRate - discoveryStage.mentionRate) * 100);
      risks.push({
        risk: `${primaryCompetitor.name} ${gap}pp visibility advantage`,
        consequence: `AI surfaces ${primaryCompetitor.name} more often in discovery because their platform presence gives AI more to work with. Without action, this gap is unlikely to close on its own.`,
      });
    }
  }

  // Risk 3: top platform gaps
  // A gap domain is one where the client was NEVER mentioned in any response
  // citing it (see stage-comparison.ts). This is a correlation, not proof of
  // absence from the platform itself — the narrative reflects that.
  const allGapDomains = Array.from(new Set(stages.flatMap((s) => s.gapDomains)));
  if (allGapDomains.length > 0) {
    const topGaps = allGapDomains.slice(0, 2).join(" and ");
    risks.push({
      risk: `${allGapDomains.length} citation source gaps`,
      consequence: `Competitors appeared in AI responses citing ${topGaps}; ${clientName} did not appear in any response citing these sources. Worth investigating whether ${clientName}'s presence on these platforms is discoverable to AI models.`,
    });
  }

  // Risk 4: CRITICAL rec if not already covered
  const criticalRec = remediationPlan.recommendations.find((r) => r.priority === "CRITICAL");
  if (criticalRec && risks.length < 3) {
    risks.push({
      risk: criticalRec.title,
      consequence: criticalRec.whyItMatters,
    });
  }

  return risks.slice(0, 3);
}

function derivePriorityActions(
  meta: JourneyMetadata,
): Array<{ timeframe: string; action: string; platform: string }> {
  const recs = meta.remediationPlan.recommendations;
  const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sorted = [...recs].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 2;
    const pb = PRIORITY_ORDER[b.priority] ?? 2;
    return pa !== pb ? pa - pb : 0;
  });

  const buckets: Array<{ timeframe: string; action: string; platform: string }> = [];
  const labels = ["30 days", "60 days", "90 days"];

  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    const rec = sorted[i];
    const platform = rec.targetPlatforms.length > 0 ? rec.targetPlatforms[0] : "Multiple platforms";
    // Use the timeframe from the rec if it already looks like a day count, otherwise use label order
    const tfRaw = rec.timeframe ?? "";
    let tfLabel: string;
    if (/30/i.test(tfRaw)) tfLabel = "30 days";
    else if (/60/i.test(tfRaw)) tfLabel = "60 days";
    else if (/90/i.test(tfRaw)) tfLabel = "90 days";
    else tfLabel = labels[i] ?? `${(i + 1) * 30} days`;

    buckets.push({ timeframe: tfLabel, action: rec.title, platform });
  }

  return buckets;
}

function deriveExpectedOutcomes(meta: JourneyMetadata): Array<{ metric: string; current: string; target: string }> {
  const { journeyAnalysis } = meta;
  const { stages, earnedVisibilityRate, earnedVisibilityTier } = journeyAnalysis;
  const outcomes: Array<{ metric: string; current: string; target: string }> = [];

  const discoveryStage = stages.find((s) => s.stage === "DISCOVERY");
  const evalStage = stages.find((s) => s.stage === "EVALUATION");

  const currentEarned = earnedVisibilityRate ?? discoveryStage?.mentionRate ?? 0;
  const earnedTarget = currentEarned === 0
    ? "measurable improvement"
    : currentEarned < 0.3
      ? "measurable improvement"
      : "maintain or improve";

  outcomes.push({
    metric: "Earned visibility",
    current: formatPct(currentEarned),
    target: `${earnedTarget} with full platform coverage`,
  });

  if (discoveryStage) {
    const discTarget = discoveryStage.mentionRate < 0.3
      ? "measurable improvement"
      : "maintain or improve";
    outcomes.push({
      metric: "Discovery mention rate",
      current: formatPct(discoveryStage.mentionRate),
      target: discTarget,
    });
  }

  if (evalStage) {
    const evalTarget = evalStage.mentionRate < 0.3
      ? "measurable improvement"
      : "maintain or improve";
    outcomes.push({
      metric: "Evaluation mention rate",
      current: formatPct(evalStage.mentionRate),
      target: evalTarget,
    });
  }

  void earnedVisibilityTier;
  return outcomes;
}

function ExecutiveDecisionPage({
  meta,
  printMode,
}: {
  meta: JourneyMetadata;
  printMode: boolean;
}) {
  const { journeyAnalysis, clientName, competitors } = meta;
  const { stages, earnedVisibilityTier } = journeyAnalysis;

  const topRisks = deriveTopRisks(meta);
  const priorityActions = derivePriorityActions(meta);
  const expectedOutcomes = deriveExpectedOutcomes(meta);

  // Top competitor across all stages
  const primaryCompetitor = competitors.find((c) => c.threatLevel === "Primary") ?? competitors[0];
  const discoveryStage = stages.find((s) => s.stage === "DISCOVERY");
  let topCompetitorLine: string | null = null;
  if (primaryCompetitor && discoveryStage) {
    const compDiscStage = primaryCompetitor.stages.find((s) => s.stage === "DISCOVERY");
    if (compDiscStage && discoveryStage.mentionRate > 0 && compDiscStage.mentionRate >= 0.15) {
      const multiplier = (compDiscStage.mentionRate / discoveryStage.mentionRate).toFixed(1);
      topCompetitorLine = `${primaryCompetitor.name} at ${multiplier}x visibility advantage`;
    } else if (compDiscStage && (compDiscStage.mentionRate < 0.15 || discoveryStage.mentionRate <= 0)) {
      // Both companies have minimal visibility — don't use multiplier language
      if (compDiscStage.mentionRate < 0.15 && discoveryStage.mentionRate < 0.15) {
        topCompetitorLine = `${primaryCompetitor.name}: both companies have minimal visibility`;
      } else {
        topCompetitorLine = `${primaryCompetitor.name} at ${formatPct(compDiscStage.mentionRate)} discovery rate vs. ${clientName} at ${formatPct(discoveryStage.mentionRate)}`;
      }
    }
  }

  // Total query count from boundary or stage confidence proxy
  const boundary = meta.visibilityBoundary;
  let queryCount: number | null = null;
  if (boundary) {
    queryCount = Object.values(boundary.rateByLevel).reduce(
      (sum, l) => sum + l.queryCount,
      0,
    );
  }

  const tierLabel = earnedVisibilityTier
    ? earnedVisibilityTier.charAt(0).toUpperCase() + earnedVisibilityTier.slice(1)
    : null;

  if (topRisks.length === 0 && priorityActions.length === 0) return null;

  return (
    <div
      className={`rounded-lg p-6 ${printMode ? "break-inside-avoid" : ""}`}
      style={{
        border: `2px solid ${BRAND_TOKENS.accentPrimary}`,
        backgroundColor: printMode ? BRAND_TOKENS.reportBg : BRAND_TOKENS.reportSurface,
      }}
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2
          className={`font-bold ${printMode ? "text-xl" : "text-lg"}`}
          style={{ color: BRAND_TOKENS.reportText }}
        >
          Executive Decision Page
        </h2>
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: BRAND_TOKENS.accentPrimary }}
        >
          {clientName}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Top Risks + Priority Actions */}
        <div className="space-y-6">
          {topRisks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Top Risks
              </p>
              <ol className="mt-2 space-y-2">
                {topRisks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: `${BRAND_TOKENS.accentPrimary}1A`,
                        color: BRAND_TOKENS.accentPrimary,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-gray-700">
                      <span className="font-semibold" style={{ color: BRAND_TOKENS.reportText }}>{r.risk}</span>
                      {" — "}
                      {r.consequence}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {priorityActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Priority Actions
              </p>
              <ul className="mt-2 space-y-1.5">
                {priorityActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 w-14 shrink-0 text-xs font-semibold text-gray-500">
                      {a.timeframe}:
                    </span>
                    <span>
                      {a.action}
                      {a.platform && (
                        <span
                          className="ml-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor: `${BRAND_TOKENS.accentPrimary}14`,
                            color: BRAND_TOKENS.accentPrimary,
                          }}
                        >
                          {a.platform}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column: Expected Outcomes + Confidence + Competitor */}
        <div className="space-y-6">
          {expectedOutcomes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Expected Outcomes
              </p>
              <ul className="mt-2 space-y-1.5">
                {expectedOutcomes.map((o, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    <span className="font-medium text-gray-800">{o.metric}: </span>
                    <span className="font-semibold text-gray-900">{o.current}</span>
                    <span className="mx-1.5 text-gray-400">→</span>
                    <span className="text-gray-700">{o.target}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className="rounded border p-3 text-sm"
            style={{
              border: `1px solid ${BRAND_TOKENS.reportBorder}`,
              backgroundColor: BRAND_TOKENS.reportBg,
            }}
          >
            {tierLabel && (
              <p className="text-gray-700">
                <span className="font-semibold uppercase tracking-wide text-gray-500 text-xs">Confidence: </span>
                <span className="font-semibold text-gray-900">{tierLabel}</span>
                {queryCount !== null && (
                  <span className="text-gray-500"> based on {queryCount} queries</span>
                )}
              </p>
            )}
            {topCompetitorLine && (
              <p className={`text-gray-700 ${tierLabel ? "mt-2" : ""}`}>
                <span className="font-semibold uppercase tracking-wide text-gray-500 text-xs">Top competitor: </span>
                <span className="text-gray-800">{topCompetitorLine}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Visibility boundary constants ───────────────────────────

const SPECIFICITY_LABELS: Record<SpecificityLevel, string> = {
  broad: "Broad",
  industry: "Industry",
  niche: "Niche",
  hyper_specific: "Hyper-Specific",
};

const SPECIFICITY_ORDER: SpecificityLevel[] = [
  "broad",
  "industry",
  "niche",
  "hyper_specific",
];

const SPECIFICITY_DESCRIPTIONS: Record<SpecificityLevel, string> = {
  broad: "Generic career queries with no industry or role qualifier",
  industry: "Queries mentioning the industry but not the specific niche",
  niche: "Queries that name the specific niche or vertical",
  hyper_specific: "Queries with location or very specific qualifiers",
};

const SPECIFICITY_EXAMPLES: Record<SpecificityLevel, string> = {
  broad: "best companies for sales professionals",
  industry: "best hospitality companies for sales",
  niche: "best companies for timeshare sales",
  hyper_specific: "best companies for timeshare sales in Orlando",
};

// ─── Recommendation routing helpers ──────────────────────────

function getDiscoveryRecsForLevel(
  recs: Recommendation[],
  level: SpecificityLevel,
): Recommendation[] {
  const discoveryRecs = recs.filter((r) => r.stage === "DISCOVERY");
  if (discoveryRecs.length === 0) return [];
  // If 2 or fewer, show all at the broadest level only
  if (discoveryRecs.length <= 2) return level === "broad" ? discoveryRecs : [];

  const levelKeywords: Record<SpecificityLevel, string[]> = {
    broad: ["broad", "general", "generic", "top-of-funnel"],
    industry: ["industry", "sector", "vertical"],
    niche: ["niche", "specific", "specialized", "timeshare"],
    hyper_specific: ["local", "location", "geo", "regional"],
  };

  const keywords = levelKeywords[level];
  const matched = discoveryRecs.filter((r) =>
    keywords.some(
      (kw) =>
        r.title.toLowerCase().includes(kw) ||
        r.summary.toLowerCase().includes(kw) ||
        r.evidenceBasis.toLowerCase().includes(kw),
    ),
  );

  // Fallback: if nothing matched and this is broadest level, show all
  if (matched.length === 0 && level === "broad") return discoveryRecs;
  return matched;
}

function getEvaluationRecs(
  recs: Recommendation[],
  theme: "compensation" | "culture" | "competitive",
): Recommendation[] {
  const evalRecs = recs.filter(
    (r) => r.stage === "EVALUATION" || r.stage === "CONSIDERATION",
  );
  const themeKeywords: Record<string, string[]> = {
    compensation: ["salary", "compensation", "pay", "levels.fyi", "glassdoor salary", "pay range", "total comp"],
    culture: ["culture", "work-life", "remote", "workplace", "values", "DEI", "diversity", "employee experience", "environment"],
    competitive: ["competitor", "competitive", "positioning", "brand", "reputation", "differentiat"],
  };
  const keywords = themeKeywords[theme];
  return evalRecs.filter((r) =>
    keywords.some(
      (kw) =>
        r.title.toLowerCase().includes(kw) ||
        r.summary.toLowerCase().includes(kw) ||
        r.targetPlatforms.some((p) => p.toLowerCase().includes(kw)),
    ),
  );
}

function getCommitmentRecs(
  recs: Recommendation[],
  topic: "interview" | "compensation_details" | "application",
): Recommendation[] {
  const commitRecs = recs.filter((r) => r.stage === "COMMITMENT");
  const topicKeywords: Record<string, string[]> = {
    interview: ["interview", "hiring process", "recruiter", "screening"],
    compensation_details: ["salary", "compensation", "pay", "offer", "negotiat"],
    application: ["apply", "application", "onboarding", "first day", "career page"],
  };
  const keywords = topicKeywords[topic];
  return commitRecs.filter((r) =>
    keywords.some(
      (kw) =>
        r.title.toLowerCase().includes(kw) ||
        r.summary.toLowerCase().includes(kw),
    ),
  );
}

// ─── Executive summary bullet builder ────────────────────────

interface ExecBullet {
  bold: string;
  detail: string;
}

function buildExecBullets(meta: JourneyMetadata): ExecBullet[] {
  const {
    journeyAnalysis,
    clientName,
    competitors,
    visibilityBoundary,
    remediationPlan,
  } = meta;
  const { stages, earnedVisibilityRate } = journeyAnalysis;

  const bullets: ExecBullet[] = [];
  const discoveryStage = stages.find((s) => s.stage === "DISCOVERY");

  // 1. Earned visibility rate
  if (discoveryStage) {
    const compPart = discoveryStage.topCompetitor
      ? ` ${discoveryStage.topCompetitor.name} appears in ${formatPct(discoveryStage.topCompetitor.mentionRate)}.`
      : "";
    bullets.push({
      bold: `Earned visibility: ${formatPct(earnedVisibilityRate ?? discoveryStage.mentionRate)}`,
      detail: `AI independently surfaces ${clientName} in ${formatPct(discoveryStage.mentionRate)} of broad discovery queries.${compPart}`,
    });
  }

  // 2. Visibility boundary
  if (visibilityBoundary) {
    if (visibilityBoundary.firstAppearsAt !== "never") {
      const levelLabel = SPECIFICITY_LABELS[visibilityBoundary.firstAppearsAt] ?? visibilityBoundary.firstAppearsAt;
      bullets.push({
        bold: `Visibility boundary: ${levelLabel.toLowerCase()} level`,
        detail: `${clientName} first appears at the ${levelLabel.toLowerCase()} level. Candidates must use ${levelLabel.toLowerCase()}-specificity queries to discover ${clientName} through AI.`,
      });
    } else {
      bullets.push({
        bold: "Visibility boundary: never",
        detail: `${clientName} does not appear in any discovery query tested. AI does not independently surface the company.`,
      });
    }
  }

  // 3. Critical gap
  const criticalGapStage = journeyAnalysis.criticalGapStage;
  if (criticalGapStage) {
    const stageData = stages.find((s) => s.stage === criticalGapStage);
    if (stageData) {
      const topGapDomain = stageData.gapDomains[0];
      const gapDetail = topGapDomain
        ? `Competitors appeared in ${stageData.label.toLowerCase()} responses citing ${topGapDomain}; ${clientName} did not. This platform is worth auditing as a potential visibility lever.`
        : `${clientName} has critical visibility gaps at the ${stageData.label} stage.`;
      bullets.push({
        bold: `Critical gap: ${stageData.label}`,
        detail: gapDetail,
      });
    }
  }

  // 4. Top competitor advantage
  const primaryCompetitor = competitors.find(
    (c) => c.threatLevel === "Primary",
  ) ?? competitors[0];
  if (primaryCompetitor && discoveryStage) {
    const compDiscoveryStage = primaryCompetitor.stages.find(
      (s) => s.stage === "DISCOVERY",
    );
    if (compDiscoveryStage && compDiscoveryStage.mentionRate > discoveryStage.mentionRate) {
      const gap = Math.round((compDiscoveryStage.mentionRate - discoveryStage.mentionRate) * 100);
      const detail = compDiscoveryStage.mentionRate >= 0.15 && discoveryStage.mentionRate > 0
        ? `${primaryCompetitor.name} appears ${(compDiscoveryStage.mentionRate / discoveryStage.mentionRate).toFixed(1)}x more often in discovery queries due to stronger presence across indexed sources.`
        : `${primaryCompetitor.name} leads ${clientName} by ${gap}pp in discovery queries.`;
      bullets.push({
        bold: "Top competitor advantage",
        detail,
      });
    }
  }

  // 5. Platform gaps
  const allGapDomains = Array.from(
    new Set(stages.flatMap((s) => s.gapDomains)),
  );
  if (allGapDomains.length > 0) {
    const topGaps = allGapDomains.slice(0, 3).join(", ");
    bullets.push({
      bold: `${allGapDomains.length} platform gap${allGapDomains.length !== 1 ? "s" : ""} identified`,
      detail: `Key gaps: ${topGaps}.`,
    });
  }

  // 6. Positioning quality
  const evaluationStage = stages.find((s) => s.stage === "EVALUATION");
  const positioningStage = evaluationStage ?? discoveryStage;
  if (positioningStage) {
    const posLabel = positioningQualityLabel(positioningStage.positioning);
    bullets.push({
      bold: "Positioning quality",
      detail: `When AI does describe ${clientName}, the description is ${posLabel.toLowerCase()}.`,
    });
  }

  // 7. AI narrative framing (from overall themes)
  const themes = meta.overallThemes;
  if (themes) {
    // Industry framing bullet — critical for companies that want to be seen as tech employers
    if (themes.industryFraming !== "not clearly categorized" && themes.industryFraming !== "tech employer") {
      bullets.push({
        bold: `AI narrative: ${themes.industryFraming}`,
        detail: `AI consistently describes ${clientName} as a ${themes.industryFraming}${themes.industryFraming.includes("tech") ? "" : ", not a technology employer"}. This framing disadvantages ${clientName} when competing for technical talent against companies AI categorizes as tech-first.`,
      });
    }

    // Compensation specificity bullet
    if (themes.compensationDetail !== "absent") {
      const compLabel = themes.compensationDetail === "specific"
        ? "AI has specific salary data"
        : "AI describes compensation in vague terms only";
      const compDetail = themes.compensationDetail === "specific"
        ? `AI provides specific compensation details for ${clientName}, which strengthens the company's position in evaluation-stage comparisons.`
        : `AI describes ${clientName}'s compensation as "competitive" without specifics. Competitors with published salary ranges on platforms like Levels.fyi have a material advantage in evaluation-stage queries.`;
      bullets.push({
        bold: `Compensation specificity: ${themes.compensationDetail}`,
        detail: compDetail,
      });
    }

    // Unsolicited competitors bullet
    if (themes.unsolicitedCompetitors.length > 0) {
      const names = themes.unsolicitedCompetitors.slice(0, 3).join(", ");
      bullets.push({
        bold: "Unexpected competitive dynamics",
        detail: `AI mentions ${names} as alternative employers across multiple queries, even though ${themes.unsolicitedCompetitors.length === 1 ? "this company is" : "these companies are"} not in the tracked competitor set. Candidates may be comparing ${clientName} against these employers without ${clientName}'s knowledge.`,
      });
    }

    // Negative framing bullet — only if there are notable negatives
    if (themes.negativeAttributes.length >= 2) {
      const topNegatives = themes.negativeAttributes.slice(0, 3).join(", ");
      bullets.push({
        bold: "Employer perception risks",
        detail: `AI associates ${clientName} with: ${topNegatives}. These themes appear across multiple query responses and may discourage candidates during evaluation.`,
      });
    }
  }

  // 8. Top recommendation
  const topRec = remediationPlan.recommendations.find(
    (r) => r.priority === "CRITICAL",
  ) ?? remediationPlan.recommendations[0];
  if (topRec) {
    const platformPart = topRec.targetPlatforms.length > 0
      ? ` (${topRec.targetPlatforms[0]})`
      : "";
    const timeframePart = topRec.timeframe ? ` -- ${topRec.timeframe}` : "";
    bullets.push({
      bold: "Top recommendation",
      detail: `${topRec.title}${platformPart}${timeframePart}.`,
    });
  }

  // Limit to 9 bullets to keep the summary scannable
  return bullets.slice(0, 9);
}

function positioningQualityLabel(positioning: string): string {
  switch (positioning.toUpperCase()) {
    case "CHAMPION": return "Strong";
    case "CONTENDER": return "Adequate";
    case "PERIPHERAL": return "Generic";
    case "CAUTIONARY": return "Negative";
    case "INVISIBLE": return "Absent";
    default: return positioning;
  }
}

// ─── Section close-out derivation helpers ────────────────────

function buildDiscoveryCloseOut(
  meta: JourneyMetadata,
  allRecs: Recommendation[],
): { whatThisMeans: string; whatToDoNext: string; howToMeasure: string } {
  const { journeyAnalysis, clientName } = meta;
  const discoveryStage = journeyAnalysis.stages.find((s) => s.stage === "DISCOVERY");
  const rate = discoveryStage?.mentionRate ?? 0;

  const whatThisMeans =
    rate === 0
      ? `${clientName} is invisible to AI at the discovery stage — candidates searching for employers in this space will not encounter ${clientName} until platform gaps are closed.`
      : rate < 0.3
        ? `${clientName} appears in only ${formatPct(rate)} of discovery queries, meaning the majority of candidates using AI for job search will not see ${clientName} at this stage.`
        : `${clientName} has meaningful discovery visibility at ${formatPct(rate)}, but competitor advantages and platform gaps are limiting further gains.`;

  const discRecs = allRecs.filter((r) => r.stage === "DISCOVERY");
  const topDiscRec = discRecs.find((r) => r.priority === "CRITICAL") ?? discRecs.find((r) => r.priority === "HIGH") ?? discRecs[0];
  const whatToDoNext = topDiscRec
    ? `${topDiscRec.title}${topDiscRec.targetPlatforms.length > 0 ? ` — ${topDiscRec.targetPlatforms[0]}` : ""}`
    : "Address platform citation gaps identified in the discovery section above.";

  const howToMeasure =
    rate === 0
      ? "Track discovery mention rate from 0% — any measurable improvement in the next assessment is a positive signal."
      : `Track discovery mention rate from ${formatPct(rate)} — aim for measurable improvement in next assessment.`;

  return { whatThisMeans, whatToDoNext, howToMeasure };
}

function buildEvaluationCloseOut(
  meta: JourneyMetadata,
  allRecs: Recommendation[],
): { whatThisMeans: string; whatToDoNext: string; howToMeasure: string } {
  const { journeyAnalysis, clientName } = meta;
  const evalStage = journeyAnalysis.stages.find((s) => s.stage === "EVALUATION");
  const rate = evalStage?.mentionRate ?? 0;

  const whatThisMeans =
    rate === 0
      ? `${clientName} is not being recommended when candidates compare employers against alternatives — AI responses at this stage do not surface ${clientName} as an option.`
      : rate < 0.3
        ? `Candidates evaluating ${clientName} against alternatives are seeing a thin picture — AI has limited compensation and culture data to reference, reducing its confidence in recommending the company.`
        : `${clientName} is competitive at the evaluation stage, though gaps in specific platforms reduce the depth of AI's recommendations.`;

  const evalRecs = allRecs.filter((r) => r.stage === "EVALUATION" || r.stage === "CONSIDERATION");
  const topEvalRec = evalRecs.find((r) => r.priority === "CRITICAL") ?? evalRecs.find((r) => r.priority === "HIGH") ?? evalRecs[0];
  const whatToDoNext = topEvalRec
    ? `${topEvalRec.title}${topEvalRec.targetPlatforms.length > 0 ? ` — ${topEvalRec.targetPlatforms[0]}` : ""}`
    : "Strengthen compensation and culture data across indexed review platforms.";

  const howToMeasure =
    rate === 0
      ? "Track evaluation mention rate from 0% — any measurable improvement in the next assessment is a positive signal."
      : `Track evaluation mention rate from ${formatPct(rate)} and monitor positioning tier advancement in next assessment.`;

  return { whatThisMeans, whatToDoNext, howToMeasure };
}

function buildCommitmentCloseOut(
  meta: JourneyMetadata,
  allRecs: Recommendation[],
): { whatThisMeans: string; whatToDoNext: string; howToMeasure: string } {
  const { journeyAnalysis, clientName } = meta;
  const commitStage = journeyAnalysis.stages.find((s) => s.stage === "COMMITMENT");
  const positioning = commitStage?.positioning ?? "INVISIBLE";

  const posLabel = positioningQualityLabel(positioning);

  const whatThisMeans =
    positioning === "INVISIBLE" || positioning === "PERIPHERAL"
      ? `Candidates who are ready to apply find minimal actionable information about ${clientName} in AI responses. Strengthening career page content, interview guidance, and application signals on indexed sources would improve the commitment-stage picture.`
      : `${clientName}'s commitment-stage positioning is ${posLabel.toLowerCase()}. Candidates who reach this stage have a basic path forward, but richer interview and application content would increase conversion.`;

  const commitRecs = allRecs.filter((r) => r.stage === "COMMITMENT");
  const topCommitRec = commitRecs.find((r) => r.priority === "CRITICAL") ?? commitRecs.find((r) => r.priority === "HIGH") ?? commitRecs[0];
  const whatToDoNext = topCommitRec
    ? `${topCommitRec.title}${topCommitRec.targetPlatforms.length > 0 ? ` — ${topCommitRec.targetPlatforms[0]}` : ""}`
    : "Publish structured career page content and solicit interview experience reviews.";

  const currentPosLabel = positioningQualityLabel(positioning);
  const howToMeasure = positioning === "CHAMPION"
    ? "Track commitment-stage positioning tier in next assessment — maintain current level."
    : `Track commitment-stage positioning tier in next assessment — target advancement from ${currentPosLabel} positioning.`;

  return { whatThisMeans, whatToDoNext, howToMeasure };
}

// ─── Discovery level card ────────────────────────────────────

function buildCompetitorWhatGoodLooksLike(
  competitorName: string,
  competitorMentionRate: number,
  citedDomains: string[],
  clientName: string,
): string | null {
  // Don't show "what good looks like" if the competitor is also barely visible
  if (competitorMentionRate < 0.1) return null;
  if (citedDomains.length === 0) return null;

  const platformMap: Record<string, string> = {
    "glassdoor": "Glassdoor employer profile and employee reviews",
    "linkedin": "LinkedIn company page with active job postings",
    "levels.fyi": "published salary data on Levels.fyi",
    "indeed": "Indeed employer profile with review volume",
    "builtin": "Built In employer presence",
    "comparably": "Comparably culture and compensation data",
    "payscale": "PayScale salary benchmarks",
    "blind": "Blind community presence",
    "kununu": "Kununu employer reviews",
  };

  // Deduplicate: map domains to descriptions, then deduplicate the descriptions
  const namedPlatforms = [...new Set(
    citedDomains
      .map((d) => {
        const key = Object.keys(platformMap).find((k) => d.toLowerCase().includes(k));
        return key ? platformMap[key] : null;
      })
      .filter((p): p is string => p !== null),
  )];

  if (namedPlatforms.length === 0) return null;

  const platformList = namedPlatforms.slice(0, 3).join(", ");

  return `${competitorName} appears at ${formatPct(competitorMentionRate)} — ${competitorName} has ${platformList}. These are the types of platform signals that drive AI employer recommendations.`;
}

function DiscoveryLevelCard({
  level,
  rate,
  queryCount,
  clientName,
  clientAppears,
  competitorBoundaries,
  gapDomains,
  narrative,
  recs,
  printMode,
  topCompetitor,
  topCompetitorCitedDomains,
  sourcedRate,
}: {
  level: SpecificityLevel;
  rate: number;
  queryCount: number;
  clientName: string;
  clientAppears: boolean;
  competitorBoundaries: Array<{ name: string; firstAppearsAt: SpecificityLevel | "never" }>;
  gapDomains: string[];
  narrative?: string;
  recs: Recommendation[];
  printMode: boolean;
  topCompetitor?: { name: string; mentionRate: number } | null;
  topCompetitorCitedDomains?: string[];
  sourcedRate?: number;
}) {
  // Suppress levels with insufficient data — fewer than 3 queries is not a finding
  const MIN_QUERIES_FOR_SECTION = 3;
  if (queryCount < MIN_QUERIES_FOR_SECTION) return null;

  const competitorsAtLevel = competitorBoundaries.filter((c) => {
    if (c.firstAppearsAt === "never") return false;
    return SPECIFICITY_ORDER.indexOf(c.firstAppearsAt) <= SPECIFICITY_ORDER.indexOf(level);
  });

  const competitorWhatGood = topCompetitor && topCompetitorCitedDomains && topCompetitorCitedDomains.length > 0
    ? buildCompetitorWhatGoodLooksLike(
        topCompetitor.name,
        topCompetitor.mentionRate,
        topCompetitorCitedDomains,
        clientName,
      )
    : null;

  return (
    <div
      className="rounded-lg p-5"
      style={{
        border: `1px solid ${BRAND_TOKENS.reportBorder}`,
        backgroundColor: BRAND_TOKENS.reportBg,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4
            className="text-base font-semibold"
            style={{ color: BRAND_TOKENS.reportText }}
          >
            {SPECIFICITY_LABELS[level]} Discovery
          </h4>
          <p className="mt-0.5 text-xs text-gray-400">
            {SPECIFICITY_DESCRIPTIONS[level]}
          </p>
          <p className="mt-1 text-xs italic text-gray-400">
            e.g. &quot;{SPECIFICITY_EXAMPLES[level]}&quot;
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span>
          <span className="text-gray-500">Mention rate: </span>
          <span className={mentionRateColorClass(rate, printMode)}>
            {formatPct(rate)}
          </span>
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">
          {queryCount} quer{queryCount === 1 ? "y" : "ies"} tested
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-sm">
          {clientAppears ? (
            <span className="inline-flex items-center rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
              {clientName} appears
            </span>
          ) : (
            <span className="inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              {clientName} absent
            </span>
          )}
        </span>
        {sourcedRate !== undefined && (
          <>
            <span className="text-gray-200">|</span>
            <SourceQualityBadge sourcedRate={sourcedRate} printMode={printMode} />
          </>
        )}
      </div>

      {competitorsAtLevel.length > 0 && (
        <div
          className="mt-4 rounded px-4 py-3 text-sm"
          style={{
            border: `1px solid ${BRAND_TOKENS.reportBorder}`,
            backgroundColor: BRAND_TOKENS.reportSurface,
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: BRAND_TOKENS.accentPrimary }}
          >
            Competitors visible at this level
          </p>
          <p className="mt-1.5 text-sm text-gray-700">
            {competitorsAtLevel.map((c) => c.name).join(", ")}
          </p>
        </div>
      )}

      {/* Competitor "what good looks like" */}
      {competitorWhatGood && (
        <div
          className="mt-4 rounded px-4 py-3 text-sm text-gray-700"
          style={{
            borderLeft: `2px solid ${BRAND_TOKENS.accentPrimary}66`,
            backgroundColor: BRAND_TOKENS.reportSurface,
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: BRAND_TOKENS.accentPrimary }}
          >
            What good looks like
          </p>
          {competitorWhatGood}
        </div>
      )}

      {gapDomains.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Citation gaps at this level
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {gapDomains.map((d) => (
              <span
                key={d}
                className="inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {narrative && (
        <p className="mt-4 text-sm leading-relaxed text-gray-700">
          {narrative}
        </p>
      )}

      <InlineRecommendations recs={recs} printMode={printMode} />
    </div>
  );
}

// ─── Evaluation subsection card ──────────────────────────────

function EvaluationSubsectionCard({
  heading,
  description,
  narrative,
  mentionRate,
  positioning,
  gapDomains,
  recs,
  printMode,
  competitorCallout,
  competitorCitedDomains,
  clientName,
  themes,
  sourcedRate,
}: {
  heading: string;
  description: string;
  narrative: string;
  mentionRate?: number;
  positioning?: string;
  gapDomains: string[];
  recs: Recommendation[];
  printMode: boolean;
  competitorCallout?: string;
  competitorCitedDomains?: string[];
  clientName?: string;
  themes?: ThemeData;
  sourcedRate?: number;
}) {
  // Derive "what good looks like" for competitor callout if we have cited domain data
  let enrichedCallout: string | null = null;
  if (competitorCallout && competitorCitedDomains && competitorCitedDomains.length > 0 && clientName) {
    // Extract competitor name and rate from the existing callout text
    // e.g. "Apex dominates at 75%"
    const match = competitorCallout.match(/^([^(]+?)\s+(?:dominates|appears|leads|is present)\s+at\s+([\d.]+%)/i);
    if (match) {
      const compName = match[1].trim();
      const compRate = parseFloat(match[2]) / 100;
      enrichedCallout = buildCompetitorWhatGoodLooksLike(
        compName,
        compRate,
        competitorCitedDomains,
        clientName,
      );
    }
  }

  return (
    <div
      className="rounded-lg p-5"
      style={{
        border: `1px solid ${BRAND_TOKENS.reportBorder}`,
        backgroundColor: BRAND_TOKENS.reportBg,
      }}
    >
      <h4
        className="text-base font-semibold"
        style={{ color: BRAND_TOKENS.reportText }}
      >
        {heading}
      </h4>
      <p className="mt-0.5 text-xs text-gray-400">{description}</p>

      {mentionRate !== undefined && positioning && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span>
            <span className="text-gray-500">Mention rate: </span>
            <span className={mentionRateColorClass(mentionRate, printMode)}>
              {formatPct(mentionRate)}
            </span>
          </span>
          <span className="text-gray-300">|</span>
          {printMode ? (
            <PositioningBadgePrint tier={positioning} />
          ) : (
            <PositioningBadge tier={positioning} />
          )}
          {sourcedRate !== undefined && (
            <>
              <span className="text-gray-300">|</span>
              <SourceQualityBadge sourcedRate={sourcedRate} printMode={printMode} />
            </>
          )}
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-gray-700">
        {narrative}
      </p>

      {/* Enriched competitor callout */}
      {(enrichedCallout ?? competitorCallout) && (
        <div
          className="mt-4 rounded px-4 py-3 text-sm text-gray-700"
          style={{
            borderLeft: `2px solid ${BRAND_TOKENS.accentPrimary}66`,
            backgroundColor: BRAND_TOKENS.reportSurface,
          }}
        >
          {enrichedCallout ? (
            <>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: BRAND_TOKENS.accentPrimary }}
              >
                What good looks like
              </p>
              {enrichedCallout}
            </>
          ) : (
            competitorCallout
          )}
        </div>
      )}

      {gapDomains.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Relevant citation gaps
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {gapDomains.map((d) => (
              <span
                key={d}
                className="inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {themes && clientName && (
        <ThemeInsights
          themes={themes}
          clientName={clientName}
          printMode={printMode}
          compact
        />
      )}

      <InlineRecommendations recs={recs} printMode={printMode} />
    </div>
  );
}

// ─── Commitment subsection card ──────────────────────────────

function CommitmentSubsectionCard({
  heading,
  description,
  narrative,
  positioning,
  gapDomains,
  recs,
  printMode,
}: {
  heading: string;
  description: string;
  narrative: string;
  positioning?: string;
  gapDomains: string[];
  recs: Recommendation[];
  printMode: boolean;
}) {
  return (
    <div
      className="rounded-lg p-5"
      style={{
        border: `1px solid ${BRAND_TOKENS.reportBorder}`,
        backgroundColor: BRAND_TOKENS.reportBg,
      }}
    >
      <h4
        className="text-base font-semibold"
        style={{ color: BRAND_TOKENS.reportText }}
      >
        {heading}
      </h4>
      <p className="mt-0.5 text-xs text-gray-400">{description}</p>

      {positioning && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-gray-500">Positioning quality: </span>
          {printMode ? (
            <PositioningBadgePrint tier={positioning} />
          ) : (
            <PositioningBadge tier={positioning} />
          )}
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-gray-700">
        {narrative}
      </p>

      {gapDomains.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Relevant citation gaps
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {gapDomains.map((d) => (
              <span
                key={d}
                className="inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      <InlineRecommendations recs={recs} printMode={printMode} />
    </div>
  );
}

// ─── Domain categorisation constants ─────────────────────────

const COMPENSATION_DOMAINS = ["levels.fyi", "glassdoor.com", "payscale.com", "salary.com", "comparably.com"];
const CULTURE_DOMAINS = ["glassdoor.com", "comparably.com", "blind.com", "indeed.com", "kununu.com"];
const INTERVIEW_DOMAINS = ["glassdoor.com", "indeed.com", "blind.com", "levels.fyi"];

function filterDomainsByKeywords(domains: string[], targetDomains: string[]): string[] {
  return domains.filter((d) =>
    targetDomains.some((t) => d.toLowerCase().includes(t.toLowerCase())),
  );
}

// ─── Narrative extraction helpers ────────────────────────────
// Extract sentences from backend-generated narratives that match a theme.
// Falls back to the full narrative if no themed sentences match.

function extractSentencesByKeywords(
  fullNarrative: string,
  keywords: RegExp,
): string {
  const sentences = fullNarrative.split(/(?<=[.!?])\s+/);
  const matched = sentences.filter((s) => keywords.test(s));
  if (matched.length > 0) return matched.join(" ");
  return fullNarrative;
}

function extractCompensationNarrative(narrative: string): string {
  return extractSentencesByKeywords(
    narrative,
    /salary|compensation|pay|levels\.fyi|total comp|earnings/i,
  );
}

function extractCultureNarrative(narrative: string): string {
  return extractSentencesByKeywords(
    narrative,
    /culture|work-life|remote|workplace|values|environment|team|employee/i,
  );
}

function extractInterviewNarrative(narrative: string): string {
  return extractSentencesByKeywords(
    narrative,
    /interview|hiring|recruiter|screening|process|apply/i,
  );
}

// ─── Baseline metrics ────────────────────────────────────────

function deriveBaselineTarget(current: number): string {
  if (current < 0.3) return "measurable improvement";
  return "maintain or improve";
}

function deriveCompetitorGapTarget(gapPp: number): string {
  if (gapPp <= 0) return "maintain";
  return "close highest-priority gaps";
}

interface BaselineRow {
  metric: string;
  current: string;
  target: string;
}

function buildBaselineRows(meta: JourneyMetadata): BaselineRow[] {
  const { journeyAnalysis, competitors } = meta;
  const { stages, earnedVisibilityRate } = journeyAnalysis;
  const rows: BaselineRow[] = [];

  const discoveryStage = stages.find((s) => s.stage === "DISCOVERY");
  const evalStage = stages.find((s) => s.stage === "EVALUATION");

  // Earned visibility
  const earned = earnedVisibilityRate ?? discoveryStage?.mentionRate ?? 0;
  rows.push({
    metric: "Earned visibility rate",
    current: formatPct(earned),
    target: deriveBaselineTarget(earned),
  });

  // Discovery mention rate
  if (discoveryStage) {
    rows.push({
      metric: "Discovery mention rate",
      current: formatPct(discoveryStage.mentionRate),
      target: deriveBaselineTarget(discoveryStage.mentionRate),
    });
  }

  // Evaluation mention rate
  if (evalStage) {
    rows.push({
      metric: "Evaluation mention rate",
      current: formatPct(evalStage.mentionRate),
      target: deriveBaselineTarget(evalStage.mentionRate),
    });
  }

  // Top competitor gap
  const primaryCompetitor = competitors.find((c) => c.threatLevel === "Primary") ?? competitors[0];
  if (primaryCompetitor && discoveryStage) {
    const compDiscStage = primaryCompetitor.stages.find((s) => s.stage === "DISCOVERY");
    if (compDiscStage) {
      const gapPp = Math.round((compDiscStage.mentionRate - discoveryStage.mentionRate) * 100);
      rows.push({
        metric: `Gap vs. ${primaryCompetitor.name} (discovery)`,
        current: gapPp > 0 ? `-${gapPp}pp` : `+${Math.abs(gapPp)}pp`,
        target: gapPp > 0 ? deriveCompetitorGapTarget(gapPp) : "maintain",
      });
    }
  }

  // Platform gaps
  const allGapDomains = Array.from(new Set(stages.flatMap((s) => s.gapDomains)));
  if (allGapDomains.length > 0) {
    const targetGaps = Math.max(1, Math.round(allGapDomains.length * 0.45));
    rows.push({
      metric: "Employer platform gaps",
      current: `${allGapDomains.length}`,
      target: `${targetGaps} or fewer`,
    });
  }

  // Positioning quality from discovery or eval
  const posStage = evalStage ?? discoveryStage;
  if (posStage) {
    const currentPos = positioningQualityLabel(posStage.positioning);
    const posTarget =
      posStage.positioning === "INVISIBLE" || posStage.positioning === "PERIPHERAL"
        ? "Contender+"
        : posStage.positioning === "CONTENDER"
          ? "Champion"
          : "maintain or improve";
    rows.push({
      metric: "Positioning quality",
      current: currentPos,
      target: posTarget,
    });
  }

  return rows;
}

function BaselineMetrics({
  meta,
  printMode,
}: {
  meta: JourneyMetadata;
  printMode: boolean;
}) {
  const rows = buildBaselineRows(meta);
  if (rows.length === 0) return null;

  return (
    <Section
      heading="Baseline Metrics"
      subtitle="Track these in the next assessment"
      printMode={printMode}
    >
      <div
        className="overflow-x-auto rounded"
        style={{ border: `1px solid ${BRAND_TOKENS.reportBorder}` }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BRAND_TOKENS.reportBorder}`, backgroundColor: BRAND_TOKENS.reportSurface }}>
              <th
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: BRAND_TOKENS.accentPrimary }}
              >
                Metric
              </th>
              <th
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: BRAND_TOKENS.accentPrimary }}
              >
                Current
              </th>
              <th
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: BRAND_TOKENS.accentPrimary }}
              >
                Target (next assessment)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: i < rows.length - 1 ? `1px solid ${BRAND_TOKENS.reportBorder}` : undefined }}
              >
                <td className="px-4 py-3 font-medium" style={{ color: BRAND_TOKENS.reportText }}>
                  {row.metric}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-700">
                  {row.current}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {row.target}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ─── Assessment Parameters block ─────────────────────────────

function AssessmentParametersBlock({
  params,
  printMode,
}: {
  params: NonNullable<JourneyMetadata["assessmentParameters"]>;
  printMode: boolean;
}) {
  const depthDescription: Record<string, string> = {
    "First Layer": "single query per topic, no follow-up actions taken",
    "Conversational": "follow-up queries within the same session",
    "Multi-Session": "separate sessions with different entry points",
  };

  const depthDetail = depthDescription[params.queryDepth] ?? params.queryDepth;

  return (
    <div
      className={`mb-6 ${printMode ? "pb-5" : "rounded-md px-5 py-4"}`}
      style={
        printMode
          ? {
              borderBottom: `1px solid ${BRAND_TOKENS.reportBorder}`,
            }
          : {
              backgroundColor: BRAND_TOKENS.reportSurface,
              border: `1px solid ${BRAND_TOKENS.reportBorder}`,
            }
      }
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: BRAND_TOKENS.accentPrimary }}
      >
        Assessment Parameters
      </p>
      <div
        className={`mt-3 grid gap-x-10 gap-y-1.5 text-sm ${
          printMode ? "grid-cols-2" : "sm:grid-cols-3"
        }`}
        style={{ color: printMode ? BRAND_TOKENS.reportText : "#4B5563" }}
      >
        <div>
          <span className="font-medium" style={{ color: BRAND_TOKENS.reportText }}>AI Model:</span>{" "}
          {params.aiModel}
        </div>
        <div>
          <span className="font-medium" style={{ color: BRAND_TOKENS.reportText }}>Query Depth:</span>{" "}
          {params.queryDepth}
          {depthDetail !== params.queryDepth && (
            <span className="text-gray-400">
              {" "}— {depthDetail}
            </span>
          )}
        </div>
        <div>
          <span className="font-medium" style={{ color: BRAND_TOKENS.reportText }}>Focus Area:</span>{" "}
          {params.focusArea}
        </div>
        <div>
          <span className="font-medium" style={{ color: BRAND_TOKENS.reportText }}>Queries Evaluated:</span>{" "}
          {params.queryCount} across {params.scanCount}{" "}
          {params.scanCount === 1 ? "scan" : "scans"}
        </div>
        <div>
          <span className="font-medium" style={{ color: BRAND_TOKENS.reportText }}>Assessment Date:</span>{" "}
          {params.assessmentDate}
        </div>
      </div>
    </div>
  );
}

// ─── Assessment Confidence callout ───────────────────────────
// Renders when multiRunAnalysis is present and has validated queries (>0).
// Single-run reports (all UNVALIDATED) render nothing — backward compatible.

type MultiRunAnalysis = NonNullable<JourneyMetadata["multiRunAnalysis"]>;

function AssessmentConfidenceCard({
  multiRunAnalysis,
  printMode,
}: {
  multiRunAnalysis: MultiRunAnalysis;
  printMode: boolean;
}) {
  const {
    validatedQueryCount,
    totalQueries,
    validationRate,
    stabilityDistribution,
    effectiveScanRunCount,
  } = multiRunAnalysis;

  // Only render when there is validated data to show
  if (validatedQueryCount === 0 || effectiveScanRunCount < 2) return null;

  const meetsThreshold = validationRate >= 0.7;
  const validatedPct = Math.round(validationRate * 100);

  return (
    <div
      className={`mb-6 rounded-lg p-5 ${printMode ? "break-inside-avoid" : ""}`}
      style={{
        border: `1px solid ${printMode ? BRAND_TOKENS.reportBorder : BRAND_TOKENS.accentPrimary + "33"}`,
        backgroundColor: printMode ? BRAND_TOKENS.reportBg : `${BRAND_TOKENS.accentPrimary}0A`,
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p
          className="text-sm font-semibold"
          style={{ color: BRAND_TOKENS.reportText }}
        >
          Assessment Confidence
        </p>
        {meetsThreshold ? (
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
              printMode
                ? "border border-green-400 text-green-800"
                : "bg-green-50 text-green-700"
            }`}
          >
            Cross-validated
          </span>
        ) : (
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
              printMode
                ? "border border-amber-400 text-amber-800"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            Partially validated
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{validatedQueryCount}</span>
        {" of "}
        <span className="font-semibold text-gray-900">{totalQueries}</span>
        {" "}
        {totalQueries === 1 ? "query" : "queries"} cross-validated across{" "}
        {effectiveScanRunCount} scan passes
      </p>

      {/* Stability distribution */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {(stabilityDistribution.STABLE_PRESENCE ?? 0) > 0 && (
          <StabilityCount
            stability="STABLE_PRESENCE"
            count={stabilityDistribution.STABLE_PRESENCE}
            printMode={printMode}
          />
        )}
        {(stabilityDistribution.VOLATILE_PRESENCE ?? 0) > 0 && (
          <StabilityCount
            stability="VOLATILE_PRESENCE"
            count={stabilityDistribution.VOLATILE_PRESENCE}
            printMode={printMode}
          />
        )}
        {(stabilityDistribution.STABLE_ABSENCE ?? 0) > 0 && (
          <StabilityCount
            stability="STABLE_ABSENCE"
            count={stabilityDistribution.STABLE_ABSENCE}
            printMode={printMode}
          />
        )}
      </div>

      {/* Threshold interpretation */}
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        {meetsThreshold
          ? "This assessment meets the cross-validation threshold for direct confidence assertions. Findings reflect consistent AI behavior across multiple scan passes."
          : `Partial validation — ${validatedPct}% of queries cross-validated. Findings reflect AI behavior as observed; repeat scan recommended for full cross-validation.`}
      </p>
    </div>
  );
}

// ─── Per-stage stability row ──────────────────────────────────
// Compact inline row appended after existing stage metrics when
// multiRunAnalysis stageSummaries contain matching stage data.

function StageStabilityRow({
  stageSummary,
  printMode,
}: {
  stageSummary: MultiRunAnalysis["stageSummaries"][number];
  printMode: boolean;
}) {
  const { stablePresence, volatilePresence, stableAbsence } = stageSummary;

  // Nothing to show if all queries are unvalidated (single-run report)
  const hasValidatedData = stablePresence + volatilePresence + stableAbsence > 0;
  if (!hasValidatedData) return null;

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pt-3"
      style={{ borderTop: `1px solid ${BRAND_TOKENS.reportBorder}` }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: BRAND_TOKENS.accentPrimary }}
      >
        Stability
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {stablePresence > 0 && (
          <span className="text-xs">
            <span
              className={`font-semibold ${printMode ? "text-gray-900" : "text-green-700"}`}
            >
              {stablePresence}
            </span>
            <span className="ml-1 text-gray-500">stable</span>
          </span>
        )}
        {volatilePresence > 0 && (
          <span className="text-xs">
            <span
              className={`font-semibold ${printMode ? "text-gray-700" : "text-amber-700"}`}
            >
              {volatilePresence}
            </span>
            <span className="ml-1 text-gray-500">volatile</span>
          </span>
        )}
        {stableAbsence > 0 && (
          <span className="text-xs">
            <span
              className={`font-semibold ${printMode ? "text-gray-900" : "text-red-700"}`}
            >
              {stableAbsence}
            </span>
            <span className="ml-1 text-gray-500">absent</span>
          </span>
        )}
      </span>
    </div>
  );
}

// ─── Segment header ──────────────────────────────────────────
// Prominent labeled divider rendered before each per-segment section when
// a report covers multiple talent segments.

const SEGMENT_TIER_LABELS: Record<string, string> = {
  strong: "Strong",
  moderate: "Moderate",
  weak: "Weak",
  invisible: "Invisible",
};

function SegmentHeader({
  segment,
  printMode,
}: {
  segment: SegmentData;
  printMode: boolean;
}) {
  const tier = segment.journeyAnalysis?.earnedVisibilityTier ?? "invisible";
  const earnedRate =
    segment.journeyAnalysis?.earnedVisibilityRate ??
    segment.journeyAnalysis?.stages?.find((s) => s.stage === "DISCOVERY")
      ?.mentionRate ??
    0;

  const primaryCompetitor =
    segment.competitors.find((c) => c.threatLevel === "Primary") ??
    segment.competitors[0];

  const topCompetitorLabel = primaryCompetitor
    ? (() => {
        const discStage = primaryCompetitor.stages.find(
          (s) => s.stage === "DISCOVERY",
        );
        const rate = discStage?.mentionRate ?? primaryCompetitor.overallRate;
        return `${primaryCompetitor.name} (${formatPct(rate)})`;
      })()
    : null;

  const tierLabel = SEGMENT_TIER_LABELS[tier.toLowerCase()] ?? tier;

  if (printMode) {
    return (
      <div
        className="mt-0 pt-6 break-before-page"
        style={{ borderTop: `2px solid ${BRAND_TOKENS.accentPrimary}` }}
      >
        <h2
          className="text-2xl font-bold uppercase tracking-wide"
          style={{ color: BRAND_TOKENS.reportText }}
        >
          {segment.name}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Earned discovery: {formatPct(earnedRate)} ({tierLabel})
          {topCompetitorLabel && (
            <> &middot; Top competitor: {topCompetitorLabel}</>
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg px-6 py-4"
      style={{
        border: `1px solid ${BRAND_TOKENS.accentPrimary}33`,
        backgroundColor: `${BRAND_TOKENS.accentPrimary}08`,
        borderLeft: `3px solid ${BRAND_TOKENS.accentPrimary}`,
      }}
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <h2
          className="text-xl font-bold"
          style={{ color: BRAND_TOKENS.reportText }}
        >
          {segment.name}
        </h2>
        <PositioningBadge
          tier={segment.journeyAnalysis?.overallPositioning ?? "PERIPHERAL"}
          size="md"
        />
      </div>
      <p className="mt-1.5 text-sm text-gray-600">
        <span>
          Earned discovery:{" "}
          <span
            className={`font-semibold ${
              earnedRate >= 0.3
                ? "text-green-700"
                : earnedRate >= 0.1
                  ? "text-amber-700"
                  : "text-red-700"
            }`}
          >
            {formatPct(earnedRate)}
          </span>{" "}
          ({tierLabel})
        </span>
        {topCompetitorLabel && (
          <span className="ml-3 text-gray-400">|</span>
        )}
        {topCompetitorLabel && (
          <span className="ml-3">
            Top competitor:{" "}
            <span className="font-medium text-gray-800">
              {topCompetitorLabel}
            </span>
          </span>
        )}
      </p>
    </div>
  );
}

// ─── Segment content ──────────────────────────────────────────
// Renders all journey sections for a single segment using the same
// section-rendering logic as the flat path.
//
// Constructs a JourneyMetadata-shaped object from SegmentData + clientName
// and feeds it into the flat render path inline, avoiding duplication.
// Defined in this file (not a separate import) to share private helpers.

interface SegmentContentProps {
  segment: SegmentData;
  clientName: string;
  printMode: boolean;
  evidencePanel?: (sectionHeading: string) => ReactNode;
}

function segmentToMeta(
  segment: SegmentData,
  clientName: string,
): JourneyMetadata {
  return {
    journeyAnalysis: segment.journeyAnalysis,
    clientName,
    clientOverallRate: segment.clientOverallRate,
    competitors: segment.competitors,
    remediationPlan: segment.remediationPlan,
    visibilityBoundary: segment.visibilityBoundary,
    overallThemes: segment.overallThemes,
    assessmentParameters: segment.assessmentParameters,
    // segments / crossSegmentSummary intentionally omitted — single-segment view
  };
}

function SegmentContent({
  segment,
  clientName,
  printMode,
  evidencePanel,
}: SegmentContentProps) {
  const segMeta = segmentToMeta(segment, clientName);

  return (
    <div className={printMode ? "mt-0" : "space-y-4"}>
      <SegmentHeader segment={segment} printMode={printMode} />
      {/* eslint-disable-next-line no-use-before-define */}
      {renderFlatPath(segMeta, printMode, evidencePanel, undefined, undefined)}
    </div>
  );
}

// ─── Flat-path render function ────────────────────────────────
// Renders the complete single-segment journey report layout.
// Called by JourneyReportRenderer (single/legacy reports) and by
// SegmentContent (one per segment in multi-segment reports).
//
// summaryBlock and summary are only meaningful for the top-level call;
// SegmentContent passes undefined for both.

function renderFlatPath(
  meta: JourneyMetadata,
  printMode: boolean,
  evidencePanel: ((sectionHeading: string) => ReactNode) | undefined,
  summaryBlock: ReactNode | undefined,
  summary: string | null | undefined,
  clientDomain?: string,
  clientIndustry?: string,
): JSX.Element {
  void summary; // accepted for API compat, not rendered directly
  void clientIndustry; // accepted for API compat — cover page no longer displays industry

  const { journeyAnalysis, clientName, clientOverallRate, competitors, remediationPlan } =
    meta;
  const { stages } = journeyAnalysis;
  const allRecs = remediationPlan.recommendations;

  // ── Multi-run stability data ───────────────────────────────────────────
  const multiRunAnalysis = meta.multiRunAnalysis ?? null;

  // Helper: look up stage summary from multiRunAnalysis by stage key
  function getStageSummary(stageName: string) {
    if (!multiRunAnalysis) return null;
    return multiRunAnalysis.stageSummaries.find((s) => s.stage === stageName) ?? null;
  }

  // Stability context for recommendations — derived from overall distribution
  // when multiRunAnalysis is present and has validated queries.
  const hasStabilityData =
    multiRunAnalysis !== null &&
    multiRunAnalysis.validatedQueryCount > 0 &&
    multiRunAnalysis.effectiveScanRunCount >= 2;

  const stableAbsenceCount = hasStabilityData
    ? (multiRunAnalysis?.stabilityDistribution.STABLE_ABSENCE ?? 0)
    : 0;
  const volatilePresenceCount = hasStabilityData
    ? (multiRunAnalysis?.stabilityDistribution.VOLATILE_PRESENCE ?? 0)
    : 0;

  // ── Section 0: Executive Decision Page ────────────────────────────────
  const decisionPage = (
    <ExecutiveDecisionPage meta={meta} printMode={printMode} />
  );

  // ── Section 1: Executive Summary ──────────────────────────────────────
  const execBullets = buildExecBullets(meta);

  const execSummarySection = (
    <Section
      heading="Executive Summary"
      printMode={printMode}
      evidencePanel={evidencePanel}
    >
      {summaryBlock ? (
        summaryBlock
      ) : (
        <ul className="space-y-2 text-sm leading-relaxed text-gray-700">
          {execBullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: BRAND_TOKENS.accentPrimary }}
              />
              <span>
                <strong style={{ color: BRAND_TOKENS.reportText }}>{bullet.bold}:</strong>{" "}
                {bullet.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );

  // ── Section 1.5: Methodology ───────────────────────────────────────────
  const methodologySection = meta.assessmentParameters ? (
    <MethodologySection
      assessmentParams={meta.assessmentParameters}
      clientName={clientName}
      printMode={printMode}
    />
  ) : null;

  // ── Section 2: Discovery Visibility ───────────────────────────────────
  const discoveryStage = stages.find((s) => s.stage === "DISCOVERY");
  const boundary = meta.visibilityBoundary;

  // Top competitor cited domains for "what good looks like"
  const primaryCompetitor = competitors.find((c) => c.threatLevel === "Primary") ?? competitors[0];
  const topCompetitorCitedDomains = discoveryStage?.citedDomains ?? [];

  // ── Per-section evidence basis computation ─────────────────────────────
  // Query counts per section are derived from the best available source:
  //   Discovery: sum from boundary rateByLevel (most accurate); fallback to
  //              total/stages estimate when boundary data is absent.
  //   Evaluation, Commitment, Citation Playbook: assessmentParameters.queryCount
  //              divided evenly among stages as a proxy (no per-stage count in
  //              the current type). Absent when assessmentParameters is missing.

  const totalQueryCount = meta.assessmentParameters?.queryCount ?? null;
  const stageCount = stages.length || 1;

  // Discovery query count
  let discoveryQueryCount: number;
  if (boundary) {
    discoveryQueryCount = Object.values(boundary.rateByLevel).reduce(
      (sum, l) => sum + l.queryCount,
      0,
    );
  } else if (totalQueryCount !== null) {
    discoveryQueryCount = Math.round(totalQueryCount / stageCount);
  } else {
    discoveryQueryCount = 0;
  }

  const discSourcedRate = discoveryStage?.sourcedRate ?? 0;
  const discSourcedCount = Math.round(discSourcedRate * discoveryQueryCount);

  const discoveryEvidenceBasis: Omit<SectionEvidenceBasisProps, "printMode"> | undefined =
    discoveryQueryCount > 0
      ? {
          queryCount: discoveryQueryCount,
          sourcedCount: discSourcedCount,
          sourcedRate: discSourcedRate,
          confidenceScore: deriveSectionConfidence(discoveryQueryCount, discSourcedRate),
        }
      : undefined;

  // Competitive Evaluation query count (EVALUATION + CONSIDERATION stages)
  const evaluationStageForBasis = stages.find((s) => s.stage === "EVALUATION");
  const considerationStageForBasis = stages.find((s) => s.stage === "CONSIDERATION");
  const evalStageCount =
    (evaluationStageForBasis ? 1 : 0) + (considerationStageForBasis ? 1 : 0) || 1;
  const evalQueryCount =
    totalQueryCount !== null
      ? Math.round((totalQueryCount / stageCount) * evalStageCount)
      : 0;
  // Weighted average sourced rate across evaluation + consideration
  const evalSourcedRates = [
    evaluationStageForBasis?.sourcedRate,
    considerationStageForBasis?.sourcedRate,
  ].filter((r): r is number => r !== undefined);
  const evalSourcedRate =
    evalSourcedRates.length > 0
      ? evalSourcedRates.reduce((a, b) => a + b, 0) / evalSourcedRates.length
      : 0;
  const evalSourcedCount = Math.round(evalSourcedRate * evalQueryCount);

  const evaluationEvidenceBasis: Omit<SectionEvidenceBasisProps, "printMode"> | undefined =
    evalQueryCount > 0
      ? {
          queryCount: evalQueryCount,
          sourcedCount: evalSourcedCount,
          sourcedRate: evalSourcedRate,
          confidenceScore: deriveSectionConfidence(evalQueryCount, evalSourcedRate),
        }
      : undefined;

  // Candidate Commitment query count (COMMITMENT stage)
  const commitmentStageForBasis = stages.find((s) => s.stage === "COMMITMENT");
  const commitQueryCount =
    totalQueryCount !== null ? Math.round(totalQueryCount / stageCount) : 0;
  const commitSourcedRate = commitmentStageForBasis?.sourcedRate ?? 0;
  const commitSourcedCount = Math.round(commitSourcedRate * commitQueryCount);

  const commitmentEvidenceBasis: Omit<SectionEvidenceBasisProps, "printMode"> | undefined =
    commitQueryCount > 0
      ? {
          queryCount: commitQueryCount,
          sourcedCount: commitSourcedCount,
          sourcedRate: commitSourcedRate,
          confidenceScore: deriveSectionConfidence(commitQueryCount, commitSourcedRate),
        }
      : undefined;

  // Citation Playbook — aggregate across all stages
  const playbookQueryCount = totalQueryCount ?? 0;
  const allSourcedRates = stages
    .map((s) => s.sourcedRate)
    .filter((r): r is number => r !== undefined);
  const playbookSourcedRate =
    allSourcedRates.length > 0
      ? allSourcedRates.reduce((a, b) => a + b, 0) / allSourcedRates.length
      : 0;
  const playbookSourcedCount = Math.round(playbookSourcedRate * playbookQueryCount);

  const citationPlaybookEvidenceBasis: Omit<SectionEvidenceBasisProps, "printMode"> | undefined =
    playbookQueryCount > 0
      ? {
          queryCount: playbookQueryCount,
          sourcedCount: playbookSourcedCount,
          sourcedRate: playbookSourcedRate,
          confidenceScore: deriveSectionConfidence(playbookQueryCount, playbookSourcedRate),
        }
      : undefined;
  // ── End evidence basis computation ────────────────────────────────────

  const discoveryCloseOut = buildDiscoveryCloseOut(meta, allRecs);

  const discoverySection = (
    <Section
      heading="Discovery Visibility"
      subtitle="How candidates find you (or don't) when they haven't heard of you yet"
      printMode={printMode}
      evidencePanel={evidencePanel}
      evidenceBasis={discoveryEvidenceBasis}
    >
      {boundary ? (
        <div className="space-y-3">
          {SPECIFICITY_ORDER.map((level) => {
            const stats = boundary.rateByLevel[level];
            if (stats.queryCount === 0) return null;
            // Show a note for levels with insufficient data instead of a full card
            if (stats.queryCount < 3) {
              return (
                <p key={level} className="text-xs text-gray-400 italic">
                  {SPECIFICITY_LABELS[level]} discovery: insufficient data ({stats.queryCount} quer{stats.queryCount === 1 ? "y" : "ies"} tested — minimum 3 required for findings).
                </p>
              );
            }

            return (
              <DiscoveryLevelCard
                key={level}
                level={level}
                rate={stats.rate}
                queryCount={stats.queryCount}
                clientName={clientName}
                clientAppears={stats.rate > 0}
                competitorBoundaries={boundary.competitorBoundaries}
                gapDomains={discoveryStage?.gapDomains ?? []}
                narrative={
                  level === boundary.firstAppearsAt
                    ? boundary.boundaryNarrative
                    : undefined
                }
                recs={getDiscoveryRecsForLevel(allRecs, level)}
                printMode={printMode}
                topCompetitor={discoveryStage?.topCompetitor}
                topCompetitorCitedDomains={topCompetitorCitedDomains}
                sourcedRate={discoveryStage?.sourcedRate}
              />
            );
          })}
        </div>
      ) : discoveryStage ? (
        /* Fallback: no boundary data, show overall Discovery stage */
        <div className="space-y-3">
          <div
            className="rounded-lg p-5"
            style={{
              border: `1px solid ${BRAND_TOKENS.reportBorder}`,
              backgroundColor: BRAND_TOKENS.reportBg,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4
                  className="text-base font-semibold"
                  style={{ color: BRAND_TOKENS.reportText }}
                >
                  Overall Discovery
                </h4>
                <p className="mt-0.5 text-xs text-gray-400">
                  {discoveryStage.description}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span>
                <span className="text-gray-500">Earned mention rate: </span>
                <span className={mentionRateColorClass(discoveryStage.mentionRate, printMode)}>
                  {formatPct(discoveryStage.mentionRate)}
                </span>
              </span>
              <span className="text-gray-300">|</span>
              {printMode ? (
                <PositioningBadgePrint tier={discoveryStage.positioning} />
              ) : (
                <PositioningBadge tier={discoveryStage.positioning} />
              )}
              {discoveryStage.sourcedRate !== undefined && (
                <>
                  <span className="text-gray-200">|</span>
                  <SourceQualityBadge sourcedRate={discoveryStage.sourcedRate} printMode={printMode} />
                </>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-700">
              {discoveryStage.narrative}
            </p>

            {/* Enriched competitor callout */}
            {discoveryStage.topCompetitor && (() => {
              const enriched = buildCompetitorWhatGoodLooksLike(
                discoveryStage.topCompetitor.name,
                discoveryStage.topCompetitor.mentionRate,
                discoveryStage.citedDomains,
                clientName,
              );
              const callout = enriched ?? discoveryStage.competitorCallout;
              return callout ? (
                <div
                  className="mt-4 rounded px-4 py-3 text-sm text-gray-700"
                  style={{
                    borderLeft: `2px solid ${BRAND_TOKENS.accentPrimary}66`,
                    backgroundColor: BRAND_TOKENS.reportSurface,
                  }}
                >
                  {enriched && (
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                      style={{ color: BRAND_TOKENS.accentPrimary }}
                    >
                      What good looks like
                    </p>
                  )}
                  {callout}
                </div>
              ) : null;
            })()}

            {discoveryStage.themes && (
              <ThemeInsights
                themes={discoveryStage.themes}
                clientName={clientName}
                printMode={printMode}
              />
            )}

            <InlineRecommendations
              recs={allRecs.filter((r) => r.stage === "DISCOVERY")}
              printMode={printMode}
            />
          </div>
        </div>
      ) : null}

      {/* Per-stage stability — only when multi-run data is available */}
      {(() => {
        const discSummary = getStageSummary("DISCOVERY");
        return discSummary ? (
          <StageStabilityRow stageSummary={discSummary} printMode={printMode} />
        ) : null;
      })()}

      <SectionCloseOut
        whatThisMeans={discoveryCloseOut.whatThisMeans}
        whatToDoNext={discoveryCloseOut.whatToDoNext}
        howToMeasure={discoveryCloseOut.howToMeasure}
        printMode={printMode}
      />
    </Section>
  );

  // ── Section 3: Competitive Evaluation ─────────────────────────────────
  const evaluationStage = stages.find((s) => s.stage === "EVALUATION");
  const considerationStage = stages.find((s) => s.stage === "CONSIDERATION");

  const evalGapDomains = Array.from(new Set([
    ...(evaluationStage?.gapDomains ?? []),
    ...(considerationStage?.gapDomains ?? []),
  ]));
  const compensationGapDomains = filterDomainsByKeywords(evalGapDomains, COMPENSATION_DOMAINS);
  const cultureGapDomains = filterDomainsByKeywords(evalGapDomains, CULTURE_DOMAINS);

  const clientStages = stages.map((s) => ({
    stage: s.stage,
    mentionRate: s.mentionRate,
    positioning: s.positioning,
  }));

  // Competitor cited domains for evaluation callouts
  const evalCompetitorCitedDomains = evaluationStage?.citedDomains ?? considerationStage?.citedDomains ?? [];

  const evaluationCloseOut = buildEvaluationCloseOut(meta, allRecs);

  const evaluationSection = (
    <Section
      heading="Competitive Evaluation"
      subtitle="How candidates compare you against alternatives"
      printMode={printMode}
      evidencePanel={evidencePanel}
      evidenceBasis={evaluationEvidenceBasis}
    >
      <div className="space-y-3">
        <EvaluationSubsectionCard
          heading="Compensation Comparison"
          description="How does the company fare in salary and compensation queries?"
          narrative={
            evaluationStage?.narrative
              ? extractCompensationNarrative(evaluationStage.narrative)
              : considerationStage?.narrative
                ? extractCompensationNarrative(considerationStage.narrative)
                : evaluationStage
                  ? `${clientName} appears in ${formatPct(evaluationStage.mentionRate)} of evaluation-stage queries. No compensation-specific narrative was extracted from this assessment.`
                  : ""
          }
          mentionRate={evaluationStage?.mentionRate}
          positioning={evaluationStage?.positioning}
          gapDomains={compensationGapDomains}
          recs={getEvaluationRecs(allRecs, "compensation")}
          printMode={printMode}
          competitorCallout={evaluationStage?.competitorCallout}
          competitorCitedDomains={evalCompetitorCitedDomains}
          clientName={clientName}
          themes={evaluationStage?.themes}
          sourcedRate={evaluationStage?.sourcedRate}
        />

        <EvaluationSubsectionCard
          heading="Culture & Work-Life Comparison"
          description="How does the company appear in culture, values, and work-life balance queries?"
          narrative={
            considerationStage?.narrative
              ? extractCultureNarrative(considerationStage.narrative)
              : considerationStage
                ? `${clientName} is positioned as ${positioningQualityLabel(considerationStage.positioning).toLowerCase()} at the consideration stage. No culture-specific narrative was extracted from this assessment.`
                : ""
          }
          positioning={considerationStage?.positioning}
          gapDomains={cultureGapDomains}
          recs={getEvaluationRecs(allRecs, "culture")}
          printMode={printMode}
          competitorCallout={considerationStage?.competitorCallout}
          competitorCitedDomains={evalCompetitorCitedDomains}
          clientName={clientName}
          themes={considerationStage?.themes}
          sourcedRate={considerationStage?.sourcedRate}
        />

        {competitors.length > 0 && (
          <Subsection heading="Competitive Positioning Matrix" printMode={printMode}>
            <p className="mb-3 text-sm leading-relaxed text-gray-700">
              Competitive visibility in AI is not uniform. A competitor may
              dominate Discovery but fade at Commitment. The matrix below maps
              where each competitor wins and loses.
            </p>
            <CompetitorMatrix
              client={clientName}
              clientStages={clientStages}
              clientOverallRate={clientOverallRate}
              competitors={competitors}
              printMode={printMode}
            />

            {/* Earned-stage comparison table (Discovery + Evaluation only) */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Earned Visibility Comparison
              </p>
              <p className="mb-3 text-sm leading-relaxed text-gray-700">
                The table below focuses on earned visibility — the stages where
                candidates discover and evaluate employers without naming them
                directly.
              </p>
              <CompetitorComparisonTable
                clientName={clientName}
                clientDiscoveryRate={discoveryStage?.mentionRate ?? 0}
                clientEvaluationRate={evaluationStage?.mentionRate ?? 0}
                clientOverallRate={
                  meta.journeyAnalysis.earnedVisibilityRate ??
                  ((discoveryStage?.mentionRate ?? 0) + (evaluationStage?.mentionRate ?? 0)) / 2
                }
                clientSentiment="neutral"
                competitors={competitors.map((c) => {
                  const disc = c.stages.find((s) => s.stage === "DISCOVERY");
                  const eval_ = c.stages.find((s) => s.stage === "EVALUATION");
                  const discoveryRate = disc?.mentionRate ?? 0;
                  const evaluationRate = eval_?.mentionRate ?? 0;
                  return {
                    name: c.name,
                    discoveryRate,
                    evaluationRate,
                    overallRate: (discoveryRate + evaluationRate) / 2,
                    sentiment: "neutral",
                    threatLevel: c.threatLevel,
                  };
                })}
                printMode={printMode}
              />
            </div>

            {/* Per-theme competitor rates — shows which competitor dominates which theme */}
            {meta.themeCompetitorRates && meta.themeCompetitorRates.length > 0 && (
              <div
                className="mt-4 rounded-lg p-4"
                style={{
                  border: `1px solid ${printMode ? BRAND_TOKENS.reportBorder : BRAND_TOKENS.accentPrimary + "33"}`,
                  backgroundColor: printMode ? BRAND_TOKENS.reportBg : `${BRAND_TOKENS.accentPrimary}08`,
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-2"
                  style={{ color: BRAND_TOKENS.accentPrimary }}
                >
                  Theme-specific competitive gaps
                </p>
                <div className="space-y-1.5">
                  {meta.themeCompetitorRates
                    .filter((t) => t.topCompetitor.rate > t.mentionRate && t.topCompetitor.name)
                    .sort((a, b) => (b.topCompetitor.rate - b.mentionRate) - (a.topCompetitor.rate - a.mentionRate))
                    .slice(0, 4)
                    .map((t) => (
                      <p key={t.theme} className="text-sm text-gray-700">
                        <span className="font-semibold">{t.topCompetitor.name}</span>{" "}
                        beats {clientName} on{" "}
                        <span className="font-medium">{t.theme}</span>{" "}
                        queries ({formatPct(t.topCompetitor.rate)} vs {formatPct(t.mentionRate)})
                      </p>
                    ))}
                </div>
              </div>
            )}
            <InlineRecommendations
              recs={getEvaluationRecs(allRecs, "competitive")}
              printMode={printMode}
            />
          </Subsection>
        )}
      </div>

      {/* Per-stage stability — combines EVALUATION and CONSIDERATION counts */}
      {(() => {
        const evalSummary = getStageSummary("EVALUATION");
        const considSummary = getStageSummary("CONSIDERATION");
        if (!evalSummary && !considSummary) return null;
        // Merge the two stage summaries into one combined view
        const combined = {
          stage: "EVALUATION",
          totalQueries: (evalSummary?.totalQueries ?? 0) + (considSummary?.totalQueries ?? 0),
          stablePresence: (evalSummary?.stablePresence ?? 0) + (considSummary?.stablePresence ?? 0),
          volatilePresence: (evalSummary?.volatilePresence ?? 0) + (considSummary?.volatilePresence ?? 0),
          stableAbsence: (evalSummary?.stableAbsence ?? 0) + (considSummary?.stableAbsence ?? 0),
          unvalidated: (evalSummary?.unvalidated ?? 0) + (considSummary?.unvalidated ?? 0),
          avgMentionRate: evalSummary?.avgMentionRate ?? considSummary?.avgMentionRate ?? 0,
        };
        return <StageStabilityRow stageSummary={combined} printMode={printMode} />;
      })()}

      <SectionCloseOut
        whatThisMeans={evaluationCloseOut.whatThisMeans}
        whatToDoNext={evaluationCloseOut.whatToDoNext}
        howToMeasure={evaluationCloseOut.howToMeasure}
        printMode={printMode}
      />
    </Section>
  );

  // ── Section 4: Candidate Commitment ───────────────────────────────────
  const commitmentStage = stages.find((s) => s.stage === "COMMITMENT");
  const commitGapDomains = commitmentStage?.gapDomains ?? [];

  const commitmentCloseOut = buildCommitmentCloseOut(meta, allRecs);

  const commitmentSection = (
    <Section
      heading="Candidate Commitment"
      subtitle="What candidates find when they are ready to act"
      printMode={printMode}
      evidencePanel={evidencePanel}
      evidenceBasis={commitmentEvidenceBasis}
    >
      <div className="space-y-3">
        <CommitmentSubsectionCard
          heading="Interview Process"
          description="What does AI say about the interview and hiring process?"
          narrative={
            commitmentStage?.narrative
              ? extractInterviewNarrative(commitmentStage.narrative)
              : commitmentStage
                ? `${clientName}'s commitment-stage positioning is ${positioningQualityLabel(commitmentStage.positioning).toLowerCase()}. No interview-specific narrative was extracted from this assessment.`
                : ""
          }
          positioning={commitmentStage?.positioning}
          gapDomains={filterDomainsByKeywords(commitGapDomains, INTERVIEW_DOMAINS)}
          recs={getCommitmentRecs(allRecs, "interview")}
          printMode={printMode}
        />

        <CommitmentSubsectionCard
          heading="Compensation Details"
          description="What salary and benefits information is available when candidates are ready to decide?"
          narrative={
            commitmentStage
              ? `${clientName}'s commitment-stage positioning is ${positioningQualityLabel(commitmentStage.positioning).toLowerCase()}. No compensation-detail narrative was extracted from this assessment.`
              : ""
          }
          positioning={commitmentStage?.positioning}
          gapDomains={filterDomainsByKeywords(commitGapDomains, COMPENSATION_DOMAINS)}
          recs={getCommitmentRecs(allRecs, "compensation_details")}
          printMode={printMode}
        />

        <CommitmentSubsectionCard
          heading="Application & Onboarding"
          description="Is there enough information to encourage applications?"
          narrative={
            commitmentStage?.citationContext
              ? `${commitmentStage.citationContext}. The availability of application-oriented content determines whether AI can guide candidates toward ${clientName}.`
              : commitmentStage
                ? `No application-specific citation context was extracted for ${clientName} at the commitment stage. Review the gap domains above for platforms that could improve AI guidance for candidates ready to apply.`
                : ""
          }
          positioning={commitmentStage?.positioning}
          gapDomains={commitGapDomains.filter(
            (d) =>
              !COMPENSATION_DOMAINS.some((cd) => d.toLowerCase().includes(cd.toLowerCase())) &&
              !INTERVIEW_DOMAINS.some((id) => d.toLowerCase().includes(id.toLowerCase())),
          )}
          recs={getCommitmentRecs(allRecs, "application")}
          printMode={printMode}
        />
      </div>

      {/* Per-stage stability — Commitment stage */}
      {(() => {
        const commitSummary = getStageSummary("COMMITMENT");
        return commitSummary ? (
          <StageStabilityRow stageSummary={commitSummary} printMode={printMode} />
        ) : null;
      })()}

      <SectionCloseOut
        whatThisMeans={commitmentCloseOut.whatThisMeans}
        whatToDoNext={commitmentCloseOut.whatToDoNext}
        howToMeasure={commitmentCloseOut.howToMeasure}
        printMode={printMode}
      />
    </Section>
  );

  // ── Section 5: Citation Playbook ──────────────────────────────────────
  const hasAnyGaps = stages.some((s) => s.gapDomains.length > 0);
  const hasAnyCited = stages.some((s) => s.citedDomains.length > 0);

  const citationSection = (hasAnyGaps || hasAnyCited) && (
    <Section
      heading="Citation Playbook"
      subtitle="What sources shape AI's answers about you — and what to do about it"
      printMode={printMode}
      evidencePanel={evidencePanel}
      evidenceBasis={citationPlaybookEvidenceBasis}
    >
      <CitationPlaybook stages={stages} printMode={printMode} />
    </Section>
  );

  // ── Section 6: Baseline Metrics ────────────────────────────────────────
  const baselineSection = <BaselineMetrics meta={meta} printMode={printMode} />;

  // ── Section 6b: Progress Since Last Assessment ─────────────────────────
  // Rendered only when a previous baseline exists (comparison computed at report generation).
  const baselineComparisonSection = meta.baselineComparison ? (
    <BaselineComparisonSection
      comparison={meta.baselineComparison}
      printMode={printMode}
    />
  ) : null;

  // ── Section 7: Recommended Actions (full sequenced timeline) ──────────
  const sequencedAllRecs = buildRecSequencing(allRecs);

  const remediationSection = allRecs.length > 0 && (
    <Section
      heading="Recommended Actions"
      subtitle="Prioritized remediation timeline"
      printMode={printMode}
      evidencePanel={evidencePanel}
    >
      {(remediationPlan.criticalCount > 0 ||
        remediationPlan.highCount > 0) && (
        <div
          className="mb-4 rounded px-4 py-3 text-sm"
          style={{
            border: `1px solid ${BRAND_TOKENS.reportBorder}`,
            backgroundColor: BRAND_TOKENS.reportSurface,
          }}
        >
          <span className="text-gray-600">
            {allRecs.length} prioritized recommendation{allRecs.length !== 1 ? "s" : ""}
          </span>
          {remediationPlan.criticalCount > 0 && (
            <span className="ml-2 inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              {remediationPlan.criticalCount} Critical
            </span>
          )}
          {remediationPlan.highCount > 0 && (
            <span className="ml-2 inline-flex items-center rounded bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
              {remediationPlan.highCount} High
            </span>
          )}
        </div>
      )}

      {/* Stability-aware context — only shown when cross-validation data exists */}
      {hasStabilityData && (stableAbsenceCount > 0 || volatilePresenceCount > 0) && (
        <div
          className="mb-4 rounded px-4 py-3 text-sm text-gray-700"
          style={{
            borderLeft: `2px solid ${BRAND_TOKENS.accentPrimary}66`,
            backgroundColor: BRAND_TOKENS.reportSurface,
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: BRAND_TOKENS.accentPrimary }}
          >
            Stability context
          </p>
          {volatilePresenceCount > 0 && (
            <p className="leading-relaxed">
              <span className={`font-semibold ${printMode ? "text-gray-900" : "text-amber-700"}`}>
                {volatilePresenceCount} volatile
              </span>
              {" "}
              {volatilePresenceCount === 1 ? "query" : "queries"} show inconsistent AI mentions — recommendations in this tier address content optimization needed to stabilize presence.
            </p>
          )}
          {stableAbsenceCount > 0 && (
            <p className={`leading-relaxed ${volatilePresenceCount > 0 ? "mt-1" : ""}`}>
              <span className={`font-semibold ${printMode ? "text-gray-900" : "text-red-700"}`}>
                {stableAbsenceCount} persistent absence
              </span>
              {" "}
              {stableAbsenceCount === 1 ? "gap" : "gaps"} confirmed across multiple scan passes — structural content intervention is required; incremental improvements will not close these gaps.
            </p>
          )}
        </div>
      )}

      <EffortImpactMatrix
        recommendations={allRecs}
        printMode={printMode}
      />

      <div className="space-y-4">
        {sequencedAllRecs.map((rec) => (
          <RecommendationCard
            key={rec.id}
            id={rec.id}
            stage={rec.stage}
            priority={rec.priority}
            title={rec.title}
            summary={rec.summary}
            whyItMatters={rec.whyItMatters}
            targetPlatforms={rec.targetPlatforms}
            actions={rec.actions}
            evidenceBasis={rec.evidenceBasis}
            expectedImpact={rec.expectedImpact}
            effort={rec.effort}
            timeframe={rec.timeframe}
            whyNow={rec.whyNow}
            doBefore={rec.doBefore}
            doAfter={rec.doAfter}
            printMode={printMode}
          />
        ))}
      </div>
    </Section>
  );

  // Suppress unused variable warning — primaryCompetitor used in decisionPage derivation
  void primaryCompetitor;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={printMode ? "space-y-0" : "space-y-6"}>
      {/* Cover page — full-bleed dark identity page, always first */}
      <CoverPage
        clientName={meta.clientName}
        clientDomain={clientDomain ?? undefined}
        reportDate={
          meta.assessmentParameters?.assessmentDate ?? new Date()
        }
      />

      {/* Executive summary card — situation, key findings, top recommendation */}
      <ExecutiveSummaryCard
        meta={meta}
        printMode={printMode}
      />

      {meta.assessmentParameters && (
        <AssessmentParametersBlock
          params={meta.assessmentParameters}
          printMode={printMode}
        />
      )}

      {/* Assessment Confidence — only when multi-run validation data exists */}
      {multiRunAnalysis && (
        <AssessmentConfidenceCard
          multiRunAnalysis={multiRunAnalysis}
          printMode={printMode}
        />
      )}

      {decisionPage}
      {execSummarySection}
      {methodologySection}
      {discoverySection}
      {evaluationSection}
      {commitmentSection}
      {citationSection}
      {baselineSection}
      {baselineComparisonSection}
      {remediationSection}

      <ReportFooter clientName={meta.clientName} />
    </div>
  );
}

// ─── Report footer ───────────────────────────────────────────
// Screen: subtle bottom bar. Print: fixed footer via @page margin area.

function ReportFooter({ clientName }: { clientName: string }) {
  return (
    <>
      {/* Print-only CSS for repeating page footer */}
      <style>{`
        @media print {
          .report-page-footer {
            display: none;
          }
          @page {
            margin-bottom: 0.7in;
          }
        }
      `}</style>

      {/* Screen footer */}
      <div
        className="report-page-footer mt-12 flex items-center justify-between border-t px-2 py-4 text-xs"
        style={{
          borderColor: BRAND_TOKENS.reportBorder,
          color: "#9CA3AF",
        }}
      >
        <span className="flex items-center gap-2">
          <img
            src="/logo-mark.svg"
            alt=""
            style={{ width: "16px", height: "16px", opacity: 0.4 }}
          />
          <span>Antellion</span>
          <span style={{ color: BRAND_TOKENS.reportBorder }}>&middot;</span>
          <span>AI Employer Visibility Assessment</span>
        </span>
        <span>Confidential &mdash; {clientName}</span>
      </div>
    </>
  );
}

// ─── Main renderer ───────────────────────────────────────────

export function JourneyReportRenderer({
  meta,
  summary,
  printMode = false,
  evidencePanel,
  summaryBlock,
  clientDomain,
  clientIndustry,
}: JourneyReportRendererProps) {
  // ── Segment detection ──────────────────────────────────────────────────
  // When the report was generated from 2+ distinct focusArea groups, render
  // a cross-segment overview followed by per-segment sections.
  // When segments are absent or singular, the flat path runs unchanged.

  const hasSegments = meta.segments != null && meta.segments.length > 1;

  if (hasSegments && meta.crossSegmentSummary) {
    const { segments, crossSegmentSummary, clientName: segClientName } = meta;

    return (
      <div className={printMode ? "space-y-0" : "space-y-6"}>
        {/* Cover page — first in render order */}
        <CoverPage
          clientName={segClientName}
          clientDomain={clientDomain ?? undefined}
          reportDate={
            meta.assessmentParameters?.assessmentDate ?? new Date()
          }
        />

        {/* Executive summary card — second in render order */}
        <ExecutiveSummaryCard
          meta={meta}
          printMode={printMode}
        />

        {/* Assessment parameters from overall (blended) metadata */}
        {meta.assessmentParameters && (
          <AssessmentParametersBlock
            params={meta.assessmentParameters}
            printMode={printMode}
          />
        )}

        {/* Cross-segment executive overview */}
        <CrossSegmentSummaryBlock
          crossSegment={crossSegmentSummary}
          segments={segments!}
          clientName={segClientName}
          printMode={printMode}
        />

        {/* Progress since last assessment — shown at client level for multi-segment reports */}
        {meta.baselineComparison && (
          <BaselineComparisonSection
            comparison={meta.baselineComparison}
            printMode={printMode}
          />
        )}

        {/* Per-segment sections, each preceded by its own segment header */}
        {segments!.map((segment) => (
          <SegmentContent
            key={segment.name}
            segment={segment}
            clientName={segClientName}
            printMode={printMode}
            evidencePanel={evidencePanel}
          />
        ))}

        <ReportFooter clientName={segClientName} />
      </div>
    );
  }

  // ── Flat path: single-segment or legacy reports ────────────────────────
  return renderFlatPath(
    meta,
    printMode,
    evidencePanel,
    summaryBlock,
    summary,
    clientDomain ?? undefined,
    clientIndustry ?? undefined,
  );
}
