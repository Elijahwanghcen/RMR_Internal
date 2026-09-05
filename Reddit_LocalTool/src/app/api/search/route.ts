import { NextRequest, NextResponse } from "next/server";
import { bootstrap } from "@/lib/data/bootstrap";
import { searchProperties } from "@/lib/data/queries";

export async function GET(req: NextRequest) {
  await bootstrap();
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ hits: searchProperties(q) });
}
