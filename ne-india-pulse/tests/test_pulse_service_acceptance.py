"""Outside-in acceptance test for the v1 vertical slice (London School / mockist).

Story: "Show today's top themes + tone for Assam."
We drive PulseService against a *mocked* GkgGateway, asserting both the produced
read model and the interactions with the collaborator.
"""
from __future__ import annotations

from unittest.mock import create_autospec

import pytest

from ne_pulse.analytics.service import PulseService, UnknownScopeError
from ne_pulse.domain.models import Polarity, TimeWindow
from ne_pulse.ingestion.gateway import GkgGateway

from .conftest import make_mention


def test_today_themes_and_tone_for_assam(window: TimeWindow) -> None:
    gateway = create_autospec(GkgGateway, instance=True)
    gateway.latest_available.return_value = window
    gateway.fetch_recent_mentions.return_value = [
        make_mention(tone=-5.0, themes=("MEDICAL", "GENERAL_HEALTH"),
                     persons=("himanta biswa sarma",), states=("IN03",)),
        make_mention(tone=-2.0, themes=("MEDICAL",), states=("IN03",)),
        make_mention(tone=3.0, themes=("EDUCATION",), states=("IN03",)),
        # An article geocoded only to Manipur must be excluded from the Assam scope.
        make_mention(tone=9.0, themes=("EDUCATION", "EDUCATION"), states=("IN17",)),
    ]
    service = PulseService(gateway)

    snap = service.snapshot("IN03")

    # Read model: scope resolved, non-Assam article excluded, themes/tone correct.
    assert snap.scope_label == "Assam"
    assert snap.article_count == 3
    assert snap.themes[0].label == "Health & medicine"  # MEDICAL appears twice
    assert snap.tone.average == pytest.approx((-5.0 - 2.0 + 3.0) / 3, abs=0.01)
    assert snap.tone.overall == Polarity.NEGATIVE
    assert snap.caveat  # coverage caveat always present (FR-9)

    # Interaction: the window came from the gateway and was used for the fetch.
    gateway.latest_available.assert_called_once_with()
    gateway.fetch_recent_mentions.assert_called_once_with(window)


def test_unknown_scope_is_rejected_before_any_io() -> None:
    gateway = create_autospec(GkgGateway, instance=True)
    service = PulseService(gateway)

    with pytest.raises(UnknownScopeError):
        service.snapshot("IN99")

    gateway.fetch_recent_mentions.assert_not_called()  # fail fast, no wasted I/O
