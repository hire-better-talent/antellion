/**
 * Longitudinal benchmarking — before/after comparison across assessments.
 *
 * Takes two baseline snapshots (previous and current) and computes per-metric
 * changes with direction, significance, and a narrative summary. This enables
 * compelling "progress since last assessment" sections in reports.
 */

// ─── Types ──────────────────────────────────────────────────

export interface BaselineSnapshot {
  earnedVisibilityRate: number;
  discoveryMentionRate: number | null;
  evaluationMentionRate: number | null;
  considerationMentionRate: number | null;
  commitmentMentionRate: number | null;
  overallMentionRate: number;
  avgSentiment: number | null;
  topCompetitorName: string | null;
  topCompetitorRate: number | null;
  competitorGapPp: number | null;
  totalGapDomains: number;
  employerGapDomains: number;
  overallPositioning: string | null;
  queryCount: number;
  assessmentDate: Date;
  /**
   * Distribution of stability classifications across all queries in this assessment.
   * Optional — older baselines without multi-run data will not have this field.
   */
  stabilityDistribution?: {
    STABLE_PRESENCE: number;
    VOLATILE_PRESENCE: number;
    STABLE_ABSENCE: number;
    UNVALIDATED: number;
  };
  /**
   * Fraction of queries that were validated (run >= 2 times), 0-1.
   * Optional — older baselines without multi-run data will not have this field.
   */
  validatedQueryRate?: number;
}

export type ChangeDirection = "improved" | "declined" | "unchanged" | "new";
export type Significance = "meaningful" | "marginal" | "unchanged";

export interface MetricChange {
  metric: string;
  label: string;
  previous: number | string | null;
  current: number | string | null;
  changePp?: number;
  changeDirection: ChangeDirection;
  significance: Significance;
}

export interface BaselineComparison {
  previous: BaselineSnapshot;
  current: BaselineSnapshot;
  daysBetween: number;
  changes: MetricChange[];
  summary: string;
  overallDirection: "improved" | "declined" | "mixed" | "unchanged";
}

// ─── Constants ──────────────────────────────────────────────

/** Percentage-point thresholds for significance classification */
const MEANINGFUL_THRESHOLD_PP = 5;
const MARGINAL_THRESHOLD_PP = 2;

/** Positioning tier ordering (higher = better) */
const POSITIONING_ORDER: Record<string, number> = {
  CHAMPION: 5,
  CONTENDER: 4,
  PERIPHERAL: 3,
  CAUTIONARY: 2,
  INVISIBLE: 1,
};

// ─── Helpers ────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Classify a percentage-point change into significance.
 * Absolute value of changePp is used.
 */
function classifySignificance(changePp: number): Significance {
  const abs = Math.abs(changePp);
  if (abs >= MEANINGFUL_THRESHOLD_PP) return "meaningful";
  if (abs >= MARGINAL_THRESHOLD_PP) return "marginal";
  return "unchanged";
}

/**
 * Determine direction for a rate metric where higher = better.
 */
function rateDirection(prev: number, curr: number): ChangeDirection {
  const diff = curr - prev;
  if (Math.abs(diff) < 0.005) return "unchanged"; // less than 0.5pp
  return diff > 0 ? "improved" : "declined";
}

/**
 * Determine direction for a count metric where lower = better (e.g., gap domains).
 */
function gapCountDirection(prev: number, curr: number): ChangeDirection {
  if (prev === curr) return "unchanged";
  return curr < prev ? "improved" : "declined";
}

/**
 * Compare positioning tiers. Returns direction.
 */
function positioningDirection(prev: string | null, curr: string | null): ChangeDirection {
  if (prev === null && curr === null) return "unchanged";
  if (prev === null) return "new";
  if (curr === null) return "unchanged";
  const prevRank = POSITIONING_ORDER[prev] ?? 0;
  const currRank = POSITIONING_ORDER[curr] ?? 0;
  if (currRank > prevRank) return "improved";
  if (currRank < prevRank) return "declined";
  return "unchanged";
}

/**
 * Compare a rate metric (0-1 scale). Returns MetricChange or null if both are null.
 */
function compareRate(
  metric: string,
  label: string,
  prev: number | null,
  curr: number | null,
): MetricChange | null {
  if (prev === null && curr === null) return null;

  if (prev === null) {
    return {
      metric,
      label,
      previous: null,
      current: curr,
      changePp: undefined,
      changeDirection: "new",
      significance: curr !== null && curr >= 0.05 ? "meaningful" : "unchanged",
    };
  }

  if (curr === null) {
    // Current is null but previous wasn't -- treat as unchanged (no data)
    return {
      metric,
      label,
      previous: prev,
      current: null,
      changePp: undefined,
      changeDirection: "unchanged",
      significance: "unchanged",
    };
  }

  const changePp = Math.round((curr - prev) * 100);
  const direction = rateDirection(prev, curr);
  const significance = classifySignificance(changePp);

  return {
    metric,
    label,
    previous: prev,
    current: curr,
    changePp,
    changeDirection: direction,
    significance,
  };
}

/**
 * Classify significance for a raw count change (e.g., stability query counts).
 * A change of >=3 is meaningful, 1-2 is marginal.
 */
function classifyCountSignificance(diff: number): Significance {
  const abs = Math.abs(diff);
  if (abs >= 3) return "meaningful";
  if (abs >= 1) return "marginal";
  return "unchanged";
}

/**
 * Compare stability distributions between two snapshots.
 * Returns an array of MetricChange entries (one per stability dimension compared),
 * or an empty array when either snapshot lacks stability data.
 */
function compareStabilityDistributions(
  previous: BaselineSnapshot,
  current: BaselineSnapshot,
): MetricChange[] {
  if (!previous.stabilityDistribution || !current.stabilityDistribution) {
    return [];
  }

  const changes: MetricChange[] = [];

  // Stable presence count
  const prevStable = previous.stabilityDistribution.STABLE_PRESENCE;
  const currStable = current.stabilityDistribution.STABLE_PRESENCE;
  const stableDiff = currStable - prevStable;
  changes.push({
    metric: "stablePresenceQueries",
    label: "Stable Presence Queries",
    previous: prevStable,
    current: currStable,
    changePp: stableDiff,
    changeDirection:
      stableDiff === 0 ? "unchanged" : stableDiff > 0 ? "improved" : "declined",
    significance: classifyCountSignificance(stableDiff),
  });

  // Validation coverage
  const prevValidated = previous.validatedQueryRate ?? null;
  const currValidated = current.validatedQueryRate ?? null;
  if (prevValidated !== null && currValidated !== null) {
    const validationChangePp = Math.round((currValidated - prevValidated) * 100);
    changes.push({
      metric: "validationCoverage",
      label: "Validation Coverage",
      previous: prevValidated,
      current: currValidated,
      changePp: validationChangePp,
      changeDirection: rateDirection(prevValidated, currValidated),
      significance: classifySignificance(validationChangePp),
    });
  }

  return changes;
}

// ─── Narrative generation ───────────────────────────────────

function formatPctFromRate(rate: number | null): string {
  if (rate === null) return "N/A";
  return `${Math.round(rate * 100)}%`;
}

function buildSummary(
  changes: MetricChange[],
  previous: BaselineSnapshot,
  current: BaselineSnapshot,
): string {
  const parts: string[] = [];

  // Earned visibility change
  const evChange = changes.find((c) => c.metric === "earnedVisibilityRate");
  if (evChange && evChange.changeDirection !== "unchanged" && evChange.changeDirection !== "new") {
    const verb = evChange.changeDirection === "improved" ? "improved" : "declined";
    parts.push(
      `Earned visibility ${verb} from ${formatPctFromRate(evChange.previous as number | null)} to ${formatPctFromRate(evChange.current as number | null)}` +
      (evChange.changePp != null ? ` (${evChange.changePp > 0 ? "+" : ""}${evChange.changePp}pp)` : ""),
    );
  } else if (evChange && evChange.changeDirection === "new") {
    parts.push(
      `Earned visibility is now being measured at ${formatPctFromRate(evChange.current as number | null)}`,
    );
  }

  // Discovery mentions change
  const discChange = changes.find((c) => c.metric === "discoveryMentionRate");
  if (discChange && discChange.changePp != null && discChange.significance !== "unchanged") {
    const verb = discChange.changeDirection === "improved" ? "increased" : "decreased";
    parts.push(
      `Discovery mentions ${verb} from ${formatPctFromRate(discChange.previous as number | null)} to ${formatPctFromRate(discChange.current as number | null)}`,
    );
  }

  // Competitor gap change
  const gapChange = changes.find((c) => c.metric === "competitorGapPp");
  if (
    gapChange &&
    gapChange.previous !== null &&
    gapChange.current !== null &&
    gapChange.changeDirection !== "unchanged"
  ) {
    const verb = gapChange.changeDirection === "improved" ? "narrowed" : "widened";
    parts.push(
      `Competitor gap ${verb} from ${gapChange.previous}pp to ${gapChange.current}pp`,
    );
  }

  // Citation gaps closed
  const citChange = changes.find((c) => c.metric === "totalGapDomains");
  if (
    citChange &&
    citChange.previous !== null &&
    citChange.current !== null &&
    citChange.changeDirection === "improved"
  ) {
    const closed = (citChange.previous as number) - (citChange.current as number);
    if (closed > 0) {
      parts.push(
        `${closed} citation gap${closed !== 1 ? "s were" : " was"} closed`,
      );
    }
  }

  // Positioning change
  const posChange = changes.find((c) => c.metric === "overallPositioning");
  if (posChange && posChange.changeDirection === "improved") {
    parts.push(
      `Positioning improved from ${posChange.previous} to ${posChange.current}`,
    );
  } else if (posChange && posChange.changeDirection === "declined") {
    parts.push(
      `Positioning declined from ${posChange.previous} to ${posChange.current}`,
    );
  }

  // Stability changes — only when both snapshots have stability data
  if (previous.stabilityDistribution && current.stabilityDistribution) {
    const stableChange = changes.find((c) => c.metric === "stablePresenceQueries");

    if (stableChange && stableChange.significance !== "unchanged" && stableChange.changePp != null) {
      const n = Math.abs(stableChange.changePp);
      if (stableChange.changeDirection === "improved") {
        parts.push(
          `Stable visibility improved — ${n} more ${n === 1 ? "query" : "queries"} now show consistent AI mention`,
        );
      } else if (stableChange.changeDirection === "declined") {
        // Stable presence declined; check if volatile also declined (i.e., moved to absence)
        const prevVolatile = previous.stabilityDistribution.VOLATILE_PRESENCE;
        const currVolatile = current.stabilityDistribution.VOLATILE_PRESENCE;
        const prevAbsent = previous.stabilityDistribution.STABLE_ABSENCE;
        const currAbsent = current.stabilityDistribution.STABLE_ABSENCE;

        if (currVolatile < prevVolatile) {
          const volatileDrop = prevVolatile - currVolatile;
          parts.push(
            `Visibility stability strengthened — ${volatileDrop} fewer ${volatileDrop === 1 ? "query" : "queries"} showing inconsistent AI presence`,
          );
        } else if (currAbsent > prevAbsent) {
          const absenceGain = currAbsent - prevAbsent;
          parts.push(
            `Additional persistent gaps identified — ${absenceGain} more ${absenceGain === 1 ? "query" : "queries"} confirmed as consistently absent`,
          );
        }
      }
    } else {
      // Stable presence count unchanged — check volatile and absence independently
      const prevVolatile = previous.stabilityDistribution.VOLATILE_PRESENCE;
      const currVolatile = current.stabilityDistribution.VOLATILE_PRESENCE;
      const prevAbsent = previous.stabilityDistribution.STABLE_ABSENCE;
      const currAbsent = current.stabilityDistribution.STABLE_ABSENCE;

      if (currVolatile < prevVolatile) {
        const volatileDrop = prevVolatile - currVolatile;
        const sig = classifyCountSignificance(volatileDrop);
        if (sig !== "unchanged") {
          parts.push(
            `Visibility stability strengthened — ${volatileDrop} fewer ${volatileDrop === 1 ? "query" : "queries"} showing inconsistent AI presence`,
          );
        }
      }

      if (currAbsent > prevAbsent) {
        const absenceGain = currAbsent - prevAbsent;
        const sig = classifyCountSignificance(absenceGain);
        if (sig !== "unchanged") {
          parts.push(
            `Additional persistent gaps identified — ${absenceGain} more ${absenceGain === 1 ? "query" : "queries"} confirmed as consistently absent`,
          );
        }
      }
    }
  }

  if (parts.length === 0) {
    return "No meaningful changes were detected since the last assessment.";
  }

  return parts.join(". ") + ".";
}

// ─── Main comparison function ───────────────────────────────

export function computeBaselineComparison(
  previous: BaselineSnapshot,
  current: BaselineSnapshot,
): BaselineComparison {
  const days = daysBetween(previous.assessmentDate, current.assessmentDate);
  const changes: MetricChange[] = [];

  // Earned visibility rate
  const evChange = compareRate(
    "earnedVisibilityRate",
    "Earned visibility",
    previous.earnedVisibilityRate,
    current.earnedVisibilityRate,
  );
  if (evChange) changes.push(evChange);

  // Discovery mention rate
  const discChange = compareRate(
    "discoveryMentionRate",
    "Discovery mention rate",
    previous.discoveryMentionRate,
    current.discoveryMentionRate,
  );
  if (discChange) changes.push(discChange);

  // Evaluation mention rate
  const evalChange = compareRate(
    "evaluationMentionRate",
    "Evaluation mention rate",
    previous.evaluationMentionRate,
    current.evaluationMentionRate,
  );
  if (evalChange) changes.push(evalChange);

  // Consideration mention rate
  const consChange = compareRate(
    "considerationMentionRate",
    "Consideration mention rate",
    previous.considerationMentionRate,
    current.considerationMentionRate,
  );
  if (consChange) changes.push(consChange);

  // Commitment mention rate
  const commChange = compareRate(
    "commitmentMentionRate",
    "Commitment mention rate",
    previous.commitmentMentionRate,
    current.commitmentMentionRate,
  );
  if (commChange) changes.push(commChange);

  // Overall mention rate
  const overallChange = compareRate(
    "overallMentionRate",
    "Overall mention rate",
    previous.overallMentionRate,
    current.overallMentionRate,
  );
  if (overallChange) changes.push(overallChange);

  // Competitor gap (in pp, negative = behind, closer to 0 = improved)
  if (previous.competitorGapPp !== null || current.competitorGapPp !== null) {
    const prevGap = previous.competitorGapPp;
    const currGap = current.competitorGapPp;

    if (prevGap !== null && currGap !== null) {
      // Gap is negative (behind competitor). Getting closer to 0 = improved.
      const changePp = currGap - prevGap;
      // If competitor gap was -45 and is now -30, changePp = 15, which means improved.
      // Competitor gap is "how far behind" so getting less negative = improved.
      const direction: ChangeDirection =
        Math.abs(changePp) < 2 ? "unchanged" : changePp > 0 ? "improved" : "declined";
      const significance = classifySignificance(changePp);

      changes.push({
        metric: "competitorGapPp",
        label: "Competitor gap",
        previous: prevGap,
        current: currGap,
        changePp,
        changeDirection: direction,
        significance,
      });
    } else if (prevGap === null && currGap !== null) {
      changes.push({
        metric: "competitorGapPp",
        label: "Competitor gap",
        previous: null,
        current: currGap,
        changeDirection: "new",
        significance: "meaningful",
      });
    }
  }

  // Citation gap domains (lower = better)
  {
    const prevCount = previous.totalGapDomains;
    const currCount = current.totalGapDomains;
    const direction = gapCountDirection(prevCount, currCount);
    const diff = Math.abs(currCount - prevCount);
    const significance: Significance =
      diff >= 3 ? "meaningful" : diff >= 1 ? "marginal" : "unchanged";

    changes.push({
      metric: "totalGapDomains",
      label: "Citation gaps",
      previous: prevCount,
      current: currCount,
      changePp: currCount - prevCount,
      changeDirection: direction,
      significance,
    });
  }

  // Positioning tier
  {
    const direction = positioningDirection(
      previous.overallPositioning,
      current.overallPositioning,
    );
    const significance: Significance =
      direction === "improved" || direction === "declined" ? "meaningful" : "unchanged";

    changes.push({
      metric: "overallPositioning",
      label: "Positioning",
      previous: previous.overallPositioning,
      current: current.overallPositioning,
      changeDirection: direction,
      significance,
    });
  }

  // Stability metrics — only compared when both snapshots carry stability data.
  // Old baselines without this data gracefully produce no stability changes.
  const stabilityChanges = compareStabilityDistributions(previous, current);
  for (const sc of stabilityChanges) {
    changes.push(sc);
  }

  // Determine overall direction
  const meaningfulChanges = changes.filter((c) => c.significance === "meaningful");
  const improved = meaningfulChanges.filter((c) => c.changeDirection === "improved").length;
  const declined = meaningfulChanges.filter((c) => c.changeDirection === "declined").length;

  let overallDirection: BaselineComparison["overallDirection"];
  if (improved === 0 && declined === 0) {
    overallDirection = "unchanged";
  } else if (declined === 0) {
    overallDirection = "improved";
  } else if (improved === 0) {
    overallDirection = "declined";
  } else {
    overallDirection = "mixed";
  }

  const summary = buildSummary(changes, previous, current);

  return {
    previous,
    current,
    daysBetween: days,
    changes,
    summary,
    overallDirection,
  };
}
