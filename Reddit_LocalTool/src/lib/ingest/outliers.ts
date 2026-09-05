// 1.5×IQR outlier flagging on per-person rent, per (property, beds, occupancy-class)
// group when n>=4; smaller groups fall back to a global per-bed-count fence.

export interface OutlierRow {
  id: string;
  propertyId: string | null;
  beds: number | null;
  sharedOccupancy: boolean;
  rentPerPerson: number | null;
}

const MIN_GROUP_N = 4;

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function iqrFence(values: number[]): { lo: number; hi: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const p25 = quantile(sorted, 0.25);
  const p75 = quantile(sorted, 0.75);
  const iqr = p75 - p25;
  return { lo: p25 - 1.5 * iqr, hi: p75 + 1.5 * iqr };
}

/** Returns the set of row ids flagged as outliers. */
export function flagOutliers(rows: OutlierRow[]): Set<string> {
  const flagged = new Set<string>();
  const usable = rows.filter((r) => r.rentPerPerson != null);

  const groups = new Map<string, OutlierRow[]>();
  for (const r of usable) {
    const key = `${r.propertyId}|${r.beds}|${r.sharedOccupancy ? "s" : "p"}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }

  // Global per-bed-count fences for small groups.
  const byBed = new Map<number | null, number[]>();
  for (const r of usable) {
    (byBed.get(r.beds) ?? byBed.set(r.beds, []).get(r.beds)!).push(r.rentPerPerson!);
  }
  const globalFences = new Map<number | null, { lo: number; hi: number }>();
  for (const [beds, vals] of byBed) {
    if (vals.length >= MIN_GROUP_N) globalFences.set(beds, iqrFence(vals));
  }

  for (const group of groups.values()) {
    let fence: { lo: number; hi: number } | undefined;
    if (group.length >= MIN_GROUP_N) {
      fence = iqrFence(group.map((r) => r.rentPerPerson!));
    } else {
      fence = globalFences.get(group[0].beds);
    }
    if (!fence) continue;
    for (const r of group) {
      const v = r.rentPerPerson!;
      if (v < fence.lo || v > fence.hi) flagged.add(r.id);
    }
  }
  return flagged;
}
