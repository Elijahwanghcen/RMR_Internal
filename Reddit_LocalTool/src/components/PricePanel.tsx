import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatValue, fmtCurrency, SampleSizeBadge } from "@/components/StatValue";
import type { StatEntry } from "@/lib/stats/query";

// Listed (base rent) vs student-reported (last 12mo) per-person rent by bed
// count, with the delta front and center. Shared occupancy is its own line.

function pick(stats: StatEntry[], bed: number | null, metric: string) {
  return stats.find((s) => s.bedCount === bed && s.metric === metric);
}

export function PricePanel({ stats }: { stats: StatEntry[] }) {
  const beds = [...new Set(stats.filter((s) => s.bedCount != null).map((s) => s.bedCount!))].sort(
    (a, b) => a - b
  );

  const allDelta = pick(stats, null, "delta_median");
  const feeMedianAll = pick(stats, null, "with_fees_median");
  const unknownBasis = pick(stats, null, "listed_n_unknown_basis");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-baseline justify-between text-base">
          <span>Price: listed vs what students actually pay</span>
          {allDelta?.value != null && (
            <span
              className={
                allDelta.value <= 0
                  ? "text-sm font-semibold text-emerald-600"
                  : "text-sm font-semibold text-red-500"
              }
            >
              students report paying ~{fmtCurrency(Math.abs(allDelta.value))}{" "}
              {allDelta.value <= 0 ? "less" : "more"} than listed
              <SampleSizeBadge n={allDelta.n} />
            </span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Per-person, base rent basis. Reported = leases signed in the last 12 months.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Beds</TableHead>
              <TableHead>Listed median</TableHead>
              <TableHead>Listed p25–p75</TableHead>
              <TableHead>Reported median</TableHead>
              <TableHead>Reported p25–p75</TableHead>
              <TableHead>Δ (reported − listed)</TableHead>
              <TableHead>Shared-occupancy avg</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beds.map((bed) => {
              const lm = pick(stats, bed, "listed_median");
              const lp25 = pick(stats, bed, "listed_p25");
              const lp75 = pick(stats, bed, "listed_p75");
              const rm = pick(stats, bed, "reported_median");
              const rp25 = pick(stats, bed, "reported_p25");
              const rp75 = pick(stats, bed, "reported_p75");
              const dm = pick(stats, bed, "delta_median");
              const sl = pick(stats, bed, "shared_listed_avg");
              const sr = pick(stats, bed, "shared_reported_avg");
              if (!lm && !rm && !sl && !sr) return null;
              return (
                <TableRow key={bed}>
                  <TableCell className="font-medium">
                    {bed === 0 ? "Studio" : `${bed} br`}
                  </TableCell>
                  <TableCell>
                    <StatValue value={lm?.value} n={lm?.n ?? 0} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lp25?.value != null && lp75?.value != null
                      ? `${fmtCurrency(lp25.value)}–${fmtCurrency(lp75.value)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatValue value={rm?.value} n={rm?.n ?? 0} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rp25?.value != null && rp75?.value != null
                      ? `${fmtCurrency(rp25.value)}–${fmtCurrency(rp75.value)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {dm?.value != null ? (
                      <span
                        className={dm.value <= 0 ? "text-emerald-600" : "text-red-500"}
                      >
                        {dm.value > 0 ? "+" : "−"}
                        {fmtCurrency(Math.abs(dm.value))}
                        <SampleSizeBadge n={dm.n} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {sl?.value != null || sr?.value != null ? (
                      <span className="text-xs">
                        {sl?.value != null && (
                          <>listed {fmtCurrency(sl.value)}<SampleSizeBadge n={sl.n} /></>
                        )}
                        {sl?.value != null && sr?.value != null && " · "}
                        {sr?.value != null && (
                          <>reported {fmtCurrency(sr.value)}<SampleSizeBadge n={sr.n} /></>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            {feeMedianAll?.value != null
              ? `Estimated with-fees median: ${fmtCurrency(feeMedianAll.value)} (n=${feeMedianAll.n})`
              : "No mandatory-fee pricing listed for this property."}
          </span>
          {unknownBasis != null && unknownBasis.n > 0 && (
            <span>{unknownBasis.n} listings excluded (price basis unknown).</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ByYearTable({ stats }: { stats: StatEntry[] }) {
  const byYear = stats.find((s) => s.bedCount === null && s.metric === "reported_by_year");
  if (!byYear?.meta) return null;
  const entries = Object.entries(byYear.meta as Record<string, { median: number; n: number }>).sort(
    ([a], [b]) => b.localeCompare(a)
  );
  if (entries.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reported rent by signing year</CardTitle>
        <p className="text-xs text-muted-foreground">
          All history (incl. shared/old leases) — context only, not the headline number.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Signed</TableHead>
              <TableHead>Median per-person</TableHead>
              <TableHead>Reports</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([year, v]) => (
              <TableRow key={year}>
                <TableCell>{year}</TableCell>
                <TableCell>
                  <StatValue value={v.median} n={v.n} />
                </TableCell>
                <TableCell className="text-muted-foreground">{v.n}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
