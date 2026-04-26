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

## 🧬 Trying the Platform with Real DNA Sequences

The `/upload` page (and `POST /api/analyze`) accept raw FASTA or plain DNA bases and run the full pipeline against the in-panel reference (HBB, TP53, BRCA1, CYP2D6, INS, APOE).

### Bundled sample files

Drop-in test inputs ship with the repo at [`genomic_one/samples/`](./genomic_one/samples/) — see [`samples/README.md`](./genomic_one/samples/README.md) for what each file demonstrates. Highlights:

| File | What it proves |
| :--- | :--- |
| `hbb-reference.fasta` | Pipeline correctly identifies HBB and reports zero variants against reference |
| `hbb-sickle.fasta` | Single A→T mutation at codon 6 is detected; protein translation flips Glu→Val (the HbS signature) |
| `cyp2d6-fragment.fasta` | Best-gene match flows into pharmacogenomics, producing star alleles + drug-dose recommendations |
| `multi-record.fasta` | Multi-record FASTA is handled gracefully (first record analysed; user warned) |
| `invalid-input.fasta` | Bad-character validation returns informative HTTP 400 |

### Constraints
- Sequence length: **50–50,000 bp**
- Body size: **≤ 100 KB**
- Alphabet: **A C G T N** (case-insensitive). IUPAC ambiguity codes (R, Y, S, W, K, M, B, D, H, V) are rejected.
- One FASTA record per request — additional records are ignored with a warning.

### Where to obtain more sequences

#### Direct curl from NCBI E-utilities
RefSeq accessions for the genes in the panel:

```bash
# HBB — hemoglobin beta (sickle cell anchor gene)
curl 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_000518.5&rettype=fasta&retmode=text' -o hbb.fasta

# TP53 — tumor suppressor
curl 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_000546.6&rettype=fasta&retmode=text' -o tp53.fasta

# BRCA1 — DNA repair
curl 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_007294.4&rettype=fasta&retmode=text' -o brca1.fasta

# CYP2D6 — drug metabolism (pharmacogenomics)
curl 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_000106.6&rettype=fasta&retmode=text' -o cyp2d6.fasta

# INS — insulin
curl 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_000207.3&rettype=fasta&retmode=text' -o ins.fasta

# APOE — apolipoprotein E (Alzheimer's risk)
curl 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_000041.4&rettype=fasta&retmode=text' -o apoe.fasta
```

⚠️ Full RefSeq mRNAs typically run 800–4,000 bp — well within the 50 kbp limit. Full **gene** records (with introns) usually exceed it; trim to the CDS or to a fragment of interest.

#### Browse and download (UI)

| Source | What it offers | URL |
| :--- | :--- | :--- |
| **NCBI Nucleotide** | RefSeq transcripts, gene records, custom regions. Click **Send to → File → FASTA**. | https://www.ncbi.nlm.nih.gov/nuccore/ |
| **Ensembl** | Whole-gene records, exon-only, UTR-only, multi-species orthologues. | https://www.ensembl.org/ |
| **UCSC Genome Browser** | Region-of-interest extraction with custom flanking. Tools → Sequence. | https://genome.ucsc.edu/ |
| **NCBI ClinVar** | Disease-associated variant records with HGVS coordinates. Useful for crafting test sequences with known pathogenic mutations. | https://www.ncbi.nlm.nih.gov/clinvar/ |
| **PharmGKB** | Curated pharmacogenomic variants by gene (CYP2D6, CYP2C19, etc.) | https://www.pharmgkb.org/ |

#### Larger / population-scale datasets

For real research-grade testing rather than single-sequence demos:

- **1000 Genomes Project** — population-level variant calls (VCF + per-sample FASTA): https://www.internationalgenome.org/data
- **gnomAD** — variant frequency database across ~800k humans: https://gnomad.broadinstitute.org/
- **EBI ENA** — European Nucleotide Archive (raw reads + assembled sequences): https://www.ebi.ac.uk/ena/browser/
- **NCBI dbSNP** — single nucleotide polymorphism database: https://www.ncbi.nlm.nih.gov/snp/
- **GTEx** — gene-tissue expression with associated genotypes: https://gtexportal.org/

These ship as VCF / BAM / CRAM rather than single-sequence FASTA — extract a region of interest with `samtools faidx` or similar before uploading.

### Constructing your own test sequences

For illustrating variant detection without downloading anything, take the bundled `hbb-reference.fasta`, manually swap a base, save as a new file, and upload it. Any single-base difference within the matching prefix should appear in the variants table with the correct ref/alt/position.

---
Built with passion for the **Genomics-Exploration** project. 🧬
