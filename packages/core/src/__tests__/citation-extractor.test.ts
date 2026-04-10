import { describe, it, expect } from "vitest";
import { extractCitationsFromResponse } from "../citation-extractor";

// ─── Empty / no-op cases ─────────────────────────────────────

describe("extractCitationsFromResponse — empty input", () => {
  it("returns empty array for empty string", () => {
    expect(extractCitationsFromResponse("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(extractCitationsFromResponse("   \n  ")).toEqual([]);
  });

  it("returns empty array when no URLs or platform names are present", () => {
    const text =
      "The candidate should have 5+ years of backend engineering experience " +
      "and familiarity with distributed systems design.";
    expect(extractCitationsFromResponse(text)).toEqual([]);
  });
});

// ─── Explicit URL extraction ─────────────────────────────────

describe("extractCitationsFromResponse — explicit URLs", () => {
  it("extracts a single https URL with high confidence", () => {
    const text =
      "According to reviews on https://www.glassdoor.com/Reviews/Acme-Reviews-E12345.html, " +
      "the company scores well.";
    const results = extractCitationsFromResponse(text);
    expect(results).toHaveLength(1);
    expect(results[0].domain).toBe("glassdoor.com");
    expect(results[0].url).toBe("https://www.glassdoor.com/Reviews/Acme-Reviews-E12345.html");
    expect(results[0].confidence).toBe("high");
  });

  it("extracts multiple URLs from a response", () => {
    const text = [
      "Sources:",
      "https://glassdoor.com/Reviews/Acme-E12345.html",
      "https://linkedin.com/company/acme",
      "https://levels.fyi/company/acme/salaries",
    ].join("\n");
    const results = extractCitationsFromResponse(text);
    const domains = results.map((r) => r.domain);
    expect(domains).toContain("glassdoor.com");
    expect(domains).toContain("linkedin.com");
    expect(domains).toContain("levels.fyi");
    expect(results.every((r) => r.confidence === "high")).toBe(true);
  });

  it("strips trailing punctuation from URLs", () => {
    const text = "See https://glassdoor.com/reviews, for details.";
    const results = extractCitationsFromResponse(text);
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://glassdoor.com/reviews");
  });

  it("strips www prefix when computing domain", () => {
    const text = "Visit https://www.indeed.com/jobs?q=engineer";
    const results = extractCitationsFromResponse(text);
    expect(results).toHaveLength(1);
    expect(results[0].domain).toBe("indeed.com");
  });

  it("preserves non-www subdomains", () => {
    const text = "See https://blog.techcrunch.com/2026/03/best-employers for context.";
    const results = extractCitationsFromResponse(text);
    expect(results).toHaveLength(1);
    expect(results[0].domain).toBe("blog.techcrunch.com");
  });

  it("all URL-based results have the full url field populated", () => {
    const text = "Check https://comparably.com/companies/acme/culture for culture data.";
    const results = extractCitationsFromResponse(text);
    expect(results[0].url).toMatch(/^https?:\/\//);
  });
});

// ─── Platform name mention extraction ────────────────────────

describe("extractCitationsFromResponse — platform name mentions", () => {
  it("detects Glassdoor mention in prose (medium confidence)", () => {
    const text =
      "According to Glassdoor reviews, Acme Corp scores a 3.8 out of 5 for " +
      "work-life balance.";
    const results = extractCitationsFromResponse(text);
    expect(results).toHaveLength(1);
    expect(results[0].domain).toBe("glassdoor.com");
    expect(results[0].confidence).toBe("medium");
    expect(results[0].url).toBeNull();
  });

  it("detects 'according to Levels.fyi' reference", () => {
    const text =
      "According to Levels.fyi, the average total compensation for a Staff " +
      "Engineer at Acme is $320k.";
    const results = extractCitationsFromResponse(text);
    const levelsFyi = results.find((r) => r.domain === "levels.fyi");
    expect(levelsFyi).toBeDefined();
    expect(levelsFyi?.confidence).toBe("medium");
  });

  it("detects LinkedIn mention", () => {
    const text = "The company's LinkedIn page shows 4,200 employees.";
    const results = extractCitationsFromResponse(text);
    const linkedin = results.find((r) => r.domain === "linkedin.com");
    expect(linkedin).toBeDefined();
    expect(linkedin?.confidence).toBe("medium");
  });

  it("detects Indeed mention", () => {
    const text = "Indeed ratings show an average of 3.5 stars for Acme Corp.";
    const results = extractCitationsFromResponse(text);
    const indeed = results.find((r) => r.domain === "indeed.com");
    expect(indeed).toBeDefined();
  });

  it("detects Blind (teamblind) mention", () => {
    const text = "On Blind, engineers at Acme report strong work-life balance.";
    const results = extractCitationsFromResponse(text);
    const blind = results.find((r) => r.domain === "blind.app");
    expect(blind).toBeDefined();
  });

  it("does not falsely fire on 'blind' inside other words", () => {
    const text =
      "The hiring process is not blindsided by excessive rounds — it is " +
      "straightforward and transparent.";
    const results = extractCitationsFromResponse(text);
    const blind = results.find((r) => r.domain === "blind.app");
    expect(blind).toBeUndefined();
  });

  it("returns medium confidence when platform name appears without a URL", () => {
    const text = "Data from Comparably shows Acme ranks in the top quartile for compensation.";
    const results = extractCitationsFromResponse(text);
    expect(results[0]?.confidence).toBe("medium");
  });
});

// ─── Context snippets ────────────────────────────────────────

describe("extractCitationsFromResponse — context snippets", () => {
  it("includes the platform reference in the context excerpt", () => {
    const text =
      "Several sources including Glassdoor and Indeed have rated Acme highly.";
    const results = extractCitationsFromResponse(text);
    const glassdoor = results.find((r) => r.domain === "glassdoor.com");
    expect(glassdoor?.context).toMatch(/glassdoor/i);
  });

  it("produces context approximately 60 chars long (±20 for edge cases)", () => {
    const padding = "The company ".repeat(10); // push the match well into the middle
    const text = `${padding}Glassdoor data shows strong scores${padding}`;
    const results = extractCitationsFromResponse(text);
    const glassdoor = results.find((r) => r.domain === "glassdoor.com");
    expect(glassdoor?.context.length).toBeGreaterThan(20);
    expect(glassdoor?.context.length).toBeLessThan(120);
  });

  it("context for a URL match includes surrounding text", () => {
    const text = "Per the full report at https://glassdoor.com/reviews, scores are up.";
    const results = extractCitationsFromResponse(text);
    expect(results[0].context).toContain("glassdoor");
  });
});

// ─── Deduplication ───────────────────────────────────────────

describe("extractCitationsFromResponse — deduplication", () => {
  it("deduplicates by domain, keeping the high-confidence version", () => {
    const text =
      "According to Glassdoor and specifically https://glassdoor.com/Reviews/Acme-E1.html, " +
      "the score is high.";
    const results = extractCitationsFromResponse(text);
    const glassdoorResults = results.filter((r) => r.domain === "glassdoor.com");
    expect(glassdoorResults).toHaveLength(1);
    expect(glassdoorResults[0].confidence).toBe("high");
    expect(glassdoorResults[0].url).toMatch(/^https/);
  });

  it("deduplicates www vs non-www as same domain", () => {
    const text =
      "https://www.linkedin.com/company/acme and also https://linkedin.com/jobs are relevant.";
    const results = extractCitationsFromResponse(text);
    const linkedinResults = results.filter((r) => r.domain === "linkedin.com");
    expect(linkedinResults).toHaveLength(1);
  });

  it("deduplicates aliases mapping to same domain (blind / teamblind)", () => {
    const text =
      "On Blind, engineers comment frequently. TeamBlind also shows similar sentiment.";
    const results = extractCitationsFromResponse(text);
    const blindResults = results.filter((r) => r.domain === "blind.app");
    expect(blindResults).toHaveLength(1);
  });
});

// ─── Sort order ──────────────────────────────────────────────

describe("extractCitationsFromResponse — sort order", () => {
  it("returns high confidence results before medium confidence results", () => {
    const text =
      "Glassdoor reviews are positive, and the full data is at " +
      "https://levels.fyi/company/acme/salaries for compensation.";
    const results = extractCitationsFromResponse(text);
    expect(results.length).toBeGreaterThanOrEqual(2);
    const firstHigh = results.findIndex((r) => r.confidence === "high");
    const firstMedium = results.findIndex((r) => r.confidence === "medium");
    expect(firstHigh).toBeLessThan(firstMedium);
  });

  it("returns all high confidence items grouped before any medium", () => {
    const text =
      "Sources include https://glassdoor.com/r and https://indeed.com/j — " +
      "LinkedIn and Comparably also mention Acme.";
    const results = extractCitationsFromResponse(text);
    let seenMedium = false;
    for (const r of results) {
      if (r.confidence === "medium") seenMedium = true;
      if (seenMedium) expect(r.confidence).toBe("medium");
    }
  });
});

// ─── Realistic AI response ────────────────────────────────────

describe("extractCitationsFromResponse — realistic AI response fixture", () => {
  const REALISTIC_RESPONSE = `
Acme Corp is a mid-market software company headquartered in Austin, TX. Based on
data from Glassdoor, the company receives an average rating of 3.7 out of 5 from
employees. According to Levels.fyi, total compensation for senior engineers ranges
from $180k–$240k, which is below median for the Austin market.

The company's LinkedIn presence shows 2,800 followers and 1,200 employees. Indeed
reviews are mixed, with candidates noting a lengthy interview process.

Sources:
[1]: https://www.glassdoor.com/Reviews/Acme-Corp-Reviews-E99999.html "Acme Corp Employee Reviews"
[2]: https://www.levels.fyi/companies/acme-corp/salaries "Acme Corp Salaries"
[3]: https://linkedin.com/company/acme-corp
  `.trim();

  it("extracts high-confidence entries from explicit URLs in a realistic response", () => {
    const results = extractCitationsFromResponse(REALISTIC_RESPONSE);
    const highConf = results.filter((r) => r.confidence === "high");
    const highDomains = highConf.map((r) => r.domain);
    expect(highDomains).toContain("glassdoor.com");
    expect(highDomains).toContain("levels.fyi");
    expect(highDomains).toContain("linkedin.com");
  });

  it("does not produce duplicate entries for domains found both as URL and prose mention", () => {
    const results = extractCitationsFromResponse(REALISTIC_RESPONSE);
    const domains = results.map((r) => r.domain);
    const unique = new Set(domains);
    expect(domains.length).toBe(unique.size);
  });

  it("prose-only mentions (Indeed) appear as medium confidence", () => {
    const results = extractCitationsFromResponse(REALISTIC_RESPONSE);
    const indeed = results.find((r) => r.domain === "indeed.com");
    // Indeed appears in prose only in this fixture
    expect(indeed).toBeDefined();
    expect(indeed?.confidence).toBe("medium");
  });
});
