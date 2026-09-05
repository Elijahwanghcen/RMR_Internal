import Link from "next/link";
import { bootstrap } from "@/lib/data/bootstrap";
import { listProperties } from "@/lib/data/queries";
import { zoneNames } from "@/lib/geo/zones";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatValue } from "@/components/StatValue";

export const dynamic = "force-dynamic";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string; all?: string }>;
}) {
  await bootstrap();
  const { zone, all } = await searchParams;
  const showAll = all === "1";
  const items = listProperties({ coreOnly: !showAll, zone: zone || undefined });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Properties <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
        </h1>
        <div className="flex flex-wrap gap-1 text-xs">
          <Link
            href={`/properties${showAll ? "?all=1" : ""}`}
            className={!zone ? "rounded bg-primary px-2 py-1 text-primary-foreground" : "rounded border px-2 py-1"}
          >
            All zones
          </Link>
          {zoneNames().map((z) => (
            <Link
              key={z}
              href={`/properties?zone=${encodeURIComponent(z)}${showAll ? "&all=1" : ""}`}
              className={zone === z ? "rounded bg-primary px-2 py-1 text-primary-foreground" : "rounded border px-2 py-1"}
            >
              {z}
            </Link>
          ))}
          <Link
            href={showAll ? "/properties" : "/properties?all=1"}
            className="rounded border px-2 py-1 text-muted-foreground"
          >
            {showAll ? "core only" : "+ long tail"}
          </Link>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Property</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Distance</TableHead>
            <TableHead>Listed median</TableHead>
            <TableHead>Reported median</TableHead>
            <TableHead>Reports</TableHead>
            <TableHead>Google</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link href={`/property/${p.id}`} className="font-medium hover:underline">
                  {p.canonicalName}
                </Link>{" "}
                {!p.isCore && <Badge variant="outline">LT</Badge>}
              </TableCell>
              <TableCell className="text-muted-foreground">{p.zone ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {p.distanceToCampusMi != null ? `${p.distanceToCampusMi.toFixed(1)} mi` : "—"}
              </TableCell>
              <TableCell>
                <StatValue value={p.listedMedian} n={p.listedN} />
              </TableCell>
              <TableCell>
                <StatValue value={p.reportedMedian} n={p.reportedN} />
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{p.reportCount}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {p.googleRating != null ? `${p.googleRating}★` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
