"""Ingestion port: the boundary the rest of the app depends on.

Analytics depends on this Protocol, never on a concrete GDELT adapter — which
is what lets us drive development outside-in with mocks (London-School TDD) and
swap GDELT access strategies (raw files, DOC API, BigQuery) without touching the
core domain. This is the Anti-Corruption Layer's contract (PRD §5).
"""
from __future__ import annotations

from typing import Protocol

from ..domain.models import Mention, TimeWindow


class GkgGateway(Protocol):
    """Supplies NE-India Mentions for a time window, already filtered & resolved."""

    def fetch_recent_mentions(self, window: TimeWindow) -> list[Mention]:
        """Return NE-India-geocoded Mentions published within `window`.

        Implementations must be side-effect-free from the caller's view (caching
        is allowed) and must raise on unrecoverable upstream failure so callers
        can degrade to last-known-good.
        """
        ...

    def latest_available(self) -> TimeWindow:
        """The freshest window the gateway can currently serve (data recency)."""
        ...
