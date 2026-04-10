/**
 * Visibility boundary analysis for the Antellion AI hiring visibility platform.
 *
 * Boundary analysis answers the question: how specific does a candidate's query need
 * to be before AI mentions this company? The "boundary" is the first specificity level
 * at which the client appears in AI responses.
 *
 * Specificity levels run from broadest to narrowest candidate pool:
 *   broad         — function only ("best sales jobs")
 *   industry      — function + sector ("best hospitality sales jobs")
 *   niche         — function + specific business model ("best timeshare sales jobs")
 *   hyper_specific — niche + geography ("best timeshare sales jobs in Orlando")
 */

// ─── Specificity levels ──────────────────────────────────────

export type SpecificityLevel =
  | "broad"
  | "industry"
  | "niche"
  | "hyper_specific";

export const SPECIFICITY_ORDER: readonly SpecificityLevel[] = [
  "broad",
  "industry",
  "niche",
  "hyper_specific",
] as const;

// ─── Boundary query generation ───────────────────────────────

export interface BoundaryQuery {
  text: string;
  /** Used as the intent field value: "boundary:{specificity}" */
  specificity: SpecificityLevel;
  /** Theme bucket for this query */
  theme: string;
  /** Always DISCOVERY — boundary queries test broad candidate awareness */
  stage: "DISCOVERY";
}

export interface BoundaryQueryInput {
  /** Function/job category, e.g. "Sales" */
  role: string;
  /** Sector, e.g. "Hospitality" */
  industry: string;
  /** Niche business-model terms, e.g. ["timeshare", "vacation ownership"] */
  nicheKeywords: string[];
  /** Optional geography for hyper_specific level, e.g. "Orlando" */
  geography?: string;
}

// ─── Template families ────────────────────────────────────────

interface BoundaryFamily {
  broad: string;
  industry: string;
  niche: string;
  hyperSpecific: string;
  theme: string;
}

const BOUNDARY_FAMILIES: BoundaryFamily[] = [
  {
    broad: "best {role} jobs",
    industry: "best {industry} {role} jobs",
    niche: "best {niche} {role} jobs",
    hyperSpecific: "best {niche} {role} jobs in {geography}",
    theme: "job-discovery",
  },
  {
    broad: "top companies hiring {role} professionals",
    industry: "top {industry} companies hiring {role}",
    niche: "top {niche} companies hiring {role} reps",
    hyperSpecific: "top {niche} companies hiring {role} reps in {geography}",
    theme: "employer-discovery",
  },
  {
    broad: "is a career in {role} worth it",
    industry: "is a career in {industry} {role} worth it",
    niche: "is a career in {niche} {role} worth it",
    hyperSpecific: "is {niche} {role} a good career in {geography}",
    theme: "career-value",
  },
  {
    broad: "what companies are known for great {role} culture",
    industry: "what {industry} companies have the best {role} teams",
    niche: "what {niche} companies have the best {role} opportunities",
    hyperSpecific: "best {niche} {role} opportunities in {geography}",
    theme: "employer-reputation",
  },
  {
    broad: "earning potential in {role}",
    industry: "earning potential in {industry} {role}",
    niche: "earning potential in {niche} {role}",
    hyperSpecific: "how much do {niche} {role} reps make in {geography}",
    theme: "compensation",
  },
  {
    broad: "should I get into {role}",
    industry: "should I work in {industry} {role}",
    niche: "should I work in {niche} {role}",
    hyperSpecific: "should I work in {niche} {role} in {geography}",
    theme: "career-advice",
  },
];

function expandBoundaryTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

/**
 * Generates Discovery queries at all applicable specificity levels.
 *
 * Each template family produces:
 *   - broad (always)
 *   - industry (always)
 *   - niche variants (one per niche keyword provided)
 *   - hyper_specific (one per niche keyword, only when geography is provided)
 *
 * The intent field for each query is set to "boundary:{specificity}" so
 * boundary detection can classify results without needing a schema column.
 */
export function generateBoundaryQueries(
  input: BoundaryQueryInput,
): BoundaryQuery[] {
  const { role, industry, nicheKeywords, geography } = input;
  const queries: BoundaryQuery[] = [];

  const baseVars: Record<string, string> = {
    role: role.toLowerCase(),
    industry: industry.toLowerCase(),
    geography: geography ?? "",
  };

  for (const family of BOUNDARY_FAMILIES) {
    // Broad
    queries.push({
      text: expandBoundaryTemplate(family.broad, baseVars),
      specificity: "broad",
      theme: family.theme,
      stage: "DISCOVERY",
    });

    // Industry
    queries.push({
      text: expandBoundaryTemplate(family.industry, baseVars),
      specificity: "industry",
      theme: family.theme,
      stage: "DISCOVERY",
    });

    // Niche — one query per keyword
    for (const keyword of nicheKeywords) {
      const nicheVars = { ...baseVars, niche: keyword.toLowerCase() };

      queries.push({
        text: expandBoundaryTemplate(family.niche, nicheVars),
        specificity: "niche",
        theme: family.theme,
        stage: "DISCOVERY",
      });

      // Hyper-specific — only when geography is provided
      if (geography) {
        queries.push({
          text: expandBoundaryTemplate(family.hyperSpecific, nicheVars),
          specificity: "hyper_specific",
          theme: family.theme,
          stage: "DISCOVERY",
        });
      }
    }
  }

  return queries;
}

// ─── Boundary detection ───────────────────────────────────────

export interface BoundaryLevelStats {
  rate: number;
  queryCount: number;
}

export interface VisibilityBoundary {
  /** The most general level at which the entity first appears. "never" if absent at all levels. */
  firstAppearsAt: SpecificityLevel | "never";
  /**
   * Fraction of queries at the boundary level where the entity is mentioned (0-1).
   * 0 when firstAppearsAt is "never".
   */
  consistencyAtBoundary: number;
  /** Per-level mention rate and query count. */
  rateByLevel: Record<SpecificityLevel, BoundaryLevelStats>;
  /** Same analysis for each competitor. */
  competitorBoundaries: Array<{
    name: string;
    firstAppearsAt: SpecificityLevel | "never";
  }>;
  /** Human-readable summary of the boundary finding. */
  boundaryNarrative: string;
}

export interface BoundaryDetectionInput {
  /**
   * Results to analyse for boundary detection.
   *
   * Results with "boundary:{level}" in their intent are classified directly.
   * Results with stage === "DISCOVERY" and NO boundary tag are classified
   * heuristically from their queryText (when provided). This allows the main
   * Discovery queries from pass-1 scans to contribute to boundary analysis
   * even though they were not generated as boundary queries.
   */
  results: Array<{
    /**
     * Intent string, e.g. "boundary:broad [priority: 7]" or a plain stage
     * intent like "employer-reputation". Results that contain "boundary:{level}"
     * are classified directly; others require stage === "DISCOVERY" to be
     * classified heuristically.
     */
    intent: string;
    /** The query text — used to classify non-boundary Discovery results. */
    queryText?: string;
    /** Stage of the result — non-boundary Discovery results are classified heuristically. */
    stage?: string;
    mentioned: boolean;
    /** Used for competitor mention extraction */
    metadata: unknown;
  }>;
  clientName: string;
  competitors: Array<{ name: string }>;
  /**
   * Niche keywords for the client (e.g. ["timeshare", "vacation ownership"]).
   * Used to classify non-boundary Discovery queries into the "niche" level.
   */
  nicheKeywords?: string[];
  /**
   * Industry / sector label (e.g. "Hospitality").
   * Used to classify non-boundary Discovery queries into the "industry" level.
   */
  industry?: string;
}

/** Parses "boundary:broad" out of an intent string. Returns null if not a boundary intent. */
export function parseBoundarySpecificity(
  intent: string,
): SpecificityLevel | null {
  const match = intent.match(/boundary:(broad|industry|niche|hyper_specific)/);
  if (!match) return null;
  return match[1] as SpecificityLevel;
}

/**
 * Classifies a non-boundary Discovery result into a specificity level based on
 * the query text. This is a heuristic used when the query was not generated as
 * a boundary query but belongs to the DISCOVERY stage.
 *
 * Rules (applied in order — first match wins):
 *  1. If the query contains the client name → return null (skip: likely a
 *     Consideration or name-specific query misrouted to Discovery).
 *  2. If any niche keyword appears in the query → "niche"
 *  3. If the industry label appears in the query → "industry"
 *  4. Otherwise → "broad"
 */
export function classifyNonBoundaryDiscoveryResult(
  queryText: string,
  clientName: string,
  nicheKeywords?: string[],
  industry?: string,
): SpecificityLevel | null {
  const lower = queryText.toLowerCase();

  // Skip queries that name the client — these are not earned-visibility queries
  if (lower.includes(clientName.toLowerCase())) return null;

  // Niche: any niche keyword present
  if (nicheKeywords && nicheKeywords.length > 0) {
    for (const kw of nicheKeywords) {
      if (lower.includes(kw.toLowerCase())) return "niche";
    }
  }

  // Industry: industry label present
  if (industry && lower.includes(industry.toLowerCase())) return "industry";

  // Fallback: broad
  return "broad";
}

function extractCompetitorMentions(
  metadata: unknown,
): Array<{ name: string; mentioned: boolean }> {
  if (
    metadata == null ||
    typeof metadata !== "object" ||
    !("competitorMentions" in metadata) ||
    !Array.isArray((metadata as Record<string, unknown>).competitorMentions)
  ) {
    return [];
  }
  const raw = (metadata as { competitorMentions: unknown[] })
    .competitorMentions;
  return raw.filter(
    (m): m is { name: string; mentioned: boolean } =>
      m != null &&
      typeof m === "object" &&
      typeof (m as Record<string, unknown>).name === "string" &&
      typeof (m as Record<string, unknown>).mentioned === "boolean",
  ) as { name: string; mentioned: boolean }[];
}

function emptyLevelStats(): BoundaryLevelStats {
  return { rate: 0, queryCount: 0 };
}

function emptyRateByLevel(): Record<SpecificityLevel, BoundaryLevelStats> {
  return {
    broad: emptyLevelStats(),
    industry: emptyLevelStats(),
    niche: emptyLevelStats(),
    hyper_specific: emptyLevelStats(),
  };
}

function findFirstAppearsAt(
  rateByLevel: Record<SpecificityLevel, BoundaryLevelStats>,
): SpecificityLevel | "never" {
  for (const level of SPECIFICITY_ORDER) {
    const stats = rateByLevel[level];
    if (stats.queryCount > 0 && stats.rate > 0) {
      return level;
    }
  }
  return "never";
}

function buildBoundaryNarrative(
  clientName: string,
  clientBoundary: SpecificityLevel | "never",
  competitorBoundaries: Array<{
    name: string;
    firstAppearsAt: SpecificityLevel | "never";
  }>,
  rateByLevel: Record<SpecificityLevel, BoundaryLevelStats>,
): string {
  if (clientBoundary === "never") {
    const hasCompetitorData = competitorBoundaries.length > 0;
    if (!hasCompetitorData) {
      return `${clientName} does not appear in AI responses at any specificity level tested.`;
    }
    const earliestCompetitor = competitorBoundaries.find(
      (c) => c.firstAppearsAt !== "never",
    );
    if (earliestCompetitor) {
      return (
        `${clientName} does not appear in AI responses at any specificity level tested. ` +
        `${earliestCompetitor.name} first appears at the ${earliestCompetitor.firstAppearsAt.replace("_", " ")} level, ` +
        `capturing candidate attention that ${clientName} currently misses entirely.`
      );
    }
    return `${clientName} does not appear in AI responses at any specificity level tested. No competitors were detected either, suggesting the category is not yet well-indexed by AI.`;
  }

  const boundaryLabel = clientBoundary.replace("_", " ");
  const parts: string[] = [];

  parts.push(
    `${clientName}'s visibility begins at the ${boundaryLabel} level — ` +
      `candidates must search at this level of specificity or narrower to encounter ${clientName} in AI responses.`,
  );

  // Broader levels where client is absent
  const absentLevels = SPECIFICITY_ORDER.filter((level) => {
    const idx = SPECIFICITY_ORDER.indexOf(level);
    const boundaryIdx = SPECIFICITY_ORDER.indexOf(clientBoundary);
    return (
      idx < boundaryIdx &&
      rateByLevel[level].queryCount > 0 &&
      rateByLevel[level].rate === 0
    );
  });

  if (absentLevels.length > 0) {
    const absentLabels = absentLevels.map((l) => l.replace("_", " ")).join(" and ");
    parts.push(
      `At the ${absentLabels} level${absentLevels.length > 1 ? "s" : ""}, ${clientName} is absent — ` +
        `candidates who begin with broader searches never encounter the company.`,
    );
  }

  // Competitor comparison — find any competitor that appears at a broader level
  const broaderCompetitors = competitorBoundaries.filter((c) => {
    if (c.firstAppearsAt === "never") return false;
    return (
      SPECIFICITY_ORDER.indexOf(c.firstAppearsAt) <
      SPECIFICITY_ORDER.indexOf(clientBoundary)
    );
  });

  if (broaderCompetitors.length > 0) {
    const topComp = broaderCompetitors[0];
    parts.push(
      `${topComp.name} first appears at the ${topComp.firstAppearsAt.replace("_", " ")} level — ` +
        `candidates exploring the market encounter ${topComp.name} before they encounter ${clientName}. ` +
        `This gives ${topComp.name} a larger effective talent pool.`,
    );
  }

  return parts.join(" ");
}

/**
 * Detects the visibility boundary from a set of boundary-tagged scan results.
 *
 * Returns a complete VisibilityBoundary regardless of data volume, but the
 * analysis is only meaningful when at least one specificity level has results.
 * Callers should check `rateByLevel[level].queryCount > 0` before relying on
 * level-specific rates.
 */
export function detectVisibilityBoundary(
  input: BoundaryDetectionInput,
): VisibilityBoundary {
  const { results, clientName, competitors, nicheKeywords, industry } = input;

  // Group results by specificity level
  const byLevel = new Map<
    SpecificityLevel,
    Array<{ mentioned: boolean; metadata: unknown }>
  >();
  for (const level of SPECIFICITY_ORDER) {
    byLevel.set(level, []);
  }

  for (const result of results) {
    // 1. Explicitly boundary-tagged results — classify directly
    const taggedLevel = parseBoundarySpecificity(result.intent);
    if (taggedLevel) {
      byLevel.get(taggedLevel)!.push({
        mentioned: result.mentioned,
        metadata: result.metadata,
      });
      continue;
    }

    // 2. Non-boundary Discovery results — classify heuristically when queryText is present
    const isDiscoveryStage =
      result.stage?.toUpperCase() === "DISCOVERY" ||
      (!result.stage && result.intent === "");
    if (isDiscoveryStage && result.queryText) {
      const heuristicLevel = classifyNonBoundaryDiscoveryResult(
        result.queryText,
        clientName,
        nicheKeywords,
        industry,
      );
      if (heuristicLevel) {
        byLevel.get(heuristicLevel)!.push({
          mentioned: result.mentioned,
          metadata: result.metadata,
        });
      }
    }
  }

  // Compute client mention rate per level
  const rateByLevel = emptyRateByLevel();
  for (const level of SPECIFICITY_ORDER) {
    const levelResults = byLevel.get(level)!;
    const n = levelResults.length;
    if (n === 0) continue;
    const mentionedCount = levelResults.filter((r) => r.mentioned).length;
    rateByLevel[level] = { rate: mentionedCount / n, queryCount: n };
  }

  const clientFirstAppears = findFirstAppearsAt(rateByLevel);

  const consistencyAtBoundary =
    clientFirstAppears !== "never"
      ? rateByLevel[clientFirstAppears].rate
      : 0;

  // Competitor boundaries — same logic but using metadata.competitorMentions
  const competitorBoundaries: VisibilityBoundary["competitorBoundaries"] = [];

  for (const competitor of competitors) {
    const compRateByLevel = emptyRateByLevel();

    for (const level of SPECIFICITY_ORDER) {
      const levelResults = byLevel.get(level)!;
      const n = levelResults.length;
      if (n === 0) continue;

      const mentionedCount = levelResults.filter((r) => {
        const mentions = extractCompetitorMentions(r.metadata);
        return mentions.some(
          (m) =>
            m.name.toLowerCase() === competitor.name.toLowerCase() &&
            m.mentioned,
        );
      }).length;

      compRateByLevel[level] = { rate: mentionedCount / n, queryCount: n };
    }

    competitorBoundaries.push({
      name: competitor.name,
      firstAppearsAt: findFirstAppearsAt(compRateByLevel),
    });
  }

  const narrative = buildBoundaryNarrative(
    clientName,
    clientFirstAppears,
    competitorBoundaries,
    rateByLevel,
  );

  return {
    firstAppearsAt: clientFirstAppears,
    consistencyAtBoundary,
    rateByLevel,
    competitorBoundaries,
    boundaryNarrative: narrative,
  };
}

/**
 * Returns true when the results contain enough boundary data to surface a
 * meaningful analysis. Requires at least 2 distinct specificity levels with
 * at least one result each.
 *
 * When optional context (clientName, nicheKeywords, industry) is provided,
 * non-boundary Discovery-stage results are classified heuristically and
 * contribute to the level count. This allows pass-1 Discovery results to
 * satisfy the threshold even without explicit boundary tags.
 */
export function hasSufficientBoundaryData(
  results: BoundaryDetectionInput["results"],
  context?: {
    clientName?: string;
    nicheKeywords?: string[];
    industry?: string;
  },
): boolean {
  const levelsWithData = new Set<SpecificityLevel>();
  for (const r of results) {
    // Tagged boundary result
    const taggedLevel = parseBoundarySpecificity(r.intent);
    if (taggedLevel) {
      levelsWithData.add(taggedLevel);
      continue;
    }

    // Non-boundary Discovery result — classify heuristically when context is given
    if (
      context?.clientName &&
      r.queryText &&
      (r.stage?.toUpperCase() === "DISCOVERY" || (!r.stage && r.intent === ""))
    ) {
      const heuristicLevel = classifyNonBoundaryDiscoveryResult(
        r.queryText,
        context.clientName,
        context.nicheKeywords,
        context.industry,
      );
      if (heuristicLevel) levelsWithData.add(heuristicLevel);
    }
  }
  return levelsWithData.size >= 2;
}

/**
 * Filters a result set to only those with boundary intent tags.
 */
export function filterBoundaryResults<
  T extends { intent: string },
>(results: T[]): T[] {
  return results.filter(
    (r) => r.intent && r.intent.includes("boundary:"),
  );
}
