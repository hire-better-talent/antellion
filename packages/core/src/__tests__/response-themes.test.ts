import { describe, it, expect } from "vitest";
import { extractResponseThemes } from "../response-themes";

describe("extractResponseThemes", () => {
  const clientName = "Home Depot";

  it("returns empty themes for empty responses", () => {
    const result = extractResponseThemes([], clientName);
    expect(result.positiveAttributes).toEqual([]);
    expect(result.negativeAttributes).toEqual([]);
    expect(result.unsolicitedCompetitors).toEqual([]);
    expect(result.industryFraming).toBe("not clearly categorized");
    expect(result.compensationDetail).toBe("absent");
    expect(result.cultureDetail).toBe("absent");
  });

  it("extracts positive attributes from responses", () => {
    const responses = [
      "Home Depot offers innovative technology solutions with great work-life balance and competitive salary packages.",
      "The company has a strong culture of career growth and is known for being mission-driven.",
    ];
    const result = extractResponseThemes(responses, clientName);
    expect(result.positiveAttributes).toContain("innovative");
    expect(result.positiveAttributes).toContain("work-life balance");
    expect(result.positiveAttributes).toContain("competitive compensation");
    expect(result.positiveAttributes).toContain("career growth");
    expect(result.positiveAttributes).toContain("mission-driven");
  });

  it("extracts negative attributes from responses", () => {
    const responses = [
      "Home Depot can be bureaucratic and slow-moving when it comes to technology adoption.",
      "Some employees report high turnover and legacy systems that haven't been modernized.",
    ];
    const result = extractResponseThemes(responses, clientName);
    expect(result.negativeAttributes).toContain("bureaucratic");
    expect(result.negativeAttributes).toContain("slow-moving");
    expect(result.negativeAttributes).toContain("high turnover");
    expect(result.negativeAttributes).toContain("legacy technology");
  });

  it("detects retail industry framing", () => {
    const responses = [
      "Home Depot is a retail company that also has a technology division.",
    ];
    const result = extractResponseThemes(responses, clientName);
    // AI says "retail company" but doesn't frame them as a tech company
    expect(result.industryFraming).toBe("retail company");
  });

  it("detects combined retail + tech framing", () => {
    const responses = [
      "Home Depot is a retail company, but it is also a technology company with strong engineering teams.",
    ];
    const result = extractResponseThemes(responses, clientName);
    expect(result.industryFraming).toBe("retail company with tech presence");
  });

  it("detects tech employer framing", () => {
    const responses = [
      "Home Depot is an engineering-driven company with cutting-edge technology.",
    ];
    const result = extractResponseThemes(responses, clientName);
    expect(result.industryFraming).toBe("tech employer");
  });

  it("detects traditional framing without tech mention", () => {
    const responses = [
      "Home Depot is a retail giant known for its stores and customer service.",
    ];
    const result = extractResponseThemes(responses, clientName);
    expect(result.industryFraming).toBe("retail company");
  });

  it("detects specific compensation data", () => {
    const responses = [
      "Software engineers at this company earn $150k-$200k base with RSU grants vesting over 4 years.",
    ];
    const result = extractResponseThemes(responses, clientName);
    expect(result.compensationDetail).toBe("specific");
  });

  it("detects vague compensation references", () => {
    const responses = [
      "The company offers a competitive salary with good benefits.",
    ];
    const result = extractResponseThemes(responses, clientName);
    expect(result.compensationDetail).toBe("vague");
  });

  it("detects absent compensation data", () => {
    const responses = [
      "The company is known for its retail operations and large store footprint.",
    ];
    const result = extractResponseThemes(responses, clientName);
    expect(result.compensationDetail).toBe("absent");
  });

  it("detects specific culture data", () => {
    const responses = [
      "The company has a Glassdoor rating of 3.8 out of 5 and offers a hybrid work model with 3 days in-office.",
    ];
    const result = extractResponseThemes(responses, clientName);
    expect(result.cultureDetail).toBe("specific");
  });

  it("detects vague culture references", () => {
    const responses = [
      "The company has a good culture and nice work environment.",
    ];
    const result = extractResponseThemes(responses, clientName);
    expect(result.cultureDetail).toBe("vague");
  });

  it("detects unsolicited competitors mentioned in multiple responses", () => {
    const responses = [
      "For retail technology roles, you might also consider Shopify, which offers similar opportunities.",
      "Companies like Shopify and Amazon are also hiring for similar roles in the e-commerce space.",
      "Amazon and Shopify are frequently mentioned as alternative employers.",
    ];
    const knownCompetitors = ["Lowe's", "Target"];
    const result = extractResponseThemes(responses, clientName, knownCompetitors);
    expect(result.unsolicitedCompetitors).toContain("Shopify");
    // Amazon appears in 2 responses (2nd and 3rd)
    expect(result.unsolicitedCompetitors.some((c) => c === "Amazon")).toBe(true);
  });

  it("excludes client and known competitors from unsolicited list", () => {
    const responses = [
      "Home Depot and Lowe's are the top home improvement retailers. Shopify is a competitor in retail tech.",
      "Shopify and Home Depot both invest heavily in technology.",
    ];
    const knownCompetitors = ["Lowe's"];
    const result = extractResponseThemes(responses, clientName, knownCompetitors);
    // Home Depot (client) should be excluded
    expect(result.unsolicitedCompetitors).not.toContain("Home Depot");
    // Lowe's (known competitor) should be excluded
    expect(result.unsolicitedCompetitors).not.toContain("Lowe's");
    // Shopify should be included (appears in 2+ responses)
    expect(result.unsolicitedCompetitors).toContain("Shopify");
  });

  it("requires 2+ response mentions for unsolicited competitors", () => {
    const responses = [
      "Stripe is also a good employer for engineers.",
    ];
    const result = extractResponseThemes(responses, clientName);
    // Only 1 response mentions Stripe, so it should not appear
    expect(result.unsolicitedCompetitors).not.toContain("Stripe");
  });

  it("limits unsolicited competitors to 5", () => {
    // Create responses where many companies are each mentioned 3+ times
    const companies = ["Google", "Meta", "Amazon", "Apple", "Microsoft", "Netflix", "Stripe", "Shopify"];
    const responses = companies.flatMap((c) => [
      `${c} is a great employer for engineers.`,
      `${c} offers competitive compensation.`,
      `Consider ${c} for technology roles.`,
    ]);
    const result = extractResponseThemes(responses, clientName);
    expect(result.unsolicitedCompetitors.length).toBeLessThanOrEqual(5);
  });

  it("handles banking industry framing for financial clients", () => {
    const responses = [
      "TD Bank is a financial services company with a growing technology team.",
    ];
    const result = extractResponseThemes(responses, "TD Bank");
    expect(result.industryFraming).toContain("financial services");
  });

  it("handles consumer goods framing", () => {
    const responses = [
      "The Coca-Cola Company is a consumer goods company with global operations.",
    ];
    const result = extractResponseThemes(responses, "The Coca-Cola Company");
    expect(result.industryFraming).toBe("consumer goods company");
  });

  it("returns all fields even when input has blank strings", () => {
    const result = extractResponseThemes(["", "   ", ""], clientName);
    expect(result.positiveAttributes).toEqual([]);
    expect(result.negativeAttributes).toEqual([]);
    expect(result.unsolicitedCompetitors).toEqual([]);
    expect(result.industryFraming).toBe("not clearly categorized");
    expect(result.compensationDetail).toBe("absent");
    expect(result.cultureDetail).toBe("absent");
  });
});
