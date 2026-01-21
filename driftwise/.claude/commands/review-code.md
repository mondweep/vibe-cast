# Code Review Command

Perform an architecture and code review for Driftwise changes.

## Usage

```
/review-code [file-path-or-pattern]
```

## Review Checklist

### Architecture Review
- [ ] Bounded context isolation maintained
- [ ] Anti-corruption layers used for external APIs
- [ ] Domain events properly designed
- [ ] Aggregate boundaries respected
- [ ] No circular dependencies between contexts

### DDD Compliance
- [ ] Ubiquitous language used consistently
- [ ] Value objects are immutable
- [ ] Aggregates enforce invariants
- [ ] Domain logic not leaked to adapters
- [ ] Events contain sufficient information

### Code Quality
- [ ] TypeScript strict mode compliance
- [ ] No `any` types without justification
- [ ] Functions are small and focused
- [ ] Error handling is comprehensive
- [ ] No console.log in production code

### Security
- [ ] No API keys in source code
- [ ] Input validation at boundaries
- [ ] Proper CORS/CSP consideration
- [ ] No eval() or dynamic code execution
- [ ] Sensitive data not logged

### Performance
- [ ] No unnecessary re-renders
- [ ] Proper caching implemented
- [ ] Rate limiting respected
- [ ] Timeout handling present
- [ ] Memory leaks prevented (cleanup)

### Testing
- [ ] Unit tests for domain logic
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Mocks used appropriately
- [ ] Assertions are specific

## Output Format

```markdown
## Code Review: [Component Name]

### Summary
[Brief overview of changes reviewed]

### Architecture
- [x] Bounded context isolation: OK
- [ ] Issue: [Description]

### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

### Verdict
[APPROVED / NEEDS_CHANGES / BLOCKED]
```
