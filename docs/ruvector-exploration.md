# Exploration of ruvnet/ruvector - RVF Examples

**Repository**: https://github.com/ruvnet/ruvector
**Explored Path**: `examples/rvf/examples/`
**License**: MIT
**Date**: 2026-02-21

---

## What is RuVector?

RuVector is a **self-learning vector database** built in Rust. Its tagline: *"The vector database that gets smarter the more you use it."*

Unlike static vector databases, RuVector incorporates **Graph Neural Networks (GNNs)** that continuously improve search results based on usage patterns. The system learns from query patterns and reinforces frequently-accessed pathways.

### Core Architecture

- **HNSW-based indexing** with sub-millisecond latency (61us p50)
- **Cypher query language** for graph traversal
- **40+ attention mechanisms** including mincut-gated and flash attention
- **SONA** (Self-Optimizing Neural Architecture) with LoRA adaptation
- **Raft consensus** for fault-tolerant multi-master replication
- **13 specialized Rust crates** + 4 npm packages for JS/TS integration

---

## What is RVF?

**RVF (RuVector Format)** is a unified binary substrate described as *"the unified agentic AI file format."* One `.rvf` file does three jobs:

1. **Store** - vectors, indexes, metadata, and cryptographic proofs
2. **Transfer** - stream over networks with zero conversion
3. **Run** - embed model weights, WASM, eBPF programs, or bootable kernels

Key RVF capabilities:
- Self-boots as a Linux microservice in 125ms
- 5.5KB WASM runtime for browser execution
- eBPF acceleration via kernel data paths
- Git-like copy-on-write branching
- Tamper-evident witness chains with post-quantum signatures (ML-DSA-65)
- 24 segment types for different data categories

---

## The RVF Examples (56 Rust files)

The `examples/rvf/examples/` directory contains **56 runnable Rust examples** spanning beginner to advanced difficulty across multiple domains.

### Planet Detection - Yes, It Exists!

**File**: `planet_detection.rs`

This is a complete **three-stage exoplanet detection pipeline**:

- **P0 - Ingestion**: Stores 1000-dimensional embeddings of light curve windows from synthetic Kepler and TESS instrument data, with metadata including KIC numbers, transit depth, and orbital periods
- **P1 - Candidate Generation**: Implements a simplified **Box Least Squares (BLS) matched filter** that tests trial periods from 1-35 days, phase-folds light curves, and computes signal-to-noise ratio (SNR)
- **P2 - Coherence Gating**: Multi-criteria scoring combining SNR strength (30%), shape consistency (25%), period stability (25%), and coherence stability (20%). Candidates pass if total score > 0.4 and SNR > 5.0

Features:
- Deterministic synthetic data generation via linear congruential generator
- Window-based temporal segmentation
- Cryptographic witness chains documenting data lineage
- Metadata-driven filtering without full vector scanning

### Causal Atlas

**File**: `causal_atlas.rs`

An astronomical data analysis system that:
- Analyzes light-curve data across multiple time scales (2 hours to 27 days)
- Builds causal interaction graphs connecting related observation windows
- Computes cut pressure and partition entropy metrics
- Tracks boundary pressure evolution and generates alerts
- Organizes data into short/medium/long retention tiers

---

### AI & Agent Systems

| Example | Description |
|---------|-------------|
| `agent_memory.rs` | Persistent memory for AI agents with cross-session continuity, semantic recall, and cryptographic audit trails |
| `agent_handoff.rs` | Agent-to-agent task handoff protocols |
| `rag_pipeline.rs` | Complete 5-stage RAG: chunking, embedding, retrieval, reranking, context assembly with witness chains |
| `semantic_search.rs` | Document search engine with compound metadata filters and recall metrics |
| `embedding_cache.rs` | Caching layer for embedding computations |
| `claude_code_appliance.rs` | Claude Code integration appliance |

### Finance & Trading

| Example | Description |
|---------|-------------|
| `financial_signals.rs` | Market signal processing with ticker metadata, momentum/mean-reversion/volatility/sentiment signal types, Ed25519 signing, and TEE attestation |

### Scientific & Medical

| Example | Description |
|---------|-------------|
| `planet_detection.rs` | Exoplanet detection from light curves (BLS algorithm, SNR scoring) |
| `causal_atlas.rs` | Astronomical causal graph analysis |
| `genomic_pipeline.rs` | K-mer embedding, similarity search, chromosome-specific filtering, variant detection with `.rvdna` domain profile |
| `medical_imaging.rs` | Radiology retrieval system - 512-dim image embeddings with modality/finding filters and medical-legal audit compliance |

### Infrastructure & Security

| Example | Description |
|---------|-------------|
| `access_control.rs` | Permission and access management |
| `crypto_signing.rs` | Ed25519 cryptographic signing |
| `browser_wasm.rs` | WASM browser deployment |
| `network_sync.rs` | Peer-to-peer synchronization |
| `postgres_bridge.rs` | PostgreSQL integration bridge |

### Other Notable Examples

`basic_store`, `legal_discovery`, `quantization` variants, and many more covering the full spectrum of RVF capabilities.

---

## Relevance to vibe-cast/exploring-ruvector Branch

The `exploring-ruvector` branch of this repo already contains:
- **Agentic accounting system** with FIFO/LIFO/HIFO cost basis methods
- **Semantic transaction search** using vector embeddings (`research/semantic-transaction-search.mjs`)

The ruvector/RVF framework could significantly enhance these capabilities:
- Replace the current in-memory semantic search with RVF's persistent vector store
- Add cryptographic witness chains for financial audit trails
- Leverage filtered vector queries for transaction categorization
- Use the financial_signals.rs patterns for market data integration
- Apply the genomic pipeline patterns to financial data lineage tracking

---

## Key Takeaways

1. **RVF is not just a vector database** - it's a unified format for storage, transfer, and execution
2. **Planet detection exists** as `planet_detection.rs` - a complete exoplanet pipeline with BLS algorithm
3. **56 examples** demonstrate breadth from genomics to finance to astronomy to AI agents
4. **Cryptographic provenance** via witness chains is a first-class feature across all examples
5. **The Rust ecosystem** provides performance guarantees (sub-millisecond latency) suitable for production
6. **Strong alignment** with this repo's existing accounting and semantic search work
