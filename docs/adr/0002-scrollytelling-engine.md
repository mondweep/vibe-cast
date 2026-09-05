# 0002 — Hand-rolled scroll engine over a pure progress model

**Status:** Accepted · **Date:** 2026-09-05

## Context

Lessons are scroll-driven: the diagram is pinned while narrative text moves past,
and the figure transforms as a function of scroll position (PRD §7). This is the
riskiest UI in the product — it is easy to build something that hijacks scroll,
induces motion sickness, and cannot be tested.

## Decision

Build a thin engine of our own, structured so the interesting part is pure:

```
scrollTop, viewport, sectionGeometry  ──▶  LessonProgress  ──▶  SceneState
                                        (pure)             (pure)
```

- **Pinning** uses native CSS `position: sticky`. No JS involved.
- **Section entry/exit** uses `IntersectionObserver`.
- **Continuous progress** is read in a `requestAnimationFrame` loop, never in a
  scroll event handler.
- **`LessonProgress → SceneState` is a pure function** with no DOM access. This
  is where every animation decision lives, so the entire visual behaviour of a
  lesson is unit-testable at speed with no browser (ADR 0008).

The browser's own scrolling is never intercepted, overridden or smoothed.

## Alternatives considered

- **GSAP ScrollTrigger.** Mature and capable, and now freely licensed. Rejected
  because it wants to own both the scroll loop and the DOM mutation, which puts
  the animation logic somewhere unit tests cannot reach, and because it pulls the
  pinning implementation away from native `sticky`.
- **Scrollama.** Solves only step triggering, which `IntersectionObserver` gives
  us in a few lines. Not worth a dependency.
- **Native CSS `scroll-timeline`.** The right long-term answer and browser
  support is arriving, but it cannot express the scene transformations we need
  and degrades to nothing where unsupported. Revisit in a later ADR.

## Consequences

- We own the scroll maths, including its edge cases: variable-height sections,
  resize, mobile URL-bar viewport changes, and restoring position on back
  navigation. These need explicit tests.
- Scene logic is fully testable without a browser, which is the main reason for
  this shape.
- `prefers-reduced-motion` is a first-class path: the same `SceneState` is
  rendered as discrete steps rather than interpolated frames, so the reduced
  path shows the same content and cannot rot separately (PRD §7).
