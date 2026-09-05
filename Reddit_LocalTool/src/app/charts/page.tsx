"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ChartRenderer } from "@/components/ChartRenderer";
import type { ChartResult } from "@/lib/charts/spec";

interface HistoryItem {
  prompt: string;
  result: ChartResult;
}

export default function ChartsPage() {
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [specDraft, setSpecDraft] = React.useState<string | null>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/charts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "generation failed");
      setHistory((h) => [{ prompt, result: json }, ...h]);
      setSpecDraft(null);
      setPrompt("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const rerunSpec = async () => {
    if (!specDraft) return;
    try {
      const spec = JSON.parse(specDraft);
      const res = await fetch("/api/charts/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "run failed");
      setHistory((h) => [{ prompt: "(edited spec)", result: json }, ...h]);
      setSpecDraft(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const saveToBoard = async (result: ChartResult) => {
    const res = await fetch("/api/boards/charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spec: result.spec }),
    });
    if (res.ok) toast.success("Saved — see Boards");
    else toast.error("Save failed");
  };

  const exportPng = async () => {
    if (!chartRef.current) return;
    const dataUrl = await toPng(chartRef.current, {
      backgroundColor: "white",
      pixelRatio: 2,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "chart.png";
    a.click();
  };

  const latest = history[0];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">AI chart hub</h1>
      <p className="text-sm text-muted-foreground">
        Describe a chart; Claude writes a query spec (never numbers) and the app runs it against the
        stats layer.
      </p>
      <div className="flex gap-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
          }}
          placeholder='e.g. "bar chart of median 4br per-person rent in West Campus, sorted ascending"'
          className="min-h-16"
        />
        <Button onClick={generate} disabled={loading} className="self-end">
          {loading ? "Thinking…" : "Generate"}
        </Button>
      </div>

      {latest && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div ref={chartRef} className="bg-background p-2">
              <ChartRenderer result={latest.result} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => saveToBoard(latest.result)}>
                Save to board
              </Button>
              <Button variant="outline" size="sm" onClick={exportPng}>
                Export PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSpecDraft(
                    specDraft === null ? JSON.stringify(latest.result.spec, null, 2) : null
                  )
                }
              >
                {specDraft === null ? "Edit spec" : "Close editor"}
              </Button>
            </div>
            {specDraft !== null && (
              <div className="space-y-2">
                <Textarea
                  value={specDraft}
                  onChange={(e) => setSpecDraft(e.target.value)}
                  className="min-h-48 font-mono text-xs"
                />
                <Button size="sm" onClick={rerunSpec}>
                  Run edited spec
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {history.slice(1).map((h, i) => (
        <Card key={i}>
          <CardContent className="pt-4">
            <p className="mb-2 text-xs text-muted-foreground">“{h.prompt}”</p>
            <ChartRenderer result={h.result} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
