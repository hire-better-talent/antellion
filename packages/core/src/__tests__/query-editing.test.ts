import { describe, it, expect } from "vitest";
import {
  UpdateQueryClusterSchema,
  UpdateQuerySchema,
  CreateQuerySchema,
} from "../schemas";

const CUID = "clh4n6f0000004l28c3f5g7h9";

describe("UpdateQueryClusterSchema — editing workflows", () => {
  it("accepts renaming only", () => {
    const result = UpdateQueryClusterSchema.parse({ name: "New Name" });
    expect(result).toEqual({ name: "New Name" });
  });

  it("accepts intent-only update", () => {
    const result = UpdateQueryClusterSchema.parse({
      intent: "Updated intent",
    });
    expect(result).toEqual({ intent: "Updated intent" });
  });

  it("accepts name + intent together", () => {
    const result = UpdateQueryClusterSchema.parse({
      name: "Renamed",
      intent: "New intent",
    });
    expect(result.name).toBe("Renamed");
    expect(result.intent).toBe("New intent");
  });

  it("accepts empty update (no fields)", () => {
    const result = UpdateQueryClusterSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects empty name", () => {
    expect(() => UpdateQueryClusterSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name exceeding 255 chars", () => {
    expect(() =>
      UpdateQueryClusterSchema.parse({ name: "x".repeat(256) }),
    ).toThrow();
  });

  it("accepts clearing roleProfileId with null", () => {
    const result = UpdateQueryClusterSchema.parse({ roleProfileId: null });
    expect(result.roleProfileId).toBeNull();
  });
});

describe("UpdateQuerySchema — editing workflows", () => {
  it("accepts toggling isActive only", () => {
    const result = UpdateQuerySchema.parse({ isActive: false });
    expect(result).toEqual({ isActive: false });
  });

  it("accepts re-activating", () => {
    const result = UpdateQuerySchema.parse({ isActive: true });
    expect(result).toEqual({ isActive: true });
  });

  it("accepts editing text only", () => {
    const result = UpdateQuerySchema.parse({ text: "Updated query text" });
    expect(result).toEqual({ text: "Updated query text" });
  });

  it("accepts editing text + intent together", () => {
    const result = UpdateQuerySchema.parse({
      text: "New text",
      intent: "New intent",
    });
    expect(result.text).toBe("New text");
    expect(result.intent).toBe("New intent");
  });

  it("rejects empty text when provided", () => {
    expect(() => UpdateQuerySchema.parse({ text: "" })).toThrow();
  });

  it("rejects text exceeding 1000 chars", () => {
    expect(() =>
      UpdateQuerySchema.parse({ text: "x".repeat(1001) }),
    ).toThrow();
  });

  it("accepts empty update (no fields)", () => {
    expect(UpdateQuerySchema.parse({})).toEqual({});
  });

  it("rejects non-boolean isActive", () => {
    expect(() => UpdateQuerySchema.parse({ isActive: "yes" })).toThrow();
  });
});

describe("CreateQuerySchema — adding to existing cluster", () => {
  it("accepts valid query with cluster id", () => {
    const result = CreateQuerySchema.parse({
      queryClusterId: CUID,
      text: "best companies for engineers",
    });
    expect(result.queryClusterId).toBe(CUID);
    expect(result.text).toBe("best companies for engineers");
  });

  it("accepts query with intent", () => {
    const result = CreateQuerySchema.parse({
      queryClusterId: CUID,
      text: "some query",
      intent: "discovery",
    });
    expect(result.intent).toBe("discovery");
  });

  it("rejects missing text", () => {
    expect(() =>
      CreateQuerySchema.parse({ queryClusterId: CUID, text: "" }),
    ).toThrow();
  });

  it("rejects missing queryClusterId", () => {
    expect(() =>
      CreateQuerySchema.parse({ text: "some query" }),
    ).toThrow();
  });

  it("rejects invalid queryClusterId", () => {
    expect(() =>
      CreateQuerySchema.parse({ queryClusterId: "bad", text: "query" }),
    ).toThrow();
  });
});
