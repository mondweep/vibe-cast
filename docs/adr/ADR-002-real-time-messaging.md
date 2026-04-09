# ADR-002: Real-Time Messaging Strategy (PubNub vs Alternatives)

**Status:** approved  
**Type:** architecture  
**Date:** 2026-04-09  
**Related PRD:** PRD-001  
**Related SPEC:** SPEC-001  

## Problem Statement

Frontend clients need to receive real-time updates from backend API queries without polling. However, Netlify Functions timeout after 10-26 seconds and cannot maintain persistent SSE connections. We need a real-time messaging layer that:
- Decouples backend (request/response) from real-time (push notifications)
- Works with Netlify's timeout constraints
- Provides <500ms latency for dashboard updates
- Scales to 100+ concurrent users
- Minimizes infrastructure complexity

## Decision Drivers

| Driver | Priority | Target |
|--------|----------|--------|
| Latency (<500ms) | P0 | Real-time feel for demo |
| No serverless timeout conflict | P0 | Works with Netlify 10-26s timeout |
| Free tier availability | P0 | MVP phase cost-free |
| Easy integration | P1 | <2h to implement |
| Reliable delivery | P1 | No lost messages for demo |
| Scalability (concurrent users) | P1 | ≥100 without issues |
| Vendor lock-in risk | P2 | Accept minimal for MVP |

## Options Evaluated

### Option A: PubNub (Chosen)
- **Free Tier:** 30 days free trial, then $29/month (message quota: 1M/month free tier)
- **Latency:** <100ms P99 (industry-leading)
- **Delivery:** Guaranteed message ordering per channel
- **Integration:** JavaScript SDK <50 lines of code
- **Concurrency:** Easily handles 1000+ concurrent subscribers

**Pros:**
- ✅ Purpose-built for real-time pub/sub
- ✅ Best-in-class latency (<100ms)
- ✅ Zero server-side complexity (fully managed)
- ✅ Excellent JavaScript SDK and docs
- ✅ Free tier during MVP development
- ✅ No timeout conflicts with Netlify Functions

**Cons:**
- ⚠️ Paid service after trial (vendor lock-in)
- ⚠️ Message quota on free tier (mitigation: demo has limited traffic)
- ⚠️ Learning curve for pub/sub patterns

### Option B: Firebase Realtime Database
- **Free Tier:** Yes, generous (100 concurrent connections, 1GB storage)
- **Latency:** 100-300ms typical
- **Delivery:** Eventual consistency (not ordered)
- **Integration:** Firebase SDK, moderate complexity

**Pros:**
- ✅ Free tier very generous
- ✅ Built-in authentication
- ✅ Persistent storage (bonus feature)

**Cons:**
- ❌ Higher latency than PubNub (not meeting <500ms target at peak)
- ❌ Eventual consistency (not ideal for demo)
- ❌ Overkill if we don't need persistence
- ❌ More complex SDK setup

### Option C: Websockets + Custom Server
- **Free Tier:** Only if self-hosted (AWS EC2 free tier, etc.)
- **Latency:** <50ms (optimal)
- **Delivery:** Full control
- **Integration:** High complexity (build multiplexing, reconnection logic)

**Pros:**
- ✅ Full control
- ✅ Lowest possible latency

**Cons:**
- ❌ Requires server management (defeats serverless purpose)
- ❌ Scaling to 100+ users requires load balancing
- ❌ High implementation complexity (weeks vs hours)
- ❌ Operational burden (monitoring, error handling)

### Option D: Polling (No Real-Time Service)
- **Free Tier:** Yes (reuse Netlify Functions)
- **Latency:** 2-5 seconds (unacceptable)
- **Delivery:** Simple
- **Integration:** Trivial

**Pros:**
- ✅ Zero new dependencies
- ✅ Zero cost

**Cons:**
- ❌ Latency 4-10x worse than PubNub
- ❌ Poor UX (noticeable delays)
- ❌ Fails PRD metric: "Real-time update latency <500ms"
- ❌ Higher bandwidth usage

## Chosen Option: PubNub

**Rationale:**
1. **Latency (P0):** <100ms P99 latency satisfies PRD requirement <500ms
2. **Serverless Harmony (P0):** Zero timeout conflicts with Netlify (PubNub maintains connection, not Netlify)
3. **Free MVP Phase (P0):** 30-day trial + free tier 1M msg/month sufficient for demo
4. **Integration Speed (P1):** <50 lines of code vs custom servers (weeks)
5. **Reliability (P1):** Guaranteed message ordering per channel

**Tradeoff:** Vendor lock-in (PubNub proprietary). Mitigation: Use abstract pub/sub interface (easy to swap provider later).

## Architecture Decision

```
Netlify Function (short-lived)
  ↓
  Gets response from pi.ruv.io
  ↓
  Publishes to PubNub channel
  ↓
  Returns immediately (no wait for client)

Client (long-lived)
  ↓
  Subscribes to PubNub channel
  ↓
  Receives message <100ms after publish
  ↓
  Updates UI instantly
```

This pattern decouples request/response timing from real-time delivery timing.

## Implementation Notes

### Backend (Netlify Function)
```javascript
const PubNub = require('pubnub');

const pubnub = new PubNub({
  publishKey: process.env.PUBNUB_PUBLISH_KEY,
  subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY,
  uuid: 'backend',
});

// After getting response from pi network
await pubnub.publish({
  channel: `search_results_${sessionId}`,
  message: result,
});
```

### Frontend (React)
```javascript
const PubNub = require('pubnub');

const pubnub = new PubNub({
  subscribeKey: process.env.REACT_APP_PUBNUB_SUBSCRIBE_KEY,
  uuid: 'frontend',
});

useEffect(() => {
  pubnub.addListener({
    message: (event) => {
      setResults(event.message.results);
    },
  });

  pubnub.subscribe({ channels: [`search_results_${sessionId}`] });
}, [sessionId]);
```

## Consequences

**Positive:**
- Real-time UX without building custom server
- Fast iteration (SDK handles reliability)
- Scales automatically (no infrastructure management)
- Clear separation of concerns (request vs push)

**Negative:**
- Adds external dependency (reliability = PubNub uptime)
- Vendor lock-in (mitigation: abstract interface)
- Requires API keys management
- Cost after free trial ($29/month estimated)

## Acceptance Criteria
- [x] Real-time latency <500ms (measured in 90th percentile)
- [x] No timeout conflicts with Netlify Functions
- [x] Free tier available during MVP (30-day trial + 1M msg/month)
- [x] JavaScript SDK <50 lines for pub/sub integration
- [x] Message ordering guaranteed per channel

## Review Triggers
- If latency regularly exceeds 500ms → evaluate alternative (Firebase, AWS Kinesis)
- If message quota exceeded (free tier) → upgrade plan or reduce broadcast frequency
- If PubNub uptime <99.9% → evaluate self-hosted WebSocket option
- If vendor lock-in becomes critical issue → migrate to Supabase Realtime or Socket.io

---

*Specifications are the source of truth, not code.* — BHIL
