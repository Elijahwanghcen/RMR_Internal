"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UnmatchedRow {
  normName: string;
  rawName: string;
  sources: { submissions?: number; ratings?: number; surveys?: number } | null;
  bestCandidateId: string | null;
  bestCandidateName: string | null;
  bestScore: number | null;
  status: string;
}
interface Candidate {
  id: string;
  name: string;
}

export default function AdminPage() {
  const [status, setStatus] = React.useState<Record<string, unknown> | null>(null);
  const [unmatched, setUnmatched] = React.useState<UnmatchedRow[]>([]);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [batch, setBatch] = React.useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = React.useState(false);

  const loadAll = React.useCallback(async () => {
    const [s, u, b] = await Promise.all([
      fetch("/api/refresh/status").then((r) => r.json()),
      fetch("/api/admin/unmatched").then((r) => r.json()),
      fetch("/api/ai/summaries").then((r) => r.json()),
    ]);
    setStatus(s);
    setUnmatched(u.rows ?? []);
    setCandidates(u.candidates ?? []);
    setBatch(b);
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  // poll batch progress while running
  React.useEffect(() => {
    if (!batch?.running) return;
    const t = setInterval(async () => {
      const b = await fetch("/api/ai/summaries").then((r) => r.json());
      setBatch(b);
      if (!b.running) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
  }, [batch?.running]);

  const forceRefresh = async () => {
    setBusy(true);
    try {
      await fetch("/api/admin/refresh?force=1", { method: "POST" });
      toast.success("Re-ingested");
      loadAll();
    } finally {
      setBusy(false);
    }
  };

  const runBatch = async () => {
    const b = await fetch("/api/ai/summaries", { method: "POST" }).then((r) => r.json());
    setBatch(b);
    toast.info("Summary batch started");
  };

  const resolve = async (rawName: string, action: string, propertyId?: string) => {
    await fetch("/api/admin/unmatched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawName, action, propertyId }),
    });
    toast.success(`${action} applied`);
    loadAll();
  };

  const report = (status?.report ?? null) as Record<string, unknown> | null;
  const pending = unmatched.filter((u) => u.status !== "aliased" && u.status !== "ignored");

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Data refresh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Last: <b>{String(status?.lastRefreshDate ?? "—")}</b> via{" "}
              <Badge variant="outline">{String(status?.lastRefreshSource ?? "—")}</Badge>
            </span>
            <Button size="sm" onClick={forceRefresh} disabled={busy}>
              {busy ? "Re-ingesting…" : "Force refresh + re-ingest"}
            </Button>
          </div>
          {report && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
              <span>buildings: {String(report.buildings)}</span>
              <span>units: {String(report.units)}</span>
              <span>submissions: {String(report.submissions)}</span>
              <span>outliers: {String(report.outliersFlagged)}</span>
              <span>matched: {JSON.stringify(report.matched)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">AI review summaries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">
            First full run summarizes ~140 properties (~30–45 min) and uses your Claude subscription
            quota. Incremental afterward — only new/changed reviews are re-summarized.
          </p>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={runBatch} disabled={!!batch?.running}>
              {batch?.running ? "Running…" : "Run summary batch"}
            </Button>
            {batch && (
              <span className="text-xs text-muted-foreground">
                {String(batch.done)} done · {String(batch.skipped)} cached · {String(batch.failed)}{" "}
                failed / {String(batch.total)}
                {batch.currentProperty ? ` · now: ${String(batch.currentProperty)}` : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Unmatched names ({pending.length} pending)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raw name</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Best guess</TableHead>
                  <TableHead>Resolve</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((u) => (
                  <UnmatchedRowView key={u.normName} row={u} candidates={candidates} onResolve={resolve} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Exports</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {["properties", "listings", "reports", "stats"].map((v) => (
            <a
              key={v}
              href={`/api/export?view=${v}`}
              className="rounded border px-3 py-1.5 hover:bg-muted"
            >
              {v}.csv
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function UnmatchedRowView({
  row,
  candidates,
  onResolve,
}: {
  row: UnmatchedRow;
  candidates: Candidate[];
  onResolve: (raw: string, action: string, propertyId?: string) => void;
}) {
  const [sel, setSel] = React.useState(row.bestCandidateId ?? "");
  return (
    <TableRow>
      <TableCell className="font-medium">{row.rawName}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {row.sources &&
          Object.entries(row.sources)
            .filter(([, n]) => n)
            .map(([k, n]) => `${k}:${n}`)
            .join(" ")}
      </TableCell>
      <TableCell className="text-xs">
        {row.bestCandidateName ? (
          <span>
            {row.bestCandidateName}{" "}
            <span className="text-muted-foreground">({row.bestScore?.toFixed(0)})</span>
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="max-w-40 rounded border bg-background px-1 py-1 text-xs"
          >
            <option value="">select…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={!sel}
            onClick={() => onResolve(row.rawName, "alias", sel)}
          >
            Map
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onResolve(row.rawName, "ignore")}>
            Ignore
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
