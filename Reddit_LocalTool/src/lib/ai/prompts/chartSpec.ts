import { CHARTABLE_METRICS } from "@/lib/stats/metrics";
import { zoneNames } from "@/lib/geo/zones";

// The LLM only produces a query spec — never numbers. Schema enums are
// generated from the metric registry + live zone list so they can't drift.

export function buildChartSpecPrompt(userPrompt: string, propertyNames: string[]): string {
  const metricsDoc = CHARTABLE_METRICS.map((m) => `- "${m.name}": ${m.label}`).join("\n");
  return `Normal mode. You translate a natural-language chart request about UT Austin student housing into ONE JSON chart spec. You never invent data — the app runs the query.

## Spec schema
{
  "title": string,                      // short human title
  "chartType": "bar" | "line" | "scatter" | "histogram" | "table",
  "metric": <one of the metric names below>,
  "groupBy": "property" | "zone" | "bed_count",
  "filters": {
    "zones"?: string[],                 // from the zone list below
    "bedCounts"?: number[],             // 0 = studio
    "propertyNames"?: string[],         // free text, app resolves them
    "coreOnly"?: boolean,               // default true
    "minN"?: number                     // min sample size, default 1
  },
  "sort": "asc" | "desc" | "none",
  "limit": number                       // max bars/rows, default 25
}

## Metrics
${metricsDoc}

## Zones
${zoneNames().join(", ")}

## Known property names (sample)
${propertyNames.slice(0, 80).join("; ")}

## Examples
"bar chart of median 4br per-person rent in West Campus, sorted ascending" ->
{"title":"Median 4br reported rent — West Campus","chartType":"bar","metric":"reported_median","groupBy":"property","filters":{"zones":["West Campus"],"bedCounts":[4],"minN":3},"sort":"asc","limit":25}

"how do zones compare on listed 2br prices" ->
{"title":"Median listed 2br rent by zone","chartType":"bar","metric":"listed_median","groupBy":"zone","filters":{"bedCounts":[2]},"sort":"desc","limit":10}

"scatter of distance vs rating" ->
{"title":"Distance vs Google rating","chartType":"scatter","metric":"google_rating","groupBy":"property","filters":{},"sort":"none","limit":150}

## Request
${userPrompt}

Respond with a single JSON object only. Do not use any tools.`;
}
