---
id: TASK-006
spec: SPEC-001
adrs: [ADR-002]
status: draft
depends_on: [TASK-004]
parallel: true
estimated_tokens: ~4000
---

# TASK-006: Android Client — Project Setup and Home Screen

## Context
Phase 2 of SPEC-001. Kotlin + Jetpack Compose client targeting Pixel 10 XL. This task covers project scaffolding and the home screen with modality selection.

## Session Start
1. Read SPEC-001 §3 (Android Client) for screens and components
2. Read ADR-002 for client architecture principles (thin client, mode negotiation)

## Scope

### Files to create
- Android project structure (Kotlin + Compose + Material 3)
- Home screen with 4 modality cards
- Navigation setup
- API client interface (server communication)
- Settings data store (mode preference, server URL)

### Files excluded
- Camera integration (TASK-007)
- AI Core integration (Phase 3)

## Implementation Steps

1. Create Android project with:
   - Minimum SDK: 35 (Android 16)
   - Target SDK: 35
   - Kotlin + Jetpack Compose + Material 3
   - Dependency injection: Hilt
   - Networking: Retrofit + OkHttp
   - Image loading: Coil
2. Define navigation graph: Home → Camera/Gallery → Analysis → Settings
3. Build Home screen:
   - 4 modality selection cards (radiology, dermatology, pathology, ophthalmology)
   - Each card: icon, title, brief description, supported conditions
   - Image source buttons: Camera / Gallery
4. Implement API client interface matching OpenAPI spec from TASK-001:
   - `analyzeImage(image, modality, query?): AnalyzeResponse`
   - `getModalities(): List<ModalityInfo>`
   - `healthCheck(): HealthResponse`
5. Implement Settings screen:
   - Inference mode toggle (server / on-device / hybrid)
   - Server URL configuration
   - Persist with DataStore

## Acceptance Criteria
- [ ] Android project builds and runs on Pixel 10 XL emulator
- [ ] Home screen displays 4 modality cards
- [ ] Navigation between screens works
- [ ] API client compiles against OpenAPI spec types
- [ ] Settings persist across app restarts

## Definition of Done
Android app builds, home screen renders modalities, navigation works, API client defined.
