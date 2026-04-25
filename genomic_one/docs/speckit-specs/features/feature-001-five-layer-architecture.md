# Feature Specification: 5-Layer Intelligence Architecture

**Feature Branch**: `intelligence-layers`
**Created**: 2026-03-17
**Status**: Draft

## Overview

Genomic One implements a 5-layer intelligence system where each layer builds on the ones below it, creating progressively more sophisticated genomic understanding.

```
┌─────────────────────────────────────────┐
│  Layer 5: Decision / Advisory           │  Synthesized insights, explainability
│  ─────────────────────────────────────  │
│  Layer 4: Bayesian Learning             │  Savant-style trait learning, priors
│  ─────────────────────────────────────  │
│  Layer 3: Neural Classification         │  ruv-FANN, variant/pathway scoring
│  ─────────────────────────────────────  │
│  Layer 2: Vector Intelligence           │  RuVector HNSW, KmerIndex, MinCut
│  ─────────────────────────────────────  │
│  Layer 1: Genomic Core                  │  rvdna pipeline, sequences, variants
└─────────────────────────────────────────┘
```

## Layer Details

### Layer 1: Genomic Core (rvdna)
- Gene panel loading (HBB, TP53, BRCA1, CYP2D6, INS)
- K-mer vectorization
- Smith-Waterman alignment
- Variant calling
- Protein translation + contact graph
- Epigenetic clock (Horvath)
- Pharmacogenomics (CYP2D6 star alleles)
- RVDNA binary format

**Status**: Implemented

### Layer 2: Vector Intelligence (RuVector)
- HNSW-indexed k-mer vectors via KmerIndex
- Cosine similarity search across sequence library
- MinCut graph partitioning for pathway analysis
- Sublinear solvers for PageRank on gene interaction graphs
- Persistent vector memory store

**Status**: Partially implemented (cosine similarity manual, KmerIndex not wired)

### Layer 3: Neural Classification (ruv-FANN)
- Variant pathogenicity classification (5-class)
- Gene expression forecasting (Neuro-Divergent)
- Pharmacogenomic interaction scoring
- Cascade topology growth for optimal network architecture
- Model persistence via serde

**Status**: Not started

### Layer 4: Bayesian Learning (Savant)
- Trait-based probabilistic reasoning
- Prior distributions per genomic trait
- Incremental Bayesian updates with each analysis
- Long-term pattern recognition
- Meta-cognitive reflection and confidence scoring

**Status**: Not started

### Layer 5: Decision / Advisory
- Multi-layer signal synthesis
- Explainable recommendations with evidence chains
- Drug target identification combining mincut + neural + Bayesian signals
- Risk assessment with uncertainty quantification
- Human-in-the-loop validation workflow

**Status**: Not started

## Data Flow

```
Sequence Data → [L1: rvdna pipeline]
    → k-mer vectors → [L2: RuVector index + mincut]
    → classified vectors → [L3: ruv-FANN neural networks]
    → scored patterns → [L4: Bayesian prior updates]
    → synthesized insights → [L5: Advisory output]
```

## Technology Stack

| Layer | Crate/Library | Key APIs |
|-------|--------------|----------|
| 1 | rvdna 0.3 | DnaSequence, VariantCaller, SmithWaterman, HorvathClock |
| 2 | ruvector-core (via rvdna) | VectorDB, KmerIndex, MinCutBuilder, DynamicMinCut |
| 3 | ruv-fann | Network, NetworkBuilder, TrainingData, CascadeTrainer |
| 4 | Custom (Savant-inspired) | BayesianPrior, TraitLearner, PatternStore |
| 5 | Custom | AdvisoryEngine, EvidenceChain, RiskScore |

## Frontend (Brain Sidebar)

| Route | Layer(s) | Content |
|-------|----------|---------|
| `/brain/memories` | L2 | RuVector stored memories, similarity graph |
| `/brain/learning` | L3, L4 | Neural model status, Bayesian priors, patterns |
| `/brain/pathways` | L2, L3 | MinCut pathway analysis, drug targets |
| `/brain/advisory` | L5 | Synthesized recommendations, risk assessment |

## Ecosystem References

- **rvdna**: https://crates.io/crates/rvdna
- **RuVector**: https://github.com/ruvnet/RuVector
- **RuVector MinCut**: https://github.com/ruvnet/RuVector/tree/main/examples/mincut
- **ruv-FANN**: https://github.com/ruvnet/ruv-FANN
- **Savant AI**: https://github.com/bar181/savant-ai-results
- **Sublinear**: https://crates.io/crates/sublinear (included via ruvector-solver in rvdna)
- **RuView**: https://github.com/ruvnet/RuView (future: non-contact patient monitoring)
