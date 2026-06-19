# Product Requirements Document — SkyWatch

> A desktop device (ESP32) that shows the **flights and satellites around me**
> right now, and tells me when the next interesting satellite pass is.
>
> Written with a **Domain-Driven Design** lens: ubiquitous language → bounded
> contexts → domain model → requirements. Architecture choices live in the
> [ADRs](../adr/); the build order lives in the
> [Implementation Plan](../IMPLEMENTATION-PLAN.md).

## 1. Vision & problem

I have ESP32 devices and want a tangible, glanceable "window on the sky": a
small desktop radar that plots aircraft overhead **and** satellites currently
above the horizon, plus a heads-up for upcoming passes (ISS, Starlink trains,
NOAA, bright visual sats). Inspired by the hackster "Micro Radar" flight
tracker, extended to the orbital domain.

### Goals
- G1 — Show aircraft within a configurable range of my location, live.
- G2 — Show satellites currently above my horizon (az/el) and which they are.
- G3 — Predict upcoming satellite passes (AOS/TCA/LOS, max elevation).
- G4 — Run on common ESP32 display modules with **zero soldering**.
- G5 — Be source-agnostic: swap flight/TLE providers without touching the core.
- G6 — Be **relatable**: let the browser user see flights on a real map of where
  they are, alongside the polar radar (ADR-0012).

### Non-goals (initial)
- Not a precision antenna-rotator controller (though pass data could drive one).
- Not our own ADS-B/RF receiver (cloud APIs instead — preserves G4).
- Not a historical analytics platform.

## 2. Personas & top user stories
- **Hobbyist (me):** "At a glance, what's flying near me and what's overhead?"
- **Sky-watcher:** "When is the ISS visible next, and where do I look?"
- **Maker:** "Point it at a different satellite group or flight provider easily."

| # | As a … | I want … | So that … |
| --- | --- | --- | --- |
| US1 | user | nearby aircraft plotted by bearing/distance | I see traffic overhead |
| US2 | user | satellites currently above my horizon | I know what's up right now |
| US3 | user | the next passes for a satellite group | I can plan to look up |
| US4 | user | to set my location, range, and min elevation | results match my sky |
| US5 | maker | to switch data sources via config | I'm not locked to one API |

## 3. Ubiquitous language (glossary)

| Term | Meaning |
| --- | --- |
| **Observer** | The location (lat, lon, altitude) and preferences (range, min elevation) at the centre of the sky. |
| **Aircraft** | A flying object reported via ADS-B, identified by its **ICAO24** hex address. |
| **Nearby Aircraft** | An aircraft within the observer's range, annotated with distance & bearing. |
| **Satellite** | An orbiting object tracked via its **TLE**. |
| **TLE** | Two-Line Element set; orbital parameters at an epoch. |
| **Propagator** | Computes a satellite's position/look-angle at a time (SGP4). |
| **Look Angle** | Azimuth, elevation, slant range of a satellite from the observer. |
| **Pass** | The interval a satellite is above the observer's minimum elevation. |
| **AOS / TCA / LOS** | Acquisition of Signal (rise) / Time of Closest Approach (peak) / Loss of Signal (set). |
| **Sky Snapshot** | The combined read model the device renders: flights + overhead sats + upcoming passes. |
| **Feed / Source / Propagator** | Ports to the outside world (ADS-B feed, TLE source, SGP4). |

## 4. Bounded contexts (DDD strategic design)

```
                         ┌─────────────────────────────┐
                         │      Observer (Shared        │
                         │      Kernel): location,       │
                         │      range, min elevation     │
                         └───────────┬─────────┬─────────┘
                                     │         │
              ┌──────────────────────▼──┐   ┌──▼──────────────────────┐
              │   Flight Tracking        │   │   Satellite Tracking     │
              │   Context                │   │   Context                │
              │  • Aircraft, Nearby      │   │  • Satellite (TLE)       │
              │  • NearbyAircraftService │   │  • LookAngle, Pass       │
              │  • AircraftFeed (port)   │   │  • PassPredictor         │
              │   ACL → OpenSky/adsb.lol │   │  • Propagator, TleSource │
              └────────────┬─────────────┘   │   ACL → satellite.js,    │
                           │                 │         CelesTrak         │
                           │                 └────────────┬─────────────┘
                           │   ┌──────────────────────────┘
                           ▼   ▼
                 ┌────────────────────────┐        ┌──────────────────────┐
                 │  Aggregation (App):     │ JSON   │  Device / Presentation │
                 │  SkySnapshotService     ├───────►│  Context (ESP32        │
                 │  builds the Sky Snapshot│  HTTP  │  firmware: render)     │
                 └────────────────────────┘        └──────────────────────┘
```

- **Flight Tracking** and **Satellite Tracking** are the two core domains, kept
  separate because their data, math, and change cadence differ entirely.
- **Observer** is a **Shared Kernel** value object both depend on.
- **Aggregation** is an application/use-case layer composing both into a single
  **Sky Snapshot** (a read model / published language for the device).
- **Device/Presentation** is the ESP32 firmware — a downstream **Conformist**
  consuming the snapshot.
- Each external API sits behind an **Anti-Corruption Layer** (a port + adapter),
  so OpenSky/CelesTrak/satellite.js specifics never leak into the domain
  (ADR-0003).

### Context map relationships
- Flight ↔ Satellite: *Separate Ways* (no shared model beyond the Shared Kernel).
- Core domains → External APIs: *Anti-Corruption Layer*.
- Aggregation → Device: *Customer/Supplier* with a *Published Language* (the
  Sky Snapshot JSON contract).

## 5. Domain model (tactical)

**Value objects:** `GeoCoordinate`, `BoundingBox`, `Observer`, `LookAngle`,
`Aircraft`, `NearbyAircraft`, `Satellite`, `SatellitePass`.

**Domain services:**
- `NearbyAircraftService` — turns the observer range into a query box, filters
  the feed to a true circular range, annotates distance/bearing, orders by
  proximity.
- `PassPredictor` — samples elevation over a time window via the `Propagator`
  port and extracts passes (AOS/TCA/LOS, peak).

**Application service:** `SkySnapshotService` — composes both contexts into a
`SkySnapshot`.

**Ports (driven):** `AircraftFeed`, `TleSource`, `Propagator`.
**Adapters:** `OpenSkyFeed`, `CelestrakTleSource`, `Sgp4Propagator`.

## 6. Functional requirements

| ID | Requirement | Story |
| --- | --- | --- |
| FR1 | Fetch aircraft states within a bounding box from a pluggable feed | US1, US5 |
| FR2 | Filter aircraft to the observer's circular range; annotate distance & bearing; sort nearest-first | US1 |
| FR3 | Fetch TLEs for a named group from a pluggable source, cached with a TTL | US2, US5 |
| FR4 | Compute a satellite's look angle (az/el/range) for the observer at a time | US2 |
| FR5 | List satellites currently above the observer's minimum elevation | US2 |
| FR6 | Predict passes over a window with AOS/TCA/LOS, max elevation, duration | US3 |
| FR7 | Expose a single **Sky Snapshot** (flights + overhead + passes) as JSON | US1–3 |
| FR8 | Configure observer location, range, range units, min elevation, satellite group, credentials via on-device Wi-Fi portal | US4 |
| FR9 | Firmware renders the snapshot on a round/rectangular ESP32 display | US1–3 |
| FR10 | Browser offers a **map view** (Radar ⇄ Map) plotting flights at their real positions with the observer + range circle (ADR-0012) | US1, G6 |
| FR11 | Map view also plots satellites at their **sub-satellite ground point** with a line from the observer; click → details popup (visible above the map). Gateway exposes `subLatDeg`/`subLonDeg` per overhead satellite (ADR-0013, #11) | US2, G6 |

## 7. Non-functional requirements
- **NFR1 Testability:** domain is pure and unit-tested with mocked ports
  (London-School TDD, ADR-0006). No network in unit tests.
- **NFR2 Source-agnosticism:** swap providers by adding an adapter only (ADR-0002/0003).
- **NFR3 API-friendliness:** cache TLEs; poll flights modestly; respect rate limits.
- **NFR4 Footprint:** firmware stays a thin client; heavy math on the gateway (ADR-0001).
- **NFR5 Privacy:** observer coordinates remain on the user's device/gateway.
- **NFR6 Resilience:** one failing source (e.g. flights) must not break the other (satellites).

## 8. Acceptance criteria (Phase 1 — implemented)
- ✅ Given a feed returning aircraft inside & outside range, `NearbyAircraftService`
  returns only in-range ones, nearest-first, with distance & bearing.
- ✅ Given a scripted elevation curve, `PassPredictor` detects each pass with
  correct AOS/TCA/LOS and peak elevation, and none when below the minimum.
- ✅ Real SGP4 (`Sgp4Propagator`) yields a physically plausible look angle.
- ✅ OpenSky & CelesTrak adapters map/parse correctly and cache TLEs by TTL.
- ✅ Full suite is green with zero network access.

## 9. Risks
| Risk | Mitigation |
| --- | --- |
| Flight feed blocks cloud IPs / rate-limits | **Realised** (OpenSky on Cloud Run) → swapped default to adsb.lol behind the same port (ADR-0011) |
| Stale TLEs degrade accuracy | TTL cache + daily refresh (ADR-0005) |
| CelesTrak throttles cloud IPs | **Realised** → retry + stale-cache + bundled fallback TLE (ADR-0011) |
| ESP32 too weak for heavy math | Gateway-centric design (ADR-0001) |
| Provider outage | Per-context isolation (NFR6); degrade gracefully |
