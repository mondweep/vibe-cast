"""GdeltRawFileGateway — concrete GkgGateway over GDELT raw 15-min GKG files.

Primary ingestion path (ADR-0003). Downloads recent `*.gkg.csv.zip` slices from
data.gdeltproject.org, parses NE-India Mentions, and caches them for the current
slice (ADR-0005, in-memory TTL keyed by the latest slice timestamp).

I/O (HTTP) is injected as `opener` so contract tests can drive it without the
network.
"""
from __future__ import annotations

import io
import urllib.request
import zipfile
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from ..domain.models import Mention, TimeWindow
from .parser import parse_gkg_text

GDELT_BASE = "http://data.gdeltproject.org/gdeltv2"
LASTUPDATE_URL = f"{GDELT_BASE}/lastupdate.txt"

Opener = Callable[[str], bytes]


def _http_get(url: str, timeout: float = 40.0) -> bytes:
    with urllib.request.urlopen(url, timeout=timeout) as resp:  # noqa: S310 (trusted host)
        return resp.read()


def _slice_stamp(dt: datetime) -> str:
    return dt.strftime("%Y%m%d%H%M%S")


class GdeltRawFileGateway:
    def __init__(
        self,
        window_hours: float = 6.0,
        opener: Opener = _http_get,
    ) -> None:
        self._window_hours = window_hours
        self._open = opener
        self._cache: tuple[str, list[Mention]] | None = None  # (latest_stamp, mentions)

    # --- GkgGateway port -------------------------------------------------
    def latest_available(self) -> TimeWindow:
        end = self._latest_slice()
        return TimeWindow.ending_at(end, self._window_hours)

    def fetch_recent_mentions(self, window: TimeWindow) -> list[Mention]:
        key = _slice_stamp(window.end)
        if self._cache and self._cache[0] == key:
            return self._cache[1]
        mentions = self._ingest(window)
        self._cache = (key, mentions)
        return mentions

    # --- internals -------------------------------------------------------
    def _latest_slice(self) -> datetime:
        text = self._open(LASTUPDATE_URL).decode("utf-8", "replace")
        stamp = text.splitlines()[0].split("/")[-1].split(".")[0]
        return datetime.strptime(stamp, "%Y%m%d%H%M%S").replace(tzinfo=UTC)

    def _ingest(self, window: TimeWindow) -> list[Mention]:
        mentions: list[Mention] = []
        cursor = window.end
        while cursor >= window.start:
            url = f"{GDELT_BASE}/{_slice_stamp(cursor)}.gkg.csv.zip"
            try:
                blob = self._open(url)
                zf = zipfile.ZipFile(io.BytesIO(blob))
                text = zf.read(zf.namelist()[0]).decode("utf-8", "replace")
                mentions.extend(parse_gkg_text(text))
            except Exception:  # missing/late slice — skip, keep going
                pass
            cursor -= timedelta(minutes=15)
        return mentions
