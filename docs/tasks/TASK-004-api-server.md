---
id: TASK-004
spec: SPEC-001
adrs: [ADR-002]
status: draft
depends_on: [TASK-001, TASK-003]
parallel: false
estimated_tokens: ~3000
---

# TASK-004: API Server Implementing OpenAPI Spec

## Context
The API server is a thin layer between HTTP and the inference engine. Per ADR-002, it implements the OpenAPI contract from TASK-001 and delegates to the pluggable engine from TASK-003.

## Session Start
1. Read TASK-001 output: `api/openapi.yaml`
2. Read SPEC-001 §1 (Inference API) for validation rules and error responses
3. Read SPEC-001 error handling matrix

## Scope

### Files to create
- `backend/app/api/routes.py` — API route handlers
- `backend/app/api/middleware.py` — CORS, request logging
- `backend/app/main.py` — FastAPI app entrypoint
- `backend/tests/test_api.py` — API integration tests

### Files to modify
- `backend/app/core/config.py` — add server configuration

### Files excluded
- Inference engine internals (TASK-003)
- Android client (Phase 2)

## Implementation Steps

1. Create FastAPI application with metadata matching OpenAPI spec
2. Implement `POST /api/v1/analyze`:
   - Multipart file upload with validation (format, size)
   - Modality enum validation
   - Delegate to inference engine
   - Return structured AnalyzeResponse with metadata
   - Include disclaimer in every response
3. Implement `GET /api/v1/modalities`:
   - Return supported modalities with descriptions from prompt registry
4. Implement `GET /api/v1/health`:
   - Return model status, uptime, loaded state
5. Implement error handling:
   - 400 for validation errors (bad format, oversized, invalid modality)
   - 503 for model not loaded (with Retry-After header)
   - Structured ErrorResponse for all errors
6. Add CORS middleware (configurable origins)
7. Add request logging middleware (timing, status codes)
8. Write integration tests with mocked engine

## Test Requirements
- Test each endpoint with valid and invalid inputs
- Test file size rejection (> 20 MB)
- Test format rejection (unsupported extensions)
- Test modality validation (invalid modality name)
- Test 503 when engine not loaded
- Test disclaimer presence in every AnalyzeResponse
- Test CORS headers present

## Acceptance Criteria
- [ ] All three endpoints match OpenAPI spec from TASK-001
- [ ] Validation rules match SPEC-001 table
- [ ] Error responses follow ErrorResponse schema
- [ ] Disclaimer present in every successful response
- [ ] Model status exposed via health endpoint
- [ ] Integration tests pass with mocked engine

## Definition of Done
API server starts, serves all endpoints per OpenAPI spec, validates input, and passes all integration tests.
