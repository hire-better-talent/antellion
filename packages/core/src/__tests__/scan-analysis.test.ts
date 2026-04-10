import { describe, it, expect } from "vitest";
import { analyzeResponse, parseCitedDomains, parseCitations } from "../scan-analysis";
import type { AnalysisInput } from "../scan-analysis";

const BASE_INPUT: AnalysisInput = {
  response:
    "Meridian Technologies is a well-known enterprise software company based in Austin. " +
    "They offer competitive compensation for Senior Backend Engineers and are considered a " +
    "leading employer in supply chain tech. Apex Cloud Systems is also a strong competitor " +
    "in this space, though NovaBridge Analytics is less well-known for backend roles.",
  clientName: "Meridian Technologies",
  clientDomain: "meridiantech.com",
  competitors: [
    { name: "Apex Cloud Systems", domain: "apexcloudsystems.com" },
    { name: "NovaBridge Analytics", domain: "novabridge.io" },
  ],
  rawCitedDomains: "glassdoor.com\nlinkedin.com/company/meridian\nmeridiantech.com/careers",
};

describe("analyzeResponse", () => {
  it("detects client mention by name", () => {
    const result = analyzeResponse(BASE_INPUT);
    expect(result.clientMentioned).toBe(true);
  });

  it("detects client mention by domain", () => {
    const result = analyzeResponse({
      ...BASE_INPUT,
      response: "Check out meridiantech.com for career opportunities.",
    });
    expect(result.clientMentioned).toBe(true);
  });

  it("returns false when client not mentioned", () => {
    const result = analyzeResponse({
      ...BASE_INPUT,
      response: "There are many enterprise software companies in Austin.",
    });
    expect(result.clientMentioned).toBe(false);
  });

  it("detects competitor mentions", () => {
    const result = analyzeResponse(BASE_INPUT);
    expect(result.competitorMentions).toHaveLength(2);

    const apex = result.competitorMentions.find(
      (c) => c.name === "Apex Cloud Systems",
    );
    expect(apex?.mentioned).toBe(true);

    const nova = result.competitorMentions.find(
      (c) => c.name === "NovaBridge Analytics",
    );
    expect(nova?.mentioned).toBe(true);
  });

  it("handles competitor not mentioned", () => {
    const result = analyzeResponse({
      ...BASE_INPUT,
      response: "Meridian Technologies is a great company.",
    });

    for (const comp of result.competitorMentions) {
      expect(comp.mentioned).toBe(false);
    }
  });

  it("detects competitor by domain", () => {
    const result = analyzeResponse({
      ...BASE_INPUT,
      response: "Visit apexcloudsystems.com and meridiantech.com to compare.",
    });

    const apex = result.competitorMentions.find(
      (c) => c.name === "Apex Cloud Systems",
    );
    expect(apex?.mentioned).toBe(true);
  });

  it("scores visibility > 0 when client is mentioned", () => {
    const result = analyzeResponse(BASE_INPUT);
    expect(result.visibilityScore).toBeGreaterThan(0);
    expect(result.visibilityScore).toBeLessThanOrEqual(100);
  });

  it("scores visibility 0 when client not mentioned", () => {
    const result = analyzeResponse({
      ...BASE_INPUT,
      response: "There are many companies in Austin.",
    });
    expect(result.visibilityScore).toBe(0);
  });

  it("gives higher visibility for early mentions", () => {
    const earlyMention = analyzeResponse({
      ...BASE_INPUT,
      response:
        "Meridian Technologies leads the industry. " +
        "They are well-known for engineering excellence. ".repeat(10),
    });

    const lateMention = analyzeResponse({
      ...BASE_INPUT,
      response:
        "There are many companies. ".repeat(20) +
        "Meridian Technologies is also in this space.",
    });

    expect(earlyMention.visibilityScore).toBeGreaterThan(
      lateMention.visibilityScore,
    );
  });

  it("produces sentiment between -1 and 1", () => {
    const result = analyzeResponse(BASE_INPUT);
    expect(result.sentimentScore).toBeGreaterThanOrEqual(-1);
    expect(result.sentimentScore).toBeLessThanOrEqual(1);
  });

  it("gives positive sentiment for positive responses", () => {
    const result = analyzeResponse({
      ...BASE_INPUT,
      response:
        "Meridian Technologies is an excellent, innovative, leading company " +
        "with strong engineering and competitive compensation.",
    });
    expect(result.sentimentScore).toBeGreaterThan(0);
  });

  it("gives negative sentiment for negative responses", () => {
    const result = analyzeResponse({
      ...BASE_INPUT,
      response:
        "Meridian Technologies is struggling with poor reputation, " +
        "weak engineering culture, and declining employee satisfaction.",
    });
    expect(result.sentimentScore).toBeLessThan(0);
  });

  it("parses cited domains", () => {
    const result = analyzeResponse(BASE_INPUT);
    expect(result.citedDomains).toContain("glassdoor.com");
    expect(result.citedDomains).toContain("linkedin.com");
    expect(result.citedDomains).toContain("meridiantech.com");
  });

  it("handles empty competitors list", () => {
    const result = analyzeResponse({
      ...BASE_INPUT,
      competitors: [],
    });
    expect(result.competitorMentions).toHaveLength(0);
  });

  it("handles empty cited domains", () => {
    const result = analyzeResponse({
      ...BASE_INPUT,
      rawCitedDomains: "",
    });
    expect(result.citedDomains).toHaveLength(0);
  });

  it("does not count 'Hilton' as mentioned when only 'Hilton Grand Vacations' appears", () => {
    const result = analyzeResponse({
      response:
        "Hilton Grand Vacations is a leading vacation ownership company. " +
        "They offer competitive sales compensation and have a strong presence in Orlando.",
      clientName: "Hilton Grand Vacations",
      clientDomain: "hiltongrandvacations.com",
      competitors: [
        { name: "Hilton", domain: "hilton.com" },
        { name: "Marriott Vacations", domain: "marriottvacations.com" },
      ],
      rawCitedDomains: "",
    });
    expect(result.clientMentioned).toBe(true);
    // "Hilton" should NOT be counted — every "Hilton" in the text is part of "Hilton Grand Vacations"
    const hilton = result.competitorMentions.find((c) => c.name === "Hilton");
    expect(hilton?.mentioned).toBe(false);
  });

  it("counts 'Hilton' as mentioned when it appears independently of 'Hilton Grand Vacations'", () => {
    const result = analyzeResponse({
      response:
        "Hilton Grand Vacations is a vacation ownership company. " +
        "Hilton, the parent hotel company, also hires sales professionals. " +
        "Marriott Vacations competes in the same space.",
      clientName: "Hilton Grand Vacations",
      clientDomain: "hiltongrandvacations.com",
      competitors: [
        { name: "Hilton", domain: "hilton.com" },
        { name: "Marriott Vacations", domain: "marriottvacations.com" },
      ],
      rawCitedDomains: "",
    });
    expect(result.clientMentioned).toBe(true);
    // "Hilton" appears independently ("Hilton, the parent hotel company") so it SHOULD be counted
    const hilton = result.competitorMentions.find((c) => c.name === "Hilton");
    expect(hilton?.mentioned).toBe(true);
    const marriott = result.competitorMentions.find((c) => c.name === "Marriott Vacations");
    expect(marriott?.mentioned).toBe(true);
  });

  it("handles overlapping competitor names correctly", () => {
    const result = analyzeResponse({
      response:
        "Marriott Vacations Worldwide is the largest vacation ownership company. " +
        "Marriott also has a strong hotel brand that candidates may consider.",
      clientName: "Hilton Grand Vacations",
      clientDomain: "hiltongrandvacations.com",
      competitors: [
        { name: "Marriott", domain: "marriott.com" },
        { name: "Marriott Vacations", domain: "marriottvacations.com" },
        { name: "Marriott Vacations Worldwide", domain: "mvwc.com" },
      ],
      rawCitedDomains: "",
    });
    // "Marriott Vacations Worldwide" mentioned — but should not count as "Marriott" or "Marriott Vacations"
    const mvw = result.competitorMentions.find((c) => c.name === "Marriott Vacations Worldwide");
    expect(mvw?.mentioned).toBe(true);
    // "Marriott" appears independently ("Marriott also has a strong hotel brand")
    const marriott = result.competitorMentions.find((c) => c.name === "Marriott");
    expect(marriott?.mentioned).toBe(true);
    // "Marriott Vacations" (without "Worldwide") does NOT appear independently
    const mv = result.competitorMentions.find((c) => c.name === "Marriott Vacations");
    expect(mv?.mentioned).toBe(false);
  });
});

describe("parseCitedDomains", () => {
  it("parses newline-separated domains", () => {
    const result = parseCitedDomains("glassdoor.com\nlinkedin.com");
    expect(result).toEqual(["glassdoor.com", "linkedin.com"]);
  });

  it("parses comma-separated domains", () => {
    const result = parseCitedDomains("glassdoor.com, indeed.com");
    expect(result).toEqual(["glassdoor.com", "indeed.com"]);
  });

  it("strips protocols and paths from URLs", () => {
    const result = parseCitedDomains(
      "https://glassdoor.com/reviews\nhttps://www.linkedin.com/company/acme",
    );
    expect(result).toEqual(["glassdoor.com", "linkedin.com"]);
  });

  it("deduplicates domains", () => {
    const result = parseCitedDomains(
      "glassdoor.com\nhttps://glassdoor.com/reviews",
    );
    expect(result).toEqual(["glassdoor.com"]);
  });

  it("filters invalid entries", () => {
    const result = parseCitedDomains("glassdoor.com\nnot-a-domain\n\n  ");
    expect(result).toEqual(["glassdoor.com"]);
  });

  it("returns empty for blank input", () => {
    expect(parseCitedDomains("")).toEqual([]);
    expect(parseCitedDomains("   ")).toEqual([]);
  });
});

describe("parseCitations", () => {
  it("parses ChatGPT-style bracketed citations with title", () => {
    const input = `[1]: https://www.glassdoor.com/Reviews/ServiceTitan-Reviews-E12345.html "ServiceTitan Reviews"`;
    const result = parseCitations(input);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://www.glassdoor.com/Reviews/ServiceTitan-Reviews-E12345.html");
    expect(result[0].domain).toBe("glassdoor.com");
    expect(result[0].title).toBe("ServiceTitan Reviews");
  });

  it("parses ChatGPT-style citations without title", () => {
    const input = `[2]: https://www.levels.fyi/companies/servicetitan/salaries`;
    const result = parseCitations(input);
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe("levels.fyi");
    expect(result[0].title).toBeNull();
  });

  it("parses multiple ChatGPT-style citations", () => {
    const input = [
      `[1]: https://www.opentoworkremote.com/view/1431577?utm_source=chatgpt.com "Principal Software Engineer at Invisible Technologies"`,
      `[2]: https://www.glassdoor.com/Reviews/ServiceTitan-Reviews-E12345.html "ServiceTitan Reviews"`,
      `[3]: https://www.levels.fyi/companies/servicetitan/salaries "ServiceTitan Salaries"`,
    ].join("\n");
    const result = parseCitations(input);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.domain)).toEqual([
      "opentoworkremote.com",
      "glassdoor.com",
      "levels.fyi",
    ]);
  });

  it("parses plain URLs", () => {
    const input = "https://www.glassdoor.com/Reviews/Acme-Reviews.html";
    const result = parseCitations(input);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://www.glassdoor.com/Reviews/Acme-Reviews.html");
    expect(result[0].domain).toBe("glassdoor.com");
    expect(result[0].title).toBeNull();
  });

  it("parses bare domains", () => {
    const input = "glassdoor.com\nindeed.com";
    const result = parseCitations(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ url: "https://glassdoor.com", domain: "glassdoor.com", title: null });
    expect(result[1]).toEqual({ url: "https://indeed.com", domain: "indeed.com", title: null });
  });

  it("handles comma-separated bare domains", () => {
    const result = parseCitations("glassdoor.com, indeed.com, linkedin.com");
    expect(result.map((c) => c.domain)).toEqual(["glassdoor.com", "indeed.com", "linkedin.com"]);
  });

  it("deduplicates by domain, keeping first occurrence", () => {
    const input = [
      `[1]: https://glassdoor.com/reviews "Glassdoor Reviews"`,
      "glassdoor.com",
    ].join("\n");
    const result = parseCitations(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Glassdoor Reviews");
    expect(result[0].url).toBe("https://glassdoor.com/reviews");
  });

  it("deduplicates www vs non-www as same domain", () => {
    const input = "https://www.glassdoor.com/reviews\nhttps://glassdoor.com/jobs";
    const result = parseCitations(input);
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe("glassdoor.com");
  });

  it("handles mixed input formats", () => {
    const input = [
      `[1]: https://glassdoor.com/reviews "Glassdoor"`,
      "https://linkedin.com/company/acme",
      "indeed.com",
    ].join("\n");
    const result = parseCitations(input);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.domain)).toEqual(["glassdoor.com", "linkedin.com", "indeed.com"]);
  });

  it("filters entries with no valid domain", () => {
    const result = parseCitations("not-a-domain\n\n  \nglassdoor.com");
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe("glassdoor.com");
  });

  it("returns empty array for blank input", () => {
    expect(parseCitations("")).toEqual([]);
    expect(parseCitations("   ")).toEqual([]);
  });

  it("parseCitedDomains still works as before (backward compat)", () => {
    const result = parseCitedDomains("glassdoor.com\nhttps://www.linkedin.com/company/acme");
    expect(result).toEqual(["glassdoor.com", "linkedin.com"]);
  });

  it("parseCitedDomains handles ChatGPT format via parseCitations", () => {
    const input = `[1]: https://glassdoor.com/reviews "Glassdoor"\n[2]: https://indeed.com "Indeed"`;
    const result = parseCitedDomains(input);
    expect(result).toEqual(["glassdoor.com", "indeed.com"]);
  });
});
