import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDrivingDistance } from "./distance.ts";

const g = globalThis as typeof globalThis & { fetch: typeof fetch };

describe("fetchDrivingDistance", () => {
  beforeEach(() => {
    g.fetch = vi.fn();
  });

  it("returns minutes and meters on OK response", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
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
    const r = await fetchDrivingDistance({ from: "Mississauga", to: "Toronto", apiKey: "k" });
    expect(r).toEqual({ ok: true, minutes: 30, meters: 30000, cached: false });
  });

  it("returns invalid-key on HTTP 403", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 403 }),
    );
    const r = await fetchDrivingDistance({ from: "a", to: "b", apiKey: "k" });
    expect(r).toEqual({
      ok: false,
      errorKind: "invalid-key",
      message: expect.stringContaining("bad key"),
    });
  });

  it("returns rate-limited on HTTP 429", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "too many" } }), { status: 429 }),
    );
    const r = await fetchDrivingDistance({ from: "a", to: "b", apiKey: "k" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKind).toBe("rate-limited");
  });

  it("returns no-route on per-element NOT_FOUND", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
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
    const r = await fetchDrivingDistance({ from: "a", to: "b", apiKey: "k" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKind).toBe("no-route");
  });

  it("returns network on fetch throw", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("offline"));
    const r = await fetchDrivingDistance({ from: "a", to: "b", apiKey: "k" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKind).toBe("network");
  });
});
