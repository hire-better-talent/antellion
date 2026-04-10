import {
  STAGE_CONFIGS,
  type DecisionStage,
  type JourneyAnalysis,
  type StageVisibility,
} from "./types";
import { isEmployerRelevantDomain } from "../employer-platforms";

// ─── Output types ─────────────────────────────────────────────

export interface StageRecommendation {
  /** Unique key, e.g. "evaluation-citation-levels-fyi" */
  id: string;
  /** Which funnel stage this recommendation fixes */
  stage: DecisionStage;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  /** Short headline, e.g. "Publish compensation data on Levels.fyi" */
  title: string;
  /** 1-2 sentence executive summary */
  summary: string;
  /** Ties to funnel gap and business impact */
  whyItMatters: string;
  /** Specific platforms or domains to act on */
  targetPlatforms: string[];
  /** Numbered action steps */
  actions: string[];
  /** What scan data triggered this recommendation */
  evidenceBasis: string;
  /** What visibility change to expect */
  expectedImpact: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
  /** e.g. "30 days", "60 days", "90 days" */
  timeframe: string;
}

/**
 * A strategic recommendation wraps one or more tactical StageRecommendations.
 * The strategic title and summary speak to the "why" at an executive level;
 * the tacticalActions list contains the specific platform actions underneath.
 */
export interface StrategicRecommendation {
  id: string;
  stage: DecisionStage;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  /** Executive-level title — references the client's specific niche when available */
  strategicTitle: string;
  /** Why this matters strategically (1-2 sentences) */
  strategicSummary: string;
  /** Specific platform-level actions that execute this strategy */
  tacticalActions: StageRecommendation[];
}

export interface RemediationPlan {
  /** Strategic recommendations grouped by stage and theme. Added in v2 — use for executive-facing output. */
  strategicRecommendations: StrategicRecommendation[];
  /** Flat list of tactical recommendations — kept for backward compatibility. */
  recommendations: StageRecommendation[];
  criticalCount: number;
  highCount: number;
  topPriorityStage: DecisionStage | null;
  /** e.g. "Addressing Evaluation gaps could increase pipeline throughput from 4.7% to ~15%" */
  funnelImpactSummary: string;
}

// ─── Input type ───────────────────────────────────────────────

export interface RecommendationInput {
  journey: JourneyAnalysis;
  comparison: {
    clientMentionRate: number;
    avgSentimentScore: number | null;
    entityMentions: Array<{
      name: string;
      isClient: boolean;
      mentionRate: number;
    }>;
    citationAnalysis: {
      gapDomains: Array<{ domain: string; count: number }>;
      clientExclusiveDomains: Array<{ domain: string; count: number }>;
    };
  };
  client: {
    name: string;
    contentAssetTypes: string[];
    /** URLs of existing client ContentAssets — used to avoid recommending platforms the client already has */
    existingAssetUrls?: string[];
    competitors: Array<{ name: string }>;
    /** Niche keywords (e.g. ["timeshare", "vacation ownership"]) — used for strategic title specificity */
    nicheKeywords?: string[];
    /** Industry or sector (e.g. "Hospitality") — used for strategic title specificity */
    industry?: string;
  };
}

// ─── Platform knowledge ───────────────────────────────────────

interface PlatformConfig {
  stages: DecisionStage[];
  type: string;
  actionVerb: string;
  timeframe: string;
}

const PLATFORM_KNOWLEDGE: Record<string, PlatformConfig> = {
  "levels.fyi": {
    stages: ["EVALUATION", "COMMITMENT"],
    type: "compensation",
    actionVerb: "Submit salary and equity data",
    timeframe: "30 days",
  },
  "glassdoor.com": {
    stages: ["CONSIDERATION", "EVALUATION", "COMMITMENT"],
    type: "reviews",
    actionVerb:
      "Encourage employee reviews and respond to existing reviews",
    timeframe: "60 days",
  },
  "builtin.com": {
    stages: ["DISCOVERY"],
    type: "employer listing",
    actionVerb:
      "Create a company profile and apply for best-of lists",
    timeframe: "30 days",
  },
  "comparably.com": {
    stages: ["DISCOVERY", "CONSIDERATION"],
    type: "employer awards",
    actionVerb:
      "Complete employer profile and participate in awards cycles",
    timeframe: "90 days",
  },
  "indeed.com": {
    stages: ["CONSIDERATION"],
    type: "reviews",
    actionVerb: "Claim employer profile and encourage reviews",
    timeframe: "30 days",
  },
  "blind.app": {
    stages: ["EVALUATION"],
    type: "anonymous reviews",
    actionVerb:
      "Monitor discussion threads and address concerns surfaced",
    timeframe: "ongoing",
  },
  "teamblind.com": {
    stages: ["EVALUATION"],
    type: "anonymous reviews",
    actionVerb:
      "Monitor discussion threads and address concerns surfaced",
    timeframe: "ongoing",
  },
  "linkedin.com": {
    stages: ["CONSIDERATION", "DISCOVERY"],
    type: "professional network",
    actionVerb: "Update company page with employer brand content",
    timeframe: "14 days",
  },
  "payscale.com": {
    stages: ["EVALUATION"],
    type: "compensation",
    actionVerb: "Verify and update salary data",
    timeframe: "30 days",
  },
};

// ─── Helpers ──────────────────────────────────────────────────

function pct(rate: number): string {
  const clamped = Math.max(0, Math.min(1, rate));
  return `${Math.round(clamped * 100)}%`;
}

function lookupPlatform(domain: string): PlatformConfig | null {
  return PLATFORM_KNOWLEDGE[domain] ?? null;
}

/** Normalise a domain to the canonical key used in PLATFORM_KNOWLEDGE. */
function normaliseDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "");
}

/** Check if the client already has a content asset on a given platform domain. */
function clientHasPlatformPresence(
  platformDomain: string,
  existingAssetUrls: string[],
): boolean {
  return existingAssetUrls.some((url) =>
    url.toLowerCase().includes(platformDomain.toLowerCase()),
  );
}

// ─── Priority logic ───────────────────────────────────────────

export function computeRecommendationPriority(
  stage: DecisionStage,
  mentionRate: number,
  isOnlyGap: boolean,
): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  // Discovery gaps are most impactful (top of funnel)
  if (stage === "DISCOVERY" && mentionRate < 0.3) return "CRITICAL";
  if (stage === "DISCOVERY" && mentionRate < 0.5) return "HIGH";

  // Evaluation gaps are decisive (comparison stage)
  if (stage === "EVALUATION" && mentionRate < 0.3) return "CRITICAL";
  if (stage === "EVALUATION" && mentionRate < 0.5) return "HIGH";

  // Consideration with low mention rate is urgent
  if (stage === "CONSIDERATION" && mentionRate < 0.4) return "HIGH";

  // Commitment gaps matter less unless this is the only gap
  if (stage === "COMMITMENT" && isOnlyGap) return "HIGH";
  if (stage === "COMMITMENT") return "MEDIUM";

  return "MEDIUM";
}

// ─── Funnel impact summary ────────────────────────────────────

export function computeFunnelImpactSummary(
  journey: JourneyAnalysis,
  criticalGapStage: DecisionStage | null,
): string {
  const currentThroughput = Math.round(journey.funnelThroughput * 100);

  if (!criticalGapStage) {
    return `Current estimated pipeline throughput is ${currentThroughput}% -- addressing remaining gaps could improve this further.`;
  }

  const currentStage = journey.stages.find(
    (s) => s.stage === criticalGapStage,
  );
  if (!currentStage) {
    return `Current estimated pipeline throughput is ${currentThroughput}% -- addressing remaining gaps could improve this further.`;
  }

  const fixedRate = 0.5;
  const currentRate = Math.max(currentStage.mentionRate, 0.01);
  const rawFixedThroughput = (journey.funnelThroughput / currentRate) * fixedRate;
  const fixedThroughput = Math.min(rawFixedThroughput, 0.5);
  const stageName = STAGE_CONFIGS[criticalGapStage].name;

  return (
    `Addressing the ${stageName} gap (currently ${pct(currentStage.mentionRate)}) could increase pipeline throughput ` +
    `from ~${currentThroughput}% to ~${Math.round(fixedThroughput * 100)}%, if improved to approximately 50%.`
  );
}

// ─── Stage-specific generators ────────────────────────────────

function buildDiscoveryRecommendations(
  stageVis: StageVisibility,
  clientName: string,
  isOnlyGap: boolean,
  existingAssetUrls: string[],
): StageRecommendation[] {
  const recs: StageRecommendation[] = [];
  const { mentionRate, topCompetitor, gapDomains } = stageVis;

  if (mentionRate >= 0.5) return recs;

  // Identify known ranking platforms in gap domains
  const knownGapPlatforms = gapDomains
    .map(normaliseDomain)
    .filter(
      (d) =>
        PLATFORM_KNOWLEDGE[d] !== undefined &&
        PLATFORM_KNOWLEDGE[d].stages.includes("DISCOVERY"),
    );

  // Platform-specific recommendations for known ranking platforms
  for (const platformKey of knownGapPlatforms) {
    const platform = PLATFORM_KNOWLEDGE[platformKey]!;
    const recId = `discovery-platform-${platformKey.replace(/\./g, "-")}`;
    const competitorRate = topCompetitor?.mentionRate ?? null;
    const priority = computeRecommendationPriority(
      "DISCOVERY",
      mentionRate,
      isOnlyGap,
    );

    // Check if client already has a presence on this platform
    const hasPresence = clientHasPlatformPresence(platformKey, existingAssetUrls);

    if (hasPresence) {
      // Client has the platform but is still not being cited — recommend strengthening
      recs.push({
        id: recId,
        stage: "DISCOVERY",
        priority,
        title: `Strengthen your presence on ${platformKey}`,
        summary: `${clientName} has a profile on ${platformKey}, but it is not being cited by AI at the Discovery stage. The existing profile may lack the depth, recency, or structured content that AI models prioritize when generating employer recommendations.`,
        whyItMatters: `${platformKey} is a ${platform.type} platform that AI models actively cite when answering "what companies should I consider?" queries. Despite ${clientName}'s presence on the platform, AI is not drawing on this content — suggesting the profile is insufficient for AI indexing.`,
        targetPlatforms: [platformKey],
        actions: [
          `Audit the existing ${platformKey} profile for completeness — company culture narrative, open roles, benefits, and employer value proposition must all be present and current.`,
          `Update the profile with structured, keyword-rich content that AI models can index effectively.`,
          `Schedule a follow-up assessment in 90 days to measure Discovery-stage mention rate change.`,
        ],
        evidenceBasis:
          `${clientName} appears in ${pct(mentionRate)} of Discovery queries.` +
          (competitorRate != null
            ? ` Top competitor appears in ${pct(competitorRate)}%. ${platformKey} is cited in Discovery-stage results where ${clientName} is absent despite having a profile.`
            : ` ${platformKey} is cited in Discovery-stage results where ${clientName} is absent despite having a profile.`),
        expectedImpact: `Strengthening the existing ${platformKey} profile gives AI models richer data to draw on when answering Discovery queries. Improvement is measurable in follow-up assessments.`,
        effort: "LOW",
        timeframe: platform.timeframe,
      });
    } else {
      recs.push({
        id: recId,
        stage: "DISCOVERY",
        priority,
        title: `Get listed on ${platformKey}`,
        summary: `${clientName} is absent from ${platformKey}, which is cited in AI responses at the Discovery stage. Establishing a profile here directly increases how often AI surfaces ${clientName} when candidates ask where to work.`,
        whyItMatters: `${platformKey} is a ${platform.type} platform that AI models actively cite when answering "what companies should I consider?" queries. ${clientName}'s absence means candidates using AI for initial employer discovery never encounter the company at this stage.`,
        targetPlatforms: [platformKey],
        actions: [
          `${platform.actionVerb} on ${platformKey} within ${platform.timeframe}.`,
          `Ensure the profile includes company culture, open roles, and employer value proposition content that AI can index.`,
          `Schedule a follow-up assessment in 90 days to measure Discovery-stage mention rate change.`,
        ],
        evidenceBasis:
          `${clientName} appears in ${pct(mentionRate)} of Discovery queries.` +
          (competitorRate != null
            ? ` Top competitor appears in ${pct(competitorRate)}%. ${platformKey} is cited in Discovery-stage results where ${clientName} is absent.`
            : ` ${platformKey} is cited in Discovery-stage results where ${clientName} is absent.`),
        expectedImpact: `Establishing a profile on ${platformKey} gives AI models a structured data source to draw on when answering Discovery queries. Establishing presence on gap platforms directly addresses the data absence driving visibility gaps. Improvement is measurable in follow-up assessments.`,
        effort: platform.timeframe === "14 days" ? "LOW" : "MEDIUM",
        timeframe: platform.timeframe,
      });
    }
  }

  // General presence recommendation if no specific platform recs, or as a companion
  if (knownGapPlatforms.length === 0) {
    const priority = computeRecommendationPriority(
      "DISCOVERY",
      mentionRate,
      isOnlyGap,
    );
    const competitorRate = topCompetitor?.mentionRate ?? null;
    const competitorName = topCompetitor?.name ?? null;
    // Filter to employer-relevant platforms AND exclude platforms the client already has
    const gapDomainSample = gapDomains
      .filter((d) => isEmployerRelevantDomain(normaliseDomain(d)))
      .filter((d) => !clientHasPlatformPresence(normaliseDomain(d), existingAssetUrls))
      .slice(0, 3);

    // Fallback platforms — only suggest platforms the client does NOT already have
    const defaultPlatforms = ["builtin.com", "comparably.com", "linkedin.com"]
      .filter((p) => !clientHasPlatformPresence(p, existingAssetUrls));

    const platformList = gapDomainSample.length > 0
      ? gapDomainSample.join(", ")
      : defaultPlatforms.length > 0
        ? defaultPlatforms.join(", ")
        : null;

    // Only generate this rec if there are actually platforms to recommend
    if (platformList) {
      const hasExistingPresence = defaultPlatforms.length < 3; // client has some platforms
      const title = hasExistingPresence
        ? "Strengthen and expand employer platform presence"
        : "Establish presence on employer ranking platforms";
      const actionVerb = hasExistingPresence
        ? "Strengthen existing profiles and establish new ones on"
        : "Create or claim employer profiles on";

      recs.push({
        id: "discovery-establish-presence",
        stage: "DISCOVERY",
        priority,
        title,
        summary: `${clientName} appears in only ${pct(mentionRate)} of Discovery queries — the stage where candidates first identify which companies to consider. ${competitorName != null && competitorRate != null && competitorRate > 0.2 ? `${competitorName} is visible in ${pct(competitorRate)} of these same queries, reaching candidates before ${clientName} enters the conversation.` : "Expanding presence on the platforms AI cites at this stage is the highest-leverage Discovery action available."}`,
        whyItMatters: `Discovery is the top of the candidate funnel. Candidates who do not encounter ${clientName} here rarely circle back — the consideration set narrows before reaching later stages.`,
        targetPlatforms: gapDomainSample.length > 0 ? gapDomainSample : defaultPlatforms,
        actions: [
          `${actionVerb} the highest-cited Discovery-stage platforms: ${platformList}.`,
          `Publish structured employer content including company culture narrative, open role categories, and benefits summary.`,
          `Apply for employer ranking programs and awards where available — these generate additional citation surface for AI models.`,
          `Schedule a follow-up assessment in 90 days to measure Discovery mention rate improvement.`,
        ],
        evidenceBasis:
          `${clientName} appears in ${pct(mentionRate)} of Discovery queries.` +
          (competitorName != null && competitorRate != null && competitorRate >= 0.15
            ? ` Top competitor ${competitorName} appears in ${pct(competitorRate)}.`
            : "") +
          (gapDomainSample.length > 0
            ? ` Gap domains at this stage include: ${gapDomainSample.join(", ")}.`
            : ""),
        expectedImpact: `Expanding presence on employer listing and ranking platforms directly increases the content surface AI draws on for Discovery queries. Improvement is measurable in follow-up assessments.`,
        effort: "MEDIUM",
        timeframe: "30 days",
      });
    }
  }

  return recs;
}

function buildConsiderationRecommendations(
  stageVis: StageVisibility,
  clientName: string,
  isOnlyGap: boolean,
  existingAssetUrls: string[],
): StageRecommendation[] {
  const recs: StageRecommendation[] = [];
  const { mentionRate, avgSentiment, positioning, topCompetitor, gapDomains } =
    stageVis;

  // Negative sentiment recommendation
  if (avgSentiment < 0) {
    const competitorName = topCompetitor?.name ?? null;
    recs.push({
      id: "consideration-address-negative-perception",
      stage: "CONSIDERATION",
      priority: "HIGH",
      title: "Address negative employer perception driving AI sentiment",
      summary: `AI descriptions of ${clientName} at the Consideration stage carry negative sentiment (${avgSentiment > -0.3 ? "slightly negative" : avgSentiment > -0.6 ? "moderately negative" : "strongly negative"}). Candidates who encounter ${clientName} in AI responses receive a signal that discourages further research -- converting visibility into a liability rather than an asset.`,
      whyItMatters: `The Consideration stage is where candidates form their first impression of ${clientName} through AI. Negative sentiment at this stage causes candidates to deprioritize ${clientName} even when they find it in responses${competitorName != null ? `, while ${competitorName} and other competitors with neutral or positive framing capture candidate interest instead` : ""}. This is a conversion problem: ${clientName} appears in responses but fails to generate candidate engagement.`,
      targetPlatforms: ["glassdoor.com", "indeed.com", "linkedin.com"],
      actions: [
        "Conduct a sentiment audit across Glassdoor, Indeed, Blind, and LinkedIn to identify the 3-5 recurring themes driving negative characterization.",
        "Develop an internal action plan addressing the top systemic concerns -- these are the root causes of the perception gap, not the reviews themselves.",
        "Implement a structured employee feedback loop to surface and resolve culture issues before they reach public review platforms.",
        "Increase authentic positive signal volume through employee recognition programs and culture stories -- not manufactured reviews.",
        "Respond to existing negative reviews on Glassdoor and Indeed with substantive, specific replies that demonstrate accountability.",
      ],
      evidenceBasis: `Average sentiment score at the Consideration stage is ${avgSentiment.toFixed(2)}. AI descriptions include cautionary language that discourages candidate engagement.`,
      expectedImpact: `Improving sentiment at the Consideration stage converts existing visibility into genuine candidate interest. Changes to underlying perception take time to propagate into AI outputs -- plan for a multi-quarter timeline.`,
      effort: "HIGH",
      timeframe: "90 days",
    });
  }

  // Peripheral positioning recommendation (low mention rate regardless of sentiment)
  if (positioning === "PERIPHERAL" || mentionRate < 0.4) {
    const knownGapPlatforms = gapDomains
      .map(normaliseDomain)
      .filter(
        (d) =>
          PLATFORM_KNOWLEDGE[d] !== undefined &&
          PLATFORM_KNOWLEDGE[d].stages.includes("CONSIDERATION"),
      );
    // Separate platforms into ones the client already has (strengthen) vs. absent (create)
    const absentPlatforms = knownGapPlatforms.filter(
      (p) => !clientHasPlatformPresence(p, existingAssetUrls),
    );
    const weakPlatforms = knownGapPlatforms.filter((p) =>
      clientHasPlatformPresence(p, existingAssetUrls),
    );
    const targetPlatforms =
      absentPlatforms.length > 0
        ? absentPlatforms
        : weakPlatforms.length > 0
          ? weakPlatforms
          : ["glassdoor.com", "linkedin.com", "comparably.com"];
    const priority = computeRecommendationPriority(
      "CONSIDERATION",
      mentionRate,
      isOnlyGap,
    );

    recs.push({
      id: "consideration-strengthen-profile-depth",
      stage: "CONSIDERATION",
      priority,
      title: "Strengthen company profile depth for Consideration-stage queries",
      summary: `${clientName} appears in ${pct(mentionRate)} of Consideration queries -- the stage where candidates research what it is like to work at ${clientName}. At this rate, the majority of candidates who ask AI about ${clientName} receive sparse or nonexistent information, which AI models interpret as weak employer signal.`,
      whyItMatters: `When candidates ask AI "Tell me about ${clientName} as an employer," the response quality depends entirely on the indexed content available. Sparse employer profile data produces brief, generic AI descriptions that fail to differentiate ${clientName} from alternatives. Deep, structured profiles on the platforms AI cites produce specific, credible descriptions that move candidates toward active consideration.`,
      targetPlatforms,
      actions: [
        `Expand the careers page with team-specific culture narratives, engineering values, and representative employee stories.`,
        `Complete employer profiles on ${targetPlatforms.join(", ")} with full culture, benefits, and team descriptions.`,
        `Launch an engineering blog or equivalent technical content channel with a minimum cadence of 2 posts per month.`,
        `Update LinkedIn company page with current employer brand content, including life-at-the-company posts and team spotlights.`,
      ],
      evidenceBasis: `${clientName} appears in ${pct(mentionRate)} of Consideration queries. Positioning is classified as ${positioning.toLowerCase()}, indicating insufficient content depth for AI to construct a compelling employer description.`,
      expectedImpact: `Deeper employer profiles on Consideration-stage platforms give AI models the content required to construct substantive descriptions of ${clientName}. Improvement is measurable in follow-up assessments.`,
      effort: "MEDIUM",
      timeframe: "60 days",
    });
  }

  return recs;
}

function buildEvaluationRecommendations(
  stageVis: StageVisibility,
  clientName: string,
  isOnlyGap: boolean,
  existingAssetUrls: string[],
): StageRecommendation[] {
  const recs: StageRecommendation[] = [];
  const { mentionRate, topCompetitor, gapDomains } = stageVis;

  if (mentionRate >= 0.5) return recs;

  // Identify compensation platforms specifically in gap domains
  const compGapPlatforms = gapDomains
    .map(normaliseDomain)
    .filter((d) => {
      const p = PLATFORM_KNOWLEDGE[d];
      return (
        p !== undefined &&
        p.type === "compensation" &&
        p.stages.includes("EVALUATION")
      );
    });

  const competitorName = topCompetitor?.name ?? null;
  const competitorRate = topCompetitor?.mentionRate ?? null;

  // Platform-specific compensation data recommendation
  for (const platformKey of compGapPlatforms) {
    const platform = PLATFORM_KNOWLEDGE[platformKey]!;
    const recId = `evaluation-comp-data-${platformKey.replace(/\./g, "-")}`;
    const priority = computeRecommendationPriority(
      "EVALUATION",
      mentionRate,
      isOnlyGap,
    );

    // Check if client already has a presence on this platform
    const hasPresence = clientHasPlatformPresence(platformKey, existingAssetUrls);

    if (hasPresence) {
      // Client has the platform but comp data is not being cited — recommend strengthening
      recs.push({
        id: recId,
        stage: "EVALUATION",
        priority,
        title: `Strengthen salary data on ${platformKey}`,
        summary: `${clientName} has a presence on ${platformKey} but is not being cited by AI in compensation comparisons at the Evaluation stage. The existing data may be insufficient, outdated, or too sparse for AI models to include in salary benchmarks.`,
        whyItMatters: `${platformKey} is cited in comparison queries where ${clientName} is absent despite having a profile${competitorName != null ? ` -- ${competitorName} dominates these queries at ${pct(competitorRate!)} mention rate while ${clientName} appears in only ${pct(mentionRate)}` : ""}. Compensation transparency is a primary input for AI comparison responses. Incomplete or stale data is treated the same as absent data by AI models.`,
        targetPlatforms: [platformKey],
        actions: [
          `Audit existing salary data on ${platformKey} for completeness and recency — ensure at least 15 data points per target role.`,
          `Update compensation data with current salary bands for the highest-volume open positions.`,
          `Publish a compensation philosophy statement on the careers page to give AI an additional indexable signal.`,
          `Schedule a follow-up assessment in 90 days to measure Evaluation-stage mention rate change.`,
        ],
        evidenceBasis:
          `${clientName} appears in ${pct(mentionRate)} of Evaluation queries. ${platformKey} is cited in comparison-stage results where ${clientName} is absent despite having a profile.` +
          (competitorName != null && competitorRate != null
            ? ` ${competitorName} leads at ${pct(competitorRate)}.`
            : ""),
        expectedImpact: `Strengthening existing compensation data on ${platformKey} addresses the data quality gap that makes ${clientName} invisible in salary comparisons. Improvement is measurable in follow-up assessments.`,
        effort: "LOW",
        timeframe: platform.timeframe,
      });
    } else {
      recs.push({
        id: recId,
        stage: "EVALUATION",
        priority,
        title: `Publish salary data on ${platformKey}`,
        summary: `${clientName} is absent from ${platformKey} at the Evaluation stage -- the stage where candidates compare employers on compensation. AI cannot include ${clientName} in salary comparisons because the underlying data does not exist on this platform.`,
        whyItMatters: `${platformKey} is cited in comparison queries where ${clientName} is absent${competitorName != null ? ` -- ${competitorName} dominates these queries at ${pct(competitorRate!)} mention rate while ${clientName} appears in only ${pct(mentionRate)}` : ""}. Compensation transparency is a primary input for AI comparison responses. Without this data, AI systematically excludes ${clientName} from the compensation benchmark conversations that drive final candidate decisions.`,
        targetPlatforms: [platformKey],
        actions: [
          `Compile salary band data for target roles (focus on the highest-volume open positions) within 2 weeks.`,
          `${platform.actionVerb} on ${platformKey} within ${platform.timeframe}.`,
          `Ensure data covers at least 15 data points per target role to meet AI model inclusion thresholds.`,
          `Publish a compensation philosophy statement on the careers page to give AI an additional indexable signal.`,
        ],
        evidenceBasis:
          `${clientName} appears in ${pct(mentionRate)} of Evaluation queries. ${platformKey} is cited in comparison-stage results where ${clientName} is absent.` +
          (competitorName != null && competitorRate != null
            ? ` ${competitorName} leads at ${pct(competitorRate)}.`
            : ""),
        expectedImpact: `Publishing salary data on ${platformKey} directly addresses the data absence that makes ${clientName} invisible in compensation comparisons. Establishing presence on gap platforms directly addresses the data absence driving visibility gaps. Improvement is measurable in follow-up assessments.`,
        effort: "MEDIUM",
        timeframe: platform.timeframe,
      });
    }
  }

  // General comparison data gap recommendation (if no specific platform recs, or as companion)
  if (compGapPlatforms.length === 0) {
    const priority = computeRecommendationPriority(
      "EVALUATION",
      mentionRate,
      isOnlyGap,
    );
    // Filter to employer-relevant platforms only — news/press domains are excluded
    const evalGapDomainSample = gapDomains
      .filter((d) => isEmployerRelevantDomain(normaliseDomain(d)))
      .slice(0, 3);

    recs.push({
      id: "evaluation-close-comparison-data-gap",
      stage: "EVALUATION",
      priority,
      title: "Close the comparison data gap at the Evaluation stage",
      summary: `${clientName} is invisible in ${pct(1 - mentionRate)} of comparison queries at the Evaluation stage${competitorName != null ? `, where ${competitorName} dominates at ${pct(competitorRate!)}` : ""}. Candidates actively comparing employers on compensation, culture, and interview experience rarely see ${clientName} in the AI response.`,
      whyItMatters: `The Evaluation stage is where candidates decide between employers. AI draws on structured data -- salary benchmarks, benefits comparisons, interview reviews -- to answer comparison queries. ${clientName}'s absence from these data sources means AI cannot include the company in head-to-head comparisons, regardless of how strong ${clientName}'s actual employer value proposition is.`,
      targetPlatforms:
        evalGapDomainSample.length > 0
          ? evalGapDomainSample
          : ["levels.fyi", "glassdoor.com", "payscale.com"],
      actions: [
        `Publish salary and equity data on Levels.fyi and PayScale within 30 days.`,
        `Ensure Glassdoor salary section has at least 15 data points per target role within 60 days.`,
        `Publish a transparent compensation philosophy and benefits comparison on the careers page.`,
        `Encourage employees to submit interview experience reviews on Glassdoor and Indeed.`,
        `Schedule a follow-up assessment in 90 days to measure Evaluation-stage mention rate change.`,
      ],
      evidenceBasis:
        `${clientName} appears in ${pct(mentionRate)} of Evaluation queries.` +
        (competitorName != null && competitorRate != null
          ? ` ${competitorName} leads at ${pct(competitorRate)}.`
          : "") +
        (evalGapDomainSample.length > 0
          ? ` Gap domains at this stage include: ${evalGapDomainSample.join(", ")}.`
          : ""),
      expectedImpact: `Establishing structured compensation and comparison data presence closes the primary data gap driving Evaluation-stage invisibility. Establishing presence on gap platforms directly addresses the data absence driving visibility gaps. Improvement is measurable in follow-up assessments.`,
      effort: "MEDIUM",
      timeframe: "60 days",
    });
  }

  return recs;
}

function buildCommitmentRecommendations(
  stageVis: StageVisibility,
  clientName: string,
  isOnlyGap: boolean,
  existingAssetUrls: string[],
): StageRecommendation[] {
  const recs: StageRecommendation[] = [];
  const { mentionRate, gapDomains } = stageVis;

  if (mentionRate >= 0.5) return recs;

  const priority = computeRecommendationPriority(
    "COMMITMENT",
    mentionRate,
    isOnlyGap,
  );
  // Filter to employer-relevant platforms only — news/press domains are excluded
  const allCommitmentGapDomains = gapDomains
    .filter((d) => isEmployerRelevantDomain(normaliseDomain(d)));
  // Separate absent vs. already-present platforms so we don't suggest creating what exists
  const absentCommitmentDomains = allCommitmentGapDomains.filter(
    (d) => !clientHasPlatformPresence(normaliseDomain(d), existingAssetUrls),
  );
  const commitmentTargetPlatforms =
    absentCommitmentDomains.length > 0
      ? absentCommitmentDomains.slice(0, 3)
      : allCommitmentGapDomains.length > 0
        ? allCommitmentGapDomains.slice(0, 3)
        : ["glassdoor.com", "indeed.com"];

  recs.push({
    id: "commitment-improve-application-stage-info",
    stage: "COMMITMENT",
    priority,
    title: "Improve application-stage information availability",
    summary: `${clientName} appears in ${pct(mentionRate)} of Commitment queries -- the stage where candidates research interview processes, onboarding, and offer details. Candidates nearly ready to apply are hitting an information gap that creates friction and candidate drop-off.`,
    whyItMatters: `Commitment-stage candidates have already decided to consider ${clientName} -- they are doing final due diligence before applying. When AI cannot answer questions about ${clientName}'s hiring process, onboarding experience, or offer structure, candidates either apply to competitors with more available information or reduce their application confidence. This is the last stage of the funnel: losing candidates here wastes all upstream acquisition effort.`,
    targetPlatforms: commitmentTargetPlatforms,
    actions: [
      `Encourage recent hires and interviewees to submit Glassdoor and Indeed interview experience reviews within the next 30 days.`,
      `Publish a detailed hiring process page on the careers site covering interview stages, timeline, and what to expect at each step.`,
      `Share onboarding and first-90-days content through the careers page and LinkedIn to give AI indexable commitment-stage signals.`,
      `Ensure the careers page includes offer structure details such as equity vesting, signing bonuses, and relocation policy.`,
    ],
    evidenceBasis: `${clientName} appears in ${pct(mentionRate)} of Commitment queries. Candidates researching interview process and onboarding for ${clientName} find limited information in AI responses.`,
    expectedImpact: `Providing structured application-stage information reduces final-stage candidate drop-off and converts near-ready candidates into actual applicants. Interview and onboarding content typically improves Commitment mention rates within one to two quarterly cycles.`,
    effort: "LOW",
    timeframe: "30 days",
  });

  return recs;
}

function buildMultiStageCollapseRecommendation(
  journey: JourneyAnalysis,
  clientName: string,
): StageRecommendation | null {
  // Requires at least 2 stages with data to be a multi-stage collapse
  if (journey.stages.length < 2) return null;
  if (journey.funnelThroughput >= 0.1) return null;

  const throughputPct = Math.round(journey.funnelThroughput * 100);
  const stageCount = journey.stages.length;
  const gapStageNames = journey.stages
    .filter((s) => s.mentionRate < 0.3)
    .map((s) => STAGE_CONFIGS[s.stage].name);

  return {
    id: "cross-stage-pipeline-collapse",
    stage: "DISCOVERY", // highest funnel position is the starting point
    priority: "CRITICAL",
    title: "Address multi-stage pipeline collapse",
    summary: `Only ${throughputPct}% of AI-researching candidates survive the full ${stageCount}-stage funnel for ${clientName}. Critical gaps at multiple stages compound into near-total pipeline failure from AI-influenced talent.`,
    whyItMatters: `When visibility gaps exist at multiple consecutive funnel stages, the compounding effect collapses the total candidate pipeline. A candidate must encounter ${clientName} at Discovery, learn about it at Consideration, compare it at Evaluation, and apply through Commitment. At current rates, fewer than ${throughputPct + 1} in 100 AI-researching candidates complete this journey -- a structural failure that compounds with every hiring cycle.`,
    targetPlatforms: [],
    actions: [
      `Prioritize gap closure at the ${gapStageNames.length > 0 ? gapStageNames[0] : "Discovery"} stage first -- top-of-funnel gaps produce the largest total pipeline impact.`,
      `Run parallel workstreams across stages: profile creation and content publishing can occur simultaneously across stages.`,
      `Establish a quarterly visibility assessment cadence to measure compounding improvement as each stage gap closes.`,
      `Assign stage ownership to specific team members -- multi-stage remediation requires coordinated execution, not sequential handoffs.`,
    ],
    evidenceBasis: `Funnel throughput is ${throughputPct}%. Critical gaps identified at stages: ${gapStageNames.length > 0 ? gapStageNames.join(", ") : "multiple stages"}.`,
    expectedImpact: `Closing a critical-gap stage can have an outsized effect on total pipeline throughput because gaps at any stage compound across the full funnel. Improvement is measurable in follow-up assessments.`,
    effort: "HIGH",
    timeframe: "90 days",
  };
}

// ─── Priority ordering ────────────────────────────────────────

const PRIORITY_ORDER: Record<
  "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  number
> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

// ─── Strategic recommendation builder ────────────────────────

/**
 * Groups tactical recommendations into strategic themes by stage.
 *
 * Each stage with at least one tactical rec becomes one StrategicRecommendation.
 * The strategic title references the client's specific niche when available —
 * "Own the timeshare sales career narrative" beats "Improve employer brand."
 */
function buildStrategicRecommendations(
  tacticalRecs: StageRecommendation[],
  clientName: string,
  nicheKeywords?: string[],
  industry?: string,
): StrategicRecommendation[] {
  const niche = nicheKeywords && nicheKeywords.length > 0 ? nicheKeywords[0] : null;
  const industryLabel = industry ?? null;

  // Build a context phrase for strategic titles
  const nichePhrase = niche
    ? `${niche} `
    : industryLabel
      ? `${industryLabel} `
      : "";

  // Group by stage — one strategic recommendation per stage that has tactical recs
  const byStage = new Map<DecisionStage, StageRecommendation[]>();
  for (const rec of tacticalRecs) {
    const existing = byStage.get(rec.stage) ?? [];
    existing.push(rec);
    byStage.set(rec.stage, existing);
  }

  const strategicRecs: StrategicRecommendation[] = [];

  for (const [stage, stageTacticals] of byStage) {
    // Priority is the highest priority among the tactical recs in this stage
    const sortedPriorities = stageTacticals
      .map((r) => PRIORITY_ORDER[r.priority])
      .sort((a, b) => a - b);
    const topPriorityLevel = sortedPriorities[0] ?? 3;
    const priority = (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const)[topPriorityLevel]!;

    let strategicTitle: string;
    let strategicSummary: string;

    switch (stage) {
      case "DISCOVERY": {
        const hasCritical = stageTacticals.some((r) => r.priority === "CRITICAL");
        strategicTitle = hasCritical
          ? `Establish ${clientName} as a recognized employer in ${nichePhrase}AI recommendations`
          : `Expand ${clientName}'s discoverability in ${nichePhrase}candidate searches`;
        strategicSummary =
          `${clientName} has low earned visibility at the Discovery stage — the point where candidates form their initial employer consideration set. ` +
          `Candidates who do not encounter ${clientName} in broad discovery searches rarely circle back. ` +
          `This strategy expands the content surface AI draws on when generating ${nichePhrase}employer recommendations.`;
        break;
      }
      case "CONSIDERATION": {
        strategicTitle = `Define what makes ${clientName} the employer of choice for ${nichePhrase}candidates`;
        strategicSummary =
          `When candidates research ${clientName} directly, AI provides a generic or sparse description that fails to differentiate the company from alternatives. ` +
          `This strategy creates the structured employer content AI needs to construct a compelling, specific description of ${clientName} at the Consideration stage.`;
        break;
      }
      case "EVALUATION": {
        strategicTitle = `Win the ${nichePhrase}compensation comparison narrative in AI`;
        strategicSummary =
          `${clientName} is absent or underrepresented when candidates compare employers on compensation, culture, and interview experience. ` +
          `AI draws on structured data — salary benchmarks, benefits comparisons, interview reviews — to answer comparison queries. ` +
          `This strategy ensures AI has the data to position ${clientName} competitively when candidates make their decision.`;
        break;
      }
      case "COMMITMENT": {
        strategicTitle = `Remove friction from the ${clientName} candidate decision point`;
        strategicSummary =
          `Commitment-stage candidates have already decided to consider ${clientName} — they are doing final due diligence before applying. ` +
          `When AI cannot answer questions about hiring process, onboarding, or offer structure, high-intent candidates drop off at the last step. ` +
          `This strategy provides the application-stage signals that convert near-ready candidates into applicants.`;
        break;
      }
    }

    strategicRecs.push({
      id: `strategic-${stage.toLowerCase()}`,
      stage,
      priority,
      strategicTitle,
      strategicSummary,
      tacticalActions: stageTacticals,
    });
  }

  // Sort by priority
  strategicRecs.sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  return strategicRecs;
}

// ─── Main generator ───────────────────────────────────────────

export function generateStageRecommendations(
  input: RecommendationInput,
): RemediationPlan {
  const { journey, client } = input;
  const existingAssetUrls = client.existingAssetUrls ?? [];
  const recs: StageRecommendation[] = [];

  // Determine which stages have gaps (below 0.5 threshold)
  const gapStages = journey.stages.filter((s) => s.mentionRate < 0.5);
  const isOnlyOneGapStage = gapStages.length === 1;

  // Cross-stage collapse check (runs first so it sorts to top if present)
  const collapseRec = buildMultiStageCollapseRecommendation(journey, client.name);
  if (collapseRec) {
    recs.push(collapseRec);
  }

  // Per-stage recommendations
  for (const stageVis of journey.stages) {
    const isOnlyGap =
      isOnlyOneGapStage &&
      gapStages.length > 0 &&
      gapStages[0]!.stage === stageVis.stage;

    switch (stageVis.stage) {
      case "DISCOVERY": {
        const stageRecs = buildDiscoveryRecommendations(
          stageVis,
          client.name,
          isOnlyGap,
          existingAssetUrls,
        );
        recs.push(...stageRecs);
        break;
      }
      case "CONSIDERATION": {
        const stageRecs = buildConsiderationRecommendations(
          stageVis,
          client.name,
          isOnlyGap,
          existingAssetUrls,
        );
        recs.push(...stageRecs);
        break;
      }
      case "EVALUATION": {
        const stageRecs = buildEvaluationRecommendations(
          stageVis,
          client.name,
          isOnlyGap,
          existingAssetUrls,
        );
        recs.push(...stageRecs);
        break;
      }
      case "COMMITMENT": {
        const stageRecs = buildCommitmentRecommendations(
          stageVis,
          client.name,
          isOnlyGap,
          existingAssetUrls,
        );
        recs.push(...stageRecs);
        break;
      }
    }
  }

  // Deduplicate by id (cross-stage collapse may share an id with a per-stage rec in edge cases)
  const seen = new Set<string>();
  const deduped: StageRecommendation[] = [];
  for (const rec of recs) {
    if (!seen.has(rec.id)) {
      seen.add(rec.id);
      deduped.push(rec);
    }
  }

  // Sort by priority (CRITICAL first)
  deduped.sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  const criticalCount = deduped.filter((r) => r.priority === "CRITICAL").length;
  const highCount = deduped.filter((r) => r.priority === "HIGH").length;

  // Top priority stage: the stage of the first CRITICAL rec, then first HIGH rec
  const topPriorityRec = deduped[0] ?? null;
  const topPriorityStage: DecisionStage | null =
    topPriorityRec != null ? topPriorityRec.stage : null;

  const funnelImpactSummary = computeFunnelImpactSummary(
    journey,
    journey.criticalGapStage,
  );

  // Build strategic recommendations — cross-stage collapse rec is excluded
  // (it doesn't map cleanly to one stage strategy; the per-stage strategics cover it)
  const tacticalForStrategic = deduped.filter(
    (r) => r.id !== "cross-stage-pipeline-collapse",
  );
  const strategicRecommendations = buildStrategicRecommendations(
    tacticalForStrategic,
    client.name,
    client.nicheKeywords,
    client.industry,
  );

  return {
    strategicRecommendations,
    recommendations: deduped,
    criticalCount,
    highCount,
    topPriorityStage,
    funnelImpactSummary,
  };
}
