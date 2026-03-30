---
id: SPRINT-S01-PLAN
title: "Sprint S-01 Plan - Vibe Cast MVP"
spec: SPEC-001
prd: PRD-001
sprint: S-01
status: draft
created: 2026-03-30
---

# Sprint S-01 Plan: Vibe Cast MVP

## Overview

Sprint S-01 delivers the Vibe Cast MVP: Zephyr Drift, a weather-to-mood music AI agent in OpenClawCity. The sprint covers all components from data models through pipeline orchestration and evaluation.

**Total tasks:** 8
**Estimated total tokens:** 176K
**Target completion:** 2 weeks

## Task Summary

| ID | Title | Est. Tokens | Depends On | Parallel | Status |
|----|-------|-------------|------------|----------|--------|
| TASK-001 | Data Models and Weather Provider | 16K | -- | Yes | Draft |
| TASK-002 | Prompt Registry | 16K | -- | Yes | Draft |
| TASK-003 | Mood Engine | 32K | TASK-001, TASK-002 | No | Draft |
| TASK-004 | City Presence Manager | 16K | TASK-001 | Yes | Draft |
| TASK-005 | Composition and Feed | 32K | TASK-002, TASK-003, TASK-004 | No | Draft |
| TASK-006 | Social Engine | 16K | TASK-002, TASK-003 | Yes | Draft |
| TASK-007 | Pipeline Orchestrator | 32K | TASK-003, TASK-004, TASK-005, TASK-006 | No | Draft |
| TASK-008 | Eval Suite | 16K | TASK-003 | Yes | Draft |

## Dependency Graph

```
TASK-001 (Data Models)          TASK-002 (Prompt Registry)
    |         \                     |       \
    |          \                    |        \
    |           \                   |         \
    v            v                  v          v
TASK-004      TASK-003 <-----------+       (shared)
(City          (Mood Engine)                   |
 Presence)        |    \                       |
    |             |     \                      |
    |             |      +---------> TASK-006 (Social Engine)
    |             |                  TASK-008 (Eval Suite)
    |             |
    v             v
    +-------> TASK-005 (Composition & Feed) <-- TASK-002
                  |
                  v
              TASK-007 (Pipeline Orchestrator) <-- TASK-004, TASK-006
```

### ASCII Dependency Graph (Detailed)

```
Week 1                              Week 2
======                              ======

TASK-001 ──┬──────────────────────> TASK-005 ──> TASK-007
           │                           ^            ^
           ├──> TASK-003 ──────────────┤            │
           │       ^                   │            │
           │       │                   │            │
TASK-002 ──┼───────┘                   │            │
           │                           │            │
           ├──> TASK-004 ──────────────┘            │
           │                                        │
           ├──> TASK-006 ──────────────────────────>│
           │
           └──> TASK-008
```

## Schedule

### Week 1: Foundation and Core Components

**Goal:** Establish all interfaces, prompt infrastructure, and core AI capabilities.

| Day | Tasks | Notes |
|-----|-------|-------|
| Day 1-2 | TASK-001 (Data Models & Weather Provider) | Greenfield, no dependencies. Establishes all shared types. |
| Day 1-2 | TASK-002 (Prompt Registry) | Parallel with TASK-001. Establishes prompt loading infrastructure. |
| Day 3-4 | TASK-003 (Mood Engine) | Blocked by TASK-001 and TASK-002. Core AI capability, largest complexity. |
| Day 3-4 | TASK-004 (City Presence Manager) | Parallel with TASK-003. Only depends on TASK-001 (types). |
| Day 5 | TASK-008 (Eval Suite) | Parallel. Can start once TASK-003 structure is known. |

**Week 1 Deliverables:**
- All TypeScript interfaces defined
- Simulated weather provider working
- Prompt registry loading all 4 prompt types
- MoodEngine mapping weather to mood vectors via LLM
- CityPresenceManager wrapping all OpenClawCity APIs
- Eval suite configuration and golden datasets created

### Week 2: Integration and Orchestration

**Goal:** Build composition and feed pipeline, social engine, and orchestrate everything.

| Day | Tasks | Notes |
|-----|-------|-------|
| Day 6-7 | TASK-005 (Composition & Feed) | Blocked by TASK-002, TASK-003, TASK-004. Two components in one session. |
| Day 6-7 | TASK-006 (Social Engine) | Parallel with TASK-005. Depends on TASK-002, TASK-003 only. |
| Day 8-9 | TASK-007 (Pipeline Orchestrator) | Blocked by TASK-003, TASK-004, TASK-005, TASK-006. Final integration. |
| Day 10 | Run eval suite, fix regressions | Use TASK-008 eval suite to validate all components end-to-end. |

**Week 2 Deliverables:**
- CompositionGenerator and FeedComposer working
- SocialEngine with self-evaluation and retry
- Full pipeline orchestration with parallel social branch
- Ambient drift fallback working
- Eval suite passing all thresholds

## Parallel Execution Opportunities

The following task groups can execute in parallel (no dependency conflicts):

| Parallel Group | Tasks | Combined Tokens |
|---------------|-------|-----------------|
| Group A (Week 1, Days 1-2) | TASK-001 + TASK-002 | 32K |
| Group B (Week 1, Days 3-4) | TASK-003 + TASK-004 | 48K |
| Group C (Week 1, Day 5) | TASK-008 | 16K |
| Group D (Week 2, Days 6-7) | TASK-005 + TASK-006 | 48K |
| Group E (Week 2, Days 8-9) | TASK-007 | 32K |

**Critical path:** TASK-001 -> TASK-003 -> TASK-005 -> TASK-007

## Risk Register

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R-01 | MoodEngine eval scores below 85% alignment threshold | Medium | High | ADR-001 provides fallback strategies: adjust few-shot examples (minor version bump to WTM-v1.1), add examples for underperforming conditions. Budget 1 day for prompt tuning. |
| R-02 | OpenClawCity API instability or breaking changes | Medium | High | CityPresenceManager uses abstracted interface; mock all API calls in tests. Can develop pipeline without live API. |
| R-03 | LLM latency exceeds budget (>5s mood, >10s composition) | Low | Medium | ADR-001 eval shows ~3.2s average with comfortable margin. Monitor p95 latency. Fallback: reduce few-shot examples to 3 (minor accuracy trade-off). |
| R-04 | Token budget exceeded (>800 tokens WTM) | Low | Medium | ADR-001 eval shows ~650 average with 150-token headroom. Monitor per-call token counts. Fallback: compress system prompt wording. |
| R-05 | Social response quality below 80% relevance | Medium | Medium | Self-evaluation retry loop (US-U04) provides automatic quality gate. If systemic, iterate SOC-v1.0 prompt with additional personality examples. |
| R-06 | Pipeline end-to-end exceeds 120s | Low | High | ADR-002 analysis shows ~15-28s happy path. Main risk is track composition polling (up to 60s). Mitigation: timeout at 5 min, post narrative-only if track not ready. |
| R-07 | Ambient drift fallback not tested under real conditions | Medium | Low | Simulated fixtures allow controlling weather data gaps. Integration test should simulate 10+ minute gap. |
| R-08 | TASK-003 delays block Week 2 tasks | Medium | High | TASK-003 is on the critical path and has the highest complexity. Mitigation: prioritize TASK-003 on Day 3, allocate full day. If delayed, TASK-006 and TASK-008 can still proceed in parallel. |
| R-09 | Promptfoo eval setup fails or produces inconsistent results | Low | Medium | Validate config early (Day 5). Keep golden datasets simple (JSONL). Use well-documented promptfoo assertion types. |
| R-10 | Prompt injection in adversarial eval cases bypasses safety | Low | High | WTM-v1.0 system prompt includes strict output-only-JSON instruction. Eval suite includes 18 adversarial cases specifically testing this. Zero tolerance (ADR-001 Section 8). |

## Sprint Exit Criteria

All of the following must be satisfied to close Sprint S-01:

- [ ] All 8 tasks completed (status: done)
- [ ] All unit tests pass across all components
- [ ] All integration tests pass for pipeline orchestrator
- [ ] Eval suite runs end-to-end with `npx promptfoo eval`
- [ ] Weather-mood alignment >= 85% on 60-case eval set (PRD-001 Section 5.1)
- [ ] Faithfulness >= 0.90 (PRD-001 Section 5.2)
- [ ] Mood consistency >= 0.80 (PRD-001 Section 5.2)
- [ ] Feed post quality >= 4.0/5.0 (PRD-001 Section 5.1)
- [ ] Social response relevance >= 80% (PRD-001 Section 5.1)
- [ ] Toxicity = 0.00 across all eval outputs (PRD-001 Section 5.2)
- [ ] End-to-end pipeline < 120 seconds (NFR-01 through NFR-03)
- [ ] All prompts registered in PROMPT-REGISTRY.md (PRD-001 Section 5.3)
- [ ] Structured telemetry emitted for all LLM calls (NFR-09)

---

*Traceability: SPRINT-S01-PLAN -> SPEC-001, PRD-001, ADR-001, ADR-002*

*Specifications are the source of truth, not code.* -- BHIL
