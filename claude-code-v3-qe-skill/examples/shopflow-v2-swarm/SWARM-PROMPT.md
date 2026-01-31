# Build with Quality - Claude Flow V3 Swarm

## Skill Activation
build-with-quality v1.0.0 (111+ agents, hierarchical-mesh)
Config: skill.yaml - FULL CAPABILITY MODE

## Project Context
- **Name:** ShopFlow-V2-Swarm
- **Type:** web-app
- **Stack:** Next.js 14 + TypeScript + Prisma + PostgreSQL + Stripe + Redis
- **Description:** E-commerce platform with cart, checkout, and order management

## Task
Build complete e-commerce with product catalog, cart, checkout, and orders

## Acceptance Criteria
- [ ] Product catalog with search and filters
- [ ] Shopping cart (persistent across sessions)
- [ ] Stripe checkout integration
- [ ] Order history and status tracking
- [ ] Admin dashboard for inventory
- [ ] Email notifications (order confirmation)

## Methodology
- **DDD:**
  - Core Domain: Orders, Payments
  - Supporting: Catalog, Inventory, Notifications
  - Bounded Contexts: Shopping, Fulfillment, Admin
  - Aggregates: Product, Cart, Order
  - Domain Events: ProductAddedToCart, OrderPlaced, PaymentCompleted
- **ADR:** Document all significant decisions
- **TDD:** Full red-green-refactor for each aggregate

## Quality Gates (Production Critical)
- Coverage: 90% overall, 100% payment flows
- Security: 0 critical/high, PCI-DSS compliance
- Accessibility: WCAG AA, keyboard checkout
- Chaos: 90% graceful degradation

## Swarm Configuration
domains:
  development: 4 concurrent (architect, coder, reviewer, browser-agent)
  quality: 4 concurrent (full test suite)
  security: 2 concurrent (PCI focus)
  learning: 2 concurrent (SONA, ReasoningBank)
  coordination: 1 (unified-coordinator)
max_agents: 13
topology: hierarchical-mesh

## Execute
Phase 1: DDD modeling with architect agent
Phase 2: TDD implementation with coder + test-generator
Phase 3: Security scan with sast-scanner + dast-scanner
Phase 4: Quality validation with coverage-analyzer + chaos-engineer
Phase 5: Pattern capture with sona-optimizer

Deliver production-ready e-commerce with full quality assurance.
