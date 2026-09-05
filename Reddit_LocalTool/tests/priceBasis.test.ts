import { describe, it, expect } from "vitest";
import {
  classifyPricingModel,
  deriveRentPerPerson,
  reportBasisFlag,
} from "@/lib/ingest/priceBasis";

const base = {
  beds: 2,
  baseRent: 800,
  priceStatus: "listed",
  priceDisplay: null as string | null,
  occupancy: null as string | null,
};

describe("classifyPricingModel", () => {
  it("'/person' display wins", () => {
    expect(classifyPricingModel({ ...base, priceDisplay: "$369/person" })).toBe("per_bed");
  });
  it("shared/private occupancy implies per-bed", () => {
    expect(classifyPricingModel({ ...base, occupancy: "shared" })).toBe("per_bed");
    expect(classifyPricingModel({ ...base, occupancy: "private" })).toBe("per_bed");
  });
  it("ratio heuristic for multi-bed", () => {
    expect(classifyPricingModel({ ...base, baseRent: 800 })).toBe("per_bed"); // 400/bed
    expect(classifyPricingModel({ ...base, baseRent: 3000 })).toBe("per_unit"); // 1500/bed
  });
  it("unknown when no signal", () => {
    expect(classifyPricingModel({ ...base, beds: 1 })).toBe("unknown");
    expect(classifyPricingModel({ ...base, baseRent: null })).toBe("unknown");
  });
});

describe("deriveRentPerPerson", () => {
  it("per_bed passes through base rent", () => {
    expect(deriveRentPerPerson({ ...base, occupancy: "private" }, "per_bed")).toBe(800);
  });
  it("per_unit divides by beds", () => {
    expect(deriveRentPerPerson({ ...base, baseRent: 3000 }, "per_unit")).toBe(1500);
  });
  it("unknown basis -> null (excluded from medians)", () => {
    expect(deriveRentPerPerson(base, "unknown")).toBeNull();
  });
  it("unlisted price -> null even with a number present", () => {
    expect(
      deriveRentPerPerson({ ...base, priceStatus: "not_publicly_listed" }, "per_bed")
    ).toBeNull();
  });
});

describe("reportBasisFlag", () => {
  it("flags likely per-unit self-reports", () => {
    expect(reportBasisFlag(4200, 4)).toBe("possible_per_unit");
  });
  it("passes normal per-person rents", () => {
    expect(reportBasisFlag(610, 2)).toBeNull();
    expect(reportBasisFlag(1450, 1)).toBeNull();
  });
});
