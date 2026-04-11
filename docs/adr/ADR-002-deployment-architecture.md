---
id: ADR-002
title: "Deployment Architecture and Language Selection"
status: proposed
type: general
date: 2026-04-11
related_prds: [PRD-001]
related_specs: []
---

# ADR-002: Deployment Architecture and Language Selection

## Context and Problem Statement

PRD-001 defines three deployment modes: server-assisted, on-device, and hybrid. We need an architecture that supports all three without premature commitment to a single language or framework. The system must remain flexible as AI Core matures and on-device capabilities evolve.

## Decision Drivers

| Driver | Target | Weight |
|--------|--------|--------|
| Deployment flexibility | All 3 PRD-001 modes supported | 0.30 |
| Time to first working prototype | ≤ 2 sprints | 0.25 |
| Language/framework portability | Not locked to single ecosystem | 0.20 |
| On-device performance | Meets PRD-001 p95 latency targets | 0.15 |
| Maintainability | Single team can maintain all components | 0.10 |

## Options Evaluated

### Option A: Modular polyglot — Python inference, protocol-based API, Kotlin client

```
┌─────────────────────────────────────────────────┐
│                  Android Client                  │
│               (Kotlin + Compose)                 │
│  ┌──────────┐  ┌──────────────────────────────┐ │
│  │ AI Core  │  │     Server API Client        │ │
│  │ (local)  │  │  (REST/gRPC, configurable)   │ │
│  └──────────┘  └──────────────────────────────┘ │
└────────┬────────────────────┬───────────────────┘
         │ on-device          │ network
         ▼                    ▼
   ┌──────────┐     ┌──────────────────┐
   │ Gemma 4  │     │  Inference API   │
   │   E2B    │     │ (protocol-based) │
   └──────────┘     └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  MedGemma 4B-IT  │
                    │ (Transformers)   │
                    └──────────────────┘
```

| Criterion | Assessment |
|-----------|------------|
| Flexibility | High — inference engine swappable behind protocol |
| Time to prototype | Fast — Python inference, Kotlin client |
| Portability | Medium — inference layer replaceable (Rust ONNX, WASM) |
| On-device | Native AI Core integration |
| Maintainability | Medium — two languages (Python, Kotlin) |

### Option B: Full Rust — Rust server (ONNX Runtime) + Rust Android NDK

| Criterion | Assessment |
|-----------|------------|
| Flexibility | Low — MedGemma has no ONNX export today |
| Time to prototype | Slow — model export work required first |
| Portability | High — single language, native everywhere |
| On-device | No AI Core integration from Rust |
| Maintainability | High if feasible — single language |

### Option C: Full Python — Python server + Kivy/BeeWare mobile

| Criterion | Assessment |
|-----------|------------|
| Flexibility | Low — no native Android experience |
| Time to prototype | Medium — Python mobile frameworks are immature |
| Portability | Low — Python mobile is fragile |
| On-device | No AI Core access from Python |
| Maintainability | High — single language |

### Option D: WASM-first — Rust→WASM inference + PWA client

| Criterion | Assessment |
|-----------|------------|
| Flexibility | Medium — WASM runs everywhere |
| Time to prototype | Slow — 4B model in WASM is infeasible today |
| Portability | Very high — runs in any browser |
| On-device | No AI Core integration |
| Maintainability | Medium — Rust + Web stack |

## Chosen Option: Option A — Modular polyglot with protocol-based API

### Rationale

- **Flexible by design**: The inference engine sits behind a defined API protocol (OpenAPI/gRPC). Today it's Python+Transformers. Tomorrow it could be Rust+ONNX or a managed cloud endpoint — the client doesn't care.
- **Fastest to prototype**: Python is the only language with working MedGemma inference today. Fighting this wastes sprints.
- **Native Android**: Kotlin + Compose gives first-class Pixel 10 XL experience and direct AI Core access for on-device mode.
- **Clear replacement path**: When MedGemma gets ONNX export or TFLite conversion, the Python inference layer can be swapped for Rust/C++ without touching the client or API contract.

### Architecture Principles

1. **Protocol over implementation** — Define API contract (OpenAPI spec) first. Inference engine is a pluggable backend.
2. **Thin client** — Android app handles image capture, display, and AI Core routing. No business logic in client.
3. **Mode negotiation** — Client checks AI Core availability at startup. Falls back to server. User can override.
4. **Stateless inference** — Each analysis is independent. No session state on server.
5. **Image preprocessing at edge** — Resize/normalize on client before upload to reduce bandwidth and server load.

### Component Boundaries

| Component | Language | Replaceable? | Boundary |
|-----------|----------|-------------|----------|
| Inference engine | Python (Transformers) | Yes — behind API protocol | Input: image bytes + modality + query → Output: structured findings JSON |
| API server | Python (FastAPI) | Yes — any language implementing OpenAPI spec | REST endpoints as defined in SPEC |
| Android client | Kotlin (Compose) | No — platform-native | UI + AI Core + API client |
| On-device inference | Kotlin (AI Core SDK) | No — platform API | ML Kit Prompt API |
| Image preprocessor | Client-side (Kotlin) | Optionally Rust via JNI/WASM | Resize, normalize, validate |

## Acceptance Criteria

- [ ] OpenAPI specification defines all API endpoints before implementation begins
- [ ] Inference engine is invocable through the API protocol without direct library coupling
- [ ] Android client can switch between server and on-device mode at runtime
- [ ] Replacing the Python inference engine with a mock produces identical API responses
- [ ] Image preprocessing runs on client, server receives normalized input

## Rejected Options

- **Option B (full Rust)**: MedGemma has no ONNX/TFLite export. Blocked on Google. Revisit when available.
- **Option C (full Python mobile)**: No AI Core access, poor mobile UX. Not viable for Pixel 10 XL target.
- **Option D (WASM)**: 4B parameter model in browser WASM is infeasible. Revisit for smaller models.

## Consequences

### Positive
- Start building immediately with proven tools
- Clear upgrade paths for every component
- Native Android experience on Pixel 10 XL
- Architecture survives technology changes

### Negative
- Two-language codebase (Python + Kotlin)
- API protocol design is an upfront cost
- On-device mode initially limited to general Gemma (not MedGemma)

## Review Triggers

- MedGemma releases ONNX or TFLite export → evaluate Rust inference engine
- Google publishes MedGemma for AI Core → simplify to single on-device path
- WASM model inference becomes feasible at 4B scale → evaluate PWA option
- Team composition changes (e.g., no Kotlin expertise) → re-evaluate client technology

*"Specifications are the source of truth, not code." — BHIL*
