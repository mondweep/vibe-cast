# Vibe-Cast Learning Platform: Implementation Plan
## REST API & Frontend UI - Complete Strategy

**Status**: Ready for Development  
**Total Effort**: 9-12 days (parallel execution: 5-7 days)  
**Target**: MVP Launch in 2-3 weeks

---

## Executive Overview

The Vibe-Cast platform has a **complete architectural foundation** with:
- ✅ 180+ passing tests (unit + integration)
- ✅ Event-sourced infrastructure (EventBus, SagaOrchestrator)
- ✅ CQRS read models (projectors, repositories)
- ✅ Domain-driven design across 3 domains
- ✅ Production-ready monitoring and security docs

**What remains**: Building the HTTP API layer and React frontend to expose this functionality to users.

---

## Part 1: Project Structure

### Backend API Implementation

**Directory**: `src/api/`

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
│   └── validation.ts     # Zod schemas for all endpoints
└── utils/
    └── response.ts       # Standardized response formatting
```

### Frontend React Implementation

**Directory**: `src/web/`

```
src/web/
├── main.tsx              # React entry point
├── App.tsx               # Router setup
├── pages/
│   ├── DashboardPage.tsx
│   ├── EnrollmentPage.tsx
│   ├── ExamPage.tsx
│   ├── BadgesPage.tsx
│   ├── LeaderboardPage.tsx
│   └── ProfilePage.tsx
├── components/
│   ├── common/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── learner/
│   │   ├── LearnerCard.tsx
│   │   ├── ProgressBar.tsx
│   │   └── BadgesList.tsx
│   ├── forms/
│   │   ├── EnrollmentForm.tsx
│   │   └── ExamForm.tsx
├── hooks/
│   ├── useLearnerProfile.ts
│   ├── useEnrollment.ts
│   └── useQuery.ts
├── api/
│   ├── client.ts         # Axios instance
│   ├── learning.ts       # Learning API calls
│   ├── certification.ts  # Certification API calls
│   └── community.ts      # Community API calls
├── types/
│   └── index.ts          # Shared TypeScript types
├── config/
│   └── constants.ts      # Environment, endpoints
└── styles/
    └── globals.css       # Tailwind setup
```

---

## Part 2: REST API Endpoints

### Core Endpoints (7 Total)

#### Learning Domain
```
POST   /api/v1/learning/enrollments
       Request: { learnerId, certificationId }
       Response: 201 { enrollmentId, status: "ACTIVE" }
       Error: 400 (validation), 409 (conflict)

GET    /api/v1/learning/learners/{id}/profile
       Response: 200 { learner_id, total_enrollments, average_score, badges_earned }
       Error: 404 (not found), 401 (unauthorized)

POST   /api/v1/learning/enrollments/{id}/complete
       Request: { finalScore, completedAt }
       Response: 200 { status: "COMPLETED" }
       Error: 400, 404, 409
```

#### Certification Domain
```
POST   /api/v1/certification/badges/issue
       Request: { learnerId, enrollmentId, badgeId, certificationName }
       Response: 202 { status: "PROCESSING", sagaId }
       Error: 400, 404

GET    /api/v1/certification/learners/{id}/progress
       Response: 200 { enrollment_id, current_grade, exam_attempts, badge_status }
       Error: 404

POST   /api/v1/certification/exams/submit
       Request: { enrollmentId, examId, answers, score }
       Response: 200 { examId, score, passed: true/false }
       Error: 400, 404
```

#### Community Domain
```
GET    /api/v1/community/members/{id}/profile
       Response: 200 { learner_id, display_name, badge_count, reputation_score }
       Error: 404

GET    /api/v1/community/leaderboard?limit=10&skip=0
       Response: 200 [{ learner_id, display_name, reputation_score }, ...]
       Error: 400 (invalid params)
```

#### Health & Monitoring
```
GET    /health
       Response: 200 { status: "ok", timestamp }

GET    /metrics
       Response: 200 { eventCount, errorCount, avgLatency }
```

---

## Part 3: API Middleware Stack

### Authentication Middleware
```typescript
// Validates X-API-Key header
// Distinguishes between publishable (pk_) and secret (sk_) keys
// Rejects publishable keys for write operations
// Stores key info on request context
// Returns 401 on invalid/missing key
```

### Validation Middleware
```typescript
// Uses Zod schemas to validate request body and query params
// Returns 400 with detailed error messages on validation failure
// Type-safe: provides validated data to controllers
```

### Error Handler
```typescript
// Global error catch-all
// Returns proper HTTP status codes:
//   - 400 Bad Request (validation, user error)
//   - 401 Unauthorized (missing/invalid auth)
//   - 403 Forbidden (insufficient permissions)
//   - 404 Not Found (resource doesn't exist)
//   - 409 Conflict (business rule violation)
//   - 500 Internal Server Error (infrastructure)
// Never exposes internal stack traces in production
```

### Logging Middleware
```typescript
// Logs all requests with correlationId
// Records method, path, response status, duration
// Integrates with existing Logger infrastructure
// Supports structured JSON logging
```

---

## Part 4: Frontend Pages & Components

### Pages

**DashboardPage** (`/`)
- Learner profile card (name, avatar, stats)
- Progress visualization (pie chart)
- 3 recently earned badges grid
- Recent activity feed (last 5 events)
- Quick-access buttons (enroll, take exam, view badges)

**EnrollmentPage** (`/enrollment`)
- Search/filter learning paths (by difficulty, domain, duration)
- Path cards in grid (name, description, duration, difficulty)
- Enrollment button opens modal form
- "My Enrollments" section showing active enrollments
- Progress bars for each active enrollment

**ExamPage** (`/exam/:enrollmentId`)
- Question display (one at a time)
- Multiple choice answers with radio buttons
- Previous/Next buttons for navigation
- Progress indicator (Question 5 of 10)
- Timer display (remaining time)
- Submit button (disabled until all questions answered)
- Results page post-submission

**BadgesPage** (`/badges`)
- Grid of earned badges (4 columns)
- Badge card: name, image, earned date, difficulty
- Click to view details modal
- Filter by skill/certification
- Share badge functionality

**LeaderboardPage** (`/leaderboard`)
- Top 10 learners table
- Columns: Rank, Name, Reputation Score, Badge Count
- Pagination (10 per page)
- Filter by certification
- User hover card (preview profile)
- Current user highlighted

**ProfilePage** (`/profile`)
- Display name (editable)
- Bio (editable)
- Email (read-only)
- Connected accounts section
- Account settings (timezone, language)
- Logout button

### Reusable Components

**Common Layout**
- Header: Logo, navigation, user menu
- Sidebar: Navigation links (Dashboard, Enrollments, Badges, Leaderboard, Profile)
- Footer: Copyright, links
- Loading spinner (with animation)
- Error alert (dismissible)

**Forms**
- EnrollmentForm: Select certification, agree to terms, submit
- ExamForm: Answer questions, select multiple choice
- ProfileForm: Edit name and bio with save/cancel

**Cards & Lists**
- LearnerCard: Profile snapshot with stats
- PathCard: Learning path with duration and difficulty
- BadgeCard: Badge with earned date
- LeaderboardRow: Learner ranking

---

## Part 5: Frontend State Management

### React Query Setup
```typescript
// QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes (was cacheTime)
      retry: 2,                       // Retry failed requests
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Custom Hooks
```typescript
// useLearnerProfile(learnerId)
// - Queries GET /api/v1/learning/learners/{id}/profile
// - Automatic caching and refetching

// useEnrollment(learnerId, certificationId)
// - Mutation for POST /api/v1/learning/enrollments
// - Optimistic updates
// - Invalidates profile cache on success

// useQuery(key, fn, options)
// - Wrapper with project defaults
// - Error handling and retry logic
```

---

## Part 6: API Integration Strategy

### Event Publishing Flow

```
Frontend user action (e.g., enroll)
    ↓
POST /api/v1/learning/enrollments
    ↓
Controller validates input
    ↓
Create domain event (EnrollmentInitiated)
    ↓
Publish to EventBus
    ↓
EventBus distributes to handlers:
  - LearnerProfileProjector (updates read model)
  - CertificationProgressProjector (updates progress)
  - SAGA Orchestrator (manages workflow)
    ↓
Projectors update PostgreSQL read models (~50-100ms)
    ↓
Frontend refetches profile (sees eventual consistency)
    ↓
User sees updated dashboard
```

### Error Handling

**API Layer**: Zod validation → 400 errors
**Business Logic**: Domain exceptions → 409 conflicts
**Infrastructure**: Database errors → 500 internal errors
**Frontend**: Show error toast, enable retry button

---

## Part 7: Testing Strategy

### Unit Tests (60-70%)
- Test controllers with mocked services
- Test React hooks with React Testing Library
- Test validation schemas
- Verify response formats

### Integration Tests (20-30%)
- Spin up test database
- Start API server
- Make HTTP requests
- Verify database changes and projector updates
- Test eventual consistency

### E2E Tests (5-10% - Playwright)
```
Test flows:
1. Login → Navigate → Enroll in certification → Verify in profile
2. Enroll → Take exam → Submit answers → Verify score
3. Earn badge → View profile → See badge on dashboard
```

### Load Testing (k6)
```
Simulate:
- 100 concurrent users ramping up
- Hold 100 users for 5 minutes
- Measure p99 latency (target: <500ms)
- Measure error rate (target: <1%)
```

---

## Part 8: Implementation Order (Critical Path)

### Phase 1: Server & Auth (1 day)
1. Create Fastify server
2. Add middleware (auth, error, logging, validation)
3. Implement health check endpoint
4. Set up CORS and security headers
5. Wire up Logger and error handling

### Phase 2: Learning API (1 day)
1. Create learning controller
2. Implement 3 learning endpoints
3. Create Zod validation schemas
4. Wire up EventBus publishing
5. Test with curl/Postman

### Phase 3: Certification & Community API (0.5 day)
1. Create certification controller
2. Create community controller
3. Implement 4 remaining endpoints
4. Integration tests with database

### Phase 4: React Setup & Auth (0.5 day)
1. Initialize Vite + React
2. Configure Tailwind CSS
3. Set up React Query
4. Implement Supabase Auth
5. Create AuthContext

### Phase 5: Core Pages (2 days)
1. Create page components (6 pages)
2. Implement navigation
3. Create reusable components
4. Wire up API calls with React Query
5. Add loading and error states

### Phase 6: Testing & Polish (1 day)
1. Unit tests for critical paths
2. E2E tests for workflows
3. Load testing
4. Performance optimization
5. Responsive design fixes

### Phase 7: Deployment (0.5 day)
1. Configure Vercel (API + frontend)
2. Set up GitHub Actions CI/CD
3. Environment variables
4. Database migration scripts
5. Pre-launch checklist

---

## Part 9: Key Dependencies

### Backend Package.json
```json
{
  "dependencies": {
    "fastify": "^4.24.0",
    "@fastify/cors": "^8.4.0",
    "@fastify/helmet": "^11.1.0",
    "zod": "^3.22.0",
    "@supabase/supabase-js": "^2.38.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.2.0",
    "jest": "^29.7.0",
    "ts-node": "^10.9.0"
  }
}
```

### Frontend Package.json
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.16.0",
    "@tanstack/react-query": "^5.8.0",
    "axios": "^1.5.0",
    "react-hook-form": "^7.47.0",
    "zod": "^3.22.0",
    "tailwindcss": "^3.3.0",
    "@supabase/supabase-js": "^2.38.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.1.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "typescript": "^5.2.0"
  }
}
```

---

## Part 10: Success Criteria

### Must Have (MVP)
- ✅ 7 API endpoints implemented and tested
- ✅ 6 frontend pages rendering
- ✅ Authentication working (Supabase)
- ✅ Events publishing to EventBus
- ✅ Read models updating (eventual consistency)
- ✅ Error handling working (4xx/5xx)
- ✅ Deployment to Vercel successful
- ✅ Health checks passing
- ✅ Load test baseline (100+ concurrent users)

### Should Have (Post-MVP)
- Real-time WebSocket updates
- Advanced analytics dashboard
- Instructor portal
- Mobile app (React Native)
- Video streaming integration
- Badge marketplace

---

## Timeline Summary

| Phase | Duration | Output |
|-------|----------|--------|
| Server & Auth | 1 day | Fastify server, middleware |
| Learning API | 1 day | 3 endpoints + tests |
| Cert & Community API | 0.5 day | 4 endpoints + tests |
| React Setup | 0.5 day | Project structure, auth |
| Core Pages | 2 days | 6 pages, components, integration |
| Testing & Polish | 1 day | Tests, load testing, optimization |
| Deployment | 0.5 day | Vercel setup, CI/CD, DNS |
| **Total** | **6-7 days** | **Full stack MVP** |

With parallel frontend/backend development: **5-7 days total**

---

## Critical First Files to Implement

1. **src/api/server.ts** - Server initialization (day 1)
2. **src/api/middleware/auth.ts** - Authentication (day 1)
3. **src/api/controllers/learning.ts** - Core domain logic (day 2)
4. **src/web/main.tsx** - React entry point (day 3)
5. **src/web/api/client.ts** - HTTP client (day 3)

These 5 files form the backbone and enable all other components to be built.

---

## Deployment Checklist

- [ ] Code compiles without errors
- [ ] All tests passing (unit + integration + E2E)
- [ ] Load testing passed (100+ concurrent users)
- [ ] Security scan passed (no vulnerabilities)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Health checks responding
- [ ] Monitoring setup (Sentry, Datadog)
- [ ] Pre-deployment backup taken
- [ ] Team notified of deployment window
- [ ] Rollback plan documented
- [ ] Post-deployment smoke tests passed

