# Prime-Radiant Advanced WASM Evaluation

This directory contains an evaluation setup for the [prime-radiant-advanced-wasm](https://www.npmjs.com/package/prime-radiant-advanced-wasm) npm package.

## Package Overview

**prime-radiant-advanced-wasm** is a WebAssembly package providing advanced mathematical engines for AI interpretability and safety. It implements infrastructure for coherence checking - a mathematical gate that proves whether a system's beliefs, facts, and claims are internally consistent.

**Version**: 0.1.3
**License**: MIT OR Apache-2.0
**Repository**: https://github.com/ruvnet/ruvector

## Available Engines

| Engine | Purpose | Key Methods |
|--------|---------|-------------|
| **CohomologyEngine** | Contradiction detection using Sheaf Laplacian | `consistencyEnergy()`, `computeCohomology()` |
| **SpectralEngine** | System stability prediction | `algebraicConnectivity()`, `computeEigenvalues()`, `computeCheegerBounds()` |
| **CausalEngine** | Causal inference & do-calculus | `findConfounders()`, `computeCausalEffect()`, `isValidDag()` |
| **QuantumEngine** | Quantum computing & topology | `createGHZState()`, `computeTopologicalInvariants()` |
| **CategoryEngine** | Category theory operations | `verifyCategoryLaws()`, `composeMorphisms()` |
| **HoTTEngine** | Homotopy Type Theory | `checkTypeEquivalence()`, `createReflPath()` |

## Installation

```bash
npm install
```

## Running the Evaluation

```bash
npm run evaluate
```

## Key Concepts

### Coherence Energy
The Sheaf Laplacian energy measures how well local information "glues together" globally:
- **Energy ≈ 0**: Perfect coherence - all facts align
- **Energy > 0.5**: High incoherence - contradictions detected
- **Energy > 0.7**: Critical - major contradictions

### Use Cases
- RAG hallucination prevention
- Multi-agent consensus verification
- Memory consistency for long-running agents
- Sensor fusion validation

## Package Stats

- Bundle size: ~92 KB (WASM)
- Zero dependencies
- Runs in: Browser, Node.js, Deno, Cloudflare Workers
