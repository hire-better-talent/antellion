import { describe, it, expect } from "vitest";
import {
  deriveCompanySlug,
  deriveStandardAssets,
  STANDARD_ASSET_TEMPLATES,
} from "../content-assets";

// ─── deriveCompanySlug ───────────────────────────────────────

describe("deriveCompanySlug", () => {
  it("lowercases a single-word name", () => {
    expect(deriveCompanySlug("ServiceTitan")).toBe("servicetitan");
  });

  it("replaces spaces with hyphens in a multi-word name", () => {
    expect(deriveCompanySlug("Apex Cloud Systems")).toBe("apex-cloud-systems");
  });

  it("strips non-alphanumeric characters (punctuation)", () => {
    expect(deriveCompanySlug("Acme, Inc.")).toBe("acme-inc");
  });

  it("collapses consecutive spaces into a single hyphen", () => {
    expect(deriveCompanySlug("Acme  Corp")).toBe("acme-corp");
  });

  it("collapses consecutive hyphens from special chars", () => {
    // "A--B" after stripping non-alphanumeric leaves "a--b" → "a-b"
    expect(deriveCompanySlug("A & B")).toBe("a-b");
  });

  it("trims leading and trailing hyphens", () => {
    // Name that starts/ends with a special char
    expect(deriveCompanySlug("-Stripe-")).toBe("stripe");
  });

  it("handles a name with mixed punctuation and spaces", () => {
    expect(deriveCompanySlug("Block, Inc. (formerly Square)")).toBe(
      "block-inc-formerly-square",
    );
  });

  it("handles all-lowercase input unchanged", () => {
    expect(deriveCompanySlug("stripe")).toBe("stripe");
  });
});

// ─── deriveStandardAssets ────────────────────────────────────

describe("deriveStandardAssets", () => {
  const assets = deriveStandardAssets("ServiceTitan", "servicetitan.com");

  it("returns exactly 6 assets", () => {
    expect(assets).toHaveLength(6);
  });

  it("uses the domain for the careers page URL", () => {
    const careers = assets.find((a) => a.assetType === "CAREERS_PAGE");
    expect(careers?.url).toBe("https://servicetitan.com/careers");
  });

  it("uses the slug for the Glassdoor URL", () => {
    const glassdoor = assets.find((a) => a.title === "Glassdoor");
    expect(glassdoor?.url).toBe(
      "https://www.glassdoor.com/Overview/-servicetitan",
    );
  });

  it("uses the slug for the LinkedIn URL", () => {
    const linkedin = assets.find((a) => a.assetType === "SOCIAL_PROFILE");
    expect(linkedin?.url).toBe(
      "https://www.linkedin.com/company/servicetitan",
    );
  });

  it("uses the slug for the Levels.fyi URL", () => {
    const levels = assets.find((a) => a.title === "Levels.fyi");
    expect(levels?.url).toBe("https://www.levels.fyi/companies/servicetitan");
  });

  it("uses the slug for the Built In URL", () => {
    const builtin = assets.find((a) => a.title === "Built In");
    expect(builtin?.url).toBe("https://builtin.com/company/servicetitan");
  });

  it("uses the slug for the Indeed URL", () => {
    const indeed = assets.find((a) => a.title === "Indeed");
    expect(indeed?.url).toBe("https://www.indeed.com/cmp/servicetitan");
  });

  it("assigns correct asset types to all 6 assets", () => {
    const typeMap = Object.fromEntries(assets.map((a) => [a.title, a.assetType]));
    expect(typeMap["Careers"]).toBe("CAREERS_PAGE");
    expect(typeMap["Glassdoor"]).toBe("REVIEW_SITE");
    expect(typeMap["LinkedIn"]).toBe("SOCIAL_PROFILE");
    expect(typeMap["Levels.fyi"]).toBe("REVIEW_SITE");
    expect(typeMap["Built In"]).toBe("REVIEW_SITE");
    expect(typeMap["Indeed"]).toBe("REVIEW_SITE");
  });

  it("derives slug from a multi-word name", () => {
    const multiWord = deriveStandardAssets("Apex Cloud Systems", "apexcloud.com");
    const careers = multiWord.find((a) => a.assetType === "CAREERS_PAGE");
    const linkedin = multiWord.find((a) => a.assetType === "SOCIAL_PROFILE");
    expect(careers?.url).toBe("https://apexcloud.com/careers");
    expect(linkedin?.url).toBe(
      "https://www.linkedin.com/company/apex-cloud-systems",
    );
  });

  it("strips special characters from the slug used in URLs", () => {
    const special = deriveStandardAssets("Acme, Inc.", "acme.com");
    const glassdoor = special.find((a) => a.title === "Glassdoor");
    expect(glassdoor?.url).toBe(
      "https://www.glassdoor.com/Overview/-acme-inc",
    );
  });
});

// ─── STANDARD_ASSET_TEMPLATES ────────────────────────────────

describe("STANDARD_ASSET_TEMPLATES", () => {
  it("defines exactly 6 templates", () => {
    expect(STANDARD_ASSET_TEMPLATES).toHaveLength(6);
  });

  it("each template has label, assetType, and urlTemplate", () => {
    for (const t of STANDARD_ASSET_TEMPLATES) {
      expect(t.label).toBeTruthy();
      expect(t.assetType).toBeTruthy();
      expect(t.urlTemplate).toMatch(/https?:\/\//);
    }
  });
});
