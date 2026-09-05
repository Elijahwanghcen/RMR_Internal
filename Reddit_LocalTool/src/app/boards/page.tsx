"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartRenderer } from "@/components/ChartRenderer";
import type { ChartSpec, ChartResult } from "@/lib/charts/spec";

interface SavedChart {
  id: number;
  title: string;
  chartSpec: ChartSpec;
}

export default function BoardsPage() {
  const [charts, setCharts] = React.useState<SavedChart[]>([]);
  const [results, setResults] = React.useState<Record<number, ChartResult>>({});

  const load = React.useCallback(async () => {
    const res = await fetch("/api/boards");
    const json = await res.json();
    setCharts(json.charts ?? []);
    // run each saved spec
    const out: Record<number, ChartResult> = {};
    await Promise.all(
      (json.charts ?? []).map(async (c: SavedChart) => {
        const r = await fetch("/api/charts/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spec: c.chartSpec }),
        });
        if (r.ok) out[c.id] = await r.json();
      })
    );
    setResults(out);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: number) => {
    await fetch(`/api/boards/charts?id=${id}`, { method: "DELETE" });
    toast.success("Removed");
    load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Pinned boards</h1>
      {charts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No saved charts yet. Generate one in the Charts tab and hit “Save to board.”
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {charts.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-2 pt-4">
                {results[c.id] ? (
                  <ChartRenderer result={results[c.id]} />
                ) : (
                  <div className="h-40 animate-pulse rounded bg-muted" />
                )}
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
