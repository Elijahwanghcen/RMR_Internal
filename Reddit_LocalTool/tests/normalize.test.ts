import { describe, it, expect } from "vitest";
import { normalizeName } from "@/lib/ingest/normalize";

describe("normalizeName", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeName("The Castilian!")).toBe("castilian");
  });
  it("drops leading 'the'", () => {
    expect(normalizeName("The Block on Rio")).toBe("block on rio");
  });
  it("drops trailing stopwords", () => {
    expect(normalizeName("Texan West Campus Apartments")).toBe("texan west campus");
    expect(normalizeName("Vanderbilt Condominiums")).toBe("vanderbilt");
    expect(normalizeName("Rambler Apartments")).toBe("rambler");
  });
  it("keeps disambiguators House/Tower/Lofts", () => {
    expect(normalizeName("1883 at Cameron House")).toBe("1883 at cameron house");
    expect(normalizeName("Callaway House")).toBe("callaway house");
    expect(normalizeName("Tower Lofts")).toBe("tower lofts");
  });
  it("never strips to empty", () => {
    expect(normalizeName("Apartments")).toBe("apartments");
  });
  it("collapses whitespace and diacritics", () => {
    expect(normalizeName("  Ión   Austin ")).toBe("ion");
  });
});
