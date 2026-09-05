import { z } from "zod";
import { CHARTABLE_METRICS } from "@/lib/stats/metrics";
import { zoneNames } from "@/lib/geo/zones";

// Constrained chart spec — the ONLY thing the LLM is allowed to produce.
// The app executes it against stats_cache; the LLM never touches numbers.

const metricEnum = CHARTABLE_METRICS.map((m) => m.name) as [string, ...string[]];

export const chartSpecSchema = z.object({
  title: z.string().min(1).max(120),
  chartType: z.enum(["bar", "line", "scatter", "histogram", "table"]),
  metric: z.enum(metricEnum),
  groupBy: z.enum(["property", "zone", "bed_count"]),
  filters: z
    .object({
      zones: z.array(z.enum(zoneNames() as [string, ...string[]])).optional(),
      bedCounts: z.array(z.number().int().min(0).max(10)).optional(),
      propertyNames: z.array(z.string()).optional(),
      coreOnly: z.boolean().optional(),
      minN: z.number().int().min(1).optional(),
    })
    .default({}),
  sort: z.enum(["asc", "desc", "none"]).default("desc"),
  limit: z.number().int().min(1).max(150).default(25),
});

export type ChartSpec = z.infer<typeof chartSpecSchema>;

export interface ChartDataPoint {
  label: string;
  value: number;
  n: number;
  id?: string;
  extra?: Record<string, unknown>;
}

export interface ChartResult {
  spec: ChartSpec;
  data: ChartDataPoint[];
  warnings: string[];
}
