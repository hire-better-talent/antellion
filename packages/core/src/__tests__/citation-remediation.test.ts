import { describe, it, expect } from "vitest";
import { getRemediation, REMEDIATION_PLAYBOOKS } from "../citation-remediation";
import { PLATFORM_REGISTRY_ENTRIES } from "../citation-taxonomy";

describe("getRemediation", () => {
  it("returns platform-specific playbook for glassdoor.com", () => {
    const result = getRemediation("glassdoor.com");
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    expect(result.whyItMatters.length).toBeGreaterThan(0);
    expect(result.expectedOutcome.length).toBeGreaterThan(0);
    // Check step structure
    for (const step of result.steps) {
      expect(step.action.length).toBeGreaterThan(0);
      expect(step.owner.length).toBeGreaterThan(0);
      expect(step.effort.length).toBeGreaterThan(0);
      expect(step.timeframe.length).toBeGreaterThan(0);
    }
  });

  it("returns platform-specific playbook for levels.fyi", () => {
    const result = getRemediation("levels.fyi");
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    expect(result.whyItMatters).toContain("compensation");
  });

  it("returns platform-specific playbook for linkedin.com", () => {
    const result = getRemediation("linkedin.com");
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    // LinkedIn has 4 steps
    expect(result.steps.length).toBe(4);
  });

  it("returns platform-specific playbook for blind.app", () => {
    const result = getRemediation("blind.app");
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    expect(result.whyItMatters).toContain("Blind");
  });

  it("normalises www. prefix", () => {
    const result = getRemediation("www.glassdoor.com");
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("normalises to lowercase", () => {
    const result = getRemediation("GLASSDOOR.COM");
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to source-type playbook for unknown domains", () => {
    const result = getRemediation("unknownplatform123.com");
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    expect(result.whyItMatters.length).toBeGreaterThan(0);
    expect(result.expectedOutcome.length).toBeGreaterThan(0);
  });

  it("falls back to source-type playbook for unknown review site", () => {
    const result = getRemediation("employeereviewsite.com");
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    // Should get the review_site fallback
    expect(result.whyItMatters).toContain("Review");
  });

  it("every platform-specific playbook has 2+ steps", () => {
    for (const [domain, playbook] of Object.entries(REMEDIATION_PLAYBOOKS)) {
      expect(playbook.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("every platform-specific step has owner, effort, and timeframe", () => {
    for (const [domain, playbook] of Object.entries(REMEDIATION_PLAYBOOKS)) {
      for (const step of playbook.steps) {
        expect(step.action.length).toBeGreaterThan(0);
        expect(step.owner.length).toBeGreaterThan(0);
        expect(step.effort.length).toBeGreaterThan(0);
        expect(step.timeframe.length).toBeGreaterThan(0);
      }
    }
  });

  it("every platform-specific playbook has non-empty whyItMatters and expectedOutcome", () => {
    for (const playbook of Object.values(REMEDIATION_PLAYBOOKS)) {
      expect(playbook.whyItMatters.length).toBeGreaterThan(0);
      expect(playbook.expectedOutcome.length).toBeGreaterThan(0);
    }
  });

  it("covers at least 15 platforms with specific playbooks", () => {
    expect(Object.keys(REMEDIATION_PLAYBOOKS).length).toBeGreaterThanOrEqual(15);
  });
});
