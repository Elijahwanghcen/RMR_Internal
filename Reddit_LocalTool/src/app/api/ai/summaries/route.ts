import { NextRequest, NextResponse } from "next/server";
import { bootstrap } from "@/lib/data/bootstrap";
import { runSummaryBatch, batchStatus } from "@/lib/ai/reviewBatch";

export async function POST(req: NextRequest) {
  await bootstrap();
  const body = (await req.json().catch(() => ({}))) as { propertyIds?: string[] };
  const state = await runSummaryBatch(body.propertyIds);
  return NextResponse.json(state);
}

export async function GET() {
  return NextResponse.json(batchStatus());
}
