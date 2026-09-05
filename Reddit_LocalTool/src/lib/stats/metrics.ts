// Metric registry: single source of truth for stat names. Feeds the stats
// computer, the chart-spec zod enum, and the LLM prompt so they can't drift.

export interface MetricDef {
  name: string;
  label: string;
  format: "currency" | "number" | "percent" | "miles" | "rating";
  bedScoped: boolean; // true if stored per bed_count as well as all-beds
}

export const PROPERTY_METRICS: MetricDef[] = [
  { name: "listed_median", label: "Median listed rent (base, per person)", format: "currency", bedScoped: true },
  { name: "listed_mean", label: "Mean listed rent", format: "currency", bedScoped: true },
  { name: "listed_p25", label: "25th pct listed rent", format: "currency", bedScoped: true },
  { name: "listed_p75", label: "75th pct listed rent", format: "currency", bedScoped: true },
  { name: "listed_min", label: "Min listed rent", format: "currency", bedScoped: true },
  { name: "listed_max", label: "Max listed rent", format: "currency", bedScoped: true },
  { name: "reported_median", label: "Median student-reported rent (last 12mo, per person)", format: "currency", bedScoped: true },
  { name: "reported_mean", label: "Mean student-reported rent", format: "currency", bedScoped: true },
  { name: "reported_p25", label: "25th pct reported rent", format: "currency", bedScoped: true },
  { name: "reported_p75", label: "75th pct reported rent", format: "currency", bedScoped: true },
  { name: "reported_min", label: "Min reported rent", format: "currency", bedScoped: true },
  { name: "reported_max", label: "Max reported rent", format: "currency", bedScoped: true },
  { name: "delta_median", label: "Reported minus listed median", format: "currency", bedScoped: true },
  { name: "delta_pct", label: "Delta as % of listed", format: "percent", bedScoped: true },
  { name: "shared_listed_avg", label: "Avg shared-occupancy listed rent", format: "currency", bedScoped: true },
  { name: "shared_reported_avg", label: "Avg shared-occupancy reported rent", format: "currency", bedScoped: true },
  { name: "with_fees_median", label: "Median listed price incl. fees", format: "currency", bedScoped: true },
  { name: "price_per_bedroom", label: "Cheapest per-bedroom listed median", format: "currency", bedScoped: false },
  { name: "report_count", label: "Student report count (all time)", format: "number", bedScoped: false },
  { name: "app_rating_avg", label: "RateMyRent rating (1-5)", format: "rating", bedScoped: false },
  { name: "google_rating", label: "Google rating (1-5)", format: "rating", bedScoped: false },
  { name: "maintenance_rating_avg", label: "Maintenance rating (1-10)", format: "rating", bedScoped: false },
  { name: "elevator_uptime_avg", label: "Elevator uptime %", format: "percent", bedScoped: false },
  { name: "sentiment", label: "Review sentiment (-1..1)", format: "number", bedScoped: false },
  { name: "distance_mi", label: "Distance to UT Tower (mi)", format: "miles", bedScoped: false },
];

export const ZONE_METRICS: MetricDef[] = [
  { name: "zone_listed_median", label: "Zone median listed rent", format: "currency", bedScoped: true },
  { name: "zone_reported_median", label: "Zone median reported rent", format: "currency", bedScoped: true },
  { name: "zone_property_count", label: "Properties in zone", format: "number", bedScoped: false },
  { name: "zone_report_count", label: "Student reports in zone", format: "number", bedScoped: false },
];

export const CHARTABLE_METRICS = PROPERTY_METRICS.filter((m) =>
  [
    "listed_median",
    "reported_median",
    "delta_median",
    "delta_pct",
    "shared_listed_avg",
    "price_per_bedroom",
    "report_count",
    "app_rating_avg",
    "google_rating",
    "maintenance_rating_avg",
    "sentiment",
    "distance_mi",
  ].includes(m.name)
);

export function metricLabel(name: string): string {
  return (
    [...PROPERTY_METRICS, ...ZONE_METRICS].find((m) => m.name === name)?.label ?? name
  );
}
