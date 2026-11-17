"""Refresh public citation observations; never infer a count from missing data."""

import argparse
import json
import os
import re
import unicodedata
from datetime import datetime, timezone
from http.client import HTTPException
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

import yaml
from bs4 import BeautifulSoup
from protego import Protego

HERE = Path(__file__).resolve().parent
PROFILE = "UmPI1h0AAAAJ"
PROFILE_URL = f"https://scholar.google.com/citations?user={PROFILE}&hl=en"
AGENT = "AcadHomepage-CitationSync/1.0 (+https://qianyiliu-lab.github.io)"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def read_public(url):
    # One ordinary GET. Do not follow challenges, send cookies, or retry blocks.
    with build_opener(NoRedirect()).open(
        Request(url, headers={"User-Agent": AGENT}), timeout=15
    ) as response:
        body = response.read(2_000_001)
        if len(body) > 2_000_000:
            raise ValueError("unexpectedly large response")
        return body


def manifest():
    config = yaml.safe_load((HERE.parent / "_config.yml").read_text("utf8"))
    if config.get("google_scholar_id") != PROFILE:
        raise ValueError("_config.yml must identify the same Google Scholar profile as the crawler")
    records = {}
    for paper in yaml.safe_load((HERE.parent / "_data/publications.yml").read_text("utf8")):
        key = paper.get("scholar_id")
        if not key or paper.get("status") == "Under Review":
            continue
        if not re.fullmatch(rf"{PROFILE}:[\w-]+", key) or key in records:
            raise ValueError(f"invalid or duplicate Scholar ID in publications.yml: {key}")
        records[key] = paper
    if not records:
        raise ValueError("no published papers with an explicit Scholar ID")
    return records


def title_key(title):
    return re.sub(r"[\W_]+", "", unicodedata.normalize("NFKC", title).casefold())


def number(cell):
    value = cell.get_text(strip=True) if cell else ""
    if re.fullmatch(r"[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+", value):
        return int(value.replace(",", ""))
    return None


def scholar(papers, get):
    rules = get("https://scholar.google.com/robots.txt").decode("utf8")
    if not re.search(r"(?im)^user-agent\s*:", rules) or not Protego.parse(rules).can_fetch(PROFILE_URL, AGENT):
        raise ValueError("profile access not confirmed by robots.txt")
    page = BeautifulSoup(get(PROFILE_URL), "html.parser")
    canonical = page.select_one('link[rel~="canonical"][href]')
    url = urlsplit(canonical["href"]) if canonical else None
    if not (url and url.hostname == "scholar.google.com" and url.path == "/citations"
            and parse_qs(url.query).get("user") == [PROFILE] and page.select_one("#gsc_prf_in")):
        raise ValueError("response is not the requested public profile")

    total = None
    headers = page.select("#gsc_rsb_st thead th")
    for row in page.select("#gsc_rsb_st tbody tr"):
        label = row.select_one(".gsc_rsb_sc1")
        cells = row.find_all("td", recursive=False)
        if (label and label.get_text(strip=True) == "Citations" and len(headers) == len(cells)
                and len(cells) >= 2 and headers[1].get_text(strip=True) == "All"
                and "gsc_rsb_std" in cells[1].get("class", [])):
            total = number(cells[1])
            break
    counts = {}
    for row in page.select("#gsc_a_b tr.gsc_a_tr"):
        link = row.select_one("a.gsc_a_at[href]")
        if not link:
            continue
        query = parse_qs(urlsplit(link["href"]).query)
        ids = query.get("citation_for_view", [])
        if query.get("user") != [PROFILE] or len(ids) != 1 or ids[0] not in papers:
            continue
        key = ids[0]
        matches = title_key(link.get_text(" ", strip=True)) == title_key(papers[key]["title"])
        # A repeated ID, changed title, blank cell, or changed markup is unknown.
        counts[key] = number(row.select_one("td.gsc_a_c .gsc_a_ac")) if matches and key not in counts else None
    return total, counts


def valid_count(n):
    return type(n) is int and n >= 0


def dated(stamp):
    try:
        return isinstance(stamp, str) and datetime.fromisoformat(stamp).tzinfo is not None
    except ValueError:
        return False


def crossref(doi, get):
    result = json.loads(get("https://api.crossref.org/works/" + quote(doi, safe="/")))
    work = result.get("message") if isinstance(result, dict) else None
    if not (isinstance(work, dict) and result.get("status") == "ok"
            and isinstance(work.get("DOI"), str) and work["DOI"].casefold() == doi.casefold()
            and valid_count(work.get("is-referenced-by-count"))):
        raise ValueError("no verified DOI citation count")
    return work["is-referenced-by-count"]


def cached(record, field, stamp, legacy=False):
    value = record.get(field)
    # scholarly historically defaulted missing paper counts to zero.
    if valid_count(value) and dated(stamp) and not (legacy and value == 0):
        return value, stamp
    return None, None


SOURCE_ERRORS = (OSError, HTTPException, ValueError)


def refresh(papers, old, now, get=None):
    if get is None:
        get = read_public
    legacy = old.get("source") == "AUTHOR_PROFILE_PAGE" and "schema_version" not in old
    if old and (old.get("scholar_id") != PROFILE or not (legacy or (
        old.get("schema_version") == 2 and old.get("source") == "google_scholar"
    )) or not isinstance(old.get("publications"), dict)):
        raise ValueError("unrecognized snapshot or wrong profile; refusing to replace cache")

    notes = []
    try:
        total, counts = scholar(papers, get)
    except SOURCE_ERRORS as exc:
        total, counts = None, {}
        notes.append(f"Google Scholar: {exc}")
    citedby, updated = (total, now) if total is not None else cached(
        old, "citedby", old.get("updated"), legacy
    )
    data = dict(schema_version=2, source="google_scholar", scholar_id=PROFILE,
                checked_at=now, updated=updated, citedby=citedby, publications={})
    skip_crossref = False
    for key, paper in papers.items():
        prior = old.get("publications", {}).get(key, {})
        if (prior.get("author_pub_id") != key or
            title_key(prior.get("bib", {}).get("title", "")) != title_key(paper["title"]) or
            (legacy and prior.get("source") != "AUTHOR_PUBLICATION_ENTRY")):
            prior = {}
        count, stamp = (counts[key], now) if counts.get(key) is not None else cached(
            prior, "num_citations", old.get("updated") if legacy else prior.get("updated"), legacy
        )
        entry = dict(author_pub_id=key, bib={"title": paper["title"]}, num_citations=count, updated=stamp)
        data["publications"][key] = entry
        if counts.get(key) is not None:
            continue
        notes.append(f"No current Scholar count for {key}.")
        if count is not None:
            continue
        doi = paper.get("doi")
        if not doi:
            continue
        fallback = prior.get("crossref", {})
        if fallback.get("doi") == doi:
            n, date = cached(fallback, "num_citations", fallback.get("updated"))
            if n is not None:
                entry["crossref"] = dict(doi=doi, num_citations=n, updated=date)
        if not skip_crossref:
            try:
                entry["crossref"] = dict(doi=doi, num_citations=crossref(doi, get), updated=now)
            except SOURCE_ERRORS as exc:
                notes.append(f"Crossref ({doi}): {exc}")
                skip_crossref = isinstance(exc, HTTPError) and exc.code in (403, 429, 503)
    complete = total is not None and all(counts.get(key) is not None for key in papers)
    data["scholar_status"] = "complete" if complete else (
        "partial" if total is not None or any(n is not None for n in counts.values()) else "unavailable"
    )
    return data, notes


def write_outputs(folder, data):
    folder.mkdir(parents=True, exist_ok=True)
    badge = {"schemaVersion": 1, "label": "Google Scholar citations", "message": "unavailable"}
    if data["citedby"] is not None:
        cache = "cached " if data["updated"] != data["checked_at"] else ""
        badge["message"] = f"{data['citedby']} ({cache}{data['updated'][:10]})"
    for name, payload in [("gs_data", data), ("gs_data_shieldsio", badge)]:
        (folder / f"{name}.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--previous", type=Path, help="existing branch snapshot; omit only for a cold start")
    parser.add_argument("--output", type=Path, default=HERE / "results")
    args = parser.parse_args()
    previous = json.loads(args.previous.read_text("utf8")) if args.previous else {}
    if args.previous and not previous:
        parser.error("existing snapshot is empty")
    data, notes = refresh(manifest(), previous, datetime.now(timezone.utc).isoformat())
    summary = [f"Google Scholar: {data['scholar_status']} ({PROFILE})",
               f"Checked: {data['checked_at']}; last verified profile total: {data['citedby']} at {data['updated']}."]
    for key, entry in data["publications"].items():
        fallback = entry.get("crossref")
        line = f"{key}: Scholar {entry['num_citations']} at {entry['updated']}"
        if fallback:
            line += f"; Crossref {fallback['num_citations']} at {fallback['updated']}"
        summary.append(line)
    report = "\n".join(f"- {line}" for line in summary + notes)
    print(report)
    if path := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(path, "a", encoding="utf8") as f:
            print(report, file=f)
    if data["citedby"] is None and not any(
        row["num_citations"] is not None or "crossref" in row for row in data["publications"].values()
    ):
        raise SystemExit("No usable citation observations; nothing published.")
    if data["scholar_status"] != "complete":
        print("::warning::Incomplete Scholar refresh. Retained available dated observations; see job summary.")
    write_outputs(args.output, data)


if __name__ == "__main__":
    main()
