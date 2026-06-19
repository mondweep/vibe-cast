from __future__ import annotations

from datetime import UTC

from ne_pulse.ingestion.parser import parse_gkg_text, parse_row

from ..conftest import make_gkg_line


def test_parses_ne_article_into_mention() -> None:
    row = make_gkg_line().split("\t")
    m = parse_row(row)
    assert m is not None
    assert m.url == "https://sentinelassam.com/x"
    assert m.source == "sentinelassam.com"
    assert "IN03" in m.states
    assert m.tone.score == -2.5
    assert "MEDICAL" in m.themes and "EDUCATION" in m.themes
    assert "himanta biswa sarma" in m.persons
    assert m.published_at.tzinfo == UTC


def test_non_ne_article_is_skipped() -> None:
    row = make_gkg_line(locations="1#New Delhi, India#IN#IN07#28.6#77.2#-9").split("\t")
    assert parse_row(row) is None


def test_short_row_is_skipped() -> None:
    assert parse_row(["only", "three", "cols"]) is None


def test_bad_tone_defaults_to_zero() -> None:
    m = parse_row(make_gkg_line(tone="").split("\t"))
    assert m is not None and m.tone.score == 0.0


def test_parse_text_yields_only_ne_rows() -> None:
    text = "\n".join(
        [
            make_gkg_line(locations="1#Assam#IN#IN03#1#1#1"),
            make_gkg_line(locations="1#Mumbai#IN#IN16#1#1#1"),  # Maharashtra, not NE
            make_gkg_line(locations="1#Aizawl#IN#IN31#1#1#1"),  # Mizoram
        ]
    )
    mentions = list(parse_gkg_text(text))
    states = {s for m in mentions for s in m.states}
    assert states == {"IN03", "IN31"}
