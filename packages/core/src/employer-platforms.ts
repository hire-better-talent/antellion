/**
 * Employer-relevant platform list for Antellion.
 *
 * Only platforms where candidates actively research employers drive
 * recommendation generation. General news, finance, or community sites
 * (barrons.com, forbes.com, techcrunch.com, reddit.com, etc.) are excluded
 * from the recommendation layer even if AI cites them in responses.
 *
 * They may still appear in the citation analysis table for context, but they
 * must not generate platform-specific remediation recommendations.
 */

export const EMPLOYER_RELEVANT_PLATFORMS = new Set([
  // Job and employer review sites
  "glassdoor.com",
  "indeed.com",
  "comparably.com",
  "kununu.com",
  "fairygodboss.com",
  "inhersight.com",

  // Compensation data
  "levels.fyi",
  "payscale.com",
  "salary.com",
  "paysa.com",

  // Professional networks
  "linkedin.com",

  // Employer listings and rankings
  "builtin.com",
  "wellfound.com",
  "angel.co",
  "dice.com",
  "ziprecruiter.com",

  // Anonymous workplace discussion
  "blind.app",
  "teamblind.com",
  "fishbowlapp.com",

  // Interview and career prep
  "leetcode.com",
  "interviewquery.com",
]);

/**
 * Returns true if the domain is a platform where candidates actively research
 * employers. Strips a leading "www." before testing.
 *
 * Use this to filter gap domains before generating recommendations. Non-employer
 * platforms (barrons.com, forbes.com, reddit.com, etc.) can still appear in the
 * citation landscape table but must not drive recommendation generation.
 */
export function isEmployerRelevantDomain(domain: string): boolean {
  const normalized = domain.toLowerCase().replace(/^www\./, "");
  return EMPLOYER_RELEVANT_PLATFORMS.has(normalized);
}
