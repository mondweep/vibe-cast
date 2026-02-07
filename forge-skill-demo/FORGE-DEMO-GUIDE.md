# Forge Skill — Comprehensive Demo Guide

**End-to-end examples for learning every invocation mode of the Forge autonomous quality engineering swarm.**

---

## Credits

**Forge Skill Creator:** [Ikenna N. Okpala](https://github.com/ikennaokpala/forge)
Ikenna is the architect behind Forge — an autonomous quality engineering system that treats quality as "forged into software continuously, not bolted on at the end." The skill implements an eight-agent swarm with confidence-tiered learning, seven quality gates, and self-healing fix loops. Released under the MIT license.

**Demo Curated By:** [Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty/)
Mondweep designed and assembled this comprehensive demonstration, translating Forge's capabilities into concrete, reproducible examples across an e-commerce microservices platform. This guide is intended to help engineers embed Forge into their workflows and understand every invocation flavour through practical, hands-on scenarios.

---

## Table of Contents

1. [What Is Forge?](#1-what-is-forge)
2. [Installation & Setup](#2-installation--setup)
3. [Project Structure for This Demo](#3-project-structure-for-this-demo)
4. [Example 1: Full Autonomous Run (`--autonomous --all`)](#4-example-1-full-autonomous-run)
5. [Example 2: Single Context Run (`--autonomous --context`)](#5-example-2-single-context-run)
6. [Example 3: Specification Generation (`--spec-gen`)](#6-example-3-specification-generation)
7. [Example 4: Verification Only (`--verify-only`)](#7-example-4-verification-only)
8. [Example 5: Fix Only (`--fix-only`)](#8-example-5-fix-only)
9. [Example 6: Quality Gates Only (`--gates-only`)](#9-example-6-quality-gates-only)
10. [Example 7: Defect Prediction (`--predict`)](#10-example-7-defect-prediction)
11. [Example 8: Chaos / Resilience Testing (`--chaos`)](#11-example-8-chaos--resilience-testing)
12. [Example 9: Learning Optimizer (`--learn`)](#12-example-9-learning-optimizer)
13. [Example 10: Add Coverage for New Screens (`--add-coverage`)](#13-example-10-add-coverage-for-new-screens)
14. [Configuration Deep Dive](#14-configuration-deep-dive)
15. [Understanding the Eight Agents](#15-understanding-the-eight-agents)
16. [Quality Gates Explained](#16-quality-gates-explained)
17. [Confidence Tiers & Self-Learning](#17-confidence-tiers--self-learning)
18. [Dependency Graphs & Cascade Testing](#18-dependency-graphs--cascade-testing)
19. [Combining Modes: Real-World Workflows](#19-combining-modes-real-world-workflows)
20. [Troubleshooting & FAQ](#20-troubleshooting--faq)

---

## 1. What Is Forge?

Forge is a Claude Code skill that spawns **eight specialized AI agents** working in parallel to autonomously:
- Generate behavioral specifications (Gherkin/BDD)
- Run end-to-end tests against **real backends** (no mocking)
- Analyze failures with root-cause intelligence
- Apply confidence-tiered fixes
- Audit accessibility (WCAG AA)
- Enforce seven quality gates
- Commit only when all gates pass
- Learn from outcomes to improve future runs

The autonomous loop:
```
Specify -> Test -> Analyze -> Fix -> Audit -> Gate -> Commit -> Learn -> Repeat
```

It cycles until all seven gates pass or a maximum of 10 iterations is reached.

**"DONE DONE" philosophy:** Code compiles AND product behaves as specified. Every Gherkin scenario passes. Every quality gate clears. All dependency graphs are satisfied.

---

## 2. Installation & Setup

### Step 1: Get the Forge Skill

```bash
# Clone the Forge skill repository
git clone https://github.com/ikennaokpala/forge.git

# Copy SKILL.md to your Claude Code skills directory
mkdir -p ~/.claude/skills
cp forge/SKILL.md ~/.claude/skills/forge.md
```

### Step 2: Verify Installation

Open Claude Code in any project directory and type:
```bash
/forge --verify-only
```

If Forge is installed correctly, it will begin by auto-discovering your project structure.

### Step 3: (Optional) Add Configuration Files

For fine-grained control, create `forge.config.yaml` and `forge.contexts.yaml` in your project root. See [Configuration Deep Dive](#14-configuration-deep-dive) for full reference. Without these, Forge auto-discovers everything.

---

## 3. Project Structure for This Demo

This demo uses a sample e-commerce platform with four microservices:

```
forge-skill-demo/
|-- forge.config.yaml             # Forge configuration
|-- forge.contexts.yaml           # Bounded contexts & dependencies
|-- .claude/skills/forge.md       # The Forge skill file
|-- sample-ecommerce/
|   |-- package.json
|   |-- backend/src/
|   |   |-- identity/             # Auth, profiles, passwords
|   |   |-- catalog/              # Products, search, categories
|   |   |-- payments/             # Cards, wallet, transactions
|   |   |-- orders/               # Cart, checkout, tracking
|   |-- frontend/
|       |-- src/                  # React application
|       |-- cypress/e2e/
|           |-- identity.cy.ts    # Identity E2E tests
|           |-- payments.cy.ts    # Payments E2E tests
|           |-- orders.cy.ts      # Orders E2E tests (placeholder)
|           |-- catalog.cy.ts     # Catalog E2E tests (placeholder)
|           |-- specs/
|               |-- identity.feature    # Gherkin specs
|               |-- payments.feature    # Gherkin specs
|               |-- orders.feature      # Gherkin specs
|               |-- catalog.feature     # Gherkin specs
|-- examples/                     # Additional configuration examples
```

The dependency graph:
```
identity (cascade priority 1)
  |-- blocks -> catalog, payments, orders
catalog (cascade priority 2)
  |-- depends_on -> identity
  |-- blocks -> orders
payments (cascade priority 3)
  |-- depends_on -> identity
  |-- blocks -> orders
orders (cascade priority 4)
  |-- depends_on -> identity, catalog, payments
  |-- blocks -> (none, terminal)
```

---

## 4. Example 1: Full Autonomous Run

**The most comprehensive mode.** Runs all contexts, all phases, all agents.

### Invocation
```bash
/forge --autonomous --all
```

### What Happens (Phase by Phase)

**Phase 0 — Backend Setup:**
```
[forge] Checking identity-service health at localhost:8081/health...
[forge] identity-service: HEALTHY
[forge] Checking catalog-service health at localhost:8082/api/health...
[forge] catalog-service: HEALTHY
[forge] Checking payments-service health at localhost:8083/health...
[forge] payments-service: HEALTHY
[forge] Checking orders-service health at localhost:8084/health...
[forge] orders-service: HEALTHY
[forge] Seeding test data via API (order: identity -> catalog -> payments -> orders)...
[forge] All 4 services healthy. Test data seeded. Proceeding to Phase 1.
```

**Phase 1 — Behavioral Specification:**
```
[spec-verifier] Loading Gherkin specs for 4 contexts...
[spec-verifier] identity.feature: 10 scenarios loaded
[spec-verifier] payments.feature: 13 scenarios loaded
[spec-verifier] orders.feature: 12 scenarios loaded
[spec-verifier] catalog.feature: 11 scenarios loaded
[spec-verifier] All specs validated against test files. Coverage: 46/46 scenarios mapped.
```

**Phase 2 — Contract & Dependency Validation:**
```
[contract-validator] Validating API contracts across 4 services...
[contract-validator] identity <-> payments shared types: CONSISTENT
[contract-validator] catalog <-> orders shared types: CONSISTENT
[contract-validator] Dependency graph validated: identity -> catalog -> payments -> orders
```

**Phase 3 — Swarm Initialization:**
```
[forge] Initializing 8 agents in parallel...
[forge] specification-verifier (sonnet): READY
[forge] test-runner (haiku): READY
[forge] failure-analyzer (sonnet): READY
[forge] bug-fixer (opus): READY
[forge] quality-gate-enforcer (haiku): READY
[forge] accessibility-auditor (sonnet): READY
[forge] auto-committer (haiku): READY
[forge] learning-optimizer (sonnet): READY
[forge] Loading confidence patterns from forge-patterns namespace...
[forge] 12 platinum, 8 gold, 15 silver, 6 bronze patterns loaded.
```

**Phase 4 — Autonomous Loop (Iteration 1):**
```
[test-runner] Executing identity context (42 paths)... 40 PASS, 2 FAIL
[test-runner] Executing catalog context (56 paths)... 56 PASS, 0 FAIL
[test-runner] Executing payments context (89 paths)... 85 PASS, 4 FAIL
[test-runner] Executing orders context (73 paths)... 71 PASS, 2 FAIL

[failure-analyzer] Analyzing 8 failures across 3 contexts...
[failure-analyzer] identity: rate-limit test using wrong selector (confidence: 0.92)
[failure-analyzer] identity: session expiry redirect timing issue (confidence: 0.87)
[failure-analyzer] payments: card validation error message mismatch (confidence: 0.96)
[failure-analyzer] payments: wallet top-up race condition (confidence: 0.78)
...

[bug-fixer] Applying 6 platinum/gold fixes automatically...
[bug-fixer] 2 silver fixes flagged for review (suggest only)...

[accessibility-auditor] Scanning 4 contexts for WCAG AA...
[accessibility-auditor] Gate 5: 2 warnings (missing aria-labels on icon buttons)

[quality-gate-enforcer] Gate evaluation:
  1. Functional:    252/260 PASS (96.9%) — FAIL (need 100%)
  2. Behavioral:    43/46 PASS (93.5%) — FAIL
  3. Coverage:      87% overall, 96% critical — PASS
  4. Security:      0 critical, 0 high — PASS
  5. Accessibility: 2 warnings — PASS (warning only)
  6. Resilience:    Not yet tested — PENDING
  7. Contract:      0 mismatches — PASS

[forge] Gates 1,2 failing. Re-entering loop (iteration 2/10)...
```

**Phase 4 — Iteration 2:**
```
[test-runner] Re-running failed contexts: identity, payments, orders
[test-runner] identity: 42/42 PASS
[test-runner] payments: 89/89 PASS
[test-runner] orders: 73/73 PASS (cascade re-test after payments fix)

[quality-gate-enforcer] ALL 7 GATES PASS

[auto-committer] Staging 8 fixed files...
[auto-committer] Creating commit:
  fix(forge): Fix identity rate-limit, payments validation, orders cascade
  Quality Gates: Functional/Behavioral/Coverage/Security/Accessibility/Resilience/Contract all PASS
  Confidence Tier: gold
  Pattern Stored: fix-selector-mismatch-a3f2, fix-race-condition-b7c1

[learning-optimizer] Updating confidence tiers:
  fix-selector-mismatch: 0.92 -> 0.97 (promoted to Platinum)
  fix-race-condition: 0.78 -> 0.83 (promoted to Gold)

[forge] DONE DONE. All 7 gates pass. 260/260 tests green. 2 iterations used.
```

### When to Use
- CI/CD pipelines for full regression
- Before major releases
- After merging large feature branches
- Initial setup of quality gates on a new project

---

## 5. Example 2: Single Context Run

**Focus on one bounded context.** Faster, cheaper, ideal during active development.

### Invocation
```bash
/forge --autonomous --context payments
```

### What Happens
```
[forge] Phase 0: Checking payments-service at localhost:8083/health... HEALTHY
[forge] Phase 0: Checking identity-service (dependency)... HEALTHY
[forge] Seeding test data for payments context...

[spec-verifier] Loading payments.feature: 13 scenarios
[test-runner] Executing payments context (89 paths)...
[test-runner] 85 PASS, 4 FAIL

[failure-analyzer] Analyzing 4 failures in payments context...
[bug-fixer] Applying 3 platinum fixes, 1 gold fix...
[test-runner] Re-running payments: 89/89 PASS

[quality-gate-enforcer] Gates for payments context: ALL PASS
[auto-committer] Committing 4 fixed files...

[forge] Payments context DONE DONE. 89/89 tests green.
```

### Cascade Awareness
After fixing payments, Forge checks `forge.contexts.yaml`:
```yaml
payments:
  blocks:
    - orders
```
It will flag: "orders context depends on payments. Consider running `/forge --autonomous --context orders` to verify no regressions."

### When to Use
- Working on a single feature domain
- Iterating quickly during development
- Verifying a specific context before code review

---

## 6. Example 3: Specification Generation

**Auto-generate Gherkin specs from existing code.** Useful when you have implementation but no behavioral specs.

### Invocation
```bash
/forge --spec-gen --context catalog
```

### What Happens
```
[spec-verifier] Scanning catalog context implementation files...
[spec-verifier] Found:
  - frontend/src/pages/CatalogPage.tsx
  - frontend/src/pages/ProductDetailPage.tsx
  - frontend/src/components/SearchBar.tsx
  - frontend/src/components/CategorySidebar.tsx
  - backend/src/catalog/routes/products.ts
  - backend/src/catalog/routes/search.ts

[spec-verifier] Extracting user-visible features...
[spec-verifier] Identified 11 unique user journeys across 4 subdomains:
  - ProductListing: 4 scenarios (browse, sort, filter-category, filter-price)
  - ProductDetail: 3 scenarios (view, gallery, reviews)
  - Search: 3 scenarios (search, autocomplete, no-results)
  - Categories: 1 scenario (navigation)

[spec-verifier] Generating Gherkin specifications...
[spec-verifier] Written to: cypress/e2e/specs/catalog.feature
[spec-verifier] Mapped 11 scenarios to test functions in catalog.cy.ts

[forge] Spec generation complete. Review specs at cypress/e2e/specs/catalog.feature
```

### Generated Output (excerpt)
```gherkin
Feature: Catalog -- Product Browsing, Search & Categories

  Scenario: User browses product listing
    Given I am on the catalog home page
    Then I should see products displayed in a grid layout
    And each product card should show name, price, and image
    And products should be paginated with 20 items per page
```

### When to Use
- Bootstrapping BDD on an existing codebase
- Onboarding Forge onto a project without specs
- Generating specs for a newly added feature/context
- Documentation — specs double as living documentation

---

## 7. Example 4: Verification Only

**Validate that existing tests satisfy Gherkin specs without running fixes.** Read-only mode.

### Invocation
```bash
/forge --verify-only
```

### What Happens
```
[spec-verifier] Loading all Gherkin specs...
[spec-verifier] identity.feature: 10 scenarios
[spec-verifier] catalog.feature: 11 scenarios
[spec-verifier] payments.feature: 13 scenarios
[spec-verifier] orders.feature: 12 scenarios

[spec-verifier] Mapping scenarios to test functions...
[spec-verifier] Results:
  identity:  10/10 scenarios have corresponding tests   OK
  catalog:   11/11 scenarios have corresponding tests   OK
  payments:  13/13 scenarios have corresponding tests   OK
  orders:    10/12 scenarios have corresponding tests   GAPS FOUND

[spec-verifier] Missing test coverage for orders:
  - Scenario: "User receives status update notification" -> no test found
  - Scenario: "User re-orders from history" -> no test found

[forge] Verification complete. 2 spec gaps identified in orders context.
[forge] Run `/forge --autonomous --context orders` to generate missing tests.
```

### When to Use
- Pre-commit check: "Do all my specs have tests?"
- Code review: "Is everything specified actually tested?"
- Audit: "What's our behavioral coverage gap?"

---

## 8. Example 5: Fix Only

**Run existing tests, fix failures, skip spec generation.** Fastest path to green.

### Invocation
```bash
/forge --fix-only --context identity
```

### What Happens
```
[forge] Phase 0: Checking identity-service... HEALTHY
[test-runner] Running identity tests (42 paths)...
[test-runner] 40 PASS, 2 FAIL

[failure-analyzer] Failure 1: "should rate-limit after 5 failed attempts"
  Root cause: Selector `[data-testid="error-message"]` not found
  Pattern match: fix-selector-mismatch (confidence: 0.97, Platinum)

[failure-analyzer] Failure 2: "should redirect to login on session expiry"
  Root cause: Race condition — redirect happens before assertion
  Pattern match: fix-timing-race (confidence: 0.89, Gold)

[bug-fixer] Applying Platinum fix: Updated selector to [data-testid="rate-limit-message"]
[bug-fixer] Applying Gold fix: Added cy.wait for redirect completion

[test-runner] Re-running 2 fixed tests...
[test-runner] 42/42 PASS

[quality-gate-enforcer] Gates for identity: ALL PASS
[auto-committer] Committing 2 fixed files with detailed message...

[forge] identity context DONE. 42/42 green. 2 fixes applied.
```

### When to Use
- Tests just broke after a code change — fix them quickly
- CI pipeline failure — get back to green fast
- You know the issue is in tests, not specs

---

## 9. Example 6: Quality Gates Only

**Evaluate all seven gates without running tests.** Uses cached test results.

### Invocation
```bash
/forge --gates-only
```

Or for a specific context:
```bash
/forge --gates-only --context payments
```

### What Happens
```
[quality-gate-enforcer] Loading cached results from forge-state namespace...

Gate evaluation for ALL contexts:

| Gate           | Status  | Detail                              |
|----------------|---------|-------------------------------------|
| 1. Functional  | PASS    | 260/260 tests passing               |
| 2. Behavioral  | PASS    | 46/46 scenarios satisfied            |
| 3. Coverage    | PASS    | 87% overall, 96% critical paths     |
| 4. Security    | PASS    | 0 critical, 0 high vulnerabilities   |
| 5. Accessibility| WARNING | 2 missing aria-labels               |
| 6. Resilience  | WARNING | Timeout scenarios not tested (orders)|
| 7. Contract    | PASS    | 0 API mismatches                    |

RESULT: 5/7 PASS, 2/7 WARNING (non-blocking)
VERDICT: GATES CLEARED (warnings are non-blocking)

Recommendations:
- Fix accessibility warnings: Add aria-label to icon buttons in OrderTracking component
- Run `/forge --chaos --context orders` to test resilience scenarios
```

### When to Use
- Quick health check before deployment
- Dashboard/reporting — "where do we stand?"
- After manual fixes, verify gate status without re-running everything

---

## 10. Example 7: Defect Prediction

**Predict which tests are most likely to fail before running them.**

### Invocation
```bash
/forge --predict
```

Or for a specific context:
```bash
/forge --predict --context orders
```

### What Happens
```
[learning-optimizer] Analyzing prediction signals...

Signals considered:
  - Files changed since last green run: 8 files
  - Historical failure rates per context
  - Recent fix pattern applications: 4 in last session
  - Cyclomatic complexity: orders checkout flow = 18 (HIGH)
  - Dependency chain depth: orders -> payments -> identity (depth 3)

Defect Predictions (descending probability):

| Test                                    | Context  | Probability | Reason                          |
|-----------------------------------------|----------|-------------|----------------------------------|
| checkout completes full flow            | orders   | 0.82        | Checkout.tsx modified + depth 3  |
| payment processes successfully          | payments | 0.71        | PaymentService.ts changed        |
| cart persists across sessions           | orders   | 0.65        | SessionStore.ts modified         |
| user views transaction history          | payments | 0.43        | TransactionList.tsx untouched    |
| user browses product listing            | catalog  | 0.12        | No changes in catalog context    |
| user logs in successfully               | identity | 0.08        | Stable for 15 runs              |

[learning-optimizer] Recommendation: Run `/forge --fix-only --context orders` first —
  highest predicted failure rate. Then cascade to payments.
```

### When to Use
- Before starting a test run — know where to focus
- Sprint planning — identify risky areas
- Prioritizing which contexts to test first after large changes

---

## 11. Example 8: Chaos / Resilience Testing

**Inject controlled failures to test error handling and resilience.**

### Invocation
```bash
# All contexts
/forge --chaos --all

# Single context
/forge --chaos --context payments
```

### What Happens
```
[forge] Chaos testing mode activated for payments context.
[forge] Scenarios to inject:

1. TIMEOUT INJECTION
[test-runner] Injecting 5-second timeout on payments-service /api/payments/process...
[test-runner] Testing: "Payment timeout shows user-friendly error"
[test-runner] PASS — UI displays "Payment is taking longer than expected. Please wait..."
[test-runner] PASS — Retry button appears after 10 seconds

2. PARTIAL RESPONSES
[test-runner] Injecting truncated response on /api/wallet/balance...
[test-runner] Testing: "Partial API response handled gracefully"
[test-runner] FAIL — UI shows raw JSON error instead of friendly message
[failure-analyzer] Root cause: Missing error boundary in WalletBalance component
[bug-fixer] Fix applied: Added try-catch with user-friendly fallback message

3. CONCURRENT MUTATIONS
[test-runner] Simulating simultaneous wallet top-up from two sessions...
[test-runner] Testing: "Concurrent top-ups maintain balance consistency"
[test-runner] PASS — Optimistic locking prevents double-credit

4. SESSION EXPIRY
[test-runner] Expiring auth token mid-payment-flow...
[test-runner] Testing: "Session expiry during checkout preserves cart"
[test-runner] PASS — User redirected to login, cart preserved, can resume

5. NETWORK FLAP
[test-runner] Simulating intermittent connectivity during transaction list load...
[test-runner] Testing: "Network restoration retries failed requests"
[test-runner] PASS — Automatic retry with exponential backoff succeeds

[quality-gate-enforcer] Resilience gate for payments: 4/5 PASS, 1 FIXED
[forge] Chaos testing complete. 1 fix applied. Resilience gate: PASS.
```

### When to Use
- Pre-production hardening
- Testing error states that are hard to reproduce manually
- Validating offline/degraded mode behavior
- Building confidence in payment/financial flows

---

## 12. Example 9: Learning Optimizer

**Analyze past fix patterns and update confidence tiers.**

### Invocation
```bash
/forge --learn
```

### What Happens
```
[learning-optimizer] Scanning forge-patterns namespace...
[learning-optimizer] 41 fix patterns found across all tiers.

Tier Analysis:

PROMOTIONS (confidence increased):
  fix-selector-mismatch-a3f2:  0.92 -> 0.97 (Gold -> Platinum)
    Reason: Applied 8 times, 8 successes, 0 failures
  fix-api-response-null-check-c1d4: 0.84 -> 0.89 (Silver -> Gold)
    Reason: Applied 3 times, 3 successes

DEMOTIONS (confidence decreased):
  fix-animation-timing-e5f6: 0.76 -> 0.66 (Silver -> Expired)
    Reason: Applied 4 times, 1 success, 3 failures — pattern unreliable
  fix-scroll-viewport-g7h8: 0.85 -> 0.75 (Gold -> Silver)
    Reason: Applied 2 times, 1 failure — needs refinement

PATTERN STATISTICS:
  Platinum (>=0.95): 14 patterns (+2 promoted)
  Gold (>=0.85):     9 patterns (+1 promoted, -1 demoted)
  Silver (>=0.75):   13 patterns (+1 demoted from gold)
  Bronze (>=0.70):   3 patterns
  Expired (<0.70):   2 patterns (+1 demoted)

PREDICTION MODEL UPDATE:
  Historical failure data refreshed
  Coverage metrics stored
  Defect prediction weights recalibrated

[forge] Learning complete. 2 promotions, 2 demotions. Model updated.
```

### When to Use
- End of sprint — update the learning model
- After a burst of fix activity
- Periodically (weekly) to maintain pattern quality
- Before running `--predict` for most accurate predictions

---

## 13. Example 10: Add Coverage for New Screens

**Generate specs and tests for newly added screens or pages.**

### Invocation
```bash
/forge --add-coverage --screens "WishlistPage,CompareProducts"
```

### What Happens
```
[spec-verifier] Scanning for new screens: WishlistPage, CompareProducts...
[spec-verifier] Found:
  - frontend/src/pages/WishlistPage.tsx (new, 0% coverage)
  - frontend/src/pages/CompareProducts.tsx (new, 0% coverage)

[spec-verifier] Analyzing WishlistPage.tsx...
[spec-verifier] Identified user journeys:
  - Add item to wishlist
  - Remove item from wishlist
  - Move wishlist item to cart
  - Share wishlist via link
  - Wishlist persists across sessions

[spec-verifier] Analyzing CompareProducts.tsx...
[spec-verifier] Identified user journeys:
  - Add product to comparison
  - Remove product from comparison
  - View side-by-side comparison
  - Maximum 4 products in comparison

[spec-verifier] Generating Gherkin specs...
[spec-verifier] Generating Cypress test stubs...

[forge] New coverage added:
  - specs/wishlist.feature (5 scenarios)
  - specs/compare-products.feature (4 scenarios)
  - cypress/e2e/wishlist.cy.ts (5 test stubs)
  - cypress/e2e/compare-products.cy.ts (4 test stubs)

[forge] Run `/forge --autonomous --context wishlist` to execute and fix.
```

### When to Use
- After adding new features/pages
- Onboarding new team members — auto-generate initial coverage
- Expanding test suite incrementally

---

## 14. Configuration Deep Dive

### forge.config.yaml — Full Reference

This demo includes a complete `forge.config.yaml` with every option documented. Key sections:

**Architecture:**
```yaml
architecture: microservices  # or: monolith, modular-monolith, mobile-backend
```

**Backend Services:**
```yaml
backend:
  services:
    - name: identity-service
      port: 8081
      healthEndpoint: /health
      buildCommand: npm run build
      runCommand: npm start
      migrationCommand: npx prisma migrate deploy
      seedCommand: npm run seed
```

**Model Routing (cost optimization):**
```yaml
model_routing:
  bug-fixer: opus           # Most complex reasoning
  failure-analyzer: sonnet  # Balanced analysis
  test-runner: haiku        # Fast, cheap execution
  # Override for cost savings:
  # bug-fixer: sonnet       # If fixes are straightforward
```

**Quality Gate Thresholds:**
```yaml
quality_gates:
  coverage:
    overall: 85
    critical_paths: 95
  accessibility:
    blocking: false  # Set to true for government/healthcare projects
```

### forge.contexts.yaml — Full Reference

**Context Definition:**
```yaml
contexts:
  - name: identity
    testFile: cypress/e2e/identity.cy.ts
    specFile: cypress/e2e/specs/identity.feature
    paths: 42
    subdomains: [Authentication, Registration, Profiles, PasswordManagement]
    criticalPaths: [user-login, user-registration, password-reset]
    service: identity-service
    port: 8081
```

**Dependency Graph:**
```yaml
dependencies:
  identity:
    blocks: [catalog, payments, orders]
    cascade_priority: 1  # Fixed first
  orders:
    depends_on: [identity, catalog, payments]
    blocks: []           # Terminal context
    cascade_priority: 4  # Fixed last
```

### No Configuration Required

Forge works without any configuration files. On first run, it auto-discovers:
- Backend technology and ports
- Frontend framework and test runner
- API protocols
- Project layout

Configuration files let you fine-tune, but they are never mandatory.

---

## 15. Understanding the Eight Agents

| Agent | Model | What It Does | Cost Tier |
|-------|-------|-------------|-----------|
| **Specification Verifier** | Sonnet | Generates & validates Gherkin specs, creates ADRs | Medium |
| **Test Runner** | Haiku | Executes tests, parses results, predicts failures | Low |
| **Failure Analyzer** | Sonnet | Root cause analysis, pattern matching | Medium |
| **Bug Fixer** | Opus | Applies fixes from first principles, confidence-tiered | High |
| **Quality Gate Enforcer** | Haiku | Evaluates all 7 gates, arbitrates disagreements | Low |
| **Accessibility Auditor** | Sonnet | WCAG AA audit: labels, contrast, targets, focus | Medium |
| **Auto-Committer** | Haiku | Stages files, creates detailed commits | Low |
| **Learning Optimizer** | Sonnet | Updates tiers, predictions, coverage metrics | Medium |

**Cost optimization:** Haiku handles high-volume/simple tasks. Opus reserved for the hardest work (fixing bugs). This reduces token costs by ~60% compared to running everything on Opus.

**Customization:** Override any agent's model in `forge.config.yaml`:
```yaml
model_routing:
  bug-fixer: sonnet       # Cheaper if fixes are simple
  learning-optimizer: opus # More reasoning for predictions
```

---

## 16. Quality Gates Explained

### Gate 1: Functional (BLOCKING)
100% of tests must pass. No exceptions. A single failure blocks the commit.

### Gate 2: Behavioral (BLOCKING)
Every Gherkin scenario that was targeted must be satisfied. Tests passing but specs failing = broken product.

### Gate 3: Coverage (BLOCKING on critical)
Overall path coverage must be >= 85%. Critical paths (login, checkout, payment) must be >= 95%.

### Gate 4: Security (BLOCKING)
Zero critical or high vulnerabilities. Checks for: hardcoded secrets, insecure storage, basic SAST findings.

### Gate 5: Accessibility (WARNING)
WCAG AA compliance: proper labels, sufficient contrast, tap target sizes, logical focus order. Non-blocking by default — upgrade to blocking for accessibility-critical projects:
```yaml
quality_gates:
  accessibility:
    blocking: true
```

### Gate 6: Resilience (WARNING)
Verifies offline mode, timeout handling, and error recovery are tested. Run `--chaos` to satisfy this gate fully.

### Gate 7: Contract (BLOCKING)
API response schemas must match expected DTOs. Zero mismatches tolerated.

---

## 17. Confidence Tiers & Self-Learning

Forge learns from every fix it applies:

```
Success: confidence += 0.05 (capped at 1.0)
Failure: confidence -= 0.10 (floored at 0.0)
```

| Tier | Range | Behavior |
|------|-------|----------|
| **Platinum** | >= 0.95 | Auto-applied immediately. Battle-tested fixes. |
| **Gold** | >= 0.85 | Auto-applied, flagged in commit message. |
| **Silver** | >= 0.75 | Suggested only. Human reviews before applying. |
| **Bronze** | >= 0.70 | Learning-only. Stored but never auto-applied. |
| **Expired** | < 0.70 | Demoted. Not used. Will be garbage-collected. |

**Example lifecycle:**
1. New pattern discovered: starts at Bronze (0.70)
2. Applied successfully 3 times: promoted to Silver (0.85)
3. Applied successfully 2 more times: promoted to Gold (0.90)
4. Applied successfully 1 more time: promoted to Platinum (0.95)
5. If it fails once: drops to Gold (0.85)

Run `/forge --learn` periodically to recalibrate all patterns.

---

## 18. Dependency Graphs & Cascade Testing

Forge understands which contexts depend on which:

```
identity (priority 1) --> blocks: catalog, payments, orders
catalog  (priority 2) --> blocks: orders
payments (priority 3) --> blocks: orders
orders   (priority 4) --> blocks: (none)
```

**Cascade Re-Testing Rules:**
1. When `identity` is fixed, Forge automatically re-tests `catalog`, `payments`, and `orders`
2. When `payments` is fixed, Forge re-tests `orders`
3. Contexts are fixed in priority order (identity first, orders last)
4. This prevents upstream fixes from silently breaking downstream consumers

**Why this matters:** If fixing an auth bug in `identity` changes the session token format, `payments` (which validates tokens) would silently break. Cascade re-testing catches this.

---

## 19. Combining Modes: Real-World Workflows

### Workflow 1: New Feature Development
```bash
# 1. Generate specs for your new feature
/forge --spec-gen --context wishlist

# 2. Review and refine the generated specs
#    (edit wishlist.feature manually if needed)

# 3. Run autonomous mode to generate tests and fix them
/forge --autonomous --context wishlist

# 4. Run chaos testing to harden the feature
/forge --chaos --context wishlist

# 5. Verify all gates before merging
/forge --gates-only --context wishlist
```

### Workflow 2: CI/CD Pipeline
```bash
# In your CI pipeline:
/forge --autonomous --all

# The pipeline passes only if all 7 gates clear.
# Forge auto-commits fixes, so the pipeline self-heals.
```

### Workflow 3: Post-Deployment Monitoring
```bash
# After deploying to staging:
/forge --verify-only           # Ensure specs still match
/forge --predict               # Identify highest-risk areas
/forge --chaos --all           # Stress test in staging
/forge --gates-only            # Final gate check
```

### Workflow 4: Sprint Retrospective
```bash
# End of sprint — improve the learning model
/forge --learn

# See what predictions look like for next sprint
/forge --predict
```

### Workflow 5: Onboarding Forge onto an Existing Project
```bash
# Step 1: Let Forge discover your project (no config needed)
/forge --verify-only

# Step 2: Generate specs for contexts with no specs
/forge --spec-gen --context identity
/forge --spec-gen --context payments

# Step 3: Run autonomous mode — it will generate tests where missing
/forge --autonomous --all

# Step 4: Add config files for fine-tuning (optional)
# Create forge.config.yaml and forge.contexts.yaml

# Step 5: Update learning from this first run
/forge --learn
```

---

## 20. Troubleshooting & FAQ

### Q: Backend service is not healthy
```
[forge] ERROR: identity-service at localhost:8081/health returned 503
```
**Fix:** Ensure the service is running. Forge will attempt to build and start it if `buildCommand` and `runCommand` are configured, but the port must be available.

### Q: Forge is stuck in a fix loop
Forge has a maximum of 10 iterations and 2 reverts per test. If it reaches these limits:
```
[forge] WARNING: Maximum iterations (10) reached. 3 tests still failing.
[forge] Manual intervention required. See .forge/progress.jsonl for details.
```
**Fix:** Review the progress log, identify the stubborn failures, and fix them manually. Then run `/forge --fix-only` to resume.

### Q: How do I see real-time progress?
```bash
# In a separate terminal:
tail -f .forge/progress.jsonl
```
Each agent emits JSON events as it works.

### Q: Can I run Forge without any configuration?
Yes. Forge auto-discovers your project structure on first invocation. Configuration files are optional for fine-tuning.

### Q: How much does a full run cost in tokens?
It depends on project size, but model routing reduces cost by ~60%. Typical range for a medium project (4 contexts, ~200 tests):
- Haiku agents: ~15% of total tokens
- Sonnet agents: ~50% of total tokens
- Opus agent (bug fixer): ~35% of total tokens

### Q: Does Forge work with mobile apps?
Yes. Forge supports Flutter, React Native, and native mobile testing frameworks. Set `architecture: mobile-backend` in your config.

---

## Summary of All Invocation Modes

| Command | Purpose | Speed | Cost |
|---------|---------|-------|------|
| `/forge --autonomous --all` | Full autonomous run, all contexts | Slow | High |
| `/forge --autonomous --context X` | Single context autonomous | Medium | Medium |
| `/forge --spec-gen --context X` | Generate Gherkin specs | Fast | Low |
| `/forge --verify-only` | Validate specs vs tests | Fast | Low |
| `/forge --fix-only --context X` | Fix failures, skip spec gen | Medium | Medium |
| `/forge --gates-only` | Evaluate gates from cache | Instant | Minimal |
| `/forge --predict` | Defect prediction | Fast | Low |
| `/forge --chaos --context X` | Resilience/chaos testing | Medium | Medium |
| `/forge --learn` | Update confidence tiers | Fast | Low |
| `/forge --add-coverage --screens X` | Coverage for new screens | Fast | Low |

---

## Further Resources

- **Forge Repository:** [github.com/ikennaokpala/forge](https://github.com/ikennaokpala/forge)
- **Forge Creator:** [Ikenna N. Okpala](https://github.com/ikennaokpala) — Software engineer, Arctic Code Vault Contributor
- **Demo Author:** [Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty/) — Curator of this end-to-end demonstration within the [vibe-cast](https://github.com/mondweep/vibe-cast) repository

---

*This demo is part of the [Vibe Cast](https://github.com/mondweep/vibe-cast) multi-project repository. See the `MASTER-README.md` for an overview of all projects.*
