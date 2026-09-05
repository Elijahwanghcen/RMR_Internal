import { describe, it, expect } from "vitest";
import { zoneFor } from "@/lib/geo/zones";
import { distanceToCampusMi } from "@/lib/geo/haversine";

describe("zoneFor", () => {
  it("assigns known anchors", () => {
    expect(zoneFor(30.2924, -97.7438)).toBe("West Campus"); // 1883 at Cameron
    expect(zoneFor(30.2856, -97.7467)).toBe("West Campus"); // Block on Pearl South
  });
  it("falls back to Other", () => {
    expect(zoneFor(30.5, -97.9)).toBe("Other");
    expect(zoneFor(null, null)).toBe("Other");
  });
});

describe("distanceToCampusMi", () => {
  it("is ~0 at the Tower", () => {
    expect(distanceToCampusMi(30.2862, -97.7394)).toBeLessThan(0.01);
  });
  it("West Campus is under a mile", () => {
    const d = distanceToCampusMi(30.2856, -97.7467);
    expect(d).toBeGreaterThan(0.2);
    expect(d).toBeLessThan(1);
  });
});
