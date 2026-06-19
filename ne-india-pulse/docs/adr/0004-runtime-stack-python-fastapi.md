# ADR-0004: Runtime stack — Python 3.12 + FastAPI

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** Owner, system-architect (Opus)
- **Tags:** stack, backend

## Context

Phase 1 must pick the app stack for Cloud Run. The core domain is data-heavy
(download/parse GKG, aggregate themes/tone/entities); the Phase-0 prototype that
proved feasibility is already Python. We need fast iteration, easy testing
(London-School), and a single deployable container.

## Decision

We will build in **Python 3.12** with **FastAPI** (ASGI, served by `uvicorn`),
packaged as one container.

- **Backend:** FastAPI serves both a small JSON read API and a server-rendered
  HTML dashboard (Jinja2) — no separate frontend build in v1 (keeps it one
  container, lowest ops).
- **Testing:** `pytest` + `unittest.mock` for outside-in London-School TDD.
- **Domain code:** plain dataclasses; ports as `typing.Protocol`/ABCs to enable
  mockist tests and swap GDELT adapters.

## Alternatives considered

- **TypeScript full-stack (Next.js)** — best UI DX, but would rewrite the proven
  ingestion logic and add a build toolchain; data-aggregation core is more
  natural in Python.
- **Python + separate SPA** — nicer UI, but adds a second build/deploy unit;
  defer to v2 if the dashboard grows.

## Consequences

- Reuse and harden the Phase-0 prototype into the Ingestion context.
- One container, one process model on Cloud Run; simple Dockerfile.
- Dashboard is server-rendered/minimal in v1; richer interactivity is a v2 ADR.
