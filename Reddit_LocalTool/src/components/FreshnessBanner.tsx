import { refreshStatus } from "@/lib/ingest/refresh";
import { bootstrap } from "@/lib/data/bootstrap";

export async function FreshnessBanner() {
  await bootstrap();
  const status = refreshStatus();
  if (!status.lastRefreshDate) return null;
  const src = status.lastRefreshSource;
  const stale = src !== "algolia";
  return (
    <div
      className={
        stale
          ? "border-b bg-amber-50 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          : "border-b bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground"
      }
    >
      Data: {status.lastRefreshDate}
      {stale
        ? ` — OFFLINE (${src === "bundled" ? "bundled dump" : "cached snapshot"}; Algolia unreachable)`
        : " — live Algolia pull"}
      {status.report ? ` · ${status.report.units} listings · ${status.report.submissions} student reports` : ""}
    </div>
  );
}
