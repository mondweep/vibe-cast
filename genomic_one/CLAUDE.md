# CLAUDE.md — genomic_one

## Project Overview
Genomic analysis pipeline built with Rust (rvdna crate) and an Axum REST API backend.
Frontend is a Next.js dashboard deployed to GitHub Pages at https://cmcgrath2023.github.io/genomic_one/.

## Architecture
- **Backend**: Rust/Axum API (`src/api.rs`) — serves JSON endpoints under `/api/*`
- **Frontend**: Next.js 16 + React 19 + HeroUI + Recharts + Three.js (`frontend/`)
- **Pipeline**: Rust CLI (`src/main.rs`) — genomic analysis using rvdna
- **Deploy**: GitHub Pages via static export (`output: "export"` in next.config.ts)

## Port Assignments
This machine runs multiple projects. **Always check port availability before binding.**

| Port  | Owner        | Service                    |
|-------|--------------|----------------------------|
| 3000  | mtwm         | Next.js frontend (RESERVED)|
| 3001  | mtwm         | Gateway server             |
| 3002  | oceanic-crm  | Next.js UI                 |
| 3003  | mtwm         | Service                    |
| 3005  | genomic_one  | Next.js frontend dev       |
| 4001  | oceanic-crm  | API server                 |
| 5000  | macOS        | Control Center / AirPlay   |
| 7000  | macOS        | Control Center / AirPlay   |
| 8080  | genomic_one  | Axum REST API backend      |
| 9997  | oceanic-crm  | Service                    |
| 9999  | oceanic-crm  | Service                    |

**genomic_one uses: 3005 (frontend), 8080 (backend)**

## Dev Commands
```bash
# Frontend
cd frontend && npm run dev    # starts on port 3005

# Backend
cargo run -- serve            # starts Axum on port 8080

# Build frontend for GitHub Pages
cd frontend && npm run build  # static export to out/
```

## Key Files
- `src/main.rs` — CLI entry point and genomic pipeline
- `src/api.rs` — Axum API server with all `/api/*` endpoints
- `frontend/src/lib/api.ts` — API client with static data fallbacks
- `frontend/src/lib/static-data.ts` — Fallback data for static deploy
- `frontend/next.config.ts` — Next.js config (basePath for GitHub Pages)
- `.github/workflows/deploy.yml` — GitHub Pages deployment workflow
