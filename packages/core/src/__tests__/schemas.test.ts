import { describe, it, expect } from "vitest";
import {
  // Enums
  UserRole,
  ScanRunStatus,
  ContentAssetType,
  ReportStatus,
  RecommendationCategory,
  RecommendationPriority,
  RecommendationStatus,
  // Primitives
  domain,
  slug,
  email,
  percentScore,
  sentimentScore,
  // Entity schemas
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  CreateUserSchema,
  CreateClientSchema,
  UpdateClientSchema,
  CreateCompetitorSchema,
  CreateRoleProfileSchema,
  CreateQueryClusterSchema,
  CreateQuerySchema,
  UpdateQuerySchema,
  CreateScanRunSchema,
  RecordScanResultSchema,
  CreateCitationSourceSchema,
  CreateContentAssetSchema,
  CreateReportSchema,
  UpdateReportSchema,
  CreateRecommendationSchema,
  UpdateRecommendationSchema,
  // Workflow schemas
  TriggerScanSchema,
  GenerateReportSchema,
} from "../schemas";

// ─── Enum validation ────────────────────────────────────────

describe("enum schemas", () => {
  it("UserRole accepts valid values", () => {
    expect(UserRole.parse("OWNER")).toBe("OWNER");
    expect(UserRole.parse("ADMIN")).toBe("ADMIN");
    expect(UserRole.parse("MEMBER")).toBe("MEMBER");
    expect(UserRole.parse("VIEWER")).toBe("VIEWER");
  });

  it("UserRole rejects invalid values", () => {
    expect(() => UserRole.parse("SUPERADMIN")).toThrow();
    expect(() => UserRole.parse("")).toThrow();
  });

  it("ScanRunStatus covers all states", () => {
    const values = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];
    for (const v of values) {
      expect(ScanRunStatus.parse(v)).toBe(v);
    }
  });

  it("ContentAssetType covers all types", () => {
    const values = [
      "CAREERS_PAGE",
      "JOB_POSTING",
      "BLOG_POST",
      "PRESS_RELEASE",
      "SOCIAL_PROFILE",
      "REVIEW_SITE",
      "OTHER",
    ];
    for (const v of values) {
      expect(ContentAssetType.parse(v)).toBe(v);
    }
  });

  it("ReportStatus covers all states", () => {
    const values = ["DRAFT", "GENERATING", "REVIEW", "PUBLISHED", "ARCHIVED"];
    for (const v of values) {
      expect(ReportStatus.parse(v)).toBe(v);
    }
  });

  it("RecommendationCategory covers all categories", () => {
    expect(RecommendationCategory.parse("CONTENT_GAP")).toBe("CONTENT_GAP");
    expect(RecommendationCategory.parse("EMPLOYER_BRAND")).toBe(
      "EMPLOYER_BRAND",
    );
    expect(() => RecommendationCategory.parse("INVALID")).toThrow();
  });

  it("RecommendationPriority ordering", () => {
    const values = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    for (const v of values) {
      expect(RecommendationPriority.parse(v)).toBe(v);
    }
  });

  it("RecommendationStatus covers all states", () => {
    const values = ["OPEN", "IN_PROGRESS", "COMPLETED", "DISMISSED"];
    for (const v of values) {
      expect(RecommendationStatus.parse(v)).toBe(v);
    }
  });
});

// ─── Primitive validation ───────────────────────────────────

describe("primitive validators", () => {
  describe("domain", () => {
    it("accepts valid domains", () => {
      expect(domain.parse("example.com")).toBe("example.com");
      expect(domain.parse("sub.example.co.uk")).toBe("sub.example.co.uk");
      expect(domain.parse("my-company.io")).toBe("my-company.io");
    });

    it("rejects invalid domains", () => {
      expect(() => domain.parse("")).toThrow();
      expect(() => domain.parse("no-tld")).toThrow();
      expect(() => domain.parse("http://example.com")).toThrow();
      expect(() => domain.parse("spaces in domain.com")).toThrow();
    });
  });

  describe("slug", () => {
    it("accepts valid slugs", () => {
      expect(slug.parse("my-org")).toBe("my-org");
      expect(slug.parse("org123")).toBe("org123");
    });

    it("rejects uppercase and special chars", () => {
      expect(() => slug.parse("My-Org")).toThrow();
      expect(() => slug.parse("org_name")).toThrow();
      expect(() => slug.parse("")).toThrow();
    });
  });

  describe("email", () => {
    it("accepts valid emails", () => {
      expect(email.parse("user@example.com")).toBe("user@example.com");
    });

    it("rejects invalid emails", () => {
      expect(() => email.parse("not-an-email")).toThrow();
      expect(() => email.parse("")).toThrow();
    });
  });

  describe("percentScore", () => {
    it("accepts 0–100", () => {
      expect(percentScore.parse(0)).toBe(0);
      expect(percentScore.parse(50)).toBe(50);
      expect(percentScore.parse(100)).toBe(100);
    });

    it("rejects out-of-range", () => {
      expect(() => percentScore.parse(-1)).toThrow();
      expect(() => percentScore.parse(101)).toThrow();
    });
  });

  describe("sentimentScore", () => {
    it("accepts -1 to 1", () => {
      expect(sentimentScore.parse(-1)).toBe(-1);
      expect(sentimentScore.parse(0)).toBe(0);
      expect(sentimentScore.parse(0.5)).toBe(0.5);
      expect(sentimentScore.parse(1)).toBe(1);
    });

    it("rejects out-of-range", () => {
      expect(() => sentimentScore.parse(-1.1)).toThrow();
      expect(() => sentimentScore.parse(1.1)).toThrow();
    });
  });
});

// ─── Entity create schemas ──────────────────────────────────

// Use a realistic cuid for FK fields in tests
const CUID = "clh4n6f0000004l28c3f5g7h9";

describe("CreateOrganizationSchema", () => {
  it("accepts valid input", () => {
    const input = { name: "Acme Corp", slug: "acme-corp" };
    expect(CreateOrganizationSchema.parse(input)).toEqual(input);
  });

  it("rejects empty name", () => {
    expect(() =>
      CreateOrganizationSchema.parse({ name: "", slug: "acme" }),
    ).toThrow();
  });

  it("rejects uppercase slug", () => {
    expect(() =>
      CreateOrganizationSchema.parse({ name: "Acme", slug: "Acme-Corp" }),
    ).toThrow();
  });
});

describe("UpdateOrganizationSchema", () => {
  it("accepts partial updates", () => {
    expect(UpdateOrganizationSchema.parse({ name: "New Name" })).toEqual({
      name: "New Name",
    });
    expect(UpdateOrganizationSchema.parse({})).toEqual({});
  });
});

describe("CreateUserSchema", () => {
  it("accepts valid input with default role", () => {
    const result = CreateUserSchema.parse({
      organizationId: CUID,
      email: "alex@acme.com",
      name: "Alex Chen",
    });
    expect(result.role).toBe("MEMBER");
  });

  it("accepts explicit role", () => {
    const result = CreateUserSchema.parse({
      organizationId: CUID,
      email: "alex@acme.com",
      name: "Alex Chen",
      role: "ADMIN",
    });
    expect(result.role).toBe("ADMIN");
  });

  it("rejects invalid email", () => {
    expect(() =>
      CreateUserSchema.parse({
        organizationId: CUID,
        email: "bad",
        name: "Alex",
      }),
    ).toThrow();
  });
});

describe("CreateClientSchema", () => {
  const validClient = {
    organizationId: CUID,
    name: "Meridian Technologies",
    domain: "meridiantech.com",
  };

  it("accepts minimal valid input", () => {
    expect(CreateClientSchema.parse(validClient)).toEqual(validClient);
  });

  it("accepts full input with optional fields", () => {
    const full = {
      ...validClient,
      industry: "Enterprise Software",
      description: "A mid-market SaaS company",
      logoUrl: "https://cdn.example.com/logo.png",
    };
    expect(CreateClientSchema.parse(full)).toEqual(full);
  });

  it("rejects invalid domain", () => {
    expect(() =>
      CreateClientSchema.parse({ ...validClient, domain: "not-a-domain" }),
    ).toThrow();
  });

  it("rejects invalid logoUrl", () => {
    expect(() =>
      CreateClientSchema.parse({ ...validClient, logoUrl: "not-a-url" }),
    ).toThrow();
  });
});

describe("UpdateClientSchema", () => {
  it("accepts partial update", () => {
    expect(
      UpdateClientSchema.parse({ industry: "Updated Industry" }),
    ).toEqual({ industry: "Updated Industry" });
  });

  it("accepts empty update", () => {
    expect(UpdateClientSchema.parse({})).toEqual({});
  });
});

describe("CreateCompetitorSchema", () => {
  it("accepts valid competitor", () => {
    const input = {
      clientId: CUID,
      name: "Apex Cloud Systems",
      domain: "apexcloudsystems.com",
    };
    expect(CreateCompetitorSchema.parse(input)).toEqual(input);
  });
});

describe("CreateRoleProfileSchema", () => {
  it("accepts valid role profile", () => {
    const input = {
      clientId: CUID,
      title: "Senior Backend Engineer",
      department: "Engineering",
      seniority: "Senior",
    };
    expect(CreateRoleProfileSchema.parse(input)).toEqual(input);
  });

  it("rejects empty title", () => {
    expect(() =>
      CreateRoleProfileSchema.parse({ clientId: CUID, title: "" }),
    ).toThrow();
  });
});

describe("CreateQueryClusterSchema", () => {
  it("accepts cluster with optional roleProfileId", () => {
    const input = {
      clientId: CUID,
      name: "Engineering Culture",
      intent: "Evaluate engineering team quality",
    };
    expect(CreateQueryClusterSchema.parse(input)).toEqual(input);
  });

  it("accepts cluster with roleProfileId", () => {
    const input = {
      clientId: CUID,
      roleProfileId: CUID,
      name: "Engineering Culture",
    };
    expect(CreateQueryClusterSchema.parse(input)).toEqual(input);
  });
});

describe("CreateQuerySchema", () => {
  it("accepts valid query", () => {
    const input = {
      queryClusterId: CUID,
      text: "best companies for backend engineers",
    };
    expect(CreateQuerySchema.parse(input)).toEqual(input);
  });

  it("rejects empty query text", () => {
    expect(() =>
      CreateQuerySchema.parse({ queryClusterId: CUID, text: "" }),
    ).toThrow();
  });
});

describe("UpdateQuerySchema", () => {
  it("accepts toggling isActive", () => {
    expect(UpdateQuerySchema.parse({ isActive: false })).toEqual({
      isActive: false,
    });
  });
});

// ─── Scan schemas ───────────────────────────────────────────

describe("CreateScanRunSchema", () => {
  it("accepts minimal scan run", () => {
    const input = { clientId: CUID };
    expect(CreateScanRunSchema.parse(input)).toEqual(input);
  });

  it("accepts scan run with model", () => {
    const input = { clientId: CUID, model: "claude-sonnet-4-20250514" };
    expect(CreateScanRunSchema.parse(input)).toEqual(input);
  });
});

describe("RecordScanResultSchema", () => {
  const validResult = {
    scanRunId: CUID,
    queryId: CUID,
    response: "Meridian Technologies is a mid-market enterprise software company...",
  };

  it("accepts minimal result", () => {
    const result = RecordScanResultSchema.parse(validResult);
    expect(result.mentioned).toBe(false); // default
  });

  it("accepts result with all scores", () => {
    const result = RecordScanResultSchema.parse({
      ...validResult,
      visibilityScore: 72.5,
      sentimentScore: 0.4,
      relevanceScore: 88,
      ranking: 3,
      mentioned: true,
      tokenCount: 450,
      latencyMs: 1200,
    });
    expect(result.visibilityScore).toBe(72.5);
    expect(result.sentimentScore).toBe(0.4);
  });

  it("rejects visibilityScore > 100", () => {
    expect(() =>
      RecordScanResultSchema.parse({
        ...validResult,
        visibilityScore: 101,
      }),
    ).toThrow();
  });

  it("rejects sentimentScore > 1", () => {
    expect(() =>
      RecordScanResultSchema.parse({
        ...validResult,
        sentimentScore: 1.5,
      }),
    ).toThrow();
  });

  it("rejects sentimentScore < -1", () => {
    expect(() =>
      RecordScanResultSchema.parse({
        ...validResult,
        sentimentScore: -2,
      }),
    ).toThrow();
  });

  it("rejects empty response", () => {
    expect(() =>
      RecordScanResultSchema.parse({
        scanRunId: CUID,
        queryId: CUID,
        response: "",
      }),
    ).toThrow();
  });
});

describe("CreateCitationSourceSchema", () => {
  it("accepts valid citation", () => {
    const input = {
      scanResultId: CUID,
      url: "https://glassdoor.com/reviews/meridian",
      title: "Meridian Technologies Reviews",
      sourceType: "glassdoor",
    };
    expect(CreateCitationSourceSchema.parse(input)).toEqual(input);
  });

  it("rejects invalid url", () => {
    expect(() =>
      CreateCitationSourceSchema.parse({
        scanResultId: CUID,
        url: "not-a-url",
      }),
    ).toThrow();
  });
});

// ─── Content & Report schemas ───────────────────────────────

describe("CreateContentAssetSchema", () => {
  it("accepts valid content asset", () => {
    const input = {
      clientId: CUID,
      url: "https://meridiantech.com/careers",
      assetType: "CAREERS_PAGE" as const,
      title: "Careers at Meridian",
    };
    expect(CreateContentAssetSchema.parse(input)).toEqual(input);
  });

  it("rejects invalid assetType", () => {
    expect(() =>
      CreateContentAssetSchema.parse({
        clientId: CUID,
        url: "https://example.com",
        assetType: "INVALID",
      }),
    ).toThrow();
  });
});

describe("CreateReportSchema", () => {
  it("accepts valid report", () => {
    const input = {
      clientId: CUID,
      title: "Q1 2026 AI Visibility Audit",
    };
    expect(CreateReportSchema.parse(input)).toEqual(input);
  });
});

describe("UpdateReportSchema", () => {
  it("accepts status transition", () => {
    expect(UpdateReportSchema.parse({ status: "PUBLISHED" })).toEqual({
      status: "PUBLISHED",
    });
  });

  it("rejects invalid status", () => {
    expect(() => UpdateReportSchema.parse({ status: "INVALID" })).toThrow();
  });
});

describe("CreateRecommendationSchema", () => {
  it("accepts valid recommendation with defaults", () => {
    const result = CreateRecommendationSchema.parse({
      reportId: CUID,
      category: "CONTENT_GAP",
      title: "Missing engineering blog",
      description:
        "Competitors have active engineering blogs that improve their AI visibility.",
    });
    expect(result.priority).toBe("MEDIUM");
    expect(result.sortOrder).toBe(0);
  });

  it("accepts explicit priority and sortOrder", () => {
    const result = CreateRecommendationSchema.parse({
      reportId: CUID,
      category: "COMPETITIVE_POSITIONING",
      priority: "CRITICAL",
      title: "No mention in top-5 results",
      description: "Company is not mentioned in any AI response for key queries.",
      impact: "Losing candidates to competitors with stronger AI visibility.",
      effort: "High",
      sortOrder: 1,
    });
    expect(result.priority).toBe("CRITICAL");
    expect(result.sortOrder).toBe(1);
  });
});

describe("UpdateRecommendationSchema", () => {
  it("accepts status change", () => {
    expect(
      UpdateRecommendationSchema.parse({ status: "COMPLETED" }),
    ).toEqual({ status: "COMPLETED" });
  });
});

// ─── Workflow schemas ───────────────────────────────────────

describe("TriggerScanSchema", () => {
  it("accepts valid scan trigger", () => {
    const result = TriggerScanSchema.parse({
      clientId: CUID,
      queryClusterIds: [CUID],
      model: "claude-sonnet-4-20250514",
    });
    expect(result.includeCompetitors).toBe(true); // default
  });

  it("rejects empty queryClusterIds", () => {
    expect(() =>
      TriggerScanSchema.parse({
        clientId: CUID,
        queryClusterIds: [],
      }),
    ).toThrow(/at least one query cluster/i);
  });

  it("accepts disabling competitor scan", () => {
    const result = TriggerScanSchema.parse({
      clientId: CUID,
      queryClusterIds: [CUID],
      includeCompetitors: false,
    });
    expect(result.includeCompetitors).toBe(false);
  });
});

describe("GenerateReportSchema", () => {
  it("accepts valid report generation request", () => {
    const input = {
      clientId: CUID,
      title: "Visibility Audit — March 2026",
      scanRunIds: [CUID],
    };
    expect(GenerateReportSchema.parse(input)).toEqual(input);
  });

  it("rejects empty scanRunIds", () => {
    expect(() =>
      GenerateReportSchema.parse({
        clientId: CUID,
        title: "Report",
        scanRunIds: [],
      }),
    ).toThrow(/at least one completed scan/i);
  });
});
