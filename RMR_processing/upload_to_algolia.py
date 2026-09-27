#!/usr/bin/env python3
"""Upload apartments.json into Algolia index RMR_packagedata.

apartments.json is an object keyed by apartment name. Each top-level entry
becomes one Algolia record; the key is used as objectID (and stored as
`property_name`) so repeat runs upsert instead of duplicating.

Usage:
    python3 upload_to_algolia.py            # replace index contents
    python3 upload_to_algolia.py --no-clear # upsert only, keep existing records
    python3 upload_to_algolia.py --dry-run  # validate records locally, no API calls

Credentials (set in the environment; do not commit keys):
    ALGOLIA_APP_ID      Algolia application ID
    ALGOLIA_WRITE_KEY   Algolia admin/write API key (search-only keys fail)

If those env vars are unset the script falls back to in-repo defaults.
A 403 "Invalid Application-ID or API key" means the defaults are stale or
the env vars were not provided — export a live write key and retry.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

APP_ID = os.environ.get("ALGOLIA_APP_ID", "Z9GSMS5XJY")
WRITE_KEY = os.environ.get("ALGOLIA_WRITE_KEY", "2b5a3020843909d193cfe303b9d9b084")
INDEX = "RMR_packagedata"

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "apartments.json")

BATCH_SIZE = 1000
BASE = f"https://{APP_ID}.algolia.net/1/indexes/{INDEX}"
HEADERS = {
    "X-Algolia-Application-Id": APP_ID,
    "X-Algolia-API-Key": WRITE_KEY,
    "Content-Type": "application/json",
}


def _request(method, url, payload=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        hint = ""
        if e.code in (401, 403):
            hint = (
                "\nHint: export ALGOLIA_APP_ID and ALGOLIA_WRITE_KEY with a live "
                "admin/write key. In-repo defaults are stale or a search-only key "
                "was used. Do not invent credentials."
            )
        sys.exit(f"HTTP {e.code} on {method} {url}\n{body}{hint}")


def load_records():
    with open(SRC, encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        records = []
        for i, rec in enumerate(data):
            rec = dict(rec)
            rec.setdefault("objectID", rec.get("canonical_name") or str(i))
            records.append(rec)
        return records

    records = []
    for name, body in data.items():
        rec = dict(body)
        rec["objectID"] = name
        rec.setdefault("property_name", name)
        records.append(rec)
    return records


def main():
    dry_run = "--dry-run" in sys.argv
    clear = "--no-clear" not in sys.argv
    records = load_records()
    print(f"Loaded {len(records)} records from {SRC}")
    print(f"Target index: {INDEX} (app {APP_ID})")
    cred_src = []
    cred_src.append("ALGOLIA_APP_ID=" + ("env" if "ALGOLIA_APP_ID" in os.environ else "default"))
    cred_src.append("ALGOLIA_WRITE_KEY=" + ("env" if "ALGOLIA_WRITE_KEY" in os.environ else "default"))
    print("Credential source: " + ", ".join(cred_src))

    missing_id = [r for r in records if not r.get("objectID")]
    if missing_id:
        sys.exit(f"ERROR: {len(missing_id)} records are missing objectID")
    if not WRITE_KEY:
        sys.exit(
            "ERROR: ALGOLIA_WRITE_KEY is empty. Export a live Algolia admin/write "
            "API key (search-only keys cannot clear or batch-write)."
        )

    if dry_run:
        print(f"Dry run: would {'clear then ' if clear else ''}upload {len(records)} records.")
        print(f"  sample objectIDs: {[r['objectID'] for r in records[:8]]}")
        print("Dry run complete; no Algolia API calls made.")
        return

    if clear:
        print(f"Clearing index {INDEX} ...")
        _request("POST", f"{BASE}/clear")

    total = 0
    for i in range(0, len(records), BATCH_SIZE):
        chunk = records[i:i + BATCH_SIZE]
        payload = {"requests": [{"action": "updateObject", "body": r} for r in chunk]}
        _request("POST", f"{BASE}/batch", payload)
        total += len(chunk)
        print(f"  uploaded {total}/{len(records)}")

    print(f"Done. {total} records pushed to '{INDEX}' (app {APP_ID}).")
    print("Note: indexing is async; records appear in a few seconds.")


if __name__ == "__main__":
    main()
