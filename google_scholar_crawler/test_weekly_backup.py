import unittest
from datetime import datetime, timedelta, timezone
from weekly_backup import PROFILE, stale_papers


class BackupTests(unittest.TestCase):
    def test_freshness_uses_paper_observation_not_last_job(self):
        now = datetime(2026, 11, 17, 16, tzinfo=timezone.utc)
        key = PROFILE + ":example"
        papers = {key: {"title": "Test paper"}}
        entry = {"author_pub_id": key, "bib": {"title": "Test paper"}, "num_citations": 0}
        snapshot = {"schema_version": 2, "source": "google_scholar", "scholar_id": PROFILE, "checked_at": now.isoformat(),
                    "publications": {key: entry}}
        for age, expected in [(timedelta(days=6, hours=23), []), (timedelta(days=7), [key])]:
            entry["updated"] = (now - age).isoformat()
            self.assertEqual(stale_papers(papers, snapshot, now), expected)
        entry["updated"] = now.isoformat()
        entry["num_citations"] = None
        entry["crossref"] = {"num_citations": 3, "updated": now.isoformat()}
        self.assertEqual(stale_papers(papers, snapshot, now), [key])
        snapshot["scholar_id"] = "wrong"
        with self.assertRaises(ValueError):
            stale_papers(papers, snapshot, now)
