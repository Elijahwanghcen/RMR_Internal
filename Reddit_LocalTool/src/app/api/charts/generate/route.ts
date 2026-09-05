import { NextRequest, NextResponse } from "next/server";
import { bootstrap } from "@/lib/data/bootstrap";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { runClaudeJson, AiError } from "@/lib/ai/claudeCli";
import { buildChartSpecPrompt } from "@/lib/ai/prompts/chartSpec";
import { chartSpecSchema } from "@/lib/charts/spec";
import { runChartSpec } from "@/lib/stats/query";

export async function POST(req: NextRequest) {
  await bootstrap();
  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }
  const db = getDb();
  const names = db
    .select({ name: t.properties.canonicalName, isCore: t.properties.isCore })
    .from(t.properties)
    .all()
    .filter((p) => p.isCore)
    .map((p) => p.name);
  try {
    const spec = await runClaudeJson({
      prompt: buildChartSpecPrompt(prompt, names),
      schema: chartSpecSchema,
      timeoutMs: 90_000,
    });
    return NextResponse.json(runChartSpec(spec));
  } catch (err) {
    const status = err instanceof AiError ? 502 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
