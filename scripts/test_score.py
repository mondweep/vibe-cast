#!/usr/bin/env python3
"""Tests for the scoring logic in score.py.

    python3 scripts/test_score.py
"""

import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import score  # noqa: E402


def write(text):
    tmp = tempfile.NamedTemporaryFile("w", suffix=".md", delete=False)
    tmp.write(text)
    tmp.close()
    return pathlib.Path(tmp.name)


def eval_doc(status="evaluated", **scores):
    body = "\n".join(f"  {k}: {v}" for k, v in scores.items())
    return f"""---
plugin: fixture
plugin_id: plugin_00TEST
category: role-suite
status: {status}
evaluated: 2026-01-01
scores:
{body}
collisions:
---

# fixture
"""


ALL_THREES = dict(job_fit=3, activation=3, output_quality=3,
                  setup_cost=3, data_trust=3, overhead=3)


class TestFrontMatter(unittest.TestCase):
    def test_nested_block_and_empty_values(self):
        fm = score.parse_front_matter(eval_doc(**ALL_THREES))
        self.assertEqual(fm["plugin"], "fixture")
        self.assertEqual(fm["scores"]["job_fit"], "3")
        self.assertIsNone(fm["collisions"])

    def test_missing_fence_is_an_error(self):
        with self.assertRaises(ValueError):
            score.parse_front_matter("# no front matter\n")

    def test_unclosed_fence_is_an_error(self):
        with self.assertRaises(ValueError):
            score.parse_front_matter("---\nplugin: x\n")

    def test_out_of_range_score_is_an_error(self):
        path = write(eval_doc(**{**ALL_THREES, "job_fit": 9}))
        with self.assertRaises(ValueError):
            score.evaluate(path)


class TestWeighting(unittest.TestCase):
    def test_all_fives_is_100(self):
        path = write(eval_doc(**{k: 5 for k in ALL_THREES}))
        self.assertEqual(score.evaluate(path)["score"], 100.0)

    def test_all_threes_is_60(self):
        path = write(eval_doc(**ALL_THREES))
        r = score.evaluate(path)
        self.assertEqual(r["score"], 60.0)
        self.assertEqual(r["verdict"], "Trial")

    def test_weights_sum_to_100(self):
        self.assertEqual(sum(w for _, _, w in score.CRITERIA), 100)


class TestBands(unittest.TestCase):
    def test_boundaries(self):
        self.assertEqual(score.band_for(75), "Adopt")
        self.assertEqual(score.band_for(74.9), "Trial")
        self.assertEqual(score.band_for(55), "Trial")
        self.assertEqual(score.band_for(54.9), "Hold")
        self.assertEqual(score.band_for(35), "Hold")
        self.assertEqual(score.band_for(34.9), "Drop")


class TestOverrides(unittest.TestCase):
    def test_zero_caps_at_hold(self):
        path = write(eval_doc(**{**ALL_THREES, "job_fit": 5, "output_quality": 5,
                                 "setup_cost": 5, "data_trust": 5, "overhead": 0}))
        r = score.evaluate(path)
        self.assertEqual(r["verdict"], "Hold")
        self.assertTrue(any("scored 0" in o for o in r["overrides"]))

    def test_low_data_trust_caps_at_trial(self):
        path = write(eval_doc(**{k: 5 for k in ALL_THREES} | {"data_trust": 2}))
        r = score.evaluate(path)
        self.assertEqual(r["verdict"], "Trial")

    def test_low_activation_caps_at_hold(self):
        path = write(eval_doc(**{k: 5 for k in ALL_THREES} | {"activation": 2}))
        self.assertEqual(score.evaluate(path)["verdict"], "Hold")

    def test_overrides_never_promote(self):
        # A Drop-scoring plugin with weak data trust stays Drop; caps only lower.
        path = write(eval_doc(**{k: 1 for k in ALL_THREES}))
        self.assertEqual(score.evaluate(path)["verdict"], "Drop")


class TestStatus(unittest.TestCase):
    def test_blocked_short_circuits(self):
        path = write(eval_doc(status="blocked", **ALL_THREES))
        r = score.evaluate(path)
        self.assertEqual(r["verdict"], "Blocked")
        self.assertIsNone(r["score"])

    def test_incomplete_scores_are_pending(self):
        path = write(eval_doc(**{**ALL_THREES, "overhead": ""}))
        r = score.evaluate(path)
        self.assertEqual(r["verdict"], "Pending")
        self.assertIsNone(r["score"])


class TestExampleFile(unittest.TestCase):
    def test_documented_example_scores_as_claimed(self):
        # The example claims 71.0 and Hold via the activation override.
        path = score.EVAL_DIR / "claude-account" / "_example.md"
        r = score.evaluate(path)
        self.assertEqual(r["score"], 71.0)
        self.assertEqual(r["verdict"], "Hold")


if __name__ == "__main__":
    unittest.main(verbosity=2)
