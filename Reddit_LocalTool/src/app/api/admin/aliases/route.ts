import { NextRequest, NextResponse } from "next/server";
import { bootstrap } from "@/lib/data/bootstrap";
import { loadAliases, saveAliases } from "@/lib/ingest/aliasesFile";
import { defaultPaths } from "@/lib/ingest/pipeline";
import { ensureFreshData } from "@/lib/ingest/refresh";

export async function GET() {
  await bootstrap();
  const { dataDir } = defaultPaths();
  return NextResponse.json({ aliases: loadAliases(dataDir) });
}

export async function POST(req: NextRequest) {
  const { alias, propertyId } = (await req.json()) as { alias?: string; propertyId?: string };
  if (!alias || !propertyId) {
    return NextResponse.json({ error: "alias and propertyId required" }, { status: 400 });
  }
  const { dataDir } = defaultPaths();
  const aliases = loadAliases(dataDir);
  aliases[alias] = propertyId;
  saveAliases(dataDir, aliases);
  await ensureFreshData(true);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const alias = req.nextUrl.searchParams.get("alias");
  if (!alias) return NextResponse.json({ error: "alias required" }, { status: 400 });
  const { dataDir } = defaultPaths();
  const aliases = loadAliases(dataDir);
  delete aliases[alias];
  saveAliases(dataDir, aliases);
  await ensureFreshData(true);
  return NextResponse.json({ ok: true });
}
