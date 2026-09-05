import { describe, it, expect } from "vitest";
import { classifyLeaseTerm } from "@/lib/ingest/leaseTerm";

describe("classifyLeaseTerm", () => {
  it("full term", () => {
    expect(
      classifyLeaseTerm("Waitlist — term: Fall 2026: Full Term (08/2026 - 07/2027)")
    ).toBe("full_term");
  });
  it("immediate", () => {
    expect(classifyLeaseTerm("Available now")).toBe("immediate");
  });
  it("academic year", () => {
    expect(classifyLeaseTerm("Academic Year 2026-27")).toBe("academic_year");
  });
  it("unknown for empty", () => {
    expect(classifyLeaseTerm(null)).toBe("unknown");
    expect(classifyLeaseTerm("")).toBe("unknown");
  });
});
