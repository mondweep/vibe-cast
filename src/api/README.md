# Vibe-Cast REST API

HTTP API layer for the Vibe-Cast learning platform, built with Fastify.

## Features

- **7 Core Endpoints**: Learning, Certification, Community domains
- **Type-Safe Validation**: Zod schemas for request/response validation
- **API Key Authentication**: Support for publishable (pk_) and secret (sk_) keys
- **Event Publishing**: Integration with EventBus for domain events
- **Request Logging**: Correlation ID tracking for distributed tracing
- **Global Error Handling**: Consistent error response format
- **CORS & Security**: Helmet headers, CORS middleware

## Architecture

```
HTTP Request
    ↓
Logging Middleware (add correlationId)
    ↓
Auth Middleware (validate X-API-Key)
    ↓
Validation Middleware (Zod schemas)
    ↓
Controller (business logic)
    ↓
EventBus (publish domain events)
    ↓
Response (success or error)
    ↓
Error Handler (catch all exceptions)
```

## Directory Structure

```
src/api/
├── server.ts              # Fastify server entry point
├── middleware/
│   ├── auth.ts           # API key validation
│   ├── validation.ts     # Zod schema validation
│   ├── error.ts          # Global error handler
│   └── logging.ts        # Request/response logging
├── routes/
│   ├── learning.ts       # Learning domain routes
│   ├── certification.ts  # Certification domain routes
│   └── community.ts      # Community domain routes
├── controllers/
│   ├── learning.ts       # Enrollment, profile handlers
│   ├── certification.ts  # Badge, progress handlers
│   └── community.ts      # Member, discussion handlers
├── schemas/
│   └── validation.ts     # Zod schemas
└── utils/
    └── response.ts       # Response formatting
```

## API Endpoints

### Learning Domain

**Create Enrollment**
```
POST /api/v1/learning/enrollments
X-API-Key: sk_*

Request:
{
  "learnerId": "uuid",
  "certificationId": "uuid"
}

Response: 201
{
  "status": "success",
  "data": {
    "enrollmentId": "uuid",
    "status": "ACTIVE",
    "createdAt": "2026-06-07T..."
  }
}
```

**Get Learner Profile**
```
GET /api/v1/learning/learners/:id/profile
X-API-Key: pk_* or sk_*

Response: 200
{
  "status": "success",
  "data": {
    "learner_id": "uuid",
    "display_name": "John Doe",
    "total_enrollments": 5,
    "completed_enrollments": 3,
    "average_score": 85.5,
    "badges_earned": 7,
    "reputation_score": 450
  }
}
```

**Complete Enrollment**
```
POST /api/v1/learning/enrollments/:id/complete
X-API-Key: sk_*

Request:
{
  "finalScore": 85,
  "completedAt": "2026-06-07T..."
}

Response: 200
{
  "status": "success",
  "data": {
    "enrollmentId": "uuid",
    "status": "COMPLETED",
    "finalScore": 85
  }
}
```

### Certification Domain

**Issue Badge**
```
POST /api/v1/certification/badges/issue
X-API-Key: sk_*

Request:
{
  "learnerId": "uuid",
  "enrollmentId": "uuid",
  "badgeId": "uuid",
  "certificationName": "JavaScript Expert"
}

Response: 202
{
  "status": "success",
  "data": {
    "badgeId": "uuid",
    "status": "PROCESSING",
    "sagaId": "uuid"
  }
}
```

**Get Certification Progress**
```
GET /api/v1/certification/learners/:id/progress
X-API-Key: pk_* or sk_*

Response: 200
{
  "status": "success",
  "data": {
    "learner_id": "uuid",
    "enrollment_id": "uuid",
    "current_grade": "A",
    "exam_attempts": 2,
    "badge_status": "EARNED"
  }
}
```

**Submit Exam**
```
POST /api/v1/certification/exams/submit
X-API-Key: sk_*

Request:
{
  "enrollmentId": "uuid",
  "examId": "uuid",
  "answers": { "q1": "a", "q2": "b" },
  "score": 85
}

Response: 200
{
  "status": "success",
  "data": {
    "examId": "uuid",
    "score": 85,
    "passed": true
  }
}
```

### Community Domain

**Get Member Profile**
```
GET /api/v1/community/members/:id/profile
X-API-Key: pk_* or sk_*

Response: 200
{
  "status": "success",
  "data": {
    "learner_id": "uuid",
    "display_name": "John Doe",
    "badge_count": 7,
    "reputation_score": 450
  }
}
```

**Get Leaderboard**
```
GET /api/v1/community/leaderboard?limit=10&skip=0
X-API-Key: pk_* or sk_*

Response: 200
{
  "status": "success",
  "data": [
    {
      "rank": 1,
      "learner_id": "uuid",
      "display_name": "Jane Smith",
      "reputation_score": 1250,
      "badge_count": 15
    }
  ],
  "pagination": {
    "total": 1000,
    "limit": 10,
    "skip": 0,
    "hasMore": true
  }
}
```

## Authentication

API key validation via `X-API-Key` header:

**Publishable Keys** (prefix: `pk_`)
- Read-only access
- Use in frontend/client-side code
- GET requests only

**Secret Keys** (prefix: `sk_`)
- Full access (read/write)
- Use in backend/server-side code
- All HTTP methods

Example:
```bash
# Read-only
curl -H "X-API-Key: pk_example123..." https://api.example.com/api/v1/learning/learners/123/profile

# Write operation
curl -X POST \
  -H "X-API-Key: sk_example123..." \
  -H "Content-Type: application/json" \
  -d '{"learnerId": "...", "certificationId": "..."}' \
  https://api.example.com/api/v1/learning/enrollments
```

## Error Responses

All errors follow this format:

```json
{
  "status": "error",
  "message": "User-friendly error message",
  "code": "ERROR_CODE",
  "errors": {
    "field_name": ["Validation error message"]
  },
  "correlationId": "abc123..."
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `202` - Accepted (async processing)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (business rule violation)
- `500` - Internal Server Error

## Request Logging

All requests are logged with:
- HTTP method and path
- Query parameters
- Response status code
- Duration (ms)
- Correlation ID for tracing

```json
{
  "level": "INFO",
  "message": "Request completed",
  "correlationId": "abc123...",
  "method": "POST",
  "path": "/api/v1/learning/enrollments",
  "statusCode": 201,
  "duration": "45ms"
}
```

## Running the Server

```bash
# Start server on port 3000
PORT=3000 npm run start:api

# Start with custom host
HOST=localhost PORT=3000 npm run start:api

# Development with hot reload
npm run dev:api
```

## Testing

```bash
# Run all API tests
npm test tests/api/

# Run middleware tests
npm test tests/api/middleware.test.ts

# Run controller tests
npm test tests/api/controllers.test.ts

# Run integration tests
npm test tests/api/integration.test.ts

# Watch mode
npm test -- --watch tests/api/
```

## Validation

All endpoints use Zod schemas for type-safe validation:

```typescript
// Example: EnrollmentRequestSchema
{
  learnerId: string (uuid),
  certificationId: string (uuid)
}
```

Validation errors return 400 with detailed field-level errors:

```json
{
  "status": "error",
  "message": "Request body validation failed",
  "code": "VALIDATION_ERROR",
  "errors": {
    "learnerId": ["learnerId must be a valid UUID"],
    "certificationId": ["certificationId must be a valid UUID"]
  }
}
```

## Integration with EventBus

Write operations automatically publish domain events:

```
POST /api/v1/learning/enrollments
  → EnrollmentInitiated event
  → Published to EventBus
  → Projectors update read models
  → Eventual consistency achieved
```

## CORS Configuration

Configured via `CORS_ORIGIN` environment variable:

```bash
CORS_ORIGIN=https://example.com npm run start:api
```

Default: `*` (all origins)

## Health Check

```bash
curl http://localhost:3000/health

{
  "status": "success",
  "data": {
    "status": "ok",
    "timestamp": "2026-06-07T...",
    "uptime": 123.45
  }
}
```

## Security Headers

Automatically added by Helmet middleware:

- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (when HTTPS)
- X-XSS-Protection
