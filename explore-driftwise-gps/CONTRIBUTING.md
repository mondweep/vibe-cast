# Contributing to Driftwise

Thank you for your interest in contributing to Driftwise! We welcome contributions from developers, designers, writers, and enthusiasts of all skill levels.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Development Setup](#development-setup)
4. [Coding Standards](#coding-standards)
5. [Pull Request Process](#pull-request-process)
6. [Testing Guidelines](#testing-guidelines)
7. [Documentation](#documentation)
8. [Issue Guidelines](#issue-guidelines)
9. [Commit Message Convention](#commit-message-convention)
10. [Architecture Principles](#architecture-principles)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors must:

- Be respectful and constructive in all interactions
- Welcome feedback and different perspectives
- Focus on what is best for the community
- Show empathy towards other community members
- Report unacceptable behavior to maintainers

## How to Contribute

### Ways to Contribute

1. **Report Bugs**: File issues with detailed reproduction steps
2. **Suggest Features**: Propose new functionality aligned with roadmap
3. **Improve Documentation**: Fix typos, clarify concepts, add examples
4. **Write Tests**: Increase test coverage, add edge cases
5. **Code Implementation**: Implement features from the roadmap
6. **Optimize Performance**: Profile and improve efficiency
7. **Improve UI/UX**: Enhance user experience and accessibility
8. **Community**: Help other developers, answer questions

### Contribution Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Write or update tests
5. Update documentation
6. Commit with clear message
7. Push to your fork
8. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 20+ (check with `node --version`)
- npm 9+ (check with `npm --version`)
- Git
- A code editor (VS Code recommended)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/jjohare/driftwise.git
cd driftwise

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in browser
```

### Required Tools

```bash
# Install development dependencies
npm install --save-dev typescript eslint prettier jest

# Set up Git hooks (optional)
npm run prepare
```

## Coding Standards

### TypeScript & Type Safety

- **Always use TypeScript** for new code
- Define proper types; avoid `any`
- Use strict mode (`"strict": true` in tsconfig.json)
- Export types from index files

```typescript
// Good
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

function getLocation(): Promise<LocationData> {
  // ...
}

// Avoid
function getLocation(): Promise<any> {
  // ...
}
```

### Code Style

- **Formatting**: Use Prettier with default config
- **Linting**: Follow ESLint rules (enforced pre-commit)
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/types
- **Comments**: Explain "why", not "what" the code does
- **Line Length**: Keep lines <100 characters

```typescript
// Good - explains intent
// Cache location for 5 minutes to avoid excessive GPS polling
const cacheLocationForMs = 5 * 60 * 1000;

// Avoid - states obvious
// Set cache time
const cacheTime = 300000;
```

### Component Structure (SvelteKit)

```svelte
<script lang="ts">
  // 1. Imports
  import type { LocationData } from '$lib/types';

  // 2. Props
  export let location: LocationData;

  // 3. Reactive declarations
  let isLoading = false;

  // 4. Event handlers
  function handleClick() {
    // ...
  }
</script>

<!-- 5. HTML structure -->
<div class="container">
  <!-- content -->
</div>

<!-- 6. Styles -->
<style>
  .container {
    /* scoped styles */
  }
</style>
```

### Module Organization

```
src/
├── domains/           # Domain logic (DDD)
│   └── location/
│       ├── Location.ts
│       ├── LocationService.ts
│       └── index.ts
├── shared/            # Cross-domain utilities
│   ├── types.ts
│   └── utils.ts
├── adapters/          # External integrations
│   └── nominatim/
└── ui/               # Svelte components
    ├── routes/
    └── components/
```

## Pull Request Process

### Before Submitting

1. **Update from main**: `git rebase origin/main`
2. **Run tests**: `npm run test`
3. **Check types**: `npm run type-check`
4. **Lint code**: `npm run lint`
5. **Build project**: `npm run build`
6. **Check coverage**: `npm run test:coverage` (target: >80%)

### PR Description Template

```markdown
## Description
Brief summary of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Enhancement
- [ ] Documentation
- [ ] Refactoring

## Linked Issue
Closes #123

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases considered

## Documentation
- [ ] README updated
- [ ] Code comments added
- [ ] Documentation updated

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### PR Review Process

- At least 1 maintainer review required
- All automated checks must pass
- Discussions resolved before merging
- Squash commits before merging (optional)
- Delete branch after merge

## Testing Guidelines

### Test Philosophy

- **Test behavior, not implementation**
- **Aim for >80% coverage**
- **Include edge cases and error scenarios**
- **Test user interactions, not React internals**
- **Keep tests readable and maintainable**

### Test Structure

```typescript
describe('LocationService', () => {
  describe('getLocation', () => {
    it('should return coordinates within expected accuracy', async () => {
      // Arrange
      const mockGPS = { latitude: 40.7128, longitude: -74.0060 };
      vi.spyOn(navigator.geolocation, 'getCurrentPosition')
        .mockImplementation(callback => {
          callback({ coords: mockGPS } as any);
        });

      // Act
      const result = await locationService.getLocation();

      // Assert
      expect(result).toEqual(mockGPS);
    });

    it('should handle permission denial gracefully', async () => {
      // Arrange
      vi.spyOn(navigator.geolocation, 'getCurrentPosition')
        .mockImplementation((success, error) => {
          error(new GeolocationPositionError());
        });

      // Act & Assert
      await expect(locationService.getLocation())
        .rejects.toThrow('Location permission denied');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- LocationService.test.ts

# Run with coverage
npm run test:coverage

# Watch mode (rerun on changes)
npm run test:watch

# E2E tests (when implemented)
npm run test:e2e
```

## Documentation

### Documentation Standards

- **README**: Keep updated with setup and usage info
- **Code Comments**: Explain "why", not "what"
- **Type Definitions**: Include JSDoc comments for public APIs
- **Architecture**: Update AFD when making structural changes
- **Examples**: Include usage examples for complex features

### JSDoc Comments

```typescript
/**
 * Fetch historical facts for a geographic location
 *
 * @param location - GPS coordinates (latitude, longitude)
 * @param options - Optional configuration for fact filtering
 * @returns Promise resolving to array of historical facts
 * @throws {GeolocationError} If location is invalid
 *
 * @example
 * const facts = await getHistoricalFacts(
 *   { latitude: 40.7128, longitude: -74.0060 },
 *   { maxResults: 5 }
 * );
 */
export async function getHistoricalFacts(
  location: { latitude: number; longitude: number },
  options?: { maxResults?: number }
): Promise<Fact[]> {
  // implementation
}
```

## Issue Guidelines

### Reporting Bugs

Include:
- **Title**: Clear, concise description
- **Reproduction Steps**: Step-by-step to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Node version, browser, OS
- **Screenshots/Logs**: Relevant error messages
- **Minimal Example**: Small code to reproduce

### Suggesting Features

Include:
- **Title**: Clear feature description
- **Problem**: Problem you're trying to solve
- **Proposed Solution**: Your idea
- **Alternatives**: Other approaches considered
- **Context**: Why this matters to you

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `documentation`: Docs update needed
- `help wanted`: Extra attention needed
- `good first issue`: Good for newcomers
- `wontfix`: Decision not to fix

## Commit Message Convention

Use conventional commits for clear history:

```
type(scope): subject

body

footer
```

### Format Details

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- **scope**: Area of codebase (optional)
- **subject**: Imperative, present tense, <50 chars
- **body**: Explain what and why, not how (optional)
- **footer**: Reference issues (optional)

### Examples

```
feat(location): implement background GPS polling

- Polls location every 5 minutes when app is backgrounded
- Respects battery saver mode
- Gracefully degrades if background access denied

Closes #123
```

```
fix(voice): prevent audio cutoff during long facts

Increased audio buffer to handle facts >30 seconds without interruption
```

```
docs: clarify API key setup in README
```

## Architecture Principles

### Follow Domain-Driven Design

- **Bounded Contexts**: Location, Discovery, Voice, Audio, Config
- **Aggregates**: Clear boundaries with root entities
- **Value Objects**: Immutable, identity-less objects
- **Domain Events**: Loose coupling between contexts
- **Anti-Corruption Layers**: Isolate from external APIs

### Key Design Patterns

- **Result<T, E>**: Explicit error handling
- **Repository Pattern**: Abstract data access
- **Service Pattern**: Domain logic encapsulation
- **Factory Pattern**: Complex object creation
- **Observer Pattern**: Event-driven architecture

### Performance Considerations

- **Lazy Loading**: Load components/data on demand
- **Caching**: Cache geocoding results and facts
- **Debouncing**: Limit location polling frequency
- **Compression**: Minimize network payloads
- **Code Splitting**: Separate routes into chunks

### Testing Requirements

- **Unit Tests**: Individual functions in isolation
- **Integration Tests**: Component interactions
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Latency and memory usage
- **Accessibility Tests**: WCAG compliance

## Questions or Need Help?

- **Documentation**: Start with [README.md](README.md)
- **Architecture**: Read [AFD-ARCHITECTURE.md](docs/driftwise/architecture/AFD-ARCHITECTURE.md)
- **Design**: Check [DDD-OVERVIEW.md](docs/driftwise/ddd/DDD-OVERVIEW.md)
- **Issues**: Search existing issues
- **Discussions**: Ask in GitHub Discussions
- **Contact**: Reach out to maintainers

## Recognition

Contributors will be recognized in:
- Git commit history
- GitHub contributors page
- Project CHANGELOG.md
- Special thanks section in README

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for making Driftwise better!** Every contribution, no matter how small, is valuable.
