# 0003 — SVG-first diagrams driven by a declarative scene model

**Status:** Accepted · **Date:** 2026-09-05

## Context

Every lesson's explanation *is* its diagram. Diagrams must animate under scroll
control, be inspectable and accessible, look correct at any zoom, and support the
hyperframe inset (PRD §7). Authoring cost is the project's headline risk
(PRD §10), so the rendering layer must be composable.

## Decision

Diagrams are SVG, rendered from a declarative `SceneState` (ADR 0002). A scene is
a list of typed marks — point, vector, curve, region, arrow, label, grid — and
rendering is a pure function from scene to SVG elements.

Escape hatch: a mark type may render to `<canvas>` where element counts make DOM
nodes untenable (particle fields, dense vector fields, fractal detail). The scene
model does not change; only that mark's renderer does.

## Alternatives considered

- **Canvas/WebGL throughout.** Faster for many elements, but loses text
  selection, DOM-level accessibility, and CSS styling, and makes the reduced-motion
  static fallback much harder. Kept as a per-mark escape hatch instead of a
  default.
- **Pre-rendered video or GIF (e.g. Manim exports).** Beautiful output, and Manim
  is the obvious tool for this subject. Rejected because video cannot respond to
  scroll position or learner input, weighs far more over the wire, and gives no
  path to the predict-then-run assessment format, which needs the animation to
  react to an answer.
- **A charting library (D3, Visx).** These are built for data, not for
  mathematical objects under transformation. We would fight them. D3's numeric
  helpers (scales, interpolation, path generation) are still used as libraries.

## Consequences

- Every diagram is composed from a small primitive library, so the marginal cost
  of lesson *n* falls as the library grows. This is the main lever on the content
  risk, and lesson authoring hours are tracked as a metric.
- Scene state is serialisable, so a diagram at any scroll position can be
  snapshot-tested as data rather than as a rendered image.
- Text alternatives are generated from the scene model rather than written by
  hand, so a figure cannot ship without one.
