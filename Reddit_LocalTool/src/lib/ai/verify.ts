// Structural grounding check: every dollar figure and percentage in a draft
// must trace to the DATA block (within rounding tolerance).

export interface VerifyResult {
  ok: boolean;
  checks: Array<{ text: string; value: number; matched: boolean }>;
}

export function extractNumbers(draft: string): Array<{ text: string; value: number }> {
  const out: Array<{ text: string; value: number }> = [];
  const dollarRe = /\$\s?([\d,]+(?:\.\d+)?)(k?)/gi;
  let m: RegExpExecArray | null;
  while ((m = dollarRe.exec(draft))) {
    let v = parseFloat(m[1].replace(/,/g, ""));
    if (m[2].toLowerCase() === "k") v *= 1000;
    out.push({ text: m[0], value: v });
  }
  const pctRe = /(\d+(?:\.\d+)?)\s?%/g;
  while ((m = pctRe.exec(draft))) {
    out.push({ text: m[0], value: parseFloat(m[1]) });
  }
  return out;
}

/** Collect every numeric leaf from the DATA block. */
export function collectDataValues(data: unknown): number[] {
  const vals: number[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) vals.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(data);
  return vals;
}

export function verifyDraft(draft: string, data: unknown): VerifyResult {
  const dataVals = collectDataValues(data);
  const numbers = extractNumbers(draft);
  const checks = numbers.map(({ text, value }) => {
    // rounding tolerance: within $10 absolute or 1.5% relative.
    // Compare against |dv| too — deltas are stored signed but quoted as
    // "$210 less/under".
    const matched = dataVals.some((dv) => {
      const a = Math.abs(dv);
      return (
        Math.abs(a - value) <= 10 || (a !== 0 && Math.abs(a - value) / a <= 0.015)
      );
    });
    return { text, value, matched };
  });
  return { ok: checks.every((c) => c.matched), checks };
}
