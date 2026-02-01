# AQE V3 Agents Index

This directory contains V3 QE agents installed by `aqe init`.

> **Note**: This directory only contains AQE-specific agents (v3-qe-*).
> Claude-flow core agents (adr-architect, memory-specialist, etc.) are part of
> the claude-flow system and are available separately.

## Summary

- **Total Agents**: 51
- **V3 QE Domain Agents**: 44
- **V3 Subagents**: 7

## Usage

Spawn agents using Claude Code's Task tool:

```javascript
Task("Generate tests for UserService", "...", "v3-qe-test-architect")
Task("Analyze coverage gaps", "...", "v3-qe-coverage-specialist")
Task("Run security scan", "...", "v3-qe-security-scanner")
```

## V3 QE Domain Agents (44)

Quality Engineering agents mapped to the 12 DDD bounded contexts.


### General

- **qe-accessibility-auditor**: WCAG accessibility auditing with automated testing, screen reader validation, and remediation guidance
- **qe-bdd-generator**: BDD scenario generation with Gherkin syntax, example discovery, and step definition mapping
- **qe-chaos-engineer**: Chaos engineering specialist for controlled fault injection, resilience testing, and system weakness discovery
- **qe-code-complexity**: Code complexity analysis with cyclomatic/cognitive metrics, hotspot detection, and refactoring recommendations
- **qe-code-intelligence**: Knowledge graph builder with semantic code search, impact analysis, and HNSW-indexed vector retrieval
- **qe-contract-validator**: API contract validation with consumer-driven testing, provider verification, and breaking change detection
- **qe-coverage-specialist**: O(log n) sublinear coverage analysis with risk-weighted gap detection and HNSW vector indexing
- **qe-defect-predictor**: ML-powered defect prediction using historical data, code metrics, and change patterns
- **qe-dependency-mapper**: Dependency graph analysis with coupling metrics, circular detection, and security advisories
- **qe-deployment-advisor**: Deployment readiness assessment with go/no-go decisions, risk aggregation, and rollback planning
- **qe-flaky-hunter**: Flaky test detection and remediation with pattern recognition and auto-stabilization
- **qe-fleet-commander**: Fleet management with agent lifecycle, workload distribution, and cross-domain coordination at scale
- **qe-gap-detector**: Coverage gap detection with risk scoring, semantic analysis, and targeted test recommendations
- **qe-graphql-tester**: GraphQL API testing with schema validation, query/mutation testing, and security analysis
- **qe-impact-analyzer**: Change impact analysis with blast radius calculation, test selection, and risk assessment
- **qe-integration-architect**: V3 deep agentic-flow@alpha integration specialist implementing ADR-001 for eliminating duplicate code and building claude-flow as a specialized extension
- **qe-integration-tester**: Integration test specialist for component interactions, API contracts, and system boundaries
- **qe-kg-builder**: Knowledge graph construction with entity extraction, relationship inference, and HNSW-indexed queries
- **qe-learning-coordinator**: Fleet-wide learning coordination with pattern recognition, knowledge synthesis, and cross-project transfer
- **qe-load-tester**: Load and performance testing with traffic simulation, stress testing, and baseline management
- **qe-metrics-optimizer**: Learning metrics optimization with hyperparameter tuning, A/B testing, and feedback loop implementation
- **qe-mutation-tester**: Mutation testing specialist for test suite effectiveness evaluation with mutation score analysis
- **qe-parallel-executor**: Parallel test execution with intelligent sharding, worker pool management, and result aggregation
- **qe-pattern-learner**: Pattern discovery and learning from QE activities for test generation and defect prediction
- **qe-performance-tester**: Performance testing with load, stress, endurance testing and regression detection
- **qe-product-factors-assessor**: SFDIPOT product factors analysis using James Bach
- **qe-property-tester**: Property-based testing with fast-check for edge case discovery through randomized input generation
- **qe-quality-criteria-recommender**: HTSM v6.3 Quality Criteria analysis for shift-left quality engineering during PI/Sprint Planning
- **qe-quality-gate**: Quality gate enforcement with configurable thresholds, policy validation, and AI-powered deployment decisions
- **qe-queen-coordinator**: V3 QE Queen Coordinator - MCP-powered swarm orchestration with real fleet coordination
- **qe-qx-partner**: Quality Experience partnership bridging QA and UX with user journey analysis and experience impact assessment
- **qe-regression-analyzer**: Regression risk analysis with intelligent test selection, historical analysis, and change impact scoring
- **qe-requirements-validator**: Requirements validation with testability analysis, BDD scenario generation, and acceptance criteria validation
- **qe-responsive-tester**: Responsive design testing across viewports, devices, and breakpoints with layout regression detection
- **qe-retry-handler**: Intelligent test retry with adaptive backoff, circuit breakers, and failure classification
- **qe-risk-assessor**: Quality risk assessment with multi-factor scoring, impact analysis, and mitigation recommendations
- **qe-root-cause-analyzer**: Systematic root cause analysis for test failures and incidents with prevention recommendations
- **qe-security-auditor**: Security audit specialist with OWASP coverage, compliance validation, and remediation workflows
- **qe-security-scanner**: Comprehensive security scanning with SAST, DAST, dependency scanning, and secrets detection
- **qe-tdd-specialist**: TDD Red-Green-Refactor specialist for test-driven development with London and Chicago school support
- **qe-test-architect**: AI-powered test generation with sublinear optimization, multi-framework support, and self-learning capabilities
- **qe-test-idea-rewriter**: Transform passive test descriptions into active, observable test actions by eliminating
- **qe-transfer-specialist**: Knowledge transfer learning with domain adaptation, cross-framework learning, and knowledge distillation
- **qe-visual-tester**: Visual regression testing with AI-powered screenshot comparison and multi-viewport support


## V3 Subagents (7)

Specialized sub-task agents for TDD and code review.

- **qe-code-reviewer**: Code review specialist for quality, maintainability, and standards compliance with actionable feedback
- **qe-integration-reviewer**: Integration review specialist for API compatibility, cross-service interactions, and breaking change detection
- **qe-performance-reviewer**: Performance review specialist for algorithmic complexity, resource usage, and bottleneck detection in code changes
- **qe-security-reviewer**: Security review specialist for vulnerability detection, authentication/authorization review, and secure coding practices
- **qe-tdd-green**: TDD GREEN phase specialist for implementing minimal code to make failing tests pass
- **qe-tdd-red**: TDD RED phase specialist for writing failing tests that define expected behavior before implementation
- **qe-tdd-refactor**: TDD REFACTOR phase specialist for improving code design while maintaining all passing tests

---

*Generated by AQE v3 init on 2026-02-01T18:53:31.211Z*
