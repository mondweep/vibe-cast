---
id: TASK-001
spec: SPEC-001
adrs: [ADR-002]
status: draft
depends_on: []
parallel: true
estimated_tokens: ~2000
---

# TASK-001: Define OpenAPI Specification (Contract-First)

## Context
ADR-002 mandates protocol-based boundaries — the API contract must exist before any implementation. This is the foundation all other tasks depend on.

## Session Start
1. Read SPEC-001 §1 (Inference API) for interface definitions
2. Read ADR-002 for architecture principles

## Scope

### Files to create
- `api/openapi.yaml` — OpenAPI 3.1 specification

### Files excluded
- No implementation code — contract only

## Implementation Steps

1. Define `openapi.yaml` with info, servers, and security sections
2. Define `/api/v1/analyze` endpoint (POST, multipart/form-data)
   - Request: image file + modality enum + optional query string
   - Response: AnalyzeResponse schema with findings array + metadata
   - Error responses: 400, 413, 503
3. Define `/api/v1/modalities` endpoint (GET)
   - Response: array of ModalityInfo objects
4. Define `/api/v1/health` endpoint (GET)
   - Response: HealthResponse with model status
5. Define all schemas: Finding, AnalyzeResponse, ResponseMetadata, ErrorResponse, Modality enum
6. Add validation constraints: image max size, modality enum values, query max length
7. Validate spec with `swagger-cli validate`

## Test Requirements
- OpenAPI spec passes lint/validation
- All SPEC-001 interface types are represented
- Example requests/responses included for each endpoint

## Acceptance Criteria
- [ ] OpenAPI 3.1 valid specification
- [ ] All three endpoints defined with request/response schemas
- [ ] Validation rules match SPEC-001 table
- [ ] Error responses defined for all failure scenarios in SPEC-001 error matrix

## Definition of Done
OpenAPI spec committed, validated, and all SPEC-001 API contracts represented.
