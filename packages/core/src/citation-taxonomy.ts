/**
 * Citation Taxonomy
 *
 * Enriched classification for every platform domain that AI models cite
 * when answering employer-related candidate queries. Replaces the flat
 * KNOWN_SOURCE_TYPES / classifySourceType() approach with structured
 * metadata including control level, primary decision stage, and
 * defensible rationale text.
 *
 * The taxonomy covers 25+ platforms. Unknown domains fall back to a
 * keyword-based heuristic that returns a well-formed SourceClassification
 * with sourceType "other" and controlLevel "low".
 */

import type { DecisionStage } from "./decision-journey/types";

// ─── Types ──────────────────────────────────────────────────

export type SourceType =
  | "review_site"
  | "salary_database"
  | "job_board"
  | "employer_listing"
  | "professional_network"
  | "anonymous_forum"
  | "tech_blog"
  | "news_publication"
  | "company_owned"
  | "other";

export type ControlLevel = "high" | "medium" | "low";

export interface SourceClassification {
  domain: string;
  sourceType: SourceType;
  primaryStage: DecisionStage;
  controlLevel: ControlLevel;
  /** Displayed to client — must be defensible */
  controlRationale: string;
  platformName: string;
  description: string;
}

// ─── Platform registry ──────────────────────────────────────

interface PlatformEntry {
  sourceType: SourceType;
  primaryStage: DecisionStage;
  controlLevel: ControlLevel;
  controlRationale: string;
  platformName: string;
  description: string;
}

const PLATFORM_REGISTRY: Record<string, PlatformEntry> = {
  // ── Review sites ────────────────────────────────────────────
  "glassdoor.com": {
    sourceType: "review_site",
    primaryStage: "CONSIDERATION",
    controlLevel: "medium",
    controlRationale:
      "Company can claim employer profile and respond to reviews but cannot control or remove user-generated review content",
    platformName: "Glassdoor",
    description: "Employee reviews, salary data, and interview experiences",
  },
  "indeed.com": {
    sourceType: "review_site",
    primaryStage: "CONSIDERATION",
    controlLevel: "medium",
    controlRationale:
      "Company can claim employer profile and post jobs but cannot control employee review content",
    platformName: "Indeed",
    description: "Job board with employer reviews and salary information",
  },
  "comparably.com": {
    sourceType: "review_site",
    primaryStage: "DISCOVERY",
    controlLevel: "medium",
    controlRationale:
      "Company can complete employer profile and participate in awards but cannot control employee ratings or reviews",
    platformName: "Comparably",
    description: "Employee review and culture comparison platform with employer awards",
  },
  "kununu.com": {
    sourceType: "review_site",
    primaryStage: "CONSIDERATION",
    controlLevel: "medium",
    controlRationale:
      "Company can claim employer profile and respond to reviews but cannot edit user-generated ratings",
    platformName: "kununu",
    description: "Employer review platform popular in DACH markets",
  },
  "fairygodboss.com": {
    sourceType: "review_site",
    primaryStage: "CONSIDERATION",
    controlLevel: "medium",
    controlRationale:
      "Company can sponsor content and create employer profile but cannot control community reviews focused on women's workplace experience",
    platformName: "Fairygodboss",
    description: "Women-focused career community with employer reviews",
  },
  "inhersight.com": {
    sourceType: "review_site",
    primaryStage: "CONSIDERATION",
    controlLevel: "medium",
    controlRationale:
      "Company can claim profile but review scores are aggregated from anonymous employee ratings",
    platformName: "InHerSight",
    description: "Employer ratings focused on women's workplace satisfaction metrics",
  },

  // ── Salary databases ────────────────────────────────────────
  "levels.fyi": {
    sourceType: "salary_database",
    primaryStage: "EVALUATION",
    controlLevel: "medium",
    controlRationale:
      "Company cannot directly edit salary entries but can verify data and submit official compensation ranges",
    platformName: "Levels.fyi",
    description: "Verified compensation data including base, equity, and bonus breakdowns",
  },
  "payscale.com": {
    sourceType: "salary_database",
    primaryStage: "EVALUATION",
    controlLevel: "medium",
    controlRationale:
      "Company can participate in salary surveys and verify data but cannot control individual salary reports",
    platformName: "PayScale",
    description: "Compensation research and salary comparison platform",
  },
  "salary.com": {
    sourceType: "salary_database",
    primaryStage: "EVALUATION",
    controlLevel: "low",
    controlRationale:
      "Salary data is aggregated from third-party sources; company has no direct mechanism to update listings",
    platformName: "Salary.com",
    description: "Salary research and compensation benchmarking data",
  },
  "paysa.com": {
    sourceType: "salary_database",
    primaryStage: "EVALUATION",
    controlLevel: "low",
    controlRationale:
      "Compensation data is aggregated algorithmically; company has no direct editorial control",
    platformName: "Paysa",
    description: "AI-driven compensation data and career analytics",
  },

  // ── Professional network ────────────────────────────────────
  "linkedin.com": {
    sourceType: "professional_network",
    primaryStage: "DISCOVERY",
    controlLevel: "high",
    controlRationale:
      "Company directly publishes and controls company page content, job postings, and employer brand campaigns",
    platformName: "LinkedIn",
    description: "Professional networking platform with company pages and job listings",
  },

  // ── Employer listings and directories ───────────────────────
  "builtin.com": {
    sourceType: "employer_listing",
    primaryStage: "DISCOVERY",
    controlLevel: "high",
    controlRationale:
      "Company directly publishes and controls employer profile content, tech stack details, and culture information",
    platformName: "Built In",
    description: "Tech employer directory with company profiles and job listings",
  },
  "wellfound.com": {
    sourceType: "employer_listing",
    primaryStage: "DISCOVERY",
    controlLevel: "high",
    controlRationale:
      "Company directly publishes and controls startup profile, funding information, and job postings",
    platformName: "Wellfound",
    description: "Startup job platform (formerly AngelList Talent)",
  },
  "angel.co": {
    sourceType: "employer_listing",
    primaryStage: "DISCOVERY",
    controlLevel: "high",
    controlRationale:
      "Company directly publishes and controls startup profile and investment details",
    platformName: "AngelList",
    description: "Startup ecosystem platform with company profiles",
  },
  "dice.com": {
    sourceType: "job_board",
    primaryStage: "CONSIDERATION",
    controlLevel: "high",
    controlRationale:
      "Company directly publishes and controls job postings and employer profile content",
    platformName: "Dice",
    description: "Technology-focused job board",
  },
  "ziprecruiter.com": {
    sourceType: "job_board",
    primaryStage: "CONSIDERATION",
    controlLevel: "high",
    controlRationale:
      "Company directly publishes and controls job postings and employer profile",
    platformName: "ZipRecruiter",
    description: "Job distribution platform with employer profiles",
  },

  // ── Anonymous forums ────────────────────────────────────────
  "blind.app": {
    sourceType: "anonymous_forum",
    primaryStage: "EVALUATION",
    controlLevel: "low",
    controlRationale:
      "Anonymous discussions; company has no editorial control over user posts or sentiment",
    platformName: "Blind",
    description: "Anonymous professional network for workplace discussions",
  },
  "teamblind.com": {
    sourceType: "anonymous_forum",
    primaryStage: "EVALUATION",
    controlLevel: "low",
    controlRationale:
      "Anonymous discussions; company has no editorial control over user posts or sentiment",
    platformName: "Blind",
    description: "Anonymous professional network for workplace discussions",
  },
  "fishbowlapp.com": {
    sourceType: "anonymous_forum",
    primaryStage: "EVALUATION",
    controlLevel: "low",
    controlRationale:
      "Semi-anonymous industry discussions; company has no editorial control over community conversations",
    platformName: "Fishbowl",
    description: "Semi-anonymous professional discussion forum by industry",
  },
  "reddit.com": {
    sourceType: "anonymous_forum",
    primaryStage: "EVALUATION",
    controlLevel: "low",
    controlRationale:
      "Anonymous discussions; company has no editorial control over community posts or comments",
    platformName: "Reddit",
    description: "Community forum with employer-related subreddits",
  },

  // ── Tech blogs and communities ──────────────────────────────
  "medium.com": {
    sourceType: "tech_blog",
    primaryStage: "DISCOVERY",
    controlLevel: "high",
    controlRationale:
      "Company directly publishes and controls its own blog posts and engineering content",
    platformName: "Medium",
    description: "Blog platform for engineering and culture content",
  },
  "github.com": {
    sourceType: "tech_blog",
    primaryStage: "EVALUATION",
    controlLevel: "high",
    controlRationale:
      "Company directly publishes and controls its open-source repositories and organization profile",
    platformName: "GitHub",
    description: "Code hosting platform signaling technical credibility",
  },
  "stackoverflow.com": {
    sourceType: "tech_blog",
    primaryStage: "EVALUATION",
    controlLevel: "medium",
    controlRationale:
      "Employees can participate and build company visibility but the platform controls content moderation and ranking",
    platformName: "Stack Overflow",
    description: "Developer Q&A community signaling technical expertise",
  },

  // ── News and press ──────────────────────────────────────────
  "techcrunch.com": {
    sourceType: "news_publication",
    primaryStage: "DISCOVERY",
    controlLevel: "low",
    controlRationale:
      "Editorial content controlled by journalists; company can pitch stories but cannot control coverage",
    platformName: "TechCrunch",
    description: "Technology news publication",
  },
  "forbes.com": {
    sourceType: "news_publication",
    primaryStage: "DISCOVERY",
    controlLevel: "low",
    controlRationale:
      "Editorial content controlled by journalists and contributors; company cannot control published articles",
    platformName: "Forbes",
    description: "Business press covering employer brand stories and workplace rankings",
  },
  "bloomberg.com": {
    sourceType: "news_publication",
    primaryStage: "DISCOVERY",
    controlLevel: "low",
    controlRationale:
      "Editorial content controlled by journalists; company has no direct influence over published reporting",
    platformName: "Bloomberg",
    description: "Business and financial press",
  },

  // ── Company intelligence ────────────────────────────────────
  "crunchbase.com": {
    sourceType: "employer_listing",
    primaryStage: "EVALUATION",
    controlLevel: "medium",
    controlRationale:
      "Company can claim and update its profile but funding and employee data are aggregated from third-party sources",
    platformName: "Crunchbase",
    description: "Company intelligence platform with funding and growth data",
  },
  "vault.com": {
    sourceType: "employer_listing",
    primaryStage: "CONSIDERATION",
    controlLevel: "low",
    controlRationale:
      "Rankings and reviews are editorially controlled; company cannot directly modify survey-based ratings",
    platformName: "Vault",
    description: "Career intelligence with employer rankings and reviews",
  },

  // ── Interview and career prep ───────────────────────────────
  "leetcode.com": {
    sourceType: "tech_blog",
    primaryStage: "COMMITMENT",
    controlLevel: "low",
    controlRationale:
      "User-generated interview question discussions; company has no editorial control over community content",
    platformName: "LeetCode",
    description: "Interview preparation platform with company-tagged question discussions",
  },
  "interviewquery.com": {
    sourceType: "tech_blog",
    primaryStage: "COMMITMENT",
    controlLevel: "low",
    controlRationale:
      "User-generated interview experience content; company has no editorial control over reported experiences",
    platformName: "Interview Query",
    description: "Data science and analytics interview preparation platform",
  },
};

// ─── Heuristic fallback ─────────────────────────────────────

function heuristicClassification(domain: string): SourceClassification {
  const lower = domain.toLowerCase();

  if (lower.includes("career") || lower.includes("jobs") || lower.includes("hiring")) {
    return {
      domain,
      sourceType: "job_board",
      primaryStage: "CONSIDERATION",
      controlLevel: "medium",
      controlRationale:
        "Job platforms typically allow employer profile management but user reviews are not directly controllable",
      platformName: domain,
      description: "Job or career platform",
    };
  }

  if (lower.includes("review") || lower.includes("rating")) {
    return {
      domain,
      sourceType: "review_site",
      primaryStage: "CONSIDERATION",
      controlLevel: "medium",
      controlRationale:
        "Review platforms typically allow employer responses but not editorial control over user-generated content",
      platformName: domain,
      description: "Review or rating platform",
    };
  }

  if (lower.includes("salary") || lower.includes("pay") || lower.includes("comp")) {
    return {
      domain,
      sourceType: "salary_database",
      primaryStage: "EVALUATION",
      controlLevel: "low",
      controlRationale:
        "Compensation data platforms aggregate salary information from multiple sources; direct editorial control is limited",
      platformName: domain,
      description: "Compensation data source",
    };
  }

  if (lower.includes("news") || lower.includes("press") || lower.includes("journal")) {
    return {
      domain,
      sourceType: "news_publication",
      primaryStage: "DISCOVERY",
      controlLevel: "low",
      controlRationale:
        "Editorial content controlled by journalists; company can pitch stories but cannot control coverage",
      platformName: domain,
      description: "News or press outlet",
    };
  }

  if (lower.includes("blog") || lower.includes("dev") || lower.includes("tech")) {
    return {
      domain,
      sourceType: "tech_blog",
      primaryStage: "DISCOVERY",
      controlLevel: "medium",
      controlRationale:
        "Technical content platforms allow publishing but platform controls distribution and discovery",
      platformName: domain,
      description: "Technical blog or community",
    };
  }

  if (lower.includes("forum") || lower.includes("discuss") || lower.includes("community")) {
    return {
      domain,
      sourceType: "anonymous_forum",
      primaryStage: "EVALUATION",
      controlLevel: "low",
      controlRationale:
        "Community discussion platforms are user-generated; company has no editorial control",
      platformName: domain,
      description: "Discussion forum or community",
    };
  }

  // Default fallback
  return {
    domain,
    sourceType: "other",
    primaryStage: "DISCOVERY",
    controlLevel: "low",
    controlRationale:
      "Source type could not be determined; assume limited editorial control until verified",
    platformName: domain,
    description: "Unclassified source",
  };
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Classify a domain into a structured SourceClassification.
 * Normalises the domain (lowercase, strip www.) before lookup.
 * Falls back to keyword heuristics for unknown domains.
 */
export function classifySource(domain: string): SourceClassification {
  const normalized = domain.toLowerCase().replace(/^www\./, "");

  const entry = PLATFORM_REGISTRY[normalized];
  if (entry) {
    return { domain: normalized, ...entry };
  }

  return heuristicClassification(normalized);
}

/**
 * Expose the full registry for iteration (e.g., listing all known platforms).
 */
export const PLATFORM_REGISTRY_ENTRIES = PLATFORM_REGISTRY;

/**
 * Returns the human-readable source type label for backward compatibility
 * with classifySourceType() callers.
 */
export function sourceTypeLabel(sourceType: SourceType): string {
  const labels: Record<SourceType, string> = {
    review_site: "Employee review site",
    salary_database: "Compensation data platform",
    job_board: "Job board",
    employer_listing: "Employer listing",
    professional_network: "Professional network",
    anonymous_forum: "Anonymous employee forum",
    tech_blog: "Technical community",
    news_publication: "Press/media",
    company_owned: "Company-owned content",
    other: "Other source",
  };
  return labels[sourceType];
}

/**
 * Returns the control level badge color class for UI rendering.
 */
export function controlLevelColor(level: ControlLevel): {
  bg: string;
  text: string;
  label: string;
} {
  switch (level) {
    case "high":
      return { bg: "bg-green-50", text: "text-green-700", label: "High Control" };
    case "medium":
      return { bg: "bg-amber-50", text: "text-amber-700", label: "Medium Control" };
    case "low":
      return { bg: "bg-red-50", text: "text-red-700", label: "Low Control" };
  }
}
