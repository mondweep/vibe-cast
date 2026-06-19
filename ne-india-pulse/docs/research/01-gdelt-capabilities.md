# GDELT for Near-Real-Time Sensing of Discourse in North East India

> Research report (Phase 0). Produced by the RuFlo `researcher` agent (Opus).
> Scope: can the GDELT Project sense, in near-real-time, what people in the 8
> North East (NE) Indian states are talking and thinking about? Written to feed
> the engineering PRD — endpoints, parameters and codes are stated precisely;
> unverified facts are flagged.

## Executive Summary

- GDELT is a free, continuously-updated (every 15 minutes) global news
  monitoring system. It does **not** measure "what people think"; it measures
  **what the news media (predominantly online news, machine-translated to
  English) reports and the emotional tone of that reporting.** Critical framing
  distinction for the PRD.
- The most practical near-real-time tool for an NE India dashboard is the
  **DOC 2.0 API** (`https://api.gdeltproject.org/api/v2/doc/doc`): free, no API
  key, JSON/CSV/RSS output, 15-minute freshness, with `ArtList`,
  `TimelineTone`, `TimelineVolRaw`, `ToneChart` and word-cloud modes. Lookback
  is a rolling ~3-month window.
- For deep/historical analysis and custom aggregation, use the **BigQuery
  public datasets** (`gdelt-bq`): Events, Mentions, GKG with 15-minute updates;
  first 1 TiB/month of query is free.
- **Geographic filtering to NE Indian states is the weakest link.** GDELT
  geocodes to ADM1 (state) using FIPS 10-4 codes and can reach ADM2 (district)
  via GAUL/feature-ID cross-walk, but sub-national geocoding from news text is
  noisy and English/online-media biased. The DOC API does **not** expose an
  ADM1 filter — only `sourcecountry` and keywords — so DOC-API state filtering
  is keyword-based. True ADM1-code filtering requires GKG/Events via BigQuery or
  raw files.
- **Vernacular NE India coverage is partially captured.** GDELT Translingual
  machine-translates Bengali, Hindi and other major Indian languages, but
  **Assamese, Manipuri/Meitei and Bodo do not appear in GDELT's published
  supported-language lists** — a material blind spot for genuinely local NE
  discourse.

## 1. GDELT Data Products

### 1.1 GDELT 2.0 Event Database (CAMEO)
- ~58 fields per record using the **CAMEO** taxonomy (300+ event types). Split
  into **Events** (one row per event) and **Mentions** (one row per mention
  over time).
- Key fields: **EventCode** (CAMEO action), **QuadClass** (Verbal/Material ×
  Cooperation/Conflict), **GoldsteinScale** (−10…+10, property of the event
  *type*, not sentiment), **AvgTone** (−100…+100), and geography per
  Actor1/Actor2/Action: `*Geo_CountryCode`, **`*Geo_ADM1Code`** (2-char FIPS
  country + 2-char FIPS 10-4 ADM1), **`*Geo_ADM2Code`** (international = numeric
  **GAUL**), `*Geo_Lat/Long`, **`*Geo_FeatureID`** (GNS/GNIS).
- **Good for:** structured "something happened" signals (protests, clashes,
  arrests) with location + conflict/cooperation axis. Less good for "what is
  everyone discussing" — that's GKG's job.
- Historical depth: Events back to **1 Jan 1979** (1.0); 2.0 from Feb 2015 with
  15-minute updates.

### 1.2 Global Knowledge Graph (GKG 2.0 / 2.1) — core product for topics & emotion
Per article (GKG 2.1 codebook field names):
- **V2Themes / V2EnhancedThemes** — GKG theme taxonomy (hundreds of themes).
- **V2Persons / V2Organizations** (+ Enhanced variants) — named entities.
- **V2Locations / V2EnhancedLocations** — geocoded mentions: location type, FIPS
  country, **ADM1 (FIPS 10-4)**, lat/long, feature ID.
- **V2Counts** — extracted numeric counts ("15 killed").
- **V2Tone** — tone vector: (1) **Tone** = Positive − Negative; (2)
  **PositiveScore**; (3) **NegativeScore**; (4) **Polarity** (emotional charge);
  (5) **Activity Reference Density**; (6) **Self/Group Reference Density**; plus
  word count.
- **V2GCAM (Global Content Analysis Measures)** — richest emotional layer: each
  article scored across **~2,300+ emotions/themes** from 24 dictionaries.
  Native emotion scoring in 15 languages (incl. **Hindi**, Urdu); all else via
  English machine translation.
- **Good for:** "top themes," "trending people/orgs," "emotional tone" — exactly
  the recipes the PRD wants. GKG 1.0 from Apr 2013; 2.1 from Feb 2015, 15-min
  updates.

> Codebook caveat: the GKG 2.1 codebook PDF intermittently returned HTTP 503
> during research. Field names corroborated across search results + the Event
> codebook, but re-verify the exact GCAM dimension count and V2Tone sub-field
> ordering against the PDF before implementation.

### 1.3 DOC 2.0 API — the near-real-time workhorse
- **Endpoint:** `https://api.gdeltproject.org/api/v2/doc/doc`
- **No API key. CORS `Access-Control-Allow-Origin: *`** (browser-embeddable).
- **`query`** supports phrases, `OR`, negation (`-`), and inline operators
  (values *inside* the query string, not URL params): `domain:`, `domainis:`,
  `sourcecountry:`, `sourcelang:`, `theme:`, `tone>`/`tone<`, `toneabs`,
  `near20:"a b"`, `repeat3:"word"`.
- **`mode`:** `ArtList`, `ArtGallery`, `TimelineVol`, **`TimelineVolRaw`**,
  `TimelineVolInfo` (timeline + top-10 articles/interval), **`TimelineTone`**,
  `TimelineLang`, `TimelineSourceCountry`, **`ToneChart`**, word-cloud image
  modes. (Verify whether a plain-text word-cloud mode exists.)
- **`format`:** `HTML` (default), `CSV`, `JSON`, `JSONP`, `RSS`, `RSSArchive`,
  `JSONFeed`.
- **`timespan`:** e.g. `15min`, `24h`, `7d`, `3m` (default ~3 months);
  **`startdatetime`/`enddatetime`** `YYYYMMDDHHMMSS` within the rolling ~3-month
  window.
- **`maxrecords`** (default 75, max **250**), `sort`
  (`DateDesc`/`DateAsc`/`ToneDesc`/`ToneAsc`/`HybridRel`), `timelinesmooth`.
- **Rate limits:** none published; treat as undocumented soft-throttled. Plan
  ~1 req/sec and cache aggressively.

**Example URL** (recent NE India articles with tone, JSON, last 24h):
```
https://api.gdeltproject.org/api/v2/doc/doc?query=(Assam OR Manipur OR Meghalaya OR Mizoram OR Nagaland OR Tripura OR "Arunachal Pradesh" OR Sikkim) sourcecountry:IN&mode=ArtList&format=json&timespan=24h&sort=DateDesc&maxrecords=250
```
Tone timeline: swap `mode=TimelineTone`. Tonal histogram: `mode=ToneChart`.

### 1.4 GEO 2.0 API
- **Endpoint:** `https://api.gdeltproject.org/api/v2/geo/geo`
- Maps every location mentioned within ~1–2 sentences of a keyword/theme over
  the last **7 days**, 15-min updates; GeoJSON/HTML output. Good for a map
  widget showing *where* a topic is discussed. English-translation-based.

### 1.5 TV API / Television Explorer
- **Endpoint:** `https://api.gdeltproject.org/api/v2/tv/tv` (Internet Archive TV
  News Archive). **Relevance to NE India: low** — no Indian regional TV. Noted
  for completeness only.

### 1.6 GEG, Context 2.0, Global Difference Graph
- **Global Entity Graph (GEG)** — 11B+ entity annotations (English news since
  Jul 2016) via Google Cloud NL API + **neural multilingual sentiment**;
  BigQuery-hosted; updates every minute. Alternative to GCAM tone at entity
  level.
- **Context 2.0 API** — full-text contextual search across ~140 languages.
- **Global Difference Graph** — *not verified this pass; do not treat as
  load-bearing without confirmation.*

### 1.7 Translingual coverage for Indian languages
- Translingual 1.0 (2015): 65 languages; 2.0 (Jan 2022): **109 languages**.
- **Confirmed translated Indian languages:** Bengali, Gujarati, Hindi, Kannada,
  Malayalam, Marathi, Odia, Punjabi, Sindhi, Tamil, Telugu, Urdu (+ Nepali).
- **NOT in published lists:** **Assamese, Manipuri/Meitei, Bodo** — the biggest
  substantive limitation for genuinely vernacular NE discourse.

## 2. Update Frequency, Depth, Latency
- **Cadence:** GDELT 2.0 + DOC/GEO APIs update **every 15 minutes** (files
  ~0–4/15–19/30–34/45–49 past the hour). Poll `lastupdate.txt` around 7/25/40/55
  past. GEG updates every minute.
- **Depth:** Events→1979; GKG→Apr 2013; 2.0/2.1→Feb 2015. DOC lookback ~3
  months; GEO ~7 days.
- **Latency:** ~15–30 min from publication. Fine for "today/this hour", not
  sub-minute breaking news.

## 3. Access Methods & Cost
- **Free APIs (no key):** DOC 2.0, GEO 2.0, TV 2.0, Context 2.0 — best for live
  dashboards.
- **BigQuery `gdelt-bq`** (`gdelt-bq.gdeltv2.events|eventmentions|gkg`), 15-min
  updates. **First 1 TiB/month free**, then on-demand pricing. Bills by **bytes
  scanned per column** — partition/cluster, select narrow columns, avoid
  scanning V2GCAM/V2Tone unless needed.
- **Raw CSV:** master index
  `http://data.gdeltproject.org/gdeltv2/masterfilelist.txt`; latest pointer
  `http://data.gdeltproject.org/gdeltv2/lastupdate.txt`; zipped CSV
  (`*.export/.mentions/.gkg.CSV.zip`). Cheapest path for a self-hosted pipeline.
- **Licensing:** "100% free and open" with Terms of Use at
  `gdeltproject.org/about.html#termsofuse` (attribution expected). Review before
  commercial deployment — some upstream components have their own constraints.

## 4. Geographic Granularity for India
- GDELT geocodes to country (FIPS 10-4 `IN`), **ADM1** (`IN` + 2-char FIPS 10-4
  state), **ADM2** (numeric GAUL via FeatureID cross-walk), lat/long, GNS
  FeatureID. India is geocodable to state/district in principle.
- **Reliability:** sub-national geocoding from text is **noisy** —
  disambiguation errors, default-to-capital effects, English/online skew. State
  attribution is indicative, not authoritative; ADM2 is substantially noisier.

**FIPS 10-4 ADM1 codes for the 8 NE states — DATA-QUALITY FLAG.** GDELT's
`ADM1Code` uses **FIPS 10-4**, which conflicts with ISO-numbered tables. From
the FIPS 10-4 India list:

| State | FIPS 10-4 (GDELT ADM1Code) |
|---|---|
| Assam | **IN03** |
| Manipur | **IN17** |
| Meghalaya | **IN18** |
| Nagaland | **IN20** |
| Tripura | **IN26** |
| Sikkim | **IN29** |
| Arunachal Pradesh | **IN30** |
| Mizoram | **IN31** |

> **Action:** validate empirically in BigQuery (`GROUP BY ActionGeo_ADM1Code`
> where `ActionGeo_CountryCode='IN'`, check `ActionGeo_FullName`) before
> hard-coding. A second source (statoids GEC) returns 11–18 (ISO-style) — **not**
> what GDELT stores. Note FIPS 10-4 froze in 2015 (pre-Telangana).

- **DOC API has no ADM1 filter** — state filtering must be keyword-based (state
  names + cities: Guwahati, Imphal, Shillong, Aizawl, Kohima, Itanagar,
  Agartala, Gangtok). ADM1-code filtering needs GKG/Events (BigQuery/raw).

## 5. Concrete Recipes
Scope (A) DOC API keyword; (B) BigQuery ADM1 codes
`ADM1Code IN ('IN03','IN17','IN18','IN20','IN26','IN29','IN30','IN31')` — *after §4 verification*.

**(a) Top themes today** — GKG `V2Themes` (BigQuery) or DOC word-cloud/theme
tallies:
```sql
SELECT theme, COUNT(*) AS n
FROM `gdelt-bq.gdeltv2.gkg`, UNNEST(SPLIT(V2Themes, ';')) AS theme
WHERE DATE(_PARTITIONTIME) = CURRENT_DATE()
  AND REGEXP_CONTAINS(V2Locations, r'#IN03#|#IN17#|#IN18#|#IN20#|#IN26#|#IN29#|#IN30#|#IN31#')
  AND theme != ''
GROUP BY theme ORDER BY n DESC LIMIT 50;
```

**(b) Emotional tone** — DOC `TimelineTone`/`ToneChart` (live) or GKG
`V2Tone`/GCAM:
```
https://api.gdeltproject.org/api/v2/doc/doc?query=(Assam OR Manipur OR ...) sourcecountry:IN&mode=TimelineTone&format=json&timespan=7d
```

**(c) Trending entities** — GKG `V2Persons`/`V2Organizations` (BigQuery), or GEG
neural sentiment. Detect "trending" via today vs trailing-7-day z-score.

**(d) Volume timeline / spikes** — DOC `TimelineVolRaw`; flag intervals where
raw volume > rolling mean + k·σ.

## 6. Limitations & Caveats (read before PRD sign-off)
1. **Media coverage, not public opinion.** No social media, messaging, or
   surveys. "What people think" is a weak inference.
2. **English/online-media skew.** Local print/radio/community media
   under-represented.
3. **Vernacular blind spot.** Assamese/Meitei/Bodo not translated — biases
   toward national-media framing of NE events.
4. **Geographic misattribution.** ADM1/ADM2 from text is error-prone;
   national-dateline NE stories may geocode to Delhi.
5. **GKG theme noise.** Themes over-fire; need denoising + baselining.
6. **FIPS 10-4 confusion.** Verify ADM1 codes empirically.
7. **BigQuery cost.** Per-column scans burn the free tier; partition/cluster.
8. **Undocumented API limits.** Cache + throttle.
9. **Some products unverified** (Global Difference Graph; exact V2Tone ordering;
   plain-text word-cloud mode) — confirm before they become load-bearing.

## Recommended Architecture (PRD seed)
Two lanes. **Lane 1 (live dashboard):** poll free **DOC 2.0 API** every 15 min
with the keyword + `sourcecountry:IN` NE query (`ArtList`, `TimelineVolRaw`,
`TimelineTone`, `ToneChart` JSON); cache and serve. **Lane 2
(analytics/geo-precise):** poll `lastupdate.txt` and ingest GKG/Mentions CSVs
(or query `gdelt-bq` GKG) filtered on verified ADM1 codes, for state-accurate
theme/entity aggregation and tone baselines. Use Lane 1 for freshness, Lane 2
for accuracy. Treat all output as **media-coverage signal**, not public
sentiment.

## Sources
- DOC 2.0 API — https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
- DOC API parameter reference — https://github.com/alex9smith/gdelt-doc-api/blob/main/README.md
- GKG 2.0 (GCAM, themes) — https://blog.gdeltproject.org/introducing-gkg-2-0-the-next-generation-of-the-gdelt-global-knowledge-graph/
- GKG 2.1 Codebook — http://data.gdeltproject.org/documentation/GDELT-Global_Knowledge_Graph_Codebook-V2.1.pdf (intermittent 503)
- Event Codebook V2.0 — http://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf
- GDELT 2.0 realtime — https://blog.gdeltproject.org/gdelt-2-0-our-global-world-in-realtime/
- Translingual 2.0 (109 langs) — https://blog.gdeltproject.org/gdelt-translingual-2-0-now-live-translates-everything-gdelt-monitors-in-109-languages-dialects/
- Translingual 1.0 (65 langs) — https://blog.gdeltproject.org/gdelt-translingual-translating-the-planet/
- GEO 2.0 API — https://blog.gdeltproject.org/gdelt-geo-2-0-api-debuts/
- TV API — https://blog.gdeltproject.org/gdelt-2-0-television-api-debuts/
- GEG — https://blog.gdeltproject.org/announcing-the-global-entity-graph-geg-and-a-new-11-billion-entity-dataset/
- GEG multilingual neural sentiment — https://blog.gdeltproject.org/global-entity-graph-geg-now-offers-multilingual-neural-sentiment/
- Context 2.0 API — https://blog.gdeltproject.org/announcing-the-gdelt-context-2-0-api/
- Data: querying/downloading — https://www.gdeltproject.org/data.html
- BigQuery GKG sample queries — https://blog.gdeltproject.org/google-bigquery-gkg-2-0-sample-queries/
- BigQuery table decorators (cost) — https://blog.gdeltproject.org/using-bigquery-table-decorators-to-lower-query-cost/
- BigQuery public data / pricing — https://docs.cloud.google.com/bigquery/public-data ; https://cloud.google.com/bigquery/pricing
- masterfilelist / lastupdate — http://data.gdeltproject.org/gdeltv2/masterfilelist.txt ; http://data.gdeltproject.org/gdeltv2/lastupdate.txt
- FIPS 10-4 India codes — https://en.wikipedia.org/wiki/List_of_FIPS_region_codes_(G%E2%80%93I)
- States of India code tables (GEC/ISO, conflicts with FIPS) — https://statoids.com/uin.html
