# Build with Quality Skill

**[Claude Flow V3](https://github.com/ruvnet/claude-flow/tree/main/v3) + [Agentic QE](https://github.com/proffesor-for-testing/agentic-qe) Combined Skill**

A powerful skill that combines the development capabilities of [Claude Flow V3](https://github.com/ruvnet/claude-flow/tree/main/v3) with the quality engineering excellence of [Agentic QE](https://github.com/proffesor-for-testing/agentic-qe), enabling optimal project building with integrated quality assurance.

## Features

### 111+ Specialized Agents

| Source | Count | Examples |
|--------|-------|----------|
| [Claude Flow V3](https://github.com/ruvnet/claude-flow/tree/main/v3) | 60+ | architect, coder, reviewer, security-architect, deployer |
| [Agentic QE](https://github.com/proffesor-for-testing/agentic-qe) | 51 | test-strategist, coverage-analyzer, defect-predictor, chaos-engineer |
| Shared | 3 | unified-coordinator, event-bridge, unified-memory-coordinator |

### Unified Learning System

- **SONA (Self-Optimizing Neural Architecture)**: 5 modes (real-time, balanced, research, edge, batch)
- **ReasoningBank**: Pattern storage with confidence tiers (Bronze → Platinum)
- **HNSW Indexing**: O(log n) vector search - 150x faster than linear
- **Dream Cycles**: Background pattern consolidation
- **Q-Learning**: Coverage optimization with 12-dimensional state space

### Intelligent Model Routing (TinyDancer)

- **3-tier routing**: Haiku (0-20), Sonnet (20-70), Opus (70-100) complexity
- **Flash Attention**: 2.49x-7.47x speedup
- **75% token reduction** through intelligent routing
- **Multi-model voting** for low-confidence decisions

### Comprehensive Quality Gates

- **Coverage**: 85% minimum, 95% critical paths
- **Security**: SAST/DAST, compliance auditing
- **Accessibility**: WCAG AA/AAA compliance
- **Chaos Testing**: Network, resource, degradation validation
- **Contract Validation**: API schema and backward compatibility
- **Defect Prediction**: ML-powered with F1 > 0.8

### Development Methodologies

#### Domain-Driven Design (DDD)
- **Strategic Design**: Bounded contexts, context mapping, ubiquitous language
- **Tactical Patterns**: Aggregates, entities, value objects, domain events, repositories
- **Guidelines**: Small aggregates, reference by ID, domain events for cross-aggregate communication

#### Architecture Decision Records (ADR)
- **Templates**: Standardized ADR format with context, decision, consequences
- **Categories**: Architecture, technology, patterns, operations decisions
- **Tracking**: Status management (proposed → accepted → deprecated → superseded)

#### Test-Driven Development (TDD)
- **Red-Green-Refactor**: Strict cycle enforcement with TDD-specific agents
- **Test Patterns**: Unit, integration, and contract test templates
- **Best Practices**: Arrange-Act-Assert, descriptive naming, behavior-focused tests

## Installation

```bash
npm install @claude-flow/build-with-quality-skill
```

## Quick Start

```typescript
import { buildWithQuality } from '@claude-flow/build-with-quality-skill';

// Execute a build with quality workflow
const result = await buildWithQuality(
  '/path/to/project',
  'Build a REST API with user authentication'
);

console.log(result.success);
console.log(result.metrics.coverageAchieved);
console.log(result.qualityReport.overallScore);
```

## Advanced Usage

```typescript
import { BuildWithQualitySkill, createBuildWithQualitySkill } from '@claude-flow/build-with-quality-skill';

// Create skill with custom configuration
const skill = createBuildWithQualitySkill({
  topology: 'hierarchical-mesh',
  maxAgents: 50,
  learning: {
    sonaMode: 'research',
    reasoningBankEnabled: true,
    dreamCyclesEnabled: true,
  },
  qualityGates: {
    coverageMinimum: 90,
    accessibilityLevel: 'AAA',
    chaosValidation: true,
  },
});

// Initialize
await skill.initialize();

// Execute workflow
const result = await skill.execute({
  sessionId: 'my-session',
  projectPath: '/path/to/project',
  requirements: 'Build a scalable microservice',
  config: skill.getConfig(),
});

// Access components
const coordinator = skill.getCoordinator();
const memory = skill.getMemory();
const router = skill.getModelRouter();

// Get statistics
const stats = skill.getStats();
console.log(stats.routing.tokensSaved);

// Cleanup
await skill.shutdown();
```

## Workflow Phases

```
┌─────────────────────────────────────────────────────────────┐
│                 BUILD WITH QUALITY WORKFLOW                  │
└─────────────────────────────────────────────────────────────┘

Phase 1: REQUIREMENTS & PLANNING
├── Architect agent analyzes requirements
├── Requirements-validation domain verifies specs
├── Code-intelligence builds knowledge graph
└── SONA retrieves similar project patterns

Phase 2: DEVELOPMENT (Parallel)
├── Coder agent writes implementation
├── Test-generation creates tests IN PARALLEL
├── Security-architect reviews for vulnerabilities
└── Coverage-analysis identifies gaps

Phase 3: QUALITY GATES
├── Quality-assessment evaluates readiness
├── Defect-intelligence predicts bugs
├── Visual-accessibility checks WCAG compliance
└── Chaos-resilience validates fault tolerance

Phase 4: DEPLOYMENT
├── Deployment agent manages CI/CD
├── Contract-testing validates API compatibility
└── Performance agent benchmarks

Phase 5: LEARNING
├── ReasoningBank stores test patterns
├── SONA optimizes future builds
└── Cross-project transfer enables reuse
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BUILD WITH QUALITY SKILL                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              QUEEN COORDINATOR                       │   │
│  │         (Byzantine Fault-Tolerant Consensus)         │   │
│  └───────────────────────────┬─────────────────────────┘   │
│                              │                              │
│     ┌────────────────────────┼────────────────────────┐    │
│     │                        │                        │    │
│     ▼                        ▼                        ▼    │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ │
│  │ CLAUDE FLOW │      │   UNIFIED   │      │ AGENTIC QE  │ │
│  │  V3 SWARM   │◄────►│   MEMORY    │◄────►│   SWARM     │ │
│  │ (60+ agents)│      │ SONA+HNSW   │      │ (51 agents) │ │
│  └─────────────┘      └─────────────┘      └─────────────┘ │
│         │                    │                    │        │
│         └────────────────────┼────────────────────┘        │
│                              │                              │
│  ┌───────────────────────────┴───────────────────────────┐ │
│  │                    EVENT BUS                           │ │
│  │        (Cross-Domain Bridge + Correlation)             │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Performance Targets

| Metric | Target | Achieved |
|--------|--------|----------|
| Vector Search | <3ms | ✓ (150x faster) |
| Flash Attention | 2.49x speedup | ✓ |
| Coordination Latency | <100ms | ✓ |
| Token Reduction | 75% | ✓ |
| Defect Prediction F1 | >0.8 | ✓ |

## Configuration

See [config/skill.yaml](./config/skill.yaml) for full configuration options.

## API Reference

### Core Types

- `SkillContext` - Input context for workflow execution
- `SkillResult` - Output result from workflow execution
- `SwarmConfig` - Swarm configuration options
- `QualityGateConfig` - Quality gate thresholds

### Main Classes

- `BuildWithQualitySkill` - Main skill class
- `QueenCoordinator` - Swarm coordination
- `UnifiedMemory` - SONA + ReasoningBank memory
- `TinyDancerRouter` - Intelligent model routing
- `QualityGate` - Quality validation
- `BuildWithQualityOrchestrator` - Workflow execution

### Factory Functions

- `createBuildWithQualitySkill(config?)` - Create skill instance
- `initializeBuildWithQualitySkill(config?)` - Create and initialize
- `buildWithQuality(path, requirements, config?)` - Quick execution

### Methodology Helpers

- `DDD_GUIDE` - Strategic and tactical DDD guidance
- `ADR_TEMPLATE` - Standard ADR markdown template
- `ADR_CATEGORIES` - Common ADR decision categories
- `TDD_GUIDE` - Red-Green-Refactor cycle guidance
- `TDD_PATTERNS` - Test structure templates
- `METHODOLOGY_WORKFLOW` - Integrated DDD+ADR+TDD workflow
- `createADR(number, title, context, decision, consequences)` - Create ADR
- `createTDDSession(feature, testFile, implFile)` - Start TDD session

## Using Methodologies

### DDD Example

```typescript
import { DDD_GUIDE, analyzeDomainForDDD } from '@claude-flow/build-with-quality-skill';

// Get DDD guidance
console.log(DDD_GUIDE.strategicDesign.steps);
console.log(DDD_GUIDE.tacticalDesign.patterns);

// Analyze domain
const analysis = analyzeDomainForDDD('Build an e-commerce platform');
```

### ADR Example

```typescript
import { createADR, ADR_TEMPLATE } from '@claude-flow/build-with-quality-skill';

const adr = createADR(
  1,
  'Use PostgreSQL for persistence',
  'We need a reliable database for order management',
  'Use PostgreSQL with TypeORM',
  {
    positive: ['ACID compliance', 'Rich querying'],
    negative: ['Operational complexity'],
    risks: ['Schema migrations need care'],
  }
);
```

### TDD Example

```typescript
import { TDD_GUIDE, createTDDSession } from '@claude-flow/build-with-quality-skill';

// Start TDD session
const session = createTDDSession(
  'User authentication',
  'tests/auth.test.ts',
  'src/auth.ts'
);

// Follow the cycle
console.log(TDD_GUIDE.redPhase.steps);   // Write failing test
console.log(TDD_GUIDE.greenPhase.steps); // Make it pass
console.log(TDD_GUIDE.refactorPhase.steps); // Clean up
```

## Integrated Workflow (DDD + ADR + TDD)

```
Phase 1: Discovery & Strategic Design
├── DDD: Identify bounded contexts
├── DDD: Define ubiquitous language
├── ADR: Document architecture decisions
└── ADR: Document context boundaries

Phase 2: Technical Design
├── DDD: Design aggregates per context
├── DDD: Define entities and value objects
├── ADR: Document database strategy
└── ADR: Document technology stack

Phase 3: Implementation (Per Feature)
├── TDD RED: Write failing test
├── TDD GREEN: Minimal implementation
├── TDD REFACTOR: Clean up code
├── DDD: Implement aggregate behaviors
└── ADR: Document significant decisions

Phase 4: Integration
├── DDD: Implement anti-corruption layers
├── DDD: Implement domain event handlers
└── TDD: Write integration tests
```

## License

MIT
