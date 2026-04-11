---
id: SPEC-001
title: "MedImage Technical Specification"
status: draft
parent_prd: PRD-001
adrs: [ADR-001, ADR-002]
sprint: S01
---

# SPEC-001: MedImage Technical Specification

## Architecture Overview

Per ADR-002, the system uses a modular polyglot architecture with protocol-based boundaries.

```
┌─────────────────────────────────────────────────────────────┐
│                     Android Client (Kotlin)                  │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐│
│  │   Camera    │  │   Image    │  │    Results Display     ││
│  │   Capture   │  │  Gallery   │  │  (Findings + Disclaimer││
│  └──────┬─────┘  └─────┬──────┘  └────────────────────────┘│
│         │              │                      ▲              │
│         └──────┬───────┘                      │              │
│                ▼                               │              │
│  ┌──────────────────────┐          ┌─────────┴────────────┐ │
│  │  Image Preprocessor  │          │   Response Parser     │ │
│  │  (resize, validate)  │          │   (JSON → Findings)   │ │
│  └──────────┬───────────┘          └─────────▲────────────┘ │
│             │                                │              │
│   ┌─────────▼──────────────────────────────────────────┐    │
│   │              Mode Router                           │    │
│   │  ┌──────────────┐        ┌──────────────────────┐  │    │
│   │  │  AI Core     │        │  Server API Client   │  │    │
│   │  │  (on-device) │        │  (REST + multipart)  │  │    │
│   │  └──────────────┘        └──────────────────────┘  │    │
│   └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                    │ network              │ on-device
                    ▼                      ▼
         ┌──────────────────┐    ┌──────────────────┐
         │   Inference API  │    │   Android AI Core│
         │   (OpenAPI)      │    │   (Gemma 4 E2B)  │
         └────────┬─────────┘    └──────────────────┘
                  │
         ┌────────▼─────────┐
         │  Inference Engine │
         │  MedGemma 4B-IT  │
         │  (Transformers)  │
         └──────────────────┘
```

## Component Specifications

### 1. Inference API (Server)

#### Protocol: REST (OpenAPI 3.1)

```typescript
// POST /api/v1/analyze
interface AnalyzeRequest {
  image: BinaryFile           // multipart/form-data
  modality: Modality          // "radiology" | "dermatology" | "pathology" | "ophthalmology"
  query?: string              // optional custom prompt override
}

interface AnalyzeResponse {
  modality: Modality
  summary: string             // ≤ 300 characters
  findings: Finding[]
  raw_output: string          // full model output for debugging
  disclaimer: string          // medical disclaimer, always present
  metadata: ResponseMetadata
}

interface Finding {
  description: string
  severity: "normal" | "mild" | "moderate" | "severe"
  location?: string           // anatomical location if applicable
}

interface ResponseMetadata {
  model_id: string
  inference_time_ms: number
  image_resolution: string    // "WxH" as received after preprocessing
  parse_success: boolean      // whether structured extraction succeeded
}
```

```typescript
// GET /api/v1/modalities
interface ModalitiesResponse {
  modalities: ModalityInfo[]
}

interface ModalityInfo {
  id: Modality
  name: string
  description: string
  supported_conditions: string[]
}
```

```typescript
// GET /api/v1/health
interface HealthResponse {
  status: "healthy" | "loading" | "error"
  model_id: string
  model_loaded: boolean
  uptime_seconds: number
}
```

#### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| image | Required, ≤ 20 MB, format in [JPEG, PNG, BMP, TIFF, DICOM] | 400 |
| modality | Required, must be one of supported values | 400 |
| query | Optional, ≤ 500 characters | 400 |

#### Error Response

```typescript
interface ErrorResponse {
  error: string               // machine-readable code
  detail: string              // human-readable message
  field?: string              // which field caused the error
}
```

### 2. Inference Engine

Per ADR-001, uses MedGemma 4B-IT via HuggingFace Transformers.

#### Interface (pluggable behind API)

```typescript
interface InferenceEngine {
  load(): Promise<void>
  analyze(image: ImageBytes, systemPrompt: string, userPrompt: string): Promise<string>
  isLoaded(): boolean
  modelId(): string
}
```

#### Preprocessing Pipeline

1. Receive image bytes from API layer
2. Decode to RGB PIL Image
3. MedGemma processor handles normalization to 896x896 and tokenization (256 tokens per image)
4. No manual resize — processor handles this per model requirements

#### Prompt Construction

Per modality, construct messages array:

```json
[
  {"role": "system", "content": [{"type": "text", "text": "<modality_system_prompt>"}]},
  {"role": "user", "content": [
    {"type": "text", "text": "<user_query_or_default> + <structured_output_instruction>"},
    {"type": "image", "image": "<PIL_Image>"}
  ]}
]
```

Prompts are versioned in `docs/prompts/` per BHIL conventions.

#### Output Parsing

1. Attempt JSON extraction from raw model output (regex for `{...}`)
2. If valid JSON with `summary` and `findings` keys → structured response
3. If parse fails → return raw output as single finding with `parse_success: false`
4. Never drop model output silently (US-006)

### 3. Android Client

#### Technology: Kotlin + Jetpack Compose + Material 3

#### Screens

| Screen | Purpose | Key Components |
|--------|---------|----------------|
| Home | Modality selection + image source | 4 modality cards, camera/gallery buttons |
| Camera | Live camera capture | CameraX integration, capture button |
| Analysis | Loading → results display | Progress indicator, findings list, disclaimer |
| Settings | Mode selection, server URL | Server/on-device/hybrid toggle, URL config |

#### Mode Router

```typescript
interface ModeRouter {
  detectAvailableMode(): InferenceMode  // checks AI Core availability
  getPreferredMode(): InferenceMode     // user preference from settings
  route(request: AnalyzeRequest): Promise<AnalyzeResponse>
}

type InferenceMode = "server" | "on_device" | "hybrid"
```

**Routing logic:**
1. Check user preference in settings
2. If "on_device" or "hybrid" → check AI Core availability via ML Kit
3. If AI Core unavailable and mode requires it → fall back to server with user notification
4. If "hybrid" → run on-device first, then server in background for detailed findings

#### AI Core Integration (On-device)

```kotlin
// Per AI Core Developer Preview documentation
val modelConfig = ModelConfig {
    releaseTrack = ModelReleaseTrack.PREVIEW
    preference = ModelPreference.FULL  // E4B for higher reasoning
    // or ModelPreference.EFFICIENT    // E2B for speed
}
```

Note: On-device uses general Gemma 4 (not MedGemma) per ADR-001 trade-off.

#### Image Preprocessing (Client-side)

Before upload to server:
1. Read image from camera/gallery
2. Validate format (JPEG, PNG, BMP, TIFF)
3. Check file size ≤ 20 MB
4. Resize if dimension > 2048px on any side (maintain aspect ratio)
5. Convert to JPEG at 90% quality for upload (reduces bandwidth)
6. Retain original for on-device inference

### 4. Prompt Registry

Located in `docs/prompts/` per BHIL convention.

| Prompt ID | Version | Modality | Purpose |
|-----------|---------|----------|---------|
| radiology-system | v1.0 | Radiology | System prompt for radiological analysis |
| radiology-user | v1.0 | Radiology | Default user query template |
| dermatology-system | v1.0 | Dermatology | System prompt for dermatological analysis |
| dermatology-user | v1.0 | Dermatology | Default user query template |
| pathology-system | v1.0 | Pathology | System prompt for pathology analysis |
| pathology-user | v1.0 | Pathology | Default user query template |
| ophthalmology-system | v1.0 | Ophthalmology | System prompt for ophthalmology analysis |
| ophthalmology-user | v1.0 | Ophthalmology | Default user query template |
| structured-output | v1.0 | All | JSON output format instruction appended to all queries |

## Data Models

### Image Analysis Record (in-memory only, per PRD-001 privacy requirement)

```typescript
interface AnalysisRecord {
  id: UUID
  timestamp: ISO8601
  modality: Modality
  image_hash: SHA256       // for deduplication, not stored image
  inference_mode: InferenceMode
  response: AnalyzeResponse
  inference_time_ms: number
}
```

No persistent storage. Records exist only for the lifecycle of the request.

## Error Handling Matrix

| Failure Scenario | Detection | Recovery | Fallback |
|------------------|-----------|----------|----------|
| Model not loaded | `isLoaded()` returns false | Queue request, load model | Return 503 with retry-after header |
| GPU OOM | CUDA OOM exception | Clear cache, retry once | Return 503, suggest smaller image |
| Invalid image format | PIL open fails | Return 400 | Client shows format guidance |
| Image too large | Size check before inference | Return 400 | Client shows size limit |
| Model output unparseable | JSON parse fails | Return raw output with `parse_success: false` | Client shows raw text |
| Network timeout (client) | HTTP timeout | Retry once after 3s | Suggest on-device mode |
| AI Core unavailable | ML Kit capability check | Fall back to server | Notify user of mode switch |
| Server unreachable | Connection refused | Retry with backoff (2s, 4s) | Suggest on-device mode if available |

## Testing Strategy

### Unit Tests
- Image validation (format, size, dimensions)
- Prompt construction per modality
- Response parsing (valid JSON, malformed JSON, empty output)
- Mode routing logic
- Error handling for each failure scenario

### Integration Tests
- End-to-end API: upload image → receive structured findings
- Model loading and inference with sample medical images
- Client → server round trip with mock server

### Eval Suite
- Per-modality accuracy evaluation against published datasets (PRD-001 thresholds)
- Structured output parse rate across 200 samples per modality
- Consistency check: same image 5x → measure finding overlap
- Faithfulness evaluation using LLM-as-judge
- Latency benchmarks: p50, p95, p99

## Implementation Order

### Phase 1 — Server Foundation (Sprint S01)
1. OpenAPI specification (contract-first)
2. Prompt registry (versioned prompts for all modalities)
3. Inference engine with MedGemma 4B-IT
4. API server implementing OpenAPI spec
5. Unit + integration tests
6. Eval suite against published benchmarks

### Phase 2 — Android Client (Sprint S02)
1. Project scaffolding (Kotlin + Compose)
2. Home screen with modality selection
3. Camera capture + gallery picker
4. Server API client
5. Results display with findings and disclaimer
6. Settings screen

### Phase 3 — On-device + Hybrid (Sprint S03)
1. AI Core integration (Gemma 4 E2B/E4B)
2. Mode router implementation
3. Hybrid mode (on-device triage + server detail)
4. On-device vs server accuracy comparison eval

## Acceptance Criteria (traced to PRD-001)

| PRD Metric | SPEC Validation |
|------------|-----------------|
| CXR F1 ≥ 85.0 | Eval suite: MIMIC-CXR subset |
| Derm accuracy ≥ 68.0 | Eval suite: US-DermMCQA subset |
| Path accuracy ≥ 65.0 | Eval suite: PathMCQA subset |
| Fundus accuracy ≥ 60.0 | Eval suite: EyePACS subset |
| VQA accuracy ≥ 70.0 | Eval suite: SLAKE subset |
| Server p95 ≤ 8s | Load test: 50 sequential requests |
| Parse rate ≥ 90% | Eval suite: 200 samples per modality |
| Disclaimer present | Unit test: every response includes disclaimer |
| Zero image retention | Code review: no write-to-disk paths in inference |

*"Specifications are the source of truth, not code." — BHIL*
