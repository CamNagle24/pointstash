import { describe, it, expect } from "vitest";
import { buildBalanceSeries } from "@/lib/points-history";

const rec = (newPoints: number, previousPoints: number, createdAt: string) => ({
  newPoints,
  previousPoints,
  createdAt,
});

describe("buildBalanceSeries", () => {
  it("returns an empty series for no history", () => {
    expect(buildBalanceSeries([])).toEqual([]);
  });

  it("orders newest-first history into a chronological balance line", () => {
    // API returns newest-first; the chart needs oldest-first.
    const history = [
      rec(300, 200, "2026-06-03T00:00:00Z"),
      rec(200, 100, "2026-06-02T00:00:00Z"),
      rec(100, 0, "2026-06-01T00:00:00Z"),
    ];
    expect(buildBalanceSeries(history).map((p) => p.points)).toEqual([0, 100, 200, 300]);
  });

  it("anchors the line with the balance before the earliest change", () => {
    const series = buildBalanceSeries([rec(500, 450, "2026-06-10T00:00:00Z")]);
    // One change still yields a two-point trend: 450 -> 500.
    expect(series.map((p) => p.points)).toEqual([450, 500]);
    expect(series[0].date).toBe("2026-06-10T00:00:00Z");
  });

  it("does not mutate the input array", () => {
    const history = [
      rec(200, 100, "2026-06-02T00:00:00Z"),
      rec(100, 0, "2026-06-01T00:00:00Z"),
    ];
    const snapshot = [...history];
    buildBalanceSeries(history);
    expect(history).toEqual(snapshot);
  });
});
