"""Shared test builders (Object Mother helpers)."""
from __future__ import annotations

from datetime import UTC, datetime

import pytest

from ne_pulse.domain.models import Mention, TimeWindow, Tone


def make_mention(
    *,
    url: str = "https://example.com/a",
    source: str = "example.com",
    tone: float = 0.0,
    themes: tuple[str, ...] = (),
    persons: tuple[str, ...] = (),
    orgs: tuple[str, ...] = (),
    states: tuple[str, ...] = ("IN03",),
    published_at: datetime | None = None,
) -> Mention:
    return Mention(
        url=url,
        source=source,
        published_at=published_at or datetime(2026, 6, 19, 15, 0, tzinfo=UTC),
        tone=Tone(tone),
        themes=themes,
        persons=persons,
        organizations=orgs,
        states=frozenset(states),
    )


def make_gkg_line(
    *,
    date: str = "20260619150000",
    domain: str = "sentinelassam.com",
    url: str = "https://sentinelassam.com/x",
    themes: str = "MEDICAL;EDUCATION",
    locations: str = "1#Assam, India#IN#IN03#26.2#92.9#-1",
    persons: str = "himanta biswa sarma",
    orgs: str = "world bank",
    tone: str = "-2.5,1.0,3.5,4.5,10,2,180",
) -> str:
    """Build a tab-delimited GKG 2.1 row with the fields we read at their indices."""
    cols = [""] * 27
    cols[1] = date
    cols[3] = domain
    cols[4] = url
    cols[7] = themes
    cols[9] = locations
    cols[11] = persons
    cols[13] = orgs
    cols[15] = tone
    return "\t".join(cols)


@pytest.fixture
def window() -> TimeWindow:
    end = datetime(2026, 6, 19, 15, 30, tzinfo=UTC)
    return TimeWindow.ending_at(end, hours=6)
