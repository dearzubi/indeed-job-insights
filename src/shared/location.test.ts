import { describe, expect, it } from "vitest";
import { sanitizeLocation } from "./location.ts";

describe("sanitizeLocation", () => {
  it("strips 'Hybrid work in' prefix", () => {
    expect(sanitizeLocation("Hybrid work in London")).toBe("London");
  });
  it("strips 'Remote in' prefix", () => {
    expect(sanitizeLocation("Remote in London")).toBe("London");
  });
  it("strips 'In-office in' and 'In office in' prefix", () => {
    expect(sanitizeLocation("In-office in Toronto")).toBe("Toronto");
    expect(sanitizeLocation("In office in Toronto")).toBe("Toronto");
  });
  it("strips 'Work from home in' prefix", () => {
    expect(sanitizeLocation("Work from home in Belfast")).toBe("Belfast");
  });
  it("preserves postcodes", () => {
    expect(sanitizeLocation("London E1W 1BA")).toBe("London E1W 1BA");
    expect(sanitizeLocation("Hybrid work in Farnborough GU14 7QN")).toBe("Farnborough GU14 7QN");
  });
  it("returns empty for pure Remote variants", () => {
    expect(sanitizeLocation("Remote")).toBe("");
    expect(sanitizeLocation("REMOTE")).toBe("");
    expect(sanitizeLocation("Fully Remote")).toBe("");
    expect(sanitizeLocation("Work from home")).toBe("");
    expect(sanitizeLocation("WFH")).toBe("");
    expect(sanitizeLocation("   remote  ")).toBe("");
  });
  it("returns empty for empty or whitespace-only input", () => {
    expect(sanitizeLocation("")).toBe("");
    expect(sanitizeLocation("   ")).toBe("");
  });
  it("handles bullet-separated remote prefix", () => {
    expect(sanitizeLocation("Remote • London")).toBe("London");
    expect(sanitizeLocation("Hybrid · Manchester")).toBe("Manchester");
  });
  it("is idempotent on already-clean input", () => {
    expect(sanitizeLocation("London")).toBe("London");
    expect(sanitizeLocation("New York, NY")).toBe("New York, NY");
  });
  it("case-insensitive prefix match", () => {
    expect(sanitizeLocation("HYBRID WORK IN London")).toBe("London");
    expect(sanitizeLocation("remote in London")).toBe("London");
  });
});
