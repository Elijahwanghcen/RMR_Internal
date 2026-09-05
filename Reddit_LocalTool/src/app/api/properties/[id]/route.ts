import { NextRequest, NextResponse } from "next/server";
import { bootstrap } from "@/lib/data/bootstrap";
import { getProfile } from "@/lib/data/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await bootstrap();
  const { id } = await params;
  const bundle = getProfile(id);
  if (!bundle) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(bundle);
}
