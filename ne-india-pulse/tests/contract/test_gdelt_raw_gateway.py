"""Contract test for the real GDELT adapter, with HTTP injected (no network).

Verifies the adapter honours the GkgGateway contract: resolves the latest slice,
downloads + parses zipped GKG, filters to NE, and caches per slice.
"""
from __future__ import annotations

import io
import zipfile

from ne_pulse.ingestion.gdelt_raw import GdeltRawFileGateway

from ..conftest import make_gkg_line

LATEST = "20260619153000"


def _zip_bytes(csv_text: str, name: str = f"{LATEST}.gkg.csv") -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(name, csv_text)
    return buf.getvalue()


class FakeHttp:
    """Records calls and serves canned lastupdate + a one-row GKG zip."""

    def __init__(self) -> None:
        self.calls: list[str] = []
        self.csv = "\n".join(
            [
                make_gkg_line(locations="1#Assam#IN#IN03#1#1#1", tone="-3.0,1,4,5,1,1,1"),
                make_gkg_line(locations="1#Delhi#IN#IN07#1#1#1"),  # non-NE, dropped
            ]
        )

    def __call__(self, url: str) -> bytes:
        self.calls.append(url)
        if url.endswith("lastupdate.txt"):
            return f"123 abc http://data.gdeltproject.org/gdeltv2/{LATEST}.gkg.csv.zip\n".encode()
        if url.endswith(".gkg.csv.zip"):
            return _zip_bytes(self.csv)
        raise AssertionError(f"unexpected url {url}")


def test_latest_window_and_parse_filter() -> None:
    http = FakeHttp()
    gw = GdeltRawFileGateway(window_hours=0.0, opener=http)  # single slice

    window = gw.latest_available()
    assert window.end.strftime("%Y%m%d%H%M%S") == LATEST

    mentions = gw.fetch_recent_mentions(window)
    assert len(mentions) == 1  # only the Assam row survives the NE filter
    assert "IN03" in mentions[0].states
    assert mentions[0].tone.score == -3.0


def test_caches_by_slice() -> None:
    http = FakeHttp()
    gw = GdeltRawFileGateway(window_hours=0.0, opener=http)
    window = gw.latest_available()

    gw.fetch_recent_mentions(window)
    slice_calls = [c for c in http.calls if c.endswith(".gkg.csv.zip")]
    gw.fetch_recent_mentions(window)  # second call should hit cache
    slice_calls_after = [c for c in http.calls if c.endswith(".gkg.csv.zip")]

    assert len(slice_calls) == 1
    assert len(slice_calls_after) == 1  # no additional download
