import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { chartSpecSchema } from "@/lib/charts/spec";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { boardId?: number | null; title?: string; spec?: unknown };
  const parsed = chartSpecSchema.safeParse(body.spec);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid spec" }, { status: 400 });
  }
  const db = getDb();
  const row = db
    .insert(t.savedCharts)
    .values({
      boardId: body.boardId ?? null,
      title: body.title?.trim() || parsed.data.title,
      chartSpec: parsed.data,
      createdAt: Date.now(),
    })
    .returning()
    .get();
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  getDb().delete(t.savedCharts).where(eq(t.savedCharts.id, id)).run();
  return NextResponse.json({ ok: true });
}
