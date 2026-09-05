import { describe, it, expect } from "vitest";
import { parseLayout } from "@/lib/ingest/parseLayout";

describe("parseLayout", () => {
  it("parses standard N Bed / M Bath", () => {
    expect(parseLayout("2 Bed / 2 Bath")).toEqual({ beds: 2, baths: 2 });
    expect(parseLayout("5 Bed / 4 Bath")).toEqual({ beds: 5, baths: 4 });
  });
  it("parses messy variants", () => {
    expect(parseLayout("4bed 3 bath")).toEqual({ beds: 4, baths: 3 });
    expect(parseLayout("2 bed/ 2 bath")).toEqual({ beds: 2, baths: 2 });
    expect(parseLayout("3 bed /3 bath")).toEqual({ beds: 3, baths: 3 });
  });
  it("parses studio", () => {
    expect(parseLayout("Studio")).toEqual({ beds: 0, baths: 1 });
  });
  it("parses 4x4 shorthand", () => {
    expect(parseLayout("4x4")).toEqual({ beds: 4, baths: 4 });
  });
  it("returns nulls for empty/garbage", () => {
    expect(parseLayout("")).toEqual({ beds: null, baths: null });
    expect(parseLayout(null)).toEqual({ beds: null, baths: null });
    expect(parseLayout("Bed 3 / Bed 3").beds).toBeNull();
  });
  it("rejects implausible bed counts", () => {
    expect(parseLayout("20 Bed / 5 Bath").beds).toBeNull();
  });
});
