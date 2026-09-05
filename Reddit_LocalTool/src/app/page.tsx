import Link from "next/link";
import { bootstrap } from "@/lib/data/bootstrap";
import { getMarketStats, getZoneStats } from "@/lib/stats/query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartRenderer } from "@/components/ChartRenderer";
import { fmtCurrency, SampleSizeBadge } from "@/components/StatValue";
import type { ChartResult } from "@/lib/charts/spec";

export const dynamic = "force-dynamic";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function Dashboard() {
  await bootstrap();
  const market = getMarketStats();
  const zones = getZoneStats();

  const kpis = (market.find((m) => m.metric === "kpi_totals")?.meta ?? {}) as Record<
    string,
    number
  >;
  const marketReported = market.find((m) => m.metric === "market_reported_median");

  const bedMedians: ChartResult = {
    spec: {
      title: "Market median listed rent by bed count (per person, core properties)",
      chartType: "histogram",
      metric: "listed_median",
      groupBy: "bed_count",
      filters: {},
      sort: "none",
      limit: 20,
    },
    data: market
      .filter((m) => m.metric === "market_listed_median" && m.bedCount != null && m.value != null)
      .sort((a, b) => a.bedCount! - b.bedCount!)
      .map((m) => ({ label: `${m.bedCount}br`, value: m.value!, n: m.n })),
    warnings: [],
  };

  const scatterMeta = (market.find((m) => m.metric === "distance_price_scatter")?.meta ??
    []) as Array<{ id: string; name: string; distance: number; median: number; n: number; zone: string }>;
  const scatter: ChartResult = {
    spec: {
      title: "Distance to UT Tower (mi) vs median listed rent",
      chartType: "scatter",
      metric: "listed_median",
      groupBy: "property",
      filters: {},
      sort: "none",
      limit: 150,
    },
    data: scatterMeta.map((s) => ({
      id: s.id,
      label: `${s.name} (${s.zone})`,
      value: s.median,
      n: s.n,
      extra: { x: Number(s.distance.toFixed(2)) },
    })),
    warnings: [],
  };

  const zoneRows = new Map<
    string,
    { listed?: number; listedN?: number; reported?: number; reportedN?: number; props?: number; reports?: number }
  >();
  for (const z of zones) {
    if (!z.zone) continue;
    const e = zoneRows.get(z.zone) ?? {};
    if (z.bedCount === null && z.metric === "zone_listed_median") {
      e.listed = z.value ?? undefined;
      e.listedN = z.n;
    }
    if (z.bedCount === null && z.metric === "zone_reported_median") {
      e.reported = z.value ?? undefined;
      e.reportedN = z.n;
    }
    if (z.metric === "zone_property_count") e.props = z.n;
    if (z.metric === "zone_report_count") e.reports = z.n;
    zoneRows.set(z.zone, e);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Core properties" value={String(kpis.coreProperties ?? "—")} />
        <Kpi label="Long-tail properties" value={String(kpis.longTailProperties ?? "—")} />
        <Kpi label="Listings" value={String(kpis.listings ?? "—")} />
        <Kpi label="Student reports" value={String(kpis.reports ?? "—")} />
        <Kpi
          label="Market reported median (12mo)"
          value={marketReported?.value != null ? fmtCurrency(marketReported.value) : "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <ChartRenderer result={bedMedians} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <ChartRenderer result={scatter} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Zones (core properties)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Listed median</TableHead>
                <TableHead>Reported median (12mo)</TableHead>
                <TableHead>Reports</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...zoneRows.entries()]
                .sort(([, a], [, b]) => (b.props ?? 0) - (a.props ?? 0))
                .map(([zone, e]) => (
                  <TableRow key={zone}>
                    <TableCell>
                      <Link
                        href={`/properties?zone=${encodeURIComponent(zone)}`}
                        className="font-medium hover:underline"
                      >
                        {zone}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">{e.props ?? 0}</TableCell>
                    <TableCell>
                      {e.listed != null ? (
                        <>
                          {fmtCurrency(e.listed)}
                          <SampleSizeBadge n={e.listedN ?? 0} />
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {e.reported != null ? (
                        <>
                          {fmtCurrency(e.reported)}
                          <SampleSizeBadge n={e.reportedN ?? 0} />
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {e.reports ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
