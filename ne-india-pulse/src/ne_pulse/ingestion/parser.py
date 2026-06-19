"""Pure parser: GDELT GKG 2.1 CSV rows -> domain Mentions.

No I/O here, so it is trivially unit-testable. Column indices per the GKG 2.1
codebook (see docs/research/01-gdelt-capabilities.md).
"""
from __future__ import annotations

import csv
import io
import sys
from collections.abc import Iterator
from datetime import UTC, datetime

from ..domain.models import Mention, Tone
from ..reference.states import NE_FIPS_CODES

csv.field_size_limit(sys.maxsize)

# GKG 2.1 tab-delimited column indices.
_DATE, _DOMAIN, _URL, _THEMES, _LOC, _PERSONS, _ORGS, _TONE = 1, 3, 4, 7, 9, 11, 13, 15
_MIN_COLS = _TONE + 1


def _ne_states(locations: str) -> frozenset[str]:
    """ADM1 codes (4th '#'-subfield of each ';'-separated location) within NE."""
    hits = set()
    for loc in locations.split(";"):
        parts = loc.split("#")
        if len(parts) >= 4 and parts[3] in NE_FIPS_CODES:
            hits.add(parts[3])
    return frozenset(hits)


def _published_at(raw: str) -> datetime:
    try:
        return datetime.strptime(raw, "%Y%m%d%H%M%S").replace(tzinfo=UTC)
    except ValueError:
        return datetime.now(UTC)


def _split_clean(field: str) -> tuple[str, ...]:
    return tuple(x.strip() for x in field.split(";") if x.strip())


def parse_row(row: list[str]) -> Mention | None:
    """Parse one GKG row into a Mention, or None if it is not an NE-India article."""
    if len(row) < _MIN_COLS:
        return None
    states = _ne_states(row[_LOC])
    if not states:
        return None
    try:
        score = float(row[_TONE].split(",")[0])
    except (ValueError, IndexError):
        score = 0.0
    return Mention(
        url=row[_URL],
        source=row[_DOMAIN],
        published_at=_published_at(row[_DATE]),
        tone=Tone(score),
        themes=_split_clean(row[_THEMES]),
        persons=_split_clean(row[_PERSONS]),
        organizations=_split_clean(row[_ORGS]),
        states=states,
    )


def parse_gkg_text(text: str) -> Iterator[Mention]:
    """Yield NE-India Mentions from the text of one GKG CSV slice."""
    for row in csv.reader(io.StringIO(text), delimiter="\t"):
        mention = parse_row(row)
        if mention is not None:
            yield mention
