import { describe, it, expect } from "vitest";
import { validate, parse } from "../validation";
import { CreateClientSchema, CreateOrganizationSchema } from "../schemas";

describe("validate", () => {
  it("returns success with parsed data on valid input", () => {
    const result = validate(CreateOrganizationSchema, {
      name: "Acme Corp",
      slug: "acme-corp",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Acme Corp", slug: "acme-corp" });
    }
  });

  it("returns failure with field errors on invalid input", () => {
    const result = validate(CreateOrganizationSchema, {
      name: "",
      slug: "INVALID_SLUG",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain("name");
      expect(fields).toContain("slug");
    }
  });

  it("returns field path for nested errors", () => {
    // Missing required field generates root-level path
    const result = validate(CreateClientSchema, {
      organizationId: "not-a-cuid",
      name: "Test",
      domain: "bad domain",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain("organizationId");
      expect(fields).toContain("domain");
    }
  });

  it("strips unknown fields", () => {
    const result = validate(CreateOrganizationSchema, {
      name: "Acme",
      slug: "acme",
      unknownField: "should be stripped",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect("unknownField" in result.data).toBe(false);
    }
  });

  it("every error has field and message", () => {
    const result = validate(CreateClientSchema, {});

    expect(result.success).toBe(false);
    if (!result.success) {
      for (const error of result.errors) {
        expect(typeof error.field).toBe("string");
        expect(error.field.length).toBeGreaterThan(0);
        expect(typeof error.message).toBe("string");
        expect(error.message.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("parse", () => {
  it("returns parsed data on valid input", () => {
    const data = parse(CreateOrganizationSchema, {
      name: "Acme Corp",
      slug: "acme-corp",
    });
    expect(data).toEqual({ name: "Acme Corp", slug: "acme-corp" });
  });

  it("throws ZodError on invalid input", () => {
    expect(() => parse(CreateOrganizationSchema, { name: "" })).toThrow();
  });
});
