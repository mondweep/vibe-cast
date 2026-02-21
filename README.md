# 🐦 Bird Song Identifier — RVF Learning Project

A species identification pipeline built with **RVF Cognitive Containers** from the [RuVector](https://github.com/ruvnet/ruvector) ecosystem.

This project demonstrates core RVF concepts by building a bird song identification system that encodes spectrograms as vectors, detects acoustic features, and ranks species matches — modelled after the `life_candidate.rs` example.

## Pipeline

```
B0 Ingest     → Synthetic spectrograms for 8 UK bird species
B1 Features   → Acoustic feature detection + co-occurrence analysis
B2 Scoring    → Species matching, ranking, and confidence estimation
```

### Species Covered

| Species | Scientific Name | Key Features |
|---------|----------------|--------------|
| European Robin | *Erithacus rubecula* | Whistle, mid trill, descending |
| Blackbird | *Turdus merula* | Whistle, harmonic series, descending |
| Great Tit | *Parus major* | Mid trill, high chirp |
| Wren | *Troglodytes troglodytes* | Mid trill, rapid trill, high chirp |
| Chaffinch | *Fringilla coelebs* | Descending phrase, whistle |
| Song Thrush | *Turdus philomelos* | Harmonic series, whistle |
| Blue Tit | *Cyanistes caeruleus* | High chirp, rapid trill |
| Woodpigeon | *Columba palumbus* | Low coo (distinctive!) |

## Quick Start

```bash
# Build
cargo build

# Run the bird song identifier
cargo run --example bird_song
```

## RVF Concepts Demonstrated

| Concept | What You'll Learn |
|---------|-------------------|
| `RvfStore` | Creating and managing a vector database |
| `ingest_batch()` | Storing vector embeddings with rich metadata |
| `MetadataEntry` | Tagging vectors with species, frequency band, location |
| `FilterExpr` | Querying by acoustic feature type |
| `QueryOptions` + k-NN | Finding similar spectrograms |
| `DistanceMetric::L2` | Measuring spectral similarity |
| `WitnessEntry` | Building provenance chains |
| `verify_witness_chain()` | Validating pipeline integrity |

## Project Structure

```
explore-rvf/
├── Cargo.toml              # RVF dependencies
├── README.md               # This file
└── examples/
    └── bird_song.rs        # Main pipeline
```

## Next Steps

- **Real data**: Download recordings from [Xeno-Canto](https://xeno-canto.org) and replace synthetic data
- **More species**: Add species from your local area
- **Web UI**: Use `rvf-server` to serve queries via HTTP
- **WASM**: Port to browser using RVF's WASM support
