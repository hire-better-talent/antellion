import { classifyQueryStage } from "./decision-journey/classifier";
import type { DecisionStage } from "./decision-journey/types";

// Re-export so callers can import from this module without knowing the path.
export type { DecisionStage };

// ─── Types ──────────────────────────────────────────────────

export const QUERY_THEMES = [
  "reputation",
  "compensation",
  "hiring_process",
  "role_expectations",
  "culture",
  "competitor_comparison",
] as const;

export type QueryTheme = (typeof QUERY_THEMES)[number];

// ─── Job family taxonomy ─────────────────────────────────────

export const JOB_FAMILIES = [
  "engineering",
  "product",
  "design",
  "data",
  "sales",
  "marketing",
  "operations",
  "general",
] as const;

export type JobFamily = (typeof JOB_FAMILIES)[number];

/**
 * Classify a free-text role title into a JobFamily using keyword matching.
 *
 * Rules:
 * - Case-insensitive.
 * - Data-specific patterns are checked before generic engineering patterns so
 *   "Data Engineer" and "ML Engineer" resolve to "data", not "engineering".
 * - If no pattern matches, returns "general".
 */
export function classifyJobFamily(roleTitle: string): JobFamily {
  const lower = roleTitle.toLowerCase();

  // ── Data (checked before engineering to win on "data engineer", "ml engineer") ──
  if (
    /data scien|data analy|data engineer|ml engineer|machine learning|analytics|business intelligence/.test(
      lower,
    )
  )
    return "data";

  // ── Engineering / Technical ──────────────────────────────────────────────────
  if (
    /engineer|developer|devops|sre|sdet|qa |tester|architect|infrastructure|platform|security|frontend|backend|fullstack|full stack/.test(
      lower,
    )
  )
    return "engineering";

  // ── Sales / Revenue ──────────────────────────────────────────────────────────
  if (
    /sales|account exec|bdr|sdr|business development|customer success|revenue|account manager|closer/.test(
      lower,
    )
  )
    return "sales";

  // ── Product ──────────────────────────────────────────────────────────────────
  if (/product manager|product lead|product owner|program manager|tpm/.test(lower))
    return "product";

  // ── Design ───────────────────────────────────────────────────────────────────
  if (
    /designer|ux |ui |ux research|interaction design|visual design|creative|graphic/.test(
      lower,
    )
  )
    return "design";

  // ── Marketing ────────────────────────────────────────────────────────────────
  if (
    /marketing|growth|content|brand|communications|demand gen|seo|social media/.test(
      lower,
    )
  )
    return "marketing";

  // ── Operations / Support functions ───────────────────────────────────────────
  if (/operations|people ops|recruiting|recruiter|\bhr\b|finance|legal|admin/.test(lower))
    return "operations";

  return "general";
}

export type RevenueScaleLevel = "startup" | "growth" | "mid-market" | "enterprise" | "fortune500";

export interface QueryGenerationInput {
  companyName: string;
  roleTitle: string;
  geography?: string;
  industry?: string;
  businessContext?: string;
  competitors: string[];
  /** Niche business-model keywords (e.g. ["timeshare", "vacation ownership"]). */
  nicheKeywords?: string[];
  /** Company scale — drives scale-aware template activation. */
  revenueScale?: RevenueScaleLevel;
  /** What the company is known for (e.g. "home improvement retail"). */
  knownFor?: string;
  /** Skip deduplication — use for automated scans where query volume is not a constraint. */
  skipDedup?: boolean;
  /**
   * Deduplication aggressiveness mode.
   * - `conservative`: exact match only
   * - `standard`:     exact + Jaccard similarity
   * - `aggressive`:   exact + Jaccard + intent-level (default)
   * Ignored when `skipDedup` is true.
   */
  dedupMode?: DedupMode;
  /**
   * When true, include removed queries in the result for debugging/transparency.
   * Defaults to false to keep the result shape minimal for normal callers.
   */
  includeRemovedQueries?: boolean;
  /**
   * Additional role titles to generate variant queries for.
   * Each variant runs a filtered subset of CONSIDERATION/EVALUATION/COMMITMENT
   * templates, expanding coverage across related titles in the same job family.
   */
  roleVariants?: string[];
}

export type SpecificityLevel = "broad" | "industry" | "niche" | "hyper_specific";

/** Indicates how a query was produced. */
export type QuerySource = "template" | "llm";

export interface GeneratedQuery {
  text: string;
  intent: string;
  theme: QueryTheme;
  stage: DecisionStage;
  priority: number;
  /** Specificity level — set on all Discovery queries. Undefined for non-Discovery stages. */
  specificity?: SpecificityLevel;
  /** Provenance — "template" for rule-based queries, "llm" for LLM-generated supplemental queries. */
  source?: QuerySource;
}

export interface GeneratedCluster {
  theme: QueryTheme;
  name: string;
  intent: string;
  queries: GeneratedQuery[];
}

export interface QueryIntelligenceResult {
  clusters: GeneratedCluster[];
  totalGenerated: number;
  totalAfterDedup: number;
  removedQueries?: Array<{ text: string; reason: string; duplicateOfText: string }>;
}

/**
 * Controls how aggressively queries are deduplicated.
 *
 * - `conservative`: Pass 1 only (exact normalized match). Maximum query retention.
 * - `standard`:     Pass 1 + Pass 2 (Jaccard similarity). Default for manual scans.
 * - `aggressive`:   Pass 1 + Pass 2 + Pass 3 (intent-level). Maximum signal per query.
 */
export type DedupMode = "conservative" | "standard" | "aggressive";

export interface DedupResult<T> {
  surviving: T[];
  removed: Array<{ query: T; reason: string; duplicateOf: T }>;
}

// ─── Theme config ───────────────────────────────────────────

interface ThemeConfig {
  name: string;
  intent: string;
  basePriority: number;
}

const THEME_CONFIG: Record<QueryTheme, ThemeConfig> = {
  reputation: {
    name: "Reputation & Brand",
    intent: "Evaluating employer reputation and brand perception",
    basePriority: 8,
  },
  compensation: {
    name: "Compensation & Benefits",
    intent: "Researching compensation, benefits, and equity",
    basePriority: 7,
  },
  competitor_comparison: {
    name: "Competitor Comparison",
    intent: "Comparing employers head-to-head for talent decisions",
    basePriority: 7,
  },
  role_expectations: {
    name: "Role Expectations",
    intent: "Understanding day-to-day work, tech stack, and responsibilities",
    basePriority: 6,
  },
  culture: {
    name: "Culture & Work-Life",
    intent: "Assessing work-life balance, remote policy, and team dynamics",
    basePriority: 6,
  },
  hiring_process: {
    name: "Hiring Process",
    intent: "Researching interview process, timeline, and hiring experience",
    basePriority: 5,
  },
};

// ─── Template-based query generation ────────────────────────

interface QueryTemplate {
  template: string;
  intent: string;
  theme: QueryTheme;
  stage: DecisionStage;
  /** Job families this template applies to. Omitted/empty = all families. */
  applicableTo?: JobFamily[];
  /**
   * Specificity level for Discovery-stage templates.
   * - "broad"    — no industry, no niche (pure function or general)
   * - "industry" — includes {industry} placeholder
   * - "niche"    — only generated when niche keywords are available
   *
   * Non-Discovery templates leave this undefined.
   */
  specificity?: SpecificityLevel;
  /**
   * Revenue scale levels required for this template to activate.
   * Omitted = all scales. When set, the template is only generated if the
   * client's revenueScale matches one of the listed values.
   */
  requiresScale?: RevenueScaleLevel[];
}

const TEMPLATES: QueryTemplate[] = [
  // ── Discovery stage — broad (no industry, no geography) ──────────────────
  // These fire regardless of what context is available. Every client gets them.

  {
    template: "best companies to work for",
    intent: "General employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "top employers hiring right now",
    intent: "Active hiring employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "best companies for career growth",
    intent: "Growth-first employer discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "highest paying companies",
    intent: "Compensation-first employer discovery",
    theme: "compensation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "best company culture",
    intent: "Culture-first employer discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "companies with best benefits",
    intent: "Benefits-driven broad discovery",
    theme: "compensation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "best companies for work life balance",
    intent: "Work-life driven broad discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "top rated employers on glassdoor",
    intent: "Review-platform broad discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "best places to work 2026",
    intent: "Current-year broad employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "companies that treat employees well",
    intent: "Employee-welfare employer discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "broad",
  },

  // ── Discovery stage — broad with role (no industry) ──────────────────────
  // Role is available on every scan, so these are still "broad" — no industry
  // specificity added.

  {
    template: "best companies for {role}",
    intent: "Role-based broad employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "top companies hiring {role}",
    intent: "Active hiring role-based discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "highest paying {role} jobs",
    intent: "Compensation-first role-based discovery",
    theme: "compensation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "best {role} career opportunities",
    intent: "Career opportunity role-based discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "companies known for great {role} teams",
    intent: "Team quality role-based discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "broad",
  },

  // ── Discovery stage — industry-level (includes {industry}) ───────────────
  // These require an industry to be set. Geography is optional — templates
  // that include {geography} are filtered out at expansion time when geography
  // is absent.

  {
    template: "best {industry} companies to work for in {geography}",
    intent: "Industry employer ranking",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "top companies for {role} in {geography}",
    intent: "Role-specific employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "best paying companies for {role} in {geography}",
    intent: "Compensation-driven employer search",
    theme: "compensation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "fastest growing {industry} companies hiring {role}",
    intent: "Growth-stage employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "best engineering culture at {industry} companies",
    intent: "Culture-first employer discovery",
    theme: "culture",
    stage: "DISCOVERY",
    applicableTo: ["engineering", "data"],
    specificity: "industry",
  },
  {
    template: "top employers for {role} in {geography} 2026",
    intent: "Current-year employer ranking",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "best {industry} startups to work for",
    intent: "Startup employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "companies with best work life balance for {role}",
    intent: "Work-life driven discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "highest rated employers in {industry} on glassdoor",
    intent: "Review-platform employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "{industry} companies with best benefits for engineers",
    intent: "Benefits-driven employer discovery",
    theme: "compensation",
    stage: "DISCOVERY",
    applicableTo: ["engineering", "data"],
    specificity: "industry",
  },
  {
    template: "most innovative {industry} companies to work for",
    intent: "Innovation-signal employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "best remote {role} employers in {industry}",
    intent: "Remote-first employer discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "companies known for great engineering teams in {geography}",
    intent: "Engineering culture discovery by location",
    theme: "culture",
    stage: "DISCOVERY",
    applicableTo: ["engineering", "data"],
    specificity: "industry",
  },
  {
    template: "best companies for career growth as a {role}",
    intent: "Career trajectory employer discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "top paying {industry} companies in {geography}",
    intent: "Compensation-ranked employer discovery",
    theme: "compensation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "{industry} companies with strong diversity and inclusion",
    intent: "DEI-driven employer discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "best places to work in {industry} for experienced {role}",
    intent: "Senior-level employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "emerging {industry} companies hiring {role}",
    intent: "Emerging employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "companies with best compensation packages for {role} in {geography}",
    intent: "Total-compensation employer discovery",
    theme: "compensation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "where should I work as a {role} in {geography}",
    intent: "Intent-driven employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "best employer reputation in {industry}",
    intent: "Brand reputation employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "best {industry} companies for {role} career development",
    intent: "Career development employer discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "top {industry} companies for engineers in {geography}",
    intent: "Engineering-focused employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    applicableTo: ["engineering", "data"],
    specificity: "industry",
  },

  // ── Discovery stage — conversational (natural AI dialogue) ─────────────
  // Modeled on how candidates actually talk to AI assistants. These use
  // sentence-length prompts rather than keyword-style search queries.

  {
    template: "I'm thinking about a career change into {industry}, what companies should I look at",
    intent: "Conversational career exploration",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "what are the best companies if I want to make good money as a {role}",
    intent: "Conversational compensation-driven discovery",
    theme: "compensation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "I'm a {role} looking for my next job, what companies should be on my radar",
    intent: "Conversational active job search discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "my friend works in {industry} and loves it, what companies are hiring",
    intent: "Conversational peer referral discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "where do the best {role} people work",
    intent: "Conversational talent signal discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "what companies have the best reputation for treating {role} well",
    intent: "Conversational treatment reputation discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "I want to work somewhere innovative in {industry}, who should I look at",
    intent: "Conversational innovation-driven discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "what {industry} companies actually care about their employees",
    intent: "Conversational employee welfare discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "if I want to work at a company that is growing fast in {industry}, where should I apply",
    intent: "Conversational growth-stage discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "top companies a {role} should consider in 2026",
    intent: "Conversational current-year discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "I'm early in my {role} career and want to go somewhere I can learn a lot, any suggestions",
    intent: "Conversational early-career discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "what companies should I avoid and which ones should I target as a {role}",
    intent: "Conversational avoid-vs-target discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "looking for a {role} role with great benefits, which companies are worth applying to",
    intent: "Conversational benefits-driven discovery",
    theme: "compensation",
    stage: "DISCOVERY",
    specificity: "broad",
  },
  {
    template: "which {industry} companies have the happiest employees",
    intent: "Conversational employee satisfaction discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "I want a remote friendly {role} job, what are the best companies for that",
    intent: "Conversational remote-first discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "broad",
  },

  // ── Discovery stage — context-dependent (businessContext / industry) ────
  // These use the {context} placeholder and are only generated when
  // businessContext or industry is available.

  {
    template: "best companies for {role} in {context}",
    intent: "Context-specific employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "what {context} companies are hiring {role}",
    intent: "Context-specific hiring discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },
  {
    template: "career opportunities in {context} for {role}",
    intent: "Context-specific career opportunity discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
  },

  // ── Consideration stage — company named, general research ──
  // Trimmed to ~20 templates that probe meaningfully distinct dimensions.
  // Removed redundant "{company} [attribute]" templates that produce near-
  // identical AI responses.

  {
    template: "what is it like to work at {company}",
    intent: "Direct employer research",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  {
    template: "is {company} a good company to work for",
    intent: "General employer evaluation",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  {
    template: "{company} career growth for {role}",
    intent: "Growth trajectory research",
    theme: "culture",
    stage: "CONSIDERATION",
  },
  {
    template: "{company} tech stack for {role}",
    intent: "Technical environment research",
    theme: "role_expectations",
    stage: "CONSIDERATION",
    applicableTo: ["engineering", "data"],
  },
  {
    template: "day in the life of a {role} at {company}",
    intent: "Daily work evaluation",
    theme: "role_expectations",
    stage: "CONSIDERATION",
  },
  {
    template: "{company} engineering blog",
    intent: "Technical depth signal",
    theme: "role_expectations",
    stage: "CONSIDERATION",
    applicableTo: ["engineering", "data"],
  },
  {
    template: "what does a {role} do at {company}",
    intent: "Role definition lookup",
    theme: "role_expectations",
    stage: "CONSIDERATION",
  },
  {
    template: "is {company} a stable company to work for",
    intent: "Job security evaluation",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  {
    template: "{company} funding and financial health",
    intent: "Financial stability research",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  {
    template: "{company} technology innovation",
    intent: "Technical innovation signal",
    theme: "role_expectations",
    stage: "CONSIDERATION",
  },
  {
    template: "recent news about {company} as an employer",
    intent: "Current employer news research",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  {
    template: "{company} layoffs and job security",
    intent: "Employment stability research",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  {
    template: "working at {company} pros and cons",
    intent: "Balanced employer evaluation",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  // Conversational Consideration — natural questions candidates ask about a known company
  {
    template: "I'm thinking about applying to {company}, what should I know about working there",
    intent: "Pre-application research",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  {
    template: "what do current employees say about {company} as a place to work",
    intent: "Employee sentiment research",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  {
    template: "would you recommend {company} for a {role} career",
    intent: "Career recommendation signal",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  {
    template: "how does {company} treat their {role} team",
    intent: "Team treatment perception",
    theme: "culture",
    stage: "CONSIDERATION",
  },
  {
    template: "is {company} actually a good place to work or is it just marketing",
    intent: "Authenticity test",
    theme: "reputation",
    stage: "CONSIDERATION",
  },
  {
    template: "what is the culture really like at {company} for {role}",
    intent: "Culture reality check",
    theme: "culture",
    stage: "CONSIDERATION",
  },

  // ── Evaluation stage — compensation benchmarking or comparison terms ──

  {
    template: "{role} salary at {company}",
    intent: "Direct compensation lookup",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{company} {role} compensation package",
    intent: "Total compensation research",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{role} salary {geography}",
    intent: "Geographic salary benchmarking",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{company} equity compensation for {role}",
    intent: "Equity and stock option research",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "does {company} allow remote {role}",
    intent: "Role-specific remote policy",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "how does {company} compensation compare to {industry} average",
    intent: "Compensation market benchmarking",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{role} salary at {company} vs market rate in {geography}",
    intent: "Salary vs market rate analysis",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{company} total compensation vs industry average",
    intent: "Total comp market comparison",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{company} stock compensation for {role}",
    intent: "Equity package research",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{role} compensation package {geography}",
    intent: "Geographic compensation benchmarking",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "best {role} salary in {geography} {industry}",
    intent: "Salary ceiling research",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{company} {role} bonus structure",
    intent: "Variable compensation research",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{company} vs {industry} average work life balance",
    intent: "Work-life benchmarking",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "{company} engineer pay compared to competitors",
    intent: "Pay competitiveness research",
    theme: "compensation",
    stage: "EVALUATION",
    applicableTo: ["engineering", "data"],
  },

  // ── Evaluation stage — conversational (natural comparison/decision) ────
  // Modeled on how candidates actually discuss employment decisions with AI.

  {
    template: "I have two offers, one from {company} and one from another company, how should I decide",
    intent: "Conversational offer decision",
    theme: "reputation",
    stage: "EVALUATION",
  },
  {
    template: "is {company} considered a top employer for {role} compared to other options",
    intent: "Conversational relative standing evaluation",
    theme: "reputation",
    stage: "EVALUATION",
  },
  {
    template: "I'm deciding between a few {role} jobs, how does {company} stack up",
    intent: "Conversational multi-offer evaluation",
    theme: "reputation",
    stage: "EVALUATION",
  },
  {
    template: "which company pays {role} better, {company} or other employers in {industry}",
    intent: "Conversational compensation comparison",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "is {company} a better place to work than other {industry} companies for {role}",
    intent: "Conversational employer comparison",
    theme: "reputation",
    stage: "EVALUATION",
  },
  {
    template: "I want good work life balance as a {role}, is {company} a good choice compared to alternatives",
    intent: "Conversational work-life comparison",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "where would I learn more as a {role}, {company} or somewhere else",
    intent: "Conversational career development comparison",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "what do people say about {company} compensation versus other {industry} companies",
    intent: "Conversational industry comp comparison",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "is it worth taking a {role} job at {company} or should I hold out for something better",
    intent: "Conversational hold-out evaluation",
    theme: "reputation",
    stage: "EVALUATION",
  },
  {
    template: "talk me into or out of taking a {role} role at {company}",
    intent: "Conversational persuasion test",
    theme: "reputation",
    stage: "EVALUATION",
  },

  // ── Commitment stage — company named with action/process terms ──

  {
    template: "{company} {role} interview process",
    intent: "Interview preparation",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "how to get hired at {company} as a {role}",
    intent: "Application strategy",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "{company} interview questions for {role}",
    intent: "Interview content research",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "{company} hiring timeline",
    intent: "Process timeline expectations",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "{company} onboarding experience",
    intent: "Post-hire experience research",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "{company} {role} interview questions and process",
    intent: "Combined interview preparation",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "how long does {company} take to hire",
    intent: "Hiring duration research",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "{company} offer negotiation tips",
    intent: "Offer negotiation research",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "what to expect in {company} technical interview",
    intent: "Technical interview preparation",
    theme: "hiring_process",
    stage: "COMMITMENT",
    applicableTo: ["engineering", "data"],
  },
  {
    template: "{company} onboarding experience for new engineers",
    intent: "Engineering onboarding research",
    theme: "hiring_process",
    stage: "COMMITMENT",
    applicableTo: ["engineering", "data"],
  },
  {
    template: "{company} first 90 days as a {role}",
    intent: "Early tenure experience research",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "how to prepare for {company} {role} interview",
    intent: "Interview preparation guidance",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "{company} hiring process timeline",
    intent: "End-to-end hiring timeline",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "{company} recruiter experience",
    intent: "Recruiter interaction research",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "does {company} do whiteboard interviews",
    intent: "Interview format research",
    theme: "hiring_process",
    stage: "COMMITMENT",
    applicableTo: ["engineering", "data"],
  },
  {
    template: "{company} interview difficulty for {role}",
    intent: "Interview difficulty calibration",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "what is the {company} coding challenge like",
    intent: "Coding assessment research",
    theme: "hiring_process",
    stage: "COMMITMENT",
    applicableTo: ["engineering", "data"],
  },
  {
    template: "{company} relocation package for {role}",
    intent: "Relocation support research",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "negotiating salary at {company} for {role}",
    intent: "Salary negotiation research",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "{company} background check and offer process",
    intent: "Offer process research",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },

  // ── Commitment stage — conversational (natural application-decision) ────
  // Modeled on how candidates ask AI for guidance when they're about to apply
  // or accept an offer.

  {
    template: "I'm about to apply to {company}, anything I should know",
    intent: "Conversational pre-application research",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "tips for getting hired at {company} as a {role}",
    intent: "Conversational application strategy",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "what should I expect in my first year at {company} as a {role}",
    intent: "Conversational first-year experience",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "is {company} good at onboarding new {role} hires",
    intent: "Conversational onboarding quality",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },
  {
    template: "what's the vibe like on the {role} team at {company}",
    intent: "Conversational team atmosphere",
    theme: "culture",
    stage: "COMMITMENT",
  },
  {
    template: "I just got an offer from {company} for a {role} role, should I accept",
    intent: "Conversational offer acceptance",
    theme: "reputation",
    stage: "COMMITMENT",
  },
  {
    template: "how do I stand out in the {company} {role} interview process",
    intent: "Conversational interview differentiation",
    theme: "hiring_process",
    stage: "COMMITMENT",
  },

  // ── Enterprise/Fortune 500 — brand positioning queries ──────────────────
  // These only activate for enterprise+ clients. They test how AI positions a
  // well-known brand rather than whether it appears at all.

  // Discovery: scale-aware employer lists
  {
    template: "best Fortune 500 companies for {role}",
    intent: "Fortune 500 employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "broad",
    requiresScale: ["enterprise", "fortune500"],
  },
  {
    template: "best large companies for {role} career growth",
    intent: "Large-company career growth discovery",
    theme: "culture",
    stage: "DISCOVERY",
    specificity: "broad",
    requiresScale: ["enterprise", "fortune500"],
  },
  {
    template: "Fortune 500 companies with best engineering culture",
    intent: "Fortune 500 engineering culture discovery",
    theme: "culture",
    stage: "DISCOVERY",
    applicableTo: ["engineering", "data"],
    specificity: "broad",
    requiresScale: ["fortune500"],
  },
  {
    template: "best large employers in {geography} for {role}",
    intent: "Geographic large-employer discovery",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
    requiresScale: ["enterprise", "fortune500"],
  },
  {
    template: "top {industry} Fortune 500 companies to work for",
    intent: "Industry Fortune 500 employer ranking",
    theme: "reputation",
    stage: "DISCOVERY",
    specificity: "industry",
    requiresScale: ["fortune500"],
  },

  // Consideration: brand positioning tests for known companies
  {
    template: "is {company} a good Fortune 500 employer for {role}",
    intent: "Fortune 500 employer evaluation",
    theme: "reputation",
    stage: "CONSIDERATION",
    requiresScale: ["enterprise", "fortune500"],
  },
  {
    template: "does {company} have good {role} career opportunities",
    intent: "Career opportunity depth test",
    theme: "culture",
    stage: "CONSIDERATION",
    requiresScale: ["enterprise", "fortune500"],
  },
  {
    template: "is {company} tech team innovative or corporate",
    intent: "Innovation vs bureaucracy perception",
    theme: "culture",
    stage: "CONSIDERATION",
    applicableTo: ["engineering", "data"],
    requiresScale: ["enterprise", "fortune500"],
  },
  {
    template: "{company} work culture for {role} — is it bureaucratic",
    intent: "Bureaucracy perception test",
    theme: "culture",
    stage: "CONSIDERATION",
    requiresScale: ["enterprise", "fortune500"],
  },
  {
    template: "what is it like being a {role} at a large company like {company}",
    intent: "Large-company experience perception",
    theme: "culture",
    stage: "CONSIDERATION",
    requiresScale: ["enterprise", "fortune500"],
  },
  {
    template: "is {company} a good place to build a {role} career long term",
    intent: "Long-term career viability test",
    theme: "culture",
    stage: "CONSIDERATION",
    requiresScale: ["enterprise", "fortune500"],
  },
  {
    template: "{company} innovation and technology investment",
    intent: "Technology investment perception",
    theme: "role_expectations",
    stage: "CONSIDERATION",
    applicableTo: ["engineering", "data"],
    requiresScale: ["enterprise", "fortune500"],
  },

  // Evaluation: enterprise-scale competitive positioning
  {
    template: "should I take a {role} job at {company} or a smaller company",
    intent: "Large vs small company tradeoff",
    theme: "competitor_comparison",
    stage: "EVALUATION",
    requiresScale: ["enterprise", "fortune500"],
  },
  {
    template: "{company} vs other Fortune 500 companies for {role}",
    intent: "Fortune 500 peer comparison",
    theme: "competitor_comparison",
    stage: "EVALUATION",
    requiresScale: ["fortune500"],
  },
  {
    template: "is {company} compensation competitive for a Fortune 500",
    intent: "Fortune 500 compensation benchmarking",
    theme: "compensation",
    stage: "EVALUATION",
    requiresScale: ["fortune500"],
  },
  {
    template: "does {company} pay competitively for {role} compared to other large employers",
    intent: "Large-employer compensation comparison",
    theme: "compensation",
    stage: "EVALUATION",
    requiresScale: ["enterprise", "fortune500"],
  },
];

// Competitor comparison templates (only used when competitors exist)
const COMPETITOR_TEMPLATES: QueryTemplate[] = [
  {
    template: "{company} vs {competitor} for {role}",
    intent: "Head-to-head employer comparison",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "should I work at {company} or {competitor}",
    intent: "Decision-stage comparison",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "{company} compared to {competitor} engineering culture",
    intent: "Culture comparison",
    theme: "competitor_comparison",
    stage: "EVALUATION",
    applicableTo: ["engineering", "data"],
  },
  {
    template: "{company} vs {competitor} compensation for {role}",
    intent: "Head-to-head compensation comparison",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{company} vs {competitor} work life balance",
    intent: "Head-to-head work-life comparison",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "{company} vs {competitor} career growth",
    intent: "Head-to-head growth comparison",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "{company} vs {competitor} benefits and perks",
    intent: "Head-to-head benefits comparison",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "pros and cons of {company} vs {competitor}",
    intent: "Balanced head-to-head evaluation",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "better for {role} {company} or {competitor}",
    intent: "Role-specific employer choice",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "{company} vs {competitor} remote work policy",
    intent: "Head-to-head remote policy comparison",
    theme: "culture",
    stage: "EVALUATION",
  },

  // ── Compensation comparison depth ────────────────────────────────────────
  {
    template: "{company} vs {competitor} salary for {role}",
    intent: "Salary-level head-to-head comparison",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{company} vs {competitor} total compensation package",
    intent: "Total comp head-to-head comparison",
    theme: "compensation",
    stage: "EVALUATION",
  },
  {
    template: "{company} or {competitor} better pay for {role}",
    intent: "Pay preference decision query",
    theme: "compensation",
    stage: "EVALUATION",
  },

  // ── Culture comparison depth ──────────────────────────────────────────────
  {
    template: "{company} vs {competitor} for work life balance",
    intent: "Work-life head-to-head comparison",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "is {company} or {competitor} better for {role} career growth",
    intent: "Career growth head-to-head comparison",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "{company} vs {competitor} management style",
    intent: "Management style head-to-head comparison",
    theme: "culture",
    stage: "EVALUATION",
  },

  // ── Direct decision queries ───────────────────────────────────────────────
  {
    template: "I have offers from {company} and {competitor} which should I take",
    intent: "Offer decision head-to-head",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "{company} vs {competitor} glassdoor reviews",
    intent: "Review-platform head-to-head comparison",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },

  // ── Conversational competitor comparisons ──────────────────────────────
  // Natural dialogue-style queries for candidates deciding between employers.

  {
    template: "my recruiter says {company} is better than {competitor} for {role}, is that true",
    intent: "Conversational recruiter claim validation",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "I'm deciding between {company} and {competitor}, what should I know",
    intent: "Conversational open-ended comparison",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "is {company} or {competitor} better for someone early in their {role} career",
    intent: "Conversational early-career comparison",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "I want good work life balance as a {role}, {company} or {competitor}",
    intent: "Conversational work-life comparison",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "where would I learn more as a {role}, {company} or {competitor}",
    intent: "Conversational learning comparison",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "comparing {company} and {competitor} for {role}, which has better culture",
    intent: "Conversational culture comparison",
    theme: "culture",
    stage: "EVALUATION",
  },
  {
    template: "talk me out of going to {competitor} instead of {company} for a {role} role",
    intent: "Conversational persuasion test — competitor",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "which company should a {role} choose, {company} or {competitor}, and why",
    intent: "Conversational reasoned comparison",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "I have offers from {company} and {competitor}, help me decide which to take as a {role}",
    intent: "Conversational dual-offer decision",
    theme: "competitor_comparison",
    stage: "EVALUATION",
  },
  {
    template: "which company pays {role} better, {company} or {competitor}",
    intent: "Conversational pay comparison",
    theme: "compensation",
    stage: "EVALUATION",
  },
];

// ─── Phrasing variant map ────────────────────────────────────
//
// Maps a canonical template string to 2-3 alternative phrasings of the same
// intent. Variants inherit the stage/theme/specificity of the source query.
// Keys must exactly match template strings in TEMPLATES or COMPETITOR_TEMPLATES.

const PHRASING_VARIANTS: Record<string, string[]> = {
  // Discovery — broad
  "best companies to work for": [
    "where should I work",
    "top employers right now",
    "good companies for a career",
  ],
  "best companies for {role}": [
    "where should I work as a {role}",
    "top {role} employers",
    "good companies hiring {role}",
    "who is hiring {role} right now",
  ],
  // Discovery — industry
  "best {industry} companies to work for in {geography}": [
    "good {industry} companies to work for in {geography}",
    "top {industry} employers in {geography}",
    "who is hiring in {industry} in {geography}",
  ],
  "best {industry} startups to work for": [
    "top {industry} startups hiring now",
    "fast growing {industry} companies to join",
  ],
  // Consideration
  "what is it like to work at {company}": [
    "tell me about working at {company}",
    "{company} employee experience",
    "should I work at {company}",
    "what do people think of {company} as an employer",
  ],
  "is {company} a good company to work for": [
    "would you recommend working at {company}",
    "{company} pros and cons as an employer",
    "is {company} worth working at",
  ],
  "working at {company} pros and cons": [
    "honest review of working at {company}",
    "{company} good and bad as an employer",
    "what are the downsides of working at {company}",
  ],
  // Evaluation — competitor comparison
  "{company} vs {competitor} for {role}": [
    "should I choose {company} or {competitor} for a {role} role",
    "which is better for {role} {company} or {competitor}",
    "{company} or {competitor} which pays more for {role}",
  ],
  "should I work at {company} or {competitor}": [
    "{company} or {competitor} which is better",
    "comparing {company} and {competitor} as employers",
    "{company} vs {competitor} where should I go",
  ],
  // Commitment
  "{company} {role} interview process": [
    "what to expect interviewing at {company} for {role}",
    "how hard is it to get hired at {company} as a {role}",
    "{company} {role} interview tips",
  ],
  "how to get hired at {company} as a {role}": [
    "tips for landing a {role} job at {company}",
    "what does {company} look for in a {role}",
    "{company} {role} application advice",
  ],
};

function expandTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function isTemplateApplicable(t: QueryTemplate, family: JobFamily): boolean {
  if (!t.applicableTo || t.applicableTo.length === 0) return true;
  // "general" family means unclassified — only include unrestricted templates.
  if (family === "general") return false;
  return t.applicableTo.includes(family);
}

function isScaleApplicable(t: QueryTemplate, revenueScale?: RevenueScaleLevel): boolean {
  if (!t.requiresScale || t.requiresScale.length === 0) return true;
  if (!revenueScale) return false;
  return t.requiresScale.includes(revenueScale);
}

function generateRawQueries(input: QueryGenerationInput): GeneratedQuery[] {
  const family = classifyJobFamily(input.roleTitle);

  // The {context} variable uses businessContext (first sentence only) when
  // available, falling back to industry. Templates referencing {context} are
  // filtered out when the expanded text still contains the literal "{context}".
  const contextValue = input.businessContext
    ? input.businessContext.split(".")[0]
    : (input.industry ?? "");

  const vars: Record<string, string> = {
    company: input.companyName,
    role: input.roleTitle,
    geography: input.geography ?? "",
    industry: input.industry ?? "technology",
    context: contextValue,
  };

  const queries: GeneratedQuery[] = TEMPLATES
    // Skip templates that are geography-specific when no geography provided
    .filter((t) => input.geography || !t.template.includes("{geography}"))
    // Skip context-dependent templates when no context is available
    .filter((t) => contextValue || !t.template.includes("{context}"))
    // Skip templates that don't apply to this job family
    .filter((t) => isTemplateApplicable(t, family))
    // Skip templates that require a revenue scale the client doesn't match
    .filter((t) => isScaleApplicable(t, input.revenueScale))
    .map((t) => ({
      text: expandTemplate(t.template, vars),
      intent: t.intent,
      theme: t.theme,
      stage: t.stage,
      specificity: t.specificity,
      priority: 0, // scored later
    }))
    // Guard: drop any query where {context} expansion left the placeholder behind
    .filter((q) => !q.text.includes("{context}"));

  // ── Niche Discovery templates ─────────────────────────────────────────────
  // Generated dynamically from the client's niche keywords. Each keyword
  // produces a small set of Discovery queries tagged specificity: "niche".
  const nicheKeywords = input.nicheKeywords ?? [];
  for (const keyword of nicheKeywords.slice(0, 3)) {
    const kw = keyword.toLowerCase();
    const role = input.roleTitle.toLowerCase();

    queries.push({
      text: `best ${kw} companies to work for`,
      intent: "Niche employer discovery",
      theme: "reputation",
      stage: "DISCOVERY",
      specificity: "niche",
      priority: 0,
    });
    queries.push({
      text: `best companies for ${kw} ${role}`,
      intent: "Niche role discovery",
      theme: "reputation",
      stage: "DISCOVERY",
      specificity: "niche",
      priority: 0,
    });
    queries.push({
      text: `top ${kw} employers hiring ${role}`,
      intent: "Niche active hiring discovery",
      theme: "reputation",
      stage: "DISCOVERY",
      specificity: "niche",
      priority: 0,
    });
    queries.push({
      text: `best ${kw} companies for career growth`,
      intent: "Niche career growth discovery",
      theme: "culture",
      stage: "DISCOVERY",
      specificity: "niche",
      priority: 0,
    });
    queries.push({
      text: `highest paying ${kw} companies`,
      intent: "Niche compensation discovery",
      theme: "compensation",
      stage: "DISCOVERY",
      specificity: "niche",
      priority: 0,
    });
    queries.push({
      text: `${kw} companies with best culture`,
      intent: "Niche culture discovery",
      theme: "culture",
      stage: "DISCOVERY",
      specificity: "niche",
      priority: 0,
    });

    // Hyper-specific: niche + geography
    if (input.geography) {
      queries.push({
        text: `best ${kw} companies to work for in ${input.geography}`,
        intent: "Hyper-specific employer discovery",
        theme: "reputation",
        stage: "DISCOVERY",
        specificity: "hyper_specific",
        priority: 0,
      });
      queries.push({
        text: `top ${kw} ${role} jobs in ${input.geography}`,
        intent: "Hyper-specific role discovery",
        theme: "reputation",
        stage: "DISCOVERY",
        specificity: "hyper_specific",
        priority: 0,
      });
    }
  }

  // ── Enterprise "known for" queries ───────────────────────────────────────
  // When the company has a knownFor description and is enterprise-scale, generate
  // queries that test whether AI recognizes the company beyond its core business
  // (e.g. "Is Home Depot a good tech employer?" when they're known for retail).
  if (input.knownFor && input.revenueScale && ["enterprise", "fortune500"].includes(input.revenueScale)) {
    const kf = input.knownFor.toLowerCase();
    const company = input.companyName;
    const role = input.roleTitle;

    queries.push({
      text: `is ${company} a good employer for ${role} beyond ${kf}`,
      intent: "Cross-domain employer perception",
      theme: "reputation",
      stage: "CONSIDERATION",
      priority: 0,
    });
    queries.push({
      text: `${company} ${role} opportunities outside of ${kf}`,
      intent: "Non-core role awareness test",
      theme: "role_expectations",
      stage: "CONSIDERATION",
      priority: 0,
    });
    queries.push({
      text: `does ${company} invest in technology and ${role} talent`,
      intent: "Technology investment perception for known brands",
      theme: "reputation",
      stage: "CONSIDERATION",
      priority: 0,
    });
  }

  // Add competitor comparison queries
  for (const competitor of input.competitors) {
    for (const t of COMPETITOR_TEMPLATES.filter((t) =>
      isTemplateApplicable(t, family),
    )) {
      queries.push({
        text: expandTemplate(t.template, { ...vars, competitor }),
        intent: `${t.intent} — vs ${competitor}`,
        theme: t.theme,
        stage: t.stage,
        priority: 0,
      });
    }
  }

  // ── Role variant expansion ──────────────────────────────────────────────
  // For each role variant, run the CONSIDERATION/EVALUATION/COMMITMENT subset
  // of templates (those referencing {role}) using the variant title in place of
  // the primary role. This expands coverage across related titles in the same
  // job family without repeating Discovery or company-agnostic queries.
  if (input.roleVariants && input.roleVariants.length > 0) {
    const variantTemplates = TEMPLATES.filter(
      (t) =>
        t.template.includes("{role}") &&
        (t.stage === "CONSIDERATION" ||
          t.stage === "EVALUATION" ||
          t.stage === "COMMITMENT"),
    );

    for (const variant of input.roleVariants) {
      const variantVars = { ...vars, role: variant };
      for (const t of variantTemplates) {
        if (!isTemplateApplicable(t, family)) continue;
        if (!isScaleApplicable(t, input.revenueScale)) continue;
        if (!input.geography && t.template.includes("{geography}")) continue;
        queries.push({
          text: expandTemplate(t.template, variantVars),
          intent: `${t.intent} (${variant})`,
          theme: t.theme,
          stage: t.stage,
          // Specificity is only meaningful on Discovery queries; leave unset.
          priority: 0,
        });
      }

      // Also run competitor templates for each role variant
      for (const competitor of input.competitors) {
        for (const t of COMPETITOR_TEMPLATES.filter(
          (t) => t.template.includes("{role}") && isTemplateApplicable(t, family),
        )) {
          queries.push({
            text: expandTemplate(t.template, { ...variantVars, competitor }),
            intent: `${t.intent} — vs ${competitor} (${variant})`,
            theme: t.theme,
            stage: t.stage,
            priority: 0,
          });
        }
      }
    }
  }

  // ── Phrasing variant expansion ─────────────────────────────────────────
  // For queries whose source template matches a key in PHRASING_VARIANTS,
  // generate the alternative phrasings. We match against the primary vars only
  // (not role variant vars) to avoid combinatorial explosion.
  const variantQueries: GeneratedQuery[] = [];
  for (const q of queries) {
    for (const [pattern, variants] of Object.entries(PHRASING_VARIANTS)) {
      const expandedPattern = expandTemplate(pattern, vars);
      if (q.text.toLowerCase() !== expandedPattern.toLowerCase()) continue;

      for (const variant of variants) {
        const expandedVariant = expandTemplate(variant, vars);
        variantQueries.push({
          text: expandedVariant,
          intent: `${q.intent} (phrasing variant)`,
          theme: q.theme,
          stage: q.stage,
          // Specificity is forwarded so Discovery phrasing variants are tagged.
          specificity: q.specificity,
          priority: 0,
        });
      }
      // A query can only match one pattern key — stop checking once matched.
      break;
    }
  }
  queries.push(...variantQueries);

  return queries;
}

// ─── Discovery specificity coverage check ────────────────────

const DISCOVERY_SPECIFICITY_MINIMUM = 5;

/**
 * Logs a warning when a specificity level has fewer queries than the minimum.
 * Does not block generation — this is advisory only.
 */
function checkDiscoveryCoverage(queries: GeneratedQuery[]): void {
  const discoveryQueries = queries.filter((q) => q.stage === "DISCOVERY");
  const byLevel = new Map<SpecificityLevel, number>();

  for (const q of discoveryQueries) {
    if (q.specificity) {
      byLevel.set(q.specificity, (byLevel.get(q.specificity) ?? 0) + 1);
    }
  }

  const levels: SpecificityLevel[] = ["broad", "industry"];
  for (const level of levels) {
    const count = byLevel.get(level) ?? 0;
    if (count < DISCOVERY_SPECIFICITY_MINIMUM) {
      console.warn(
        `[query-intelligence] Discovery coverage warning: "${level}" has only ${count} queries (minimum ${DISCOVERY_SPECIFICITY_MINIMUM})`,
      );
    }
  }
}

// ─── Deduplication ──────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function wordSet(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Jaccard thresholds per dedup mode.
const JACCARD_THRESHOLD: Record<DedupMode, number> = {
  conservative: 0.7,
  standard: 0.6,
  aggressive: 0.5,
};

// Stop words stripped during structural comparison in Pass 3 aggressive mode.
const STRUCTURAL_STOP_WORDS = new Set([
  "the", "a", "an", "is", "it", "at", "to", "for", "of", "in", "and",
  "or", "how", "what", "like", "are", "be", "do", "on", "with", "as",
  "by", "from", "that", "this", "was", "will", "if", "about",
]);

/**
 * Normalize a query's text for exact-match dedup (Pass 1).
 * Lowercases and collapses whitespace; strips punctuation.
 */
function normalizeExact(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

/**
 * Strip company name, stop words, and question words from a query text,
 * then return the sorted remaining tokens. Used for structural comparison
 * in Pass 3 aggressive mode.
 */
function structuralTokens(text: string, companyName: string): string {
  const lower = normalizeExact(text);
  const companyLower = companyName.toLowerCase();
  // Remove company name tokens
  const withoutCompany = lower.replace(new RegExp(companyLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
  const tokens = withoutCompany
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STRUCTURAL_STOP_WORDS.has(t));
  tokens.sort();
  return tokens.join(" ");
}

/**
 * Deduplicate a list of queries using a configurable multi-pass pipeline.
 *
 * Pass 1 (exact):   Collapses queries with identical normalized text. O(1) via Set.
 * Pass 2 (Jaccard): Collapses queries with word-set similarity above the mode threshold.
 *                   Cross-specificity pairs are protected. Tagged queries survive over untagged.
 * Pass 3 (intent):  Within each (stage, theme) group, collapses queries sharing the same
 *                   intent tag. Higher-priority query survives; if equal, first-in wins.
 *                   Also runs structural comparison in aggressive mode.
 *
 * When `skipDedup` is true, pass all passes (callers should skip the call entirely).
 * The `mode` parameter defaults to `aggressive` — callers that want conservative
 * behavior should pass `"conservative"` explicitly.
 *
 * The generic constraint accepts optional `stage`, `theme`, `intent`, and `priority`
 * fields. When these are absent, Pass 3 is skipped for that query.
 */
export function deduplicateQueries<
  T extends {
    text: string;
    specificity?: string;
    stage?: string;
    theme?: string;
    intent?: string;
    priority?: number;
  },
>(queries: T[], mode: DedupMode = "aggressive"): DedupResult<T> {
  const surviving: T[] = [];
  const removed: Array<{ query: T; reason: string; duplicateOf: T }> = [];

  // ── Pass 1: Exact normalized match ──────────────────────────────────────
  // O(1) per query via Set lookup. Collapses trivially identical queries
  // before the O(n^2) Jaccard pass.
  //
  // Cross-specificity protection applies here too: two queries with the same
  // normalized text but different specificity levels are intentionally distinct
  // (e.g. a "broad" Discovery query vs an "industry" Discovery query that happen
  // to share the same template text). The key includes the specificity tag so
  // they are never collapsed at this pass.
  const exactSeen = new Map<string, T>();

  for (const candidate of queries) {
    const textKey = normalizeExact(candidate.text);
    const key = candidate.specificity ? `${textKey}|${candidate.specificity}` : textKey;
    const existing = exactSeen.get(key);
    if (existing !== undefined) {
      removed.push({ query: candidate, reason: "exact_match", duplicateOf: existing });
    } else {
      exactSeen.set(key, candidate);
      surviving.push(candidate);
    }
  }

  if (mode === "conservative") {
    return { surviving, removed };
  }

  // ── Pass 2: Jaccard similarity ───────────────────────────────────────────
  // O(n^2) pairwise comparison on word sets. Cross-specificity pairs and
  // cross-intent pairs are protected. Tagged queries survive over untagged.
  //
  // Intent-tag protection: two queries that both carry non-empty intent tags
  // that differ are intentionally distinct — the operator assigned those
  // intents to signal different value. Jaccard must not collapse them.
  // (Company-anchored queries inflate Jaccard by sharing boilerplate tokens,
  // e.g. two Evaluation queries mentioning the same company + competitor share
  // 6+ tokens even when serving completely different research purposes.)
  const threshold = JACCARD_THRESHOLD[mode];
  const pass2Surviving: T[] = [];
  const seenEntries: { words: Set<string>; resultIndex: number }[] = [];

  for (const candidate of surviving) {
    const words = wordSet(candidate.text);
    let matched = false;

    for (const entry of seenEntries) {
      if (jaccardSimilarity(words, entry.words) < threshold) continue;

      const existing = pass2Surviving[entry.resultIndex]!;

      // Cross-specificity protection: intentionally distinct boundary queries
      // must never be collapsed (e.g. broad vs industry Discovery queries).
      if (
        existing.specificity &&
        candidate.specificity &&
        existing.specificity !== candidate.specificity
      ) {
        continue;
      }

      // Intent-tag protection: two queries with different non-empty intent tags
      // are intentionally distinct and must not be collapsed by lexical overlap.
      if (existing.intent && candidate.intent && existing.intent !== candidate.intent) {
        continue;
      }

      matched = true;

      // Tag preference: a tagged query survives over an untagged one.
      if (!existing.specificity && candidate.specificity) {
        removed.push({ query: existing, reason: "jaccard_similarity", duplicateOf: candidate });
        pass2Surviving[entry.resultIndex] = candidate;
        entry.words = words;
      } else {
        removed.push({ query: candidate, reason: "jaccard_similarity", duplicateOf: existing });
      }
      break;
    }

    if (!matched) {
      seenEntries.push({ words, resultIndex: pass2Surviving.length });
      pass2Surviving.push(candidate);
    }
  }

  if (mode === "standard") {
    return { surviving: pass2Surviving, removed };
  }

  // ── Pass 3: Intent-level dedup (aggressive only) ─────────────────────────
  // Groups surviving queries by (stage, theme). Within each group, collapses
  // queries sharing the same intent tag. When intent tags match, the query
  // with the higher priority score survives (first-in wins on ties).
  //
  // For queries without stage/theme/intent fields, this pass is a no-op for
  // that query — it passes through unchanged.
  //
  // In aggressive mode, structural comparison (strip company + stop words,
  // compare sorted remaining tokens) is also applied within each group.

  // Build groups keyed by "stage|theme" for queries that carry both fields.
  type GroupEntry = { query: T; intentKey: string; structKey?: string };
  const groups = new Map<string, GroupEntry[]>();
  const noGroupQueries: T[] = [];

  for (const q of pass2Surviving) {
    if (q.stage && q.theme) {
      const groupKey = `${q.stage}|${q.theme}`;
      const entry: GroupEntry = { query: q, intentKey: q.intent ?? "" };
      const group = groups.get(groupKey) ?? [];
      group.push(entry);
      groups.set(groupKey, group);
    } else {
      noGroupQueries.push(q);
    }
  }

  const pass3Surviving: T[] = [...noGroupQueries];

  for (const entries of groups.values()) {
    // Within each group, find intent duplicates.
    // We process in order; when a duplicate is found, keep the higher-priority one.
    const groupResult: GroupEntry[] = [];

    for (const entry of entries) {
      // Skip empty intent keys — queries without intent don't participate in Pass 3.
      if (!entry.intentKey) {
        groupResult.push(entry);
        continue;
      }

      let matchedEntry: GroupEntry | undefined;

      // Intent tag match: exact string match on non-empty intent.
      matchedEntry = groupResult.find(
        (e) => e.intentKey && e.intentKey === entry.intentKey,
      );

      // Structural match (aggressive mode only): same structural tokens within group.
      if (!matchedEntry && mode === "aggressive") {
        // Determine the company name from the query's text context.
        // We don't have direct access to the input here, so we derive it
        // by comparing structural tokens of all queries in the group.
        // This is intentionally lightweight — we just strip stop words.
        const entryTokens = entry.query.text
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .split(/\s+/)
          .filter((t) => !STRUCTURAL_STOP_WORDS.has(t))
          .sort()
          .join(" ");

        matchedEntry = groupResult.find((e) => {
          if (!e.intentKey) return false;
          const eTokens = e.query.text
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .split(/\s+/)
            .filter((t) => !STRUCTURAL_STOP_WORDS.has(t))
            .sort()
            .join(" ");
          return entryTokens === eTokens && entryTokens.length > 0;
        });
      }

      if (matchedEntry) {
        const existingPriority = matchedEntry.query.priority ?? 0;
        const candidatePriority = entry.query.priority ?? 0;

        if (candidatePriority > existingPriority) {
          // New query has higher priority — replace the existing one.
          removed.push({
            query: matchedEntry.query,
            reason: "intent_duplicate",
            duplicateOf: entry.query,
          });
          const idx = groupResult.indexOf(matchedEntry);
          groupResult[idx] = { ...entry };
        } else {
          // Existing query wins — remove the candidate.
          removed.push({
            query: entry.query,
            reason: "intent_duplicate",
            duplicateOf: matchedEntry.query,
          });
        }
      } else {
        groupResult.push(entry);
      }
    }

    for (const e of groupResult) {
      pass3Surviving.push(e.query);
    }
  }

  return { surviving: pass3Surviving, removed };
}

// ─── Clustering ─────────────────────────────────────────────

const THEME_KEYWORDS: Record<QueryTheme, string[]> = {
  reputation: [
    "reputation",
    "reviews",
    "rating",
    "top companies",
    "best companies",
    "glassdoor",
    "good company",
    "best ",
    "employer",
  ],
  compensation: [
    "salary",
    "pay",
    "compensation",
    "benefits",
    "equity",
    "stock",
    "perks",
    "bonus",
    "paying",
  ],
  hiring_process: [
    "interview",
    "hiring",
    "apply",
    "application",
    "onboarding",
    "hired",
    "process",
    "timeline",
  ],
  role_expectations: [
    "responsibilities",
    "tech stack",
    "day in",
    "team structure",
    "what does",
    "engineering blog",
    "work on",
  ],
  culture: [
    "work life",
    "remote",
    "flexible",
    "diversity",
    "inclusion",
    "balance",
    "career growth",
    "culture",
  ],
  competitor_comparison: [
    " vs ",
    "versus",
    "compared",
    "should i work",
    "alternative",
    "better than",
    "pros and cons",
  ],
};

/** Re-classify a query's theme using keyword matching. */
export function classifyTheme(queryText: string): QueryTheme {
  const lower = queryText.toLowerCase();
  let bestTheme: QueryTheme = "reputation";
  let bestScore = 0;

  for (const theme of QUERY_THEMES) {
    const score = THEME_KEYWORDS[theme].filter((kw) =>
      lower.includes(kw),
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestTheme = theme;
    }
  }

  return bestTheme;
}

// ─── Priority scoring ───────────────────────────────────────

function scoreQuery(
  query: GeneratedQuery,
  input: QueryGenerationInput,
): number {
  const config = THEME_CONFIG[query.theme];
  let score = config.basePriority;

  // Stage weighting — earned visibility queries are the highest-value signals.
  // Discovery/Evaluation stages reveal whether a company appears unprompted;
  // Consideration/Commitment are already company-anchored and add less signal.
  const stageWeight: Record<DecisionStage, number> = {
    DISCOVERY: 2,     // Highest value: are you on the unprompted list?
    EVALUATION: 2,    // High value: do you win head-to-head comparisons?
    COMMITMENT: 1,    // Moderate: action-stage, company already named
    CONSIDERATION: 0, // Lowest: prompted queries, company always present
  };
  score += stageWeight[query.stage] ?? 0;

  // Role relevance bonus — applies to all stages.
  const lower = query.text.toLowerCase();
  if (lower.includes(input.roleTitle.toLowerCase())) score += 1;

  // NOTE: No company name bonus. Adding +1 for company presence systematically
  // inflates Consideration/Commitment scores (those queries always contain the
  // company name) and inverts the earned-visibility value signal.

  return Math.min(10, Math.max(1, score));
}

// ─── Orchestrator ───────────────────────────────────────────

export function generateQueryIntelligence(
  input: QueryGenerationInput,
): QueryIntelligenceResult {
  // 1. Generate raw queries from templates and tag all as source: "template".
  const raw = generateRawQueries(input);
  for (const q of raw) {
    q.source = "template";
  }
  const totalGenerated = raw.length;

  // 2. Stage assignment.
  //    Template-assigned stages are authoritative and already set on every
  //    query produced by generateRawQueries(). This loop is a safety net for
  //    any future path that constructs GeneratedQuery objects without going
  //    through the template expansion (e.g. runtime injection). The heuristic
  //    classifier is intentionally NOT applied to template-generated queries
  //    to prevent broad keyword patterns from overriding explicit annotations.
  //
  //    Theme re-classification is similarly omitted here: all templates carry
  //    an explicit theme, and the exported classifyTheme() remains available
  //    for callers that need to classify arbitrary query text on demand.
  //
  //    NOTE: Stage assignment runs BEFORE dedup so that the intent-level pass
  //    (Pass 3) has accurate stage information for all queries, including any
  //    runtime-injected queries that bypass template expansion.
  //
  //    NOTE: Since GeneratedQuery.stage and .theme are required (non-optional)
  //    TypeScript fields, this loop can only trigger in practice if someone
  //    constructs a query object with a falsy stage value (e.g. empty string).
  for (const q of raw) {
    if (!q.stage) {
      q.stage = classifyQueryStage(
        q.text,
        input.companyName,
        input.competitors,
      );
    }
  }

  // 3. Deduplicate (skip for automated scans where volume is not a constraint).
  //    Runs after stage assignment so Pass 3 (intent-level) has stage data.
  //    Uses dedupMode from input, defaulting to "aggressive".
  let surviving: GeneratedQuery[];
  let dedupResult: DedupResult<GeneratedQuery> | null = null;

  if (input.skipDedup) {
    surviving = raw;
  } else {
    dedupResult = deduplicateQueries(raw, input.dedupMode ?? "aggressive");
    surviving = dedupResult.surviving;
  }

  const totalAfterDedup = surviving.length;

  // 4. Advisory coverage check — logs if any specificity level is thin
  checkDiscoveryCoverage(surviving);

  // 5. Score
  for (const q of surviving) {
    q.priority = scoreQuery(q, input);
  }

  // 6. Group into clusters
  const clusterMap = new Map<QueryTheme, GeneratedQuery[]>();
  for (const q of surviving) {
    const list = clusterMap.get(q.theme) ?? [];
    list.push(q);
    clusterMap.set(q.theme, list);
  }

  // 7. Build result clusters, sorted by base priority descending
  const clusters: GeneratedCluster[] = [];
  for (const theme of QUERY_THEMES) {
    const queries = clusterMap.get(theme);
    if (!queries || queries.length === 0) continue;

    const config = THEME_CONFIG[theme];
    // Sort queries within cluster by priority descending
    queries.sort((a, b) => b.priority - a.priority);

    clusters.push({
      theme,
      name: config.name,
      intent: config.intent,
      queries,
    });
  }

  clusters.sort(
    (a, b) =>
      THEME_CONFIG[b.theme].basePriority -
      THEME_CONFIG[a.theme].basePriority,
  );

  const result: QueryIntelligenceResult = { clusters, totalGenerated, totalAfterDedup };

  // Populate removedQueries when the caller opts in and dedup ran.
  if (input.includeRemovedQueries && dedupResult) {
    result.removedQueries = dedupResult.removed.map((r) => ({
      text: r.query.text,
      reason: r.reason,
      duplicateOfText: r.duplicateOf.text,
    }));
  }

  return result;
}

export { THEME_CONFIG };
