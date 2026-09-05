import { describe, it, expect } from "vitest";
import { flagOutliers, type OutlierRow } from "@/lib/ingest/outliers";

const row = (id: string, rent: number, over: Partial<OutlierRow> = {}): OutlierRow => ({
  id,
  propertyId: "p1",
  beds: 2,
  sharedOccupancy: false,
  rentPerPerson: rent,
  ...over,
});

describe("flagOutliers", () => {
  it("flags a typo far outside the group IQR", () => {
    const rows = [
      row("a", 800),
      row("b", 850),
      row("c", 900),
      row("d", 820),
      row("e", 12000), // the $12,000/mo typo
    ];
    const flagged = flagOutliers(rows);
    expect(flagged.has("e")).toBe(true);
    expect(flagged.size).toBe(1);
  });

  it("small groups fall back to the global per-bed fence", () => {
    const rows = [
      // big group at other property establishes the global 2br fence
      ...Array.from({ length: 12 }, (_, i) => row(`g${i}`, 800 + i * 10, { propertyId: "p2" })),
      // tiny group with one absurd value
      row("x1", 850, { propertyId: "p3" }),
      row("x2", 9000, { propertyId: "p3" }),
    ];
    const flagged = flagOutliers(rows);
    expect(flagged.has("x2")).toBe(true);
    expect(flagged.has("x1")).toBe(false);
  });

  it("ignores rows without rent", () => {
    expect(flagOutliers([row("a", null as unknown as number, { rentPerPerson: null })]).size).toBe(0);
  });
});
