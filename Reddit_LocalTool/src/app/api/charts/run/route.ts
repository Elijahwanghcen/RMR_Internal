import { NextRequest, NextResponse } from "next/server";
import { bootstrap } from "@/lib/data/bootstrap";
import { chartSpecSchema } from "@/lib/charts/spec";
import { runChartSpec } from "@/lib/stats/query";

export async function POST(req: NextRequest) {
  await bootstrap();
  const body = await req.json();
  const parsed = chartSpecSchema.safeParse(body.spec ?? body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  return NextResponse.json(runChartSpec(parsed.data));
}
