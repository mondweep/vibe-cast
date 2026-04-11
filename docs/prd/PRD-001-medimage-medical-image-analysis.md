---
id: PRD-001
title: "MedImage — Medical Image Analysis with MedGemma"
status: draft
author: mondweep
date: 2026-04-11
sprint: S01
priority: high
---

# PRD-001: MedImage — Medical Image Analysis with MedGemma

## Problem Statement

**Healthcare practitioners and researchers** cannot **obtain rapid, structured AI-assisted analysis of medical images at the point of care** because **existing tools require cloud connectivity, expensive infrastructure, or lack support for the breadth of imaging modalities encountered in practice.**

## User Stories (EARS Format)

### Event-driven

- **US-001**: When a user captures or selects a medical image, the system shall return a structured analysis within the response time threshold for the selected deployment mode.
- **US-002**: When a user selects an imaging modality (radiology, dermatology, pathology, ophthalmology), the system shall apply modality-specific analysis prompts and evaluation criteria.
- **US-003**: When the device has no network connectivity, the system shall provide on-device analysis using a local model if the device supports AI Core.

### State-driven

- **US-004**: While the system is processing an image, the user shall see progress indication and estimated time remaining.
- **US-005**: While operating in on-device mode, the system shall display a clear indicator distinguishing local inference from server-assisted inference.

### Unwanted behavior

- **US-006**: If the model produces output that cannot be parsed into structured findings, the system shall return the raw output with a parsing-failure flag rather than silently dropping the response.
- **US-007**: If image upload exceeds size or format constraints, the system shall reject with a specific, actionable error message before inference is attempted.
- **US-008**: The system shall never present AI-generated analysis without an accompanying medical disclaimer.

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Chest X-ray classification (macro F1) | ≥ 85.0 | MIMIC-CXR eval set |
| Dermatology classification accuracy | ≥ 68.0 | US-DermMCQA eval set |
| Pathology classification accuracy | ≥ 65.0 | PathMCQA eval set |
| Fundus image classification accuracy | ≥ 60.0 | EyePACS eval set |
| Radiology VQA accuracy | ≥ 70.0 | SLAKE eval set |
| Server response time (p95) | ≤ 8 seconds | End-to-end including upload |
| On-device response time (p95) | ≤ 15 seconds | Pixel 10 XL, AI Core |
| Structured output parse rate | ≥ 90% | Percentage of responses parsed into Finding objects |
| Image upload rejection accuracy | 100% | Invalid files never reach inference |
| Availability (server mode) | ≥ 99.5% | Uptime over rolling 30 days |

## AI Quality Metrics

| Metric | Target | Method |
|--------|--------|--------|
| Faithfulness | ≥ 0.85 | LLM-as-judge: findings grounded in image content |
| Relevance | ≥ 0.90 | LLM-as-judge: findings relevant to selected modality |
| Consistency | ≥ 0.80 | Same image analyzed 5x produces ≥ 80% overlapping findings |
| Hallucination rate | ≤ 5% | Manual review of 200-sample eval set per modality |

## Supported Modalities

| Modality | Image Types | Key Conditions |
|----------|-------------|----------------|
| Radiology | Chest X-ray, CT scan | Pneumonia, cardiomegaly, pleural effusion, fractures |
| Dermatology | Clinical photos, dermatoscopic | Melanoma, basal cell carcinoma, psoriasis, eczema |
| Pathology | H&E stains, IHC slides | Tissue architecture, malignancy indicators |
| Ophthalmology | Fundus images | Diabetic retinopathy, glaucoma, macular degeneration |

## Non-functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| Max image upload size | 20 MB | Covers high-res medical images without abuse |
| Supported formats | JPEG, PNG, BMP, TIFF, DICOM | Standard medical imaging formats |
| Image preprocessing latency | ≤ 500ms | Should not be perceptible bottleneck |
| Model memory (server) | ≤ 10 GB VRAM | Fits single consumer GPU (RTX 3080+) |
| Model memory (on-device) | Within AI Core limits | Managed by Android AI Core runtime |
| Cold start time (server) | ≤ 60 seconds | Model loading on first request |
| Concurrent users (server) | ≥ 10 | Queue-based if GPU is saturated |
| Data privacy | Zero image retention | Images processed in memory, never persisted |
| Disclaimer visibility | Every response | Non-dismissable medical disclaimer |

## Deployment Modes

1. **Server-assisted** — MedGemma 4B-IT running on GPU server, mobile/web client sends image via API.
2. **On-device** — Gemma 4 E2B/E4B via Android AI Core on supported devices (Pixel 10 XL). Reduced capability but fully offline.
3. **Hybrid** — On-device for triage/fast analysis, server for detailed multi-finding analysis.

## Out of Scope

| Item | Rationale |
|------|-----------|
| Clinical diagnosis or treatment recommendations | Regulatory and liability — this is a decision-support tool |
| Multi-image analysis (e.g., comparing longitudinal scans) | MedGemma 4B evaluated on single-image tasks only |
| DICOM network integration (PACS) | Future sprint — requires healthcare IT infrastructure |
| User authentication and HIPAA compliance | Requires dedicated security sprint and legal review |
| Model fine-tuning pipeline | Future sprint — start with off-the-shelf MedGemma |
| Multi-turn conversational follow-up | MedGemma not evaluated for multi-turn |

## Constraints

- MedGemma 4B-IT requires HuggingFace Transformers ≥ 4.50.0 for server inference.
- On-device inference depends on AI Core Developer Preview availability and device support.
- MedGemma outputs are English-only for evaluated accuracy.
- Model is licensed under Health AI Developer Foundations terms — not standard open source.

## Assumptions

- Users have basic medical imaging literacy (know which modality to select).
- Server deployment has access to NVIDIA GPU with ≥ 8 GB VRAM.
- Pixel 10 XL will ship with AI Core support for Gemma 4 E2B/E4B models.
- Network latency for server mode is ≤ 500ms (not satellite/extreme remote).

## Quality Gate Checklist

- [ ] All success metrics have numeric thresholds
- [ ] All user stories follow EARS format
- [ ] Out-of-scope items have rationale
- [ ] AI quality metrics defined with evaluation method
- [ ] Non-functional requirements are measurable
- [ ] Deployment modes specified
- [ ] Constraints and assumptions documented
- [ ] No vague language ("fast", "good", "reliable") — all quantified

*"Specifications are the source of truth, not code." — BHIL*
