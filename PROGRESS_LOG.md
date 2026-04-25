# Genomic One — Progress Log

## Project Startup & Orientation
- [x] Repository cloned: `https://github.com/cmcgrath2023/genomic_one.git`
- [x] Backend initialized: Rust/Axum server running on `http://localhost:8080`
- [x] Frontend initialized: Next.js dashboard running on `http://localhost:3005`
  - *Note: Resolved macOS permission issues by switching from Turbopack to Webpack.*

## Mastery Experiments
- [x] **Vector Intelligence**: Performed high-dimensional random vector test.
  - *Result*: Random vectors score ~0.03 (orthogonal); HBB/TP53 score ~0.486 (biological significance).
- [x] **Temporal Attractor Deep Dive**: Analyzed `DiseaseTrajectory.tsx`.
  - *Finding*: Baseline epigenetic age shifts result in left-shifted risk curves and faster-diverging confidence bands due to increased Lyapunov instability.

## Active Status
- **Current Mode**: Transitioning from Experimentation to Build Phase.
- **Backend PID**: 37762
- **Frontend PID**: 7a556c5b (Background)

## [2026-04-25] — Mastery Phase & Dashboard Integration

### 1. Backend & Frontend Synergy
- **APOE Integration**: Successfully added the APOE gene (328 bp fragment) to the Rust backend and synchronized the API format (`{ similarities: [...] }`).
- **Server Stabilization**: Resolved the `hnsw_rs` API mismatch by refactoring the backend to use a shared `core.rs` module.
- **Frontend Fix**: Bypassed Next.js Turbopack sandbox issues by utilizing the `--webpack` flag for macOS local development.
- **K-MER Heatmap**: Fixed a React fragment key error in `KmerHeatmap.tsx` and updated the `GENES` list to include APOE.

### 2. Educational Layer (Theory Integration)
- **Concept Explainers**: Integrated `explainer-v1.html` and `explainer-v2.html` directly into the dashboard via a new tabbed component.
- **Terminology Deep-Dive**: Documented "Mastery Level" concepts:
    - **Protein Contact Graph**: Mapping 3D molecular stability.
    - **CpG Sites**: Understanding the "Epigenetic Dimmer Switch" and Biological Aging.
    - **INS Locus & T2D**: Analyzing insulin DNA "scars" for diabetes risk.
    - **Pharmacogenomics (CYP2D6)**: Predicting drug response (Phenotype) based on genetic blueprints (Alleles).

### 3. Git & Infrastructure
- **Remote Switch**: Successfully pushed all genomic work to `mondweep/vibe-cast` on the `genomics-exploration` branch.
- **Authentication**: Configured git to use the GitHub PAT from `.env` for secure pushes.
- **Conflict Resolution**: Resolved `.gitignore` rebase conflicts at the home-directory level.

---
*Next Log Update: [Auto-hook active]*

### Auto-Update: 2026-04-25 17:56:31
- Observed activity in:
  - `Cargo.toml`
  - `Cargo.lock`
  - `src/core.rs`
  - `src/lib.rs`
  - `src/main.rs`

### Auto-Update: 2026-04-25 18:16:31
- Session active (No file changes detected in the last 20 mins).

### Auto-Update: 2026-04-25 18:36:32
- Session active (No file changes detected in the last 20 mins).

### Auto-Update: 2026-04-25 18:56:32
- Session active (No file changes detected in the last 20 mins).
## Sat Apr 25 19:52:37 BST 2026 - APOE Gene Integration Complete
- Added APOE coding sequence to Rust core.
- Updated k-mer similarity engine to include APOE.
- Verified API integration with 6 genes.
- Updated frontend mock data for APOE visualization.
