import fs from "fs";
import path from "path";

// data/aliases.json is the durable source of truth for hand-curated matches;
// the DB aliases table is rebuilt from it on every ingest.

export type AliasMap = Record<string, string>; // raw alias text -> property id

export function aliasesPath(dataDir: string): string {
  return path.join(dataDir, "aliases.json");
}

export function loadAliases(dataDir: string): AliasMap {
  const p = aliasesPath(dataDir);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function saveAliases(dataDir: string, aliases: AliasMap): void {
  const p = aliasesPath(dataDir);
  // timestamped backup on every save; keep last 20
  if (fs.existsSync(p)) {
    const backupDir = path.join(dataDir, "aliases-backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.copyFileSync(p, path.join(backupDir, `aliases-${stamp}.json`));
    const backups = fs.readdirSync(backupDir).sort();
    for (const f of backups.slice(0, Math.max(0, backups.length - 20))) {
      fs.rmSync(path.join(backupDir, f));
    }
  }
  fs.writeFileSync(p, JSON.stringify(aliases, null, 2));
}
