import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from scholarly import scholarly


def fetch_author(scholar_id: str, attempts: int = 2) -> dict:
    for attempt in range(1, attempts + 1):
        try:
            author = scholarly.search_author_id(scholar_id)
            return scholarly.fill(
                author,
                sections=["basics", "indices", "counts", "publications"],
            )
        except Exception:
            if attempt == attempts:
                raise
            time.sleep(5 * attempt)


def write_json(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8") as outfile:
        json.dump(data, outfile, ensure_ascii=False, indent=2)


scholar_id = os.environ.get("GOOGLE_SCHOLAR_ID", "").strip()
if not scholar_id:
    raise RuntimeError("GOOGLE_SCHOLAR_ID is required")

scholarly.set_timeout(20)
author = fetch_author(scholar_id)
author["updated"] = datetime.now(timezone.utc).isoformat()
author["publications"] = {
    publication["author_pub_id"]: publication
    for publication in author.get("publications", [])
}

results_dir = Path(__file__).resolve().parent / "results"
results_dir.mkdir(parents=True, exist_ok=True)
write_json(results_dir / "gs_data.json", author)
write_json(
    results_dir / "gs_data_shieldsio.json",
    {
        "schemaVersion": 1,
        "label": "citations",
        "message": str(author.get("citedby", 0)),
    },
)

print(
    f"Fetched {len(author['publications'])} publications and "
    f"{author.get('citedby', 0)} citations for {author.get('name', scholar_id)}."
)
