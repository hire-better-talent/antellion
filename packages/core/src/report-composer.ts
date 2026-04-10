import type { ScanComparisonResult, EntityMentionStats } from "./scan-comparison";
import { isEmployerRelevantDomain } from "./employer-platforms";

// ─── Input / Output types ────────────────────────────────────

export interface ReportTable {
  headers: string[];
  rows: (string | number | null)[][];
}

export interface ReportSubsection {
  heading: string;
  body?: string;
  table?: ReportTable;
  items?: string[];
}

export interface ReportSection {
  heading: string;
  body: string;
  subsections?: ReportSubsection[];
}

export interface GeneratedRecommendation {
  category: string;
  priority: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  rationale?: string;
  actions?: string[];
  effortDetail?: string;
}

export interface CoverPage {
  documentTitle: string;
  clientName: string;
  clientDomain: string;
  industry?: string;
  logoUrl?: string;
  assessmentDate: string;
  confidentialityLine: string;
}

export interface ComposedReport {
  title: string;
  coverPage: CoverPage;
  summary: string;
  sections: ReportSection[];
  recommendations: GeneratedRecommendation[];
  /** Fraction of all assessed results backed by at least one citation (0-1). */
  overallSourcedRate?: number;
}

export interface QueryThemeStats {
  theme: string;
  queryCount: number;
  mentionCount: number;
  mentionRate: number;
}

export interface AssessmentScope {
  competitorNames: string[];
  totalQueries: number;
  completedQueries: number;
  queryThemes: string[];
  scanDateRange: [string, string] | null;
  aiModels: string[];
}

export interface ReportConfidence {
  overall?: { score: number; tier: string };
  perSection?: Record<string, { score: number; tier: string }>;
}

export interface JourneyAnalysisInput {
  earnedVisibilityRate?: number;
  earnedVisibilityTier?: string;
  stages?: Array<{
    stage: string;
    mentionRate: number;
    positioning: string;
    metricType: string;
    /** Fraction of results at this stage backed by at least one citation (0-1). */
    sourcedRate?: number;
  }>;
  criticalGapStage?: string | null;
  funnelThroughput?: number;
}

export interface ReportInput {
  clientName: string;
  clientDomain: string;
  industry?: string;
  logoUrl?: string;
  scanComparison: ScanComparisonResult;
  competitors: { name: string; domain: string }[];
  contentAssetTypes: string[];
  /** URLs of existing client ContentAssets — used to avoid recommending platforms the client already has */
  existingAssetUrls?: string[];
  queryThemeBreakdown?: QueryThemeStats[];
  assessmentScope?: AssessmentScope;
  confidence?: ReportConfidence;
  journeyAnalysis?: JourneyAnalysisInput;
  /**
   * Validation rate from multi-run analysis (0–1). When >= 0.7, hedgePhrase upgrades
   * MEDIUM/LOW language to acknowledge cross-validated evidence. Sourced from
   * multiRunAnalysis.validationRate computed by computeMultiRunAnalysis().
   */
  validationRate?: number;
  /** Overall qualitative themes from response analysis — used for richer summary bullets. */
  overallThemes?: {
    positiveAttributes: string[];
    negativeAttributes: string[];
    unsolicitedCompetitors: string[];
    industryFraming: string;
    compensationDetail: "specific" | "vague" | "absent";
    cultureDetail: "specific" | "vague" | "absent";
  };
}

// ─── Source type classifier ──────────────────────────────────

const KNOWN_SOURCE_TYPES: Record<string, string> = {
  "glassdoor.com": "Employee review site",
  "indeed.com": "Job board and review site",
  "linkedin.com": "Professional network",
  "blind.com": "Anonymous employee forum",
  "levels.fyi": "Compensation data platform",
  "builtin.com": "Tech employer directory",
  "comparably.com": "Employee review and culture site",
  "payscale.com": "Compensation research",
  "medium.com": "Blog platform",
  "github.com": "Technical community",
  "stackoverflow.com": "Developer community",
  "reddit.com": "Community forum",
  "techcrunch.com": "Technology press",
  "forbes.com": "Business press",
  "bloomberg.com": "Business and financial press",
  "crunchbase.com": "Company intelligence",
  "wellfound.com": "Startup job platform",
  "teamblind.com": "Anonymous employee forum",
  "vault.com": "Career intelligence",
  "fairygodboss.com": "Women's career community",
};

const GAP_ACTION_TEMPLATES: Record<string, string> = {
  "Employee review site":
    "Encourage employee reviews. Respond to existing reviews. Ensure your employer profile is complete and current.",
  "Job board and review site":
    "Ensure job listings are current and include employer value proposition language. Claim and complete your employer profile.",
  "Compensation data platform":
    "Verify compensation data accuracy. Consider whether transparency improvements would benefit AI representation.",
  "Professional network":
    "Update company page. Publish employer brand content. Encourage employee advocacy posts.",
  "Anonymous employee forum":
    "Monitor sentiment. Address systemic concerns that surface in anonymous feedback.",
  "Tech employer directory":
    "Create or update your employer profile. Add company culture details, tech stack, and perks information.",
  "Blog platform":
    "Publish engineering blog posts, culture stories, and thought leadership content that AI models can index.",
  "Technical community":
    "Increase open-source contributions. Encourage technical employees to participate in community Q&A.",
  "Developer community":
    "Encourage technical employees to participate actively. Reference the company in technical answers where relevant.",
  "Community forum":
    "Monitor relevant threads. Participate authentically in industry discussions.",
  "Business press":
    "Increase press coverage through PR efforts targeting employer brand stories, hiring news, and culture features.",
  "Career intelligence":
    "Ensure your company profile is current with accurate industry, size, and culture information.",
  "Company intelligence":
    "Ensure your company profile is current with accurate funding, leadership, and growth information.",
};

export function classifySourceType(domain: string): string {
  if (KNOWN_SOURCE_TYPES[domain]) return KNOWN_SOURCE_TYPES[domain];
  if (domain.includes("career") || domain.includes("jobs")) return "Career site";
  if (domain.includes("review")) return "Review site";
  if (domain.includes("news") || domain.includes("press")) return "Press/media";
  if (domain.includes("blog")) return "Blog";
  return "Other source";
}

export function gapActionFor(sourceType: string): string {
  return (
    GAP_ACTION_TEMPLATES[sourceType] ??
    "Establish presence on this platform to improve AI visibility."
  );
}

// ─── Helpers ────────────────────────────────────────────────

function pct(rate: number): string {
  const clamped = Math.max(0, Math.min(1, rate));
  return `${Math.round(clamped * 100)}%`;
}

/** Human-readable fraction phrasing: "roughly two-thirds", "fewer than one in three", etc. */
function humanFraction(rate: number): string {
  if (rate >= 0.9) return "nearly all";
  if (rate >= 0.8) return "roughly four out of five";
  if (rate >= 0.7) return "roughly seven in ten";
  if (rate >= 0.6) return "roughly two-thirds";
  if (rate >= 0.5) return "roughly half";
  if (rate >= 0.4) return "roughly two in five";
  if (rate >= 0.3) return "roughly one-third";
  if (rate >= 0.2) return "roughly one in five";
  if (rate >= 0.1) return "fewer than one in five";
  return "fewer than one in ten";
}

function scoreLabel(score: number | null): string {
  if (score == null) return "not available";
  return `${score}/100`;
}

export function sentimentWord(score: number | null): string {
  if (score == null) return "neutral";
  if (score > 0.3) return "positive";
  if (score > 0) return "slightly positive";
  if (score === 0) return "neutral";
  if (score > -0.3) return "slightly negative";
  return "negative";
}

/** Translate sentiment into candidate-behavior implication. */
function sentimentImplication(score: number | null): string {
  if (score == null) return "neither encouraging nor discouraging candidate engagement";
  if (score > 0.3) return "supporting candidate interest and application intent";
  if (score > 0) return "leaning favorable, which mildly supports candidate engagement";
  if (score === 0) return "neither encouraging nor discouraging candidate engagement";
  if (score > -0.3) return "leaning unfavorable, which may dampen candidate interest";
  return "carrying a negative tone that may actively reduce application intent";
}

/** Translate visibility score into a prominence interpretation. */
function visibilityInterpretation(score: number | null): string {
  if (score == null) return "Visibility prominence data is not yet available";
  if (score >= 70)
    return "When AI models do mention the company, it receives prominent positioning in the response — typically named early or featured as a primary recommendation";
  if (score >= 40)
    return "AI responses that include the company give it moderate prominence — present but not featured as a top recommendation";
  return "Even when the company appears in AI responses, the mention is typically brief or peripheral — buried among several alternatives rather than highlighted";
}

export function mentionTier(rate: number): string {
  if (rate >= 0.65) return "strong";
  if (rate >= 0.4) return "moderate";
  if (rate >= 0.2) return "limited";
  return "minimal";
}

// ─── Confidence-aware language ────────────────────────────────

/**
 * Returns qualifying language based on confidence tier and claim type.
 *
 * HIGH or undefined → assert directly (empty string).
 * MEDIUM → scope the claim to the assessed data.
 * LOW → be transparent about sample limitations.
 *
 * Optional validationContext: when provided and validatedRate >= 0.7, language
 * is upgraded for cross-validated assessments:
 *   - HIGH → unchanged (already direct)
 *   - MEDIUM → more direct, citing validation evidence
 *   - LOW → still hedged but acknowledges cross-run validation
 */
export function hedgePhrase(
  tier: string | undefined,
  claimType: "mention" | "sentiment" | "competitor" | "citation",
  validationContext?: { validatedRate: number },
): string {
  if (!tier || tier === "HIGH") return "";

  const isValidated =
    validationContext !== undefined && validationContext.validatedRate >= 0.7;

  if (tier === "MEDIUM") {
    if (isValidated) {
      switch (claimType) {
        case "mention":
          return "Cross-validated assessment data shows ";
        case "sentiment":
          return "Cross-validated sentiment data shows ";
        case "competitor":
          return "Cross-validated competitive data shows ";
        case "citation":
          return "Cross-validated citation data shows ";
      }
    }
    switch (claimType) {
      case "mention":
        return "Based on the queries evaluated, ";
      case "sentiment":
        return "Sentiment indicators suggest ";
      case "competitor":
        return "Available data indicates ";
      case "citation":
        return "Citation patterns suggest ";
    }
  }

  // LOW
  if (isValidated) {
    switch (claimType) {
      case "mention":
        return "Despite validation across multiple scans, limited data suggests ";
      case "sentiment":
        return "Despite validation across multiple scans, sentiment signals remain limited; directionally, ";
      case "competitor":
        return "Despite validation across multiple scans, preliminary data suggests ";
      case "citation":
        return "Despite validation across multiple scans, citation data remains limited; ";
    }
  }

  switch (claimType) {
    case "mention":
      return "With a limited query sample, preliminary data indicates ";
    case "sentiment":
      return "Sentiment data is limited; directionally, ";
    case "competitor":
      return "Preliminary data suggests ";
    case "citation":
      return "With limited citation data, ";
  }
}

/**
 * Returns a source-quality phrase for a stage based on how many results had citations.
 * Only fires when confidence is MEDIUM or HIGH — when confidence is already LOW the
 * hedgePhrase already covers data quality limitations.
 *
 * Returns empty string when sourced rate is high (>= 0.7) or when confidence is LOW.
 */
export function sourceQualityPhrase(
  sourcedRate: number,
  confidenceTier: string | undefined,
): string {
  // Don't double-hedge: LOW confidence language already covers data quality
  if (confidenceTier === "LOW") return "";
  if (sourcedRate >= 0.7) return "";
  if (sourcedRate >= 0.4) return "Based on a mix of sourced and unsourced AI responses, ";
  return "Most AI responses at this stage did not cite external sources. While directionally informative, ";
}

/** Compute the ratio of competitor-to-client visibility for advisory language. */
function visibilityMultiple(competitorRate: number, clientRate: number): string {
  if (clientRate <= 0) return "significantly more";
  const ratio = competitorRate / clientRate;
  if (ratio <= 1.05) return "roughly equally";
  if (ratio >= 10) return `${Math.round(ratio)}x more`;
  return `${ratio.toFixed(1)}x more`;
}

/** Map internal category enum values to buyer-facing category labels. */
function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    CONTENT_GAP: "content and citation",
    COMPETITIVE_POSITIONING: "competitive positioning",
    EMPLOYER_BRAND: "employer brand signal",
    TECHNICAL_REPUTATION: "technical reputation",
    CULTURE_SIGNAL: "culture and sentiment",
  };
  return labels[category] ?? category.toLowerCase().replace(/_/g, " ");
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

function topCompetitor(
  mentions: EntityMentionStats[],
): EntityMentionStats | undefined {
  return mentions
    .filter((e) => !e.isClient)
    .sort((a, b) => b.mentionRate - a.mentionRate)[0];
}

// ─── Section generators ─────────────────────────────────────

function composeAssessmentScopeSection(input: ReportInput): ReportSection {
  const { scanComparison: sc, competitors, assessmentScope } = input;

  // Prefer explicit scope when provided; derive from scan data otherwise
  const scope = assessmentScope;

  const competitorNames =
    scope?.competitorNames ?? competitors.map((c) => c.name);
  const totalQueries = scope?.totalQueries ?? sc.totalQueries;
  const completedQueries = scope?.completedQueries ?? sc.completedQueries;
  const queryThemes = scope?.queryThemes ?? [];
  const aiModels = scope?.aiModels ?? [];

  const companiesAssessed = [input.clientName, ...competitorNames];

  const subsections: ReportSubsection[] = [];

  // Companies assessed
  subsections.push({
    heading: "Companies assessed",
    items: companiesAssessed,
  });

  // Query coverage
  const coverageBody = `${completedQueries} of ${totalQueries} queries evaluated across ${queryThemes.length > 0 ? queryThemes.length : "multiple"} intent theme${queryThemes.length !== 1 ? "s" : ""}.${queryThemes.length > 0 ? ` Themes: ${queryThemes.join(", ")}.` : ""}`;
  subsections.push({
    heading: "Query coverage",
    body: coverageBody,
  });

  // Scoring methodology
  const methodologyParts: string[] = [
    "Mention rate measures how often each employer appears in AI-generated responses — the percentage of evaluated queries in which the employer was named or recommended.",
    "Visibility score reflects how prominently the employer is positioned within those responses (featured recommendation vs. passing mention).",
    "Sentiment score captures the overall tone AI models use when describing the employer, which influences whether a mention converts to candidate interest.",
  ];
  if (aiModels.length > 0) {
    methodologyParts.push(`AI models evaluated: ${aiModels.join(", ")}.`);
  }
  subsections.push({
    heading: "Scoring methodology",
    body: methodologyParts.join(" "),
  });

  return {
    heading: "Assessment scope and methodology",
    body: `This assessment evaluated AI visibility for ${companiesAssessed.length} ${companiesAssessed.length === 1 ? "company" : "companies"} across ${completedQueries} candidate queries.`,
    subsections,
  };
}

function composeVisibilitySection(
  input: ReportInput,
  sectionConfidence?: { score: number; tier: string },
): ReportSection {
  const { scanComparison: sc, clientName } = input;
  const client = sc.entityMentions.find((e) => e.isClient);
  const top = topCompetitor(sc.entityMentions);
  const validationCtx = input.validationRate !== undefined ? { validatedRate: input.validationRate } : undefined;
  const hedge = hedgePhrase(sectionConfidence?.tier, "mention", validationCtx);

  const paragraphs: string[] = [];

  // Opening narrative — use earned visibility when journey data is present
  const journey = input.journeyAnalysis;

  if (client && sc.completedQueries > 0) {
    if (journey && journey.earnedVisibilityRate !== undefined && journey.earnedVisibilityTier) {
      // Journey-aware opening: lead with earned visibility
      const earnedRate = journey.earnedVisibilityRate;
      const earnedTier = journey.earnedVisibilityTier;

      if (earnedTier === "strong") {
        paragraphs.push(
          `${hedge}${clientName} has strong earned AI visibility — AI independently surfaces the company in ${pct(earnedRate)} of discovery and comparison queries without the company being named in the prompt. ` +
          `Across ${sc.completedQueries} evaluated scenarios, ${clientName} appears organically in AI employer recommendations.`,
        );
      } else if (earnedTier === "moderate") {
        paragraphs.push(
          `${hedge}${clientName} has moderate earned AI visibility at ${pct(earnedRate)}. When candidates explore employer options through AI without naming ${clientName} directly — the queries where visibility must be earned — the company appears in some but not most responses. ` +
          `Candidates who already know ${clientName} will find adequate information, but those browsing broadly may never encounter it.`,
        );
      } else if (earnedTier === "weak") {
        paragraphs.push(
          `${hedge}${clientName} has weak earned AI visibility at ${pct(earnedRate)}. In queries where candidates explore employers without naming ${clientName} — the Discovery and Evaluation stages where visibility must be earned — the company rarely appears. ` +
          `The majority of AI-influenced candidates will complete their employer research without encountering ${clientName} unless they already know to search for it by name.`,
        );
      } else {
        paragraphs.push(
          `${hedge}${clientName} is effectively invisible in earned AI visibility at ${pct(earnedRate)}. When candidates ask AI about employers, career options, or competitive comparisons without naming ${clientName} directly, the company does not appear. ` +
          `Only candidates who already know ${clientName} and search for it by name will find it through AI. The broader talent market — candidates exploring options — will never encounter it.`,
        );
      }

      // Add stage context
      if (journey.criticalGapStage) {
        const stageName = journey.criticalGapStage.charAt(0) + journey.criticalGapStage.slice(1).toLowerCase();
        paragraphs.push(
          `The critical gap is at the ${stageName} stage — the point in the candidate journey where this low visibility has the highest impact on hiring outcomes.`,
        );
      }
    } else {
      // Legacy path: no journey data, use flat aggregate
      const tier = mentionTier(sc.clientMentionRate);
      const weakestTheme = input.queryThemeBreakdown && input.queryThemeBreakdown.length > 0
        ? [...input.queryThemeBreakdown].sort((a, b) => a.mentionRate - b.mentionRate)[0]
        : undefined;

      if (tier === "strong") {
        paragraphs.push(
          `${hedge}${clientName} holds a strong position in AI-driven candidate discovery, appearing in ${humanFraction(sc.clientMentionRate)} of the candidate queries evaluated in this assessment. ` +
          `Across ${sc.completedQueries} candidate-intent scenarios spanning reputation, compensation, culture, and competitive comparison, ` +
          `AI models mentioned ${clientName} in ${client.mentionCount} responses.`,
        );
      } else if (tier === "moderate") {
        paragraphs.push(
          `${hedge}${clientName} appears in some but not most candidate queries — a ${pct(sc.clientMentionRate)} mention rate across ${sc.completedQueries} evaluated scenarios. ` +
          `This creates an inconsistent employer signal: candidates may encounter ${clientName} in some AI research paths but miss it entirely in others` +
          (weakestTheme ? ` — particularly in ${weakestTheme.theme} queries where visibility drops to ${pct(weakestTheme.mentionRate)}` : "") +
          `.`,
        );
      } else {
        paragraphs.push(
          `${hedge}${clientName} appears in ${humanFraction(sc.clientMentionRate)} of the candidate queries evaluated in this assessment (${pct(sc.clientMentionRate)} mention rate across ${sc.completedQueries} scenarios). ` +
          `At this visibility level, the majority of candidates using AI for employer research will complete their evaluation without ever encountering ${clientName}. ` +
          `This translates directly to reduced application volume from AI-influenced candidates — pipeline leakage at the awareness stage that compounds with every hiring cycle.`,
        );
      }
    }
  } else {
    paragraphs.push(`No scan results have been recorded for ${clientName}. Complete at least one visibility scan to generate findings.`);
  }

  // Current-state framing — make clear this is not a future risk
  if (client && sc.completedQueries > 0) {
    paragraphs.push(
      `This is not a projected risk. Candidates are using AI for employer research today, and these results reflect how ${clientName} appears in those conversations right now.`,
    );
  }

  // Visibility prominence interpretation
  if (sc.avgVisibilityScore != null) {
    paragraphs.push(
      `${visibilityInterpretation(sc.avgVisibilityScore)} (visibility score: ${scoreLabel(sc.avgVisibilityScore)}).`,
    );
  }

  // Sentiment interpretation — connected to candidate behavior
  if (sc.avgSentimentScore != null && sc.completedQueries > 0) {
    const word = sentimentWord(sc.avgSentimentScore);
    const sentimentHedge = hedgePhrase(sectionConfidence?.tier, "sentiment", validationCtx);
    let sentimentNarrative: string;
    if (sc.avgSentimentScore > 0.3) {
      sentimentNarrative =
        `${sentimentHedge}AI responses that reference ${clientName} carry a ${word} tone overall. ` +
        `Positive sentiment reinforces candidate interest, increasing the likelihood that visibility converts to actual applications. ` +
        `This is a meaningful asset: ${clientName} is not only appearing in AI responses but being presented in a way that encourages engagement.`;
    } else if (sc.avgSentimentScore > 0) {
      sentimentNarrative =
        `${sentimentHedge}AI responses that reference ${clientName} carry a ${word} tone overall. ` +
        `Neutral-to-positive sentiment means ${clientName} is present but undifferentiated — appearing without a strongly compelling reason for candidates to prioritize it over alternatives. ` +
        `Because AI tools present tone alongside facts, this framing influences whether candidates move ${clientName} into their active consideration set or continue evaluating competitors.`;
    } else if (sc.avgSentimentScore > -0.3) {
      sentimentNarrative =
        `${sentimentHedge}AI responses that reference ${clientName} carry a ${word} tone overall. ` +
        `This sentiment means ${clientName} is present but the framing leans unfavorable — candidates who encounter ${clientName} receive a lukewarm signal that may cause them to deprioritize it relative to competitors with warmer characterizations.`;
    } else {
      sentimentNarrative =
        `${sentimentHedge}AI responses that reference ${clientName} carry a ${word} tone overall. ` +
        `Negative AI sentiment actively discourages applications — candidates who do encounter ${clientName} receive a signal to look elsewhere. ` +
        `This converts what should be a visibility asset into a liability: appearing in AI responses with negative framing can be worse than not appearing at all.`;
    }
    paragraphs.push(sentimentNarrative);
  }

  // Contextual comparison callout within visibility section
  if (top && top.mentionRate > sc.clientMentionRate && sc.completedQueries > 0) {
    const gap = Math.round((top.mentionRate - sc.clientMentionRate) * 100);
    const comparisonSentence = sc.clientMentionRate <= 0
      ? `Candidates evaluating employers in this space will encounter ${top.name} in AI responses without ever finding ${clientName} — ${clientName} does not appear at all in the current scan.`
      : `In practical terms, candidates evaluating employers in this space are ${visibilityMultiple(top.mentionRate, sc.clientMentionRate)} likely to shortlist ${top.name} before they ever consider ${clientName}.`;
    paragraphs.push(
      `For context, ${top.name} — the most visible competitor in this assessment — captures candidate attention in ${pct(top.mentionRate)} of AI employer queries, ${gap} percentage points ahead of ${clientName}. ` +
      `${comparisonSentence} ` +
      `This advantage compounds: candidates who discover ${top.name} first often narrow their search before reaching less-visible alternatives.`,
    );
  }

  // LOW confidence: add data quality note as a subsection
  const subsections: ReportSubsection[] = [];
  if (sectionConfidence?.tier === "LOW") {
    subsections.push({
      heading: "Data quality note",
      body: "This finding is based on a limited sample of query results. Confidence in the exact percentages is preliminary. A larger assessment would provide definitive measurement.",
    });
  }

  return {
    heading: "Visibility findings",
    body: paragraphs.join("\n\n"),
    ...(subsections.length > 0 ? { subsections } : {}),
  };
}

function composeCompetitorSection(
  input: ReportInput,
  sectionConfidence?: { score: number; tier: string },
): ReportSection {
  const { scanComparison: sc, clientName, industry } = input;
  const competitors = sc.entityMentions.filter((e) => !e.isClient);
  const industryPhrase = industry
    ? `${industry} employers`
    : "employers in this space";
  const validationCtx = input.validationRate !== undefined ? { validatedRate: input.validationRate } : undefined;
  const hedge = hedgePhrase(sectionConfidence?.tier, "competitor", validationCtx);
  const isLow = sectionConfidence?.tier === "LOW";
  const needsHedge = sectionConfidence?.tier === "MEDIUM" || isLow;

  if (competitors.length === 0) {
    return {
      heading: "Competitor analysis",
      body: "No competitor data available for this analysis.",
    };
  }

  const lines: string[] = [];

  const leading = competitors.filter((c) => c.mentionRate > sc.clientMentionRate);
  const trailing = competitors.filter((c) => c.mentionRate <= sc.clientMentionRate);
  const top = topCompetitor(sc.entityMentions);

  if (leading.length > 0) {
    for (const c of leading) {
      const gap = Math.round((c.mentionRate - sc.clientMentionRate) * 100);
      const zeroRate = sc.clientMentionRate <= 0;
      const comparisonClause = zeroRate
        ? `Candidates evaluating ${industryPhrase} will encounter ${c.name} without ever finding ${clientName}.`
        : `Candidates evaluating ${industryPhrase} are ${visibilityMultiple(c.mentionRate, sc.clientMentionRate)} likely to shortlist ${c.name} before they ever consider ${clientName}.`;
      if (needsHedge) {
        lines.push(
          `${hedge}${c.name} appears to lead ${clientName} by approximately ${gap} percentage points in AI employer queries (${pct(c.mentionRate)} vs. ${pct(sc.clientMentionRate)})${isLow ? ", based on a limited sample" : ""}. ${comparisonClause}`,
        );
      } else {
        lines.push(
          `${c.name} captures candidate attention in ${pct(c.mentionRate)} of AI employer queries — ${gap} percentage points ahead of ${clientName}. ${comparisonClause}`,
        );
      }
    }
  }

  if (trailing.length > 0) {
    const names = trailing.map((c) => `${c.name} (${pct(c.mentionRate)})`);
    lines.push(
      `${clientName} holds a visibility advantage over ${names.join(" and ")} — but this positioning is relative, not absolute. A lead over lower-visibility competitors does not offset the deficit against those who rank above.`,
    );
  }

  if (top && top.mentionRate > sc.clientMentionRate) {
    const gap = Math.round((top.mentionRate - sc.clientMentionRate) * 100);
    if (top.mentionRate >= 0.2) {
      // Competitor has meaningful visibility — real competitive risk
      lines.push(
        `This is the most significant competitive risk identified in this assessment. When ${clientName} and ${top.name} are competing for the same candidate, ${top.name}'s ${gap}-point AI visibility advantage means candidates are more likely to encounter ${top.name} during their research. This gap compounds across every open requisition where both companies compete for talent.`,
      );
    } else {
      // Both are barely visible — frame as a shared gap, not a competitive loss
      lines.push(
        `Neither ${clientName} nor ${top.name} has strong AI visibility in this space. The ${gap}-point gap is small in absolute terms — the larger issue is that both companies are largely absent from AI-driven candidate discovery.`,
      );
    }
  }

  // Build comparison table
  const clientEntry = sc.entityMentions.find((e) => e.isClient);
  const allEntities = [
    ...(clientEntry ? [clientEntry] : []),
    ...competitors.sort((a, b) => b.mentionRate - a.mentionRate),
  ];

  const tableRows: (string | number | null)[][] = allEntities.map((e) => {
    const gapPp = Math.round((e.mentionRate - sc.clientMentionRate) * 100);
    const gap = e.isClient
      ? "—"
      : gapPp > 0
        ? `+${gapPp}pp`
        : gapPp < 0
          ? `${gapPp}pp`
          : "0pp";
    return [
      e.isClient ? `${e.name} (client)` : e.name,
      pct(e.mentionRate),
      e.mentionCount,
      gap,
    ];
  });

  const subsections: ReportSubsection[] = [
    {
      heading: "Competitive visibility comparison",
      table: {
        headers: ["Company", "AI Mention Rate", "Mentions", "Gap vs. Client"],
        rows: tableRows,
      },
    },
  ];

  return {
    heading: "Competitor analysis",
    body: lines.join(" "),
    subsections,
  };
}

function composeCitationSection(
  input: ReportInput,
  sectionConfidence?: { score: number; tier: string },
): ReportSection {
  const { citations } = input.scanComparison;
  const validationCtx = input.validationRate !== undefined ? { validatedRate: input.validationRate } : undefined;
  const hedge = hedgePhrase(sectionConfidence?.tier, "citation", validationCtx);

  if (citations.totalDomains === 0) {
    return {
      heading: "Citation patterns",
      body: "No citation data available.",
    };
  }

  const openingParts: string[] = [];
  openingParts.push(
    `${hedge}AI models referenced ${citations.totalDomains} unique sources when generating employer recommendations in this assessment. The sources AI chooses to cite directly shape which employers candidates see — and which they never hear about.`,
  );

  if (citations.gapDomains.length > 0) {
    openingParts.push(
      `This analysis identified ${citations.gapDomains.length} citation gap${citations.gapDomains.length === 1 ? "" : "s"} — source${citations.gapDomains.length === 1 ? "" : "s"} where AI models actively retrieve competitor information but find nothing about ${input.clientName}. Each gap source is a platform that AI models reference when generating employer recommendations. Competitor presence on these platforms — and ${input.clientName}'s absence — is a primary driver of the visibility disparity identified in this assessment. Closing these gaps is not about SEO or web traffic; it is about ensuring AI models have ${input.clientName}-specific data to draw from when candidates ask where to work.`,
    );
  }

  const subsections: ReportSubsection[] = [];

  // 1. Citation landscape table (top 10 cited domains)
  const top10 = citations.domainFrequency.slice(0, 10);
  if (top10.length > 0) {
    subsections.push({
      heading: "Citation landscape",
      table: {
        headers: ["Domain", "Source type", "Citation count"],
        rows: top10.map((df) => [
          df.domain,
          classifySourceType(df.domain),
          df.count,
        ]),
      },
    });
  }

  // 2. Citation gaps and recommended actions
  if (citations.gapDomains.length > 0) {
    subsections.push({
      heading: "Citation gaps and recommended actions",
      table: {
        headers: ["Domain", "Source type", "Recommended action"],
        rows: citations.gapDomains.map((domain) => {
          const sourceType = classifySourceType(domain);
          return [domain, sourceType, gapActionFor(sourceType)];
        }),
      },
    });
  }

  // 3. Defensible visibility advantages
  if (citations.clientExclusiveDomains.length > 0) {
    subsections.push({
      heading: "Defensible visibility advantages",
      body: `${citations.clientExclusiveDomains.length} source${citations.clientExclusiveDomains.length === 1 ? "" : "s"} cite ${input.clientName} but no assessed competitors. These represent defensible advantages worth maintaining — if competitors establish presence on these platforms, ${input.clientName}'s differentiation narrows.`,
      items: citations.clientExclusiveDomains,
    });
  }

  // 4. Contested sources
  if (citations.sharedDomains.length > 0) {
    subsections.push({
      heading: "Contested sources",
      body: `${citations.sharedDomains.length} source${citations.sharedDomains.length === 1 ? "" : "s"} cite both ${input.clientName} and competitors. On these platforms, the quality, recency, and volume of employer content determine which company AI models highlight first.`,
      items: citations.sharedDomains,
    });
  }

  return {
    heading: "Citation patterns",
    body: openingParts.join(" "),
    subsections,
  };
}

function composeQueryIntentMapSection(
  input: ReportInput,
): ReportSection | null {
  const { queryThemeBreakdown } = input;

  if (!queryThemeBreakdown || queryThemeBreakdown.length === 0) {
    return null;
  }

  function statusTier(rate: number): string {
    if (rate >= 0.65) return "Strong";
    if (rate >= 0.4) return "Moderate";
    if (rate >= 0.2) return "Weak";
    return "Critical gap";
  }

  const sorted = [...queryThemeBreakdown].sort(
    (a, b) => b.mentionRate - a.mentionRate,
  );

  const tableRows: (string | number | null)[][] = sorted.map((t) => [
    t.theme,
    t.queryCount,
    t.mentionCount,
    pct(t.mentionRate),
    statusTier(t.mentionRate),
  ]);

  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const narrativeParts: string[] = [];

  narrativeParts.push(
    `These themes map to the stages of a candidate's AI-assisted employer evaluation. Gaps in early-stage themes (reputation, culture) mean candidates filter out ${input.clientName} before reaching later-stage themes (compensation, hiring process) where ${input.clientName} may be stronger. ` +
    `Each intent theme represents a distinct category of questions candidates ask AI, and gaps in any single theme mean ${input.clientName} is invisible during that phase of the candidate's research.`,
  );

  if (strongest && weakest && strongest.theme !== weakest.theme) {
    narrativeParts.push(
      `${input.clientName} has the strongest presence in "${strongest.theme}" queries (${pct(strongest.mentionRate)} mention rate), where AI models consistently surface the company. ` +
        `The weakest area is "${weakest.theme}" (${pct(weakest.mentionRate)}) — candidates asking AI about this topic are unlikely to encounter ${input.clientName}, making it the highest-priority theme for improvement.`,
    );
  } else if (strongest) {
    narrativeParts.push(
      `Visibility is most consistent in the "${strongest.theme}" intent theme (${pct(strongest.mentionRate)} mention rate).`,
    );
  }

  // Theme-specific damage reasons for critical gaps
  const themeDamageReason: Record<string, string> = {
    "Compensation & Benefits": "compensation queries occur at the consideration stage — candidates who do not see competitive pay signals will deprioritize the company regardless of other strengths",
    "Culture & Work-Life Balance": "culture and work-life balance queries are trust signals — candidates who find no information assume the worst, not the best",
    "Engineering Culture & Reputation": "engineering culture queries drive the highest-intent technical candidates — invisibility here means losing the candidates most likely to accept",
    "Competitor Comparison": "head-to-head comparison queries represent candidates actively deciding between employers — absence here means losing at the decision point",
    "Hiring Process & Candidate Experience": "hiring process queries represent candidates already considering an application — invisibility at this stage loses candidates who are nearly in the pipeline",
    "Role Expectations & Impact": "role expectation queries represent candidates evaluating fit — without this information, candidates cannot picture themselves at the company",
  };

  const criticalGaps = sorted.filter((t) => t.mentionRate < 0.2);
  if (criticalGaps.length > 0) {
    const gapDescriptions = criticalGaps.map((t) => {
      const reason = themeDamageReason[t.theme];
      const base = `A critical gap in "${t.theme}" (${pct(t.mentionRate)}) means candidates asking AI about this topic are effectively told ${input.clientName} does not exist in this space.`;
      return reason ? `${base} For this theme, this is particularly damaging because ${reason}.` : base;
    });
    narrativeParts.push(
      `${criticalGaps.length} theme${criticalGaps.length === 1 ? "" : "s"} fall${criticalGaps.length === 1 ? "s" : ""} below 20% mention rate — a critical threshold below which ${input.clientName} is functionally invisible. ` +
      gapDescriptions.join(" "),
    );
  }

  return {
    heading: "Query intent map",
    body: narrativeParts.join(" "),
    subsections: [
      {
        heading: "Visibility by intent theme",
        table: {
          headers: [
            "Intent theme",
            "Queries evaluated",
            "Client mentioned",
            "Mention rate",
            "Status",
          ],
          rows: tableRows,
        },
      },
    ],
  };
}

// ─── Recommendation generation ───────────────────────────────

function generateRecommendations(input: ReportInput): GeneratedRecommendation[] {
  const recs: GeneratedRecommendation[] = [];
  const { scanComparison: sc, clientName, contentAssetTypes, industry } = input;
  const existingUrls = input.existingAssetUrls ?? [];
  const top = topCompetitor(sc.entityMentions);
  const industryPhrase = industry
    ? `${industry} employers`
    : "employers in this space";

  // 1. Content and citation gaps — filter to employer-relevant platforms before recommending
  // Non-employer domains (barrons.com, forbes.com, techcrunch.com, etc.) are excluded from
  // recommendation generation. They still appear in the citation landscape table for context.
  const employerRelevantGapDomains = sc.citations.gapDomains.filter((d) =>
    isEmployerRelevantDomain(d),
  );
  if (employerRelevantGapDomains.length > 0) {
    const trulyAbsentDomains = employerRelevantGapDomains.filter(
      (d) => !clientHasPlatformPresence(d, existingUrls),
    );
    const presentButWeakDomains = employerRelevantGapDomains.filter(
      (d) => clientHasPlatformPresence(d, existingUrls),
    );

    if (trulyAbsentDomains.length > 0) {
      const topGapDomains = trulyAbsentDomains.slice(0, 3);
      const topGapTypes = topGapDomains.map((d) => classifySourceType(d).toLowerCase());
      recs.push({
        category: "CONTENT_GAP",
        priority: trulyAbsentDomains.length > 3 ? "HIGH" : "MEDIUM",
        title: "Close citation gaps on key career and compensation platforms",
        description:
          `AI models cite ${trulyAbsentDomains.length} source${trulyAbsentDomains.length === 1 ? "" : "s"} when discussing competitors where ${clientName} has no presence, ` +
          `including ${topGapTypes.slice(0, 2).join(" and ")} platforms (${topGapDomains.join(", ")}). ` +
          `Establishing presence on these platforms is the most direct path to increasing the number of AI responses that reference ${clientName}.`,
        impact:
          `Each citation gap represents a source where AI models already retrieve employer information but find nothing about ${clientName}. Closing these gaps expands the content surface that AI draws on when answering candidate queries about ${industryPhrase}. Establishing presence on gap platforms directly addresses the data absence driving visibility gaps. Improvement is measurable in follow-up assessments.`,
        effort: trulyAbsentDomains.length > 3 ? "High" : "Medium",
      });
    }

    if (presentButWeakDomains.length > 0) {
      const topWeakDomains = presentButWeakDomains.slice(0, 3);
      recs.push({
        category: "CONTENT_GAP",
        priority: "MEDIUM",
        title: "Strengthen existing profiles on platforms where visibility lags competitors",
        description:
          `${clientName} has a presence on ${presentButWeakDomains.join(", ")} but is still not being cited by AI models in competitor-comparison queries. ` +
          `This suggests the existing profiles lack the depth, recency, or structured content that AI models prioritize. ` +
          `Strengthening these profiles — rather than creating them from scratch — is the appropriate next step.`,
        impact:
          `Improving content depth on platforms where ${clientName} is already present is typically faster and higher-ROI than establishing new profiles. ` +
          `Each strengthened profile gives AI models richer data to draw on when generating employer recommendations for ${industryPhrase}.`,
        effort: "Medium",
      });
    }
  }

  // 2. Competitive positioning
  if (top && top.mentionRate > sc.clientMentionRate) {
    const gap = Math.round((top.mentionRate - sc.clientMentionRate) * 100);
    const multiple = visibilityMultiple(top.mentionRate, sc.clientMentionRate);
    recs.push({
      category: "COMPETITIVE_POSITIONING",
      priority: gap > 30 ? "CRITICAL" : "HIGH",
      title: `Strengthen AI presence in competitive comparison queries against ${top.name}`,
      description:
        `${top.name} holds a ${gap} percentage point lead over ${clientName} in AI mention rate, making candidates ${multiple} likely to encounter ${top.name} when researching ${industryPhrase} through AI. ` +
        `Narrowing this gap requires differentiated employer content in the query themes where ${top.name} currently dominates — particularly compensation, culture, and reputation queries.`,
      impact:
        `Addresses the largest competitive visibility gap identified in this assessment. Every percentage point of mention rate recovered shifts candidate consideration from ${top.name} toward ${clientName}. Closing this gap would ensure candidates evaluating ${industryPhrase} encounter ${clientName} alongside ${top.name} rather than only discovering ${top.name}.`,
      effort: "High",
    });
  }

  // 3. Employer brand signal density
  if (sc.clientMentionRate < 0.5 && sc.completedQueries > 0) {
    recs.push({
      category: "EMPLOYER_BRAND",
      priority: sc.clientMentionRate < 0.3 ? "CRITICAL" : "HIGH",
      title: "Increase employer brand signal density across authoritative platforms",
      description:
        `At ${pct(sc.clientMentionRate)} mention rate, ${clientName} appears in ${humanFraction(sc.clientMentionRate)} of AI-driven candidate queries — below the threshold for consistent consideration. ` +
        `AI models build employer recommendations from the volume, recency, and consistency of indexed content. ` +
        `Increasing structured employer data across review sites, professional networks, and career pages raises baseline visibility.`,
      impact:
        `Moves ${clientName} from an inconsistent presence in AI responses to a reliable one, directly expanding the candidate pipeline from AI-influenced talent. Each platform with complete, current employer content adds a signal that AI models use to decide whether to recommend ${clientName}. Strengthening these signals addresses the gap that currently causes candidates to complete their employer research without ever encountering ${clientName}.`,
      effort: "Medium",
    });
  }

  // 4. Technical reputation
  const hasTechContent = contentAssetTypes.some((t) =>
    ["BLOG_POST", "SOCIAL_PROFILE"].includes(t),
  );
  if (!hasTechContent) {
    recs.push({
      category: "TECHNICAL_REPUTATION",
      priority: "MEDIUM",
      title: "Build a public technical content presence to reach engineering candidates",
      description:
        `This assessment found no engineering blog or active technical social presence for ${clientName}. ` +
        `Technical candidates research employer credibility through engineering-specific signals — open-source contributions, engineering blogs, developer community participation, and conference presence. ` +
        `Without these signals, ${clientName} is unlikely to appear in AI responses to engineering and product role queries.`,
      impact:
        `Technical content is weighted heavily by AI models for role-specific queries. Establishing this presence opens a candidate segment that ${clientName} currently cannot reach through AI.`,
      effort: "Medium",
    });
  }

  // 5. Sentiment and culture perception
  if (sc.avgSentimentScore != null && sc.avgSentimentScore < 0) {
    const word = sentimentWord(sc.avgSentimentScore);
    recs.push({
      category: "CULTURE_SIGNAL",
      priority: sc.avgSentimentScore < -0.3 ? "HIGH" : "MEDIUM",
      title: "Address underlying perception issues driving negative AI sentiment",
      description:
        `AI responses about ${clientName} carry a ${word} tone, ${sentimentImplication(sc.avgSentimentScore)}. ` +
        `This sentiment is a lagging indicator drawn from review sites, press coverage, and social discourse. ` +
        `Addressing root causes — rather than surface-level reputation management — is the most effective path to improving how AI models characterize ${clientName} to candidates.`,
      impact:
        `Even when ${clientName} is mentioned in an AI response, negative framing reduces the likelihood that a candidate will take the next step. Improving sentiment converts existing mentions into genuine candidate interest — addressing the critical gap that currently causes AI to discourage rather than encourage candidates who do encounter ${clientName}.`,
      effort: "High",
    });
  }

  // 6. Careers page presence
  const hasCareersPage = contentAssetTypes.includes("CAREERS_PAGE");
  if (!hasCareersPage && sc.completedQueries > 0) {
    recs.push({
      category: "CONTENT_GAP",
      priority: "HIGH",
      title: "Publish a structured careers page as a foundational AI signal",
      description:
        `This assessment found no structured careers page for ${clientName}. ` +
        `A well-organized careers page — with role categories, team culture descriptions, benefits, and compensation philosophy — is one of the highest-weighted signals AI models use when evaluating whether to recommend an employer. ` +
        `This is typically the fastest, lowest-effort improvement available.`,
      impact:
        `Careers pages serve as a primary reference for AI models answering employer-fitness queries. Establishing this signal addresses a foundational gap that limits ${clientName}'s visibility across nearly all candidate intent themes.`,
      effort: "Low",
    });
  }

  // Sort: CRITICAL > HIGH > MEDIUM > LOW
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  recs.sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3),
  );

  return recs;
}

// ─── Recommendation enrichment ───────────────────────────────

function enrichTopRecommendations(
  recs: GeneratedRecommendation[],
  input: ReportInput,
): void {
  const { scanComparison: sc, clientName, industry } = input;
  const top = topCompetitor(sc.entityMentions);
  const industryPhrase = industry
    ? `${industry} employers`
    : "employers in this space";

  const top3 = recs.slice(0, 3);

  for (const rec of top3) {
    switch (rec.category) {
      case "CONTENT_GAP": {
        // Use employer-relevant gaps only — news/press domains are not actionable here
        const enrichGapDomains = sc.citations.gapDomains.filter((d) =>
          isEmployerRelevantDomain(d),
        );
        const topGaps = enrichGapDomains.slice(0, 3);
        const topGapTypes = topGaps.map((d) => classifySourceType(d).toLowerCase());
        rec.rationale =
          `As identified in the citation analysis, ${enrichGapDomains.length} employer platform${enrichGapDomains.length === 1 ? "" : "s"} — including ${topGapTypes.slice(0, 2).join(" and ")} platforms — actively inform AI models about competitors but contain no indexed content for ${clientName}. ` +
          `These are not hypothetical opportunities: AI models are already retrieving employer information from these sources when responding to candidate queries. ` +
          `Closing these gaps would increase ${clientName}'s visibility across multiple query themes, ensuring candidates evaluating ${industryPhrase} encounter ${clientName} alongside competitors rather than only discovering alternatives. ` +
          `Establishing presence on gap platforms directly addresses the data absence driving visibility gaps. Improvement is measurable in follow-up assessments.`;
        rec.actions = [
          `Prioritize the top ${Math.min(3, enrichGapDomains.length)} employer platform gaps by AI citation frequency: ${topGaps.length > 0 ? topGaps.join(", ") : "Glassdoor, LinkedIn, and Builtin"}.`,
          `Create or claim employer profiles on each target platform within 30 days, starting with the highest-cited sources.`,
          `Publish structured employer content on each platform — culture narrative, compensation philosophy, benefits, and open roles.`,
          `Schedule a follow-up assessment in 90 days to measure citation inclusion and mention rate impact.`,
        ];
        rec.effortDetail = `Profile audit and prioritization: 1–2 weeks. Profile creation and content: 2–4 weeks. Establishing presence on gap platforms directly addresses the data absence driving visibility gaps. Impact measurable in 60–90 days.`;
        break;
      }
      case "COMPETITIVE_POSITIONING": {
        const gap = top
          ? Math.round((top.mentionRate - sc.clientMentionRate) * 100)
          : 0;
        const multiple = top ? visibilityMultiple(top.mentionRate, sc.clientMentionRate) : "significantly more";
        const competitorName = top?.name ?? "The leading competitor";
        rec.rationale =
          `As identified in the competitive analysis, ${competitorName} holds a ${gap} percentage point advantage driven by deeper content coverage across the sources AI models cite most frequently. ` +
          `This gap means candidates are ${multiple} likely to encounter ${competitorName} when asking AI about ${industryPhrase}, reaching candidates before ${clientName} enters the conversation for every overlapping requisition. ` +
          `Narrowing this gap would ensure that candidates evaluating ${industryPhrase} encounter ${clientName} alongside ${competitorName} rather than discovering only ${competitorName}. ` +
          `This requires both volume — more content on more platforms — and differentiation: employer value proposition messaging that gives AI models a reason to recommend ${clientName} alongside or instead of ${competitorName}.`;
        rec.actions = [
          `Analyze the ${sc.citations.gapDomains.length > 0 ? sc.citations.gapDomains.length + " " : ""}sources cited in AI responses that mention ${competitorName} but not ${clientName} — these represent the content asymmetry driving the gap.`,
          `Develop differentiating employer brand content targeting the query themes where ${competitorName} leads (particularly compensation, culture, and reputation queries).`,
          `Increase employer review volume and management response rate on shared platforms — Glassdoor, Indeed, and LinkedIn are the highest-leverage.`,
          `Commission employer brand press coverage targeting industry and technology outlets, focusing on stories that differentiate ${clientName} from ${competitorName}.`,
        ];
        rec.effortDetail = "Strategic planning and content audit: 2–4 weeks. Content production and PR execution: 3–6 months. Measurable gap narrowing in 90–180 days.";
        break;
      }
      case "EMPLOYER_BRAND": {
        rec.rationale =
          `At ${pct(sc.clientMentionRate)} mention rate, ${clientName} appears in ${humanFraction(sc.clientMentionRate)} of candidate queries — falling below the threshold where AI consistently includes the company in employer recommendations. ` +
          `AI models build confidence through signal density: the volume, recency, and consistency of indexed employer information. ` +
          `${clientName}'s current signal footprint is insufficient for AI models to confidently recommend the company across the range of candidate intent scenarios evaluated in this assessment. ` +
          `Strengthening employer brand signals would address the critical gap that currently causes AI to omit ${clientName} from employer recommendations — directly expanding the candidate pipeline from AI-influenced talent.`;
        rec.actions = [
          "Claim and complete employer profiles on Glassdoor, LinkedIn, Indeed, and Builtin — these are the four highest-cited platforms in this assessment.",
          "Launch an employee advocacy program to increase organic review volume, targeting 15–25 new reviews per quarter.",
          "Publish a structured careers page with role categories, team descriptions, benefits, and compensation philosophy.",
          "Ensure consistent employer information across all platforms — inconsistencies reduce AI model confidence.",
        ];
        rec.effortDetail = `Profile completion: 2–3 weeks. Advocacy program launch: 4–6 weeks. Establishing presence on key platforms directly addresses the data absence driving visibility gaps. Visible mention rate improvement: 2–3 months.`;
        break;
      }
      case "TECHNICAL_REPUTATION": {
        rec.rationale =
          `This assessment found no public technical content presence for ${clientName}. ` +
          `Engineering and product candidates evaluate employer credibility through technical signals — engineering blogs, open-source contributions, developer community participation, and conference presence. ` +
          `AI models weight these signals heavily when answering role-specific candidate queries. Without them, ${clientName} is effectively invisible to the engineering talent segment in AI-driven discovery.`;
        rec.actions = [
          "Launch an engineering blog with an initial cadence of 2 posts per month, covering technical challenges, architecture decisions, and engineering culture.",
          "Identify 2–3 engineers willing to build a public presence through conference talks, community posts, or open-source contributions.",
          "Establish or expand open-source activity tied to the company's core technology stack — this signals engineering investment to AI models.",
          "Encourage technical team members to participate in Stack Overflow and GitHub discussions where candidates research employers.",
        ];
        rec.effortDetail = "Blog launch: 2–4 weeks. Content pipeline established: 6–8 weeks. Meaningful AI index coverage: 3–6 months.";
        break;
      }
      case "CULTURE_SIGNAL": {
        const word = sentimentWord(sc.avgSentimentScore);
        rec.rationale =
          `AI responses about ${clientName} carry a ${word} tone — a lagging indicator drawn from accumulated review site data, press coverage, and social discourse. ` +
          `When AI models surface ${clientName} with this framing, candidates receive a signal that discourages engagement even when the company is mentioned. ` +
          `This is a conversion problem, not a visibility problem: ${clientName} may appear in AI responses but lose candidates at the consideration stage due to negative characterization. ` +
          `Strengthening culture signals would address the gap that currently causes AI to discourage rather than encourage candidates who do encounter ${clientName} — converting existing mentions into genuine candidate interest and application intent.`;
        rec.actions = [
          "Conduct a sentiment audit across Glassdoor, Indeed, Blind, and LinkedIn to identify the 3–5 recurring themes driving negative perception.",
          "Develop an internal action plan to address the top systemic concerns — these are the root causes, not the reviews themselves.",
          "Implement a structured employee feedback loop to surface and resolve culture issues before they reach public review platforms.",
          "Increase positive signal volume through employee recognition programs, culture stories, and authentic advocacy — not manufactured reviews.",
        ];
        rec.effortDetail = "Sentiment audit: 1–2 weeks. Internal action plan: 4–6 weeks. Culture initiative impact: 3–12 months. Sentiment shift in AI responses lags by 2–4 quarters.";
        break;
      }
      default: {
        rec.rationale =
          `This recommendation addresses a ${categoryLabel(rec.category)} gap identified in the assessment findings. ` +
          `Acting on this area will strengthen the signals that AI models use to decide whether to recommend ${clientName} to candidates researching ${industryPhrase}.`;
        rec.actions = [
          "Review the specific findings tied to this gap and assign ownership to the appropriate team.",
          "Define a 90-day action plan with measurable milestones — AI visibility changes are measurable through follow-up assessments.",
          "Track progress through quarterly visibility assessments to validate that actions are producing the expected signal improvements.",
        ];
        rec.effortDetail = "Initial planning: 1–2 weeks. Implementation timeline varies by scope. Impact measurable in 90 days.";
        break;
      }
    }
  }
}

// ─── Executive summary ───────────────────────────────────────

// ─── Bullet-point executive summary (journey-aware path) ─────

/**
 * Produces a concise bullet-point executive summary when journey analysis data
 * is available. Each bullet starts with a bold phrase and one sentence of
 * specific context. 5-7 bullets total — scannable in 30 seconds.
 *
 * Output uses markdown-style bullets (`\n- **Bold lead** — context`) that the
 * JourneyReportRenderer parses into structured list items.
 */
function composeBulletSummary(
  input: ReportInput,
  journey: JourneyAnalysisInput,
  recommendations: GeneratedRecommendation[],
  overallConfidence?: { score: number; tier: string },
): string {
  const { clientName, scanComparison: sc } = input;
  const top = topCompetitor(sc.entityMentions);
  const bullets: string[] = [];

  // Summary bullet order follows the "broken pipeline -> who wins -> why -> fix"
  // sequence that executives respond to. Pipeline break leads because it frames
  // all subsequent findings in terms of hiring impact.

  const earnedRate = journey.earnedVisibilityRate ?? 0;
  const earnedTier = journey.earnedVisibilityTier ?? "invisible";

  // ── 1. Pipeline break — where the journey collapses ─────────────
  const criticalGapStage = journey.criticalGapStage;
  const discoveryStage = journey.stages?.find(
    (s) => s.stage.toLowerCase() === "discovery",
  );

  if (criticalGapStage) {
    const stageName =
      criticalGapStage.charAt(0) + criticalGapStage.slice(1).toLowerCase();
    const stageData = journey.stages?.find(
      (s) => s.stage.toUpperCase() === criticalGapStage.toUpperCase(),
    );
    const stageRate = stageData ? pct(stageData.mentionRate) : pct(0);
    bullets.push(
      `**Pipeline break: ${stageName} stage** — ${clientName}'s candidate pipeline collapses at ${stageName}. Only ${stageRate} of candidates who use AI for employer research encounter ${clientName} at this stage, where visibility has the highest impact on hiring outcomes.`,
    );
  } else if (discoveryStage && discoveryStage.mentionRate === 0) {
    bullets.push(
      `**Pipeline break: Discovery stage** — ${clientName} does not appear in any open-ended discovery queries. Candidates must already know the company name to find it through AI — the pipeline has no top-of-funnel intake from AI-influenced candidates.`,
    );
  } else if (earnedTier === "invisible" || earnedRate === 0) {
    bullets.push(
      `**Pipeline break: invisible in earned queries** — AI does not independently surface ${clientName} in any broad or industry-level discovery queries. Only name-specific queries produce mentions.`,
    );
  } else {
    // No pipeline break — lead with earned visibility as a positive
    bullets.push(
      `**Earned visibility: ${pct(earnedRate)}** — ${earnedTier} signal; AI independently surfaces ${clientName} in ${pct(earnedRate)} of queries where the company is not named in the prompt.`,
    );
  }

  // ── 2. Who wins — top competitor at the broken stage ────────────
  if (top && top.mentionRate > sc.clientMentionRate) {
    const ratioRaw = sc.clientMentionRate > 0
      ? (top.mentionRate / sc.clientMentionRate).toFixed(1)
      : "significantly";
    const ratioLabel = sc.clientMentionRate > 0 ? `${ratioRaw}x` : ratioRaw;

    if (criticalGapStage) {
      const stageName =
        criticalGapStage.charAt(0) + criticalGapStage.slice(1).toLowerCase();
      bullets.push(
        `**Who wins: ${top.name} at ${ratioLabel} advantage** — ${top.name} dominates the ${stageName} stage at ${pct(top.mentionRate)}, capturing candidates before ${clientName} enters the conversation.`,
      );
    } else {
      bullets.push(
        `**Who wins: ${top.name} at ${ratioLabel} advantage** — ${top.name} appears in ${pct(top.mentionRate)} of AI employer queries, capturing candidate attention before ${clientName}.`,
      );
    }
  } else if (top) {
    bullets.push(
      `**Competitive lead** — ${clientName} outperforms all assessed competitors in AI visibility, a position worth defending as competitors invest in structured content.`,
    );
  }

  // ── 3. Why — citation gaps driving the disparity ───────────────
  const employerGapDomains = sc.citations.gapDomains.filter((d) =>
    isEmployerRelevantDomain(d),
  );
  if (employerGapDomains.length > 0) {
    const topGaps = employerGapDomains.slice(0, 3);
    bullets.push(
      `**Why: ${employerGapDomains.length} missing platform${employerGapDomains.length === 1 ? "" : "s"}** — The gap is driven by absent employer content on ${topGaps.join(", ")}. These are platforms where AI retrieves competitor data but finds nothing about ${clientName}.`,
    );
  }

  // ── 4. What to do — top recommendation with timeframe ──────────
  const topRec = recommendations[0];
  if (topRec) {
    const topGapPlatform = sc.citations.gapDomains[0];
    const platformRef = topGapPlatform
      ? classifySourceType(topGapPlatform).toLowerCase() + ` (${topGapPlatform})`
      : "";
    const timeframe =
      topRec.priority === "CRITICAL"
        ? "next 30 days"
        : topRec.priority === "HIGH"
          ? "next 90 days"
          : "next quarter";

    if (platformRef) {
      bullets.push(
        `**Priority action: ${topRec.title}** — Start with ${platformRef} within the ${timeframe}; this is the highest-impact gap where new content will directly improve AI recommendations.`,
      );
    } else {
      bullets.push(
        `**Priority action: ${topRec.title}** — Prioritize within the ${timeframe} to address the most significant visibility gap identified in this assessment.`,
      );
    }
  }

  // ── 5. Positioning quality ──────────────────────────────────────
  const considerationStage = journey.stages?.find(
    (s) => s.stage.toLowerCase() === "consideration",
  );
  if (considerationStage && considerationStage.positioning) {
    const positioningTier = considerationStage.positioning.toLowerCase();
    const posQuality =
      positioningTier === "champion"
        ? "strong"
        : positioningTier === "contender"
          ? "adequate"
          : positioningTier === "cautionary"
            ? "negative"
            : positioningTier === "invisible"
              ? "absent"
              : "generic"; // peripheral
    const posDetail =
      posQuality === "strong"
        ? `AI provides a detailed, differentiated description highlighting specific strengths.`
        : posQuality === "adequate"
          ? `AI provides a factual but undifferentiated description — present but not compelling.`
          : posQuality === "negative"
            ? `AI describes ${clientName} with cautionary language that may discourage candidates from moving forward.`
            : posQuality === "absent"
              ? `AI provides little to no meaningful employer information for ${clientName} at this stage.`
              : `AI provides a generic description that does not distinguish ${clientName} from alternatives.`;
    const article = posQuality === "adequate" || posQuality === "absent" ? "an" : "a";
    bullets.push(
      `**Positioning quality: ${posQuality}** — When candidates search for ${clientName} by name, AI provides ${article} ${posQuality} description. ${posDetail}`,
    );
  }

  // ── 6. Earned visibility (if not already covered in bullet 1) ───
  // When the pipeline break bullet covered a specific stage rather than
  // earned visibility, add the earned rate here for completeness.
  if (criticalGapStage || (discoveryStage && discoveryStage.mentionRate === 0)) {
    if (earnedTier !== "invisible" && earnedRate > 0) {
      bullets.push(
        `**Earned visibility: ${pct(earnedRate)}** — ${earnedTier} signal; AI independently surfaces ${clientName} in ${pct(earnedRate)} of queries where the company is not named in the prompt.`,
      );
    } else if (discoveryStage && discoveryStage.mentionRate > 0 && discoveryStage.mentionRate < 0.2) {
      bullets.push(
        `**Visibility boundary: niche level** — ${clientName} first appears when candidates search specifically for niche terms. The broader talent market does not encounter ${clientName} through AI.`,
      );
    }
  }

  // ── 7. Sentiment (only when negative) ──────────────────────────
  if (sc.avgSentimentScore != null && sc.avgSentimentScore < 0) {
    const word = sentimentWord(sc.avgSentimentScore);
    bullets.push(
      `**Sentiment risk: ${word}** — AI responses about ${clientName} carry a ${word} tone, ${sentimentImplication(sc.avgSentimentScore)}.`,
    );
  }

  // ── 8. Qualitative theme bullets (when available) ────────────────
  const themes = input.overallThemes;
  if (themes) {
    if (themes.industryFraming !== "not clearly categorized" && themes.industryFraming !== "tech employer") {
      bullets.push(
        `**AI narrative: ${themes.industryFraming}** — AI describes ${clientName} as a ${themes.industryFraming}${themes.industryFraming.includes("tech") ? "" : " rather than a technology employer"}. This framing puts ${clientName} at a disadvantage when competing for technical talent.`,
      );
    }

    if (themes.compensationDetail === "vague") {
      bullets.push(
        `**Compensation data gap** — AI describes ${clientName}'s compensation in vague terms ("competitive") without specific salary ranges. Competitors with published data on platforms like Levels.fyi have a material advantage in evaluation-stage queries.`,
      );
    }

    if (themes.unsolicitedCompetitors.length > 0) {
      const names = themes.unsolicitedCompetitors.slice(0, 3).join(", ");
      bullets.push(
        `**Unexpected competitors: ${names}** — AI mentions ${themes.unsolicitedCompetitors.length === 1 ? "this company" : "these companies"} as alternatives in multiple queries. Candidates may be evaluating ${clientName} against competitors it is not tracking.`,
      );
    }

    if (themes.negativeAttributes.length >= 2) {
      const topNegatives = themes.negativeAttributes.slice(0, 3).join(", ");
      bullets.push(
        `**Employer perception risks** — AI associates ${clientName} with: ${topNegatives}. These themes appear across responses and may discourage candidates during evaluation.`,
      );
    }
  }

  // ── 9. Source coverage (only when low AND confidence is not already LOW) ───
  const stagesWithSourcedRate = journey.stages?.filter(
    (s) => s.sourcedRate !== undefined,
  ) ?? [];
  if (stagesWithSourcedRate.length > 0 && overallConfidence?.tier !== "LOW") {
    const overallSourcedRate =
      stagesWithSourcedRate.reduce((sum, s) => sum + (s.sourcedRate ?? 0), 0) /
      stagesWithSourcedRate.length;
    if (overallSourcedRate < 0.4) {
      const sourcedPct = Math.round(overallSourcedRate * 100);
      bullets.push(
        `**Source coverage: limited** — ${sourcedPct}% of AI responses in this assessment cited specific sources. Most findings are based on AI's training data, which may not reflect the most current employer information.`,
      );
    }
  }

  // Trim to 9 bullets max to keep summary scannable
  const trimmed = bullets.slice(0, 9);

  // LOW confidence: append data quality note after the bullets
  const footer =
    overallConfidence?.tier === "LOW"
      ? "\n\nNote: This assessment is based on a limited query sample. A broader scan would provide more definitive measurement."
      : "";

  return `Key findings from this assessment:\n\n` + trimmed.map((b) => `- ${b}`).join("\n") + footer;
}

// ─── Main summary dispatcher ─────────────────────────────────

function composeSummary(
  input: ReportInput,
  recommendations: GeneratedRecommendation[],
  overallConfidence?: { score: number; tier: string },
): string {
  const { clientName, scanComparison: sc, industry } = input;

  if (sc.completedQueries === 0) {
    return `No scan data available for ${clientName}. Complete at least one visibility scan to generate findings.`;
  }

  // ── Journey-aware bullet path ──────────────────────────────────
  const journey = input.journeyAnalysis;
  if (journey && journey.earnedVisibilityRate !== undefined && journey.earnedVisibilityTier) {
    return composeBulletSummary(input, journey, recommendations, overallConfidence);
  }

  // ── Legacy paragraph path (no journey data) ────────────────────

  const tier = mentionTier(sc.clientMentionRate);
  const top = topCompetitor(sc.entityMentions);
  const industryPhrase = industry
    ? `employers in ${industry}`
    : "employers in this space";
  const validationCtx = input.validationRate !== undefined ? { validatedRate: input.validationRate } : undefined;
  const hedge = hedgePhrase(overallConfidence?.tier, "mention", validationCtx);
  const competitorHedge = hedgePhrase(overallConfidence?.tier, "competitor", validationCtx);
  const sentimentHedge = hedgePhrase(overallConfidence?.tier, "sentiment", validationCtx);

  const paragraphs: string[] = [];

  // ── Opening statement (2-3 sentences): headline finding, contextualized ──
  const openingParts: string[] = [];

  openingParts.push(
    `${hedge}${clientName} has ${tier} visibility in AI-driven candidate discovery, appearing in ${humanFraction(sc.clientMentionRate)} of evaluated candidate queries (${pct(sc.clientMentionRate)} mention rate across ${sc.completedQueries} scenarios).`,
  );
  if (top && top.mentionRate > sc.clientMentionRate) {
    const gap = Math.round((top.mentionRate - sc.clientMentionRate) * 100);
    const multiple = visibilityMultiple(top.mentionRate, sc.clientMentionRate);
    openingParts.push(
      `${competitorHedge}${top.name} leads by ${gap} percentage points — meaning candidates researching ${industryPhrase} through AI are ${multiple} likely to encounter ${top.name} first, potentially losing high-intent candidates before they ever reach ${clientName}'s pipeline.`,
    );
  } else if (top) {
    openingParts.push(
      `${clientName} leads all assessed competitors in AI mention rate — a position worth defending as competitors invest in the structured content that AI models rely on.`,
    );
  }
  paragraphs.push(openingParts.join(" "));

  // ── Key findings (3-5 bullets, each one sentence with business implication) ──
  const findings: string[] = [];

  // 1. Visibility rate with interpretation
  const client = sc.entityMentions.find((e) => e.isClient);
  if (client) {
    findings.push(
      `**AI mention rate: ${pct(sc.clientMentionRate)}** — ${clientName} appears in ${client.mentionCount} of ${sc.completedQueries} candidate queries, indicating ${tier} presence in AI-driven talent discovery`,
    );
  }

  // 2. Competitive gap with competitor named and ratio
  if (top) {
    if (top.mentionRate > sc.clientMentionRate) {
      const gap = Math.round((top.mentionRate - sc.clientMentionRate) * 100);
      findings.push(
        `**${gap}pp visibility gap vs. ${top.name}** — the largest competitive gap identified; candidates researching ${industryPhrase} through AI are ${visibilityMultiple(top.mentionRate, sc.clientMentionRate)} likely to hear about ${top.name}`,
      );
    } else {
      findings.push(
        `**Competitive lead** — ${clientName} outperforms all assessed competitors in AI mention rate, holding the strongest position in AI-driven candidate discovery`,
      );
    }
  }

  // 3. Citation gaps — employer-relevant platforms only (news/press excluded from findings)
  const legacyEmployerGapDomains = sc.citations.gapDomains.filter((d) =>
    isEmployerRelevantDomain(d),
  );
  if (legacyEmployerGapDomains.length > 0) {
    const topGaps = legacyEmployerGapDomains.slice(0, 2);
    const gapSourceList = topGaps.map((d) => classifySourceType(d).toLowerCase()).join(" and ");
    findings.push(
      `**${legacyEmployerGapDomains.length} employer platform gap${legacyEmployerGapDomains.length === 1 ? "" : "s"}** — ${legacyEmployerGapDomains.length} employer discovery platform${legacyEmployerGapDomains.length === 1 ? "" : "s"} actively inform${legacyEmployerGapDomains.length === 1 ? "s" : ""} AI about competitors but not ${clientName}, including ${gapSourceList} (${topGaps.join(", ")})`,
    );
  }

  // 4. Sentiment with candidate behavior implication
  if (sc.avgSentimentScore != null) {
    const word = sentimentWord(sc.avgSentimentScore);
    findings.push(
      `**${word.charAt(0).toUpperCase() + word.slice(1)} sentiment posture** — ${sentimentHedge}AI responses about ${clientName} carry a ${word} tone, ${sentimentImplication(sc.avgSentimentScore)}`,
    );
  }

  // 5. Strongest area or weakest theme
  if (sc.citations.clientExclusiveDomains.length > 0) {
    findings.push(
      `**${sc.citations.clientExclusiveDomains.length} exclusive citation source${sc.citations.clientExclusiveDomains.length === 1 ? "" : "s"}** — ${sc.citations.clientExclusiveDomains.length === 1 ? "this source cites" : "these sources cite"} only ${clientName}, representing a defensible visibility advantage that competitors do not share`,
    );
  }
  if (input.queryThemeBreakdown && input.queryThemeBreakdown.length > 0) {
    const weakestTheme = [...input.queryThemeBreakdown].sort(
      (a, b) => a.mentionRate - b.mentionRate,
    )[0];
    if (weakestTheme && weakestTheme.mentionRate < 0.4) {
      findings.push(
        `**Weakest intent area: "${weakestTheme.theme}"** — ${pct(weakestTheme.mentionRate)} mention rate means fewer than ${humanFraction(weakestTheme.mentionRate).replace("roughly ", "")} candidates asking about this topic will encounter ${clientName}`,
      );
    }
  }

  if (findings.length > 0) {
    paragraphs.push("Key findings:\n- " + findings.join("\n- "));
  }

  // ── Anchor metric: decision-stage visibility gap ──
  if (top && top.mentionRate > sc.clientMentionRate) {
    const decisionThemes = ["Compensation & Benefits", "Competitor Comparison"];
    const decisionEntries = input.queryThemeBreakdown?.filter((t) =>
      decisionThemes.includes(t.theme),
    );

    if (decisionEntries && decisionEntries.length > 0) {
      const clientDecisionRate =
        decisionEntries.reduce((sum, t) => sum + t.mentionRate, 0) /
        decisionEntries.length;

      if (clientDecisionRate <= 0) {
        paragraphs.push(
          `At the consideration stage — when candidates are comparing employers and evaluating compensation — ${top.name} is present where ${clientName} is absent.`,
        );
      } else {
        const decisionMultiple = top.mentionRate / clientDecisionRate;
        if (decisionMultiple >= 1.5) {
          paragraphs.push(
            `At the consideration stage — when candidates are comparing employers and evaluating compensation — ${top.name} is ${decisionMultiple.toFixed(1)}x more visible than ${clientName} in AI responses.`,
          );
        } else {
          paragraphs.push(
            `At the consideration stage — when candidates are comparing employers and evaluating compensation — ${top.name} holds a narrow visibility advantage over ${clientName} in AI responses.`,
          );
        }
      }
    } else {
      // Fall back to overall mention rate comparison
      const overallMultiple = visibilityMultiple(top.mentionRate, sc.clientMentionRate);
      paragraphs.push(
        `Across all evaluated queries, ${top.name} is ${overallMultiple} visible than ${clientName} in AI responses — a gap that directly reduces ${clientName}'s share of AI-influenced candidate attention.`,
      );
    }
  }

  // ── Strategic implication (1-2 sentences) ──
  if (tier === "minimal" || tier === "limited") {
    paragraphs.push(
      `This visibility gap represents a structural disadvantage in candidate discovery that compounds with every hiring cycle. Candidates who never encounter ${clientName} in AI responses cannot apply — this is pipeline leakage at the awareness stage. As more candidates use AI for employer research, these visibility gaps become more consequential with each quarter. Without deliberate intervention, this gap will widen as competitors invest in the structured content that AI models rely on.`,
    );
  } else if (tier === "moderate") {
    paragraphs.push(
      `${clientName} has a foundation in AI-driven candidate discovery but has not yet reached the signal density required for consistent presence across all query types. The gap is not just about overall numbers — it is about which candidates ${clientName} is missing. ` +
      `As more candidates use AI for employer research, these visibility gaps become more consequential with each quarter. ` +
      `Targeted investment in the highest-gap areas — particularly ${sc.citations.gapDomains.length > 0 ? "citation gaps and " : ""}underperforming intent themes — will produce compounding visibility gains over the next two to three quarters, directly expanding the candidate pipeline that reaches ${clientName}.`,
    );
  } else {
    paragraphs.push(
      `${clientName} is well-positioned in AI-driven employer discovery. As more candidates use AI for employer research, ${clientName}'s current visibility position provides a compounding advantage that strengthens with each quarter of sustained presence. The strategic priority is defending this lead: closing remaining citation gaps, strengthening underperforming intent themes, and ensuring that competitors cannot close the gap through content investment alone. Maintaining this visibility lead is a competitive necessity, not an optional investment.`,
    );
  }

  // ── Recommendation preview ──
  const topRec = recommendations[0];
  const criticalCount = recommendations.filter((r) => r.priority === "CRITICAL").length;
  const highCount = recommendations.filter((r) => r.priority === "HIGH").length;

  if (topRec) {
    const urgencyPhrase = criticalCount > 0
      ? `${criticalCount} requiring immediate attention`
      : highCount > 0
        ? `${highCount} recommended for the next 90 days`
        : "";
    const urgencySuffix = urgencyPhrase ? `, ${urgencyPhrase}` : "";

    // Connect the top recommendation to a hiring outcome, not just an action
    let outcomePhrase: string;
    switch (topRec.category) {
      case "CONTENT_GAP":
        outcomePhrase = `which directly addresses the content asymmetry that causes AI models to recommend competitors over ${clientName} — closing these gaps expands the pool of candidate queries where ${clientName} appears`;
        break;
      case "COMPETITIVE_POSITIONING":
        outcomePhrase = `which targets the competitive visibility gap that currently allows ${top?.name ?? "the leading competitor"} to reach candidates before ${clientName} when candidates are researching ${industryPhrase}`;
        break;
      case "EMPLOYER_BRAND":
        outcomePhrase = `which will move ${clientName} from inconsistent to reliable presence in AI candidate recommendations, directly expanding the hiring pipeline from AI-influenced candidates`;
        break;
      case "CULTURE_SIGNAL":
        outcomePhrase = `which addresses the perception issue that currently converts ${clientName}'s AI mentions into a signal that discourages candidate engagement`;
        break;
      default:
        outcomePhrase = `which addresses the most significant ${categoryLabel(topRec.category)} gap identified in this assessment`;
        break;
    }

    paragraphs.push(
      `This assessment identifies ${recommendations.length} prioritized recommendation${recommendations.length === 1 ? "" : "s"}${urgencySuffix}. The highest-priority action is to ${topRec.title.charAt(0).toLowerCase() + topRec.title.slice(1)} — ${outcomePhrase}.`,
    );
  }

  // LOW confidence: append data quality note
  if (overallConfidence?.tier === "LOW") {
    paragraphs.push(
      "Note: This assessment is based on a limited query sample. A broader scan would provide more definitive measurement.",
    );
  }

  return paragraphs.join("\n\n");
}

// ─── Orchestrator ────────────────────────────────────────────

export function composeReport(input: ReportInput): ComposedReport {
  // Resolve per-section confidence, falling back to overall confidence
  const sectionConfidence = (heading: string): { score: number; tier: string } | undefined =>
    input.confidence?.perSection?.[heading] ?? input.confidence?.overall;

  const sections: ReportSection[] = [];

  // Section 0: Assessment scope (always first)
  sections.push(composeAssessmentScopeSection(input));

  // Section 1: Visibility findings
  sections.push(composeVisibilitySection(input, sectionConfidence("Visibility Analysis")));

  // Section 2: Competitor analysis
  sections.push(composeCompetitorSection(input, sectionConfidence("Competitor Analysis")));

  // Section 3: Citation patterns
  sections.push(composeCitationSection(input, sectionConfidence("Citation Patterns")));

  // Section 4: Query intent map (only when theme data is available)
  const intentMapSection = composeQueryIntentMapSection(input);
  if (intentMapSection) {
    sections.push(intentMapSection);
  }

  // When journey analysis is present, stage-aware recommendations are generated
  // separately (stored in Report.metadata.remediationPlan by the action) and rendered
  // by the frontend JourneyReportRenderer. The legacy generateRecommendations() output
  // is suppressed to avoid conflicting/duplicate recommendation records in the DB.
  const recommendations = input.journeyAnalysis
    ? [] // stage recommendations handled by generateStageRecommendations in the action
    : generateRecommendations(input);
  if (recommendations.length > 0) {
    enrichTopRecommendations(recommendations, input);
  }

  const summary = composeSummary(input, recommendations, input.confidence?.overall);

  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const title = `AI Employer Visibility Assessment — ${input.clientName} — ${date}`;

  const coverPage: CoverPage = {
    documentTitle: "AI Employer Visibility Assessment",
    clientName: input.clientName,
    clientDomain: input.clientDomain,
    industry: input.industry,
    logoUrl: input.logoUrl,
    assessmentDate: date,
    confidentialityLine:
      "Confidential — prepared for internal use and authorized distribution only.",
  };

  // Compute overall sourced rate from journey stage data when available
  const journeyStages = input.journeyAnalysis?.stages;
  const stagesWithRate = journeyStages?.filter((s) => s.sourcedRate !== undefined) ?? [];
  const overallSourcedRate =
    stagesWithRate.length > 0
      ? stagesWithRate.reduce((sum, s) => sum + (s.sourcedRate ?? 0), 0) /
        stagesWithRate.length
      : undefined;

  return { title, coverPage, summary, sections, recommendations, overallSourcedRate };
}
