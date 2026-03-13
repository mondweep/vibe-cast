# ADR-002: Database & Authentication

## Status
Accepted

## Context
SanskritSync requires persistent storage for user vocabulary, learning progress, and song cache. It needs user authentication and cross-device data sync.

## Decision
Supabase (PostgreSQL + Auth + Realtime).

## Rationale
- Single platform for auth + database + real-time subscriptions
- Row Level Security for multi-tenant data isolation
- Generous free tier for MVP
- TypeScript SDK with auto-generated types
- Real-time subscriptions for cross-device vocabulary sync

## Alternatives Rejected
- **Firebase**: Less SQL flexibility, vendor lock-in on query patterns
- **Self-hosted PostgreSQL + custom auth**: More infrastructure to manage for MVP
- **PlanetScale**: No built-in auth or real-time features
