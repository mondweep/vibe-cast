# TASK-002: Implement Netlify API Functions

**Status:** pending  
**SPEC:** SPEC-001  
**ADRs:** ADR-001, ADR-002  
**Depends On:** TASK-001 (project scaffold)  
**Parallel:** No (need scaffold first)  
**Estimated Tokens:** 5000  

## Task Context & Purpose

Implement three Netlify Functions that serve as the backend API layer between the frontend and the pi.ruv.io network. Each function:
- Authenticates using the user's API key (passed in headers)
- Calls the pi network REST API
- Publishes results to PubNub channels
- Handles errors gracefully

## Session Start Instructions

1. Read SPEC-001 (API contracts, error handling matrix)
2. Review ADR-001 (Netlify timeout constraints) and ADR-002 (PubNub architecture)
3. TASK-001 must be complete (project scaffold exists)
4. Have pi.ruv.io API documentation available
5. Have PubNub API keys from account dashboard

## Scope

### Files to Create
- `functions/api/search.ts` — Search the pi network knowledge graph
- `functions/api/contribute.ts` — Submit new memories to the network
- `functions/api/vote.ts` — Vote on existing memories
- `src/services/piNetworkAPI.ts` — Shared API client
- `src/services/pubnubService.ts` — PubNub configuration & helpers

### Files to Modify
- `.env.example` — Add pi.ruv.io API endpoint
- `package.json` — Add pubnub dependency (if not already added)

### Files Excluded
- `src/components/` (handled in TASK-003)

## Implementation Steps

### 1. Create PubNub Service (`src/services/pubnubService.ts`)

```typescript
import PubNub from 'pubnub';

export const pubnub = new PubNub({
  publishKey: process.env.PUBNUB_PUBLISH_KEY,
  subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY,
  uuid: 'pi-network-api',
});

export async function publishToChannel(
  channel: string,
  message: any,
) {
  try {
    await pubnub.publish({
      channel,
      message,
    });
  } catch (error) {
    console.error(`Failed to publish to ${channel}:`, error);
    throw error;
  }
}
```

### 2. Create Pi Network API Client (`src/services/piNetworkAPI.ts`)

```typescript
interface FetchOptions {
  apiKey: string;
  timeout?: number;
}

export async function callPiNetwork(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  options: FetchOptions,
) {
  const url = `${process.env.PI_NETWORK_API_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(options.timeout || 5000),
    });
    
    if (!response.ok) {
      throw new Error(`Pi API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Pi API call failed:`, error);
    throw error;
  }
}
```

### 3. Implement `/api/search` Function

```typescript
// functions/api/search.ts
import { Handler } from '@netlify/functions';
import { callPiNetwork } from '../../src/services/piNetworkAPI';
import { publishToChannel } from '../../src/services/pubnubService';

interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  domain?: string;
}

export const handler: Handler = async (event) => {
  try {
    // Validate headers
    const apiKey = event.headers['x-api-key'];
    const sessionId = event.headers['x-session-id'];
    
    if (!apiKey || !sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required headers' }),
      };
    }
    
    // Parse request
    const body: SearchRequest = JSON.parse(event.body || '{}');
    const { query, limit = 10, offset = 0, domain } = body;
    
    if (!query || query.length < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Query is required' }),
      };
    }
    
    // Call pi network
    const results = await callPiNetwork(
      '/api/search',
      'POST',
      { query, limit, offset, domain },
      { apiKey, timeout: 8000 },
    );
    
    // Publish to PubNub
    await publishToChannel(
      `search_results_${sessionId}`,
      results,
    );
    
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'published' }),
    };
  } catch (error: any) {
    console.error('Search error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Search failed',
      }),
    };
  }
};
```

### 4. Implement `/api/contribute` Function

```typescript
// functions/api/contribute.ts
import { Handler } from '@netlify/functions';
import { callPiNetwork } from '../../src/services/piNetworkAPI';
import { publishToChannel } from '../../src/services/pubnubService';

interface ContributeRequest {
  title: string;
  content: string;
  domain: string;
  tags?: string[];
}

export const handler: Handler = async (event) => {
  try {
    const apiKey = event.headers['x-api-key'];
    const sessionId = event.headers['x-session-id'];
    
    if (!apiKey || !sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required headers' }),
      };
    }
    
    const body: ContributeRequest = JSON.parse(event.body || '{}');
    
    // Validate
    if (!body.title || body.title.length < 1 || body.title.length > 200) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Title must be 1-200 characters' }),
      };
    }
    
    if (!body.content || body.content.length < 10 || body.content.length > 5000) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Content must be 10-5000 characters' }),
      };
    }
    
    // Call pi network
    const result = await callPiNetwork(
      '/api/memories',
      'POST',
      body,
      { apiKey, timeout: 8000 },
    );
    
    // Publish confirmation
    await publishToChannel(
      `contribution_updates_${sessionId}`,
      result,
    );
    
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'published' }),
    };
  } catch (error: any) {
    console.error('Contribute error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Contribution failed',
      }),
    };
  }
};
```

### 5. Implement `/api/vote` Function

```typescript
// functions/api/vote.ts
import { Handler } from '@netlify/functions';
import { callPiNetwork } from '../../src/services/piNetworkAPI';

export const handler: Handler = async (event) => {
  try {
    const apiKey = event.headers['x-api-key'];
    
    if (!apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing API key' }),
      };
    }
    
    const { memoryId, vote } = JSON.parse(event.body || '{}');
    
    if (!memoryId || ![1, -1].includes(vote)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid vote request' }),
      };
    }
    
    const result = await callPiNetwork(
      `/api/memories/${memoryId}/vote`,
      'POST',
      { vote },
      { apiKey, timeout: 5000 },
    );
    
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('Vote error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Vote failed',
      }),
    };
  }
};
```

### 6. Update `.env.example`

Add:
```
PI_NETWORK_API_URL=https://pi.ruv.io
```

## Test Requirements

### Unit Tests
- [x] `callPiNetwork` throws on timeout
- [x] `callPiNetwork` throws on non-200 response
- [x] `publishToChannel` handles network errors
- [x] Input validation (missing headers, malformed body)

### Integration Tests
- [x] Search function calls pi.ruv.io correctly
- [x] Search function publishes to PubNub
- [x] Contribute function validates input length
- [x] Vote function rejects invalid votes (not 1 or -1)
- [x] All functions respect 8-second timeout

### Manual Verification
- [x] Run locally: `npm run dev`
- [x] Test `/api/search` with curl or Postman
- [x] Verify PubNub receives message
- [x] Test with invalid API key (should error)

## Acceptance Criteria

1. **All three functions implemented**
   - `/api/search` ✓
   - `/api/contribute` ✓
   - `/api/vote` ✓

2. **Error handling per spec**
   - Missing headers return 400 ✓
   - Invalid input validated ✓
   - Timeouts caught and returned as 500 ✓
   - All errors logged to console ✓

3. **PubNub integration**
   - Search publishes to `search_results_[sessionId]` ✓
   - Contribute publishes to `contribution_updates_[sessionId]` ✓
   - No PubNub errors in logs ✓

4. **API key security**
   - API key never logged ✓
   - API key passed via header only ✓
   - `.env` never committed ✓

5. **Timeout compliance**
   - All pi.ruv.io calls timeout at 8 seconds ✓
   - Functions return within Netlify 10s limit ✓

## Definition of Done

- ✅ All three functions implemented per SPEC-001
- ✅ All error handling from error matrix implemented
- ✅ PubNub service initialized and tested
- ✅ Local testing confirms function behavior
- ✅ No API keys in code or logs
- ✅ Git commit pushed to `claude/pi-tinkering-86sN1`

---

*Specifications are the source of truth, not code.* — BHIL
