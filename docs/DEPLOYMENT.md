# SkyWatch Gateway Deployment Guide

This guide covers deploying the SkyWatch gateway service using Docker on a Raspberry Pi, home server, or small VPS.

> **Sharing with a team?** To deploy to a managed, always-on HTTPS URL anyone can
> open, see **[DEPLOY-CLOUD-RUN.md](DEPLOY-CLOUD-RUN.md)** (Google Cloud Run).
> The gateway is one container that serves both the browser UI (`/`) and the API
> (`/sky`), so it needs a container host — not a static/serverless host like
> Netlify or Vercel.

## Prerequisites

- **Docker** (version 20.10+) and **Docker Compose** (version 2.0+)
- At least 200 MB disk space for the image and logs
- Network connectivity for fetching flight data (OpenSky Network, CelesTrak)

## Quick Start

### 1. Configure Environment

```bash
cd /path/to/vibe-cast
cp services/gateway/.env.example services/gateway/.env
# Edit .env with your observer location and optional API credentials
nano services/gateway/.env
```

Key settings:
- **OBSERVER_LAT/LON/ALT_KM**: Your geographic location
- **FLIGHT_RANGE_KM**: How far to track aircraft (50 km default)
- **OPENSKY_CLIENT_ID/SECRET**: Optional (leave blank for anonymous access with stricter limits)

### 2. Build and Start

```bash
# Build the Docker image and start the service
docker compose up -d --build

# View logs
docker compose logs -f gateway
```

The service will be available at `http://localhost:8080`.

### 3. Verify Health

```bash
# Health check endpoint
curl http://localhost:8080/healthz

# Sky snapshot with current flights and satellite passes
curl 'http://localhost:8080/sky'
```

## Device Integration

The ESP32 sky-radar device polls the gateway for sky snapshots. Configure the device's gateway URL to point at your host:

```
http://<your-host-ip>:8080
```

For details on the HTTP/JSON contract, see [ADR-0008: Device↔Gateway HTTP/JSON Protocol](adr/0008-device-gateway-http-json.md).

## Monitoring and Troubleshooting

### View Service Status
```bash
docker compose ps
docker compose logs gateway
```

### Restart Service
```bash
docker compose restart gateway
```

### Stop Service
```bash
docker compose down
```

### Resource Usage
On a Raspberry Pi 4, expect:
- Memory: ~50–100 MB (Node.js runtime + dependencies)
- CPU: Minimal (polling-based, not real-time)
- Disk: ~400 MB for the image

## Notes

- The service automatically restarts if it crashes (`restart: unless-stopped`).
- Environment variables in `.env` override defaults; see `.env.example` for all options.
- NEVER commit `.env` to version control (it is gitignored).
- For multi-device support or lower-latency updates, consider Phase 5 enhancements (MQTT/WebSocket).
