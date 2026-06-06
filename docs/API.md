# Vibe-Cast API Documentation

**Phase 4 - Documentation & Observability**

## Overview

The Vibe-Cast API uses a **command-query separation pattern** with domain-driven design principles. All write operations are event-sourced through domain aggregates; read operations are served from optimized read models (projections).

### API Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    REST API Layer                             │
│                  (Application Controllers)                    │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐        ┌────────────────────────────┐   │
│  │  Write Path     │        │      Read Path             │   │
│  │  (Commands)     │        │    (Queries)               │   │
│  ├─────────────────┤        ├────────────────────────────┤   │
│  │ 1. Load Agg.    │        │ 1. Query ReadModel         │   │
│  │ 2. Validate     │        │ 2. Return Projection       │   │
│  │ 3. Execute Cmd  │        │ 3. No DB writes            │   │
│  │ 4. Save Events  │        │ 4. Eventually consistent   │   │
│  │ 5. Publish Evt  │        │                            │   │
│  └─────────────────┘        └────────────────────────────┘   │
│         │                              │                       │
│         ├──────────┬───────────────────┘                       │
│         │          │                                           │
└─────────┼──────────┼───────────────────────────────────────────┘
          │          │
          ▼          ▼
     ┌─────────────────────────────────────────────┐
     │   Event Bus (IEventBus)                      │
     │   - EventBus: handler registry + DLQ         │
     │   - Subscription-based event dispatch        │
     │   - Idempotency tracking                     │
     │   - Dead Letter Queue w/ exponential backoff │
     └─────────────────────────────────────────────┘
          │          │          │          │
          ▼          ▼          ▼          ▼
    ┌──────────┐ ┌──────────┐ ┌───────┐ ┌────────┐
    │Projectors│ │SagaOrch. │ │Logger │ │Metrics │
    └──────────┘ └──────────┘ └───────┘ └────────┘
```

---

## 1. Authentication & Authorization

### Publishable Keys (Client-Side)
Used for read-only operations from client applications.

```http
X-API-Key: pk_live_abc123xyz
```

### Secret Keys (Server-Side)
Used for write operations and administrative tasks.

```http
X-API-Key: sk_live_abc123xyz
Authorization: Bearer <secret_key>
```

### Multi-Tenant Isolation
All data is segregated by tenant via Supabase RLS policies:
- Every table has `tenant_id` column
- RLS enforces `tenant_id = current_user_id`
- No cross-tenant data leakage possible

---

## 2. API Endpoints

### Domain: LEARNING

#### 2.1 Create Enrollment (Command)

**Endpoint:**
```
POST /api/v1/learning/enrollments
```

**Request Headers:**
```
X-API-Key: sk_live_...
Content-Type: application/json
```

**Request Body:**
```json
{
  "learnerId": "550e8400-e29b-41d4-a716-446655440000",
  "pathId": "660e8400-e29b-41d4-a716-446655440001",
  "enrolledAt": "2026-06-06T10:30:00Z",
  "correlationId": "corr-550e8400-e29b-41d4"
}
```

**Response (201 Created):**
```json
{
  "enrollmentId": "770e8400-e29b-41d4-a716-446655440002",
  "learnerId": "550e8400-e29b-41d4-a716-446655440000",
  "pathId": "660e8400-e29b-41d4-a716-446655440001",
  "status": "ACTIVE",
  "enrolledAt": "2026-06-06T10:30:00Z",
  "completedAt": null,
  "progressPercentage": 0,
  "correlationId": "corr-550e8400-e29b-41d4"
}
```

**Workflow:**
1. API validates request schema
2. Loads Enrollment aggregate
3. Executes `EnrollLearner(learnerId, pathId)` command
4. Aggregate emits `EnrollmentStarted` event
5. Event persisted to event store
6. Event published to EventBus
7. Projectors update read models asynchronously
8. Returns 201 with enrollment snapshot

**Error Responses:**
```json
{
  "errorCode": "ENROLLMENT_FAILED",
  "message": "Learner is already enrolled in 5 paths (max concurrent)",
  "statusCode": 409,
  "correlationId": "corr-550e8400-e29b-41d4"
}
```

#### 2.2 Complete Enrollment (Command)

**Endpoint:**
```
POST /api/v1/learning/enrollments/{enrollmentId}/complete
```

**Request Body:**
```json
{
  "finalScore": 92.5,
  "completedAt": "2026-06-15T14:22:00Z",
  "correlationId": "corr-550e8400-e29b-41d4"
}
```

**Response (200 OK):**
```json
{
  "enrollmentId": "770e8400-e29b-41d4-a716-446655440002",
  "status": "COMPLETED",
  "finalScore": 92.5,
  "completedAt": "2026-06-15T14:22:00Z",
  "progressPercentage": 100
}
```

**Triggers:**
- `EnrollmentCompleted` event published
- Certification SAGA may initiate badge issuance workflow
- Community projector updates member reputation
- Metrics projector records completion data

#### 2.3 Get Learner Profile (Query)

**Endpoint:**
```
GET /api/v1/learning/learners/{learnerId}/profile
```

**Request Headers:**
```
X-API-Key: pk_live_... (or sk_live_...)
```

**Response (200 OK):**
```json
{
  "learnerId": "550e8400-e29b-41d4-a716-446655440000",
  "enrollmentIds": [
    "770e8400-e29b-41d4-a716-446655440002",
    "880e8400-e29b-41d4-a716-446655440003"
  ],
  "completedEnrollmentCount": 2,
  "totalEnrollments": 5,
  "averageScore": 88.6,
  "badgesEarned": [
    {
      "badgeId": "badge-001",
      "certificationName": "Orchestration Architect Level 1",
      "issuedAt": "2026-06-15T14:22:00Z",
      "status": "ACTIVE"
    }
  ],
  "skillsAchieved": [
    {
      "skillId": "skill-001",
      "skillName": "CQRS Pattern Implementation",
      "score": 95,
      "completedAt": "2026-06-10T09:00:00Z"
    }
  ],
  "lastActivityAt": "2026-06-15T14:22:00Z",
  "projectionVersion": 42,
  "lastSyncedEventId": "evt-abc123xyz"
}
```

**Notes:**
- Served from `learner_profiles` read model (projection)
- Updated asynchronously by `LearnerProfileProjector`
- Eventual consistency: up-to-date within ~100ms
- Version field indicates staleness detection capability

---

### Domain: CERTIFICATION

#### 2.4 Create Badge Issuance Request (Command)

**Endpoint:**
```
POST /api/v1/certification/badges/issue
```

**Request Body:**
```json
{
  "learnerId": "550e8400-e29b-41d4-a716-446655440000",
  "certificationId": "cert-001",
  "certificationName": "Orchestration Architect Level 1",
  "requirements": {
    "completedPathIds": [
      "660e8400-e29b-41d4-a716-446655440001",
      "660e8400-e29b-41d4-a716-446655440002"
    ],
    "minAverageScore": 85.0,
    "requiredBadges": []
  },
  "correlationId": "corr-550e8400-e29b-41d4"
}
```

**Response (202 Accepted):**
```json
{
  "badgeIssuanceId": "issue-001",
  "badgeId": "badge-001",
  "learnerId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "VERIFICATION_IN_PROGRESS",
  "requestedAt": "2026-06-15T14:22:00Z",
  "estimatedCompletionAt": "2026-06-15T14:22:05Z",
  "correlationId": "corr-550e8400-e29b-41d4"
}
```

**Workflow (SAGA Pattern):**
1. Accept request → return 202
2. Initiate `CertificationSAGA`
3. Step 1: VERIFICATION - Check learner completion status
4. Step 2: CREATION - Issue badge to external system
5. On success: Publish `BadgeIssued` event
6. On failure: Compensation logic (revoke incomplete badges)
7. Client polls status endpoint for completion

#### 2.5 Get Certification Progress (Query)

**Endpoint:**
```
GET /api/v1/certification/learners/{learnerId}/progress
```

**Response (200 OK):**
```json
{
  "learnerId": "550e8400-e29b-41d4-a716-446655440000",
  "certifications": [
    {
      "certificationId": "cert-001",
      "certificationName": "Orchestration Architect Level 1",
      "status": "COMPLETED",
      "badgeId": "badge-001",
      "issuedAt": "2026-06-15T14:22:00Z",
      "requirements": {
        "completedPathIds": 2,
        "completedPathCount": 2,
        "averageScore": 91.2,
        "minAverageScore": 85.0,
        "allRequirementsMet": true
      }
    },
    {
      "certificationId": "cert-002",
      "certificationName": "Orchestration Architect Level 2",
      "status": "IN_PROGRESS",
      "progress": {
        "completedPathCount": 1,
        "requiredPathCount": 3,
        "progressPercentage": 33.3,
        "averageScore": 88.5,
        "minAverageScore": 90.0,
        "missingRequirements": [
          "Complete Path: Advanced Event Sourcing",
          "Achieve minimum average score of 90.0 (current: 88.5)"
        ]
      }
    }
  ],
  "projectionVersion": 18,
  "lastSyncedEventId": "evt-xyz789"
}
```

---

### Domain: COMMUNITY

#### 2.6 Create Discussion Post (Command)

**Endpoint:**
```
POST /api/v1/community/discussions
```

**Request Body:**
```json
{
  "memberId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "How to implement idempotent event handlers?",
  "content": "I've been trying to understand how to ensure...",
  "tags": ["event-sourcing", "idempotency", "architecture"],
  "relatedCertificationId": "cert-001",
  "correlationId": "corr-550e8400-e29b-41d4"
}
```

**Response (201 Created):**
```json
{
  "discussionId": "disc-001",
  "memberId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "How to implement idempotent event handlers?",
  "createdAt": "2026-06-15T14:22:00Z",
  "tags": ["event-sourcing", "idempotency", "architecture"],
  "status": "PUBLISHED",
  "repliesCount": 0,
  "likeCount": 0,
  "viewCount": 1
}
```

#### 2.7 Get Community Profile (Query)

**Endpoint:**
```
GET /api/v1/community/members/{memberId}/profile
```

**Response (200 OK):**
```json
{
  "memberId": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "Alice Chen",
  "bio": "Solutions architect interested in event-driven systems",
  "reputationScore": 450,
  "reputationLevel": "TRUSTED_CONTRIBUTOR",
  "discussionsCreated": 12,
  "repliesPosted": 48,
  "likesSent": 156,
  "badgesEarned": [
    {
      "badgeId": "badge-001",
      "certificationName": "Orchestration Architect Level 1",
      "issuedAt": "2026-06-15T14:22:00Z"
    }
  ],
  "connections": 23,
  "joinedAt": "2025-09-01T08:00:00Z",
  "lastActivityAt": "2026-06-15T14:22:00Z",
  "projectionVersion": 7,
  "lastSyncedEventId": "evt-abc123xyz"
}
```

---

## 3. Event Flow Examples

### Example 1: Enrollment → Badge Issuance Workflow

```
T0: POST /api/v1/learning/enrollments
    └─> Aggregate: EnrollLearner(learnerId, pathId)
    └─> Event: EnrollmentStarted
        ├─> Persisted to event_store
        ├─> Published to EventBus
        └─> LearnerProfileProjector updates read model
        
T1: POST /api/v1/learning/enrollments/{id}/complete
    └─> Aggregate: CompleteCourse(courseId, score)
    └─> Event: EnrollmentCompleted
        ├─> Persisted to event_store
        ├─> Published to EventBus
        ├─> LearnerProfileProjector updates profile
        ├─> CertificationSAGA listens for this event
        └─> SAGA initiates badge verification workflow
        
T2: CertificationSAGA.handleEvent(EnrollmentCompleted)
    └─> SAGA Step 1: VERIFICATION
        └─> Check: learner completed all required paths?
        └─> Check: learner score >= minAverageScore?
    └─> If all pass:
        └─> SAGA Step 2: CREATION
            └─> Issue badge to external system
        └─> SAGA Step 3: PUBLISH
            └─> Event: BadgeIssued
                ├─> Persisted
                ├─> Published to EventBus
                ├─> CertificationProgressProjector updates
                └─> CommunityProfileProjector increments reputation
    
T3: GET /api/v1/learning/learners/{id}/profile
    └─> Returns updated LearnerProfileReadModel with badge
```

### Example 2: Error Handling & Retry

```
T0: Publish event to EventBus
    └─> Find handlers for EnrollmentCompleted
    └─> Execute handlers [ProjectorA, ProjectorB, SagaOrch]
    
T1: Handler execution results:
    ├─> ProjectorA: SUCCESS ✓
    ├─> ProjectorB: FAILED ✗ (DB connection error)
    └─> SagaOrch: FAILED ✗ (Certification system down)
    
T2: At least one succeeded → mark as processed
    └─> Event marked as idempotent
    
T3: Failed handlers add to DLQ:
    ├─> DLQ Event 1: ProjectorB retry
    │   └─> Scheduled retry: NOW + 1000ms
    └─> DLQ Event 2: SagaOrch retry
        └─> Scheduled retry: NOW + 1000ms
        
T4: DLQ Retry Scheduler polls every 5s
    └─> Find events with scheduledRetryAt <= NOW
    └─> Re-publish to EventBus
    └─> If retry succeeds: remove from DLQ
    └─> If retry fails: schedule next retry [2s, 4s, 8s]
    └─> After 3 max retries: leave in DLQ for manual intervention
    
T5: Monitoring alert: DLQ size > threshold
    └─> Alert ops team to investigate
```

---

## 4. Status Codes & Error Handling

### Success Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK - Query succeeded | GET /learner/profile |
| 201 | Created - Resource created | POST /enrollment |
| 202 | Accepted - SAGA initiated | POST /badge/issue |

### Client Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request - Invalid input | Missing required fields |
| 401 | Unauthorized - Invalid API key | Invalid X-API-Key header |
| 403 | Forbidden - Insufficient permissions | Publishable key for write op |
| 404 | Not Found - Resource doesn't exist | GET /learner/nonexistent |
| 409 | Conflict - Business rule violation | Duplicate enrollment |
| 422 | Unprocessable - Validation failed | Score out of range [0-100] |

### Server Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 500 | Internal Server Error | Retry with exponential backoff |
| 503 | Service Unavailable | Check status page |

### Error Response Format

```json
{
  "errorCode": "ENROLLMENT_DUPLICATE",
  "message": "Learner is already enrolled in this path",
  "statusCode": 409,
  "correlationId": "corr-550e8400-e29b-41d4",
  "timestamp": "2026-06-15T14:22:00Z",
  "details": {
    "learnerId": "550e8400-e29b-41d4-a716-446655440000",
    "pathId": "660e8400-e29b-41d4-a716-446655440001",
    "existingEnrollmentId": "770e8400-e29b-41d4-a716-446655440002"
  }
}
```

---

## 5. Request/Response Contracts

### Pagination

```http
GET /api/v1/learning/enrollments?limit=20&offset=40&sort=-createdAt
```

**Response:**
```json
{
  "data": [
    { "enrollmentId": "...", ... },
    { "enrollmentId": "...", ... }
  ],
  "pagination": {
    "total": 247,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

### Filtering

```http
GET /api/v1/certification/progress?status=IN_PROGRESS&minScore=85
```

### Correlation ID Propagation

All requests should include `correlationId` to enable distributed tracing:

```json
{
  "learnerId": "550e8400-e29b-41d4-a716-446655440000",
  "pathId": "660e8400-e29b-41d4-a716-446655440001",
  "correlationId": "corr-550e8400-e29b-41d4"
}
```

The same `correlationId` flows through:
- Domain aggregate execution
- Event publishing
- SAGA orchestration
- Projector updates
- Logging & tracing

---

## 6. Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1623775200
```

### Limits by Key Type

| Key Type | Requests/Hour | Burst | Purpose |
|----------|---------------|-------|---------|
| `pk_live_` (Publishable) | 10,000 | 100 | Read operations |
| `sk_live_` (Secret) | 5,000 | 50 | Write operations |

### Exceeded Rate Limit

```json
{
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "message": "1000 requests per hour exceeded",
  "statusCode": 429,
  "retryAfter": 3600
}
```

---

## 7. API Versioning Strategy

### Version in URL
```
/api/v1/learning/enrollments
/api/v2/learning/enrollments  (future)
```

### Backward Compatibility Rules
1. Old API versions supported for 12 months after release
2. New fields added with defaults for existing clients
3. Deprecated fields marked with `x-deprecated` header
4. Breaking changes require major version bump

### Migration Path
```
v1 (current) → v2 (next)
├─ New endpoints available in v2
├─ v1 endpoints frozen (no new features)
└─ Sunset after 12 months
```

---

## 8. Webhook Events (Future)

Planned for Phase 5:

```json
{
  "id": "evt-abc123xyz",
  "type": "enrollment.completed",
  "timestamp": "2026-06-15T14:22:00Z",
  "data": {
    "enrollmentId": "770e8400-e29b-41d4-a716-446655440002",
    "learnerId": "550e8400-e29b-41d4-a716-446655440000",
    "finalScore": 92.5
  }
}
```

---

## 9. Idempotency & Exactly-Once Semantics

### Request Idempotency Key

```json
{
  "learnerId": "550e8400-e29b-41d4-a716-446655440000",
  "pathId": "660e8400-e29b-41d4-a716-446655440001",
  "idempotencyKey": "enroll-2026-06-15-123456"
}
```

### Implementation
- EventBus tracks processed event IDs
- Aggregate commands check idempotency before execution
- SAGA repository prevents duplicate event processing
- Clients can safely retry on network errors

---

## 10. Example cURL Requests

### Enroll a Learner
```bash
curl -X POST https://api.vibe-cast.example.com/api/v1/learning/enrollments \
  -H "X-API-Key: sk_live_abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "learnerId": "550e8400-e29b-41d4-a716-446655440000",
    "pathId": "660e8400-e29b-41d4-a716-446655440001",
    "correlationId": "corr-550e8400-e29b-41d4"
  }'
```

### Get Learner Profile
```bash
curl -X GET https://api.vibe-cast.example.com/api/v1/learning/learners/550e8400-e29b-41d4-a716-446655440000/profile \
  -H "X-API-Key: pk_live_abc123xyz"
```

### Issue Badge (SAGA)
```bash
curl -X POST https://api.vibe-cast.example.com/api/v1/certification/badges/issue \
  -H "X-API-Key: sk_live_abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "learnerId": "550e8400-e29b-41d4-a716-446655440000",
    "certificationId": "cert-001",
    "certificationName": "Orchestration Architect Level 1",
    "requirements": {
      "completedPathIds": [
        "660e8400-e29b-41d4-a716-446655440001",
        "660e8400-e29b-41d4-a716-446655440002"
      ],
      "minAverageScore": 85.0
    },
    "correlationId": "corr-550e8400-e29b-41d4"
  }'
```

---

## References

- [Architecture Documentation](./ARCHITECTURE.md)
- [Event Sourcing Patterns](./SAGA_FLOWS_DESIGN.md)
- [Monitoring & Observability](./MONITORING.md)
