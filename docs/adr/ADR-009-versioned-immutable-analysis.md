# ADR-009: Analyses are immutable and version-stamped

**Status:** Accepted · **Date:** 2026-09-16 · **Drives:** I-A4, FR-A4

## Context

The detector will change — ADR-002 explicitly anticipates retuned thresholds and
a v2 hybrid classifier. But the user builds a mental model from a sequence of
numbers over weeks: "I was at 22, I cut out wine, now I'm at 14." If the meaning
of that number shifts underneath them, every conclusion they drew silently
becomes unreliable, and a Trial Verdict computed across a version boundary may
be measuring our code change rather than their behaviour change.

ADR-001 makes this sharper: we cannot re-analyse old nights, because the audio
is gone. So a mixed-version history is permanent, not a temporary migration state.

## Decision

1. **A `NightAnalysis` is immutable once written.** No field is ever updated in
   place. Correcting an analysis means writing a new one with a new version.
2. **Every analysis records `analyserVersion`**, a semver string bumped whenever
   any threshold, predicate or formula changes. The version is part of the
   stored document and is surfaced in the UI on the night-detail view.
3. **Comparisons across versions are flagged, not silently performed.** Trend
   charts draw a version-boundary marker. A Trial whose Baseline Window and
   intervention nights span different analyser versions returns
   `Inconclusive` with reason `analyser_version_mismatch` rather than a Verdict.
4. **`CHANGELOG-analyser.md` records what changed in each version and its
   expected direction of effect on SI.**

## Alternatives considered

1. **Mutable analyses, always recomputed with the latest detector.** Standard,
   and gives a consistent history. Impossible here — ADR-001 discarded the
   audio, so there is nothing to recompute from.
2. **Store enough intermediate features to allow re-analysis.** Would let us
   re-run stages 4–6 on old nights. Genuinely attractive, and partially adopted:
   we already persist per-candidate features, so *classifier* changes can be
   replayed even though *framing* changes cannot. The version scheme
   distinguishes these: a minor bump means replayable, a major bump does not.
3. **Ignore the problem.** Rejected: it converts a good product into a
   quietly misleading one, and the whole point of G2 is trustworthiness.

## Consequences

**Positive**
- The user's historical numbers never change meaning without being told.
- Trial Verdicts cannot be corrupted by a deploy that happened mid-trial.
- Debugging is possible: we know exactly which code produced which number.
- Minor-version classifier improvements can be replayed over stored candidate
  features, recovering much of what alternative 2 offered.

**Negative**
- Users will see version-boundary markers on charts and need a short
  explanation — added UI complexity for a subtle concept.
- Trials that straddle a deploy are wasted and must be restarted. Mitigated by
  not shipping analyser changes while any trial is active, where possible.
- Storage grows with re-analysis rather than replacing.

## Validation

- Test: analysing the same candidate set twice yields byte-identical output.
- Test: a Trial spanning two analyser versions returns `Inconclusive` with the
  documented reason.
- CI fails if a detection threshold constant changes without a version bump.
