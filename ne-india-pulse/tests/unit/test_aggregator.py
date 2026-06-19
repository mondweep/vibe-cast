from __future__ import annotations

from ne_pulse.analytics.aggregator import build_snapshot, normalise_theme
from ne_pulse.domain.models import Polarity
from ne_pulse.domain.snapshot import REGION_SCOPE

from ..conftest import make_mention


def test_normalise_theme_maps_known_and_filters_noise() -> None:
    assert normalise_theme("MEDICAL") == "Health & medicine"
    assert normalise_theme("EPU_POLICY") is None       # noise
    assert normalise_theme("TAX_FNCACT") is None        # TAX_ prefix dropped
    # Unknown code gets prettified, prefixes stripped.
    assert normalise_theme("WB_135_TRANSPORT") == "Transport"


def test_region_snapshot_counts_all_states_and_tone(window) -> None:
    mentions = [
        make_mention(tone=2.0, themes=("AGRICULTURE",), states=("IN03",)),
        make_mention(tone=-6.0, themes=("AGRICULTURE", "WB_2433_CONFLICT_AND_VIOLENCE"),
                     states=("IN17",)),
        make_mention(tone=0.0, themes=("AGRICULTURE",), states=("IN03", "IN18")),
    ]
    snap = build_snapshot(REGION_SCOPE, "North East India", window, mentions)

    assert snap.article_count == 3
    assert snap.themes[0].label == "Agriculture"  # most frequent
    # per_state tallies each geocoded state (IN03 appears in 2 articles).
    per = dict(snap.per_state)
    assert per["Assam"] == 2 and per["Manipur"] == 1 and per["Meghalaya"] == 1
    assert snap.tone.negative == 1 and snap.tone.positive == 1 and snap.tone.neutral == 1


def test_state_scope_excludes_other_states(window) -> None:
    mentions = [
        make_mention(themes=("EDUCATION",), states=("IN03",)),
        make_mention(themes=("EDUCATION",), states=("IN17",)),
    ]
    snap = build_snapshot("IN03", "Assam", window, mentions)
    assert snap.article_count == 1


def test_sentiment_breakdown_buckets_and_drivers(window) -> None:
    mentions = [
        make_mention(tone=-5.0, themes=("WB_2433_CONFLICT_AND_VIOLENCE",), states=("IN03",)),
        make_mention(tone=-3.0, themes=("MEDICAL",), states=("IN03",)),
        make_mention(tone=4.0, themes=("EDUCATION",), states=("IN03",)),
        make_mention(tone=0.0, themes=("AGRICULTURE",), states=("IN03",)),
    ]
    sb = build_snapshot("IN03", "Assam", window, mentions).sentiment

    # Buckets ordered by tone extremity within each side.
    assert [a.tone for a in sb.negatives] == [-5.0, -3.0]
    assert [a.tone for a in sb.positives] == [4.0]
    assert len(sb.neutrals) == 1
    assert sb.negatives[0].polarity == Polarity.NEGATIVE
    assert "Conflict & violence" in sb.negatives[0].themes
    # Drivers: which themes sit behind each side of the mood.
    assert "Conflict & violence" in {d.label for d in sb.negative_drivers}
    assert "Education" in {d.label for d in sb.positive_drivers}


def test_empty_window_is_safe(window) -> None:
    snap = build_snapshot(REGION_SCOPE, "North East India", window, [])
    assert snap.article_count == 0
    assert snap.tone.average == 0.0
    assert snap.themes == ()
