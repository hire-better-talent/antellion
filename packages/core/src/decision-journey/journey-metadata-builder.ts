/**
 * journey-metadata-builder.ts
 *
 * Transforms the output of computeJourneyAnalysis() and generateStageRecommendations()
 * into the plain JSON shape stored in Report.metadata.journeyAnalysis.
 *
 * The produced shape is consumed by JourneyReportRenderer on the frontend.
 * It is kept as a plain object (no class instances) so it round-trips through
 * Prisma's JSON column without information loss.
 */

import { STAGE_CONFIGS, type DecisionStage, type JourneyAnalysis, type StageVisibility } from "./types";
import type { RemediationPlan } from "./recommendations";
import { classifyPositioning } from "./stage-comparison";
import { isEmployerRelevantDomain } from "../employer-platforms";
import { extractResponseThemes, type ResponseThemes } from "../response-themes";

// ─── Output types (mirrors frontend journey-types.ts) ────────

export interface JourneyStageOutput {
  stage: string;
  label: string;
  description: string;
  candidateQuestion: string;
  mentionRate: number;
  avgVisibility: number;
  avgSentiment: number;
  positioning: string;
  topCompetitor: { name: string; mentionRate: number } | null;
  gapVsTopCompetitor: number;
  citedDomains: string[];
  gapDomains: string[];
  narrative: string;
  competitorCallout: string | undefined;
  citationContext: string | undefined;
  metricType: "visibility" | "positioning";
  /** Fraction of results at this stage backed by at least one citation (0-1). */
  sourcedRate: number;
  /** Qualitative themes extracted from AI response texts for this stage. */
  themes?: {
    positiveAttributes: string[];
    negativeAttributes: string[];
    unsolicitedCompetitors: string[];
    industryFraming: string;
    compensationDetail: "specific" | "vague" | "absent";
    cultureDetail: "specific" | "vague" | "absent";
  };
}

export interface JourneyCompetitorOutput {
  name: string;
  stages: Array<{
    stage: string;
    mentionRate: number;
    positioning: string;
  }>;
  overallRate: number;
  threatLevel: string;
}

export interface JourneyMetadataOutput {
  journeyAnalysis: {
    stages: JourneyStageOutput[];
    funnelThroughput: number;
    criticalGapStage: string | null;
    overallPositioning: string;
    earnedVisibilityRate: number;
    earnedVisibilityTier: "strong" | "moderate" | "weak" | "invisible";
    visibility: {
      earnedMentionRate: number;
      promptedMentionRate: number;
      earnedStages: string[];
      positioningStages: string[];
    } | undefined;
  };
  clientName: string;
  clientOverallRate: number;
  competitors: JourneyCompetitorOutput[];
  remediationPlan: {
    recommendations: Array<{
      id: string;
      stage: string;
      priority: string;
      title: string;
      summary: string;
      whyItMatters: string;
      targetPlatforms: string[];
      actions: string[];
      evidenceBasis: string;
      expectedImpact: string;
      effort: string;
      timeframe: string;
    }>;
    criticalCount: number;
    highCount: number;
    topPriorityStage: string | null;
    funnelImpactSummary: string;
  };
  /** Aggregate themes extracted from all response texts across all stages. */
  overallThemes?: {
    positiveAttributes: string[];
    negativeAttributes: string[];
    unsolicitedCompetitors: string[];
    industryFraming: string;
    compensationDetail: "specific" | "vague" | "absent";
    cultureDetail: "specific" | "vague" | "absent";
  };
}

// ─── Input ────────────────────────────────────────────────────

/** Shape of the visibility-boundary data when available (mirrors VisibilityBoundary). */
export interface BoundaryContext {
  firstAppearsAt: "broad" | "industry" | "niche" | "hyper_specific" | "never";
  competitorBoundaries: Array<{
    name: string;
    firstAppearsAt: "broad" | "industry" | "niche" | "hyper_specific" | "never";
  }>;
  boundaryNarrative: string;
}

export interface JourneyMetadataBuilderInput {
  clientName: string;
  /** Overall mention rate across all results (from ScanComparisonResult). */
  clientOverallRate: number;
  journey: JourneyAnalysis;
  remediationPlan: RemediationPlan;
  /**
   * Competitor mention rates per stage, extracted from scan result metadata.
   * Map: competitorName -> stage -> mentionRate
   */
  competitorStageRates: Map<string, Map<DecisionStage, number>>;
  /** Known competitor names in ranked order (from client.competitors). */
  competitorNames: string[];
  /**
   * Visibility boundary analysis — pass when available so the Discovery
   * narrative can reference at what specificity level the company appears.
   */
  visibilityBoundary?: BoundaryContext;
  /**
   * Per-stage response texts from AI scan results.
   * Map: DecisionStage -> array of response strings.
   * When provided, qualitative theme extraction enriches the report.
   */
  stageResponseTexts?: Map<DecisionStage, string[]>;
}

// ─── Helpers ──────────────────────────────────────────────────

function pct(rate: number): string {
  return `${Math.round(Math.max(0, Math.min(1, rate)) * 100)}%`;
}

/** Human-readable boundary level label, e.g. "niche" -> "niche", "hyper_specific" -> "hyper-specific". */
function boundaryLabel(level: string): string {
  return level.replace("_", "-");
}

/** Platform descriptors used to explain WHY a citation source matters at a given stage. */
const PLATFORM_DESCRIPTORS: Record<string, { what: string; stage: string }> = {
  "glassdoor.com": { what: "employee reviews and salary data", stage: "employer profiles" },
  "levels.fyi": { what: "compensation benchmarks", stage: "salary comparisons" },
  "builtin.com": { what: "employer rankings and culture profiles", stage: "employer discovery" },
  "comparably.com": { what: "employer awards and culture scores", stage: "employer comparison" },
  "indeed.com": { what: "job listings and interview reviews", stage: "hiring process" },
  "blind.app": { what: "anonymous employee discussions", stage: "insider sentiment" },
  "teamblind.com": { what: "anonymous employee discussions", stage: "insider sentiment" },
  "linkedin.com": { what: "company pages and employee profiles", stage: "professional presence" },
  "payscale.com": { what: "salary benchmarks", stage: "compensation comparison" },
};

function lookupPlatformDescriptor(domain: string): string | null {
  const key = domain.toLowerCase().replace(/^www\./, "");
  return PLATFORM_DESCRIPTORS[key]?.what ?? null;
}

function sentimentWord(score: number): string {
  if (score > 0.3) return "positive";
  if (score > 0) return "neutral-to-positive";
  if (score > -0.2) return "neutral";
  if (score > -0.5) return "mixed-to-negative";
  return "negative";
}

function positioningDescription(positioning: string): string {
  switch (positioning) {
    case "CHAMPION": return "detailed and compelling";
    case "CONTENDER": return "adequate but not standout";
    case "PERIPHERAL": return "thin and generic";
    case "CAUTIONARY": return "present but negatively framed";
    case "INVISIBLE": return "absent or extremely sparse";
    default: return "limited";
  }
}

// ─── Narrative builders ─────────────────────────────────────

/**
 * Discovery narrative: focuses on whether AI independently surfaces the company,
 * incorporates visibility boundary data when available.
 */
function buildDiscoveryNarrative(
  sv: StageVisibility,
  clientName: string,
  boundary: BoundaryContext | undefined,
): string {
  const parts: string[] = [];

  // Lead with boundary insight when available — this is the most actionable framing
  if (boundary) {
    if (boundary.firstAppearsAt === "never") {
      parts.push(
        `${clientName} does not appear in any Discovery-stage AI responses. ` +
        `Candidates exploring career options through AI never encounter ${clientName}, regardless of how they phrase the search.`,
      );
    } else if (boundary.firstAppearsAt === "broad") {
      parts.push(
        `${clientName} appears in broad Discovery queries, reaching candidates at the widest end of the talent pool.`,
      );
    } else {
      const level = boundaryLabel(boundary.firstAppearsAt);
      parts.push(
        `AI only surfaces ${clientName} when candidates search at the ${level} level or narrower ` +
        `-- a segment that represents a fraction of the total talent pool.`,
      );

      // Competitor that appears at a BROADER (less specific) level than the client
      const BOUNDARY_ORDER: Record<string, number> = { broad: 0, industry: 1, niche: 2, hyper_specific: 3, never: 4 };
      const clientOrder = BOUNDARY_ORDER[boundary.firstAppearsAt] ?? 4;
      const broaderComp = boundary.competitorBoundaries.find(
        (c) => c.firstAppearsAt !== "never" && (BOUNDARY_ORDER[c.firstAppearsAt] ?? 4) < clientOrder,
      );
      if (broaderComp) {
        const compLevel = boundaryLabel(broaderComp.firstAppearsAt);
        parts.push(
          `${broaderComp.name} appears at the ${compLevel} level, capturing candidates exploring the market before they ever encounter ${clientName}.`,
        );
      }
    }
  } else {
    // No boundary data — use mention rate as the primary signal
    if (sv.mentionRate < 0.15) {
      parts.push(
        `${clientName} is effectively invisible in Discovery-stage AI responses, appearing in only ${pct(sv.mentionRate)} of queries where candidates ask AI to identify potential employers.`,
      );
    } else if (sv.mentionRate < 0.3) {
      parts.push(
        `${clientName} appears in only ${pct(sv.mentionRate)} of Discovery queries -- the stage where candidates build their initial list of companies to consider. Most AI-guided candidates never encounter ${clientName} at this stage.`,
      );
    } else if (sv.mentionRate < 0.5) {
      parts.push(
        `${clientName} has partial Discovery visibility at ${pct(sv.mentionRate)}, appearing in some but not most AI-generated employer recommendations.`,
      );
    } else {
      parts.push(
        `${clientName} has strong Discovery visibility at ${pct(sv.mentionRate)}, appearing regularly when candidates ask AI to identify potential employers.`,
      );
    }
  }

  // Candidate consequence — only when the client's boundary is not broad
  // (if firstAppearsAt==="broad", the framing already acknowledges broad visibility)
  if (sv.mentionRate < 0.3 && parts.length === 1 && boundary?.firstAppearsAt !== "broad") {
    parts.push(
      `Candidates who rely on AI for career research are building consideration sets that exclude ${clientName} from the start.`,
    );
  }

  return parts.join(" ");
}

/**
 * Consideration narrative: focuses on what AI says about the company, not
 * whether it appears (appearance is expected since the query names the company).
 */
function buildConsiderationNarrative(
  sv: StageVisibility,
  clientName: string,
): string {
  const parts: string[] = [];
  const quality = positioningDescription(sv.positioning);
  const sentiment = sentimentWord(sv.avgSentiment);

  // Consideration is a prompted stage — queries name the company directly, so appearance is expected.
  // The signal is how AI describes the company, not whether it appears.
  parts.push(
    `Queries at this stage name ${clientName} directly, so appearance is expected. The signal is how AI describes the company, not whether it appears.`,
  );

  if (sv.positioning === "INVISIBLE") {
    parts.push(
      `When candidates ask AI about ${clientName} by name, AI returns little to no meaningful employer information. ` +
      `This signals a critical content gap -- there is insufficient indexed data for AI to construct an employer profile.`,
    );
  } else if (sv.positioning === "CAUTIONARY") {
    parts.push(
      `When candidates search for ${clientName} by name, AI describes the company with ${sentiment} framing. ` +
      `The description is present but carries cautionary language that may discourage candidates from moving forward.`,
    );
  } else if (sv.positioning === "PERIPHERAL") {
    parts.push(
      `When candidates search for ${clientName} by name, AI provides a ${quality} description. ` +
      `The profile lacks the specificity -- career growth paths, culture differentiators, compensation context -- that would make a candidate want to learn more.`,
    );
  } else if (sv.positioning === "CONTENDER") {
    parts.push(
      `When candidates search for ${clientName} by name, AI provides an ${quality} description with ${sentiment} sentiment. ` +
      `The profile covers the basics but does not differentiate ${clientName} in ways that would prioritize it over alternatives.`,
    );
  } else {
    // CHAMPION
    parts.push(
      `AI provides a ${quality} employer profile when candidates search for ${clientName}. ` +
      `The description includes specifics that help candidates understand why ${clientName} is worth pursuing, with ${sentiment} framing overall.`,
    );
  }

  // Competitor comparison on quality, not rate
  if (sv.topCompetitor && sv.positioning !== "CHAMPION") {
    if (sv.topCompetitor.mentionRate > sv.mentionRate + 0.1) {
      parts.push(
        `${sv.topCompetitor.name} receives a more detailed employer profile at this stage, giving candidates a richer basis for comparison.`,
      );
    }
  }

  return parts.join(" ");
}

/**
 * Evaluation narrative: focuses on comparison data availability and
 * whether the company shows up in head-to-head evaluations.
 */
function buildEvaluationNarrative(
  sv: StageVisibility,
  clientName: string,
): string {
  const parts: string[] = [];

  if (sv.mentionRate === 0) {
    parts.push(
      `${clientName} is absent from Evaluation-stage AI responses. When candidates compare employers on compensation, culture, or benefits, AI does not include ${clientName} in the comparison.`,
    );
  } else if (sv.mentionRate < 0.15) {
    parts.push(
      `${clientName} appears in only ${pct(sv.mentionRate)} of Evaluation-stage queries — effectively absent from most comparisons. When candidates compare employers on compensation, culture, or benefits, AI rarely includes ${clientName}.`,
    );
  } else if (sv.mentionRate < 0.3) {
    parts.push(
      `${clientName} appears in only ${pct(sv.mentionRate)} of comparison queries -- the stage where candidates make head-to-head employer comparisons. In most AI-generated comparisons, ${clientName} is excluded entirely.`,
    );
  } else if (sv.mentionRate < 0.5) {
    parts.push(
      `${clientName} appears in ${pct(sv.mentionRate)} of Evaluation-stage queries. AI includes ${clientName} in some comparisons but frequently omits it, particularly when candidates compare on compensation or benefits data.`,
    );
  } else {
    parts.push(
      `${clientName} has solid Evaluation-stage visibility at ${pct(sv.mentionRate)}, appearing in most employer comparisons.`,
    );
  }

  // Competitor gap with specifics
  if (sv.topCompetitor && sv.topCompetitor.mentionRate > sv.mentionRate + 0.1) {
    const gap = Math.round((sv.topCompetitor.mentionRate - sv.mentionRate) * 100);
    parts.push(
      `${sv.topCompetitor.name} appears ${gap} points more often in these comparisons. AI surfaces ${sv.topCompetitor.name} more often at this stage, which is typically driven by broader platform presence and content depth.`,
    );
  }

  // Missing from comparison conversations
  if (sv.mentionRate < 0.3) {
    parts.push(
      `Candidates deciding between employers are making that decision without ${clientName} in the running.`,
    );
  }

  return parts.join(" ");
}

/**
 * Commitment narrative: focuses on whether candidates find enough actionable
 * information to take the next step (apply, prepare for interview, accept offer).
 */
function buildCommitmentNarrative(
  sv: StageVisibility,
  clientName: string,
): string {
  const parts: string[] = [];

  // Commitment is a prompted stage — queries name the company directly, so appearance is expected.
  // The signal is how AI describes the company's hiring process, not whether it appears.
  parts.push(
    `Queries at this stage name ${clientName} directly, so appearance is expected. The signal is how AI describes the company, not whether it appears.`,
  );

  // Branch on positioning as the primary signal
  if (sv.positioning === "INVISIBLE") {
    parts.push(
      `AI returns little to no actionable information about ${clientName}'s hiring process. ` +
      `Candidates ready to apply cannot find interview process details, compensation structure, or application guidance — creating friction at the final conversion step.`,
    );
  } else if (sv.positioning === "CAUTIONARY") {
    parts.push(
      `AI provides some Commitment-stage information about ${clientName}, but the framing is negative. ` +
      `Candidates preparing to apply encounter cautionary descriptions of the interview or offer process that may reduce application rates.`,
    );
  } else if (sv.positioning === "PERIPHERAL") {
    parts.push(
      `Candidates nearing a decision find limited information about ${clientName}'s hiring process. ` +
      `AI provides basic details but lacks specifics on compensation ranges, team structure, or the onboarding experience that would actively encourage applications.`,
    );
  } else if (sv.positioning === "CONTENDER") {
    parts.push(
      `Candidates find adequate information about ${clientName}'s hiring process in AI responses. ` +
      `The coverage is sufficient to not lose candidates at this stage but does not actively differentiate the application experience.`,
    );
  } else {
    // CHAMPION
    parts.push(
      `AI provides detailed Commitment-stage information for ${clientName}, including interview process details, compensation context, and application guidance. ` +
      `This level of detail actively supports candidate conversion.`,
    );
  }

  return parts.join(" ");
}

/**
 * Returns a source-quality note to append to a stage narrative when the sourced
 * rate is very low (< 0.3). This makes it clear to readers that the findings
 * are based largely on AI parametric memory rather than indexed sources.
 */
function buildSourceQualityNote(
  sourcedRate: number,
  clientName: string,
): string {
  if (sourcedRate >= 0.3) return "";
  return ` Note: AI responses at this stage rarely cited specific sources, suggesting limited indexed employer data for ${clientName} in this context.`;
}

/**
 * Generates a stage-appropriate prose narrative.
 *
 * Discovery and Evaluation narratives focus on earned visibility (whether
 * AI independently surfaces the company). Consideration and Commitment
 * narratives focus on positioning quality (how AI describes the company
 * when candidates ask by name).
 */
function buildStageNarrative(
  sv: StageVisibility,
  clientName: string,
  boundary: BoundaryContext | undefined,
): string {
  let base: string;
  switch (sv.stage) {
    case "DISCOVERY":
      base = buildDiscoveryNarrative(sv, clientName, boundary);
      break;
    case "CONSIDERATION":
      base = buildConsiderationNarrative(sv, clientName);
      break;
    case "EVALUATION":
      base = buildEvaluationNarrative(sv, clientName);
      break;
    case "COMMITMENT":
      base = buildCommitmentNarrative(sv, clientName);
      break;
    default:
      base = `${clientName} visibility at this stage: ${pct(sv.mentionRate)}.`;
  }
  return base + buildSourceQualityNote(sv.sourcedRate, clientName);
}

// ─── Competitor callout builder ────────────────────────────────

/**
 * Builds a competitor callout that explains WHAT the competitor does
 * better, not just that they have a higher rate.
 */
function buildCompetitorCallout(
  stage: DecisionStage,
  topCompetitor: { name: string; mentionRate: number } | null,
  clientMentionRate: number,
  gapDomains: string[],
  clientName: string,
): string | undefined {
  if (topCompetitor === null) return undefined;
  if (topCompetitor.mentionRate <= clientMentionRate + 0.05) return undefined;
  // Don't generate callouts for competitors with negligible visibility — the data is too thin to be meaningful
  if (topCompetitor.mentionRate < 0.15) return undefined;

  const gap = Math.round((topCompetitor.mentionRate - clientMentionRate) * 100);
  const compName = topCompetitor.name;

  // Identify gap platforms with known descriptors for specificity
  const knownGapPlatforms = gapDomains
    .map((d) => d.toLowerCase().replace(/^www\./, ""))
    .filter((d) => PLATFORM_DESCRIPTORS[d] !== undefined)
    .slice(0, 3);

  const platformExplanation = knownGapPlatforms.length > 0
    ? ` ${compName} has presence on ${knownGapPlatforms.join(", ")} -- platforms where ${clientName} has limited or no data.`
    : "";

  switch (stage) {
    case "DISCOVERY":
      return `${compName} leads Discovery by ${gap} points.${platformExplanation || ` AI surfaces ${compName} more often at this stage, which is typically driven by broader platform presence and content depth.`}`;
    case "CONSIDERATION":
      return `${compName} receives a more detailed AI employer profile at this stage (${gap}-point gap).${platformExplanation || ` AI surfaces ${compName} more often at this stage, which is typically driven by broader platform presence and content depth.`}`;
    case "EVALUATION":
      return `${compName} dominates comparison queries by ${gap} points.${platformExplanation || ` AI surfaces ${compName} more often at this stage, which is typically driven by broader platform presence and content depth.`}`;
    case "COMMITMENT":
      return `${compName} provides ${gap} points more Commitment-stage coverage.${platformExplanation || ` Candidates preparing to apply find more detailed process and compensation information for ${compName}.`}`;
    default:
      return `${compName} leads by ${gap} points at this stage.`;
  }
}

// ─── Citation context builder ──────────────────────────────────

/**
 * Builds citation context that explains WHY the cited sources matter
 * at this stage, not just which domains were cited.
 */
function buildCitationContext(
  stage: DecisionStage,
  citedDomains: string[],
  gapDomains: string[],
  clientName: string,
): string | undefined {
  if (citedDomains.length === 0) return undefined;

  const sample = citedDomains.slice(0, 4);

  // Build descriptive list of cited sources
  const described = sample.map((d) => {
    const desc = lookupPlatformDescriptor(d);
    return desc ? `${d} (${desc})` : d;
  });

  // Identify which cited sources are also gap domains
  const gapSet = new Set(gapDomains.map((d) => d.toLowerCase().replace(/^www\./, "")));
  const gapCited = sample
    .map((d) => d.toLowerCase().replace(/^www\./, ""))
    .filter((d) => gapSet.has(d));

  let base: string;
  switch (stage) {
    case "DISCOVERY":
      base = `AI draws on ${described.join(", ")} when building employer recommendations at this stage.`;
      break;
    case "CONSIDERATION":
      base = `AI constructs its employer profile for this stage from ${described.join(", ")}.`;
      break;
    case "EVALUATION":
      base = `AI sources comparison data at this stage from ${described.join(", ")}.`;
      break;
    case "COMMITMENT":
      base = `AI references ${described.join(", ")} when describing the hiring process and offer details.`;
      break;
    default:
      base = `Key sources at this stage: ${described.join(", ")}.`;
  }

  if (gapCited.length > 0) {
    base += ` ${clientName} has limited presence on ${gapCited.length === 1 ? gapCited[0] : `${gapCited.length} of these platforms`}, which contributes to the visibility gap.`;
  }

  return base;
}

// ─── Threat level classifier ─────────────────────────────────

/**
 * Classifies a competitor's overall threat level relative to the client.
 * Based on its overall mention rate across tracked stages.
 */
function classifyThreatLevel(overallRate: number, clientOverallRate: number): string {
  if (overallRate > clientOverallRate + 0.2) return "Primary";
  if (overallRate > clientOverallRate) return "Secondary";
  return "Minimal";
}

// ─── Main builder ─────────────────────────────────────────────

export function buildJourneyMetadata(
  input: JourneyMetadataBuilderInput,
): JourneyMetadataOutput {
  const {
    clientName,
    clientOverallRate,
    journey,
    remediationPlan,
    competitorStageRates,
    competitorNames,
    visibilityBoundary,
    stageResponseTexts,
  } = input;

  // ── Build enriched stage data ──────────────────────────────
  const stages: JourneyStageOutput[] = journey.stages.map((sv) => {
    const config = STAGE_CONFIGS[sv.stage];
    // Filter gap domains to employer-relevant platforms only
    const employerGapDomains = sv.gapDomains.filter((d) =>
      isEmployerRelevantDomain(d.toLowerCase().replace(/^www\./, "")),
    );

    const narrative = buildStageNarrative(
      sv,
      clientName,
      visibilityBoundary,
    );

    const competitorCallout = buildCompetitorCallout(
      sv.stage,
      sv.topCompetitor,
      sv.mentionRate,
      employerGapDomains,
      clientName,
    );

    const citationContext = buildCitationContext(
      sv.stage,
      sv.citedDomains,
      employerGapDomains,
      clientName,
    );

    // Extract themes from response texts for this stage when available
    const stageTexts = stageResponseTexts?.get(sv.stage);
    const themes = stageTexts && stageTexts.length > 0
      ? extractResponseThemes(stageTexts, clientName, competitorNames)
      : undefined;

    return {
      stage: sv.stage,
      label: config.name,
      description: config.description,
      candidateQuestion: config.candidateQuestion,
      mentionRate: sv.mentionRate,
      avgVisibility: sv.avgVisibility,
      avgSentiment: sv.avgSentiment,
      positioning: sv.positioning,
      topCompetitor: sv.topCompetitor,
      gapVsTopCompetitor: sv.gapVsTopCompetitor,
      citedDomains: sv.citedDomains,
      gapDomains: employerGapDomains,
      narrative,
      competitorCallout,
      citationContext,
      metricType: sv.metricType,
      sourcedRate: sv.sourcedRate,
      themes,
    };
  });

  // ── Build competitor matrix data ───────────────────────────
  const competitors: JourneyCompetitorOutput[] = competitorNames
    .map((name) => {
      const stageRates = competitorStageRates.get(name) ?? new Map();
      const stageEntries = journey.stages
        .filter((sv) => stageRates.has(sv.stage))
        .map((sv) => {
          const competitorRate = stageRates.get(sv.stage) ?? 0;
          return {
            stage: sv.stage,
            mentionRate: competitorRate,
            // Derive the competitor's own positioning from their actual mention rate
            positioning: classifyPositioning(competitorRate, 50, 0),
          };
        });

      const rates = [...stageRates.values()];
      const overallRate = rates.length > 0
        ? rates.reduce((a, b) => a + b, 0) / rates.length
        : 0;

      const threatLevel = classifyThreatLevel(overallRate, clientOverallRate);

      return {
        name,
        stages: stageEntries,
        overallRate,
        threatLevel,
      };
    })
    // Only include competitors that had mention data across at least one stage
    .filter((c) => c.stages.length > 0);

  // ── Extract overall themes from all responses ───────────────
  const allResponses = stageResponseTexts
    ? [...stageResponseTexts.values()].flat()
    : [];
  const overallThemes = allResponses.length > 0
    ? extractResponseThemes(allResponses, clientName, competitorNames)
    : undefined;

  // ── Assemble output ────────────────────────────────────────
  return {
    journeyAnalysis: {
      stages,
      funnelThroughput: journey.funnelThroughput,
      criticalGapStage: journey.criticalGapStage,
      overallPositioning: journey.overallPositioning,
      earnedVisibilityRate: journey.earnedVisibilityRate ?? 0,
      earnedVisibilityTier: journey.earnedVisibilityTier ?? "invisible",
      visibility: journey.visibility,
    },
    clientName,
    clientOverallRate,
    competitors,
    remediationPlan: {
      recommendations: remediationPlan.recommendations.map((r) => ({
        id: r.id,
        stage: r.stage,
        priority: r.priority,
        title: r.title,
        summary: r.summary,
        whyItMatters: r.whyItMatters,
        targetPlatforms: r.targetPlatforms,
        actions: r.actions,
        evidenceBasis: r.evidenceBasis,
        expectedImpact: r.expectedImpact,
        effort: r.effort,
        timeframe: r.timeframe,
      })),
      criticalCount: remediationPlan.criticalCount,
      highCount: remediationPlan.highCount,
      topPriorityStage: remediationPlan.topPriorityStage,
      funnelImpactSummary: remediationPlan.funnelImpactSummary,
    },
    overallThemes,
  };
}
