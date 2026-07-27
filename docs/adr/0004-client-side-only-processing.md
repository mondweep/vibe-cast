# ADR-0004: Client-side-only processing, zero network egress

- **Status:** Accepted
- **Date:** 2026-07-27
- **Deciders:** Architecture swarm

## Context

The console must parse a 31-page PDF and store bulletins across sessions. The obvious architecture — upload to a server, parse there, store in a database — is well-trodden and would make extraction easier (Python's `camelot` and `tabula` are better table extractors than anything in JavaScript).

But the deployment context argues against it:

- **Control rooms lose connectivity during floods.** This is not a hypothetical edge case; it is the exact circumstance in which the tool is needed. A tool that requires a round-trip to parse is a tool that fails at peak demand.
- **A backend is an operational burden** ASDMA has not asked for and would have to maintain: servers, TLS certificates, backups, an on-call rotation.
- **Bulletin data is public**, so confidentiality is a weak argument — but *provenance* is not. An officer needs certainty about which bulletin they are looking at, and local-only storage makes that trivially auditable.

## Decision

**Everything happens in the browser.** No backend, no API, no database, no telemetry, no analytics.

- Parsing: `pdfjs-dist` in the browser, off the main thread via its worker.
- Storage: IndexedDB, keyed by content hash.
- Export: client-generated Blob downloads.
- Deployment: static files on a CDN (ADR-0007).

**Enforced, not merely intended:**

1. `connect-src 'self'` in the CSP (`netlify.toml`). Even if application code attempted an upload, the browser would refuse it. The guarantee is structural rather than behavioural.
2. A test asserts the load-bulletin use case never calls `fetch`.
3. No analytics or error-reporting dependency is present in `package.json`, so there is nothing to accidentally enable.

## Consequences

**Positive**

- Works fully offline after first load (NFR-6). The bulletin never leaves the officer's machine.
- Zero hosting cost, zero operational burden, no secrets to manage, no server to breach.
- No upload latency: parse begins immediately on file selection.
- The privacy claim is verifiable by a user reading the CSP header, not a promise they have to trust.

**Negative**

- **JavaScript PDF table extraction is materially harder than Python's.** This is the real cost, and it is what ADR-0002's four-stage pipeline exists to pay.
- Parsing competes with the UI for the main thread. Mitigated by pdf.js's worker.
- Storage is per-browser: bulletins do not sync between an officer's laptop and their phone. Accepted — the export function (FR-1.10) covers deliberate sharing.
- IndexedDB is unavailable in some private-browsing modes. Mitigated by the in-memory repository fallback, with the session-only limitation stated in the UI.

## Alternatives considered

- **Server-side parsing with Python.** Rejected: better extraction, but forfeits offline operation — the property that matters most when the tool matters most.
- **Netlify Functions for parsing.** Rejected: same objection, plus cold starts and a 10 MB payload ceiling.
- **Hybrid — client-side with optional server fallback.** Rejected for v1: two extraction implementations to keep in agreement, doubling the surface for silent divergence. Reconsider only if deterministic client extraction proves inadequate on real bulletin drift.
