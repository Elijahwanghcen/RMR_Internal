import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { bootstrap } from "@/lib/data/bootstrap";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { eq } from "drizzle-orm";
import { listProperties } from "@/lib/data/queries";

// Export any core table/view as CSV.
export async function GET(req: NextRequest) {
  await bootstrap();
  const view = req.nextUrl.searchParams.get("view") ?? "properties";
  const db = getDb();

  let rows: Record<string, unknown>[] = [];
  let filename = view;

  if (view === "properties") {
    rows = listProperties({ coreOnly: false }) as unknown as Record<string, unknown>[];
  } else if (view === "listings") {
    rows = db.select().from(t.listings).all() as unknown as Record<string, unknown>[];
  } else if (view === "reports") {
    // never export the raw (un-redacted) note column
    rows = db
      .select()
      .from(t.studentReports)
      .all()
      .map(({ noteRaw: _n, ...rest }) => rest) as unknown as Record<string, unknown>[];
  } else if (view === "stats") {
    rows = db.select().from(t.statsCache).all() as unknown as Record<string, unknown>[];
  } else if (view.startsWith("property:")) {
    const id = view.slice("property:".length);
    filename = `property-${id}`;
    rows = db.select().from(t.listings).where(eq(t.listings.propertyId, id)).all() as unknown as Record<
      string,
      unknown
    >[];
  } else {
    return NextResponse.json({ error: "unknown view" }, { status: 400 });
  }

  // flatten JSON-valued columns for CSV
  const flat = rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      o[k] = v != null && typeof v === "object" ? JSON.stringify(v) : v;
    }
    return o;
  });

  const csv = Papa.unparse(flat);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
