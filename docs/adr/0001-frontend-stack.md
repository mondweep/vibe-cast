# 0001 — React + TypeScript + Vite for the frontend

**Status:** Accepted · **Date:** 2026-09-05

## Context

The app is a content-heavy learning tool with three demanding parts: scroll-driven
animation, interactive assessment widgets that must capture fine-grained learner
input, and authenticated cross-device progress state. It must be testable
outside a browser (ADR 0008) and cheap to serve as static assets (ADR 0006).

## Decision

React 18 + TypeScript, built with Vite, shipped as a static SPA.

TypeScript is non-negotiable rather than a preference: the prerequisite graph,
the lesson schema and the assessment result types are the core domain, and we
want them checked at build time (ADR 0004).

## Alternatives considered

- **Svelte / SvelteKit.** Genuinely better ergonomics for animation and smaller
  bundles. Rejected on ecosystem depth for the interactive-widget work and on
  the team's existing React familiarity — this project's risk is content
  authoring cost, not framework overhead, so we spend the novelty budget
  elsewhere.
- **Astro with islands.** Excellent for mostly-static content sites. Rejected
  because the app is closer to an application than a document set: auth, live
  progress state and stateful assessment run across the whole session, not in
  isolated islands.
- **Next.js.** Rejected as unnecessary: there is no server rendering requirement,
  and SSR would force us off pure static hosting for no gain.

## Consequences

- Ships as static files, so Firebase Hosting's CDN serves everything (ADR 0006).
- No server-side rendering, so first paint depends on the JS bundle. Mitigated by
  route-level code splitting: a lesson loads its own scene code on demand.
- React's declarative model fights per-frame animation. Handled by keeping
  animation state outside React and driving the DOM imperatively via refs at the
  leaves (ADR 0002).
