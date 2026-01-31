# ShopFlow

A production-ready e-commerce platform built using the **Build with Quality** skill methodology.

## Built With

- **DDD (Domain-Driven Design):** 6 bounded contexts with clear aggregates
- **ADR (Architecture Decision Records):** 4 documented decisions
- **TDD (Test-Driven Development):** Domain logic tested first

## Features

- Product catalog with search and filters
- Shopping cart (Redis-persisted)
- Stripe checkout integration
- Order history and tracking
- Inventory reservation system
- Admin dashboard (WIP)

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL + Prisma
- **Cache:** Redis (cart persistence)
- **Payments:** Stripe Checkout
- **Testing:** Vitest, Playwright

## DDD Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      BOUNDED CONTEXTS                           │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│   Catalog    │    Cart      │   Orders     │   Inventory      │
│              │              │   (Core)     │                  │
│ • Product    │ • Cart       │ • Order      │ • Reservation    │
│ • Category   │ • CartItem   │ • OrderItem  │                  │
│ • Money      │ • CartTotals │ • Status     │                  │
├──────────────┴──────────────┴──────────────┴──────────────────┤
│                        SHARED                                   │
│              Payments • Notifications • Users                   │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
shopflow/
├── docs/adr/                    # Architecture Decision Records
│   ├── ADR-001-payment-provider.md
│   ├── ADR-002-rendering-strategy.md
│   ├── ADR-003-cart-persistence.md
│   └── ADR-004-inventory-strategy.md
├── prisma/
│   └── schema.prisma            # Database schema
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API routes
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── products/
│   │   │   └── webhooks/stripe/
│   │   ├── (shop)/              # Customer-facing pages
│   │   └── admin/               # Admin dashboard
│   ├── components/              # React components
│   │   ├── ui/                  # Base UI components
│   │   ├── catalog/             # Product components
│   │   ├── cart/                # Cart components
│   │   └── checkout/            # Checkout components
│   ├── domains/                 # DDD domain models
│   │   ├── catalog/types.ts
│   │   ├── cart/types.ts
│   │   ├── orders/types.ts
│   │   ├── inventory/
│   │   └── payments/
│   └── lib/                     # Utilities
│       ├── db.ts                # Prisma client
│       ├── redis.ts             # Redis client
│       ├── stripe.ts            # Stripe integration
│       ├── store.ts             # Zustand store
│       └── utils.ts
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # API tests
│   └── e2e/                     # Playwright tests
└── package.json
```

## Architecture Decisions

| ADR | Decision | Rationale |
|-----|----------|-----------|
| [ADR-001](./docs/adr/ADR-001-payment-provider.md) | Stripe for payments | PCI compliance, Checkout Sessions |
| [ADR-002](./docs/adr/ADR-002-rendering-strategy.md) | RSC + ISR for catalog | SEO, performance |
| [ADR-003](./docs/adr/ADR-003-cart-persistence.md) | Redis for cart | Sub-ms latency, TTL |
| [ADR-004](./docs/adr/ADR-004-inventory-strategy.md) | Reservation-based inventory | No overselling |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Stripe account (test mode)

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Setup database
npx prisma generate
npx prisma db push
npx prisma db seed

# Start development server
npm run dev
```

### Stripe Webhook (Local Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

## Quality Gates

| Gate | Threshold | Status |
|------|-----------|--------|
| Code Coverage | 90% overall | Target |
| Payment Flows | 100% coverage | Target |
| Security | 0 critical/high | Target |
| Accessibility | WCAG AA | Target |
| Chaos Testing | 90% graceful | Target |

## Domain Events

| Event | Trigger | Handler |
|-------|---------|---------|
| `ProductAddedToCart` | Add to cart | Update cart totals |
| `OrderPlaced` | Checkout complete | Reserve inventory |
| `PaymentCompleted` | Stripe webhook | Confirm order, clear cart |
| `OrderShipped` | Admin action | Send tracking email |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/products` | List products with filters |
| GET | `/api/cart` | Get current cart |
| POST | `/api/cart` | Add item to cart |
| PATCH | `/api/cart` | Update quantity |
| DELETE | `/api/cart` | Remove item |
| POST | `/api/checkout` | Create Stripe session |
| POST | `/api/webhooks/stripe` | Handle Stripe events |

---

*Built with the [Build with Quality Skill](../../README.md)*
