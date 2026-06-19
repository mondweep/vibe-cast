"""PulseService — the application service the API calls.

Depends only on the GkgGateway port (constructor injection), so it is fully
testable with a mock gateway (London-School / outside-in).
"""
from __future__ import annotations

from ..domain.snapshot import REGION_SCOPE, Snapshot
from ..ingestion.gateway import GkgGateway
from ..reference.states import NE_STATES
from .aggregator import build_snapshot


class UnknownScopeError(ValueError):
    """Raised when a requested scope is neither the region nor a known NE state."""


def _scope_label(scope: str) -> str:
    if scope == REGION_SCOPE:
        return "North East India"
    state = NE_STATES.get(scope)
    if state is None:
        raise UnknownScopeError(scope)
    return state.name


class PulseService:
    def __init__(self, gateway: GkgGateway) -> None:
        self._gateway = gateway

    def snapshot(self, scope: str = REGION_SCOPE) -> Snapshot:
        """Compute today's Pulse for the region or a single NE state."""
        label = _scope_label(scope)  # validates scope before any I/O
        window = self._gateway.latest_available()
        mentions = self._gateway.fetch_recent_mentions(window)
        return build_snapshot(scope, label, window, mentions)
