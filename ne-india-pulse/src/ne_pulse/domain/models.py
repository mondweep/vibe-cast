"""Domain value objects and the Mention entity (shared kernel).

These types are the ubiquitous language in code form (see docs/prd/PRD.md §4).
They are deliberately free of any GDELT or framework concerns.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import StrEnum


class Polarity(StrEnum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


# Tone scores above/below this magnitude count as positive/negative; the band
# in between is treated as neutral. GDELT tone is usually within roughly -10..+10.
_NEUTRAL_BAND = 1.0


@dataclass(frozen=True, slots=True)
class Tone:
    """Emotional tone of a piece of coverage (GDELT V2Tone, first component)."""

    score: float

    @property
    def polarity(self) -> Polarity:
        if self.score > _NEUTRAL_BAND:
            return Polarity.POSITIVE
        if self.score < -_NEUTRAL_BAND:
            return Polarity.NEGATIVE
        return Polarity.NEUTRAL


@dataclass(frozen=True, slots=True)
class TimeWindow:
    """A closed time window [start, end]."""

    start: datetime
    end: datetime

    def __post_init__(self) -> None:
        if self.end < self.start:
            raise ValueError("TimeWindow end must not precede start")

    @property
    def hours(self) -> float:
        return (self.end - self.start).total_seconds() / 3600.0

    @classmethod
    def ending_at(cls, end: datetime, hours: float) -> TimeWindow:
        return cls(start=end - timedelta(hours=hours), end=end)


@dataclass(frozen=True, slots=True)
class Mention:
    """A single news article GDELT indexed, resolved to our domain (an entity).

    `states` holds FIPS-10-4 ADM1 codes (e.g. 'IN03') that the article was
    geocoded to within the NE region.
    """

    url: str
    source: str
    published_at: datetime
    tone: Tone
    themes: tuple[str, ...] = field(default_factory=tuple)
    persons: tuple[str, ...] = field(default_factory=tuple)
    organizations: tuple[str, ...] = field(default_factory=tuple)
    states: frozenset[str] = field(default_factory=frozenset)
