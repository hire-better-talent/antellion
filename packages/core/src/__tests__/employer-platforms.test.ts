import { describe, it, expect } from "vitest";
import {
  isEmployerRelevantDomain,
  EMPLOYER_RELEVANT_PLATFORMS,
} from "../employer-platforms";

describe("isEmployerRelevantDomain", () => {
  it("returns true for known employer platforms", () => {
    expect(isEmployerRelevantDomain("glassdoor.com")).toBe(true);
    expect(isEmployerRelevantDomain("levels.fyi")).toBe(true);
    expect(isEmployerRelevantDomain("linkedin.com")).toBe(true);
    expect(isEmployerRelevantDomain("builtin.com")).toBe(true);
    expect(isEmployerRelevantDomain("teamblind.com")).toBe(true);
    expect(isEmployerRelevantDomain("comparably.com")).toBe(true);
    expect(isEmployerRelevantDomain("wellfound.com")).toBe(true);
    expect(isEmployerRelevantDomain("indeed.com")).toBe(true);
  });

  it("returns false for financial and general news sites", () => {
    expect(isEmployerRelevantDomain("barrons.com")).toBe(false);
    expect(isEmployerRelevantDomain("forbes.com")).toBe(false);
    expect(isEmployerRelevantDomain("bloomberg.com")).toBe(false);
    expect(isEmployerRelevantDomain("techcrunch.com")).toBe(false);
    expect(isEmployerRelevantDomain("businessinsider.com")).toBe(false);
  });

  it("returns false for community sites that are not employer research platforms", () => {
    expect(isEmployerRelevantDomain("reddit.com")).toBe(false);
    expect(isEmployerRelevantDomain("quora.com")).toBe(false);
    expect(isEmployerRelevantDomain("twitter.com")).toBe(false);
  });

  it("normalises www. prefix before testing", () => {
    expect(isEmployerRelevantDomain("www.glassdoor.com")).toBe(true);
    expect(isEmployerRelevantDomain("www.forbes.com")).toBe(false);
    expect(isEmployerRelevantDomain("WWW.GLASSDOOR.COM")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isEmployerRelevantDomain("Glassdoor.COM")).toBe(true);
    expect(isEmployerRelevantDomain("LEVELS.FYI")).toBe(true);
  });

  it("returns false for unknown domains", () => {
    expect(isEmployerRelevantDomain("example.com")).toBe(false);
    expect(isEmployerRelevantDomain("")).toBe(false);
  });

  it("EMPLOYER_RELEVANT_PLATFORMS contains at least the core platforms", () => {
    const required = [
      "glassdoor.com",
      "indeed.com",
      "linkedin.com",
      "levels.fyi",
      "builtin.com",
      "comparably.com",
    ];
    for (const platform of required) {
      expect(EMPLOYER_RELEVANT_PLATFORMS.has(platform)).toBe(true);
    }
  });
});
