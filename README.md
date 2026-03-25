# TerraCraft

Turn any place on Earth into a playable Minecraft Java Edition world.

Select an area on the map, configure generation options, and download a complete Minecraft world with real buildings, roads, terrain, and water features sourced from OpenStreetMap and elevation data.

## Project Setup Log

### What We Did

1. **Created a blank orphan branch** (`terracraft-app`) in the `mine-craft-world` repo with no prior history
2. **Cloned** the [DreamLab-AI/terracraft](https://github.com/DreamLab-AI/terracraft) repository and copied all source files into the branch
3. **Installed backend dependencies** via `npm install` in `backend/`
4. **Built the `arnis` Rust binary from source** on macOS:
   - Cloned upstream [louis-e/arnis](https://github.com/louis-e/arnis) to `/tmp/arnis-build`
   - Applied the `arnis-patch/geotiff-elevation.patch` using `git apply --reject` (most hunks applied cleanly)
   - Manually resolved 2 rejected hunks in `src/ground.rs` — upstream had added a `land_cover` field and changed the `new_enabled()` signature
   - Compiled with `cargo build --no-default-features --release` (Rust 1.89, ~2 min build)
   - Installed the 23 MB binary to `/usr/local/bin/arnis`
5. **Started the Node.js server** — frontend + API running on `http://localhost:3000`
6. **Generated and downloaded a Minecraft world** successfully
7. **Cleaned up build cache** (~1.5 GB freed from `/tmp/arnis-build` and `/tmp/terracraft-clone`)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │   Leaflet.js    │  │        Sidebar UI            │  │
│  │   Dark Map      │  │  - Scale / Ground Level      │  │
│  │   + Draw Plugin │  │  - LLM Provider (optional)   │  │
│  │                 │  │  - Generate / Download btns   │  │
│  │  CARTO dark     │  │  - Progress bar + polling    │  │
│  │  tile layer     │  │                              │  │
│  └────────┬────────┘  └──────────────┬───────────────┘  │
│           │  Rectangle selection     │  POST /api/gen   │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│              Express.js Server (port 3000)               │
│                                                         │
│  Static file server ──► frontend/ + assets/             │
│                                                         │
│  API Routes:                                            │
│    POST /api/generate    Start generation pipeline      │
│    GET  /api/status/:id  Poll progress (0-100%)         │
│    GET  /api/download/:id  Download world .zip          │
│    DELETE /api/jobs/:id  Cleanup job                    │
│    GET  /api/health      Health check                   │
│                                                         │
│  Job Queue (in-memory Map, max 2 concurrent)            │
│  Auto-cleanup: expired jobs removed every 10 min        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Generation Pipeline                     │
│                                                         │
│  Step 1 (0-30%): Fetch OSM Data                         │
│    └─► Overpass API (overpass-api.de)                    │
│        Buildings, roads, water, landuse, trees,          │
│        railways, barriers, amenities                     │
│        Saved as osm_data.json in job directory           │
│                                                         │
│  Step 2 (30-35%): Elevation Data                         │
│    └─► Default: AWS Terrarium tiles (handled by arnis)  │
│    └─► Optional: GeoTIFF file (--elevation-file flag)   │
│    └─► Optional: Google Earth Engine LIDAR               │
│                                                         │
│  Step 3 (35-45%): LLM Building Enrichment (optional)    │
│    └─► OpenAI (gpt-4o-mini) or Google Gemini            │
│        Adds building:levels, building:material,          │
│        roof:shape, roof:material to OSM buildings        │
│        Batched in groups of 50, reverse-geocoded         │
│        for regional architectural context                │
│                                                         │
│  Step 4 (45-85%): World Generation (arnis binary)        │
│    └─► Spawned as child process                         │
│        Converts OSM JSON + elevation → Minecraft         │
│        region files (.mca) in 1.18+ chunk format        │
│        Supports terrain, ground fill, configurable       │
│        scale and ground level                            │
│                                                         │
│  Step 5 (85-100%): Package                               │
│    └─► archiver (node) zips the world directory         │
│        Available for download via /api/download          │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure

```
mine-craft-world/
├── frontend/                 # Vanilla HTML/CSS/JS (no framework)
│   ├── index.html            # Leaflet map + sidebar controls
│   ├── app.js                # Map init, drawing, API calls, polling
│   └── style.css             # Dark theme, responsive layout
│
├── backend/
│   ├── server.js             # Express app, API routes, job queue
│   ├── package.json          # 3 deps: express, archiver, uuid
│   ├── pipeline/
│   │   ├── osm.js            # Overpass API fetch with retry
│   │   ├── elevation.js      # Elevation data handler (AWS/GEE)
│   │   ├── enrich.js         # LLM building enrichment
│   │   ├── arnis.js          # Spawns arnis binary, parses progress
│   │   └── package.js        # Zip world with archiver
│   └── utils/
│       └── coords.js         # WGS84→BNG transform, bbox area, geocoding
│
├── arnis-patch/
│   ├── geotiff-elevation.patch  # GeoTIFF + 1.18+ chunk format patches
│   └── apply-patch.sh           # Helper script to apply patches
│
├── assets/
│   └── favicon.ico
│
├── output/                   # Generated worlds (gitignored)
├── .env.example              # Environment variable template
├── .env                      # Local config (gitignored)
├── Dockerfile                # Multi-stage: Rust build + Node runtime
├── docker-compose.yml        # Single service on port 3000
└── README.md                 # This file
```

### Key Technology Decisions

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Vanilla JS + Leaflet.js | No build step, CDN-loaded map library, dark CARTO tiles |
| Backend | Node.js + Express | Lightweight, serves both API and static frontend |
| World Gen | arnis (Rust binary) | High-performance OSM→Minecraft converter |
| Elevation | AWS Terrarium / GeoTIFF | Default free tiles, optional high-res LIDAR |
| Packaging | archiver (Node) | Streams zip creation for large worlds |
| Deployment | Docker multi-stage | Compiles Rust in build stage, slim Node runtime |

### Arnis Patches Applied

The upstream arnis binary is patched with 4 changes:

1. **`--elevation-file` CLI arg** — Load custom GeoTIFF DEM files instead of AWS Terrarium tiles
2. **Raw GeoTIFF tag parser** — Reads TIFF IFD entries directly, bypassing tiff crate limitations for tags 33550/33922/34264
3. **WGS84→BNG coordinate transform** — Approximate Helmert transform for British National Grid LIDAR data (~5m accuracy)
4. **1.18+ chunk format** — Removes `Level` NBT wrapper, adds `DataVersion`, `Status`, `yPos` fields for PaperMC/modern server compatibility

## Quick Start

### Local Development (what we used)

```bash
# 1. Install dependencies
cd backend && npm install && cd ..

# 2. Build arnis from source (requires Rust 1.77+)
git clone --depth 1 https://github.com/louis-e/arnis.git /tmp/arnis-build
cd /tmp/arnis-build
git apply /path/to/arnis-patch/geotiff-elevation.patch  # may need --reject for newer upstream
cargo build --no-default-features --release
cp target/release/arnis /usr/local/bin/arnis

# 3. Start server
cp .env.example .env
node backend/server.js
```

Open http://localhost:3000

### Docker (self-contained)

```bash
docker compose up --build
```

Open http://localhost:3000. First build takes ~10 min to compile arnis from source.

## API

### POST /api/generate

Start world generation.

```json
{
  "bbox": [40.756, -73.988, 40.760, -73.983],
  "scale": 1.0,
  "groundLevel": -10,
  "spawnLat": 40.758,
  "spawnLng": -73.9855,
  "llmKey": "sk-...",
  "llmProvider": "openai"
}
```

Returns: `{ "jobId": "uuid", "areaKm2": 0.02, "blockEstimate": 20000 }`

### GET /api/status/:jobId

Returns progress (0-100%), status, and current step message.

### GET /api/download/:jobId

Download the generated world as a zip file.

### DELETE /api/jobs/:jobId

Clean up a completed or failed job.

### GET /api/health

Server health check with active/queued job counts.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `MAX_AREA_KM2` | 25 | Maximum selection area (km²) |
| `MAX_CONCURRENT` | 2 | Parallel generation jobs |
| `CLEANUP_HOURS` | 1 | Hours before auto-deleting results |
| `DEFAULT_SCALE` | 1.0 | Default world scale |
| `ARNIS_BIN` | `/usr/local/bin/arnis` | Path to arnis binary |
| `OUTPUT_DIR` | `./output` | Where generated worlds are stored |
| `GEMINI_API_KEY` | - | Gemini API key for building enrichment |
| `OPENAI_API_KEY` | - | OpenAI API key for building enrichment |
| `GEE_PROJECT` | - | Google Earth Engine project ID |
| `GEE_CREDENTIALS_PATH` | - | Path to GEE service account JSON |

## Known Limitations

- Overpass API has rate limits; very large areas may require multiple retries
- Maximum 25 km² selection area, 25M block limit
- GEE LIDAR integration requires manual credential configuration
- Building interiors are generated but not architecturally accurate
- Trees are placed as schematic structures, not biome-accurate
- World spawn point defaults to bbox center if not specified
- Generated worlds use 1.18+ format only; older Minecraft versions are not supported

## Credits

- **[Arnis](https://github.com/louis-e/arnis)** by Louis E — core Minecraft world generator (Apache 2.0)
- **[OpenStreetMap](https://www.openstreetmap.org)** — map data (ODbL)
- **[AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)** — elevation data (Terrarium format)
- **[Leaflet.js](https://leafletjs.com/)** — map UI library (BSD-2)
- **[Leaflet.draw](https://github.com/Leaflet/Leaflet.draw)** — rectangle selection plugin
- **[DreamLab AI](https://github.com/DreamLab-AI)** — pipeline development, GeoTIFF patch, building enrichment

## License

Apache 2.0
