# 🧬 Genomic One — AI Genomics Intelligence Platform

**Genomic One** is an advanced, seven-layer intelligence pipeline designed to transform raw genomic data into clinical insights, architectural blueprints, and drug candidate profiles. This repository serves as a live exploration of the intersection between **Rust-powered bio-computation** and **AI-driven clinical advisory**.

---

## 🚀 The Vision: From A/C/G/T to Clinical Intelligence
Traditional genomics often stops at a list of variants. Genomic One builds a full "Sovereign Architecture" around the patient’s data, modeling everything from 3D protein stability to multi-generational disease trajectories using Bayesian updating and chaotic attractor dynamics.

### Key Breakthroughs in this Branch:
- **APOE Integration**: Full analysis of the APOE gene (linked to Alzheimer's and lipid metabolism) across the pipeline.
- **K-mer Heatmap**: A 512D vector similarity matrix showing the "evolutionary distance" between clinically critical genes (HBB, TP53, BRCA1, CYP2D6, INS, APOE).
- **Mastery Educational Layer**: Integrated high-fidelity theory documents directly into the dashboard for self-serve mastery.

---

## 🏗️ The Seven-Layer Pipeline

| Layer | Component | Function |
| :--- | :--- | :--- |
| **L1** | Sequence Ingestion | High-performance A/C/G/T parsing via `rvdna` at 3.2 bits/base. |
| **L2** | Vector Search | HNSW Approximate Nearest-Neighbour search in 512D k-mer space. |
| **L3** | Neural Classification | `ruv-FANN` classifies variants across five pathogenicity classes. |
| **L4** | Bayesian Learning | `Savant AI` updates Beta priors with every new variant observation. |
| **L5** | Clinical Advisory | CYP2D6 metaboliser phenotype mapping and GLP-1 interaction assessment. |
| **L6** | Safety Validation | `SAFLA Framework` ensures confidence thresholds and audit trails. |
| **L7** | Federated Intel | `MCP Network` for collaborative learning with total data privacy. |

---

## 📚 Repository Signposting: Where to Start

- **[PROGRESS_LOG.md](./PROGRESS_LOG.md)**: The heartbeat of the project. A chronological trace of every breakthrough, server fix, and conceptual shift.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: A deep dive into the technical stack, data flow, and the "reality" vs. "simulation" mapping of each component.
- **[genomic_one/](./genomic_one/)**: The core application source.
    - `src/`: Rust backend (Axum API, Bayesian logic).
    - `frontend/`: Next.js 16 dashboard (React 19, Three.js, Recharts).
- **[Concept Guides](./genomic_one_concept_guide.md)**: A deep-dive into the mathematical and biological foundations of the platform.
- **Explainers**:
    - **[V1: Scientific Fundamentals](./Genomic%20One%20Explainer.html)**: The original blueprint for the genomic pipeline.
    - **[V2: Standalone Mastery](./Genomic%20One%20Explainer%20_standalone%20v2_.html)**: An architectural lens on AI-genomic synthesis.

---

## 🛠️ Getting Started (Local Development)

### Prerequisites
- **Rust**: `cargo` 1.80+
- **Node.js**: v20+

### 1. Start the Backend (API)
```bash
cd genomic_one
cargo run -- serve
```
*API will be listening on `http://localhost:8080`*

### 2. Start the Frontend (Dashboard)
```bash
cd genomic_one/frontend
npm run dev -- --webpack
```
*Note: The `--webpack` flag is required for local macOS sandbox compatibility.*

---

## 🧪 Genomic Glossary (Mastery Concepts)
For a deep dive into the dashboard metrics, refer to the **Glossary** section within the dashboard, covering:
- **Protein Contact Graphs**: Mapping 3D molecular stability.
- **CpG Sites**: The "Epigenetic Dimmer Switch."
- **Allele vs. Phenotype**: The difference between the genetic code and its real-world execution.

---
Built with passion for the **Genomics-Exploration** project. 🧬
