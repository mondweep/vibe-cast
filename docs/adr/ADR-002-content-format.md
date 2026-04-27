# ADR-002: Content Format — MDX (Git-native)

**Status:** Accepted  
**Date:** 2026-04-27  
**Linear:** MON-47

## Context

Course content must be:
- Version-controlled alongside code
- Able to embed interactive React components (quizzes, diagrams)
- Editable by non-engineers (teachers, subject matter experts)
- Renderable server-side for performance

## Decision

**Use MDX files stored in `/content/modules/` in the Git repository.**

## Rationale

- MDX = Markdown + JSX; authors write in familiar Markdown syntax
- Frontmatter (YAML) carries structured metadata (id, objectives, personas)
- Git history provides full content audit trail
- Interactive components (QuizBlock, DiagramViewer) embed naturally
- No external CMS dependency or API cost

## Consequences

- Content changes require a Git commit (acceptable; enables PR review workflow)
- Non-git-literate authors need a GitHub UI or simple editor wrapper
- Large binary assets (diagrams) should be stored in `/public/` not MDX

## Alternatives Considered

| Alternative | Reason rejected |
|---|---|
| Contentful / Sanity | External dependency, cost, latency |
| JSON files | No prose support; poor authoring DX |
| Database | Overkill for Phase 1; adds infrastructure |
