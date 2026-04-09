# Pi Network Explorer - API Documentation

Complete reference for all available API endpoints.

## Base URL

Development: `http://localhost:5173/api`  
Production: `https://your-netlify-domain.netlify.app/api`

## Authentication

All requests require two headers:

```
x-api-key: <your_pi_network_api_key>
x-session-id: <unique_session_identifier>
```

The session ID is automatically generated on first load and stored in `sessionStorage`.

## Endpoints

### Search Knowledge Graph

**POST** `/api/search`

Query the pi network for knowledge matching a search query.

#### Request Body

```json
{
  "query": "machine learning",
  "limit": 20,
  "offset": 0,
  "domain": "ai"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | Yes | Search query (1+ characters) |
| limit | number | No | Results per page (default: 10, max: 100) |
| offset | number | No | Pagination offset (default: 0) |
| domain | string | No | Filter by knowledge domain |

#### Response (via PubNub)

Published to channel: `search_results_[sessionId]`

```json
{
  "results": [
    {
      "id": "mem_12345",
      "title": "Neural Networks Explained",
      "content": "Neural networks are computational models...",
      "score": 0.95,
      "domain": "ai",
      "authorPseudonym": "anon_a1b2c3d4",
      "createdAt": "2026-04-09T10:00:00Z",
      "votes": {
        "up": 42,
        "down": 3
      }
    }
  ],
  "totalCount": 1247,
  "executionTime": 234
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Query is required | Missing or empty query string |
| 401 | INVALID_API_KEY | API key is invalid or expired |
| 429 | RATE_LIMITED | API rate limit exceeded (auto-retry 2x) |
| 408 | TIMEOUT | Request timed out after 8 seconds |
| 500 | SEARCH_FAILED | Server error |

**Note:** Results are delivered asynchronously via PubNub with <500ms latency (P99).

---

### Submit Knowledge

**POST** `/api/contribute`

Submit new knowledge (memories) to the pi network.

#### Request Body

```json
{
  "title": "Quantum Computing Basics",
  "content": "Quantum computers leverage quantum mechanics...",
  "domain": "science",
  "tags": ["quantum", "computing", "physics"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Knowledge title (1-200 characters) |
| content | string | Yes | Knowledge content (10-5000 characters) |
| domain | string | Yes | Knowledge domain |
| tags | array | No | Array of tag strings |

#### Response (via PubNub)

Published to channel: `contribution_updates_[sessionId]`

```json
{
  "memoryId": "mem_67890",
  "status": "accepted",
  "message": "Knowledge accepted into the network",
  "timestamp": "2026-04-09T10:15:00Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Title must be between 1 and 200 characters | Invalid title length |
| 400 | Content must be between 10 and 5000 characters | Invalid content length |
| 401 | INVALID_API_KEY | API key is invalid or expired |
| 429 | RATE_LIMITED | API rate limit exceeded |
| 408 | TIMEOUT | Request timed out after 8 seconds |
| 500 | CONTRIBUTION_FAILED | Server error |

**Note:** Confirmation is delivered asynchronously via PubNub.

---

### Vote on Memory

**POST** `/api/vote`

Submit a vote (upvote or downvote) for existing knowledge.

#### Request Body

```json
{
  "memoryId": "mem_12345",
  "vote": 1
}
```

| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| memoryId | string | Yes | - | ID of memory to vote on |
| vote | number | Yes | 1, -1 | 1 = upvote, -1 = downvote |

#### Response (Synchronous)

```json
{
  "memoryId": "mem_12345",
  "voteCount": 46,
  "userVote": 1,
  "timestamp": "2026-04-09T10:30:00Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | memoryId is required | Missing memory ID |
| 400 | Vote must be 1 (upvote) or -1 (downvote) | Invalid vote value |
| 401 | INVALID_API_KEY | API key is invalid or expired |
| 404 | NOT_FOUND | Memory not found |
| 500 | VOTE_FAILED | Server error |

---

## Rate Limiting

The pi.ruv.io API enforces rate limits:

- **Search:** 10 requests per minute per API key
- **Contribute:** 5 requests per minute per API key
- **Vote:** 50 requests per minute per API key

The client automatically retries on rate limit (HTTP 429) with exponential backoff:
- 1st retry: 1 second delay
- 2nd retry: 2 seconds delay

---

## Request Timeouts

All requests have maximum timeout values:

- **Search:** 8 seconds (includes pi.ruv.io network latency)
- **Contribute:** 8 seconds
- **Vote:** 5 seconds

If timeout occurs, the request is automatically retried once. Subsequent retries after timeout return 408 error.

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "timestamp": "2026-04-09T10:00:00Z"
}
```

### Common Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| INVALID_API_KEY | 401 | API key is missing, invalid, or expired |
| RATE_LIMITED | 429 | Rate limit exceeded on pi.ruv.io API |
| TIMEOUT | 408 | Request exceeded maximum timeout |
| SEARCH_FAILED | 500 | Search operation failed |
| CONTRIBUTION_FAILED | 500 | Contribution submission failed |
| VOTE_FAILED | 500 | Vote submission failed |

---

## Real-Time Messaging via PubNub

Search and Contribute operations deliver results asynchronously through PubNub channels:

### Channel Names

| Operation | Channel Name | Message Format |
|-----------|--------------|-----------------|
| Search | `search_results_[sessionId]` | SearchResponse (JSON) |
| Contribute | `contribution_updates_[sessionId]` | ContributionResponse (JSON) |

### Subscription Example

```javascript
const { usePubNubSubscription } = require('./hooks/usePubNubSubscription');

function MyComponent({ sessionId }) {
  // Auto-subscribes to channel
  const searchResults = usePubNubSubscription(`search_results_${sessionId}`);

  return (
    <div>
      {searchResults?.results?.map((result) => (
        <div key={result.id}>{result.title}</div>
      ))}
    </div>
  );
}
```

### PubNub Message Latency

- **Average:** <100ms
- **P95:** <200ms
- **P99:** <500ms

Messages are guaranteed to arrive in order per channel.

---

## Session Management

### Session Lifecycle

1. **Create:** Automatically generated on app first load
2. **Store:** Persisted in `sessionStorage`
3. **Use:** Sent with every API request
4. **Expire:** Cleared on logout or browser close

### Example Session ID

```
session_a1b2c3d4_1712689200000
```

Format: `session_[random_8_chars]_[timestamp]`

---

## Examples

### Example 1: Search and Display Results

```bash
curl -X POST http://localhost:5173/api/search \
  -H "x-api-key: your_api_key" \
  -H "x-session-id: your_session_id" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "quantum computing",
    "limit": 10,
    "domain": "science"
  }'
```

Response (HTTP 200):
```json
{
  "status": "published",
  "channel": "search_results_your_session_id",
  "resultCount": 5
}
```

Then subscribe to PubNub channel to receive actual results.

### Example 2: Submit Knowledge

```bash
curl -X POST http://localhost:5173/api/contribute \
  -H "x-api-key: your_api_key" \
  -H "x-session-id: your_session_id" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Neural Networks",
    "content": "Neural networks are computational models inspired by biological neural networks...",
    "domain": "ai",
    "tags": ["ai", "ml", "neural-networks"]
  }'
```

Response (HTTP 200):
```json
{
  "status": "published",
  "channel": "contribution_updates_your_session_id",
  "memoryId": "mem_xyz789"
}
```

### Example 3: Vote on Knowledge

```bash
curl -X POST http://localhost:5173/api/vote \
  -H "x-api-key: your_api_key" \
  -H "x-session-id: your_session_id" \
  -H "Content-Type: application/json" \
  -d '{
    "memoryId": "mem_12345",
    "vote": 1
  }'
```

Response (HTTP 200):
```json
{
  "memoryId": "mem_12345",
  "voteCount": 47,
  "userVote": 1,
  "timestamp": "2026-04-09T10:30:00Z"
}
```

---

## Security Best Practices

1. **Never expose API keys** - Store only in `sessionStorage`, never in `localStorage`
2. **Use HTTPS only** - All production requests must use HTTPS
3. **Validate input** - Client-side validation prevents bad requests
4. **Session isolation** - Each session has a unique ID to prevent cross-user data access
5. **Rate limiting** - Respect API rate limits to avoid throttling

---

## Support

For API issues:

1. Check error codes and messages above
2. Verify API key validity at https://pi.ruv.io
3. Check your rate limit status
4. Review TROUBLESHOOTING.md for common issues
5. Check GitHub issues at https://github.com/mondweep/vibe-cast/issues
