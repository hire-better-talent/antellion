import { describe, it, expect } from "vitest";
import {
  classifySource,
  sourceTypeLabel,
  controlLevelColor,
  PLATFORM_REGISTRY_ENTRIES,
} from "../citation-taxonomy";
import type { SourceClassification } from "../citation-taxonomy";

describe("classifySource", () => {
  it("classifies glassdoor.com as review_site, CONSIDERATION, medium", () => {
    const result = classifySource("glassdoor.com");
    expect(result.sourceType).toBe("review_site");
    expect(result.primaryStage).toBe("CONSIDERATION");
    expect(result.controlLevel).toBe("medium");
    expect(result.platformName).toBe("Glassdoor");
  });

  it("classifies levels.fyi as salary_database, EVALUATION, medium", () => {
    const result = classifySource("levels.fyi");
    expect(result.sourceType).toBe("salary_database");
    expect(result.primaryStage).toBe("EVALUATION");
    expect(result.controlLevel).toBe("medium");
    expect(result.platformName).toBe("Levels.fyi");
  });

  it("classifies linkedin.com as professional_network, DISCOVERY, high", () => {
    const result = classifySource("linkedin.com");
    expect(result.sourceType).toBe("professional_network");
    expect(result.primaryStage).toBe("DISCOVERY");
    expect(result.controlLevel).toBe("high");
    expect(result.platformName).toBe("LinkedIn");
  });

  it("classifies blind.app as anonymous_forum, EVALUATION, low", () => {
    const result = classifySource("blind.app");
    expect(result.sourceType).toBe("anonymous_forum");
    expect(result.primaryStage).toBe("EVALUATION");
    expect(result.controlLevel).toBe("low");
    expect(result.platformName).toBe("Blind");
  });

  it("classifies teamblind.com as anonymous_forum, EVALUATION, low", () => {
    const result = classifySource("teamblind.com");
    expect(result.sourceType).toBe("anonymous_forum");
    expect(result.primaryStage).toBe("EVALUATION");
    expect(result.controlLevel).toBe("low");
  });

  it("normalises www. prefix before lookup", () => {
    const result = classifySource("www.glassdoor.com");
    expect(result.sourceType).toBe("review_site");
    expect(result.domain).toBe("glassdoor.com");
  });

  it("normalises to lowercase before lookup", () => {
    const result = classifySource("LINKEDIN.COM");
    expect(result.sourceType).toBe("professional_network");
    expect(result.domain).toBe("linkedin.com");
  });

  it("classifies unknown domains using keyword heuristics", () => {
    const career = classifySource("careersitexyz.com");
    expect(career.sourceType).toBe("job_board");

    const review = classifySource("reviewplatform.com");
    expect(review.sourceType).toBe("review_site");

    const salary = classifySource("salaryinfo.com");
    expect(salary.sourceType).toBe("salary_database");

    const news = classifySource("dailynews.com");
    expect(news.sourceType).toBe("news_publication");
  });

  it("falls back to 'other' for completely unknown domains", () => {
    const result = classifySource("xyzunknown123.com");
    expect(result.sourceType).toBe("other");
    expect(result.primaryStage).toBe("DISCOVERY");
    expect(result.controlLevel).toBe("low");
  });

  it("every registered platform has a non-empty controlRationale", () => {
    for (const [domain, entry] of Object.entries(PLATFORM_REGISTRY_ENTRIES)) {
      expect(entry.controlRationale.length).toBeGreaterThan(0);
      // The rationale should be a complete sentence (start with capital, end with content)
      expect(entry.controlRationale[0]).toMatch(/[A-Z]/);
    }
  });

  it("every registered platform has a non-empty description", () => {
    for (const [domain, entry] of Object.entries(PLATFORM_REGISTRY_ENTRIES)) {
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it("every registered platform has a valid sourceType", () => {
    const validTypes = new Set([
      "review_site",
      "salary_database",
      "job_board",
      "employer_listing",
      "professional_network",
      "anonymous_forum",
      "tech_blog",
      "news_publication",
      "company_owned",
      "other",
    ]);
    for (const entry of Object.values(PLATFORM_REGISTRY_ENTRIES)) {
      expect(validTypes.has(entry.sourceType)).toBe(true);
    }
  });

  it("every registered platform has a valid primaryStage", () => {
    const validStages = new Set(["DISCOVERY", "CONSIDERATION", "EVALUATION", "COMMITMENT"]);
    for (const entry of Object.values(PLATFORM_REGISTRY_ENTRIES)) {
      expect(validStages.has(entry.primaryStage)).toBe(true);
    }
  });

  it("every registered platform has a valid controlLevel", () => {
    const validLevels = new Set(["high", "medium", "low"]);
    for (const entry of Object.values(PLATFORM_REGISTRY_ENTRIES)) {
      expect(validLevels.has(entry.controlLevel)).toBe(true);
    }
  });

  it("covers at least 25 platforms", () => {
    expect(Object.keys(PLATFORM_REGISTRY_ENTRIES).length).toBeGreaterThanOrEqual(25);
  });

  it("heuristic classification always returns non-empty controlRationale", () => {
    const testDomains = [
      "careersitexyz.com",
      "reviewplatform.com",
      "salaryinfo.com",
      "dailynews.com",
      "techblog.io",
      "xyzunknown123.com",
      "communityforumsite.org",
    ];
    for (const d of testDomains) {
      const result = classifySource(d);
      expect(result.controlRationale.length).toBeGreaterThan(0);
    }
  });
});

describe("sourceTypeLabel", () => {
  it("returns human-readable labels for all source types", () => {
    expect(sourceTypeLabel("review_site")).toBe("Employee review site");
    expect(sourceTypeLabel("salary_database")).toBe("Compensation data platform");
    expect(sourceTypeLabel("anonymous_forum")).toBe("Anonymous employee forum");
    expect(sourceTypeLabel("other")).toBe("Other source");
  });
});

describe("controlLevelColor", () => {
  it("returns correct colors for each level", () => {
    const high = controlLevelColor("high");
    expect(high.label).toBe("High Control");
    expect(high.bg).toContain("green");

    const medium = controlLevelColor("medium");
    expect(medium.label).toBe("Medium Control");
    expect(medium.bg).toContain("amber");

    const low = controlLevelColor("low");
    expect(low.label).toBe("Low Control");
    expect(low.bg).toContain("red");
  });
});
