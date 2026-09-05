import { describe, it, expect } from "vitest";
import { redactNote } from "@/lib/ingest/redact";

describe("redactNote", () => {
  it("redacts phone numbers", () => {
    expect(redactNote("call 512-555-1234 for info")).toContain("[phone redacted]");
    expect(redactNote("call (512) 555-1234")).toContain("[phone redacted]");
  });
  it("redacts emails", () => {
    expect(redactNote("email leasing@example.com")).toContain("[email redacted]");
  });
  it("redacts unit numbers", () => {
    expect(redactNote("I lived in unit 304 and it was loud")).toContain("[unit redacted]");
    expect(redactNote("Apt 12B has roaches")).toContain("[unit redacted]");
  });
  it("redacts named individuals", () => {
    expect(redactNote("ask for Maria in the office")).toBe(
      "ask for [name redacted] in the office"
    );
    expect(redactNote("my roommate Jake never paid")).toContain("[name redacted]");
  });
  it("leaves normal text alone", () => {
    const s = "Great pool, management slow on maintenance, worth $800.";
    expect(redactNote(s)).toBe(s);
  });
  it("handles null/empty", () => {
    expect(redactNote(null)).toBe("");
  });
});
