/**
 * Authority Surface Map — domain → surface-category mapping.
 *
 * Canonical taxonomy locked 2026-05-18 (founder sign-off). Source of truth:
 *   docs/diagnostic/authority-surface-map-taxonomy.md
 *
 * Twelve scored categories plus two non-scored buckets:
 *   - REFERENCE_SITE_UNMAPPED — reference surfaces (Wikipedia, Crunchbase,
 *     ZoomInfo). Logged in Citation Source Inventory; NOT Map-scored.
 *   - NEEDS_CLASSIFICATION — fallback for domains that match no rule.
 *     Surfaces a manual-classification queue. NEVER silently routes to
 *     REFERENCE_SITE_UNMAPPED.
 *
 * Design: table-driven. Adding a new domain is a one-line edit in
 * SURFACE_DOMAIN_RULES. No conditional logic in the hot path.
 *
 * Rule precedence:
 *   1. Exact host match (most specific)
 *   2. Subdomain pattern match (e.g. "*.gainsight.com")
 *   3. Path pattern on a host (e.g. indeed.com/cmp/<company>/reviews)
 *   4. Client-owned domain detection (caller-supplied client domain wins
 *      over generic patterns, since "indeed.com" alone would otherwise
 *      mask a "careers.client.com" host).
 *
 * No LLM calls. No I/O. Pure data + pure dispatch.
 */

import { z } from "zod";

// ─── Surface categories ───────────────────────────────────────

/**
 * The 12 scored Authority Surface Map categories plus the two non-scored
 * buckets. Order corresponds to the taxonomy doc; do not reorder without
 * a taxonomy revision.
 */
export const SurfaceCategorySchema = z.enum([
  // Employer-owned (4)
  "CAREERS_SITE",
  "COMPANY_NEWSROOM_BLOG",
  "FUNCTIONAL_TEAM_CONTENT",
  "LEADERSHIP_SOCIAL_CONTENT",
  // Peer-reviewed (3)
  "GLASSDOOR",
  "GENERALIST_PEER_REVIEW",
  "SECTOR_SPECIFIC_PEER_REVIEW",
  // Specialist (3)
  "COMPENSATION_SPECIALIST_PLATFORMS",
  "PERSONA_SPECIFIC_COMMUNITY_PLATFORMS",
  "REDDIT_GENERAL_PROFESSIONAL_FORUMS",
  // Independent (1)
  "INDEPENDENT_VOICE_CONTENT",
  // Authoritative (1)
  "TRADE_AND_BUSINESS_PRESS",
  // Non-scored buckets
  "REFERENCE_SITE_UNMAPPED",
  "NEEDS_CLASSIFICATION",
]);
export type SurfaceCategory = z.infer<typeof SurfaceCategorySchema>;

/**
 * Categories that participate in scoring. Use this to filter when
 * aggregating Authority Surface Map scores — REFERENCE_SITE_UNMAPPED and
 * NEEDS_CLASSIFICATION are inventory-only.
 */
export const SCORED_SURFACE_CATEGORIES: readonly SurfaceCategory[] = [
  "CAREERS_SITE",
  "COMPANY_NEWSROOM_BLOG",
  "FUNCTIONAL_TEAM_CONTENT",
  "LEADERSHIP_SOCIAL_CONTENT",
  "GLASSDOOR",
  "GENERALIST_PEER_REVIEW",
  "SECTOR_SPECIFIC_PEER_REVIEW",
  "COMPENSATION_SPECIALIST_PLATFORMS",
  "PERSONA_SPECIFIC_COMMUNITY_PLATFORMS",
  "REDDIT_GENERAL_PROFESSIONAL_FORUMS",
  "INDEPENDENT_VOICE_CONTENT",
  "TRADE_AND_BUSINESS_PRESS",
] as const;

/** Display labels for client-facing artifacts. */
export const SURFACE_CATEGORY_DISPLAY: Readonly<Record<SurfaceCategory, string>> = {
  CAREERS_SITE: "Careers Site",
  COMPANY_NEWSROOM_BLOG: "Company Newsroom / Blog",
  FUNCTIONAL_TEAM_CONTENT: "Functional Team Content",
  LEADERSHIP_SOCIAL_CONTENT: "Leadership Social Content",
  GLASSDOOR: "Glassdoor",
  GENERALIST_PEER_REVIEW: "Generalist Peer Review",
  SECTOR_SPECIFIC_PEER_REVIEW: "Sector-Specific Peer Review",
  COMPENSATION_SPECIALIST_PLATFORMS: "Compensation Specialist Platforms",
  PERSONA_SPECIFIC_COMMUNITY_PLATFORMS: "Persona-Specific Community Platforms",
  REDDIT_GENERAL_PROFESSIONAL_FORUMS: "Reddit & General Professional Forums",
  INDEPENDENT_VOICE_CONTENT: "Independent Voice Content",
  TRADE_AND_BUSINESS_PRESS: "Trade & Business Press",
  REFERENCE_SITE_UNMAPPED: "Reference Site (not scored)",
  NEEDS_CLASSIFICATION: "Needs classification",
};

// ─── Surface group (for report-section bucketing) ─────────────

export type SurfaceGroup =
  | "EMPLOYER_OWNED"
  | "PEER_REVIEWED"
  | "SPECIALIST"
  | "INDEPENDENT"
  | "AUTHORITATIVE"
  | "OUT_OF_SCOPE";

export const SURFACE_CATEGORY_GROUP: Readonly<Record<SurfaceCategory, SurfaceGroup>> = {
  CAREERS_SITE: "EMPLOYER_OWNED",
  COMPANY_NEWSROOM_BLOG: "EMPLOYER_OWNED",
  FUNCTIONAL_TEAM_CONTENT: "EMPLOYER_OWNED",
  LEADERSHIP_SOCIAL_CONTENT: "EMPLOYER_OWNED",
  GLASSDOOR: "PEER_REVIEWED",
  GENERALIST_PEER_REVIEW: "PEER_REVIEWED",
  SECTOR_SPECIFIC_PEER_REVIEW: "PEER_REVIEWED",
  COMPENSATION_SPECIALIST_PLATFORMS: "SPECIALIST",
  PERSONA_SPECIFIC_COMMUNITY_PLATFORMS: "SPECIALIST",
  REDDIT_GENERAL_PROFESSIONAL_FORUMS: "SPECIALIST",
  INDEPENDENT_VOICE_CONTENT: "INDEPENDENT",
  TRADE_AND_BUSINESS_PRESS: "AUTHORITATIVE",
  REFERENCE_SITE_UNMAPPED: "OUT_OF_SCOPE",
  NEEDS_CLASSIFICATION: "OUT_OF_SCOPE",
};

// ─── Rule shape ───────────────────────────────────────────────

/**
 * Matchers are evaluated in registration order. The FIRST match wins.
 *
 *   - `host`: exact eTLD+1 match (e.g. "glassdoor.com" matches glassdoor.com
 *     AND www.glassdoor.com). Use this for singletons.
 *   - `hostSuffix`: matches `*.<value>` AND the bare host (e.g.
 *     "gainsight.com" matches community.gainsight.com).
 *   - `pathPrefix`: optional further constraint; only applies after a host
 *     match. If present, the URL pathname must startWith one of the values
 *     (case-insensitive). Used to disambiguate (e.g. medium.com/<author>
 *     vs medium.com/<company-blog>) and reserved for future entries — kept
 *     in the rule shape so we don't have to refactor later.
 */
interface SurfaceDomainRule {
  category: SurfaceCategory;
  host?: string;
  hostSuffix?: string;
  pathPrefix?: string[];
  /** Human-readable note shown in the needs-classification queue UI. */
  note?: string;
}

// ─── Domain rules ─────────────────────────────────────────────

/**
 * Adding a new surface: append to this table. No code changes elsewhere.
 *
 * Order matters: more-specific rules first (e.g. a specific subdomain
 * before its parent). Within a category the order is alphabetical for
 * readability, but precedence still flows top-to-bottom.
 */
const SURFACE_DOMAIN_RULES: readonly SurfaceDomainRule[] = [
  // ── 5. Glassdoor (singleton — check before generalist) ──
  { category: "GLASSDOOR", host: "glassdoor.com" },
  { category: "GLASSDOOR", host: "glassdoor.co.uk" },
  { category: "GLASSDOOR", host: "glassdoor.ca" },

  // ── 6. Generalist Peer Review ──
  { category: "GENERALIST_PEER_REVIEW", host: "comparably.com" },
  { category: "GENERALIST_PEER_REVIEW", host: "indeed.com", note: "Indeed review pages — paid job posts excluded from Map" },
  { category: "GENERALIST_PEER_REVIEW", hostSuffix: "kununu.com" },

  // ── 7. Sector-Specific Peer Review ──
  { category: "SECTOR_SPECIFIC_PEER_REVIEW", host: "builtin.com" },
  { category: "SECTOR_SPECIFIC_PEER_REVIEW", hostSuffix: "builtin.com" },
  { category: "SECTOR_SPECIFIC_PEER_REVIEW", host: "vault.com" },
  { category: "SECTOR_SPECIFIC_PEER_REVIEW", host: "fishbowlapp.com" },

  // ── 8. Compensation Specialist Platforms ──
  { category: "COMPENSATION_SPECIALIST_PLATFORMS", host: "levels.fyi" },
  { category: "COMPENSATION_SPECIALIST_PLATFORMS", host: "repvue.com" },
  { category: "COMPENSATION_SPECIALIST_PLATFORMS", host: "salary.com" },
  { category: "COMPENSATION_SPECIALIST_PLATFORMS", host: "payscale.com" },

  // ── 9. Persona-Specific Community Platforms ──
  { category: "PERSONA_SPECIFIC_COMMUNITY_PLATFORMS", host: "teamblind.com" },
  { category: "PERSONA_SPECIFIC_COMMUNITY_PLATFORMS", hostSuffix: "gainsight.com", pathPrefix: ["/community", "/communities"], note: "Gainsight Community" },
  { category: "PERSONA_SPECIFIC_COMMUNITY_PLATFORMS", host: "joinpavilion.com" },
  { category: "PERSONA_SPECIFIC_COMMUNITY_PLATFORMS", host: "pavilion.co" },
  { category: "PERSONA_SPECIFIC_COMMUNITY_PLATFORMS", host: "shrm.org", pathPrefix: ["/communities", "/community"] },
  { category: "PERSONA_SPECIFIC_COMMUNITY_PLATFORMS", host: "csnetwork.io" },
  { category: "PERSONA_SPECIFIC_COMMUNITY_PLATFORMS", host: "customersuccessnetwork.com" },

  // ── 10. Reddit & General Professional Forums ──
  { category: "REDDIT_GENERAL_PROFESSIONAL_FORUMS", host: "reddit.com" },
  { category: "REDDIT_GENERAL_PROFESSIONAL_FORUMS", hostSuffix: "reddit.com" },
  { category: "REDDIT_GENERAL_PROFESSIONAL_FORUMS", host: "news.ycombinator.com" },
  { category: "REDDIT_GENERAL_PROFESSIONAL_FORUMS", host: "lobste.rs" },

  // ── 11. Independent Voice Content ──
  // Note: substack/medium/youtube are author-attributable platforms. The
  // distinction between "Leadership Social Content" (#4) and "Independent
  // Voice Content" (#11) is whether the author is a named company leader.
  // The rule table cannot make that determination — it routes here by
  // default, and analyst review reclassifies to #4 when the voice belongs
  // to a company leader. surface-rules is a coarse router; voiceAudit is
  // the source of truth.
  { category: "INDEPENDENT_VOICE_CONTENT", hostSuffix: "substack.com" },
  { category: "INDEPENDENT_VOICE_CONTENT", host: "medium.com" },
  { category: "INDEPENDENT_VOICE_CONTENT", hostSuffix: "medium.com" },
  { category: "INDEPENDENT_VOICE_CONTENT", host: "youtube.com" },
  { category: "INDEPENDENT_VOICE_CONTENT", host: "youtu.be" },

  // ── 12. Trade & Business Press ──
  // National business press
  { category: "TRADE_AND_BUSINESS_PRESS", host: "bloomberg.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "reuters.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "wsj.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "ft.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "forbes.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "fortune.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "businessinsider.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "fastcompany.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "cnbc.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "axios.com" },
  // HR trade publications
  { category: "TRADE_AND_BUSINESS_PRESS", host: "tlnt.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "hrbrew.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "recruitingdaily.com" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "shrm.org", pathPrefix: ["/topics-tools", "/hr-today", "/resourcesandtools"], note: "SHRM editorial articles only — communities route to #9" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "ere.net" },
  { category: "TRADE_AND_BUSINESS_PRESS", host: "hrdive.com" },

  // ── 4. Leadership Social Content ──
  // Note: LinkedIn and X are author-attributable. Same caveat as #11 — the
  // table routes here and analyst voiceAudit confirms whether the named
  // author is a company leader. If not, reclassify to #11.
  { category: "LEADERSHIP_SOCIAL_CONTENT", host: "linkedin.com" },
  { category: "LEADERSHIP_SOCIAL_CONTENT", hostSuffix: "linkedin.com" },
  { category: "LEADERSHIP_SOCIAL_CONTENT", host: "x.com" },
  { category: "LEADERSHIP_SOCIAL_CONTENT", host: "twitter.com" },

  // ── REFERENCE_SITE_UNMAPPED (non-scored, but explicitly recognized) ──
  { category: "REFERENCE_SITE_UNMAPPED", host: "wikipedia.org" },
  { category: "REFERENCE_SITE_UNMAPPED", hostSuffix: "wikipedia.org" },
  { category: "REFERENCE_SITE_UNMAPPED", host: "crunchbase.com" },
  { category: "REFERENCE_SITE_UNMAPPED", host: "zoominfo.com" },
  { category: "REFERENCE_SITE_UNMAPPED", host: "owler.com" },
  { category: "REFERENCE_SITE_UNMAPPED", host: "pitchbook.com" },
  { category: "REFERENCE_SITE_UNMAPPED", host: "bloomberg.com", pathPrefix: ["/profile"], note: "Bloomberg company profile (reference). Bloomberg editorial routes to #12." },
  { category: "REFERENCE_SITE_UNMAPPED", host: "sec.gov" },
];

// ─── Public API ───────────────────────────────────────────────

export interface SurfaceClassificationInput {
  /** The domain or full URL of a cited source. */
  url: string;
  /**
   * Client's primary domain (eTLD+1) — used to detect employer-owned
   * surfaces. Pass the lowercased eTLD+1, e.g. "stripe.com".
   */
  clientDomain: string;
  /**
   * Optional list of additional client-owned domains (acquisitions,
   * functional team subdomains under a different eTLD+1).
   */
  additionalClientDomains?: string[];
}

export interface SurfaceClassificationResult {
  category: SurfaceCategory;
  /** True iff `category` is in SCORED_SURFACE_CATEGORIES. */
  isScored: boolean;
  /**
   * If category === NEEDS_CLASSIFICATION, the raw host that was looked up
   * (so the operator queue can group by host). Always present.
   */
  matchedHost: string;
  /**
   * Optional rule note (e.g. disambiguation guidance). Useful for the
   * needs-classification queue UI.
   */
  note?: string;
}

/**
 * Classify a citation URL into a surface category.
 *
 * Pure function — no I/O, no LLM, deterministic.
 *
 * Behavior:
 *   - Client-owned hosts route to one of the employer-owned categories
 *     (CAREERS_SITE / COMPANY_NEWSROOM_BLOG / FUNCTIONAL_TEAM_CONTENT)
 *     based on path heuristics.
 *   - Reference sites (Wikipedia, Crunchbase, ZoomInfo, …) route to
 *     REFERENCE_SITE_UNMAPPED and are flagged isScored=false. They are
 *     captured in the Citation Source Inventory but not Map-scored.
 *   - Domains that match no rule route to NEEDS_CLASSIFICATION. Callers
 *     MUST surface this in the analyst queue — never silently treat as
 *     out-of-scope.
 */
export function classifySurface(input: SurfaceClassificationInput): SurfaceClassificationResult {
  const host = extractHost(input.url);
  if (!host) {
    return {
      category: "NEEDS_CLASSIFICATION",
      isScored: false,
      matchedHost: input.url,
      note: "Unparseable URL",
    };
  }

  const pathname = extractPathname(input.url);

  // 1. Client-owned check wins over generic rules.
  const clientHosts = [input.clientDomain, ...(input.additionalClientDomains ?? [])]
    .map((d) => d.toLowerCase())
    .filter((d) => d.length > 0);

  for (const clientHost of clientHosts) {
    if (hostMatchesSuffix(host, clientHost)) {
      return {
        category: classifyClientOwnedPath(host, pathname),
        isScored: true,
        matchedHost: host,
      };
    }
  }

  // 2. Walk the rule table top-to-bottom; first match wins.
  for (const rule of SURFACE_DOMAIN_RULES) {
    if (!ruleMatches(rule, host, pathname)) continue;
    return {
      category: rule.category,
      isScored: SCORED_SURFACE_CATEGORIES.includes(rule.category),
      matchedHost: host,
      note: rule.note,
    };
  }

  // 3. Unmatched — surface for analyst classification.
  return {
    category: "NEEDS_CLASSIFICATION",
    isScored: false,
    matchedHost: host,
  };
}

// ─── Internals ────────────────────────────────────────────────

function extractHost(rawUrl: string): string | null {
  const trimmed = rawUrl.trim().toLowerCase();
  if (!trimmed) return null;
  // Accept bare hosts (no protocol).
  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function extractPathname(rawUrl: string): string {
  const trimmed = rawUrl.trim().toLowerCase();
  if (!trimmed) return "/";
  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).pathname || "/";
  } catch {
    return "/";
  }
}

function hostMatchesSuffix(host: string, suffix: string): boolean {
  const normalizedSuffix = suffix.replace(/^www\./, "").toLowerCase();
  return host === normalizedSuffix || host.endsWith(`.${normalizedSuffix}`);
}

function pathMatchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname.startsWith(p.toLowerCase()));
}

function ruleMatches(rule: SurfaceDomainRule, host: string, pathname: string): boolean {
  let hostHit = false;
  if (rule.host && host === rule.host) hostHit = true;
  if (!hostHit && rule.hostSuffix && hostMatchesSuffix(host, rule.hostSuffix)) hostHit = true;
  if (!hostHit) return false;
  if (rule.pathPrefix && rule.pathPrefix.length > 0) {
    return pathMatchesPrefix(pathname, rule.pathPrefix);
  }
  return true;
}

/**
 * Disambiguate which employer-owned surface a client-owned host belongs to.
 *
 *   - careers./jobs. subdomains  → CAREERS_SITE
 *   - /careers, /jobs, /work     → CAREERS_SITE
 *   - engineering./design./labs. → FUNCTIONAL_TEAM_CONTENT
 *   - /engineering, /design, /research, /labs → FUNCTIONAL_TEAM_CONTENT
 *   - everything else            → COMPANY_NEWSROOM_BLOG (default for
 *     client-owned domains — newsroom/blog/press/insights/about)
 */
function classifyClientOwnedPath(host: string, pathname: string): SurfaceCategory {
  if (/^(careers|jobs|hire|talent)\./.test(host)) return "CAREERS_SITE";
  if (/^\/(careers|jobs|work|hire|join-us|work-with-us)(\/|$)/.test(pathname)) {
    return "CAREERS_SITE";
  }

  if (/^(engineering|eng|design|research|labs|tech|product)\./.test(host)) {
    return "FUNCTIONAL_TEAM_CONTENT";
  }
  if (/^\/(engineering|design|research|labs|team-blog|team-blogs)(\/|$)/.test(pathname)) {
    return "FUNCTIONAL_TEAM_CONTENT";
  }

  return "COMPANY_NEWSROOM_BLOG";
}

// ─── Aggregation helpers ──────────────────────────────────────

export interface ClassifiedCitation extends SurfaceClassificationResult {
  /** Echo the input URL so callers can pair input → category downstream. */
  url: string;
}

/**
 * Convenience: classify a batch of citation URLs. Preserves order; emits
 * one ClassifiedCitation per input URL.
 */
export function classifyCitations(
  urls: string[],
  context: Omit<SurfaceClassificationInput, "url">,
): ClassifiedCitation[] {
  return urls.map((url) => ({
    url,
    ...classifySurface({ url, ...context }),
  }));
}

/**
 * Group classified citations by category, including NEEDS_CLASSIFICATION
 * and REFERENCE_SITE_UNMAPPED. Used by the scoring pipeline and the
 * needs-classification queue.
 */
export function groupCitationsBySurface(
  classified: ClassifiedCitation[],
): Map<SurfaceCategory, ClassifiedCitation[]> {
  const grouped = new Map<SurfaceCategory, ClassifiedCitation[]>();
  for (const c of classified) {
    const existing = grouped.get(c.category);
    if (existing) {
      existing.push(c);
    } else {
      grouped.set(c.category, [c]);
    }
  }
  return grouped;
}
