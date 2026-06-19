# What is North East India thinking about today? — Live GDELT snapshot

> **Proof-of-concept run, 2026-06-19.** This is a real query against live GDELT
> data — not a mock — validating that the concept works end-to-end before we
> commit to the PRD. Method and caveats below.

## Method

- **Source:** GDELT 2.0 GKG raw 15-minute files from
  `http://data.gdeltproject.org/gdeltv2/` (the free, no-key "Lane 2" path).
- **Window:** 24 consecutive 15-minute slices = **6 hours, 2026-06-19
  09:45–15:30 UTC** (≈ 15:15–21:00 IST — i.e. today, afternoon/evening India).
- **NE-India filter:** an article counts as "NE India" if any GKG `V1Locations`
  entry has a **FIPS 10-4 ADM1 code** in
  `{IN03, IN17, IN18, IN20, IN26, IN29, IN30, IN31}` (Assam, Manipur, Meghalaya,
  Nagaland, Tripura, Sikkim, Arunachal Pradesh, Mizoram). This **empirically
  confirmed** the FIPS codes from the demographics + capability research.
- **Reproducible:** see [`../../scripts/ne_pulse_snapshot.py`](../../scripts/ne_pulse_snapshot.py).

> ⚠️ Why raw files, not the DOC API: in the build environment
> `api.gdeltproject.org` was unreachable (network policy), while
> `data.gdeltproject.org` worked. The raw-file path is also the most
> cost-controlled ingestion route for production (see ADR-0002 / PRD §NFRs).

## Headline result

- **95 NE-India-geocoded articles** in the 6-hour window.
- **Average tone +0.68** (mildly positive) — but **40% of articles negative**
  (38 neg / 57 non-neg): a mixed, not upbeat, news day.
- **Coverage skews to Assam** (44 of 95) — consistent with Assam being by far
  the largest NE state and best-covered by English/Hindi media; **Arunachal
  Pradesh barely registers** (2), confirming the under-coverage caveat.

### Articles per state
| State | Articles |
|---|---:|
| Assam | 44 |
| Meghalaya | 21 |
| Tripura | 18 |
| Nagaland | 15 |
| Manipur | 11 |
| Mizoram | 6 |
| Arunachal Pradesh | 2 |

### What NE India's news is about today (top GKG themes)
Environment & rivers (`UNGP_FORESTS_RIVERS_OCEANS`, 50) · government policy
(`EPU_POLICY_GOVERNMENT`, 36) · public-sector management & governance ·
**education** (Nagaland's appeal for a linguistic exemption under the 3-language
policy) · **health/medical** (a **Japanese Encephalitis outbreak in Assam — 35
cases, 7 deaths**) · agriculture & rural · transport & road safety · monsoon
**weather** (`CRISISLEX_O01_WEATHER`) · conflict/violence & justice · jobs.

### Who/what is in the conversation
- **People:** Narendra Modi (23), Nirmala Sitharaman (9); **Assam CM Himanta
  Biswa Sarma** (seeking enhanced EAP funding for the NE's growth); **Manipur
  CM** calling for a "united state". (Many global leaders also appear via G7
  coverage tied to NE-datelined wires.)
- **Orgs:** organic-farming producer companies & National Programme for Organic
  Production, Trinamool Congress, NDA, regional parties.
- **Top sources:** indiatimes.com, prokerala.com, newkerala.com,
  **sentinelassam.com**, **theshillongtimes.com**, **morungexpress.com** (Nagaland) —
  a healthy mix of national wires and genuine NE-regional outlets.

### Representative stories
- Assam: Japanese Encephalitis — 35 cases, 7 deaths (theshillongtimes.com)
- Assam: CM Himanta seeks larger EAP funding window for the NE (timesofindia)
- Manipur: CM calls for a "united state as only path forward" (economictimes)
- Nagaland: CBSE schools appeal for linguistic exemption under 3-language policy (thehindu)
- Guwahati (Assam): traffic-violation fines jump to ₹3 crore Apr–May (timesofindia)
- Nagaland University researchers at World Bank Youth Summit (shillongtimes)

## What this proves (and doesn't)

✅ **Proves:** GDELT can answer "what is NE India talking about today" with real
themes, tone, entities and named regional sources, refreshed every 15 minutes,
for free — end to end. The FIPS ADM1 filter works. There's enough signal for a
useful daily dashboard.

⚠️ **Doesn't prove public opinion.** This is the **media conversation**, heavily
English/Hindi-skewed; Assamese/Meitei/Bodo vernacular outlets are largely
absent. Sparse states (Arunachal, Mizoram) will have thin, noisier signal.
Single-slice volume is tiny (~3 articles/15 min) — meaningful aggregation needs
multi-hour windows and day-over-day baselines (built into the PRD).
