import { describe, it, expect } from "vitest";
import { chartSpecSchema } from "@/lib/charts/spec";

describe("chartSpecSchema", () => {
  it("accepts a valid spec", () => {
    const spec = chartSpecSchema.parse({
      title: "Median 4br rent in West Campus",
      chartType: "bar",
      metric: "reported_median",
      groupBy: "property",
      filters: { zones: ["West Campus"], bedCounts: [4] },
      sort: "asc",
      limit: 30,
    });
    expect(spec.metric).toBe("reported_median");
  });

  it("rejects invented metrics", () => {
    expect(() =>
      chartSpecSchema.parse({
        title: "x",
        chartType: "bar",
        metric: "made_up_metric",
        groupBy: "property",
      })
    ).toThrow();
  });

  it("rejects invented zones", () => {
    expect(() =>
      chartSpecSchema.parse({
        title: "x",
        chartType: "bar",
        metric: "listed_median",
        groupBy: "zone",
        filters: { zones: ["Narnia"] },
      })
    ).toThrow();
  });

  it("applies defaults", () => {
    const spec = chartSpecSchema.parse({
      title: "x",
      chartType: "table",
      metric: "listed_median",
      groupBy: "property",
    });
    expect(spec.sort).toBe("desc");
    expect(spec.limit).toBe(25);
    expect(spec.filters).toEqual({});
  });
});
