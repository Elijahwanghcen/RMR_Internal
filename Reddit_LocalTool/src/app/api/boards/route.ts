import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";

export async function GET() {
  const db = getDb();
  const boards = db.select().from(t.boards).all();
  const charts = db.select().from(t.savedCharts).all();
  return NextResponse.json({ boards, charts });
}

export async function POST(req: NextRequest) {
  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const db = getDb();
  const row = db
    .insert(t.boards)
    .values({ name: name.trim(), createdAt: Date.now() })
    .returning()
    .get();
  return NextResponse.json(row);
}
