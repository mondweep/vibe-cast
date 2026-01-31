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

# Start development server
npm run dev
```

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

Built with ❤️ using Claude Flow V3 + Agentic QE
