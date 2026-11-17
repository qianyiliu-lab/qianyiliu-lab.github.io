"""Local backup for the scheduled cloud sync. Never writes to the main checkout."""

import json
import os
import shlex
import subprocess
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from main import PROFILE, dated, manifest, refresh, title_key, valid_count, write_outputs

REMOTE = "github.com/qianyiliu-lab/qianyiliu-lab.github.io.git"
BRANCH = "google-scholar-stats"


def stale_papers(papers, data, now):
    if data.get("scholar_id") != PROFILE or data.get("schema_version") != 2 or data.get("source") != "google_scholar":
        raise ValueError("Unexpected data branch snapshot; nothing will be published.")
    stale = []
    for key, paper in papers.items():
        entry = data["publications"].get(key, {})
        stamp = entry.get("updated")
        if not (entry.get("author_pub_id") == key and valid_count(entry.get("num_citations"))
                and title_key(entry.get("bib", {}).get("title", "")) == title_key(paper["title"])
                and dated(stamp) and timedelta(0) <= now - datetime.fromisoformat(stamp) < timedelta(days=7)):
            stale.append(key)
    return stale


def run():
    papers = manifest()
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
    with tempfile.TemporaryDirectory(prefix="scholar-backup-") as folder:
        folder = Path(folder)

        def git(*args):
            subprocess.run(["git", *args], cwd=folder, env=env, check=True, timeout=75)

        git("clone", "--quiet", "--depth", "1", "--single-branch", "--branch", BRANCH, "https://" + REMOTE, ".")
        old = json.loads((folder / "gs_data.json").read_text("utf8"))
        now = datetime.now(timezone.utc)
        stale = stale_papers(papers, old, now)
        if not stale:
            print("All listed Google Scholar counts are less than seven days old. No Scholar request or write.")
            return
        stamp = now.isoformat()
        data, notes = refresh(papers, old, stamp)
        if any(data["publications"][key].get("updated") != stamp for key in stale):
            raise RuntimeError("Stale Scholar counts could not all be verified; branch unchanged. " + "; ".join(notes))

        write_outputs(folder, data)
        git("add", "--", "gs_data.json", "gs_data_shieldsio.json")
        git("-c", "user.name=Homepage citation sync", "-c", "user.email=qianyiliu-lab@users.noreply.github.com",
            "commit", "--quiet", "-m", "Refresh verified Google Scholar counts from the weekly backup")
        deploy_key = Path(__file__).resolve().parent.parent / ".deploy_key"
        env["GIT_SSH_COMMAND"] = "ssh -o BatchMode=yes -o StrictHostKeyChecking=yes"
        if deploy_key.is_file():
            env["GIT_SSH_COMMAND"] += " -o IdentitiesOnly=yes -i " + shlex.quote(deploy_key.as_posix())
        # Fast-forward only: a concurrent cloud observation must never be overwritten.
        git("push", "git@" + REMOTE.replace("/", ":", 1), "HEAD:refs/heads/" + BRANCH)
        print(f"Published verified Google Scholar observations dated {stamp}.")


if __name__ == "__main__":
    run()
