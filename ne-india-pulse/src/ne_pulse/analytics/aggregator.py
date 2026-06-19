"""Domain services that turn raw Mentions into a Snapshot (Core domain)."""
from __future__ import annotations

from collections import Counter
from collections.abc import Iterable

from ..domain.models import Mention, Polarity, TimeWindow
from ..domain.snapshot import (
    EntityTally,
    SampleArticle,
    ScoredArticle,
    SentimentBreakdown,
    Snapshot,
    ThemeTally,
    ToneSummary,
)
from ..reference.states import name_for

# Curated GKG theme code -> human label. Falls back to a prettifier otherwise.
_THEME_LABELS: dict[str, str] = {
    "UNGP_FORESTS_RIVERS_OCEANS": "Environment, forests & rivers",
    "WB_566_ENVIRONMENT_AND_NATURAL_RESOURCES": "Environment & natural resources",
    "EPU_POLICY_GOVERNMENT": "Government policy",
    "WB_696_PUBLIC_SECTOR_MANAGEMENT": "Public-sector management",
    "WB_831_GOVERNANCE": "Governance",
    "EDUCATION": "Education",
    "WB_470_EDUCATION": "Education",
    "MEDICAL": "Health & medicine",
    "GENERAL_HEALTH": "Health & medicine",
    "WB_635_PUBLIC_HEALTH": "Public health",
    "AGRICULTURE": "Agriculture",
    "RURAL": "Rural affairs",
    "WB_135_TRANSPORT": "Transport",
    "WB_2670_JOBS": "Jobs & employment",
    "WB_840_JUSTICE": "Justice & courts",
    "WB_2433_CONFLICT_AND_VIOLENCE": "Conflict & violence",
    "WB_2432_FRAGILITY_CONFLICT_AND_VIOLENCE": "Conflict & fragility",
    "CRISISLEX_O01_WEATHER": "Weather",
    "MANMADE_DISASTER_IMPLIED": "Disaster (man-made)",
    "CRISISLEX_C07_SAFETY": "Public safety",
    "USPEC_POLITICS_GENERAL1": "Politics",
    "ELECTION": "Elections",
    "PROTEST": "Protests",
}

# Structural/generic themes that add noise to a topical view (PRD §6 ThemeNormaliser).
_NOISE_THEMES: frozenset[str] = frozenset(
    {
        "EPU_POLICY", "USPEC_POLICY1", "EPU_ECONOMY", "EPU_ECONOMY_HISTORIC",
        "LEADER", "GENERAL_GOVERNMENT", "CRISISLEX_CRISISLEXREC",
        "SOC_POINTSOFINTEREST", "AFFECT", "EPU_CATS_MIGRATION_FEAR_FEAR",
    }
)


def normalise_theme(code: str) -> str | None:
    """Map a raw GKG theme code to a human label, or None if it is noise."""
    if not code or code in _NOISE_THEMES or code.startswith("TAX_"):
        return None
    if code in _THEME_LABELS:
        return _THEME_LABELS[code]
    # Prettify: drop a leading numbered prefix (WB_135_, EPU_, UNGP_), titleise.
    parts = code.split("_")
    while parts and (parts[0] in {"WB", "EPU", "UNGP", "USPEC", "CRISISLEX", "SOC"}
                     or parts[0].isdigit() or (parts[0][:1] in "CO" and parts[0][1:].isdigit())):
        parts.pop(0)
    return " ".join(parts).replace("AND", "&").title() if parts else None


def _scope_mentions(mentions: Iterable[Mention], scope: str) -> list[Mention]:
    from ..domain.snapshot import REGION_SCOPE

    if scope == REGION_SCOPE:
        return list(mentions)
    return [m for m in mentions if scope in m.states]


def _tone_summary(mentions: list[Mention]) -> ToneSummary:
    if not mentions:
        return ToneSummary(average=0.0, positive=0, neutral=0, negative=0)
    counts = Counter(m.tone.polarity for m in mentions)
    avg = sum(m.tone.score for m in mentions) / len(mentions)
    return ToneSummary(
        average=round(avg, 2),
        positive=counts[Polarity.POSITIVE],
        neutral=counts[Polarity.NEUTRAL],
        negative=counts[Polarity.NEGATIVE],
    )


def build_snapshot(
    scope: str,
    scope_label: str,
    window: TimeWindow,
    mentions: Iterable[Mention],
    *,
    top_n: int = 10,
    sample_n: int = 8,
    bucket_n: int = 25,
    driver_n: int = 6,
) -> Snapshot:
    """Aggregate Mentions into a Snapshot for the given scope."""
    scoped = _scope_mentions(mentions, scope)

    theme_counts: Counter[str] = Counter()   # keyed by human label
    theme_code: dict[str, str] = {}           # one representative raw code per label
    persons: Counter[str] = Counter()
    orgs: Counter[str] = Counter()
    per_state: Counter[str] = Counter()
    # Sentiment drill-down: articles per mood bucket + themes driving each side.
    buckets: dict[Polarity, list[ScoredArticle]] = {p: [] for p in Polarity}
    neg_drivers: Counter[str] = Counter()
    pos_drivers: Counter[str] = Counter()
    for m in scoped:
        # Count each article once per distinct theme label (codes that map to the
        # same label — e.g. MEDICAL & GENERAL_HEALTH — must not double-count).
        labels: dict[str, str] = {}
        for code in m.themes:
            label = normalise_theme(code)
            if label:
                labels.setdefault(label, code)
        for label, code in labels.items():
            theme_counts[label] += 1
            theme_code.setdefault(label, code)
        persons.update(p for p in m.persons if p)
        orgs.update(o for o in m.organizations if o)
        for fips in m.states:
            per_state[fips] += 1

        polarity = m.tone.polarity
        buckets[polarity].append(
            ScoredArticle(
                url=m.url,
                source=m.source,
                tone=round(m.tone.score, 2),
                polarity=polarity,
                states=tuple(name_for(s) for s in sorted(m.states)),
                themes=tuple(labels)[:3],
            )
        )
        if polarity is Polarity.NEGATIVE:
            neg_drivers.update(labels.keys())
        elif polarity is Polarity.POSITIVE:
            pos_drivers.update(labels.keys())

    theme_tallies = tuple(
        ThemeTally(label=label, code=theme_code[label], count=n)
        for label, n in theme_counts.most_common(top_n)
    )
    samples = tuple(
        SampleArticle(url=m.url, source=m.source,
                      states=tuple(name_for(s) for s in sorted(m.states)))
        for m in scoped[:sample_n]
    )
    per_state_out = tuple(
        (name_for(fips), n) for fips, n in per_state.most_common()
    )

    def _drivers(counter: Counter[str]) -> tuple[ThemeTally, ...]:
        return tuple(
            ThemeTally(label=label, code=theme_code.get(label, label), count=n)
            for label, n in counter.most_common(driver_n)
        )

    sentiment = SentimentBreakdown(
        # Most extreme first within each bucket; cap to keep payloads small.
        negatives=tuple(sorted(buckets[Polarity.NEGATIVE],
                               key=lambda a: a.tone)[:bucket_n]),
        neutrals=tuple(buckets[Polarity.NEUTRAL][:bucket_n]),
        positives=tuple(sorted(buckets[Polarity.POSITIVE],
                               key=lambda a: a.tone, reverse=True)[:bucket_n]),
        negative_drivers=_drivers(neg_drivers),
        positive_drivers=_drivers(pos_drivers),
    )

    return Snapshot(
        scope=scope,
        scope_label=scope_label,
        window=window,
        article_count=len(scoped),
        tone=_tone_summary(scoped),
        themes=theme_tallies,
        persons=tuple(EntityTally(name, n) for name, n in persons.most_common(top_n)),
        organizations=tuple(EntityTally(name, n) for name, n in orgs.most_common(top_n)),
        per_state=per_state_out,
        samples=samples,
        sentiment=sentiment,
    )
