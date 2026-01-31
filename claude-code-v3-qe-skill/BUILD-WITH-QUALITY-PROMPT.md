# Build with Quality - Consolidated Skill Prompt

## Overview

This is a **self-contained, copy-paste prompt** that invokes the full Claude Flow V3 + Agentic QE skill for building software with integrated quality engineering. Use this prompt when starting any new project or feature.

## Configuration Reference

This prompt is derived from the skill configuration at:
- **Skill Config:** [`config/skill.yaml`](./config/skill.yaml)
- **Usage Examples:** [`USAGE-EXAMPLES.md`](./USAGE-EXAMPLES.md)

All thresholds, agent definitions, methodology settings, and quality gates are defined in `skill.yaml`. This prompt summarizes them for human-readable activation.

| Prompt Says | skill.yaml Source |
|-------------|-------------------|
| "85% coverage" | `quality_gates.coverage.minimum: 85` |
| "TDD red-green-refactor" | `methodologies.tdd.phases` |
| "111+ agents" | `swarm.domains[*].agents` |
| "SONA balanced mode" | `learning.sona.mode: balanced` |
| "WCAG AA" | `quality_gates.accessibility.level: AA` |

---

## 🚀 THE PROMPT

Copy everything below the line and paste it when starting a new project:

---

```markdown
# Build with Quality - Claude Flow V3 Swarm Architecture

## SKILL ACTIVATION

I am invoking the **Build with Quality** skill (v1.0.0) which combines:
- **Claude Flow V3**: 60+ development agents
- **Agentic QE**: 51 quality engineering agents
- **Shared Coordination**: 3 coordination agents
- **Total**: 111+ specialized agents

## PREREQUISITES

Before proceeding, ensure **BOTH** orchestration tools are initialized:

### 1. Claude Flow V3 (Development & Coordination Agents)
```bash
# Check if installed
npx claude-flow --version

# If not installed, initialize:
npx claude-flow@alpha init

# Or full installation with MCP:
curl -fsSL https://cdn.jsdelivr.net/gh/ruvnet/claude-flow@main/scripts/install.sh | bash -s -- --full
```

### 2. Agentic QE (Quality Engineering Agents)
```bash
# Install globally
npm install -g agentic-qe

# Initialize in your project
aqe init --auto

# Add as MCP server to Claude Code
claude mcp add aqe -- aqe-mcp

# Verify connection
claude mcp list  # Should show 'aqe' server
```

### 3. Verify Both Tools
```bash
npx claude-flow --version   # Should show version
aqe --version               # Should show version
claude mcp list             # Should show 'aqe' in list
```

> ⚠️ **Without both tools**: The skill falls back to single-agent execution with manual quality checks. You lose swarm coordination, AI test generation, mutation testing, defect prediction, and pattern learning.

## PROJECT CONTEXT

**Project Name:** [YOUR_PROJECT_NAME]
**Project Type:** [web-app | api | library | cli | mobile | data-pipeline]
**Tech Stack:** [e.g., React + TypeScript + Node.js]
**Description:** [Brief description of what you're building]

## FEATURE/TASK REQUEST

**Task:** [Describe what you want to build]
**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

---

## SWARM TOPOLOGY

**Architecture:** Hierarchical-mesh
**Max Concurrent Agents:** 100

### Domain Configuration

| Domain | Max Concurrent | Agents |
|--------|---------------|--------|
| **Coordination** | 1 | unified-coordinator, event-bridge, mcp-coordinator |
| **Development** | 4 | architect, coder, reviewer, browser-agent, deployer |
| **Quality** | 4 | test-strategist, unit-test-generator, integration-test-generator, e2e-test-generator, coverage-analyzer, mutation-tester, defect-predictor, flaky-test-hunter, chaos-engineer, resilience-validator |
| **Security** | 2 | security-architect, security-implementer, security-tester, sast-scanner, dast-scanner, compliance-auditor |
| **Learning** | 2 | sona-optimizer, memory-indexer, trajectory-tracker, reasoning-bank-manager, q-learning-optimizer |

---

## EXECUTION WORKFLOW

### Phase 1: Planning & Design
```
Agents: unified-coordinator, architect, security-architect, test-strategist
Tasks:
1. Analyze requirements and decompose into bounded contexts (DDD)
2. Create Architecture Decision Record (ADR)
3. Define test strategy with coverage targets
4. Perform threat modeling
5. Select optimal swarm topology for task complexity
```

### Phase 2: Implementation (TDD Cycle)
```
Agents: coder, unit-test-generator, reviewer, coverage-analyzer
Cycle:
1. RED: Generate failing test first
2. GREEN: Implement minimum code to pass
3. REFACTOR: Clean up while maintaining green
4. COMMIT: After each green phase
Repeat until feature complete
```

### Phase 3: Quality Validation
```
Agents: integration-test-generator, e2e-test-generator, mutation-tester,
        defect-predictor, chaos-engineer, compliance-auditor
Tasks:
1. Generate integration tests
2. Generate e2e tests (Playwright)
3. Run mutation testing
4. Execute defect prediction model
5. Perform chaos testing
6. Audit compliance (WCAG, security)
```

### Phase 4: Learning & Persistence
```
Agents: sona-optimizer, reasoning-bank-manager, memory-indexer
Tasks:
1. Capture successful patterns
2. Store in ReasoningBank with confidence tiers
3. Update Q-learning model for coverage optimization
4. Enable cross-project transfer
```

---

## QUALITY GATES

### Gate 1: Pre-Implementation
| Check | Threshold | Required |
|-------|-----------|----------|
| ADR documented | Yes | ✓ |
| Threat model complete | Yes | ✓ |
| Test strategy defined | Yes | ✓ |

### Gate 2: Pre-Merge
| Check | Threshold | Required |
|-------|-----------|----------|
| Code coverage | ≥85% overall | ✓ |
| Critical path coverage | ≥95% | ✓ |
| New code coverage | 100% | ✓ |
| TypeScript compilation | 0 errors | ✓ |
| Lint | 0 errors | ✓ |
| Code review approved | Yes | ✓ |

### Gate 3: Security
| Check | Threshold | Required |
|-------|-----------|----------|
| SAST scan | 0 critical/high | ✓ |
| DAST scan | 0 critical/high | ✓ |
| Compliance score | ≥90% | ✓ |
| Secrets scan | 0 exposed | ✓ |

### Gate 4: Accessibility
| Check | Threshold | Required |
|-------|-----------|----------|
| WCAG level | AA minimum | ✓ |
| Color contrast | ≥85% | ✓ |
| Keyboard navigation | ≥80% | ✓ |

### Gate 5: Resilience
| Check | Threshold | Required |
|-------|-----------|----------|
| Network resilience | ≥70% | ✓ |
| Resource exhaustion | ≥75% | ✓ |
| Graceful degradation | ≥80% | ✓ |

---

## MODEL ROUTING (TinyDancer)

| Model | Complexity Range | Use Cases |
|-------|-----------------|-----------|
| **Haiku** | 0-20 | Syntax fixes, simple tests, type annotations |
| **Sonnet** | 20-70 | Implementation, test generation, bug fixes, reviews |
| **Opus** | 70-100 | Architecture, security scans, chaos tests, defect prediction |

- Escalation trigger: confidence < 0.6
- Multi-model voting threshold: 0.85

---

## DEVELOPMENT METHODOLOGIES

### Domain-Driven Design (DDD)
```yaml
strategic:
  - Identify subdomains (core, supporting, generic)
  - Define bounded contexts
  - Establish ubiquitous language

tactical:
  - Aggregates (consistency boundaries)
  - Entities (identity-based)
  - Value Objects (immutable)
  - Domain Events (state transitions)
  - Repositories (persistence abstraction)
```

### Architecture Decision Records (ADR)
```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[Why is this decision needed?]

## Decision
[What is the change being proposed?]

## Consequences
[What are the positive and negative effects?]
```

### Test-Driven Development (TDD)
```yaml
cycle:
  red: Write failing test first
  green: Minimum code to pass
  refactor: Clean up, maintain green

naming: "should_[expected]_when_[condition]"
commit_policy: After each green phase
```

---

## CONSENSUS MECHANISMS

| Decision Type | Algorithm | Threshold |
|--------------|-----------|-----------|
| Code review approval | Weighted Voting | >0.7 weighted |
| Quality gate passage | Byzantine Fault Tolerant | 2/3 majority |
| Pattern storage | CRDT | Conflict-free merge |
| Architecture decisions | Raft | Leader-based |

---

## LEARNING CONFIGURATION

### SONA (Self-Optimizing Neural Architecture)
```yaml
mode: balanced
latency_target: 18ms
quality_target: 0.75
memory_budget: 50MB
```

### ReasoningBank Confidence Tiers
| Tier | Confidence | Usage |
|------|------------|-------|
| Platinum | ≥0.95 | Auto-apply patterns |
| Gold | ≥0.85 | Suggest with high priority |
| Silver | ≥0.75 | Suggest as option |
| Bronze | ≥0.70 | Store for learning |

### Q-Learning Coverage
```yaml
state_dimensions: 12
learning_rate: 0.01
discount_factor: 0.99
exploration_rate: 0.1
```

---

## PERFORMANCE TARGETS

| Metric | Target |
|--------|--------|
| Vector search (HNSW) | <3ms |
| Flash Attention speedup | ≥2.49x |
| Token reduction | 75% |
| Coordination latency | <100ms |
| Startup time | <500ms |

---

## DELIVERABLES CHECKLIST

At completion, ensure:

- [ ] All code implemented following TDD
- [ ] ADR documented for significant decisions
- [ ] Unit tests with ≥85% coverage
- [ ] Integration tests for cross-module interactions
- [ ] E2E tests for critical user flows
- [ ] Security scan passed (0 critical/high)
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Chaos testing completed
- [ ] Patterns captured in ReasoningBank
- [ ] Code reviewed and approved
- [ ] All quality gates passed
- [ ] Committed with descriptive messages
- [ ] Pushed to feature branch

---

## INVOCATION

Execute this skill by:

1. Copying this entire prompt
2. Filling in the PROJECT CONTEXT section
3. Filling in the FEATURE/TASK REQUEST section
4. Submitting to Claude Code with claude-flow initialized

The swarm will:
1. Decompose your task across domains
2. Execute in parallel where possible
3. Enforce quality gates at each phase
4. Learn patterns for future acceleration
5. Deliver tested, secure, accessible code
```

---

## 📋 QUICK REFERENCE CARD

### Minimal Invocation (Copy & Customize)

```markdown
# Build with Quality - Quick Start

## Skill: build-with-quality v1.0.0 (111+ agents)

## Project
- **Name:** [PROJECT]
- **Stack:** [TECH_STACK]
- **Task:** [WHAT_TO_BUILD]

## Swarm Config
- Topology: hierarchical-mesh
- Domains: coordination(1), development(4), quality(4), security(2), learning(2)

## Quality Gates
- Coverage: 85% min, 95% critical, 100% new
- Security: 0 critical/high vulnerabilities
- Accessibility: WCAG AA
- Resilience: 70% network, 75% resource, 80% graceful

## Methodology
- DDD: bounded contexts, aggregates, domain events
- ADR: document significant decisions
- TDD: red-green-refactor, commit after green

## Execute
1. Initialize: `npx claude-flow@alpha init`
2. Coordinator decomposes task
3. Parallel execution across domains
4. Quality gates enforced
5. Patterns learned for future

Deliver: tested, secure, accessible code with full documentation.
```

---

## 🔧 CUSTOMIZATION OPTIONS

### For Different Project Types

**Web Application:**
```yaml
emphasis:
  - e2e-test-generator (Playwright)
  - accessibility audits (WCAG)
  - browser-agent (visual validation)
security_focus: XSS, CSRF, injection
```

**API/Backend:**
```yaml
emphasis:
  - integration-test-generator
  - contract-validator
  - chaos-engineer
security_focus: authentication, authorization, rate limiting
```

**Library/Package:**
```yaml
emphasis:
  - unit-test-generator
  - mutation-tester
  - api-documentation
security_focus: dependency vulnerabilities
```

**CLI Tool:**
```yaml
emphasis:
  - integration-test-generator
  - edge-case coverage
  - error handling validation
security_focus: command injection, path traversal
```

### Adjusting Quality Thresholds

For **rapid prototyping** (reduce gates):
```yaml
coverage: 60%
security: critical only
accessibility: skip
chaos: skip
```

For **production critical** (increase gates):
```yaml
coverage: 95% overall, 100% critical
security: 0 any severity
accessibility: WCAG AAA
chaos: 90% all categories
```

---

## ⚠️ DEGRADED MODE (Tools Not Installed)

If the prerequisite tools are not installed, the skill operates in degraded mode:

### Capability Matrix by Installation State

| Capability | Full (Both Tools) | Claude Flow Only | Agentic QE Only | Neither (Single Agent) |
|------------|-------------------|------------------|-----------------|------------------------|
| **Swarm orchestration** | ✓ 100 agents | ✓ 60 agents | ❌ | ❌ |
| **Development agents** | ✓ architect, coder, reviewer | ✓ | ❌ | ❌ Manual |
| **AI test generation** | ✓ All types | ❌ Basic | ✓ | ❌ Manual |
| **Coverage analysis** | ✓ HNSW O(log n) | ❌ | ✓ | ❌ `npm test --coverage` |
| **Mutation testing** | ✓ | ❌ | ✓ | ❌ Not available |
| **Defect prediction** | ✓ F1 > 0.8 | ❌ | ✓ | ❌ Not available |
| **Chaos engineering** | ✓ | ❌ | ✓ | ❌ Not available |
| **Security scanning** | ✓ SAST + DAST | ✓ SAST | ❌ | ❌ Manual |
| **SONA learning** | ✓ Full | ✓ Partial | ✓ Partial | ❌ None |
| **ReasoningBank** | ✓ Full | ✓ Partial | ✓ Partial | ❌ None |
| **Quality gates** | ✓ Automated | ✓ Partial | ✓ Partial | ❌ Manual |

### Fallback Behavior

**Without Claude Flow V3:**
- No swarm coordination (single-threaded execution)
- No architect/coder/reviewer agent separation
- No browser-agent visual validation
- Security scanning limited to manual SAST

**Without Agentic QE:**
- No AI-powered test generation
- No mutation testing (critical for test quality)
- No defect prediction model
- No chaos/resilience testing
- Coverage analysis via basic `npm test -- --coverage`
- No flaky test detection

**Without Both (Current Default):**
- Claude (single agent) follows TDD methodology manually
- Tests written by Claude without specialized generators
- Coverage checked via CLI tools
- No pattern learning or persistence
- Quality gates checked manually via build/test commands
- ~40% slower than full swarm execution

### Recommended Minimum

For meaningful skill benefits, install at least **one** tool:

```bash
# Option A: Development focus (faster coding, parallel work)
npx claude-flow@alpha init

# Option B: Quality focus (better tests, mutation, prediction)
npm install -g agentic-qe && aqe init --auto && claude mcp add aqe -- aqe-mcp

# Option C: Full capability (recommended)
# Install both as per PREREQUISITES section
```

---

## 📚 REFERENCES

- [Claude Flow V3](https://github.com/ruvnet/claude-flow/tree/main/v3) - Multi-agent coordination system (60+ agents)
- [Agentic QE](https://github.com/proffesor-for-testing/agentic-qe) - Quality engineering platform (51 agents)
- [Build with Quality Skill](https://github.com/mondweep/vibe-cast/tree/claude/claude-code-v3-skill-KucJF/claude-code-v3-qe-skill) - Combined skill implementation

---

*Template Version: 1.1.0*
*Last Updated: 2026-01-31*
*Compatible with: claude-flow@alpha, agentic-qe@latest*
