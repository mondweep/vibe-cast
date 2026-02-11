# Research: Convex Architecture Skill + Build with Quality Synergy Analysis

## Date: 2026-02-11
## Status: Complete

---

## 1. Convex Architecture Skill — Deep Dive

### 1.1 Overview
- **Repository:** augmented-os/convex-skills
- **Location:** convex-architecture/
- **ADRs:** 14 accepted decisions (0000-0013)
- **Validators:** TypeScript-based, one per ADR, with frontmatter-driven configuration
- **Templates:** 9 module templates (schema, queries, mutations, tests, etc.)
- **Examples:** 3 exemplar modules (analytics, entities, external-service)

### 1.2 The 14 ADRs — Complete Summary

| # | Title | Core Rule | Key Error Codes |
|---|-------|-----------|-----------------|
| 0000 | General Conventions | Indexed queries, return validators, UTC dates, import hygiene | FILTER_USAGE, MISSING_RETURNS, UTC_DATE_STRINGS, QUERY_IN_ACTIONS |
| 0001 | Module Directory Structure | All modules need schema.ts + CLAUDE.md; functions/ for non-trivial modules | MISSING_SCHEMA, MISSING_CLAUDE_MD |
| 0002 | Functions vs Logic Separation | _logic/ must be pure: no ctx, no db, no _generated imports | CONTEXT_IN_LOGIC, DB_IN_LOGIC |
| 0003 | API Entry Point Pattern | api.ts = 1-5 line thin wrappers; delegates to internal functions | THICK_API, LOGIC_IN_API |
| 0004 | Internal Function Exposure | Internal functions get explicit orgId; public functions use org wrappers | PUBLIC_IN_INTERNAL, MISSING_ORG_ID_ARG |
| 0005 | Test Organization | Co-located __tests__/; unit in _logic/, integration in functions/ | MISSING_TESTS, WRONG_TEST_LOCATION |
| 0006 | Module Documentation | CLAUDE.md with YAML frontmatter for complex/integration modules | MISSING_FRONTMATTER |
| 0007 | Workflow Component Patterns | v.string() for IDs (not v.id()), 50-task parallelism limit, deterministic | VID_IN_WORKFLOW, EXCEEDS_PARALLELISM |
| 0008 | Submodule Depth Limits | Max 3 levels; __tests__/ and fixtures/ excluded from count | EXCEEDS_MAX_DEPTH |
| 0009 | Validator & Type Organization | Validators in schema.ts; types.ts only for external APIs or Node sharing | SEPARATE_VALIDATORS_FILE |
| 0010 | Schema Ownership Pattern | Table owners export *Tables; consumers use @schema-consumer tag | MISSING_TABLES_EXPORT |
| 0011 | Node Runtime Separation | "use node" files isolated; no cross-runtime imports | CROSS_RUNTIME_IMPORT |
| 0012 | Multi-Tenant Conventions | by_org_* indexes only; orgContext pattern; entity ownership verification | ORG_CONTEXT_IGNORED, ENTITY_ORG_NOT_VERIFIED |
| 0013 | System Workflow Centralization | All system workflows in central directory; no business logic in workflow files | WORKFLOW_OUTSIDE_SYSTEM |

### 1.3 Module Tiers

| Tier | Characteristics | Examples | Test Coverage |
|------|----------------|----------|---------------|
| **Tier 1** (Complex) | Has _logic/ + functions/ | analytics, entries | 80% line/stmt/fn, 75% branch |
| **Tier 2** (Integration) | External service wrappers | weather, payments | 60% across all |
| **Tier 3** (Simple) | Flat structure, few files | config, seeds | No mandatory threshold |

### 1.4 Validation Framework

- **Interface:** `ADRValidator` with `validate()` and optional `validateFile()` methods
- **Registry:** Validators registered in `validators/registry.ts`, executed via `pnpm validate-all`
- **Findings:** Each finding has code, message, severity (error/warning/info), file, line, and fix instructions
- **Suppression:** Inline markers like `@filter-ok`, `@returns-complex`, `@global-table`, `@no-org-id`

### 1.5 Key Templates

- `schema.ts.md` — Table definitions with *Tables export pattern
- `queries.ts.md` — Public query functions with org wrappers
- `mutations.ts.md` — Mutations with thin api.ts wrappers
- `unit-test.ts.md` — _logic/ test pattern (no Convex mocking)
- `integration-test.ts.md` — functions/ test pattern (uses convex-test)
- `CLAUDE.md.md` — Module documentation with YAML frontmatter

---

## 2. Build with Quality Skill — Deep Dive

### 2.1 Overview
- **Repository:** mondweep/vibe-cast (branch: claude/claude-code-v3-skill-KucJF)
- **Location:** claude-code-v3-qe-skill/
- **Agents:** 111+ (60 Claude Flow V3 + 51 Agentic QE)
- **Workflow:** 5-phase (Requirements → Development → Quality → Deployment → Learning)
- **Methodologies:** DDD + ADR + TDD integrated

### 2.2 The 5-Phase Workflow

**Phase 1: Requirements & Planning**
- Agents: unified-coordinator, architect, test-strategist, security-architect
- Tasks: DDD analysis, ADR creation, test strategy, threat modeling
- Gate: ADR documented, strategy defined

**Phase 2: Development (TDD)**
- Agents: coder (x2), unit-test-generator, coverage-analyzer
- Cycle: RED → GREEN → REFACTOR → COMMIT
- Parallel: Implementation + test generation run simultaneously
- Gate: Tests pass, coverage meets threshold

**Phase 3: Quality Validation**
- Agents: integration-test-generator, e2e-test-generator, mutation-tester, security-scanner
- Tasks: Generate higher-order tests, security scan, defect prediction
- Gate: 85% coverage, 0 critical vulnerabilities, WCAG AA

**Phase 4: Deployment**
- Agents: deployer, quality-coordinator
- Final validation run before deploy

**Phase 5: Learning & Pattern Storage**
- Agents: sona-optimizer, reasoning-bank-manager, memory-indexer
- Stores successful patterns for cross-project reuse

### 2.3 Queen Coordinator Architecture

The `QueenCoordinator` class implements:
- **Domain-based routing:** Tasks automatically routed to correct agent domain
- **Priority queuing:** critical > high > medium > low
- **Concurrent limits:** Per-domain concurrency caps (development: 4, quality: 4, security: 2)
- **Byzantine consensus:** 2/3 majority voting for quality decisions
- **Task lifecycle:** pending → queued → in-progress → completed/failed
- **100ms processing loop:** Continuous task queue processing

### 2.4 Agent Domains

| Domain | Agents | Max Concurrent |
|--------|--------|----------------|
| Development | architect, coder, reviewer, browser-agent, deployer | 4 |
| Quality | test-strategist, unit-test-gen, integration-test-gen, e2e-test-gen, coverage-analyzer, mutation-tester, defect-predictor, flaky-test-hunter, chaos-engineer, resilience-validator | 4 |
| Security | security-architect, security-implementer, security-tester, sast-scanner, dast-scanner, compliance-auditor | 2 |
| Learning | sona-optimizer, memory-indexer, trajectory-tracker, reasoning-bank-manager, q-learning-optimizer | 2 |
| Coordination | unified-coordinator, event-bridge, mcp-coordinator | 1 |

### 2.5 Quality Gates

| Gate | Checks | Thresholds |
|------|--------|------------|
| Pre-Implementation | ADR, threat model, test strategy | All required |
| Pre-Merge | Coverage, compilation, lint, review | 85% / 95% critical / 100% new |
| Security | SAST, DAST, compliance, secrets | 0 critical/high, 90% compliance |
| Accessibility | WCAG, contrast, keyboard | AA, 85%, 80% |
| Resilience | Network, resource, graceful degradation | 70%, 75%, 80% |

### 2.6 DDD/ADR/TDD Integration

- **DDD:** Strategic design (subdomains, bounded contexts, ubiquitous language) + tactical patterns (aggregates, entities, value objects, domain events)
- **ADR:** Standard template (Status, Context, Decision, Consequences) auto-generated during Phase 1
- **TDD:** Strict red-green-refactor with commit-after-green policy and `should_X_when_Y` naming

---

## 3. Synergy Analysis — Where the Skills Overlap and Complement

### 3.1 ADR Methodology Overlap

| Aspect | Convex Skill | Build with Quality | Synergy |
|--------|-------------|-------------------|---------|
| **ADR Format** | Custom frontmatter YAML + sections | Standard Nygard/MADR | BWQ creates ADRs; Convex validates them |
| **ADR Enforcement** | Automated validators (`pnpm validate-all`) | Quality gates (manual check) | Convex validators serve as BWQ quality gate |
| **ADR Count** | 14 pre-defined, domain-specific | Created per-project | Pre-existing ADRs = instant governance |

**Key Insight:** The Convex Skill provides *pre-built architectural governance* that the Build with Quality workflow can enforce automatically. BWQ creates ADRs; the Convex Skill's validators check them.

### 3.2 Testing Methodology Overlap

| Aspect | Convex Skill | Build with Quality | Synergy |
|--------|-------------|-------------------|---------|
| **Unit tests** | _logic/__tests__/ (ADR 0005) | TDD RED phase | BWQ's unit-test-generator targets _logic/ |
| **Integration tests** | functions/__tests__/ (ADR 0005) | Phase 3 integration gen | BWQ generates convex-test based tests |
| **Coverage targets** | 80% Tier 1, 60% Tier 2 | 85% overall, 95% critical | Use Convex tier-based targets |
| **Test naming** | Not specified | should_X_when_Y | Apply BWQ naming convention |

### 3.3 DDD Alignment

| DDD Concept | Convex Mapping | How It Works |
|-------------|----------------|--------------|
| Bounded Context | Module directory | Each context = one convex module |
| Aggregate | schema.ts table group | Tables with shared by_org indexes |
| Entity | Table row | Convex document with _id |
| Value Object | Nested object in table | Schema validators enforce shape |
| Domain Event | Workflow step | Durable workflow triggers next step |
| Repository | functions/ directory | publicQueries + internalMutations |
| Domain Service | _logic/ functions | Pure functions with no Convex deps |
| Factory | _testing/ mock factories | Test fixture generation |

### 3.4 Quality Gate Alignment

| BWQ Gate | Convex Equivalent | Combined Check |
|----------|-------------------|----------------|
| Pre-Implementation | ADRs 0001, 0006 (structure, docs) | Module scaffolding correct |
| Pre-Merge Coverage | ADR 0005 (test organization) | `pnpm validate-all` + coverage |
| Security | ADR 0012 (multi-tenant) | Org-scoping verification |
| Contracts | ADR 0009, 0010 (schema ownership) | Schema validation |

### 3.5 Gaps and Complementary Areas

**Convex Skill has but BWQ doesn't:**
- Domain-specific validators for Convex patterns
- Suppression marker system
- Module tier classification
- Node runtime separation rules
- Workflow-specific constraints (v.string() for IDs, parallelism limits)

**BWQ has but Convex Skill doesn't:**
- Swarm coordination and parallelism
- TDD red-green-refactor enforcement
- Mutation testing
- Chaos engineering
- Defect prediction
- Learning and pattern persistence
- Model routing (haiku/sonnet/opus)

**Together they provide:**
- Architectural governance (Convex) + Build process governance (BWQ)
- Static analysis (validators) + Dynamic analysis (tests, chaos)
- Structure enforcement + Quality enforcement
- Pre-defined rules + Emergent patterns

---

## 4. Feasibility: Using Swarm Approach for Convex Backend

### 4.1 What Works Well

1. **Module-per-agent parallelism:** Each bounded context can be built by a separate agent simultaneously
2. **_logic/ TDD:** Pure functions in _logic/ are perfectly suited to TDD - no mocking needed
3. **Validator-as-gate:** `pnpm validate-all` is a natural quality gate between BWQ phases
4. **DDD decomposition:** Bounded contexts map cleanly to Convex module boundaries
5. **Org-scoping as security check:** ADR 0012 checks serve as the security gate

### 4.2 What Needs Adaptation

1. **No live Convex runtime in build environment:** Use convex-test library for integration tests; mock for unit tests
2. **BWQ assumes generic project:** Need to configure agents with Convex-specific knowledge (ADR rules, templates)
3. **Claude Flow may not be installed:** Task tool sub-agents work as Tier 1 fallback
4. **Validator CLI tools may need project setup:** Include `npm install` / `pnpm install` in Phase 1
5. **Workflow component (@convex-dev/workflow) dependency:** May need to be mocked if not installable

### 4.3 Recommended Execution Model

```
                    ┌──────────────────────┐
                    │  COORDINATOR AGENT    │
                    │  (unified-coordinator)│
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼──────────┐
    │ AGENT A        │ │ AGENT B      │ │ AGENT C          │
    │ Entries Module │ │ Analytics    │ │ Weather          │
    │ (Tier 1)       │ │ Module       │ │ Integration      │
    │                │ │ (Tier 1)     │ │ (Tier 2)         │
    │ - schema.ts    │ │ - schema.ts  │ │ - schema.ts      │
    │ - _logic/ TDD  │ │ - _logic/ TDD│ │ - nodeActions.ts │
    │ - functions/   │ │ - functions/ │ │ - functions/     │
    │ - __tests__/   │ │ - __tests__/ │ │ - types.ts       │
    └────────┬───────┘ └──────┬───────┘ └──────┬──────────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  QUALITY AGENT       │
                    │  pnpm validate-all   │
                    │  Coverage analysis   │
                    │  Security review     │
                    └──────────────────────┘
```

### 4.4 Risk Mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Convex CLI not available | Medium | Write code files that WOULD pass validators; document expected results |
| Agent context overflow | Medium | Each agent focuses on one module only; coordinator manages state |
| Validator tests need running project | Medium | Set up minimal package.json with convex deps |
| Weather API needs keys | High | Use mock data pattern from the start |

---

## 5. Conclusion

The combination of these two skills creates a uniquely powerful demonstration:

1. **Convex Architecture Skill** provides the "what" — 14 architectural rules with automated enforcement
2. **Build with Quality Skill** provides the "how" — a swarm-based build process with TDD, DDD, and quality gates
3. **Together** they demonstrate AI-driven development that is both architecturally governed and quality-assured

The recommended demo (VibeCast multi-tenant weather-mood journal) exercises all 14 ADRs while providing enough domain complexity for meaningful DDD decomposition, _logic/ separation, workflow patterns, and multi-tenant security — making it the optimal showcase project.
