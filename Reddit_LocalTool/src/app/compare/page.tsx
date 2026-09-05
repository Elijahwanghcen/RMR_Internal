import Link from "next/link";
import { bootstrap } from "@/lib/data/bootstrap";
import { getProfile, listProperties } from "@/lib/data/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatValue, fmtCurrency, SampleSizeBadge } from "@/components/StatValue";
import { ComparePicker } from "@/components/ComparePicker";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  await bootstrap();
  const { ids } = await searchParams;
  const idList = (ids ?? "").split(",").filter(Boolean).slice(0, 5);
  const bundles = idList
    .map((id) => getProfile(id))
    .filter((b): b is NonNullable<typeof b> => b != null);
  const all = listProperties({});

  const pick = (b: (typeof bundles)[number], bed: number | null, metric: string) =>
    b.stats.find((s) => s.bedCount === bed && s.metric === metric);

  const bedSet = new Set<number>();
  for (const b of bundles)
    for (const s of b.stats) if (s.bedCount != null) bedSet.add(s.bedCount);
  const beds = [...bedSet].sort((a, b) => a - b);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
        <ComparePicker
          options={all.map((p) => ({ id: p.id, name: p.canonicalName }))}
          selected={idList}
        />
      </div>

      {bundles.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Pick 2–5 properties to compare (use the picker or “Compare +” on any profile).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-44 border-b p-2 text-left text-xs text-muted-foreground">
                  Metric
                </th>
                {bundles.map((b) => (
                  <th key={b.property.id} className="border-b p-2 text-left">
                    <Link href={`/property/${b.property.id}`} className="hover:underline">
                      {b.property.canonicalName}
                    </Link>
                    {!b.property.isCore && (
                      <Badge variant="outline" className="ml-1">
                        LT
                      </Badge>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b p-2 text-xs text-muted-foreground">Zone / distance</td>
                {bundles.map((b) => (
                  <td key={b.property.id} className="border-b p-2">
                    {(b.property.zoneOverride ?? b.property.zone) || "—"}
                    {b.property.distanceToCampusMi != null &&
                      ` · ${b.property.distanceToCampusMi.toFixed(2)} mi`}
                  </td>
                ))}
              </tr>
              {beds.map((bed) => (
                <tr key={`l${bed}`}>
                  <td className="border-b p-2 text-xs text-muted-foreground">
                    {bed === 0 ? "Studio" : `${bed}br`} listed / reported
                  </td>
                  {bundles.map((b) => {
                    const lm = pick(b, bed, "listed_median");
                    const rm = pick(b, bed, "reported_median");
                    return (
                      <td key={b.property.id} className="border-b p-2">
                        <StatValue value={lm?.value} n={lm?.n ?? 0} />
                        {" / "}
                        <StatValue value={rm?.value} n={rm?.n ?? 0} />
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="border-b p-2 text-xs text-muted-foreground">Δ reported − listed</td>
                {bundles.map((b) => {
                  const d = pick(b, null, "delta_median");
                  return (
                    <td key={b.property.id} className="border-b p-2">
                      {d?.value != null ? (
                        <span className={d.value <= 0 ? "text-emerald-600" : "text-red-500"}>
                          {d.value > 0 ? "+" : "−"}
                          {fmtCurrency(Math.abs(d.value))}
                          <SampleSizeBadge n={d.n} />
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="border-b p-2 text-xs text-muted-foreground">Sentiment</td>
                {bundles.map((b) => {
                  const s = pick(b, null, "sentiment");
                  return (
                    <td key={b.property.id} className="border-b p-2">
                      {s?.value != null ? s.value.toFixed(2) : "—"}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="border-b p-2 text-xs text-muted-foreground">Ratings</td>
                {bundles.map((b) => {
                  const g = b.property.googleRating;
                  const a = pick(b, null, "app_rating_avg");
                  return (
                    <td key={b.property.id} className="border-b p-2 text-xs">
                      {g != null ? `${g}★ Google` : ""}
                      {g != null && a?.value != null ? " · " : ""}
                      {a?.value != null ? `${a.value.toFixed(1)}★ RMR (n=${a.n})` : ""}
                      {g == null && a?.value == null && "—"}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="border-b p-2 text-xs text-muted-foreground">Reports</td>
                {bundles.map((b) => (
                  <td key={b.property.id} className="border-b p-2 tabular-nums">
                    {b.reports.length}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 align-top text-xs text-muted-foreground">Amenities</td>
                {bundles.map((b) => (
                  <td key={b.property.id} className="p-2">
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {(b.property.featuresFlat ?? []).slice(0, 12).map((f) => (
                        <Badge key={f} variant="secondary" className="font-normal">
                          {f}
                        </Badge>
                      ))}
                      {(b.property.featuresFlat?.length ?? 0) > 12 && (
                        <span className="text-xs text-muted-foreground">
                          +{b.property.featuresFlat!.length - 12} more
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
