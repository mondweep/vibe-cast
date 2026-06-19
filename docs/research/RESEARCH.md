# Research: Tracking Flights & Satellites Around Me with ESP32

> Grounding research for the SkyWatch project. Captures the prior art, data
> sources, and constraints that the PRD and ADRs build on.

## 1. The inspiration: "Micro Radar" desktop flight tracker

The [hackster.io build](https://www.hackster.io/news/build-a-desktop-flight-tracker-with-an-esp32-and-zero-soldering-b91c46ada9da)
("Micro Radar") establishes the baseline we extend:

| Aspect | Micro Radar | Notes for SkyWatch |
| --- | --- | --- |
| Board | ESP32-C3 with a 1.28" 240×240 round IPS display | Round display is ideal for a radar/sky-dome view |
| Soldering | None (heat-set inserts only) | Keep the zero-soldering goal |
| Data source | **OpenSky Network** REST API over Wi-Fi (no SDR) | Confirms a cloud-API approach works on ESP32 |
| Config | On-device Wi-Fi AP + web portal (coords, range, range units, credentials) | We reuse this UX pattern |
| Compute | Thin client: query API → draw | We add a gateway for the heavier satellite math |

**Key takeaway:** flights can be sourced from a public API rather than RF
hardware, preserving "zero soldering." We extend the same device to also show
**satellites**.

## 2. Flight (ADS-B) data sources

ADS-B is broadcast by aircraft and aggregated by several networks. Options for
sourcing it without our own receiver:

| Source | Access | Bounding-box query | Notes |
| --- | --- | --- | --- |
| **adsb.lol** | Free, **no auth** | point + radius (`/v2/lat/…/lon/…/dist/…`) | **Chosen default** (ADR-0011): open and reachable from cloud egress. |
| OpenSky Network | Free tier; OAuth2 client-credentials | `/states/all?lamin&lomin&lamax&lomax` | Used by Micro Radar; was the original default (ADR-0002). **Blocks datacenter IPs**, so demoted to opt-in (`FLIGHT_SOURCE=opensky`). |
| airplanes.live / adsb.fi | Free community feeds | radius / box | Further alternatives; same shape behind our `AircraftFeed` port. |
| FlightAware / Flightradar24 | Paid | Yes | Out of scope |
| Local RTL-SDR + dump1090 | Self-hosted | localhost JSON | Optional future adapter; reintroduces hardware |

### OpenSky specifics (verified June 2026)
- **Auth:** OAuth2 **client-credentials** flow is required for accounts created
  since mid-March 2025. Create an API client on the Account page to get
  `client_id` / `client_secret`, exchange for a bearer token, send as
  `Authorization: Bearer …`.
- **Endpoint:** `GET /states/all` with `lamin,lomin,lamax,lomax` returns a
  `states` array of positional vectors: `[icao24, callsign, origin_country,
  time_position, last_contact, longitude, latitude, baro_altitude, on_ground,
  velocity, true_track, vertical_rate, …]`.
- **Rate limits:** credit-based per day; bounding-box size affects cost. Cache
  and poll modestly (e.g. every 5–15 s).

## 3. Satellite tracking

Satellites are not broadcast like ADS-B; their positions are **computed** from
orbital elements.

### Two-Line Element sets (TLE) + SGP4
- A **TLE** encodes a satellite's orbit at an epoch. Source: **CelesTrak**
  (`celestrak.org/NORAD/elements/gp.php?GROUP=<group>&FORMAT=tle`) or
  Space-Track. Useful groups: `stations` (ISS), `visual` (brightest), `starlink`,
  `noaa`, `gps-ops`, `amateur`.
- **SGP4** is the standard propagation model that turns a TLE + time into an
  Earth-Centered position. From there we compute **look angles**
  (azimuth/elevation/range) for the observer.
- TLEs go stale; re-fetch roughly daily (we cache with a TTL — ADR-0005).

### Where to run SGP4
- **On the ESP32:** feasible — community projects (HB9IIU ESP32-ISS-Tracker,
  OK5TVR tracker) run SGP4 on-device (~300 propagations/sec at 160 MHz, TLEs
  cached in flash). Good for single-satellite trackers.
- **On a gateway:** better when tracking *many* satellites, predicting passes,
  and combining with flight data. We choose a **gateway-centric** design so the
  firmware stays thin and we can compute visible-pass schedules for whole groups
  (ADR-0001, ADR-0004). On-device SGP4 remains a viable Phase-4 option.

### Pass prediction & visibility
- A **pass** is the interval a satellite is above a minimum elevation (e.g.
  10°). We report **AOS** (rise), **TCA** (peak), **LOS** (set), max elevation,
  and duration.
- **Optically visible** passes additionally require the satellite to be sunlit
  while the observer is in darkness (twilight). Phase 1 computes geometric
  passes; sunlit-visibility is a Phase-3 refinement.

### Libraries
- **Node/gateway:** [`satellite.js`](https://github.com/shashwatak/satellite-js)
  — SGP4/SDP4, `twoline2satrec`, `propagate`, `eciToEcf`, `ecfToLookAngles`.
  `tle.js` is a friendlier wrapper over it.
- **ESP32 (future on-device):** an Arduino SGP4 library (e.g. Hopperpop/Sgp4).

## 4. Constraints & implications

1. **Zero soldering** → cloud APIs, no SDR; pre-built ESP32 display modules.
2. **ESP32 is resource-constrained** → push aggregation, multi-satellite SGP4,
   and pass scheduling to a gateway; firmware polls a compact JSON snapshot.
3. **External APIs are rate-limited & may change** → isolate them behind ports
   (Anti-Corruption Layer) so sources are swappable (ADR-0002, ADR-0003).
4. **Privacy** → observer coordinates stay local (device + user's own gateway).

## Sources
- [Build a Desktop Flight Tracker With an ESP32 and Zero Soldering — hackster.io](https://www.hackster.io/news/build-a-desktop-flight-tracker-with-an-esp32-and-zero-soldering-b91c46ada9da)
- [OpenSky Network REST API docs](https://openskynetwork.github.io/opensky-api/rest.html)
- [OpenSky API (OAuth2 client credentials)](https://github.com/openskynetwork/opensky-api/blob/master/docs/free/rest.rst)
- [CelesTrak — satellite tracking & TLE/GP data](https://celestrak.org/)
- [satellite.js — SGP4/SDP4 in JavaScript](https://github.com/shashwatak/satellite-js)
- [tle.js](https://github.com/davidcalhoun/tle.js/)
- [HB9IIU ESP32-ISS-Tracker (on-device SGP4)](https://github.com/HB9IIU/ESP32-ISS-Tracker)
- [OK5TVR satellite tracker (multi-sat SGP4 on ESP32)](https://github.com/ok5tvr/satelite_tracker)
