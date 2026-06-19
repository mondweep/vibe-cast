"""Serialisation of the Snapshot read model to plain dicts (JSON-friendly)."""
from __future__ import annotations

from ..domain.snapshot import Snapshot


def snapshot_to_dict(s: Snapshot) -> dict:
    return {
        "scope": s.scope,
        "scope_label": s.scope_label,
        "window": {
            "start": s.window.start.isoformat(),
            "end": s.window.end.isoformat(),
            "hours": round(s.window.hours, 2),
        },
        "article_count": s.article_count,
        "tone": {
            "average": s.tone.average,
            "overall": s.tone.overall.value,
            "positive": s.tone.positive,
            "neutral": s.tone.neutral,
            "negative": s.tone.negative,
            "negative_share": round(s.tone.negative_share, 3),
        },
        "themes": [{"label": t.label, "code": t.code, "count": t.count} for t in s.themes],
        "persons": [{"name": e.name, "count": e.count} for e in s.persons],
        "organizations": [{"name": e.name, "count": e.count} for e in s.organizations],
        "per_state": [{"state": label, "count": n} for label, n in s.per_state],
        "samples": [
            {"url": a.url, "source": a.source, "states": list(a.states)} for a in s.samples
        ],
        "caveat": s.caveat,
    }
