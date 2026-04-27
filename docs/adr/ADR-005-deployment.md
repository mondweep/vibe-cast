# ADR-005: Deployment — Netlify

**Status:** Accepted  
**Date:** 2026-04-27  
**Linear:** MON-47

## Context

The course platform must be publicly accessible, support preview deployments for PR review, and integrate with GitHub Actions CI.

## Decision

**Deploy to Netlify (connected via Mondweep's Netlify MCP connector).**

## Rationale

- Mondweep already has an active Netlify account and MCP connection
- Netlify provides automatic preview deployments on every PR (critical for course content review)
- Next.js 14 is natively supported via Netlify's Next.js Runtime
- Edge Functions available for any future personalization (persona-based redirects)
- No additional infrastructure setup required

## Consequences

- Free tier limits apply (100GB bandwidth/month, 300 build minutes)
- Custom domain configuration required before launch
- Netlify Analytics available for learner behaviour tracking (Phase 4)

## Alternatives Considered

| Alternative | Reason rejected |
|---|---|
| GitHub Pages | No server-side rendering; Next.js support limited |
| Vercel | Also connected, but Netlify preferred for existing workflow |
| AWS Amplify | Ironic but adds infrastructure complexity for a course about AWS |
