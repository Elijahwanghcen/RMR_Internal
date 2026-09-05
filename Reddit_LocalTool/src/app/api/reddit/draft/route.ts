import { NextRequest, NextResponse } from "next/server";
import { bootstrap } from "@/lib/data/bootstrap";
import { draftRedditReply } from "@/lib/ai/redditService";
import { AiError } from "@/lib/ai/claudeCli";

export async function POST(req: NextRequest) {
  await bootstrap();
  const { question, tone } = (await req.json()) as {
    question?: string;
    tone?: "casual" | "neutral";
  };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }
  try {
    const result = await draftRedditReply(question, tone ?? "casual");
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof AiError ? 502 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
