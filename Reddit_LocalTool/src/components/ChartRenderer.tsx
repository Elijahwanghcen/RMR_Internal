"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ChartResult } from "@/lib/charts/spec";

// Single-series renderer for constrained chart specs. One hue (--chart-1,
// validated for both modes); identity lives in axis labels, not color.

const HUE = "var(--chart-1)";

function fmt(v: number): string {
  if (Math.abs(v) >= 1000) return `$${Math.round(v).toLocaleString()}`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; value: number; n: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-medium">{d.label}</div>
      <div className="text-muted-foreground">
        {fmt(d.value)} · n={d.n}
        {d.n < 3 && " (weak)"}
      </div>
    </div>
  );
}

export function ChartRenderer({ result }: { result: ChartResult }) {
  const { spec, data, warnings } = result;
  const [showTable, setShowTable] = React.useState(false);

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No data matches this spec.
        {warnings.map((w, i) => (
          <p key={i} className="mt-1 text-xs">{w}</p>
        ))}
      </div>
    );
  }

  const height = spec.chartType === "bar" ? Math.max(220, data.length * 28 + 60) : 320;

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{spec.groupBy}</TableHead>
          <TableHead>value</TableHead>
          <TableHead>n</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((d) => (
          <TableRow key={d.label}>
            <TableCell>{d.label}</TableCell>
            <TableCell className="tabular-nums">{fmt(d.value)}</TableCell>
            <TableCell className="tabular-nums text-muted-foreground">{d.n}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{spec.title}</h3>
        <button
          onClick={() => setShowTable((s) => !s)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showTable ? "chart view" : "table view"}
        </button>
      </div>

      {showTable || spec.chartType === "table" ? (
        table
      ) : spec.chartType === "bar" ? (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tickFormatter={fmt} stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis
              type="category"
              dataKey="label"
              width={190}
              stroke="var(--muted-foreground)"
              fontSize={11}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" fill={HUE} radius={[0, 4, 4, 0]} maxBarSize={18}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v) => fmt(v as number)}
                className="fill-foreground"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : spec.chartType === "line" ? (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ left: 8, right: 24 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis tickFormatter={fmt} stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="value" stroke={HUE} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : spec.chartType === "scatter" ? (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ left: 8, right: 24, bottom: 8 }}>
            <CartesianGrid stroke="var(--border)" />
            <XAxis
              type="number"
              dataKey="x"
              name="x"
              stroke="var(--muted-foreground)"
              fontSize={11}
            />
            <YAxis
              type="number"
              dataKey="value"
              tickFormatter={fmt}
              stroke="var(--muted-foreground)"
              fontSize={11}
            />
            <Tooltip content={<ChartTooltip />} />
            <Scatter
              data={data.map((d, i) => ({ ...d, x: (d.extra?.x as number) ?? i }))}
              fill={HUE}
            />
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        // histogram: render as vertical bars
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ left: 8, right: 24 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis tickFormatter={fmt} stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" fill={HUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {warnings.length > 0 && (
        <ul className="text-xs text-amber-600">
          {warnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
