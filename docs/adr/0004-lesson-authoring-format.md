# 0004 — Lessons as schema-validated TypeScript modules

**Status:** Accepted · **Date:** 2026-09-05

## Context

A lesson bundles prose, an ordered set of scroll sections, a scene per section,
assessment items, and its position in the prerequisite DAG. There will eventually
be hundreds. The DAG must be verifiable — a cycle or a dangling prerequisite is a
build-breaking bug, not a runtime surprise.

## Decision

Each lesson is a TypeScript module exporting a `Lesson` object, validated against
a Zod schema at build time and in tests.

```ts
export const lesson: Lesson = {
  id: 'vector-space',
  pcm: 'I.3',                        // cites data/curriculum.json
  title: 'Vector Space',
  prerequisites: ['set', 'field'],
  sections: [ /* prose + scene per scroll step */ ],
  assessment: [ /* typed items, see PRD §6 */ ],
}
```

A build step validates every lesson, resolves `prerequisites` against known
lesson ids, checks `pcm` against the curriculum index, and asserts the graph is
acyclic. Any failure fails the build.

## Alternatives considered

- **MDX.** Nicer for prose and the common choice for content sites. Rejected
  because the valuable structure here is not prose — it is the typed graph, the
  scene definitions and the assessment items. In MDX those degrade to untyped
  component props, and the DAG check becomes a parse-and-hope exercise.
- **JSON or YAML content files.** Data-clean and editable without a toolchain,
  but scenes and assessment grading are *functions*, and serialising behaviour
  into config invariably grows a bad interpreter.
- **A headless CMS.** Rejected outright: adds a network dependency and a second
  source of truth, and puts content outside code review. Content changes belong
  in pull requests alongside the code that renders them.

## Consequences

- Authors need TypeScript, which narrows who can contribute prose. Acceptable
  while the author and the developer are the same person; revisit if that changes.
- Broken prerequisites, unknown PCM citations and DAG cycles are caught at build
  time, in CI, before review.
- Lessons are ordinary modules, so they are trivially unit-testable and can be
  imported by the graph tooling without a parser.
