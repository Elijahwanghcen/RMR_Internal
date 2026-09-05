import { ensureFreshData } from "@/lib/ingest/refresh";

// Every server page/route awaits this: first open of the day pulls Algolia
// and re-runs the pipeline; same-day opens are a no-op meta check.
export async function bootstrap() {
  try {
    return await ensureFreshData();
  } catch (err) {
    // Never let a refresh failure take down a page; stale data + banner beats a 500.
    console.error("bootstrap refresh failed:", err);
    return null;
  }
}
