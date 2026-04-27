# Contributing to AWS Advanced Networking Course

## Development Setup

```bash
git clone https://github.com/mondweep/vibe-cast.git
cd vibe-cast
git checkout aws-advanced-networking
npm install
npm run dev
```

## TDD Workflow (London School)

1. **Write the Playwright acceptance test first** (`tests/e2e/`)
2. Run `npm run test:e2e` — watch it fail
3. Write the component/domain code
4. Write Jest unit tests with mocks (`tests/unit/`)
5. Make all tests pass
6. Commit with reference to Linear issue

## Commit Convention

```
<type>: <description> [Linear: MON-XX]

Types: feat | fix | content | test | refactor | docs | chore
```

## Branch Naming

`mondweep/mon-XX-short-description`

## Content Authoring

- MDX files live in `/content/modules/MXX-slug/index.mdx`
- Frontmatter must include: id, title, domain, estimatedHours, objectives, personas
- Bloom's levels for objectives: remember | understand | apply | analyse | evaluate | create
- ANS-C01 exam tips use `> **Exam tip:**` blockquote format

## ADR Process

For any significant architectural or content decision:
1. Copy `/docs/adr/ADR-XXX-template.md`
2. Fill in Context, Decision, Consequences, Alternatives
3. Set Status to "Proposed"
4. Include in PR for review
5. Mark "Accepted" on merge
