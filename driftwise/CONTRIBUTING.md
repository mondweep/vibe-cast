# Contributing to Driftwise

Thank you for your interest in contributing to Driftwise! This document provides guidelines for contributing to the project.

## Development Philosophy

### Serendipity First

The core value proposition of Driftwise is **serendipitous discovery**. When contributing, always ask:
- Does this feature enhance unexpected discovery?
- Does it maintain the voice-first, hands-free experience?
- Does it avoid generic tourism content?

### Domain-Driven Design

We follow DDD principles. Contributions should:
- Respect bounded context boundaries
- Use the ubiquitous language defined in documentation
- Keep domain logic separate from infrastructure concerns

## Getting Started

### Prerequisites

- Node.js 18+
- npm, pnpm, or Bun
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/mondweep/vibe-cast.git
cd vibe-cast/driftwise

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Add your Gemini API key to .env

# Start development server
npm run dev
```

### Running Tests

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# With coverage
npm run test:coverage
```

## Code Style

### TypeScript

- Enable strict mode (already configured)
- No `any` types without explicit justification
- Use interfaces for data structures, types for unions
- Prefer composition over inheritance

### Svelte

- Use TypeScript in `<script lang="ts">` blocks
- Keep components small and focused
- Prefer reactive statements over lifecycle hooks
- Use Svelte stores for shared state

### Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `location-service.ts` |
| Classes | PascalCase | `LocationAggregate` |
| Functions | camelCase | `calculateDistance` |
| Constants | UPPER_SNAKE | `DEFAULT_POLLING_INTERVAL_MS` |
| Types/Interfaces | PascalCase | `GPSCoordinates` |
| Domain Events | PascalCase + Event | `LocationAcquiredEvent` |

## Architecture

### Directory Structure

```
src/lib/
├── domain/         # DDD domain models (entities, value objects, events)
├── services/       # Application services (orchestration)
├── adapters/       # External API adapters (anti-corruption layers)
├── stores/         # Svelte stores (UI state)
└── components/     # Reusable UI components
```

### Bounded Contexts

1. **Location** - GPS, geocoding, place names
2. **Discovery** - Fact generation, quality filtering
3. **Voice** - Gemini Live API, commands
4. **Audio** - Focus management, ducking
5. **Configuration** - User preferences

### Adding New Features

1. Identify the affected bounded context(s)
2. Design domain models first (entities, value objects)
3. Implement services and adapters
4. Create or update Svelte stores
5. Build UI components
6. Write tests at each layer

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run check`)
- [ ] Documentation updated if needed

### PR Description

Include:
- **What**: Brief description of changes
- **Why**: Motivation for the change
- **Context**: Related bounded context(s)
- **Testing**: How you tested the changes

### Review Criteria

PRs will be reviewed for:
- DDD compliance (context isolation, ubiquitous language)
- Code quality (TypeScript strictness, no unused code)
- Test coverage (domain logic should be tested)
- Performance (no unnecessary re-renders, API calls)
- Security (no key exposure, input validation)

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Device/browser information
- Console errors (if any)

### Feature Requests

Include:
- Use case description
- How it enhances serendipitous discovery
- Proposed implementation approach (optional)

## Questions?

- Check the [Architecture Document](docs/architecture/AFD-ARCHITECTURE.md)
- Check the [DDD Overview](docs/ddd/DDD-OVERVIEW.md)
- Open a GitHub Discussion for general questions

---

Thank you for contributing to Driftwise!
