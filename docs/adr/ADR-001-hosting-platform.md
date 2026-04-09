# ADR-001: Hosting Platform Selection (Netlify vs Vercel vs Cloud Run)

**Status:** approved  
**Type:** architecture  
**Date:** 2026-04-09  
**Related PRD:** PRD-001  
**Related SPEC:** SPEC-001  

## Problem Statement

We need to host a web application that queries an external API (pi.ruv.io) and publishes real-time updates to frontend clients. The platform must:
- Support serverless functions for backend logic
- Allow secure storage of API keys
- Scale from MVP (free tier) to production
- Minimize cold start latency
- Support long-lived external connections (for PubNub)

## Decision Drivers

| Driver | Priority | Target |
|--------|----------|--------|
| Free tier for MVP development | P0 | Zero cost until scale |
| Deployment simplicity | P0 | <5 min from git push to live |
| Function timeout flexibility | P1 | ≥10 seconds (pi.ruv.io query time) |
| Real-time capabilities (SSE/WebSocket) | P2 | Not critical (PubNub handles this) |
| Ecosystem & community | P1 | Good documentation, active support |
| Cold start latency | P2 | <1s acceptable for MVP |

## Options Evaluated

### Option A: Netlify (Chosen)
- **Free Tier:** 125K function invocations/month, includes 300 build hours
- **Function Timeout:** 10s (free), 26s (Pro)
- **Real-time:** No native SSE/WebSocket; use PubNub instead
- **Setup:** Automatic git-based deployments
- **Env Variables:** Yes, supported securely
- **Cost at Scale:** $19/month Pro or pay-as-you-go

**Pros:**
- ✅ Shortest deployment feedback loop (git push → live in <1 min)
- ✅ Generous free tier for MVP phase
- ✅ Netlify + React = native vibe-cast ecosystem
- ✅ Built-in environment variable management
- ✅ Works perfectly with PubNub (no timeout conflict)

**Cons:**
- ⚠️ Default timeout only 10s (must upgrade for longer API calls)
- ⚠️ No native WebSocket support (not needed with PubNub)

### Option B: Vercel
- **Free Tier:** 100 GB bandwidth, serverless functions
- **Function Timeout:** 10s (free), 60s (Pro)
- **Real-time:** Full WebSocket support (but unnecessary)
- **Setup:** Similar to Netlify
- **Cost at Scale:** $20/month Pro

**Pros:**
- ✅ Longer timeouts on free tier
- ✅ Next.js ecosystem tie-in
- ✅ Edge Functions for lower latency

**Cons:**
- ⚠️ Overkill for our use case (don't need WebSocket)
- ⚠️ Slightly higher mental overhead than Netlify

### Option C: Google Cloud Run
- **Free Tier:** 2M invocations/month, 360K vCPU seconds
- **Function Timeout:** 3600s (very generous)
- **Real-time:** Full support
- **Setup:** More complex (gcloud CLI, Docker)
- **Cost at Scale:** $0.00001667/GB-second (very cheap at scale)

**Pros:**
- ✅ Longest timeout (3600s) — can handle any API call
- ✅ Cheapest at scale
- ✅ True containerization (more control)

**Cons:**
- ❌ Slower deployment feedback (5-10 min Docker build)
- ❌ Steeper learning curve for quick MVP iteration
- ❌ Requires gcloud setup, authentication
- ❌ Overkill for current scope

## Chosen Option: Netlify

**Rationale:**
1. **Iteration Speed (P0):** Git-based deployments enable fastest feedback loop — critical for BHIL spec validation
2. **Free MVP (P0):** 125K invocations/month supports 100+ daily active users without cost
3. **API Key Security (P0):** Native environment variable management prevents accidental exposure
4. **PubNub Synergy (P1):** No timeout conflict; PubNub handles real-time, Netlify handles API proxying
5. **React Ecosystem (P1):** Native integration with existing vibe-cast patterns

**Tradeoff:** Must upgrade to Netlify Pro ($19/month) if pi.ruv.io queries exceed 10s timeout. Mitigation: Implement request timeout handling and fallback strategies.

## Consequences

**Positive:**
- Fast iterations on specification → implementation → validation cycle
- Low friction onboarding (git push deploys)
- No infrastructure overhead
- Easily scalable when needed

**Negative:**
- If API calls regularly exceed 10s, must upgrade Pro plan
- No native WebSocket support (mitigated by PubNub)
- Netlify free tier could throttle at very high scale (unlikely for MVP)

## Acceptance Criteria
- [x] Deploy app from git in <2 min
- [x] Environment variables stored securely (no secrets in code)
- [x] Function timeout sufficient for pi.ruv.io queries
- [x] PubNub integration works without issues
- [x] Cost remains <$0/month during MVP phase

## Review Triggers
- If average API response time exceeds 8s → evaluate Vercel Pro (60s timeout)
- If monthly invocations exceed 125K → plan upgrade strategy
- If real-time SSE becomes requirement → evaluate Vercel/Cloud Run

---

*Specifications are the source of truth, not code.* — BHIL
