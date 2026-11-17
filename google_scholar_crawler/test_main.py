import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import Mock, patch
from urllib.error import HTTPError

import main


P = main.PROFILE
KEY = P + ":abc"
DOI = "10.1234/test"
PAPERS = {KEY: {"title": "Test Paper", "doi": DOI}}
T1 = "2026-09-05T12:00:00+00:00"
T2 = "2026-11-17T12:00:00+00:00"
RULES = b"User-agent: *\nDisallow: /citations?\nAllow: /citations?user=\nDisallow: /citations?*cstart="
PAGE = f"""<link rel="canonical" href="{main.PROFILE_URL}"><div id="gsc_prf_in">Qianyi LIU</div>
<table id="gsc_rsb_st"><thead><tr><th></th><th>All</th><th>Since 2021</th></tr></thead>
<tbody><tr><td class="gsc_rsb_sc1">Citations</td><td class="gsc_rsb_std">50</td>
<td class="gsc_rsb_std">0</td></tr></tbody></table>
<table><tbody id="gsc_a_b"><tr class="gsc_a_tr"><td><a class="gsc_a_at"
href="/citations?user={P}&amp;citation_for_view={KEY}">TEST paper</a></td>
<td class="gsc_a_c"><a class="gsc_a_ac">2</a></td></tr></tbody></table>"""


def work(n=7, doi=DOI):
    return json.dumps({"status": "ok", "message": {"DOI": doi, "is-referenced-by-count": n}})


def legacy(n=1):
    return dict(source="AUTHOR_PROFILE_PAGE", scholar_id=P, citedby=48, updated=T1, publications={
        KEY: dict(author_pub_id=KEY, source="AUTHOR_PUBLICATION_ENTRY", bib={"title": "Test paper"}, num_citations=n)
    })


class SyncTests(unittest.TestCase):
    def test_success_literal_zero_and_independent_total(self):
        get = Mock(side_effect=[RULES, PAGE.replace(">2</a>", ">0</a>")])
        data, _ = main.refresh(PAPERS, legacy(5), T2, get)
        self.assertEqual([c.args[0] for c in get.call_args_list], [
            "https://scholar.google.com/robots.txt", main.PROFILE_URL])
        self.assertEqual(data["scholar_status"], "complete")
        self.assertEqual((data["citedby"], data["updated"]), (50, T2))
        paper = data["publications"][KEY]
        self.assertEqual((paper["num_citations"], paper["updated"]), (0, T2))
        self.assertNotIn("crossref", paper)

    def test_legacy_cache_stops_fallback_on_throttle(self):
        get = Mock(side_effect=[RULES, HTTPError(main.PROFILE_URL, 429, "throttled", {}, None)])
        data, notes = main.refresh(PAPERS, legacy(), T2, get)
        self.assertEqual(get.call_count, 2)
        self.assertIn("429", str(notes))
        self.assertEqual((data["scholar_status"], data["citedby"], data["updated"]), ("unavailable", 48, T1))
        self.assertEqual(data["publications"][KEY]["updated"], T1)
        with tempfile.TemporaryDirectory() as tmp:
            main.write_outputs(Path(tmp), data)
            badge = json.loads((Path(tmp) / "gs_data_shieldsio.json").read_text())
            self.assertEqual(badge["message"], "48 (cached 2026-09-05)")

    def test_bad_identity_missing_counts_and_ambiguous_rows(self):
        for page in (PAGE.replace("user=" + P, "user=other"), "<title>captcha</title>",
                     PAGE.replace(KEY, P + ":xyz"), PAGE.replace("TEST paper", "Wrong paper"),
                     PAGE.replace(">2</a>", "></a>"), PAGE.replace(">2</a>", ">-1</a>")):
            with self.subTest(page=page):
                data, _ = main.refresh(PAPERS, legacy(), T2, Mock(side_effect=[RULES, page]))
                self.assertNotEqual(data["scholar_status"], "complete")
                self.assertEqual(data["publications"][KEY]["updated"], T1)
        data, _ = main.refresh(PAPERS, {}, T2, Mock(side_effect=[
            RULES, PAGE.replace('<td class="gsc_rsb_std">50</td>', '')]))
        self.assertIsNone(data["citedby"])  # Never use the since-2021 column.
        self.assertEqual(data["publications"][KEY]["num_citations"], 2)

    def test_cold_fallback_then_cached_fallback_then_scholar_recovery(self):
        deny = b"User-agent: *\nDisallow: /"
        get = Mock(side_effect=[deny, work(0)])
        data, _ = main.refresh(PAPERS, {}, T1, get)
        self.assertEqual(get.call_args_list[1].args, ("https://api.crossref.org/works/" + DOI,))
        self.assertIsNone(data["citedby"])
        row = data["publications"][KEY]
        self.assertIsNone(row["num_citations"])
        self.assertEqual(row["crossref"], dict(doi=DOI, num_citations=0, updated=T1))
        stale, _ = main.refresh(PAPERS, data, T2, Mock(side_effect=[deny, work(9, "other")]))
        self.assertEqual(stale["publications"], data["publications"])
        recovered, _ = main.refresh(PAPERS, stale, T2, Mock(side_effect=[RULES, PAGE]))
        self.assertEqual(recovered["scholar_status"], "complete")
        self.assertNotIn("crossref", recovered["publications"][KEY])

    def test_bad_sources_and_uncertain_legacy_zero_never_create_counts(self):
        for body in (work(False), work(None), work(-1), work(3, "other"), "null", "[]", "challenge"):
            data, _ = main.refresh(PAPERS, legacy(0), T2, Mock(side_effect=[OSError("offline"), body]))
            self.assertIsNone(data["publications"][KEY]["num_citations"])
            self.assertNotIn("crossref", data["publications"][KEY])
        with self.assertRaisesRegex(ValueError, "wrong profile"):
            main.refresh(PAPERS, dict(legacy(), scholar_id="other"), T2, Mock())

    def test_cli_warns_with_cache_but_fails_without_any_observation(self):
        for old in (legacy(), {}):
            with self.subTest(cached=bool(old)), tempfile.TemporaryDirectory() as tmp:
                folder = Path(tmp)
                argv = ["main.py", "--output", str(folder / "out")]
                if old:
                    (folder / "previous.json").write_text(json.dumps(old))
                    argv += ["--previous", str(folder / "previous.json")]
                with patch("sys.argv", argv), patch.object(main, "manifest", return_value=PAPERS), \
                     patch.object(main, "read_public", side_effect=TimeoutError("offline")), \
                     patch.dict(os.environ, GITHUB_STEP_SUMMARY=str(folder / "summary")), \
                     redirect_stdout(io.StringIO()) as stdout:
                    if old:
                        main.main()
                        self.assertIn("::warning::", stdout.getvalue())
                    else:
                        with self.assertRaisesRegex(SystemExit, "No usable"):
                            main.main()
                    self.assertTrue((folder / "summary").is_file())
                    self.assertEqual((folder / "out/gs_data.json").exists(), bool(old))
