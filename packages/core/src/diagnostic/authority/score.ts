/**
 * Authority Surface Map — scoring.
 *
 * Rubric locked 2026-05-18 (founder sign-off). Source of truth:
 *   docs/diagnostic/authority-surface-map-taxonomy.md
 *
 * Each scored surface receives an integer 0–4 derived from three
 * sub-components (each 0–4):
 *
 *   - density   (50%) — distinct cited pieces, recency-weighted
 *   - voice     (30%) — distinct named human voices
 *   - recency   (20%) — months since most-recent cited piece
 *
 *   combined = round( (density * 0.5) + (voice * 0.3) + (recency * 0.2) )
 *
 * voiceAudit is a REQUIRED input — the score function must surface a type
 * error if missing (elevated from optional to required per founder
 * direction 2026-05-18 for inter-rater defensibility).
 *
 * Pure functions. No I/O. No LLM. Deterministic over input.
 *
 * Cap enforcement (max-4-in-section, top-3-to-Brief) is a report-rendering
 * concern owned by reportpm. This module scores ALL surfaces; rendering
 * decides which to display.
 */

import type { SurfaceCategory } from "./surface-rules";

// ─── Rubric versioning ────────────────────────────────────────

/**
 * Bump when the rubric weights, thresholds, or band definitions change.
 * Persisted alongside every score so cross-quarter comparisons can detect
 * methodology drift and the renderer can show "scored under rubric vX".
 */
export const RUBRIC_VERSION = "1.0.0";

// ─── Display labels ───────────────────────────────────────────

/**
 * Four-tier display label per combined score. Locked taxonomy:
 *   0    → Absent
 *   1    → Thin
 *   2–3  → Present
 *   4    → Anchored
 */
export type AuthorityDisplayLabel = "Absent" | "Thin" | "Present" | "Anchored";

export function displayLabelFromScore(combined: 0 | 1 | 2 | 3 | 4): AuthorityDisplayLabel {
  switch (combined) {
    case 0:
      return "Absent";
    case 1:
      return "Thin";
    case 2:
    case 3:
      return "Present";
    case 4:
      return "Anchored";
  }
}

// ─── Voice audit ──────────────────────────────────────────────

/**
 * One observed voice. `name` is the named human (analyst-asserted);
 * `evidenceUrl` is the citation that the voice came from. Optional `role`
 * lets analysts log whether the voice is a company leader, employee,
 * independent author, etc. — used to defend the reclassification path
 * between LEADERSHIP_SOCIAL_CONTENT and INDEPENDENT_VOICE_CONTENT.
 */
export interface VoiceObservation {
  name: string;
  evidenceUrl: string;
  role?: string;
  /** ISO date string for the piece this voice authored. */
  observedAt?: string;
}

/**
 * REQUIRED audit log. Every voice-diversity score must list the voices it
 * was derived from. An empty array is valid (it means "no distinct named
 * voices observed") but the field itself is mandatory — see the
 * `ScoreInput` shape below.
 */
export interface VoiceAudit {
  observations: VoiceObservation[];
  /** Free-form analyst note explaining edge cases (anonymous authors, etc). */
  analystNote?: string;
}

// ─── Recency-weighted density ─────────────────────────────────

/**
 * Recency weights from the locked rubric:
 *   ≤ 12 months  → 1.0
 *   12–24 months → 0.6
 *   24–36 months → 0.3
 *   > 36 months  → 0.1
 *
 * Boundaries are half-open: [0, 12] = 1.0; (12, 24] = 0.6; (24, 36] = 0.3;
 * (36, ∞) = 0.1. Anything with a missing date is treated as the lowest
 * band (0.1) — analysts should fill in dates rather than rely on this.
 */
export function recencyWeight(monthsAgo: number): number {
  if (monthsAgo <= 12) return 1.0;
  if (monthsAgo <= 24) return 0.6;
  if (monthsAgo <= 36) return 0.3;
  return 0.1;
}

export interface DensityObservation {
  /** Distinct cited piece (URL or analyst-assigned identifier). */
  evidenceId: string;
  /** ISO date string for when the piece was published. */
  publishedAt: string | null;
}

/**
 * Sum of recency weights across distinct cited pieces. Density score
 * derives from this weighted sum.
 *
 *   density band 0  → w == 0
 *   density band 1  → 0 < w ≤ 1
 *   density band 2  → 1 < w ≤ 3
 *   density band 3  → 3 < w ≤ 8
 *   density band 4  → w > 8
 */
export function densityWeightedCount(
  observations: readonly DensityObservation[],
  asOf: Date = new Date(),
): number {
  // Deduplicate by evidenceId. Two citations of the same piece count once.
  const byId = new Map<string, DensityObservation>();
  for (const obs of observations) {
    if (!byId.has(obs.evidenceId)) byId.set(obs.evidenceId, obs);
  }
  let total = 0;
  for (const obs of byId.values()) {
    const months = monthsBetween(obs.publishedAt, asOf);
    total += recencyWeight(months);
  }
  return total;
}

function monthsBetween(isoDate: string | null, asOf: Date): number {
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return Number.POSITIVE_INFINITY;
  // Approximate month = 30.44 days. The locked rubric bands are coarse
  // enough that calendar-month arithmetic is unnecessary.
  const ms = asOf.getTime() - then.getTime();
  return ms / (1000 * 60 * 60 * 24 * 30.44);
}

// ─── Sub-component scoring ────────────────────────────────────

export type SubScore = 0 | 1 | 2 | 3 | 4;

function clampSubScore(n: number): SubScore {
  if (n <= 0) return 0;
  if (n >= 4) return 4;
  // Inputs to this function come from band lookups that already produce
  // integers in [0, 4]; this clamp is belt-and-suspenders.
  const r = Math.round(n);
  return (r < 0 ? 0 : r > 4 ? 4 : r) as SubScore;
}

/** Density sub-score from weighted count. */
export function densitySubScore(weightedCount: number): SubScore {
  if (weightedCount === 0) return 0;
  if (weightedCount <= 1) return 1;
  if (weightedCount <= 3) return 2;
  if (weightedCount <= 8) return 3;
  return 4;
}

/** Voice-diversity sub-score from distinct named voice count. */
export function voiceSubScore(distinctVoiceCount: number): SubScore {
  if (distinctVoiceCount <= 0) return 0;
  if (distinctVoiceCount === 1) return 1;
  if (distinctVoiceCount <= 3) return 2;
  if (distinctVoiceCount <= 6) return 3;
  return 4;
}

/**
 * Recency sub-score from months since the most-recent cited piece.
 *   none/never → 0
 *   > 36       → 1
 *   24–36      → 2
 *   12–24      → 3
 *   ≤ 12       → 4
 */
export function recencySubScore(monthsSinceMostRecent: number | null): SubScore {
  if (monthsSinceMostRecent == null || !Number.isFinite(monthsSinceMostRecent)) return 0;
  if (monthsSinceMostRecent > 36) return 1;
  if (monthsSinceMostRecent > 24) return 2;
  if (monthsSinceMostRecent > 12) return 3;
  return 4;
}

/**
 * Combine sub-scores per the locked rubric:
 *   round( (density * 0.5) + (voice * 0.3) + (recency * 0.2) ) → 0..4
 */
export function combineSubScores(
  density: SubScore,
  voice: SubScore,
  recency: SubScore,
): SubScore {
  const raw = density * 0.5 + voice * 0.3 + recency * 0.2;
  return clampSubScore(raw);
}

// ─── Top-level score ──────────────────────────────────────────

/**
 * Input to `scoreSurface`. `voiceAudit` is REQUIRED — TypeScript will
 * reject calls that omit it (no `?` modifier). This is the inter-rater
 * defensibility guarantee.
 */
export interface ScoreInput {
  surfaceCategory: SurfaceCategory;
  /** Distinct cited pieces with publish dates. */
  densityObservations: readonly DensityObservation[];
  /** Months since most-recent cited piece. Null if no pieces observed. */
  monthsSinceMostRecent: number | null;
  /**
   * REQUIRED named-voice log. The voice-diversity sub-score is computed
   * from the count of distinct `name` values here, so this field is the
   * audit trail behind the score — not optional metadata.
   */
  voiceAudit: VoiceAudit;
  /** Optional explicit "as of" date for recency math. Defaults to now. */
  asOf?: Date;
}

export interface ScoreResult {
  surfaceCategory: SurfaceCategory;
  rubricVersion: string;
  density: SubScore;
  voice: SubScore;
  recency: SubScore;
  combined: SubScore;
  displayLabel: AuthorityDisplayLabel;
  // Detail for the audit appendix and the analyst-facing UI
  densityWeightedCount: number;
  distinctVoiceCount: number;
  voiceAudit: VoiceAudit;
  scoredAt: Date;
}

/**
 * Score one surface category for one client engagement.
 *
 * REQUIRED voice audit: TS will fail to compile if voiceAudit is missing.
 * The function additionally throws at runtime if voiceAudit is undefined,
 * which would only happen at a JS interop boundary (Prisma JSON column,
 * deserialized blob, etc.). Defense-in-depth — do not relax.
 */
export function scoreSurface(input: ScoreInput): ScoreResult {
  if (!input.voiceAudit || !Array.isArray(input.voiceAudit.observations)) {
    throw new Error(
      `scoreSurface: voiceAudit is required for ${input.surfaceCategory}. ` +
        "Every voice-diversity score must log the named voices behind it.",
    );
  }

  const distinctVoiceCount = countDistinctVoices(input.voiceAudit.observations);
  const weightedCount = densityWeightedCount(input.densityObservations, input.asOf ?? new Date());

  const density = densitySubScore(weightedCount);
  const voice = voiceSubScore(distinctVoiceCount);
  const recency = recencySubScore(input.monthsSinceMostRecent);
  const combined = combineSubScores(density, voice, recency);

  return {
    surfaceCategory: input.surfaceCategory,
    rubricVersion: RUBRIC_VERSION,
    density,
    voice,
    recency,
    combined,
    displayLabel: displayLabelFromScore(combined),
    densityWeightedCount: weightedCount,
    distinctVoiceCount,
    voiceAudit: input.voiceAudit,
    scoredAt: input.asOf ?? new Date(),
  };
}

function countDistinctVoices(observations: readonly VoiceObservation[]): number {
  if (observations.length === 0) return 0;
  const seen = new Set<string>();
  for (const o of observations) {
    const key = o.name.trim().toLowerCase();
    if (key) seen.add(key);
  }
  return seen.size;
}

// ─── Batch helper ─────────────────────────────────────────────

/**
 * Score every scored surface category for an engagement in one call.
 * Each entry must include a voiceAudit — passing an empty observations
 * array is valid ("no voices observed"); omitting the field is not.
 */
export function scoreAllSurfaces(inputs: readonly ScoreInput[]): ScoreResult[] {
  return inputs.map(scoreSurface);
}
