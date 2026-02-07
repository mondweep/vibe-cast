# Forge: Autonomous Quality Engineering Swarm

## Overview

Forge is a self-learning autonomous quality engineering system that unifies three methodologies: **Build** (DDD+ADR+TDD), **Verify** (BDD/Gherkin), and **Heal** (autonomous E2E fix loops). It operates across any architecture — monoliths, microservices, modular monoliths, or mobile+backend combinations.

The system defines "DONE DONE" as: code compiles AND product behaves per specification. Every Gherkin scenario passes. Every quality gate clears. All dependency graphs are satisfied.

## Core Principles

**No Mocking/Stubbing Rule:** ALL tests run against the REAL backend API. The system never uses mocking frameworks. Test data is seeded through actual API calls. This prevents integration bugs from hiding behind false confidence.

**Architecture Adaptability:** Forge auto-discovers project structure on first invocation:
- Backend technology (Rust, Node, Python, Go, Java, .NET)
- Frontend technology (Flutter, React, Vue, Angular, mobile native)
- Test frameworks and project layout
- API protocols (REST, GraphQL, gRPC, WebSocket)

## Phase 0: Backend Setup (Mandatory First Step)

Before any testing, the system:
1. Checks backend health via configured health endpoint
2. Builds and compiles the backend if not running
3. Runs migrations (if applicable)
4. Starts backend in background and waits for healthy status (up to 60 seconds)
5. Verifies API contract against OpenAPI/Swagger spec if available
6. Seeds test data through real API calls using configured endpoints

The backend must be fully operational before testing begins. This is non-negotiable.

## Phase 1: Behavioral Specification & Architecture Records

Gherkin Specifications define product behavior from user perspective. Each test traces to exactly one Gherkin scenario. Tests passing but specs failing = broken product.

Missing Spec Generation: When a bounded context lacks specifications, the Specification Verifier agent automatically reads implementation files, extracts user-visible features, generates Gherkin scenarios covering every cyclomatic path, and maps each scenario to corresponding test function.

## Phase 2: Contract & Dependency Validation

Contract Validation ensures API response schemas match expected DTOs. Shared Types Validation compares DTOs across bounded contexts sharing dependencies. Dependency Graph maps which contexts block which. Cascade Re-Testing: When context X is fixed, all contexts in its "blocks" list are automatically re-tested.

## Phase 3: Swarm Initialization — Eight Specialized Agents

1. **Specification Verifier** (sonnet) — Verifies/generates Gherkin specs and ADRs
2. **Test Runner** (haiku) — Executes E2E tests, predicts-to-fail tests first
3. **Failure Analyzer** (sonnet) — Root cause analysis with pattern matching
4. **Bug Fixer** (opus) — Applies confidence-tiered fixes
5. **Quality Gate Enforcer** (haiku) — Evaluates all 7 gates
6. **Accessibility Auditor** (sonnet) — WCAG AA compliance checking
7. **Auto-Committer** (haiku) — Creates commits when gates pass
8. **Learning Optimizer** (sonnet) — Updates confidence tiers and predictions

## Phase 4: Autonomous Execution Loop

Specify -> Test -> Analyze -> Fix -> Audit -> Gate -> Commit -> Learn -> Repeat

Loop continues until all 7 gates pass or 10 iterations max.

## Quality Gates (7 Required)

| Gate | Check | Threshold | Blocking |
|------|-------|-----------|----------|
| 1. Functional | All tests pass | 100% | YES |
| 2. Behavioral | Gherkin scenarios satisfied | 100% targeted | YES |
| 3. Coverage | Path coverage | >=85% overall, >=95% critical | YES (critical) |
| 4. Security | No secrets, secure storage, SAST | 0 critical/high | YES |
| 5. Accessibility | Labels, target size, contrast | WCAG AA | Warning |
| 6. Resilience | Offline/timeout/error handling | Tested for context | Warning |
| 7. Contract | API response schema match | 0 mismatches | YES |

## Confidence Tiers for Fix Patterns

| Tier | Confidence | Auto-Apply | Behavior |
|------|-----------|------------|----------|
| Platinum | >=0.95 | Yes | Apply immediately |
| Gold | >=0.85 | Yes | Apply, flag in commit |
| Silver | >=0.75 | No | Suggest only |
| Bronze | >=0.70 | No | Learning-only storage |
| Expired | <0.70 | No | Demoted pattern |

## Invocation Modes

```bash
/forge --autonomous --all                    # Full autonomous run
/forge --autonomous --context [name]         # Single context
/forge --verify-only                         # Verification only
/forge --fix-only --context [name]           # Fix failures only
/forge --learn                               # Update confidence tiers
/forge --add-coverage --screens [names]      # Add new coverage
/forge --spec-gen --context [name]           # Generate Gherkin specs
/forge --gates-only [--context name]         # Evaluate gates only
/forge --predict [--context name]            # Defect prediction
/forge --chaos [--context name] / --all      # Resilience testing
```

## Configuration

Optional `forge.config.yaml` and `forge.contexts.yaml` override auto-discovery. See project root for examples.

## Memory Namespaces

| Namespace | Purpose |
|-----------|---------|
| forge-patterns | Fix patterns with confidence |
| forge-results | Test run results, analysis |
| forge-state | Coverage, gate status, last green |
| forge-commits | Commit history for rollback |
| forge-specs | Gherkin specifications |
| forge-contracts | API contract snapshots |
| forge-predictions | Defect prediction data |

## Auto-Commit Message Format

Only commits when ALL 7 gates pass. Only stages fixed files — never git add -A.

## Optional AQE Integration

Forge auto-detects Agentic QE availability. When present, enhanced capabilities include vector-indexed pattern storage, specialized defect prediction, full SAST/DAST, and AG-UI streaming.

---
Created by Ikenna N. Okpala — https://github.com/ikennaokpala/forge
