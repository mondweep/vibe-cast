# ADR-001: Frontend Framework

## Status
Accepted

## Context
SanskritSync needs a frontend framework that supports real-time UI updates (lyrics sync), audio/video integration (YouTube player), and responsive design.

## Decision
React + Vite + TypeScript with Tailwind CSS.

## Rationale
- Fast development cycle with Vite HMR
- Strong ecosystem for real-time UIs and audio/video integration
- TypeScript provides type safety across Supabase-generated types
- Tailwind CSS for rapid, consistent styling

## Alternatives Rejected
- **Next.js**: SSR is unnecessary for this client-heavy app
- **Svelte**: Smaller ecosystem for audio/video integration libraries
- **Vue**: Smaller ecosystem for YouTube/audio libraries compared to React
