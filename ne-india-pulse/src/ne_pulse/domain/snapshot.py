"""The Snapshot aggregate — the computed Pulse for a scope and window.

A Snapshot is reproducible from the Mentions it was built from and always
carries provenance and the standing coverage caveat (PRD §6, FR-9).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .models import Polarity, TimeWindow

COVERAGE_CAVEAT = (
    "This reflects the news-media conversation indexed by GDELT — not public "
    "opinion. Coverage skews to English/Hindi online media; Assamese, Meitei "
    "and Bodo vernacular outlets are largely uncaptured, and sub-national "
    "geocoding is noisy. Read it as a media signal, not a poll."
)

REGION_SCOPE = "NE"  # whole North East region


@dataclass(frozen=True, slots=True)
class ThemeTally:
    label: str        # human-readable
    code: str         # raw GKG theme code
    count: int


@dataclass(frozen=True, slots=True)
class EntityTally:
    name: str
    count: int


@dataclass(frozen=True, slots=True)
class ToneSummary:
    average: float
    positive: int
    neutral: int
    negative: int

    @property
    def total(self) -> int:
        return self.positive + self.neutral + self.negative

    @property
    def negative_share(self) -> float:
        return self.negative / self.total if self.total else 0.0

    @property
    def overall(self) -> Polarity:
        if self.average > 1.0:
            return Polarity.POSITIVE
        if self.average < -1.0:
            return Polarity.NEGATIVE
        return Polarity.NEUTRAL


@dataclass(frozen=True, slots=True)
class SampleArticle:
    url: str
    source: str
    states: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class Snapshot:
    scope: str               # 'NE' or a FIPS code e.g. 'IN03'
    scope_label: str         # human label e.g. 'North East India' / 'Assam'
    window: TimeWindow
    article_count: int
    tone: ToneSummary
    themes: tuple[ThemeTally, ...] = field(default_factory=tuple)
    persons: tuple[EntityTally, ...] = field(default_factory=tuple)
    organizations: tuple[EntityTally, ...] = field(default_factory=tuple)
    per_state: tuple[tuple[str, int], ...] = field(default_factory=tuple)  # (label, count)
    samples: tuple[SampleArticle, ...] = field(default_factory=tuple)
    caveat: str = COVERAGE_CAVEAT
