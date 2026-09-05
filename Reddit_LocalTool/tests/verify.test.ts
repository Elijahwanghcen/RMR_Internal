import { describe, it, expect } from "vitest";
import { extractNumbers, verifyDraft } from "@/lib/ai/verify";

const data = {
  properties: [
    {
      name: "X",
      stats: [
        { label: "4br listed median", value: 1630.9, n: 9 },
        { label: "4br reported median", value: 1420, n: 13 },
        { label: "delta", value: -210.9, n: 9 },
      ],
    },
  ],
};

describe("extractNumbers", () => {
  it("finds dollar amounts and percents", () => {
    const nums = extractNumbers("about $1,630/person and 8.1% less, or $1.5k");
    expect(nums.map((n) => n.value).sort((a, b) => a - b)).toEqual([8.1, 1500, 1630]);
  });
});

describe("verifyDraft", () => {
  it("passes numbers that trace to data (incl. rounding)", () => {
    const r = verifyDraft("listed is ~$1,630 but students pay ~$1,420", data);
    expect(r.ok).toBe(true);
  });
  it("matches signed deltas quoted as positive", () => {
    const r = verifyDraft("roughly $210 under the listed price", data);
    expect(r.ok).toBe(true);
  });
  it("flags invented numbers", () => {
    const r = verifyDraft("median is $999", data);
    expect(r.ok).toBe(false);
    expect(r.checks[0].matched).toBe(false);
  });
});
