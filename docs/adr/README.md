# Architecture Decision Records

One file per decision, numbered in the order taken. A record is immutable once
merged: to change a decision, add a new ADR that supersedes it and update the
`Status` line of the old one.

| # | Decision | Status |
|---|---|---|
| [0001](0001-frontend-stack.md) | React + TypeScript + Vite for the frontend | Accepted |
| [0002](0002-scrollytelling-engine.md) | Hand-rolled scroll engine over a pure progress model | Accepted |
| [0003](0003-diagram-rendering.md) | SVG-first diagrams driven by a declarative scene model | Accepted |
| [0004](0004-lesson-authoring-format.md) | Lessons as schema-validated TypeScript modules | Accepted |
| [0005](0005-mastery-scheduling.md) | FSRS for spaced repetition over a prerequisite DAG | Accepted |
| [0006](0006-gcp-hosting-topology.md) | Firebase Hosting + Firestore + Firebase Auth | Accepted |
| [0007](0007-cicd-and-gcp-auth.md) | GitHub Actions deploying via Workload Identity Federation | Accepted |
| [0008](0008-london-school-tdd.md) | London-school TDD over a ports-and-adapters core | Accepted |
