# Prime-Radiant Advanced WASM Evaluation

## About

This project is an evaluation and exploration of the `prime-radiant-advanced-wasm` package (available on [npm](https://www.npmjs.com/package/prime-radiant-advanced-wasm)).

The goal is to understand the capabilities, input requirements, and potential use cases of this WebAssembly-based mathematical library, which provides advanced engines for Coherence, Stability, Causal Inference, Quantum States, Category Theory, and Homotopy Type Theory.

We have reverse-engineered the required input data structures (which were strictly typed in the underlying Rust/WASM code) and created:
1.  A working Node.js evaluation script (`evaluate.js`) in `wasm-evaluation/`.
2.  A [React-based Visualizer](../wasm-visualizer/README.md) to demonstrate these concepts intuitively.

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
