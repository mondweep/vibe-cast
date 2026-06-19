# Product Requirements Document — NE India Pulse

> **Status:** Draft v1.0 (Phase 0) · **Date:** 2026-06-19 · **Author:** RuFlo
> swarm (`specification`/`planner`, Opus) · **Approach:** Domain-Driven Design.
> Grounded in [`../research/`](../research/): GDELT capabilities, NE India
> demographics, and a live proof-of-concept snapshot.

---

## 1. Vision & problem

**Vision.** A free, always-current web dashboard that answers one question well:
**"What is North East India talking and thinking about today?"** — surfacing the
day's themes, emotional tone, trending people/organisations and news-volume
spikes across the eight NE Indian states, with honest framing about what the
signal is.

**Problem.** NE India is under-covered, linguistically diverse and often only
reaches national attention during crises. There is no lightweight, neutral,
near-real-time lens on the region's *media conversation*. Building one normally
means scrapers + NLP + geocoding. **GDELT already does this globally, for free,
every 15 minutes** — we just need to focus, aggregate and present it
responsibly.

**Why now / feasibility.** Proven in Phase 0: a live GDELT pull on 2026-06-19
returned 95 NE-geocoded articles over 6 hours with usable themes (environment,
governance, an Assam Japanese-Encephalitis outbreak, education policy), tone
(+0.68) and named regional sources. See
[`../research/03-todays-snapshot.md`](../research/03-todays-snapshot.md).

**Honest scope.** GDELT measures **what news media publish and the tone of that
text** — *not* public opinion. Assamese/Meitei/Bodo vernacular media are largely
uncaptured. The product must present itself as a **media-conversation sensor**,
never as a poll of what residents believe. This caveat is a first-class product
requirement, not a footnote (see §9, FR-9).

## 2. Goals & non-goals

**Goals**
- G1. Show "today's pulse" for the NE region and per-state, refreshed ≤15 min.
- G2. Four lenses: **themes/topics**, **emotional tone**, **trending entities**,
  **volume/spikes** — each with source links to underlying articles.
- G3. Stay free to run (GDELT free tier + scale-to-zero Cloud Run).
- G4. Be transparent about method, bias and limitations everywhere it matters.

**Non-goals (v1)**
- Not a social-media / opinion-poll / survey product.
- Not predictive (no forecasting of unrest, etc.).
- Not a vernacular-NLP pipeline (accept GDELT's language coverage in v1).
- No user accounts, alerting, or write/UGC features in v1.

## 3. Personas

- **Priya — regional journalist (Guwahati).** Wants a fast read on what's
  breaking and trending across the NE today, with clickable sources.
- **Anil — policy researcher / NGO analyst.** Wants per-state theme & tone
  trends over days/weeks and exportable data, with clear caveats to cite.
- **Maya — diaspora / curious citizen.** Wants an at-a-glance "how is the NE
  doing today" view that's trustworthy and not alarmist.

## 4. Ubiquitous language (glossary)

| Term | Meaning in this domain |
|---|---|
| **Pulse** | The aggregated media-conversation signal for a region over a time window. |
| **Region** | The NE area of interest — the 8 states, individually or as a whole. |
| **State** | One of the 8 NE Indian states, keyed by **FIPS-10-4 ADM1 code** (GDELT) ↔ ISO 3166-2 (see research). |
| **Snapshot** | The Pulse computed for a specific window (e.g. "today", "last 24h"). |
| **Theme** | A normalised topic derived from GDELT GKG themes (de-noised, human-labelled). |
| **Tone** | Emotional polarity of coverage, from GDELT V2Tone/GCAM (−100…+100, usually −10…+10). |
| **Entity** | A person or organisation named in coverage (GKG persons/orgs). |
| **Volume** | Count of articles in a window; a **Spike** is volume ≫ its trailing baseline. |
| **Mention / Article** | A single news document GDELT indexed, with URL, source, tone, geo. |
| **Source** | The publishing outlet/domain (e.g. sentinelassam.com). |
| **Baseline** | Trailing average used to judge what's "trending" / a "spike". |
| **Coverage caveat** | The standing disclaimer that this is media coverage, not opinion. |

## 5. Bounded contexts & context map

DDD decomposition into four bounded contexts (each a candidate module/service):

1. **Ingestion (Anti-Corruption Layer over GDELT).** Talks to GDELT (raw GKG
   15-min files primary; DOC 2.0 API optional), translates GDELT's CSV/JSON into
   our clean domain types, applies the NE ADM1 filter. *Isolates the rest of the
   system from GDELT's quirks (FIPS codes, field formats, noise).*
2. **Pulse Analytics (Core Domain).** Aggregates mentions into Snapshots:
   theme tallies + normalisation, tone stats, entity trending (z-score vs
   baseline), volume/spike detection. **This is where the product's value
   lives.**
3. **Read/Presentation.** Serves a query-optimised read model (today/per-state
   views) to the web UI via a small API; owns the dashboard.
4. **Reference Data (Supporting).** Static NE geography & demographics (state
   codes, names, populations, boundaries) used for labelling, per-capita
   context and maps. Sourced from research (Census/MoSPI/GADM).

**Context map**

```
        [GDELT]  (upstream, external)
           │  raw GKG / DOC API
           ▼
  ┌──────────────────┐   publishes Mention(s)   ┌──────────────────┐
  │   Ingestion ACL  │ ───────────────────────▶ │ Pulse Analytics  │  (Core)
  └──────────────────┘                          └────────┬─────────┘
                                                          │ Snapshot ready
                          uses (labels, per-capita)       ▼
  ┌──────────────────┐   Conformist/Shared      ┌──────────────────┐
  │  Reference Data  │ ◀──────────────────────  │ Read/Presentation│ ──▶ Web UI
  └──────────────────┘                          └──────────────────┘
```

Relationships: Ingestion is an **Anti-Corruption Layer** (GDELT →
Customer/Supplier where GDELT is the upstream supplier we cannot influence).
Reference Data is a **Shared Kernel** of value objects (StateCode, etc.) used by
Analytics and Presentation.

## 6. Domain model (Core: Pulse Analytics)

**Aggregates**
- **Snapshot** *(aggregate root)* — a computed Pulse for `(Region|State, Window)`.
  Invariants: window is closed/consistent; every figure is reproducible from the
  Mentions it was built from; always carries provenance (slice timestamps) and a
  Coverage caveat. Holds: `ThemeRanking[]`, `ToneSummary`, `EntityRanking[]`,
  `VolumeSeries`, `Spike[]`.
- **Mention** *(entity)* — one GDELT article: `url`, `source`, `publishedAt`,
  `tone`, `themes[]`, `persons[]`, `orgs[]`, `states[]` (resolved ADM1). Owned by
  Ingestion, consumed by Analytics.

**Value objects** (immutable): `StateCode` (FIPS↔ISO), `TimeWindow`,
`Tone` (score + polarity bucket), `ThemeTally`, `EntityTrend` (count + z-score),
`VolumePoint`, `Provenance`.

**Domain events**: `MentionsIngested(window, count)`,
`SnapshotComputed(scope, window)`, `SpikeDetected(scope, theme, magnitude)`.

**Domain services**: `ThemeNormaliser` (GKG theme → human label, de-noise),
`TrendDetector` (today vs trailing baseline z-score), `SpikeDetector`
(volume > mean + k·σ), `ToneAggregator`.

## 7. Functional requirements

**MVP (v1)**
- **FR-1 Ingest.** Poll GDELT GKG raw 15-min files (via `lastupdate.txt`);
  parse, filter to NE ADM1 codes, store normalised Mentions. Idempotent per
  slice; handle missing/late slices gracefully.
- **FR-2 Regional snapshot.** Compute & serve a "today" Pulse for the whole NE
  region: top themes, tone summary, top entities, volume timeline + spikes.
- **FR-3 Per-state snapshots.** Same, drillable to each of the 8 states.
- **FR-4 Source transparency.** Every theme/entity links to the underlying
  articles (URL + source + tone).
- **FR-5 Tone view.** Show overall tone, distribution, and negative-share; never
  reduce to a single emoji without the distribution.
- **FR-6 Trending.** Mark themes/entities trending using a trailing baseline, not
  raw counts.
- **FR-7 Freshness indicator.** Show data recency (latest slice time, in
  IST + UTC) prominently.
- **FR-8 Reference context.** Show each state's population/area so volume can be
  read in per-capita context.
- **FR-9 Coverage caveat (first-class).** Persistent, unmissable explainer of
  what the signal is/isn't (media coverage, language skew, geocoding noise,
  sparse states). A dedicated "How to read this" page.

**Later (v2+)**
- FR-10 Historical trends (day/week tone & theme charts).
- FR-11 Map view (GEO/GADM boundaries).
- FR-12 Data export (CSV/JSON) for researchers.
- FR-13 BigQuery "Lane 2" for deep historical/ADM2 analysis.
- FR-14 Vernacular augmentation (supplement GDELT's language gap).

## 8. Non-functional requirements

- **NFR-1 Freshness:** dashboard reflects data ≤20 min old (15-min cadence +
  processing).
- **NFR-2 Cost:** stay within free tiers — GDELT raw files (free), Cloud Run
  scale-to-zero, no standing DB if a cache suffices; BigQuery is opt-in/billed
  and off by default.
- **NFR-3 Performance:** read API p95 < 500 ms (served from precomputed read
  model, not live GDELT calls).
- **NFR-4 Reliability:** ingestion resilient to GDELT outages, missing slices and
  format drift; degrade to "last known good" with a staleness banner.
- **NFR-5 Statelessness:** app instances stateless (Cloud Run); state in a
  managed store/cache (ADR later).
- **NFR-6 Security & compliance:** honour GDELT Terms of Use + attribution; no
  secrets in repo; keyless GitHub→GCP via WIF (ADR-0002); reuse repo gitleaks
  scanning.
- **NFR-7 Accessibility & honesty:** WCAG-AA basics; no alarmist framing;
  caveats co-located with figures.
- **NFR-8 Observability:** structured logs, ingestion metrics (slices processed,
  articles, lag), uptime check.
- **NFR-9 Rate-limit etiquette:** throttle + cache GDELT requests (~1 req/s); be
  a good citizen of a free service.

## 9. Success metrics

- **Product:** a visitor can answer "what's NE India discussing today + is the
  mood net-positive/negative" in <30 s; ≥80% of themes/entities have working
  source links.
- **Technical:** ingestion success ≥99% of slices/day; data freshness SLA met
  ≥95% of the day; €0/near-zero monthly infra cost.
- **Integrity:** the coverage caveat is visible on 100% of data views (tracked
  as an acceptance test).

## 10. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Misread as public opinion | Reputational / ethical | FR-9 caveat as first-class; honest copy; "How to read this" |
| Vernacular blind spot (Assamese/Meitei/Bodo) | Under-represents grassroots NE | Disclose explicitly; v2 augmentation (FR-14) |
| Geocoding noise / capital-bias | Wrong state attribution | Show confidence/source links; aggregate over windows; document |
| Sparse states (Arunachal, Mizoram) | Thin, noisy signal | Longer windows + per-capita context; flag low-sample |
| GDELT format/endpoint drift | Ingestion breaks | ACL isolates it; contract tests; degrade gracefully (NFR-4) |
| `api.gdeltproject.org` blocked in some networks | Build/runtime access | Primary path = raw files (proven); DOC API optional |
| BigQuery cost blow-out | Surprise bill | Off by default; partition/cluster; budget alerts (FR-13) |
| GCP setup needs human device-auth | Deploy blocked from CI container | One-time owner setup + keyless WIF (ADR-0002) |

## 11. Out of scope (v1)
User accounts/auth, push alerting, mobile apps, write/UGC, paid data sources,
ML forecasting, languages beyond GDELT's coverage.

## 12. Open questions (to resolve in Phase 1 / ADRs)
1. Runtime stack & language (Node/TS vs Python) — to be decided by ADR.
2. Persistence: ephemeral cache vs lightweight store (Firestore/SQLite-on-volume
   vs none) — ADR.
3. Scheduler for 15-min ingestion: Cloud Scheduler + Cloud Run job vs in-app
   loop — ADR.
4. Theme taxonomy: how much hand-curation of GKG→human labels for v1.
5. Exact "today" window definition (IST calendar day vs rolling 24h).
6. Which states get a "low-sample" badge and at what threshold.

## 13. Phase-1 entry criteria (definition of ready)
PRD reviewed by owner; bounded contexts agreed; first vertical slice chosen
(**recommended:** "today's top themes + tone for Assam" — the densest, lowest-risk
state) to drive the walking skeleton under London-School TDD (see
[`../PROJECT-PLAN.md`](../PROJECT-PLAN.md)).
