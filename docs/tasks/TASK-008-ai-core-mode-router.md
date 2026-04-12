---
id: TASK-008
spec: SPEC-001
adrs: [ADR-001, ADR-002]
status: draft
depends_on: [TASK-007]
parallel: false
estimated_tokens: ~2500
---

# TASK-008: AI Core Integration and Mode Router (Phase 3)

## Context
Phase 3 of SPEC-001. Integrates Android AI Core for on-device inference using Gemma 4 E2B/E4B, and implements the mode router for server/on-device/hybrid switching.

## Session Start
1. Read SPEC-001 §3 (Mode Router, AI Core Integration)
2. Read ADR-001 for on-device model trade-offs (general Gemma, not MedGemma)
3. Read AI Core Developer Preview documentation

## Scope

### Files to create
- AI Core inference wrapper
- Mode router implementation
- On-device vs server comparison tests

### Files to modify
- Analysis ViewModel (add mode routing)
- Settings screen (add mode-specific options)

### Files excluded
- Server inference engine (TASK-003)
- Evaluation suite (TASK-005)

## Implementation Steps

1. Implement AI Core inference wrapper:
   - Check AI Core availability via ML Kit capability API
   - Configure model: E4B (FULL) for detailed, E2B (EFFICIENT) for fast
   - Construct prompt using same registry prompts adapted for Gemma 4
   - Handle AI Core errors gracefully
2. Implement Mode Router per SPEC-001:
   - `detectAvailableMode()`: check AI Core hardware support
   - `getPreferredMode()`: read user preference from Settings
   - `route()`: dispatch to server or on-device based on mode
   - Hybrid: on-device first → server in background for detail
3. Add mode indicator to analysis screen
4. Add fallback logic: if on-device unavailable → server with notification
5. Compare on-device vs server results for same images

## Acceptance Criteria
- [ ] AI Core inference runs on supported device/emulator
- [ ] Mode router correctly detects AI Core availability
- [ ] Fallback to server works when AI Core unavailable
- [ ] Hybrid mode runs both and displays combined results
- [ ] Mode indicator visible on analysis screen
- [ ] On-device accuracy documented vs server accuracy

## Definition of Done
Mode router works across all three modes, AI Core inference runs on Pixel 10 XL, fallback is seamless.
