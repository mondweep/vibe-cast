---
id: ADR-001
title: "Model Selection for Medical Image Analysis"
status: proposed
type: model-selection
date: 2026-04-11
related_prds: [PRD-001]
related_specs: []
---

# ADR-001: Model Selection for Medical Image Analysis

## Context and Problem Statement

PRD-001 requires medical image analysis across four modalities (radiology, dermatology, pathology, ophthalmology) with quantified accuracy thresholds. We need to select model(s) that meet these thresholds while supporting both server and on-device deployment paths.

## Decision Drivers

| Driver | Target | Weight |
|--------|--------|--------|
| Medical imaging accuracy | Meets PRD-001 thresholds per modality | 0.35 |
| Multimodal support | Text + image input, text output | 0.20 |
| Deployment flexibility | Server GPU + on-device mobile | 0.20 |
| Memory footprint | ≤ 10 GB server, within AI Core limits mobile | 0.15 |
| Licensing | Permits commercial/research use | 0.10 |

## Options Evaluated

### Option A: MedGemma 4B-IT (server) + Gemma 4 E2B (on-device)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Radiology accuracy | 88.9 F1 (MIMIC-CXR) | Exceeds 85.0 target |
| Dermatology accuracy | 71.8 (US-DermMCQA) | Exceeds 68.0 target |
| Pathology accuracy | 69.8 (PathMCQA) | Exceeds 65.0 target |
| Ophthalmology accuracy | 64.9 (EyePACS) | Exceeds 60.0 target |
| Radiology VQA | 72.3 (SLAKE) | Exceeds 70.0 target |
| Memory (server) | ~8 GB bfloat16 | Within 10 GB target |
| On-device | Gemma 4 E2B via AI Core | 2B params, optimized for mobile |
| License | Health AI Developer Foundations | Permits research, requires review for clinical |

### Option B: MedGemma 27B-multimodal-IT (server only)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Accuracy | Higher than 4B across all modalities | Best available accuracy |
| Memory (server) | ~54 GB bfloat16 | Requires A100 80GB |
| On-device | Not feasible | 27B too large for mobile |
| License | Same as 4B | Health AI Developer Foundations |

### Option C: Base Gemma 4 E4B (both server and on-device)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Radiology accuracy | ~32 F1 (base Gemma 3 4B baseline) | Fails all medical thresholds without fine-tuning |
| Multimodal | Yes (text + image) | General purpose, not medical-specialized |
| Memory | ~8 GB server, AI Core on-device | Good deployment flexibility |
| License | Standard Gemma license | More permissive |

### Option D: Fine-tuned Gemma 4 E4B on medical data

| Criterion | Score | Notes |
|-----------|-------|-------|
| Accuracy | Unknown — depends on fine-tuning | Could approach MedGemma levels |
| Cost | High — requires labeled medical datasets + GPU training | Weeks of effort |
| On-device | Yes, after quantization | Would need ONNX/TFLite export |
| Risk | Dataset licensing, training instability | Significant unknowns |

## Chosen Option: Option A — MedGemma 4B-IT + Gemma 4 E2B

### Rationale

- **Meets all PRD-001 accuracy thresholds** out of the box with zero fine-tuning.
- **Dual deployment path**: MedGemma 4B-IT for server (full accuracy), Gemma 4 E2B via AI Core for on-device (triage/fast analysis).
- **Lowest risk**: published benchmarks, maintained by Google Health, active community.
- **Memory-feasible**: fits single consumer GPU for server, AI Core manages on-device.

### Trade-offs accepted

- On-device mode uses general Gemma 4 E2B, not MedGemma — accuracy will be lower for on-device analysis. This is acceptable for the hybrid deployment mode in PRD-001 (on-device for triage, server for detail).
- MedGemma license is more restrictive than standard Gemma — requires legal review before clinical deployment.

## Acceptance Criteria

- [ ] MedGemma 4B-IT loads and runs inference on test images within PRD-001 memory constraints
- [ ] Accuracy validated against PRD-001 thresholds on published eval sets
- [ ] Gemma 4 E2B runs via AI Core on Pixel 10 XL (when hardware available)
- [ ] License terms reviewed and documented

## Rejected Options

- **Option B (27B)**: Requires enterprise GPU (A100 80GB), no on-device path. Overkill for initial release.
- **Option C (base Gemma 4)**: Fails all medical accuracy thresholds without fine-tuning.
- **Option D (fine-tuned Gemma 4)**: High cost, uncertain outcome, weeks of training effort — revisit if MedGemma proves insufficient.

## Consequences

### Positive
- Immediate access to validated medical AI benchmarks
- Clear upgrade path (4B → 27B) if accuracy needs increase
- Google-maintained model with ongoing updates

### Negative
- Locked to HuggingFace Transformers ecosystem for server inference
- On-device accuracy gap between MedGemma and general Gemma
- Health AI Developer Foundations license requires legal diligence

## Review Triggers

- MedGemma releases a mobile-optimized variant (E2B/E4B size)
- AI Core adds support for custom medical models
- Accuracy thresholds in PRD-001 are revised upward
- A competitor model exceeds MedGemma benchmarks at similar size

*"Specifications are the source of truth, not code." — BHIL*
