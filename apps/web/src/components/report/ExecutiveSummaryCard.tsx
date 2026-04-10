/**
 * ExecutiveSummaryCard
 *
 * The first white-background page of the report. Designed to be the single
 * screen a VP can skim in thirty seconds and forward to their team.
 *
 * Structure (exactly three blocks):
 *   1. Situation         — one paragraph, specific numbers, no hedging
 *   2. Key Findings      — three bullets ranked by a compelling score
 *   3. Top Recommendation — one action pulled from the remediation plan
 *
 * Ranking formula for findings:
 *   compellingScore = confidence * normalizedSample * gapMagnitude * sourcedRate
 *   normalizedSample = min(log(sampleSize) / log(50), 1)
 *
 * Backwards compatible: accepts the same (meta, executiveSummaryProse, printMode)
 * props the JourneyReportRenderer already passes. When LLM prose is present it
 * replaces the template-derived Situation and Top Recommendation text.
 */

import { BRAND_TOKENS } from "@antellion/core";
import type { JourneyMetadata, JourneyStageData } from "./journey-types";

interface ExecutiveSummaryCardProps {
  meta: JourneyMetadata;
  /**
   * Optional LLM-generated prose. When present, replaces the template-driven
   * situation and topRecommendation strings.
   */
  executiveSummaryProse?: {
    situation: string;
    topRecommendation: string;
  } | null;
  printMode?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function confidenceScore(c: string | undefined): number {
  if (c === "HIGH") return 1;
  if (c === "MEDIUM") return 0.7;
  if (c === "LOW") return 0.4;
  return 0.6; // unknown — middle default
}

function stageSampleSize(
  stage: JourneyStageData,
  meta: JourneyMetadata,
): number {
  // Prefer authoritative per-stage totals from multi-run analysis.
  const multiRun = meta.multiRunAnalysis?.stageSummaries?.find(
    (s) => s.stage === stage.stage,
  );
  if (multiRun && multiRun.totalQueries > 0) return multiRun.totalQueries;

  // Fall back to an even split of the overall query count.
  const total = meta.assessmentParameters?.queryCount ?? 0;
  if (total > 0) return Math.max(1, Math.round(total / 4));

  return 1;
}

// ─── Situation text ──────────────────────────────────────────

function deriveSituationText(meta: JourneyMetadata): string {
  const { journeyAnalysis, clientName } = meta;
  const { stages, criticalGapStage } = journeyAnalysis;

  // Pick the critical gap stage if set, else the lowest mention rate stage.
  const gapStage: JourneyStageData | undefined =
    stages.find((s) => s.stage === criticalGapStage) ??
    [...stages].sort((a, b) => a.mentionRate - b.mentionRate)[0];

  if (!gapStage) {
    return `${clientName} has insufficient stage-level data for this assessment.`;
  }

  const stageLabel = gapStage.label;
  const clientRate = gapStage.mentionRate;
  const topCompetitor = gapStage.topCompetitor;

  if (!topCompetitor) {
    return `Candidates researching ${clientName} as an employer encounter a significant gap at the ${stageLabel} stage, where ${clientName} appears in ${pct(clientRate)} of AI-generated responses. The gap has downstream consequences for every stage that follows.`;
  }

  return `Candidates researching ${clientName} as an employer encounter a significant gap at the ${stageLabel} stage. At current visibility levels, ${pct(clientRate)} of AI-generated responses include ${clientName} at this stage, compared to ${pct(topCompetitor.mentionRate)} for ${topCompetitor.name}. The gap has downstream consequences for every stage that follows.`;
}

// ─── Key findings (3, ranked by compelling score) ────────────

interface RankedFinding {
  text: string;
  score: number;
}

function deriveKeyFindings(meta: JourneyMetadata): string[] {
  const { stages } = meta.journeyAnalysis;

  const ranked: RankedFinding[] = stages
    .map((stage) => {
      const confidence = confidenceScore(stage.confidence);
      const sample = stageSampleSize(stage, meta);
      const normalizedSample = Math.min(
        Math.log(Math.max(sample, 1)) / Math.log(50),
        1,
      );
      // gapMagnitude in [0,1] — percentage points divided by 100, capped.
      const gapMagnitude = Math.min(
        Math.max(Math.abs(stage.gapVsTopCompetitor) / 100, 0),
        1,
      );
      const sourcedRate = stage.sourcedRate ?? 0.5;

      const compellingScore =
        confidence * normalizedSample * gapMagnitude * sourcedRate;

      return {
        text: formatFindingSentence(stage, meta.clientName),
        score: compellingScore,
      };
    })
    .filter((f) => f.text.length > 0)
    .sort((a, b) => b.score - a.score);

  // Take up to 3. If ranking is degenerate (all zero-score), fall back to
  // stages ordered by gap magnitude so the section is never empty.
  const top3 =
    ranked.some((r) => r.score > 0)
      ? ranked.slice(0, 3)
      : stages
          .slice()
          .sort(
            (a, b) =>
              Math.abs(b.gapVsTopCompetitor) - Math.abs(a.gapVsTopCompetitor),
          )
          .slice(0, 3)
          .map((s) => ({
            text: formatFindingSentence(s, meta.clientName),
            score: 0,
          }));

  return top3.map((f) => f.text).filter((t) => t.length > 0);
}

/**
 * One sentence, present tense, specific number, no hedging, no lead-in.
 */
function formatFindingSentence(
  stage: JourneyStageData,
  clientName: string,
): string {
  const label = stage.label;
  const rate = pct(stage.mentionRate);
  const top = stage.topCompetitor;

  if (top && stage.gapVsTopCompetitor > 0) {
    return `${label} visibility sits at ${rate} for ${clientName} against ${pct(top.mentionRate)} for ${top.name}.`;
  }
  if (top) {
    return `${label} visibility reaches ${rate}, level with or ahead of ${top.name} at ${pct(top.mentionRate)}.`;
  }
  return `${label} visibility reaches ${rate} across tested queries.`;
}

// ─── Top recommendation ──────────────────────────────────────

interface TopRecommendationOutput {
  platform: string;
  sentence: string;
  timeframeLine: string;
}

function deriveTopRecommendation(
  meta: JourneyMetadata,
): TopRecommendationOutput | null {
  const { recommendations } = meta.remediationPlan;
  if (recommendations.length === 0) return null;

  const priorityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const sorted = [...recommendations].sort(
    (a, b) =>
      priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
  );
  const top = sorted[0];

  const platform =
    top.targetPlatforms && top.targetPlatforms.length > 0
      ? top.targetPlatforms[0]
      : top.title;

  const sentence = `${top.whyItMatters}`;
  const timeframeLine = formatTimeframeLine(top.timeframe);

  return { platform, sentence, timeframeLine };
}

/**
 * Convert a timeframe string into a one-line "Addressable in X weeks." note.
 * - "90 days" -> "Addressable in ~13 weeks."
 * - "30 days" -> "Addressable in ~4 weeks."
 * - "ongoing" -> "Ongoing initiative."
 * - anything else starting with a number/duration -> parsed or passed through.
 */
function formatTimeframeLine(timeframe: string | undefined): string {
  if (!timeframe) return "Addressable in the coming weeks.";
  const trimmed = timeframe.trim().toLowerCase();
  if (trimmed === "" || trimmed === "unknown") {
    return "Addressable in the coming weeks.";
  }
  if (trimmed === "ongoing") return "Ongoing initiative.";

  // Parse a leading number + unit.
  const dayMatch = trimmed.match(/^(\d+)\s*days?\b/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    const weeks = Math.max(1, Math.round(days / 7));
    return `Addressable in ~${weeks} week${weeks === 1 ? "" : "s"}.`;
  }
  const weekMatch = trimmed.match(/^(\d+)\s*weeks?\b/);
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1], 10);
    return `Addressable in ${weeks} week${weeks === 1 ? "" : "s"}.`;
  }
  const monthMatch = trimmed.match(/^(\d+)\s*months?\b/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    const weeks = months * 4;
    return `Addressable in ~${weeks} weeks.`;
  }

  // Quarter or custom phrasing — pass through verbatim.
  return `Addressable ${timeframe.trim()}.`;
}

// ─── Component ───────────────────────────────────────────────

export function ExecutiveSummaryCard({
  meta,
  executiveSummaryProse,
}: ExecutiveSummaryCardProps) {
  const prose = executiveSummaryProse ?? meta.executiveSummaryProse ?? null;

  const situationText = prose?.situation ?? deriveSituationText(meta);
  const findings = deriveKeyFindings(meta);
  const topRec = deriveTopRecommendation(meta);

  return (
    <section
      className="executive-summary-card"
      style={{
        backgroundColor: BRAND_TOKENS.reportBg,
        color: BRAND_TOKENS.reportText,
        borderTop: `4px solid ${BRAND_TOKENS.accentPrimary}`,
        padding: "0.75in 0.9in",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Card header */}
      <header style={{ marginBottom: "32px" }}>
        <p
          style={{
            margin: 0,
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: BRAND_TOKENS.accentPrimary,
          }}
        >
          Executive Summary
        </p>
        <h2
          style={{
            margin: "8px 0 0 0",
            fontSize: "24px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: BRAND_TOKENS.reportText,
          }}
        >
          Assessment Overview
        </h2>
      </header>

      {/* Block 1 — Situation */}
      <SummaryBlock label="Situation">
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            lineHeight: 1.65,
            color: BRAND_TOKENS.reportText,
          }}
        >
          {situationText}
        </p>
      </SummaryBlock>

      {/* Block 2 — Key Findings */}
      <SummaryBlock label="Key Findings">
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {findings.map((finding, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                backgroundColor: BRAND_TOKENS.reportSurface,
                border: `1px solid ${BRAND_TOKENS.reportBorder}`,
                borderLeft: `3px solid ${BRAND_TOKENS.accentPrimary}`,
                padding: "12px 16px",
                borderRadius: "2px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: BRAND_TOKENS.accentPrimary,
                  minWidth: "18px",
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  lineHeight: 1.5,
                  color: BRAND_TOKENS.reportText,
                }}
              >
                {finding}
              </span>
            </li>
          ))}
        </ul>
      </SummaryBlock>

      {/* Block 3 — Top Recommendation */}
      {topRec && (
        <SummaryBlock label="Top Recommendation" isLast>
          <div
            style={{
              backgroundColor: BRAND_TOKENS.reportSurface,
              border: `1px solid ${BRAND_TOKENS.reportBorder}`,
              padding: "16px 20px",
              borderRadius: "2px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 700,
                color: BRAND_TOKENS.accentPrimary,
                letterSpacing: "-0.005em",
              }}
            >
              {topRec.platform}
            </p>
            {prose?.topRecommendation ? (
              <p
                style={{
                  margin: "8px 0 0 0",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  color: BRAND_TOKENS.reportText,
                }}
              >
                {prose.topRecommendation}
              </p>
            ) : (
              <p
                style={{
                  margin: "8px 0 0 0",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  color: BRAND_TOKENS.reportText,
                }}
              >
                {topRec.sentence}
              </p>
            )}
            <p
              style={{
                margin: "10px 0 0 0",
                fontSize: "12px",
                fontWeight: 500,
                color: BRAND_TOKENS.textTertiary,
                letterSpacing: "0.01em",
              }}
            >
              {topRec.timeframeLine}
            </p>
          </div>
        </SummaryBlock>
      )}
    </section>
  );
}

// ─── Internal block wrapper ──────────────────────────────────

function SummaryBlock({
  label,
  children,
  isLast,
}: {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        marginBottom: isLast ? 0 : "28px",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      <p
        style={{
          margin: "0 0 10px 0",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: BRAND_TOKENS.textTertiary,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
