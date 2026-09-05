# 0005 — FSRS for spaced repetition over a prerequisite DAG

**Status:** Accepted · **Date:** 2026-09-05

## Context

Mastery must decay when unrehearsed and the app must decide what to show next
(PRD §5.4). Two mechanisms interact: *readiness* (do I have the prerequisites?)
and *retention* (am I about to forget this?).

## Decision

Keep them separate and compose them.

- **Readiness** comes from the prerequisite DAG (ADR 0004). A concept is ready
  when its parents are at or above a mastery threshold.
- **Retention** uses **FSRS** (Free Spaced Repetition Scheduler) via `ts-fsrs`,
  one card per concept, graded from assessment performance rather than a
  self-reported "how well did you know that?".
- **The next-item queue** is: overdue reviews first, then the ready frontier,
  then optional exploration.

Grading maps assessment outcomes onto FSRS ratings; that mapping is a pure
function and is unit-tested, because it is the single point where the whole
progression model can silently go wrong.

## Alternatives considered

- **SM-2 (Anki's classic algorithm).** Simpler and well understood. Rejected
  because FSRS is measurably better calibrated on real review logs, is
  MIT-licensed with a maintained TypeScript implementation, and costs us nothing
  extra to adopt now — whereas migrating schedules later is painful.
- **Fixed Leitner boxes.** Too coarse; ignores per-item difficulty entirely.
- **No scheduling, just free navigation.** Rejected: it makes "mastery" a
  self-assessment, which PRD §5.3 explicitly rules out.

## Consequences

- Scheduling state is per-user and must sync across devices (ADR 0006).
- FSRS is a dependency in the domain core, so it sits behind a `Scheduler` port
  and is stubbed in tests (ADR 0008); domain tests never depend on its internals.
- The app can and will show mastery *falling*. This is deliberate and needs
  careful presentation so it reads as honest rather than punitive.
