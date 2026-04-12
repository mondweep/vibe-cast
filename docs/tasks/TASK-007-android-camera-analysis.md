---
id: TASK-007
spec: SPEC-001
adrs: [ADR-002]
status: draft
depends_on: [TASK-006]
parallel: false
estimated_tokens: ~3000
---

# TASK-007: Android Client — Camera, Gallery, and Analysis Flow

## Context
Continues Phase 2. Implements the image capture/selection and analysis results display — the core user-facing flow.

## Session Start
1. Read SPEC-001 §3 (Android Client) for screen specs
2. Read SPEC-001 §3 (Image Preprocessing) for client-side preprocessing rules
3. Read TASK-006 output for project structure and navigation

## Scope

### Files to create
- Camera screen (CameraX integration)
- Gallery picker integration
- Image preprocessor (client-side resize, validate, convert)
- Analysis screen (loading → results → disclaimer)
- ViewModels for analysis flow

### Files excluded
- AI Core on-device inference (Phase 3)
- Eval suite (TASK-005)

## Implementation Steps

1. Camera screen:
   - CameraX integration with capture button
   - Preview with aspect ratio suitable for medical images
   - Flash toggle, front/back camera switch
2. Gallery picker:
   - Android photo picker (MediaStore)
   - Filter to supported formats (JPEG, PNG, BMP, TIFF)
3. Image preprocessor (per SPEC-001 §3):
   - Validate format
   - Check file size ≤ 20 MB
   - Resize if dimension > 2048px (maintain aspect ratio)
   - Convert to JPEG at 90% quality for upload
4. Analysis screen:
   - Loading state: progress indicator + estimated time
   - Results state: summary card, findings list with severity badges, raw output expandable
   - Disclaimer: non-dismissable banner at bottom of results
   - Mode indicator: "Server" or "On-device" badge
5. Wire up: Home → select modality → capture/pick image → preprocess → analyze → display results

## Acceptance Criteria
- [ ] Camera captures and returns image
- [ ] Gallery picker returns supported image formats
- [ ] Preprocessing resizes images > 2048px
- [ ] Analysis screen shows loading → results transition
- [ ] Findings displayed with severity color coding
- [ ] Disclaimer visible on every results screen
- [ ] End-to-end flow works with server API

## Definition of Done
User can select modality, capture/pick image, see analysis results with findings and disclaimer.
