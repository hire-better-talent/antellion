import type { ContentAssetType } from "./schemas";

// ─── Slug derivation ─────────────────────────────────────────

/**
 * Derives a URL-safe slug from a company name.
 * Lowercases the input, collapses whitespace to hyphens, strips any
 * character that is not alphanumeric or a hyphen, and removes
 * leading/trailing hyphens.
 *
 * Examples:
 *   "ServiceTitan"       → "servicetitan"
 *   "Apex Cloud Systems" → "apex-cloud-systems"
 *   "Acme, Inc."         → "acme-inc"
 *   "A--B  C"            → "a-b-c"
 */
export function deriveCompanySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")           // collapse whitespace → hyphens
    .replace(/[^a-z0-9-]/g, "")     // strip non-alphanumeric (keeps hyphens)
    .replace(/-{2,}/g, "-")         // collapse consecutive hyphens
    .replace(/^-+|-+$/g, "");       // trim leading/trailing hyphens
}

// ─── Standard asset templates ────────────────────────────────

export interface StandardAssetTemplate {
  label: string;
  assetType: ContentAssetType;
  /** `{domain}` and `{slug}` are interpolated at derivation time. */
  urlTemplate: string;
}

export const STANDARD_ASSET_TEMPLATES: StandardAssetTemplate[] = [
  {
    label: "Careers",
    assetType: "CAREERS_PAGE",
    urlTemplate: "https://{domain}/careers",
  },
  {
    label: "Glassdoor",
    assetType: "REVIEW_SITE",
    urlTemplate: "https://www.glassdoor.com/Overview/-{slug}",
  },
  {
    label: "LinkedIn",
    assetType: "SOCIAL_PROFILE",
    urlTemplate: "https://www.linkedin.com/company/{slug}",
  },
  {
    label: "Levels.fyi",
    assetType: "REVIEW_SITE",
    urlTemplate: "https://www.levels.fyi/companies/{slug}",
  },
  {
    label: "Built In",
    assetType: "REVIEW_SITE",
    urlTemplate: "https://builtin.com/company/{slug}",
  },
  {
    label: "Indeed",
    assetType: "REVIEW_SITE",
    urlTemplate: "https://www.indeed.com/cmp/{slug}",
  },
];

// ─── Derived asset objects ────────────────────────────────────

export interface StandardAsset {
  title: string;
  url: string;
  assetType: ContentAssetType;
}

/**
 * Returns the 6 standard content assets for a client, with URLs
 * interpolated from the provided domain and company name.
 *
 * @param companyName  The client's display name (e.g. "Apex Cloud Systems")
 * @param domain       The client's domain as entered (e.g. "apexcloud.com")
 */
export function deriveStandardAssets(
  companyName: string,
  domain: string,
): StandardAsset[] {
  const slug = deriveCompanySlug(companyName);

  return STANDARD_ASSET_TEMPLATES.map((template) => ({
    title: template.label,
    assetType: template.assetType,
    url: template.urlTemplate
      .replace("{domain}", domain)
      .replace("{slug}", slug),
  }));
}
