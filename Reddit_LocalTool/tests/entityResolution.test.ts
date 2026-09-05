import { describe, it, expect } from "vitest";
import { EntityResolver } from "@/lib/ingest/entityResolution";

const candidates = [
  { id: "castilian", canonicalName: "The Castilian" },
  { id: "26west", canonicalName: "26 West" },
  { id: "21rio", canonicalName: "21 Rio" },
  { id: "21pearl", canonicalName: "21 Pearl" },
  { id: "quarters-grayson", canonicalName: "Quarters on Campus – Grayson" },
  { id: "envoy", canonicalName: "Envoy Apartments" },
  { id: "rise", canonicalName: "Rise at West Campus" },
  { id: "union24", canonicalName: "Union on 24th" },
];

describe("EntityResolver", () => {
  const r = new EntityResolver(candidates);

  it("exact match after normalization", () => {
    expect(r.resolve("castillian apts".replace("ll", "l")).propertyId).toBe("castilian");
    expect(r.resolve("The Castilian").method).toBe("exact");
    expect(r.resolve("Union on 24th").propertyId).toBe("union24");
  });

  it("fuzzy auto-accepts high-confidence variants", () => {
    const res = r.resolve("26west");
    expect(res.propertyId).toBe("26west");
    expect(res.method).toBe("fuzzy");
  });

  it("does not cross-match similar real properties", () => {
    // 22 Rio is a DIFFERENT building than 21 Rio — must not auto-accept
    const res = r.resolve("22 Rio");
    expect(res.method).toBe("unmatched");
  });

  it("routes typo-band names to review with best candidate", () => {
    const res = r.resolve("Enovy Apartments");
    expect(res.method).toBe("unmatched");
    expect(res.bestCandidateId).toBe("envoy");
    expect(res.bestScore).toBeGreaterThanOrEqual(78);
  });

  it("alias overrides beat everything", () => {
    const r2 = new EntityResolver(candidates, { "22 Rio": "21rio" });
    const res = r2.resolve("22 Rio");
    expect(res.propertyId).toBe("21rio");
    expect(res.method).toBe("alias");
  });

  it("unrelated names get no candidate", () => {
    const res = r.resolve("Kappa Kappa Gamma House");
    expect(res.method).toBe("unmatched");
    expect(res.propertyId).toBeNull();
  });
});
