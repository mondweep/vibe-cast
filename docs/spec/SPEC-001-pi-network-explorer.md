# SPEC-001: Pi Network Explorer App

**Status:** draft  
**Parent PRD:** PRD-001  
**ADRs:** ADR-001, ADR-002, ADR-003  
**Sprint:** S1  

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   Search View    │  │   Contribute     │  │   Dashboard  │  │
│  │                  │  │   Knowledge UI   │  │   (Activity) │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                    │                    │           │
│  ┌────────┴────────────────────┴────────────────────┴─────────┐ │
│  │              PubNub Subscription Manager                    │ │
│  │         (Real-time updates <500ms latency)                 │ │
│  └────────┬───────────────────────────────────────────────────┘ │
└───────────┼──────────────────────────────────────────────────────┘
            │
            │ HTTPS
            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Netlify Functions (Backend)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  - Query Handler                                         │   │
│  │  - Contribute Handler                                   │   │
│  │  - Vote Handler                                         │   │
│  │  - PubNub Publisher (API responses → PubNub channels)   │   │
│  └────────────┬─────────────────────────────────────────────┘   │
└───────────────┼──────────────────────────────────────────────────┘
                │
    ┌───────────┴─────────────┐
    │                         │
    ↓                         ↓
┌─────────────────┐   ┌────────────────────┐
│  Pi Network API │   │  PubNub Cloud      │
│  (pi.ruv.io)    │   │  (Real-time events)│
└─────────────────┘   └────────────────────┘
```

## Component Specifications

### 1. Frontend Components

#### SearchView
```typescript
interface SearchViewProps {
  apiKey: string;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  score: number;  // semantic relevance 0-1
  domain: string;
  createdAt: string;
}

interface SearchRequest {
  query: string;
  limit: number;  // default: 10
  offset: number; // default: 0
  domain?: string; // optional filter
}
```

**Behavior:**
- Accepts natural language search queries
- Sends request to `/api/search` endpoint (Netlify Function)
- Subscribes to `search_results_[sessionId]` PubNub channel
- Displays results with loading state
- Implements request debouncing (300ms)

#### ContributeView
```typescript
interface ContributeFormData {
  title: string;
  content: string;
  domain: string;
  tags: string[];
}

interface ContributionResponse {
  memoryId: string;
  status: 'accepted' | 'pending' | 'rejected';
  message: string;
  timestamp: string;
}
```

**Behavior:**
- Form validation (title: required, 1-200 chars; content: required, 10-5000 chars)
- Submits to `/api/contribute` endpoint
- Waits for PubNub confirmation on `contribution_updates_[sessionId]`
- Shows success/error toast with reason
- Clears form on success

#### Dashboard
```typescript
interface DashboardStats {
  totalMemories: number;
  totalDomains: number;
  activeUsers: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'contribution' | 'vote' | 'query';
  user: string;  // pseudonym
  timestamp: string;
  title?: string;
}
```

**Behavior:**
- Displays live stats subscribed via PubNub `network_stats` channel
- Shows recent activity feed (auto-updating)
- Updates every 2-5 seconds via polling fallback
- Shows user's personal stats if authenticated

### 2. Backend Functions (Netlify)

#### `/api/search` Function
```typescript
// Request
interface SearchRequest {
  query: string;
  limit: number;
  offset: number;
  domain?: string;
}

// Response (published to PubNub channel `search_results_[sessionId]`)
interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  executionTime: number;  // ms
}

// Implementation
export async function search(req: Request): Promise<Response> {
  const apiKey = req.headers.get('x-api-key');  // from frontend
  const { query, limit, offset, domain } = await req.json();
  
  // Query pi network REST API
  const piResponse = await fetch('https://pi.ruv.io/api/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit, offset, domain }),
  });
  
  const results = await piResponse.json();
  
  // Publish to PubNub
  await publishToPubNub(process.env.PUBNUB_PUBLISH_KEY, {
    channel: `search_results_${req.headers.get('x-session-id')}`,
    message: results,
  });
  
  return new Response(JSON.stringify({ status: 'published' }), { status: 200 });
}
```

#### `/api/contribute` Function
```typescript
// Request
interface ContributeRequest {
  title: string;
  content: string;
  domain: string;
  tags: string[];
}

// Implementation
export async function contribute(req: Request): Promise<Response> {
  const apiKey = req.headers.get('x-api-key');
  const sessionId = req.headers.get('x-session-id');
  const payload = await req.json();
  
  // Validate
  if (!payload.title || payload.title.length < 1 || payload.title.length > 200) {
    return new Response(JSON.stringify({ error: 'Invalid title' }), { status: 400 });
  }
  
  // Submit to pi network
  const piResponse = await fetch('https://pi.ruv.io/api/memories', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  const result = await piResponse.json();
  
  // Publish confirmation to PubNub
  await publishToPubNub(process.env.PUBNUB_PUBLISH_KEY, {
    channel: `contribution_updates_${sessionId}`,
    message: result,
  });
  
  return new Response(JSON.stringify({ status: 'published' }), { status: 200 });
}
```

#### `/api/vote` Function
```typescript
export async function vote(req: Request): Promise<Response> {
  const { memoryId, vote } = await req.json();  // vote: 1 | -1
  const apiKey = req.headers.get('x-api-key');
  
  const piResponse = await fetch(`https://pi.ruv.io/api/memories/${memoryId}/vote`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vote }),
  });
  
  return piResponse;
}
```

### 3. PubNub Channels

| Channel Name | Publisher | Subscribers | Message Format |
|--------------|-----------|-------------|-----------------|
| `search_results_[sessionId]` | Backend | Frontend | `SearchResponse` |
| `contribution_updates_[sessionId]` | Backend | Frontend | `ContributionResponse` |
| `network_stats` | Backend (polling daemon) | Dashboard | `DashboardStats` |
| `activity_feed` | Backend | Dashboard | `ActivityItem` |

## Data Models

### SearchResult
```typescript
{
  id: string;              // Pi network memory ID
  title: string;
  content: string;
  score: number;           // 0-1, semantic relevance
  domain: string;          // knowledge domain
  authorPseudonym: string; // SHAKE-256 hash
  createdAt: ISO8601;
  votes: { up: number; down: number; };
}
```

### Memory (Pi Network Standard)
```typescript
{
  id: string;
  title: string;
  content: string;
  domain: string;
  tags: string[];
  authorId: string;        // SHAKE-256 pseudonym
  createdAt: ISO8601;
  updatedAt: ISO8601;
  bayesianScore: number;   // Quality score from network
  citations: string[];     // Related memory IDs
}
```

## API Contracts

### Query Pipeline

```
Frontend
  → POST /api/search (Content-Type: application/json)
     Headers: { x-api-key, x-session-id }
     Body: { query, limit, offset, domain }
  ← 200 OK { status: "published" }
  → Subscribe to PubNub channel `search_results_[sessionId]`
  ← Message: SearchResponse (real-time)
  → Display results
```

### Contribution Pipeline

```
Frontend
  → POST /api/contribute (multipart form-data)
     Body: { title, content, domain, tags }
  ← 200 OK or 400 Bad Request
  → Subscribe to PubNub channel `contribution_updates_[sessionId]`
  ← Message: ContributionResponse (real-time confirmation)
```

## Error Handling Matrix

| Scenario | Detection | Recovery | Fallback |
|----------|-----------|----------|----------|
| Pi network API timeout (>5s) | No response | Retry with exponential backoff (2s, 4s, 8s) | Show "Network unavailable" error |
| Invalid API key | 401 from pi.ruv.io | Prompt user to re-enter key | Disable features, show auth form |
| PubNub connection lost | `SocketEvent.DISCONNECT` | Auto-reconnect (PubNub SDK built-in) | Fallback to polling every 2s |
| Rate limit hit (429) | HTTP 429 from pi.ruv.io | Wait 60s before retry | Show "Rate limited" message |
| Malformed user input | Frontend validation | Clear error field, highlight in red | Block submission |
| PubNub message publish fails | Catch in Netlify Function | Log error, return 500 | Frontend shows "Update failed" toast |

## Testing Strategy

### Unit Tests
- Search input validation (debouncing, string sanitization)
- Vote calculation logic
- Component rendering with mock data

### Integration Tests
- Netlify Function + Mock Pi API (use nock or similar)
- PubNub message flow (use PubNub test harness)
- Authentication flow (API key validation)

### Acceptance Tests (Eval Suite)
- Query returns results with relevance score ≥0.5 (golden set: 50 test queries)
- Contributed knowledge appears in search within 5 seconds
- Dashboard stats update live within 500ms of network activity
- Error handling: API key validation, rate limiting, timeout handling
- Mobile: All interactions work on iOS/Android (BrowserStack)

## Implementation Order (Phased)

### Phase 1 (MVP) - Weeks 1-2
1. Netlify Function scaffold (basic hello world)
2. Frontend boilerplate (React + Vite)
3. SearchView component with mock data
4. `/api/search` function connecting to pi.ruv.io
5. PubNub SDK integration (pub/sub, message handling)
6. Dashboard with static stats
7. Error handling stubs
8. End-to-end test (search → results)

### Phase 2 - Week 3
1. ContributeView (form, validation)
2. `/api/contribute` function
3. Vote functionality
4. PubNub activity feed
5. Real-time dashboard updates
6. Error matrix implementation

### Phase 3 - Week 4+
1. Performance optimization (caching, request deduplication)
2. Mobile responsive design refinement
3. Accessibility audit and fixes
4. Load testing and stress testing

## Acceptance Criteria (Traced to PRD Metrics)

| PRD Metric | Acceptance Criterion | Test Method |
|------------|---------------------|-------------|
| Page load <2s | Lighthouse score ≥90 (Performance) | `lighthouse` CLI |
| Real-time latency <500ms | PubNub message roundtrip <500ms in 99% of cases | Load test with 100 concurrent users |
| API query <3s | 95% of queries respond in <3s | Synthetic monitoring against pi.ruv.io |
| Search accuracy ≥85% | Golden set of 50 queries, ≥85% rated "relevant" | Manual evaluation + LLM judge |
| 100% feature demo | All 5 core features have walkthrough UI | Feature completeness checklist |
| Uptime ≥99% | 99%+ availability during 72-hour test window | Uptime monitoring (Netlify + PubNub SLA) |

---

*Specifications are the source of truth, not code.* — BHIL
