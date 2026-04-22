import { describe, expect, it } from "vitest";
import { pickDestination } from "./card-visitor.ts";

describe("pickDestination", () => {
  it("prefers postcode + country when available", () => {
    expect(
      pickDestination(
        {
          postalCode: "GU21 6XB",
          latitude: 51.31903,
          longitude: -0.55893,
          fullAddress: "1 High St, Woking GU21 6XB",
          countryCode: "GB",
        },
        "Woking",
      ),
    ).toEqual({ address: "GU21 6XB, GB" });
  });

  it("falls back to latlng when postcode is null", () => {
    expect(
      pickDestination(
        {
          postalCode: null,
          latitude: 51.31903,
          longitude: -0.55893,
          fullAddress: "Woking",
          countryCode: "GB",
        },
        "Woking",
      ),
    ).toEqual({ lat: 51.31903, lng: -0.55893 });
  });

  it("falls back to fullAddress when postcode + latlng are null", () => {
    expect(
      pickDestination(
        {
          postalCode: null,
          latitude: null,
          longitude: null,
          fullAddress: "Remote UK Office",
          countryCode: "GB",
        },
        "Somewhere",
      ),
    ).toEqual({ address: "Remote UK Office" });
  });

  it("falls back to card location when JobLocation is null", () => {
    expect(pickDestination(null, "Hybrid work in Toronto, ON")).toEqual({
      address: "Toronto, ON",
    });
  });

  it("falls back to card location when JobLocation has no usable fields", () => {
    expect(
      pickDestination(
        { postalCode: null, latitude: null, longitude: null, fullAddress: null, countryCode: "GB" },
        "London",
      ),
    ).toEqual({ address: "London" });
  });

  it("returns null when nothing is usable", () => {
    expect(pickDestination(null, "Remote")).toBeNull();
  });

  it("uses postcode alone when countryCode is missing", () => {
    expect(
      pickDestination(
        {
          postalCode: "94103",
          latitude: null,
          longitude: null,
          fullAddress: null,
          countryCode: null,
        },
        "SF",
      ),
    ).toEqual({ address: "94103" });
  });
});
