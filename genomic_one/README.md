# Genomic One

**In Silico Case Study · Clinical Decision Support Simulation**

AI-native genomic intelligence platform for computational drug discovery, built in Rust. Implements a 7-layer intelligence architecture spanning genomic analysis, neural classification, Bayesian learning, disease progression modelling, pharmacogenomic decision support, and AI safety validation — designed to demonstrate how AI can reshape pharmaceutical R&D, manufacturing intelligence, and clinical operations at enterprise scale.

*In silico*: computational simulation using real human gene sequences (HBB, TP53, BRCA1, CYP2D6, INS) with synthetic patient data. No real patient data is used or stored.

**Live case study**: https://cmcgrath2023.github.io/genomic_one/

## 7-Layer Intelligence Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Deployment: Federated MCP  (5 nodes, GDPR-compliant)       │
├─────────────────────────────────────────────────────────────┤
│  L6: SAFLA Safety Validation                                │
│      Confidence, contraindication, population, regulatory   │
├─────────────────────────────────────────────────────────────┤
│  L5: Decision / Advisory                                    │
│      Clinical case conference, GLP-1 pharmacogenomics       │
├─────────────────────────────────────────────────────────────┤
│  L4: Bayesian + Temporal Attractor                          │
│      Savant AI trait learning, FTLE disease progression     │
├─────────────────────────────────────────────────────────────┤
│  L3: Neural + Agentic Diffusion                             │
│      ruv-FANN classification, molecule generation           │
├─────────────────────────────────────────────────────────────┤
│  L2: Vector + FACT                                          │
│      RuVector HNSW, MinCut pathways, literature retrieval   │
├─────────────────────────────────────────────────────────────┤
│  L1: Genomic Core + MidStream                               │
│      rvdna pipeline, real-time SSE streaming                │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| L1 | [rvdna](https://crates.io/crates/rvdna) + MidStream | Gene sequences, k-mer vectors, variant calling, protein, epigenetics, pharmacogenomics, real-time SSE streaming |
| L2 | [RuVector](https://github.com/ruvnet/RuVector) + [FACT](https://github.com/ruvnet/FACT) | HNSW similarity search, [MinCut](https://github.com/ruvnet/RuVector/tree/main/examples/mincut) pathway analysis, [sublinear](https://crates.io/crates/sublinear) PageRank, literature retrieval |
| L3 | [ruv-FANN](https://github.com/ruvnet/ruv-FANN) + [Agentic Diffusion](https://github.com/ruvnet/agentic-difusion) | Variant pathogenicity classification, drug response prediction, molecule generation |
| L4 | [Savant AI](https://github.com/bar181/savant-ai-results) + [Temporal Attractor](https://crates.io/crates/temporal-attractor-studio) | Bayesian trait learning, disease trajectory modelling (FTLE), prior distributions |
| L5 | Custom | Clinical case conference, multi-expert advisory, drug target identification |
| L6 | [SAFLA](https://github.com/ruvnet/SAFLA) | Safety validation, audit trail (ISC-prefixed), clinical override, regulatory mapping |
| Deploy | [Federated MCP](https://github.com/ruvnet/federated-mcp) | 5-node GDPR-compliant deployment (Copenhagen, Princeton, Seattle, Bangalore, Oxford) |

## Features

### Dashboard
- **MidStream Live Streaming** — Real-time SSE from Axum backend, with simulated fallback on static deploy
- **Gene Panel** — HBB, TP53, BRCA1, CYP2D6, INS with GC content and sequence stats
- **K-mer Similarity Heatmap** — 11-mer cosine similarity matrix across all genes
- **3D Protein Contact Graph** — Three.js visualization of hemoglobin beta structure
- **Variant Calling** — Pileup-based SNP detection with sickle cell (HBB E6V) detection
- **Epigenetic Clock** — Horvath clock biological age estimation from CpG methylation
- **Disease Trajectories** — Temporal Attractor risk projections with confidence bands (T2D, BRCA1, CYP2D6)
- **Pharmacogenomics** — CYP2D6 star allele calling, GLP-1 RA (semaglutide/liraglutide) recommendations, risk flags, SAFLA validation, FACT literature evidence

### Brain Intelligence System
- **Memories** — Stored vector patterns from in silico case studies, displayed as event cards
- **Learning** — Bayesian priors, long-term patterns, neural model status with technology tags
- **Pathways** — SVG gene interaction network with MinCut analysis + Agentic Diffusion molecule candidates
- **Advisory** — Clinical Case Conference: AI + human expert opinions, consensus panel, multi-disciplinary review
- **Simulations** — Card grid of completed in silico case studies with audit IDs
- **Intelligence** — 3D neural graph visualization + HeroUI tabbed layer explorer (L1–L6)
- **Federation** — 5-node global deployment with data residency and GDPR compliance
- **Architecture** — Interactive accordion diagram of the 7-layer stack with technology details

### Patient Case Simulation
- Multi-step wizard (5 steps) with framer-motion transitions
- Patient demographics, CYP2D6 genotype, clinical history, indication
- Client-side phenotype derivation, drug recommendations, trajectory projections
- SAFLA validation with ethnicity-adjusted confidence
- Computational reasoning chain (5-layer pipeline explainability)

### Collaboration
- Client-side auth with localStorage (demo accounts available)
- Invite colleagues to review cases
- Expert opinion submission on Advisory cases (text + voice input UI)
- Verdict system: Concur / Concur with Caveat / Modify / Disagree
- Dynamic consensus calculation

## Quick Start

```bash
# Run the genomic analysis pipeline
cargo run

# Start the API backend with SSE streaming (port 8080)
cargo run -- --serve

# Start the frontend dev server (port 3005)
cd frontend && npm install && npm run dev

# Analyze a 23andMe file
cargo run -- path/to/23andme.txt
```

**Demo login**: `demo@genomicone.io` / `demo`

When the backend is running, the dashboard streams real pipeline results via SSE. On GitHub Pages (no backend), it falls back to simulated streaming with a "SIMULATED" indicator.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/panel` | GET | Gene panel data |
| `/api/kmer` | GET | K-mer similarity matrix |
| `/api/alignment` | GET | Smith-Waterman alignment |
| `/api/variants` | GET | Variant calling results |
| `/api/protein` | GET | Protein translation + contacts |
| `/api/epigenetics` | GET | Epigenetic clock prediction |
| `/api/pharma` | GET | CYP2D6 pharmacogenomics + GLP-1 |
| `/api/rvdna` | GET | RVDNA format stats |
| `/api/brain/memories` | GET | Stored vector memories |
| `/api/brain/learning` | GET | Bayesian learning state |
| `/api/brain/pathways` | GET | Gene interaction graph + MinCut |
| `/api/stream/analysis` | GET (SSE) | Real-time pipeline streaming |

## Tech Stack

| Layer | Stack |
|-------|-------|
| Pipeline | Rust, rvdna, ruvector-core, ruvector-solver |
| API | Axum, Tokio, tower-http (CORS), tokio-stream (SSE) |
| Frontend | Next.js 16, React 19, HeroUI, Recharts, Three.js, Framer Motion |
| Auth | Client-side with localStorage (demo) |
| Deploy | GitHub Pages (static export via GitHub Actions) |
| Ports | Frontend :3005, Backend :8080 |

## Routes

| Route | Content |
|-------|---------|
| `/` | Main dashboard — streaming, gene panel, variants, trajectories, pharma |
| `/brain/memories` | Vector memory cards from case studies |
| `/brain/learning` | Bayesian priors + neural model status |
| `/brain/pathways` | MinCut gene graph + molecule generation |
| `/brain/advisory` | Clinical Case Conference — multi-expert review |
| `/brain/simulate` | Prior simulation card grid |
| `/brain/simulate/new` | Multi-step patient case simulation wizard |
| `/brain/intelligence` | 3D neural graph + layer explorer tabs |
| `/brain/federation` | Federated MCP nodes + GDPR compliance |
| `/brain/architecture` | Interactive 7-layer architecture diagram |
| `/auth/login` | Sign in |
| `/auth/register` | Create account |

## Specifications

Feature specs follow [GitHub's Spec-Kit](https://github.com/github/spec-kit) format in `docs/speckit-specs/`.

## License

MIT
