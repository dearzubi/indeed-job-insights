import { describe, expect, it } from "vitest";
import { match } from "../../src/content/matcher.ts";
import { DEFAULT_CONFIG } from "../../src/shared/config.ts";

const baseConfig = {
  ...DEFAULT_CONFIG,
  homeCity: "Mississauga",
  nearbyCities: ["toronto", "brampton"],
  keywords: [],
};

describe("match — location classification", () => {
  it("returns home when structuredLocation equals homeCity", () => {
    const r = match("Anything", "Mississauga, ON", baseConfig);
    expect(r.cityHit).toBe("home");
  });
  it("returns home on case/suffix difference", () => {
    const r = match("", "MISSISSAUGA, ON, CANADA", baseConfig);
    expect(r.cityHit).toBe("home");
  });
  it("returns remote when description says remote", () => {
    const r = match("Fully remote role", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("remote");
  });
  it("returns remote for 'work from home'", () => {
    const r = match("Work from home position", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("remote");
  });
  it("returns remote for 'WFH'", () => {
    const r = match("WFH welcome", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("remote");
  });
  it("returns remote for 'hybrid'", () => {
    const r = match("Hybrid role (2 days in office)", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("remote");
  });
  it("returns home-mentioned when city in body but not structured", () => {
    const r = match("We hire from Mississauga and Oakville", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("home-mentioned");
  });
  it("returns nearby when nearby city appears in body", () => {
    const r = match("We're based in Brampton", "Markham, ON", baseConfig);
    expect(r.cityHit).toBe("nearby");
  });
  it("returns none when nothing matches", () => {
    const r = match("Calgary-only position", "Calgary, AB", baseConfig);
    expect(r.cityHit).toBe("none");
  });
  it("prefers remote over home-mentioned", () => {
    const r = match("Remote. Based in Mississauga office.", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("remote");
  });
  it("whole-word only for homeCity mention", () => {
    const r = match("We are mississaugac", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("none");
  });
});
