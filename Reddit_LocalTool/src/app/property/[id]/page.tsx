import { notFound } from "next/navigation";
import Link from "next/link";
import { bootstrap } from "@/lib/data/bootstrap";
import { getProfile } from "@/lib/data/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PricePanel, ByYearTable } from "@/components/PricePanel";
import { ReviewPanel, SurveyPanel } from "@/components/ReviewPanel";
import { fmtCurrency } from "@/components/StatValue";

export const dynamic = "force-dynamic";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await bootstrap();
  const { id } = await params;
  const bundle = getProfile(id);
  if (!bundle) notFound();
  const p = bundle.property;
  const zone = p.zoneOverride ?? p.zone;
  const listedListings = bundle.listings.filter((l) => l.priceStatus !== "not_publicly_listed");
  const unlistedCount = bundle.listings.length - listedListings.length;
  const trend = bundle.stats.find((s) => s.metric === "price_trend");
  const trendPoints = (trend?.meta ?? []) as Array<{ date: string; median: number; n: number }>;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {p.canonicalName}{" "}
            {!p.isCore && <Badge variant="outline">long tail — self-reported data only</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {p.address ?? "No address on file"}
            {p.distanceToCampusMi != null &&
              ` · ${p.distanceToCampusMi.toFixed(2)} mi to UT Tower`}
            {zone && ` · ${zone}`}
            {p.googleRating != null &&
              ` · ${p.googleRating}★ Google (${p.googleRatingCount ?? 0})`}
          </p>
          {p.websiteUrl && (
            <a
              href={p.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              {p.websiteUrl}
            </a>
          )}
        </div>
        <Link
          href={`/compare?ids=${p.id}`}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Compare +
        </Link>
      </div>

      {/* Amenity chips */}
      {p.featuresFlat && p.featuresFlat.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {p.featuresFlat.map((f) => (
            <Badge key={f} variant="secondary" className="font-normal">
              {f}
            </Badge>
          ))}
        </div>
      )}
      {p.amenitiesSummary && (
        <p className="max-w-4xl text-sm text-muted-foreground">{p.amenitiesSummary}</p>
      )}
      {p.amenitiesNotableGaps && (
        <p className="text-xs text-amber-600">Gaps: {p.amenitiesNotableGaps}</p>
      )}

      {p.isCore ? <PricePanel stats={bundle.stats} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ReviewPanel bundle={bundle} />
        <div className="space-y-4">
          <SurveyPanel bundle={bundle} />
          <ByYearTable stats={bundle.stats} />
          {trendPoints.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Listed price trend</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {trendPoints.map((tp) => (
                  <div key={tp.date} className="flex justify-between">
                    <span>{tp.date}</span>
                    <span>
                      {fmtCurrency(tp.median)} (n={tp.n})
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Listings table */}
      {bundle.listings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Current listings ({listedListings.length}
              {unlistedCount > 0 && `, +${unlistedCount} not publicly priced`})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Layout</TableHead>
                    <TableHead>Sqft</TableHead>
                    <TableHead>Base rent</TableHead>
                    <TableHead>With fees</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>Lease term</TableHead>
                    <TableHead>Concessions</TableHead>
                    <TableHead>Availability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundle.listings.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="max-w-56 truncate text-xs" title={l.unitLabel ?? ""}>
                        {l.unitLabel}
                      </TableCell>
                      <TableCell>{l.layoutDisplay ?? "—"}</TableCell>
                      <TableCell>{l.sqft ?? "—"}</TableCell>
                      <TableCell>
                        {l.priceStatus === "not_publicly_listed"
                          ? "not listed"
                          : l.priceDisplay ?? fmtCurrency(l.baseRent)}
                      </TableCell>
                      <TableCell>{fmtCurrency(l.totalPriceWithFees)}</TableCell>
                      <TableCell>{l.occupancy ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.leaseTerm}</TableCell>
                      <TableCell className="max-w-40 truncate text-xs" title={l.concessionsRaw ?? ""}>
                        {l.concessionsRaw ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-52 truncate text-xs" title={l.availability ?? ""}>
                        {l.availability ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
