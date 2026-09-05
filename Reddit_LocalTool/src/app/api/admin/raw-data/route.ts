import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { defaultPaths } from "@/lib/ingest/pipeline";
import { loadRawData } from "@/lib/ingest/rawData";
import { ensureFreshData } from "@/lib/ingest/refresh";

// Replace Raw_data.json and re-run the pipeline.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const text = await file.text();
  // validate before overwriting
  const { rawDataPath } = defaultPaths();
  const tmp = `${rawDataPath}.incoming`;
  fs.writeFileSync(tmp, text);
  try {
    loadRawData(tmp);
  } catch (err) {
    fs.rmSync(tmp);
    return NextResponse.json({ error: `invalid Raw_data.json: ${(err as Error).message}` }, { status: 400 });
  }
  fs.copyFileSync(rawDataPath, `${rawDataPath}.bak`);
  fs.renameSync(tmp, rawDataPath);
  const result = await ensureFreshData(true);
  return NextResponse.json(result);
}
