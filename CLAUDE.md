# MedImage — Medical Image Analysis with MedGemma

## Purpose
On-device and server-assisted medical image analysis powered by Google's MedGemma, targeting Pixel 10 XL and beyond.

## Tech Approach
Technology-agnostic at specification stage. Architecture decisions captured in ADRs. Candidate stacks include Python (Transformers), Rust (ONNX Runtime), Kotlin (AI Core), and WASM — to be evaluated against quantified criteria before implementation.

## Docs Structure (BHIL)
```
docs/prd/        # Product Requirements Documents (PRD-NNN)
docs/spec/       # Technical Specifications (SPEC-NNN)
docs/adr/        # Architecture Decision Records (ADR-NNN)
docs/tasks/      # Task breakdowns (TASK-NNN)
docs/prompts/    # Prompt registry and version tracking
```

## BHIL Conventions
- Specifications are the source of truth, not code
- All artifacts get unique traceability IDs (PRD-NNN, SPEC-NNN, ADR-NNN, TASK-NNN)
- Children reference parents (SPEC→PRD, TASK→SPEC)
- Status lifecycle: draft → in-review → approved → complete
- No vague acceptance criteria — everything quantified
- All prompts version-controlled in docs/prompts/
- Eval-driven development: changes validated against quantified metrics

## Existing Prototype
`backend/` contains an early Python/FastAPI prototype. It preceded the BHIL process and should be treated as exploratory code, not production architecture.
