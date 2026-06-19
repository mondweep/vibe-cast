# 🛰️ SkyWatch — track the flights *and* satellites around me

> A desktop **ESP32** device that plots the aircraft overhead **and** the
> satellites currently above my horizon, and tells me when the next interesting
> pass (ISS, Starlink, NOAA, bright visual sats) will be.
>
> Inspired by the hackster.io ["Micro Radar" desktop flight tracker](https://www.hackster.io/news/build-a-desktop-flight-tracker-with-an-esp32-and-zero-soldering-b91c46ada9da),
> extended from flights into orbit — **zero soldering**, source-agnostic.

This branch (`aircraft-tracking`) is an **orphan branch**: a fresh, standalone
project, independent of the rest of the `vibe-cast` repository history.

## What it does
- ✈️ **Flights:** live ADS-B aircraft within a configurable range, by
  bearing/distance (default source: OpenSky Network — no RF hardware needed).
- 🛰️ **Satellites:** which satellites are above your horizon right now (az/el),
  computed from TLEs via SGP4.
- ⏱️ **Passes:** upcoming passes with AOS (rise) / TCA (peak) / LOS (set), max
  elevation and duration.
- 🔌 **Source-agnostic:** flight feed, TLE source, and propagator all sit behind
  ports — swap providers by adding an adapter.

## How it's built
A **gateway service** does the heavy lifting and serves a single **Sky Snapshot**
JSON; the **ESP32 firmware** is a thin client that self-configures over Wi-Fi and
renders it (ADR-0001).

```
 ESP32 device  ──HTTP GET /sky──►  Gateway (TypeScript)
 (thin client)  ◄──Sky Snapshot──   ├─ Flight Tracking   → OpenSky  (AircraftFeed)
                                     ├─ Satellite Tracking → CelesTrak (TleSource)
                                     │                     → SGP4      (Propagator)
                                     └─ Aggregation → SkySnapshotService
```

Built with **Domain-Driven Design**, **Architecture Decision Records**, and
**TDD (London School)**. See the docs.

## Documentation
| Doc | What's in it |
| --- | --- |
| [docs/research/RESEARCH.md](docs/research/RESEARCH.md) | Prior art, data sources (OpenSky, CelesTrak, SGP4), constraints |
| [docs/prd/PRD.md](docs/prd/PRD.md) | DDD PRD: ubiquitous language, bounded contexts, domain model, requirements |
| [docs/adr/](docs/adr/README.md) | ADR-0001…0008 — the decisions that guide the build |
| [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md) | Phase-wise plan (Phase 1 done), ADR-guided, with traceability |

## Repository layout
```
.
├─ docs/                      # research, PRD (DDD), ADRs, implementation plan
├─ services/gateway/          # TypeScript gateway: domain core + adapters (Phase 1 ✅)
│  ├─ src/shared/             #   Observer + geo (Shared Kernel)
│  ├─ src/flight/             #   Flight Tracking context (domain/ports/adapters)
│  ├─ src/satellite/          #   Satellite Tracking context (domain/ports/adapters)
│  ├─ src/application/        #   SkySnapshotService (aggregation)
│  └─ test/                   #   London-School TDD suite
├─ firmware/                  # ESP32 thin-client scaffold (PlatformIO) (Phase 4 ⬜)
├─ CLAUDE.md, .claude/, .mcp.json, .claude-flow/   # RuFlo swarm orchestration
└─ README.md
```

## Where you see it (front-ends)
The ESP32 is a **thin client / consumer** (ADR-0001/0008): it doesn't compute
anything, it just polls the gateway's `GET /sky` Sky Snapshot and draws it. The
same snapshot feeds two consumers:

1. **Browser front-end** — open **`http://<gateway-host>:8080/`** on any
   phone/laptop. A radar (flights by bearing/distance) + sky-dome (satellites by
   az/el) + next-visible-pass. **No hardware required** (ADR-0009).
2. **ESP32 device** — the round-display radar (the physical product); needs
   firmware flashed + a wired display. Also prints a text view to Serial.

## Quick start (gateway + web front-end)
```bash
cd services/gateway
npm install
npm run typecheck   # tsc --noEmit
npm test            # Jest — 59 tests, fully offline (no network)
npm run build && npm start   # serves /, /sky and /health on :8080
# then open http://localhost:8080/ in a browser
```
Or run the whole thing with Docker: `docker compose up -d --build` (see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

### Share it with your team
The gateway is one container that serves both the UI and the API, so deploy it to
a container host and hand out the URL. **Google Cloud Run** is the recommended
path — one always-warm HTTPS endpoint behind a shared cache. Two ways:
- **Push-to-deploy (keyless CI)** — GitHub Actions + Workload Identity Federation,
  no stored keys: [docs/DEPLOY-CICD.md](docs/DEPLOY-CICD.md).
- **Manual one-command deploy**: [docs/DEPLOY-CLOUD-RUN.md](docs/DEPLOY-CLOUD-RUN.md).

(Static hosts like Netlify/Vercel aren't a good fit — `/sky` needs a long-running,
stateful container, not short serverless functions.)

### Status — built to "ready"
| Phase | What | State |
| --- | --- | --- |
| 1 | Domain core (flight + satellite, hexagonal, TDD) | ✅ |
| 2 | Gateway HTTP service, OAuth2, resilience, Docker | ✅ |
| 3 | Optically-visible pass detection (sunlit + dark) | ✅ |
| 4 | ESP32 firmware (portal + poll + render) | ✅ code · ⬜ hardware flash |
| 5 | Caching, JSON-schema contract guard, CI | ✅ |

58 tests green, fully offline; verified end-to-end against live OpenSky data.
The only remaining step is flashing the firmware to a physical ESP32 (+ a
board-specific TFT setup). See the [Implementation Plan](docs/IMPLEMENTATION-PLAN.md).

## Swarm orchestration (RuFlo)
This repo was initialised with [RuFlo](https://github.com/ruvnet/claude-flow)
(`npx ruflo@latest init`) for agent-swarm-assisted research/build/test. The
generated `CLAUDE.md`, `.claude/`, `.mcp.json`, and `.claude-flow/config.yaml`
configure that workflow; runtime data/logs/sessions are git-ignored.

## License
MIT — see [LICENSE](LICENSE).
