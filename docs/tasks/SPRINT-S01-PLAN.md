---
id: SPRINT-S01-PLAN
sprint: S01-S03
status: draft
---

# Sprint Plan — MedImage

## Dependency Graph

```
TASK-001 (OpenAPI Spec) ──────┐
                              ├──→ TASK-003 (Inference Engine) ──→ TASK-004 (API Server) ──→ TASK-005 (Eval Suite)
TASK-002 (Prompt Registry) ───┘                                         │
                                                                        ▼
                                                              TASK-006 (Android Setup)
                                                                        │
                                                                        ▼
                                                              TASK-007 (Camera + Analysis)
                                                                        │
                                                                        ▼
                                                              TASK-008 (AI Core + Mode Router)
```

## Phase Schedule

### Phase 1 — Server Foundation (Sprint S01)

| Task | Depends On | Parallel? | Description |
|------|-----------|-----------|-------------|
| TASK-001 | — | Yes | OpenAPI specification |
| TASK-002 | — | Yes | Versioned prompt registry |
| TASK-003 | TASK-001, TASK-002 | No | Inference engine (MedGemma 4B-IT) |
| TASK-004 | TASK-001, TASK-003 | No | API server implementing spec |
| TASK-005 | TASK-003, TASK-004 | No | Evaluation suite |

**Parallelism**: TASK-001 and TASK-002 can run concurrently. All others are sequential.

### Phase 2 — Android Client (Sprint S02)

| Task | Depends On | Parallel? | Description |
|------|-----------|-----------|-------------|
| TASK-006 | TASK-004 | Yes | Android project setup + home screen |
| TASK-007 | TASK-006 | No | Camera, gallery, analysis flow |

### Phase 3 — On-Device + Hybrid (Sprint S03)

| Task | Depends On | Parallel? | Description |
|------|-----------|-----------|-------------|
| TASK-008 | TASK-007 | No | AI Core integration + mode router |

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| MedGemma model download blocked (HuggingFace gating) | Blocks TASK-003 | Medium | Pre-accept license, cache model weights |
| GPU unavailable for eval | Blocks TASK-005 | Low | Use Google Colab or Cloud GPU |
| AI Core Developer Preview API changes | Blocks TASK-008 | Medium | Isolate behind interface, adapt when stable |
| MedGemma structured output unreliable | Degrades parse rate | Medium | Robust fallback parsing, prompt iteration |
| Pixel 10 XL hardware unavailable for testing | Blocks TASK-008 on-device testing | Low | Use AI Edge Gallery on available device |

*"Specifications are the source of truth, not code." — BHIL*
