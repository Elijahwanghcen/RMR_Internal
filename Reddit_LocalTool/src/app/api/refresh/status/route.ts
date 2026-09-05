import { NextResponse } from "next/server";
import { refreshStatus } from "@/lib/ingest/refresh";

export async function GET() {
  return NextResponse.json(refreshStatus());
}
