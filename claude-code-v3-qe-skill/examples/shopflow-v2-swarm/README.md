# ShopFlow V2 - Swarm Edition

E-commerce platform built with **Claude Flow V3 Swarm** using DDD + ADR + TDD methodology.

## 🐝 Built with Swarm

This project was generated using a coordinated swarm of 13 agents:
- **Architect Agent**: System design and DDD bounded contexts
- **Code Intelligence Agents**: Core implementation
- **Test Generation Agent**: TDD test suites
- **Quality Assessment Agent**: Code quality and patterns
- **Security Compliance Agent**: PCI-DSS and security review
- **Coverage Analysis Agent**: Test coverage optimization

## 🏗️ Architecture

### Bounded Contexts (DDD)

```
src/domains/
├── catalog/     # Product management
├── cart/        # Shopping cart
├── orders/      # Order lifecycle
├── inventory/   # Stock management
├── payments/    # Stripe integration
└── users/       # Authentication
```

### Architecture Decision Records

- [ADR-001: Hexagonal Architecture](./docs/adr/ADR-001-hexagonal-architecture.md)
- [ADR-002: Payment Provider Strategy](./docs/adr/ADR-002-payment-provider-strategy.md)
- [ADR-003: Inventory Management](./docs/adr/ADR-003-inventory-management-strategy.md)
- [ADR-004: State Management](./docs/adr/ADR-004-state-management.md)
- [ADR-005: Testing Strategy](./docs/adr/ADR-005-testing-strategy.md)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:push

# Seed the database with sample products
npm run db:seed

# Start development server
npm run dev
```

## 🔧 Configuration & Setup Guide

This section documents the complete setup process to get ShopFlow V2 running with all features.

### Prerequisites

- Node.js 20+
- PostgreSQL (local or cloud)
- Stripe account (test mode)
- Resend account (for emails)

### Step 1: Database Setup

```bash
# Create PostgreSQL database
createdb shopflow

# Update .env.local with your connection string
DATABASE_URL="postgresql://username@localhost:5432/shopflow?schema=public"

# Also create .env file (Prisma CLI reads from this)
echo 'DATABASE_URL="postgresql://username@localhost:5432/shopflow?schema=public"' > .env

# Push schema and seed data
npm run db:generate
npm run db:push
npm run db:seed
```

### Step 2: Stripe Configuration

1. Get API keys from [Stripe Dashboard > Developers > API keys](https://dashboard.stripe.com/test/apikeys)

2. Add to `.env.local`:
```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### Step 3: Stripe Webhook Setup (Local Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Start webhook forwarding (in separate terminal)
stripe listen --forward-to localhost:3002/api/webhooks/stripe
```

Copy the webhook signing secret (`whsec_...`) and add to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Step 4: Email Configuration (Resend)

1. Get API key from [Resend](https://resend.com/api-keys)

2. Add to `.env.local`:
```env
RESEND_API_KEY="re_..."
```

**Note:** Free tier sends emails from `onboarding@resend.dev` and only to your account email. For production, verify a domain at [resend.com/domains](https://resend.com/domains).

### Step 5: Complete Environment File

Your `.env.local` should look like:
```env
# Database
DATABASE_URL="postgresql://username@localhost:5432/shopflow?schema=public"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
RESEND_API_KEY="re_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3002"
NODE_ENV="development"
```

### Step 6: Run the Application

```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Start Stripe webhook forwarding
stripe listen --forward-to localhost:3002/api/webhooks/stripe
```

The app will be available at http://localhost:3002 (or next available port).

---

## 🛒 Features & Usage

### Discount Codes

| Code | Discount | Description |
|------|----------|-------------|
| `FREEORDER` | 100% | Complete order for free |
| `HALF50` | 50% | Half price discount |
| `SAVE20` | 20% | Standard discount |

### Test Payment Flow

1. Go to `/products` and add items to cart
2. Go to `/cart` and apply a discount code
3. For paid orders: Click "Pay $XX.XX" → Complete Stripe Checkout
4. For free orders (100% discount): Enter email → Click "Complete Free Order"
5. Check email for order confirmation

### Test Card Numbers

| Card | Number | Use Case |
|------|--------|----------|
| Visa | `4242 4242 4242 4242` | Successful payment |
| Decline | `4000 0000 0000 0002` | Card declined |

Use any future expiry date and any 3-digit CVC.

---

## 🌐 Netlify Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment instructions.

### Quick Deployment Checklist

1. **Database:** Set up cloud PostgreSQL (Neon, Supabase, or Railway)
2. **Stripe Webhook:** Create endpoint at `https://your-site.netlify.app/api/webhooks/stripe`
3. **Environment Variables:** Add all variables to Netlify Dashboard
4. **Email Domain:** Verify domain in Resend for production emails

### Environment Variables for Netlify

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Cloud PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard webhook |
| `RESEND_API_KEY` | Your Resend API key |
| `NEXT_PUBLIC_APP_URL` | Your Netlify site URL |

---

## 🧪 E2E Testing

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test
npx playwright test tests/e2e/free-order-email.spec.ts --headed
npx playwright test tests/e2e/paid-order-stripe.spec.ts --headed
```

### Test Scenarios

| Test | Description | File |
|------|-------------|------|
| Free Order Flow | 100% discount, email confirmation | `free-order-email.spec.ts` |
| Paid Order Flow | 50% discount, Stripe checkout, webhook | `paid-order-stripe.spec.ts` |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 📊 Test Coverage Targets

- **Unit Tests**: 90% line coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows

## 🔧 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma
- **Payments**: Stripe
- **State**: Zustand
- **Testing**: Vitest + Playwright
- **Styling**: Tailwind CSS

## 📁 Project Structure

```
shopflow-v2-swarm/
├── src/
│   ├── app/           # Next.js App Router
│   │   ├── api/       # API routes
│   │   └── (pages)/   # Page components
│   ├── domains/       # DDD bounded contexts
│   ├── components/    # UI components
│   ├── hooks/         # React hooks
│   ├── lib/           # Utilities
│   └── types/         # TypeScript types
├── tests/
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── e2e/           # E2E tests
├── prisma/            # Database schema
├── docs/
│   └── adr/           # Architecture decisions
└── config/            # Configuration files
```

## 🔐 Security

- PCI-DSS compliant payment handling
- CSRF protection via SameSite cookies
- Input validation with Zod schemas
- Rate limiting on API endpoints

## 📝 License

MIT

---

## 📚 Appendix: Development Journey

This appendix documents the comprehensive development journey of the **Build with Quality** skill, including prompt design, invocation methods, swarm architecture, and all example applications built during testing.

### A.1 Project Timeline

| Date | Milestone | Details |
|------|-----------|---------|
| 2026-01-30 | Skill Conception | Analyzed feasibility of combining Claude Flow V3 + Agentic QE |
| 2026-01-30 | Initial Implementation | Created 23+ files for combined skill infrastructure |
| 2026-01-30 | DDD/ADR/TDD Integration | Enhanced skill with full methodology support |
| 2026-01-30 | SimpleTodo Example | Built beginner TDD example (759 lines) |
| 2026-01-30 | ShopFlow Example | Built advanced e-commerce example (2,541 lines) |
| 2026-01-30 | Swarm Automation | Created shell script for autonomous builds |
| 2026-01-31 | ShopFlow V2 Swarm | Multi-agent swarm built this app (4,220 lines) |
| 2026-01-31 | Documentation | Comprehensive appendix and FAQ added |

---

### A.2 Prompt Architecture

The skill uses a **two-tier prompt system** designed for both human readability and machine parseability:

#### A.2.1 Configuration Layer (skill.yaml)

The `config/skill.yaml` file defines all technical parameters:

```yaml
# Key sections in skill.yaml
name: build-with-quality
version: 1.0.0

capabilities:
  development: [architecture_planning, code_generation, code_review]
  quality_engineering: [ai_test_generation, coverage_analysis_olog_n, defect_prediction]
  learning: [sona_optimization, reasoning_bank_patterns]

swarm:
  topology: hierarchical-mesh
  max_agents: 100
  domains:
    - name: development    # Source: claude-flow-v3
    - name: quality        # Source: agentic-qe
    - name: security       # Source: mixed
    - name: learning       # Source: shared
    - name: coordination   # Source: shared

quality_gates:
  coverage: { minimum: 85, critical_paths: 95, new_code: 100 }
  security: { critical_vulnerabilities: 0, high_vulnerabilities: 0 }
  accessibility: { level: AA }

methodologies:
  ddd: { enabled: true }
  adr: { enabled: true, output_directory: docs/adr }
  tdd: { enabled: true, enforce_cycle: true }
```

#### A.2.2 Activation Layer (BUILD-WITH-QUALITY-PROMPT.md)

The prompt translates YAML into human-actionable instructions with cross-references:

| Prompt Says | skill.yaml Source |
|-------------|-------------------|
| "85% coverage" | `quality_gates.coverage.minimum: 85` |
| "TDD red-green-refactor" | `methodologies.tdd.phases` |
| "111+ agents" | `swarm.domains[*].agents` |
| "SONA balanced mode" | `learning.sona.mode: balanced` |
| "WCAG AA" | `quality_gates.accessibility.level: AA` |

#### A.2.3 Prompt Invocation Flow

```
┌────────────────────────────────────────────────────────────────┐
│  User copies prompt from BUILD-WITH-QUALITY-PROMPT.md          │
│                          ↓                                      │
│  Fills in PROJECT CONTEXT section                              │
│  - Name, Type, Stack, Description                              │
│                          ↓                                      │
│  Fills in FEATURE/TASK REQUEST section                         │
│  - Task description, Acceptance criteria                       │
│                          ↓                                      │
│  Pastes into Claude Code                                       │
│                          ↓                                      │
│  Claude Code parses sections:                                  │
│  - SKILL ACTIVATION → Initialize swarm                         │
│  - PROJECT CONTEXT → Set project parameters                    │
│  - SWARM TOPOLOGY → Configure agent domains                    │
│  - EXECUTION WORKFLOW → Phase-based execution                  │
│  - QUALITY GATES → Enforce thresholds                          │
│                          ↓                                      │
│  Execution proceeds through 4 phases                           │
└────────────────────────────────────────────────────────────────┘
```

---

### A.3 Skill Invocation Methods

#### A.3.1 Method 1: Copy-Paste Prompt (Single Agent)

The simplest method for most use cases:

```bash
# 1. Open Claude Code
claude

# 2. Copy the full prompt from BUILD-WITH-QUALITY-PROMPT.md
# 3. Fill in PROJECT CONTEXT and FEATURE/TASK REQUEST
# 4. Paste and execute
```

**Result:** Claude Code executes as a single agent following the methodology.

#### A.3.2 Method 2: Claude Code with MCP Servers

Enhanced capabilities with installed tools:

```bash
# Install prerequisites
npx claude-flow@alpha init
npm install -g agentic-qe && aqe init --auto
claude mcp add aqe -- aqe-mcp

# Run with MCP servers
claude --mcp-server aqe

# Then paste the prompt
```

**Result:** Access to 111+ specialized agents via MCP tools.

#### A.3.3 Method 3: Swarm Automation Script

Fully automated swarm setup:

```bash
# Navigate to skill directory
cd claude-code-v3-qe-skill/scripts

# Run automation script
./run-swarm-build.sh shopflow-v2-swarm ecommerce

# Follow the generated instructions
cd ../examples/shopflow-v2-swarm
./run-swarm.sh
```

**Result:** Creates project directory with prompt, initializes tools, ready to execute.

#### A.3.4 Method 4: Session Teleport + Local Swarm

For long-running autonomous builds:

```bash
# In Claude.ai web session, use teleport command
/teleport

# On local machine, accept teleport
# Then enable autonomous mode
claude -c --dangerously-skip-permissions

# Paste swarm prompt and let it run overnight
```

**Result:** Autonomous multi-agent execution that can run for hours.

---

### A.4 Swarm Architecture

#### A.4.1 Topology: Hierarchical-Mesh

```
                    ┌──────────────────────┐
                    │ unified-coordinator  │
                    │   (Queen Agent)      │
                    └──────────┬───────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │ Development│        │ Quality │          │Security │
    │  Domain    │◄──────►│ Domain  │◄────────►│ Domain  │
    └────┬───────┘        └────┬────┘          └────┬────┘
         │                     │                     │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │architect│          │test-gen │          │sast-scan│
    │coder    │          │coverage │          │dast-scan│
    │reviewer │          │mutation │          │audit    │
    │browser  │          │chaos    │          └─────────┘
    │deployer │          └─────────┘
    └─────────┘

         ◄────────────── Mesh Communication ──────────────►
```

#### A.4.2 Agent Breakdown by Source

| Source | Agent Count | Purpose |
|--------|-------------|---------|
| Claude Flow V3 | 60+ | Development, architecture, security implementation |
| Agentic QE | 51 | Testing, coverage, mutation, defect prediction |
| Shared | 3 | Coordination, SONA learning, memory |
| **Total** | **111+** | Combined capability |

#### A.4.3 Domain Concurrency Configuration

```yaml
domains:
  - name: coordination    # 1 concurrent (single coordinator)
    agents: [unified-coordinator, event-bridge, mcp-coordinator]

  - name: development     # 4 concurrent (parallel coding)
    agents: [architect, coder, reviewer, browser-agent, deployer]

  - name: quality         # 4 concurrent (parallel testing)
    agents: [test-strategist, unit-test-generator, integration-test-generator,
             e2e-test-generator, coverage-analyzer, mutation-tester,
             defect-predictor, flaky-test-hunter, chaos-engineer]

  - name: security        # 2 concurrent (security scanning)
    agents: [security-architect, security-tester, sast-scanner, dast-scanner]

  - name: learning        # 2 concurrent (pattern learning)
    agents: [sona-optimizer, memory-indexer, reasoning-bank-manager]
```

---

### A.5 Example Applications Built

#### A.5.1 SimpleTodo (Beginner Example)

**Purpose:** Demonstrate TDD basics with simple CRUD application

| Metric | Value |
|--------|-------|
| Lines of Code | 759 |
| Files | 19 |
| Complexity | Beginner |
| Build Method | Single Agent |

**Features Built:**
- Add, complete, delete todos
- Filter by All/Active/Completed
- localStorage persistence
- WCAG A accessibility

**ADRs Created:**
- ADR-001: State Management (useReducer vs useState)

**Directory Structure:**
```
simple-todo/
├── docs/adr/ADR-001-state-management.md
├── src/
│   ├── components/
│   │   ├── TodoItem.tsx
│   │   ├── TodoInput.tsx
│   │   ├── TodoFilter.tsx
│   │   └── TodoList.tsx
│   ├── hooks/useTodos.ts
│   └── types/todo.ts
└── tests/
    ├── todoReducer.test.ts
    └── components.test.tsx
```

---

#### A.5.2 ShopFlow (Advanced Example - Single Agent)

**Purpose:** Full e-commerce with DDD, ADRs, and TDD

| Metric | Value |
|--------|-------|
| Lines of Code | 2,541 |
| Files | 28 |
| Complexity | Advanced |
| Build Method | Single Agent |

**Features Built:**
- Product catalog with search/filters
- Shopping cart (Redis-persisted)
- Stripe checkout integration
- Order management
- Inventory reservation system

**ADRs Created:**
- ADR-001: Payment Provider (Stripe)
- ADR-002: Rendering Strategy (RSC + ISR)
- ADR-003: Cart Persistence (Redis)
- ADR-004: Inventory Strategy (Reservation-based)

**DDD Bounded Contexts:**
```
├── Catalog (Products, Categories)
├── Cart (CartItems, CartTotals)
├── Orders (Order, OrderItem, Status)
├── Inventory (Reservations)
├── Payments (Stripe integration)
└── Users (Authentication)
```

---

#### A.5.3 ShopFlow V2 Swarm (Advanced Example - Multi-Agent)

**Purpose:** Same app rebuilt by coordinated agent swarm

| Metric | Value |
|--------|-------|
| Lines of Code | 4,220 |
| Files | 40 |
| Complexity | Advanced |
| Build Method | 13-Agent Swarm |

**Agents Used:**
- Architect Agent (System design)
- Code Intelligence Agents (Implementation)
- Test Generation Agent (TDD suites)
- Quality Assessment Agent (Code patterns)
- Security Compliance Agent (PCI-DSS)
- Coverage Analysis Agent (Optimization)

**ADRs Created:**
- ADR-001: Hexagonal Architecture
- ADR-002: Payment Provider Strategy (Stripe)
- ADR-003: Inventory Management Strategy
- ADR-004: State Management (Zustand)
- ADR-005: Testing Strategy (Vitest)

**Domain Services (6):**
```typescript
src/domains/
├── catalog/service.ts    // Product CRUD, search, filters
├── cart/service.ts       // Cart operations, item management
├── inventory/service.ts  // Stock tracking, reservations
├── orders/service.ts     // Order lifecycle, status management
├── payments/service.ts   // Stripe integration, webhooks
└── users/service.ts      // Authentication, sessions
```

**Key Differences from Single-Agent Build:**
- More comprehensive type definitions (10,585 chars in types/index.ts)
- Additional utility functions (cn, formatPrice, etc.)
- Zustand store for client-side cart state
- More granular service layer separation
- Additional tests (cart, inventory, utils)

---

### A.6 Comparison: Single Agent vs Swarm

| Aspect | Single Agent | Multi-Agent Swarm |
|--------|--------------|-------------------|
| **Build Time** | ~30 minutes | ~45 minutes (with coordination overhead) |
| **Code Volume** | 2,541 lines | 4,220 lines (+66%) |
| **Test Coverage** | Basic tests | Comprehensive tests |
| **ADR Count** | 4 | 5 |
| **Type Definitions** | Inline | Centralized (10K+ chars) |
| **Service Granularity** | Medium | High |
| **Parallel Execution** | No | Yes (4 concurrent) |
| **Specialized Agents** | Generic | Domain-specific |

---

### A.7 Files Created During Development

#### A.7.1 Core Skill Files

| File | Purpose | Lines |
|------|---------|-------|
| `config/skill.yaml` | Full skill configuration | 311 |
| `BUILD-WITH-QUALITY-PROMPT.md` | Copy-paste activation prompt | 531 |
| `USAGE-EXAMPLES.md` | 5 example project templates | 464 |
| `scripts/run-swarm-build.sh` | Swarm automation script | 388 |

#### A.7.2 Example Application Files

| Example | Files | Lines | ADRs |
|---------|-------|-------|------|
| simple-todo | 19 | 759 | 1 |
| shopflow | 28 | 2,541 | 4 |
| shopflow-v2-swarm | 40 | 4,220 | 5 |
| **Total** | **87** | **7,520** | **10** |

---

### A.8 Quality Gates Applied

All example applications were built following the skill's quality gates:

| Gate | SimpleTodo | ShopFlow | ShopFlow V2 |
|------|------------|----------|-------------|
| Coverage Target | 70% | 90% | 90% |
| Security Level | Basic XSS | OWASP Top 10 | PCI-DSS |
| Accessibility | WCAG A | WCAG AA | WCAG AA |
| TDD Enforced | Yes | Yes | Yes |
| ADRs Required | Yes | Yes | Yes |

---

## ❓ Frequently Asked Questions (FAQ)

### General Questions

**Q: What is the "Build with Quality" skill?**

A: It's a combined skill that merges Claude Flow V3 (60+ development agents) with Agentic QE (51 quality engineering agents) to provide 111+ specialized agents for software development with integrated quality engineering, following DDD, ADR, and TDD methodologies.

---

**Q: Do I need to install claude-flow and agentic-qe to use this skill?**

A: No. The skill works in three modes:
1. **Full Mode** (both installed): Access to all 111+ agents, parallel execution, AI test generation
2. **Partial Mode** (one installed): 60 or 51 agents depending on which tool
3. **Single Agent Mode** (neither installed): Claude follows the methodology manually

---

**Q: What's the difference between the prompt and skill.yaml?**

A:
- `skill.yaml` is the **machine-readable configuration** with all thresholds, agent definitions, and technical parameters
- `BUILD-WITH-QUALITY-PROMPT.md` is the **human-readable activation prompt** that summarizes the configuration for copy-paste use

---

### Methodology Questions

**Q: What is DDD and why is it used?**

A: Domain-Driven Design (DDD) organizes code around business domains rather than technical layers. The skill uses:
- **Strategic Design:** Bounded contexts, ubiquitous language
- **Tactical Patterns:** Aggregates, entities, value objects, domain events

Benefits: Better code organization, clearer business logic, easier maintenance.

---

**Q: What are ADRs?**

A: Architecture Decision Records document significant technical decisions. Each ADR includes:
- **Context:** Why the decision was needed
- **Decision:** What was chosen
- **Consequences:** Positive and negative effects

Examples from this project: Payment provider selection, rendering strategy, state management.

---

**Q: How does TDD work in this skill?**

A: The skill enforces a strict TDD cycle:
1. **RED:** Write a failing test first
2. **GREEN:** Write minimum code to pass
3. **REFACTOR:** Improve while keeping tests green
4. **COMMIT:** After each green phase

The skill uses naming convention: `should_[expected]_when_[condition]`

---

### Swarm Questions

**Q: What is a "swarm" in this context?**

A: A swarm is a coordinated group of specialized agents working in parallel. The hierarchical-mesh topology means:
- **Hierarchical:** A Queen Coordinator manages all agents
- **Mesh:** Agents within domains can communicate directly

---

**Q: How many agents can run concurrently?**

A: By default:
- Coordination: 1 (single coordinator)
- Development: 4 concurrent
- Quality: 4 concurrent
- Security: 2 concurrent
- Learning: 2 concurrent

Maximum total: 100 agents (configurable in skill.yaml)

---

**Q: Can I run the swarm overnight autonomously?**

A: Yes. Use the teleport + autonomous mode approach:
```bash
# Enable autonomous mode (use with caution)
claude -c --dangerously-skip-permissions

# Paste your swarm prompt and let it run
```

The swarm will build, test, and commit changes autonomously.

---

### Technical Questions

**Q: What is SONA?**

A: Self-Optimizing Neural Architecture - a learning system that:
- Adapts model routing based on task complexity
- Optimizes latency vs quality tradeoffs
- Maintains memory budget constraints

Configured as `balanced` mode with 18ms latency target.

---

**Q: What is the ReasoningBank?**

A: A pattern storage system with confidence tiers:
- **Platinum (≥0.95):** Auto-apply patterns
- **Gold (≥0.85):** High priority suggestions
- **Silver (≥0.75):** Optional suggestions
- **Bronze (≥0.70):** Store for learning

Patterns are persisted across sessions and projects.

---

**Q: What is TinyDancer model routing?**

A: A 3-tier model selection system:
- **Haiku (0-20 complexity):** Syntax fixes, simple tests
- **Sonnet (20-70 complexity):** Implementation, reviews
- **Opus (70-100 complexity):** Architecture, security scans

Reduces token usage by 75% by using appropriate models.

---

### Troubleshooting

**Q: The swarm isn't starting. What's wrong?**

A: Check these prerequisites:
1. `npx claude-flow --version` - Should show version
2. `aqe --version` - Should show version (if using Agentic QE)
3. `claude mcp list` - Should show 'aqe' if MCP is configured

If tools aren't installed, the skill falls back to single-agent mode.

---

**Q: My coverage is below the 85% threshold. Will the build fail?**

A: The quality gates are enforced but configurable. For prototyping, use:
```markdown
## Quality Gates (Relaxed)
- Coverage: 60%
- Security: Critical only
- Accessibility: Skip
```

---

**Q: How do I customize the swarm topology?**

A: Edit `config/skill.yaml`:
```yaml
swarm:
  topology: mesh           # or: hierarchical, ring, star
  max_agents: 50           # reduce for simpler tasks
  domains:
    - name: development
      max_concurrent: 2    # reduce parallelism
```

---

### Contributing

**Q: How can I contribute to this skill?**

A: The skill is open source. Contributions welcome:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

Areas for contribution: New example templates, additional agents, improved prompts.

---

**Q: Where can I report issues?**

A:
- GitHub Issues: [vibe-cast repository](https://github.com/mondweep/vibe-cast/issues)
- For Claude Flow V3: [claude-flow repository](https://github.com/ruvnet/claude-flow/issues)
- For Agentic QE: [agentic-qe repository](https://github.com/proffesor-for-testing/agentic-qe/issues)

---

## 📚 References

- [Claude Flow V3](https://github.com/ruvnet/claude-flow/tree/main/v3) - Multi-agent coordination system
- [Agentic QE](https://github.com/proffesor-for-testing/agentic-qe) - Quality engineering platform
- [Build with Quality Skill](https://github.com/mondweep/vibe-cast/tree/claude/claude-code-v3-skill-KucJF/claude-code-v3-qe-skill) - Combined skill implementation

---

Built with ❤️ using Claude Flow V3 + Agentic QE
