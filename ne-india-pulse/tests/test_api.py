"""API tests with the FastAPI TestClient and a stubbed PulseService."""
from __future__ import annotations

from fastapi.testclient import TestClient

from ne_pulse.analytics.aggregator import build_snapshot
from ne_pulse.analytics.service import UnknownScopeError
from ne_pulse.api.app import create_app
from ne_pulse.domain.snapshot import REGION_SCOPE

from .conftest import make_mention


class StubService:
    def __init__(self, window) -> None:
        self._window = window

    def snapshot(self, scope: str = REGION_SCOPE):
        if scope not in (REGION_SCOPE, "IN03"):
            raise UnknownScopeError(scope)
        label = "North East India" if scope == REGION_SCOPE else "Assam"
        mentions = [
            make_mention(tone=-3.0, themes=("MEDICAL",), states=("IN03",)),
            make_mention(tone=1.0, themes=("EDUCATION",), states=("IN03",)),
        ]
        return build_snapshot(scope, label, self._window, mentions)


def client(window) -> TestClient:
    return TestClient(create_app(service=StubService(window)))


def test_health(window) -> None:
    assert client(window).get("/health").json() == {"status": "ok"}


def test_api_snapshot_json(window) -> None:
    r = client(window).get("/api/snapshot?scope=IN03")
    assert r.status_code == 200
    body = r.json()
    assert body["scope_label"] == "Assam"
    assert body["article_count"] == 2
    assert body["themes"][0]["label"] in {"Health & medicine", "Education"}
    assert body["caveat"]  # FR-9


def test_dashboard_html_renders_caveat(window) -> None:
    r = client(window).get("/")
    assert r.status_code == 200
    assert "North East India" in r.text
    assert "media-conversation" in r.text or "not public" in r.text.lower()


def test_unknown_scope_returns_404(window) -> None:
    assert client(window).get("/api/snapshot?scope=ZZ").status_code == 404
