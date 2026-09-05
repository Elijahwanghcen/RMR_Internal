"use client";

import * as React from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RedditDraftResult } from "@/lib/ai/redditService";

export default function RedditPage() {
  const [question, setQuestion] = React.useState("");
  const [tone, setTone] = React.useState<"casual" | "neutral">("casual");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<RedditDraftResult | null>(null);

  const generate = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/reddit/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, tone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "draft failed");
      setResult(json);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyDraft = () => {
    if (result) {
      navigator.clipboard.writeText(result.draft);
      toast.success("Draft copied");
    }
  };

  const copyCliCommand = () => {
    // spec 3.4: hand the whole thing to a local claude CLI session
    const cmd = `claude "Here's a Reddit housing question and my data-backed draft. Question: ${question.replace(/"/g, "'")} --- Draft: ${(result?.draft ?? "").replace(/"/g, "'")} --- Improve the draft, keep every number exactly as-is."`;
    navigator.clipboard.writeText(cmd);
    toast.success("CLI command copied — paste in a terminal");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Reddit response composer</h1>
      <p className="text-sm text-muted-foreground">
        Paste a housing question. The draft uses ONLY retrieved stats and quotes; every number is
        verified against the data shown next to it.
      </p>

      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Paste the Reddit question here…"
        className="min-h-28"
      />
      <div className="flex items-center gap-2">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as "casual" | "neutral")}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          <option value="casual">casual reddit voice</option>
          <option value="neutral">neutral/factual</option>
        </select>
        <Button onClick={generate} disabled={loading}>
          {loading ? "Retrieving + drafting…" : "Draft reply"}
        </Button>
      </div>

      {result && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                Draft
                <span className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyDraft}>
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyCliCommand}>
                    Copy Claude CLI command
                  </Button>
                </span>
              </CardTitle>
              <div className="flex flex-wrap gap-1 pt-1">
                {result.entities.properties.map((p) => (
                  <Link key={p.id} href={`/property/${p.id}`}>
                    <Badge variant="secondary">{p.name}</Badge>
                  </Link>
                ))}
                {result.entities.zones.map((z) => (
                  <Badge key={z} variant="outline">
                    {z}
                  </Badge>
                ))}
                {result.entities.bedCounts.map((b) => (
                  <Badge key={b} variant="outline">
                    {b === 0 ? "studio" : `${b}br`}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                {result.draft}
              </p>
              <div
                className={
                  result.verification.ok
                    ? "rounded-md border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    : "rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                }
              >
                {result.verification.ok
                  ? `✓ All ${result.verification.checks.length} numbers trace to the data block.`
                  : "✗ Some numbers do NOT trace to the data — verify before posting:"}
                {!result.verification.ok && (
                  <ul className="mt-1 list-disc pl-4">
                    {result.verification.checks
                      .filter((c) => !c.matched)
                      .map((c, i) => (
                        <li key={i}>{c.text} — not found in retrieved stats</li>
                      ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evidence (the full DATA block)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {result.data.properties.map((p) => (
                <div key={p.name} className="rounded border p-2">
                  <p className="font-semibold">
                    {p.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      {p.zone} · {p.distanceMi != null && `${p.distanceMi} mi`}{" "}
                      {p.googleRating != null && `· ${p.googleRating}★`}
                    </span>
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {p.stats.map((s, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{s.label}</span>
                        <span className="tabular-nums">
                          {s.value} (n={s.n})
                        </span>
                      </li>
                    ))}
                  </ul>
                  {p.concessions.length > 0 && (
                    <p className="mt-1 text-amber-600">Concessions: {p.concessions.join("; ")}</p>
                  )}
                  {p.quotes.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-muted-foreground">
                        {p.quotes.length} quotes
                      </summary>
                      {p.quotes.map((q) => (
                        <p key={q.id} className="mt-1 border-l-2 pl-2 text-muted-foreground">
                          {q.text}
                        </p>
                      ))}
                    </details>
                  )}
                </div>
              ))}
              {result.data.market.length > 0 && (
                <div className="rounded border border-dashed p-2">
                  <p className="font-semibold">Market context</p>
                  <ul className="mt-1 space-y-0.5">
                    {result.data.market.map((s, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{s.label}</span>
                        <span className="tabular-nums">
                          {s.value} (n={s.n})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
