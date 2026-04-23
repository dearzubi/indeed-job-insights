import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { fetchDrivingDistance } from "./distance.ts";

describe("fetchDrivingDistance", () => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns minutes and meters on OK response", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            originIndex: 0,
            destinationIndex: 0,
            duration: "1800s",
            distanceMeters: 30000,
            status: {},
          },
        ]),
      ),
    );
    const r = await fetchDrivingDistance({
      from: "Mississauga",
      to: { address: "Toronto" },
      apiKey: "k",
    });
    expect(r).toEqual({ ok: true, minutes: 30, meters: 30000, cached: false });
  });

  it("returns invalid-key on HTTP 403", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 403 }),
    );
    const r = await fetchDrivingDistance({ from: "a", to: { address: "b" }, apiKey: "k" });
    expect(r).toEqual({
      ok: false,
      errorKind: "invalid-key",
      message: expect.stringContaining("bad key"),
    });
  });

  it("returns rate-limited on HTTP 429 after retries are exhausted", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "too many" } }), { status: 429 }),
    );
    const p = fetchDrivingDistance({ from: "a", to: { address: "b" }, apiKey: "k" });
    await vi.runAllTimersAsync();
    const r = await p;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKind).toBe("rate-limited");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("returns no-route on per-element NOT_FOUND", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            originIndex: 0,
            destinationIndex: 0,
            status: { code: 5, message: "NOT_FOUND" },
          },
        ]),
      ),
    );
    const r = await fetchDrivingDistance({ from: "a", to: { address: "b" }, apiKey: "k" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKind).toBe("no-route");
  });

  it("sends a latLng waypoint when destination has coordinates", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            originIndex: 0,
            destinationIndex: 0,
            duration: "600s",
            distanceMeters: 5000,
            status: {},
          },
        ]),
      ),
    );
    await fetchDrivingDistance({ from: "Home", to: { lat: 51.319, lng: -0.559 }, apiKey: "k" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.lastCall ?? [];
    expect(init?.body).toEqual(expect.any(String));
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      origins: expect.arrayContaining([expect.objectContaining({ waypoint: { address: "Home" } })]),
      destinations: expect.arrayContaining([
        expect.objectContaining({
          waypoint: { location: { latLng: { latitude: 51.319, longitude: -0.559 } } },
        }),
      ]),
    });
  });

  it("surfaces error.message when HTTP 200 returns an object error body", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 400, message: "Origin not recognized" } })),
    );
    const r = await fetchDrivingDistance({ from: "???", to: { address: "b" }, apiKey: "k" });
    expect(r).toEqual({
      ok: false,
      errorKind: "unknown",
      message: "Origin not recognized",
    });
  });

  it("recovers when a transient 503 is followed by a successful response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 503 }));
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            originIndex: 0,
            destinationIndex: 0,
            duration: "900s",
            distanceMeters: 10_000,
            status: {},
          },
        ]),
      ),
    );
    const p = fetchDrivingDistance({ from: "a", to: { address: "b" }, apiKey: "k" });
    await vi.runAllTimersAsync();
    const r = await p;
    expect(r).toEqual({ ok: true, minutes: 15, meters: 10_000, cached: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns network error kind after fetch keeps throwing through all retries", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const p = fetchDrivingDistance({ from: "a", to: { address: "b" }, apiKey: "k" });
    await vi.runAllTimersAsync();
    const r = await p;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKind).toBe("network");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
