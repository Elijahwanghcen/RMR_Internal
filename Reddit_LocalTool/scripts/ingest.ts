// npm run ingest           -> live Algolia (or fallback) + full pipeline
// npm run ingest:offline   -> bundled dumps only, no network
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const offline = process.argv.includes("--offline");
  const { getDb } = await import("../src/db/client");
  const { runPipeline, defaultPaths } = await import("../src/lib/ingest/pipeline");
  const { ensureFreshData, todayChicago } = await import("../src/lib/ingest/refresh");
  const { readBundled, BUILDINGS_INDEX, UNITS_INDEX } = await import(
    "../src/lib/ingest/algolia"
  );

  if (offline) {
    const paths = defaultPaths();
    const report = runPipeline(getDb(), {
      buildingsRaw: readBundled(paths.dataDir, BUILDINGS_INDEX),
      unitsRaw: readBundled(paths.dataDir, UNITS_INDEX),
      snapshotDate: todayChicago(),
      source: "bundled",
      dataDir: paths.dataDir,
      rawDataPath: paths.rawDataPath,
      propertiesCsvPath: paths.propertiesCsvPath,
    });
    printReport(report);
    return;
  }

  const result = await ensureFreshData(true);
  if (result.report) printReport(result.report);
  else console.log("No refresh needed:", result);
}

function printReport(report: import("../src/lib/ingest/pipeline").IngestReport) {
  console.log("\n=== INGEST REPORT ===");
  console.log(`source: ${report.source}  snapshot: ${report.snapshotDate}`);
  console.log(
    `buildings: ${report.buildings}  units: ${report.units}  submissions: ${report.submissions}  ratings: ${report.ratings}  surveys: ${report.surveys}`
  );
  console.log("matched:", report.matched);
  console.log(`unmatched distinct names (now long-tail): ${report.unmatchedNames}`);
  console.log(`outliers flagged: ${report.outliersFlagged}`);
  console.log("zones:", report.zoneAssignments);
  if (report.csvOnlyNames.length) console.log("csv-only names:", report.csvOnlyNames);
  if (report.errors.length) console.log("errors:", report.errors.slice(0, 10));

  const reportPath = path.resolve("data", "ingest-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`full report -> ${reportPath}`);
}

main().catch((err) => {
  console.error("INGEST FAILED:", err);
  process.exit(1);
});
