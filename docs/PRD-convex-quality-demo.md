# PRD: VibeCast Convex Backend — Built with Quality Swarm

## Document Info
- **Version:** 1.0.0
- **Date:** 2026-02-11
- **Author:** Claude Code (Research Phase)
- **Status:** Draft — Awaiting Approval Before Build
- **Branch:** `claude/convex-skills-tinkering-ENbCy`

---

## 1. Executive Summary

This PRD defines a demonstration project that showcases the intersection of two Claude Code skills:

1. **Convex Architecture Skill** — 14 ADRs enforcing module structure, separation of concerns, multi-tenancy, workflow patterns, and automated validation
2. **Build with Quality Skill** — 111+ agent swarm with 5-phase workflow (Plan → TDD → Quality → Deploy → Learn), DDD/ADR/TDD methodologies, and quality gates

The demo builds a **multi-tenant weather-mood journaling backend** on Convex, governed by the Convex Architecture ADRs, and constructed using the Build with Quality swarm approach. This maximizes learning value by exercising the most ADRs simultaneously while demonstrating agent-driven development.

---

## 2. Problem Statement

### For the Audience
Developers struggle to understand how:
- Architectural governance (ADRs + validators) can be enforced automatically during AI-driven development
- Agent swarms can coordinate to build compliant, tested, production-grade backends
- DDD, TDD, and ADR methodologies work together in practice — not just in theory

### What This Demo Proves
1. AI agents can build Convex modules that **pass all 14 ADR validators** on first attempt
2. The swarm approach parallelizes planning, coding, testing, and validation
3. The Convex Architecture Skill's ADRs serve as **enforceable quality constraints** within the Build with Quality workflow

---

## 3. The Demo Project: VibeCast Backend

### 3.1 Domain Description
A multi-tenant weather-mood journaling platform where users log daily entries associating their mood with current weather conditions, and the system generates analytics and insights.

### 3.2 Why This Domain?
This domain is specifically chosen to exercise the **maximum number of Convex ADRs**:

| ADR | What It Enforces | How VibeCast Triggers It |
|-----|------------------|--------------------------|
| **0000** General Conventions | Indexed queries, return validators, UTC dates, import hygiene | Weather data uses UTC timestamps; mood queries need indexes |
| **0001** Module Directory Structure | schema.ts, CLAUDE.md, functions/ dirs | Every module must scaffold correctly |
| **0002** Functions vs Logic Separation | Pure _logic/ with no ctx | Mood analytics calculations in _logic/ |
| **0003** API Entry Point Pattern | Thin api.ts wrappers | Public API for frontend consumption |
| **0004** Internal Function Exposure | Internal functions get explicit orgId | All mutations are org-scoped internally |
| **0005** Test Organization | Co-located __tests__/, dual test pattern | Unit tests in _logic/, integration in functions/ |
| **0006** Module Documentation | CLAUDE.md with YAML frontmatter | Required for complex modules |
| **0007** Workflow Component Patterns | v.string() for IDs, 50-task limits, determinism | Daily aggregation workflow |
| **0008** Submodule Depth Limits | Max 3 levels | Prevents over-nesting in analytics |
| **0009** Validator & Type Organization | Validators in schema.ts, types.ts for external | Weather API types in types.ts |
| **0010** Schema Ownership Pattern | *Tables exports, @schema-consumer | Insights module consumes entries tables |
| **0011** Node Runtime Separation | "use node" isolation | Weather API fetch requires Node runtime |
| **0012** Multi-Tenant Conventions | by_org_* indexes, orgContext pattern | All data is organization-scoped |
| **0013** System Workflow Centralization | Workflows in central directory | Daily aggregation workflow centralized |

**Result: All 14 ADRs are exercised.**

### 3.3 Bounded Contexts (DDD)

```
VibeCast Domain
├── Entries Context (Core)
│   ├── Aggregate: MoodEntry
│   │   ├── Entity: MoodEntry { mood, intensity, note, weatherSnapshot }
│   │   └── Value Object: WeatherSnapshot { temp, conditions, humidity }
│   ├── Domain Event: EntryCreated, EntryUpdated
│   └── Repository: EntryRepository (Convex tables)
│
├── Weather Context (Supporting)
│   ├── Entity: WeatherCache { location, data, expiresAt }
│   ├── Service: WeatherFetcher (Node runtime, external API)
│   └── Anti-corruption Layer: WeatherAdapter
│
├── Analytics Context (Core)
│   ├── Aggregate: MoodAnalytics
│   │   ├── Entity: DailySummary { date, avgMood, dominantWeather }
│   │   └── Value Object: MoodTrend { direction, magnitude, period }
│   ├── Pure Logic: TrendCalculator, CorrelationEngine
│   └── Domain Event: AnalyticsComputed
│
└── System Context (Generic)
    └── Workflows: DailyAggregation, WeatherSync
```

### 3.4 Module Structure

```
convex/
├── schema.ts                          # Root schema importing all *Tables
├── _testing/                          # Centralized test utilities
│   ├── mockFactories.ts
│   └── assertionHelpers.ts
│
├── domain/
│   ├── entries/                        # Tier 1: Complex module
│   │   ├── schema.ts                   # entriesTables (moodEntries table)
│   │   ├── CLAUDE.md                   # Module documentation
│   │   ├── api.ts                      # Thin public API wrappers
│   │   ├── functions/
│   │   │   ├── publicQueries.ts        # query() - list entries, get by date
│   │   │   ├── publicMutations.ts      # orgMutation() - create/update entry
│   │   │   ├── internalQueries.ts      # internalQuery() - for workflows
│   │   │   ├── internalMutations.ts    # internalMutation() - batch ops
│   │   │   └── __tests__/
│   │   │       ├── publicQueries.test.ts
│   │   │       └── publicMutations.test.ts
│   │   └── _logic/
│   │       ├── moodValidation.ts       # Pure validation rules
│   │       ├── entryTransforms.ts      # Data transformations
│   │       └── __tests__/
│   │           ├── moodValidation.test.ts
│   │           └── entryTransforms.test.ts
│   │
│   └── analytics/                      # Tier 1: Complex module
│       ├── schema.ts                   # analyticsTables (dailySummaries, trends)
│       ├── CLAUDE.md
│       ├── api.ts
│       ├── functions/
│       │   ├── publicQueries.ts        # query() - get trends, summaries
│       │   ├── internalMutations.ts    # internalMutation() - write summaries
│       │   └── __tests__/
│       │       └── publicQueries.test.ts
│       └── _logic/
│           ├── trendCalculator.ts      # Pure: calculate mood trends
│           ├── correlationEngine.ts    # Pure: weather-mood correlations
│           └── __tests__/
│               ├── trendCalculator.test.ts
│               └── correlationEngine.test.ts
│
├── integrations/
│   └── weather/                        # Tier 2: Integration module
│       ├── schema.ts                   # weatherTables (weatherCache)
│       ├── CLAUDE.md
│       ├── api.ts
│       ├── types.ts                    # External API types (ADR 0009)
│       ├── functions/
│       │   ├── publicQueries.ts        # query() - get cached weather
│       │   ├── internalActions.ts      # internalAction() with "use node"
│       │   └── __tests__/
│       │       └── publicQueries.test.ts
│       ├── nodeActions.ts              # "use node" file (ADR 0011)
│       └── apiNode.ts                  # Node action entry point (ADR 0011)
│
└── system/
    └── workflowOrchestration/          # ADR 0013: Centralized workflows
        └── workflows/
            ├── dailyAggregation.ts     # Workflow: aggregate daily mood data
            └── weatherSync.ts          # Workflow: refresh weather cache
```

---

## 4. Swarm Architecture: Feasibility Assessment

### 4.1 How Build with Quality Maps to This Project

The Build with Quality skill defines a 5-phase workflow. Here is how each phase applies to building the VibeCast Convex backend:

#### Phase 1: Planning & Design
| Swarm Agent | Task | Convex Skill Alignment |
|-------------|------|------------------------|
| **unified-coordinator** | Decompose into bounded contexts | Maps to DDD analysis |
| **system-architect** | Define module structure per ADR 0001 | Validates against all 14 ADRs |
| **test-strategist** | Define dual-test strategy (ADR 0005) | Unit in _logic/, integration in functions/ |
| **security-architect** | Threat model multi-tenant boundaries | ADR 0012 org-scoping as security layer |

**Quality Gate 1:** ADR documented, test strategy defined, DDD contexts mapped

#### Phase 2: Implementation (TDD Cycle)
| Swarm Agent | Task | Convex Skill Alignment |
|-------------|------|------------------------|
| **primary-developer** | Build entries module (TDD) | ADRs 0001-0004 structure compliance |
| **secondary-developer** | Build analytics _logic/ (TDD) | ADR 0002 pure function separation |
| **unit-test-generator** | Generate _logic/ tests | ADR 0005 co-located tests |
| **coverage-analyzer** | Check 80%+ coverage (ADR 0005) | Tier 1 modules need 80% coverage |

**TDD Cycle per module:**
1. RED: Write failing test for _logic/ function
2. GREEN: Implement pure function (no ctx, no db)
3. REFACTOR: Ensure ADR 0002 purity constraints
4. COMMIT after each green

#### Phase 3: Quality Validation
| Swarm Agent | Task | Convex Skill Alignment |
|-------------|------|------------------------|
| **integration-test-generator** | Generate functions/__tests__/ | ADR 0005 integration pattern |
| **e2e-test-generator** | Workflow tests | ADR 0007 workflow validation |
| **security-scanner** | Verify org-scoping | ADR 0012 multi-tenant security |
| **coverage-analyzer** | Run `pnpm validate-all` | All 14 ADR validators |

**Quality Gate 2:** All validators pass, coverage thresholds met, no cross-tenant leaks

#### Phase 4: Deployment
| Agent | Task |
|-------|------|
| **deployer** | `npx convex deploy` |
| **quality-coordinator** | Final `pnpm validate-all --all` |

#### Phase 5: Learning & Pattern Storage
| Agent | Task |
|-------|------|
| **sona-optimizer** | Capture Convex module patterns |
| **reasoning-bank-manager** | Store ADR compliance patterns at Gold tier |
| **memory-indexer** | Index DDD→Convex mappings for reuse |

### 4.2 Feasibility Verdict

**FEASIBLE with adaptations.** Here is the assessment:

| Aspect | Assessment | Notes |
|--------|------------|-------|
| **Swarm topology** | Works well | Hierarchical-mesh maps to Convex module boundaries |
| **Agent mapping** | Natural fit | architect→ADR planning, coder→module building, tester→validator running |
| **Quality gates** | Direct alignment | BWQ gates + Convex validators = comprehensive enforcement |
| **TDD cycle** | Excellent fit | _logic/ pure functions are trivially testable per ADR 0002 |
| **DDD** | Strong fit | Bounded contexts → Convex modules is a clean mapping |
| **ADR methodology** | Synergistic | BWQ creates ADRs; Convex skill *enforces* ADRs with validators |
| **Multi-tenant** | Adds value | Security agents can verify ADR 0012 org-scoping |

### 4.3 Practical Execution Strategy

Given that Claude Flow MCP tools and Agentic QE may not be available in all environments, we use a **pragmatic swarm approach**:

**Tier 1 — Claude Code Task Tool Swarm (Always Available)**
- Use Claude Code's built-in `Task` tool to spawn parallel sub-agents
- Each agent handles one bounded context/module
- Coordinator agent manages sequencing and quality gates

**Tier 2 — Claude Flow CLI (If Available)**
- `npx claude-flow@alpha` commands for richer coordination
- Memory persistence across sessions
- Agent metrics and monitoring

**Tier 3 — Full MCP Swarm (If Available)**
- MCP tools for tightest integration
- Real-time agent-to-agent communication

**Recommendation:** Build for Tier 1 (guaranteed availability) with hooks for Tier 2/3. The Task tool alone can spawn 4+ parallel agents building different modules simultaneously.

---

## 5. Key Learnings This Demo Generates

### For the Audience

1. **ADR-as-Code**: How architecture decisions become executable validators, not just documents
2. **DDD → Module Mapping**: How bounded contexts translate to Convex module directories
3. **Pure Logic Separation**: Why _logic/ directories enable unit testing without mocking Convex
4. **Multi-Tenant by Design**: How org-scoped indexes make cross-tenant queries impossible
5. **Swarm Development**: How parallel agents build compliant modules faster than sequential work
6. **TDD in Practice**: Red-green-refactor with real ADR constraints
7. **Workflow Patterns**: How durable workflows use v.string() IDs and respect parallelism limits
8. **Node Runtime Boundaries**: Why "use node" files must be isolated and how to structure them

### For the Builder (Technical Insights)

1. **Validator-Driven Development**: Write the validator check, then build code that passes
2. **Suppression Markers**: When and how to intentionally deviate from rules
3. **Schema Ownership**: How table exports compose into the root schema
4. **Test Organization**: Dual-test pattern for complex modules vs simple modules
5. **Agent Task Decomposition**: How to break a project into parallelizable agent work units

---

## 6. Acceptance Criteria

### Module Compliance
- [ ] All modules pass `pnpm validate-all --all` with 0 errors
- [ ] Every ADR (0000-0013) is exercised by at least one module
- [ ] CLAUDE.md exists for all complex modules with correct YAML frontmatter

### Code Quality
- [ ] _logic/ files contain zero Convex context imports
- [ ] All public functions use org wrappers (orgQuery, orgMutation, orgAction)
- [ ] All indexes follow by_org_* naming convention
- [ ] UTC date handling throughout (no timezone-sensitive Date calls)

### Testing
- [ ] Unit tests in _logic/__tests__/ for pure functions
- [ ] Integration tests in functions/__tests__/ using convex-test
- [ ] Coverage >= 80% for Tier 1 modules (entries, analytics)
- [ ] Coverage >= 60% for Tier 2 module (weather integration)

### Workflow
- [ ] Workflow definitions use v.string() for document IDs
- [ ] Workflows are centralized in system/workflowOrchestration/
- [ ] Parallelism respects 50-task limit

### Multi-Tenancy
- [ ] All data tables have by_org index
- [ ] All handlers correctly destructure orgContext
- [ ] No direct identity.subject usage (use orgContext.userId)
- [ ] Global tables marked with @global-table

---

## 7. Build Plan (Pending Approval)

### Phase 1: Foundation (Coordinator + Architect agents)
1. Initialize Convex project
2. Create root schema.ts skeleton
3. Scaffold all module directories per ADR 0001
4. Write CLAUDE.md for each module per ADR 0006
5. Create _testing/ utilities

### Phase 2: Domain Modules (Parallel developer agents)
**Agent A: Entries Module**
- TDD _logic/moodValidation.ts
- TDD _logic/entryTransforms.ts
- Build functions/ (publicQueries, publicMutations, internalQueries, internalMutations)
- Wire api.ts

**Agent B: Analytics Module**
- TDD _logic/trendCalculator.ts
- TDD _logic/correlationEngine.ts
- Build functions/ (publicQueries, internalMutations)
- Wire api.ts

**Agent C: Weather Integration Module**
- Build nodeActions.ts with "use node"
- Build types.ts for external API types
- Build functions/ and apiNode.ts
- Wire api.ts

### Phase 3: System Workflows (Developer agent)
- Build dailyAggregation.ts workflow
- Build weatherSync.ts workflow
- Integration tests for workflow execution

### Phase 4: Validation & Quality (Quality agents)
- Run `pnpm validate-all --all`
- Fix any validator findings
- Coverage analysis
- Security review (org-scoping verification)

### Phase 5: Documentation & Learning
- Generate summary of ADR coverage
- Document DDD-to-Convex mapping patterns
- Capture reusable patterns

---

## 8. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Convex dev environment not available | Build blocked | Use convex-test for local validation; mock Convex runtime |
| Claude Flow MCP not installed | Reduced swarm capability | Fall back to Task tool sub-agents (Tier 1) |
| Validator framework not runnable | Can't verify compliance | Manual ADR compliance review; document expected validator output |
| Weather API unavailable | Integration module incomplete | Use mock weather data; focus on architecture over live data |
| Context window limits with many parallel agents | Agent coordination breaks | Limit to 3-4 concurrent agents; use background tasks |

---

## 9. Appendix: ADR-to-Validator Matrix

| ADR # | Title | Key Error Codes | Severity |
|-------|-------|-----------------|----------|
| 0000 | General Conventions | FILTER_USAGE, MISSING_RETURNS, UTC_DATE_STRINGS | Warning/Error |
| 0001 | Module Directory Structure | MISSING_SCHEMA, MISSING_CLAUDE_MD, BAD_FUNCTIONS_DIR | Error |
| 0002 | Functions vs Logic Separation | CONTEXT_IN_LOGIC, DB_IN_LOGIC, GENERATED_IMPORT_IN_LOGIC | Error |
| 0003 | API Entry Point Pattern | THICK_API, MISSING_API, LOGIC_IN_API | Error |
| 0004 | Internal Function Exposure | PUBLIC_IN_INTERNAL, MISSING_ORG_ID_ARG | Error |
| 0005 | Test Organization | MISSING_TESTS, WRONG_TEST_LOCATION, LOW_COVERAGE | Warning |
| 0006 | Module Documentation | MISSING_CLAUDE_MD, MISSING_FRONTMATTER, MISSING_SECTIONS | Warning |
| 0007 | Workflow Patterns | VID_IN_WORKFLOW, NONDETERMINISTIC, EXCEEDS_PARALLELISM | Error |
| 0008 | Submodule Depth | EXCEEDS_MAX_DEPTH | Warning |
| 0009 | Validator & Type Org | SEPARATE_VALIDATORS_FILE, UNNECESSARY_TYPES_FILE | Warning |
| 0010 | Schema Ownership | MISSING_TABLES_EXPORT, MISSING_CONSUMER_TAG | Warning |
| 0011 | Node Runtime Separation | CROSS_RUNTIME_IMPORT, NODE_IN_REEXPORT | Error |
| 0012 | Multi-Tenant | ORG_CONTEXT_IGNORED, ENTITY_ORG_NOT_VERIFIED, MISSING_ORG_INDEX | Error |
| 0013 | Workflow Centralization | WORKFLOW_OUTSIDE_SYSTEM, LOGIC_IN_WORKFLOW | Error |

---

## 10. Appendix: Swarm Agent Mapping

| Build with Quality Agent | VibeCast Role | Primary ADRs |
|--------------------------|---------------|--------------|
| unified-coordinator | Orchestrate module build order | All |
| system-architect | Design module structure, DDD mapping | 0001, 0008, 0013 |
| primary-developer | Build entries + analytics modules | 0001-0004, 0009-0010 |
| secondary-developer | Build weather integration module | 0009, 0011 |
| test-strategist | Define test strategy per module tier | 0005 |
| unit-test-generator | Generate _logic/ unit tests | 0002, 0005 |
| integration-test-generator | Generate functions/ integration tests | 0005, 0007 |
| e2e-test-generator | Workflow end-to-end tests | 0007, 0013 |
| coverage-analyzer | Run validators, check thresholds | All |
| security-scanner | Verify org-scoping, no cross-tenant | 0004, 0012 |
| code-reviewer | Review ADR compliance | All |
| quality-coordinator | Final gate: `pnpm validate-all` | All |

---

*This PRD is ready for review. The build will NOT commence until explicit approval is given.*
