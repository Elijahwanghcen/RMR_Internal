import { NextRequest, NextResponse } from "next/server";
import { ensureFreshData } from "@/lib/ingest/refresh";

export async function POST(req: NextRequest) {
  const force = req.nextUrl.searchParams.get("force") === "1";
  try {
    const result = await ensureFreshData(force);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
