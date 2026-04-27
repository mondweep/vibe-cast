# ADR-001: Frontend Framework — Next.js 14 App Router

**Status:** Accepted  
**Date:** 2026-04-27  
**Linear:** MON-47

## Context

We need a framework for the AWS Advanced Networking course platform that supports:
- Static generation of MDX content (performance, SEO)
- Server and client components for interactive labs
- Strong TypeScript support
- Active ecosystem and long-term maintenance

## Decision

**Use Next.js 14 with the App Router.**

## Rationale

- App Router enables co-located layouts, streaming, and granular RSC/client boundaries
- `next-mdx-remote` and Contentlayer provide mature MDX pipeline
- Netlify adapter supports Next.js 14 natively (ADR-005)
- No licensing or cost concerns
- Team familiarity via vibe-cast precedent

## Consequences

- Build output is static-first; client-side interactivity added selectively
- Requires Node.js 18+ (satisfied by CI environment)
- Some Lab components (D3.js, React Flow) require `"use client"` directive

## Alternatives Considered

| Alternative | Reason rejected |
|---|---|
| Remix | Less mature MDX story; smaller ecosystem |
| Astro | Excellent for static MDX but React interactivity more complex |
| Vite + React SPA | No SSG/SEO benefits for course content |
