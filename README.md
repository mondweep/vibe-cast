# TerraCraft

Turn any place on Earth into a playable Minecraft Java Edition world.

Select an area on the map, configure generation options, and download a complete Minecraft world with real buildings, roads, terrain, and water features sourced from OpenStreetMap and elevation data.

```
[ Screenshot placeholder: the TerraCraft map UI with a selected rectangle ]
```

## Quick Start

```bash
git clone https://github.com/DreamLab-AI/terracraft.git
cd terracraft
docker compose up --build
```

Open http://localhost:3000 in your browser.

Draw a rectangle on the map (or use the default Times Square selection), adjust settings, and click **Generate World**. When complete, download the zip and drop it into your Minecraft `saves/` folder.

## How It Works

```
Browser (Leaflet Map UI)
    |
    v
Express API Server
    |
    +-- 1. Fetch OSM data (Overpass API)
    |       Buildings, roads, water, landuse, trees
    |
    +-- 2. Elevation data
    |       Default: AWS Terrarium tiles (handled by arnis)
    |       Optional: GEE LIDAR (user-configured)
    |
    +-- 3. LLM enrichment (optional)
    |       Add building levels, materials, roof types
    |       via OpenAI or Gemini API
    |
    +-- 4. World generation (arnis)
    |       Patched Rust binary converts OSM + elevation
    |       into Minecraft region files
    |
    +-- 5. Package & download
            Zip the world for direct use
```

## Features

- **Interactive map selection** with Leaflet.js and rectangle drawing
- **Multiple scales**: 1:1, 1:2, 1:4, 1:10
- **Real terrain** from AWS Terrain Tiles or custom GeoTIFF elevation
- **1.18+ chunk format** compatible with PaperMC and modern servers
- **Optional AI enrichment** of building metadata (levels, materials, roofs)
- **Job queue** with concurrent generation (max 2 parallel)
- **Auto-cleanup** of generated worlds after 1 hour
- **Dark theme UI**, mobile-responsive
- **Self-contained Docker image** with arnis compiled from source

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
| `MAX_AREA_KM2` | 25 | Maximum selection area |
| `MAX_CONCURRENT` | 2 | Parallel generation jobs |
| `CLEANUP_HOURS` | 1 | Hours before auto-deleting results |
| `DEFAULT_SCALE` | 1.0 | Default world scale |
| `GEMINI_API_KEY` | - | Gemini API key for enrichment |
| `OPENAI_API_KEY` | - | OpenAI API key for enrichment |
| `GEE_PROJECT` | - | Google Earth Engine project ID |
| `GEE_CREDENTIALS_PATH` | - | Path to GEE service account JSON |

## Development

Run without Docker:

```bash
cd backend && npm install && cd ..
node backend/server.js
```

The server serves the frontend from `frontend/` and listens on port 3000.

## Arnis Patches

The Docker build applies patches to the upstream arnis project:

1. **GeoTIFF elevation** (`--elevation-file`): Load custom DEM files in EPSG:4326 or EPSG:27700
2. **Raw GeoTIFF tag parser**: Bypasses tiff crate limitations for spatial metadata
3. **WGS84 to BNG transform**: Approximate Helmert transform for UK LIDAR data
4. **1.18+ chunk format**: Removes `Level` wrapper, adds `DataVersion`, `Status`, `yPos` for PaperMC compatibility

Apply patches manually:

```bash
./arnis-patch/apply-patch.sh /path/to/output
cd /path/to/output && cargo build --no-default-features --release
```

## Known Limitations

- Overpass API has rate limits; very large areas may require multiple retries
- GEE LIDAR integration requires manual credential configuration
- Building interiors are generated but not architecturally accurate
- Trees are placed as schematic structures, not biome-accurate
- World spawn point defaults to bbox center if not specified
- Generated worlds use 1.18+ format; older Minecraft versions are not supported

## Credits

- **[Arnis](https://github.com/louis-e/arnis)** by Louis E -- core Minecraft world generator (Apache 2.0)
- **[OpenStreetMap](https://www.openstreetmap.org)** -- map data (ODbL)
- **[AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)** -- elevation data (Terrarium format)
- **[Environment Agency LIDAR](https://environment.data.gov.uk/survey)** -- UK high-resolution elevation (Open Government Licence)
- **[Google Earth Engine](https://earthengine.google.com/)** -- satellite imagery and LIDAR access
- **[Leaflet.js](https://leafletjs.com/)** -- map UI library (BSD-2)
- **[Leaflet.draw](https://github.com/Leaflet/Leaflet.draw)** -- rectangle selection plugin
- **[GDAL](https://gdal.org/)** -- geospatial data processing
- **[PaperMC](https://papermc.io/)** -- target server platform
- **[DreamLab AI](https://github.com/DreamLab-AI)** -- pipeline development, GeoTIFF patch, building enrichment
- **[Claude Flow](https://github.com/ruvnet/claude-flow)** -- AI agent orchestration used during development

## License

Apache 2.0
