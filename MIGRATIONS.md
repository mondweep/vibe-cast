# Database Migrations Guide

This document explains the database schema for the Vibe Cast learning platform, which uses **CQRS (Command Query Responsibility Segregation)** and **Event Sourcing** patterns.

---

## Overview

The database has two distinct migration scripts that work together:

1. **`001_create_saga_state.sql`** - SAGA Orchestration (Write-side)
2. **`ruflo_demo_schema.sql`** - CQRS Query Models (Read-side)

Both create tables in the `ruflo_demo` schema with the `ruflo_demo_` prefix for multi-tenant clarity.

---

## Migration 1: SAGA State (`001_create_saga_state.sql`)

### Purpose
Persistence layer for long-running distributed transactions in the certification enrollment workflow.

### Pattern
**Event Sourcing + SAGA Orchestration**

Manages complex multi-step workflows with state persistence, error recovery, and idempotency guarantees.

### Tables Created (5)

#### 1. `ruflo_demo_saga_state`
Stores the current state of each SAGA orchestration instance.

**Columns**:
- `id` (UUID, PK) - Unique identifier
- `saga_id` (UUID, UNIQUE) - SAGA instance ID
- `workflow_type` (VARCHAR) - Type of workflow (e.g., 'CERTIFICATION_ENROLLMENT')
- `current_step` (VARCHAR) - Current step in state machine
- `state` (VARCHAR) - SAGA state: ACTIVE, WAITING, COMPLETED, FAILED, COMPENSATED
- `correlation_id` (UUID) - For distributed tracing
- `learner_id` (UUID) - Associated learner
- `enrollment_id` (UUID) - Associated enrollment
- `saga_data` (JSONB) - Context data passed between steps
- `version` (INT) - Optimistic locking field
- `created_at`, `updated_at` (TIMESTAMP)

**Use Case**: Track an enrollment workflow from start to certification issuance

**Example**:
```json
{
  "saga_id": "550e8400-e29b-41d4-a716-446655440000",
  "workflow_type": "CERTIFICATION_ENROLLMENT",
  "current_step": "VALIDATE_EXAM",
  "state": "WAITING",
  "enrollment_id": "550e8400-e29b-41d4-a716-446655440001",
  "saga_data": {
    "exam_score": 85,
    "exam_id": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

---

#### 2. `ruflo_demo_saga_steps`
Records step-by-step execution history of each SAGA.

**Columns**:
- `id` (UUID, PK)
- `saga_id` (UUID, FK) - Reference to saga_state
- `step_name` (VARCHAR) - Step identifier (e.g., 'VALIDATE_EXAM', 'ISSUE_BADGE')
- `status` (VARCHAR) - PENDING, IN_PROGRESS, COMPLETED, FAILED
- `result_data` (JSONB) - Step output data
- `error_message` (TEXT) - Error details if failed
- `started_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP, nullable)

**Use Case**: Debugging, monitoring, and understanding what happened in the workflow

**Example**:
```json
{
  "saga_id": "550e8400-e29b-41d4-a716-446655440000",
  "step_name": "VALIDATE_EXAM",
  "status": "COMPLETED",
  "result_data": { "validation_passed": true }
}
```

---

#### 3. `ruflo_demo_saga_idempotency`
Prevents duplicate processing of the same event in a SAGA.

**Columns**:
- `id` (UUID, PK)
- `saga_id` (UUID, FK) - Reference to saga_state
- `event_id` (UUID, UNIQUE) - Event identifier
- `processed_at` (TIMESTAMP)

**Use Case**: If an event arrives twice, the SAGA won't process it twice

**Guarantees**: Exactly-once event processing semantics

---

#### 4. `ruflo_demo_dlq_events` (Dead Letter Queue)
Stores events that failed after all retry attempts.

**Columns**:
- `id` (UUID, PK)
- `event_id` (UUID, UNIQUE) - Original event ID
- `event_type` (VARCHAR) - Type of event (e.g., 'ExamCompleted')
- `event_data` (JSONB) - Event payload
- `correlation_id` (UUID) - For tracing
- `retry_count` (INT) - Number of retries attempted
- `max_retries` (INT) - Maximum retries allowed
- `next_retry_at` (TIMESTAMP) - When to retry next (if needed)
- `error_message` (TEXT) - Last error encountered
- `created_at`, `updated_at` (TIMESTAMP)

**Use Case**: Manual intervention queue for events that couldn't be automatically handled

---

#### 5. `ruflo_demo_event_processing`
Global idempotency tracking for event handling across all handlers.

**Columns**:
- `id` (UUID, PK)
- `event_id` (UUID, UNIQUE) - Event identifier
- `handler_name` (VARCHAR) - Handler that processed it
- `processed_at` (TIMESTAMP)

**Use Case**: Prevent any handler from processing the same event twice

---

### Indexes Created
```
saga_state:
  - idx_saga_state_enrollment_id (for finding SAGA by enrollment)
  - idx_saga_state_learner_id
  - idx_saga_state_state (for finding by status)
  - idx_saga_state_correlation_id (for distributed tracing)

saga_steps:
  - idx_saga_steps_saga_id
  - idx_saga_steps_status

saga_idempotency:
  - idx_saga_idempotency_saga_id
  - idx_saga_idempotency_event_id

dlq_events:
  - idx_dlq_events_event_id
  - idx_dlq_events_next_retry_at (for retry scheduler)
  - idx_dlq_events_correlation_id

event_processing:
  - idx_event_processing_event_id
  - idx_event_processing_handler_name
```

---

## Migration 2: Query Models (`ruflo_demo_schema.sql`)

### Purpose
Denormalized read models optimized for fast queries without complex joins.

### Pattern
**CQRS (Command Query Responsibility Segregation)**

Query models are updated by **projectors** (event subscribers) as events arrive. They pre-calculate and denormalize data for fast reads.

### Tables Created (4)

#### 1. `ruflo_demo_learner_profile_read_model`
Fast lookup for a learner's progress and achievements.

**Columns**:
- `learner_id` (UUID, PK) - Learner identifier
- `enrollment_ids` (UUID[]) - All enrollments
- `completed_enrollment_count` (INT) - Count of completed enrollments
- `total_enrollments` (INT) - Total enrollments
- `average_score` (DECIMAL) - Pre-calculated average
- `badges_earned` (JSONB) - Array of badge objects
- `skills_achieved` (JSONB) - Array of skill objects
- `last_activity_at` (TIMESTAMP)
- `projection_version` (INT) - Version for replay safety
- `last_synced_event_id` (UUID) - For idempotency
- `created_at`, `updated_at` (TIMESTAMP)

**Use Case**: Learner dashboard - show profile, progress, achievements instantly

**Projected By**: `LearnerProfileProjector`

**Example Query**:
```sql
SELECT average_score, badges_earned, skills_achieved 
FROM ruflo_demo_learner_profile_read_model 
WHERE learner_id = '...'
-- No joins needed, single row lookup, <100ms
```

---

#### 2. `ruflo_demo_certification_progress_read_model`
Track exam attempts and certification status.

**Columns**:
- `enrollment_id` (UUID, PK)
- `learner_id` (UUID) - For filtering by learner
- `certification_id` (UUID)
- `enrollment_status` (VARCHAR) - IN_PROGRESS, COMPLETED, FAILED
- `exam_attempts` (JSONB) - Array of attempt snapshots
- `current_grade` (DECIMAL)
- `badge_status` (VARCHAR) - NONE, ISSUED
- `issued_badge_id` (UUID)
- `next_renewal_date` (TIMESTAMP) - For badge renewal tracking
- `last_synced_event_id` (UUID)
- `created_at`, `updated_at` (TIMESTAMP)

**Use Case**: Progress page - show exam history and current grade

**Projected By**: `CertificationProgressProjector`

---

#### 3. `ruflo_demo_community_profile_read_model`
Public profile for leaderboards and community visibility.

**Columns**:
- `learner_id` (UUID, PK)
- `display_name` (VARCHAR) - Public name for leaderboards
- `badge_count` (INT) - Total badges earned
- `skill_count` (INT) - Total skills achieved
- `reputation_score` (INT) - Pre-calculated: (badges × 50) + (skills × 10)
- `badges` (JSONB) - Array of badge details
- `skills` (JSONB) - Array of skill details
- `last_activity_at` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)

**Use Case**: Leaderboards - show top learners by reputation or badge count

**Projected By**: `CommunityProfileProjector`

**Example Query**:
```sql
SELECT learner_id, display_name, reputation_score 
FROM ruflo_demo_community_profile_read_model 
ORDER BY reputation_score DESC 
LIMIT 10
-- Fast leaderboard query with pre-calculated scores
```

---

#### 4. `ruflo_demo_metrics_read_model`
System-wide metrics for monitoring and analytics.

**Columns**:
- `metrics_id` (UUID, PK)
- `period` (VARCHAR) - DAILY, WEEKLY, MONTHLY
- `date` (TIMESTAMP)
- `total_events_processed` (INT)
- `event_count_by_type` (JSONB) - Count of each event type
- `total_learners_active` (INT) - Active in this period
- `total_badges_issued` (INT)
- `total_skills_achieved` (INT)
- `average_completion_time_ms` (INT) - Event processing latency
- `latency_percentiles` (JSONB) - {p50, p95, p99}
- `created_at`, `updated_at` (TIMESTAMP)

**Use Case**: Admin dashboard - system health, event throughput, latency monitoring

**Projected By**: `MetricsProjector`

---

### Indexes Created
```
learner_profile_read_model:
  - idx_learner_profile_last_activity (for sorting by activity)
  - idx_learner_profile_updated

certification_progress_read_model:
  - idx_cert_progress_learner (for finding by learner)
  - idx_cert_progress_status (for filtering by status)
  - idx_cert_progress_certification

community_profile_read_model:
  - idx_community_profile_reputation (for leaderboards)
  - idx_community_profile_badge_count

metrics_read_model:
  - idx_metrics_period_date (for time-series queries)
  - idx_metrics_date
```

---

## How They Work Together

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Action                                   │
│              (e.g., Submit Exam, Earn Badge)                    │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
            ┌────────────────────────────┐
            │   Event Published to Bus    │
            └────────────┬───────────────┘
                         ↓
        ┌────────────────────────────────────┐
        │    EventBus Distributes Event       │
        └───┬──────────────────────────────┬──┘
            ↓                              ↓
    ┌─────────────────┐        ┌──────────────────────┐
    │ Orchestrators   │        │    Projectors        │
    │ (CertOrch...)   │        │ (LearnerProfile...)  │
    └─────┬───────────┘        └──────────┬───────────┘
          ↓                                ↓
    ┌─────────────────────┐      ┌──────────────────────┐
    │  001 SAGA Tables    │      │ ruflo_demo_schema    │
    │                     │      │ Read Model Tables    │
    │ - saga_state        │      │                      │
    │ - saga_steps        │      │ - learner_profile    │
    │ - saga_idempotency  │      │ - cert_progress      │
    │ - dlq_events        │      │ - community_profile  │
    │ - event_processing  │      │ - metrics            │
    └─────────────────────┘      └──────────┬───────────┘
          (Write-side)                       ↓
                            ┌────────────────────────┐
                            │   API Query Responses   │
                            │  (Fast, <100ms)        │
                            └────────────────────────┘
```

### Example: Certification Enrollment Workflow

**Step 1: User enrolls in certification**
- Event: `EnrollmentInitiated` published
- SAGA: `001` tracks workflow state
- Projector: Updates `learner_profile` (total_enrollments++)

**Step 2: User takes exam**
- Event: `ExamCompleted` published
- SAGA: `001` advances to `VALIDATE_EXAM` step
- Projector: Updates `certification_progress` (exam_attempts[], current_grade)

**Step 3: Badge issued**
- Event: `BadgeIssued` published
- SAGA: `001` completes workflow (status = COMPLETED)
- Projectors:
  - `learner_profile`: badges_earned++
  - `community_profile`: badge_count++, reputation_score updated
  - `metrics`: badges_issued++

**Step 4: Query the data**
```sql
-- SAGA side (write-side) - used internally
SELECT * FROM ruflo_demo_saga_state 
WHERE enrollment_id = '...' AND state = 'COMPLETED'

-- Query models (read-side) - what APIs return
SELECT badges_earned, average_score FROM ruflo_demo_learner_profile_read_model
SELECT reputation_score FROM ruflo_demo_community_profile_read_model
SELECT latency_percentiles FROM ruflo_demo_metrics_read_model
```

---

## Execution Order

When applying migrations to Supabase:

```
1. Run 001_create_saga_state.sql
   └─ Creates SAGA infrastructure tables
   └─ Sets up RLS policies for service_role access
   
2. Run ruflo_demo_schema.sql
   └─ Creates query model tables
   └─ Sets up RLS policies for fine-grained access
```

Both scripts are **idempotent** (safe to rerun) due to `IF NOT EXISTS` clauses.

---

## Security: Row Level Security (RLS)

### SAGA Tables (001)
- **Access**: Service role only
- **Reason**: Infrastructure tables, used internally by orchestrators and event bus
- **Policies**: SELECT, INSERT, UPDATE restricted to `auth.role() = 'service_role'`

### Query Model Tables (ruflo_demo_schema)
- **Access**: Fine-grained per table
- **learner_profile**: Learners see their own, authenticated users see all
- **community_profile**: Public read (leaderboards), service role write
- **metrics**: Service role only (analytics/admin)

---

## Idempotency & Exactly-Once Processing

Three mechanisms prevent duplicate processing:

1. **SAGA Idempotency** (`saga_idempotency` table)
   - Tracks events processed by a specific SAGA
   - Prevents a SAGA from re-processing its own events

2. **Global Event Processing** (`event_processing` table)
   - Tracks events processed by any handler
   - Prevents all handlers from processing duplicates

3. **Last Synced Event ID**
   - Each read model tracks `last_synced_event_id`
   - Projectors skip events already applied
   - Ensures read models are idempotent

---

## Performance Characteristics

### SAGA Tables (Write-side)
- **Latency**: Single-digit milliseconds (transactional)
- **Volume**: One record per SAGA instance
- **Optimization**: Optimistic locking (version field)

### Query Model Tables (Read-side)
- **Latency**: <100ms guaranteed
- **Volume**: One record per learner/enrollment/metric
- **Optimization**: Denormalization, pre-calculation, indexes

---

## Monitoring & Debugging

Use these queries for operational visibility:

```sql
-- Active SAGAs waiting for events
SELECT * FROM ruflo_demo_saga_state 
WHERE state = 'WAITING'
ORDER BY updated_at DESC;

-- Failed SAGAs needing intervention
SELECT * FROM ruflo_demo_saga_state 
WHERE state = 'FAILED'
ORDER BY updated_at DESC;

-- Dead letter queue (events that couldn't be processed)
SELECT * FROM ruflo_demo_dlq_events 
WHERE retry_count < max_retries
ORDER BY next_retry_at ASC;

-- Read model staleness (events not yet projected)
SELECT COUNT(*) as stale_events FROM event_log el
WHERE el.created_at > (
  SELECT COALESCE(MAX(last_synced_event_id), '1970-01-01') 
  FROM ruflo_demo_learner_profile_read_model
);

-- System metrics
SELECT period, date, total_events_processed, 
       latency_percentiles->>'p95' as p95_ms
FROM ruflo_demo_metrics_read_model
WHERE period = 'DAILY'
ORDER BY date DESC;
```

---

## Further Reading

- **CQRS Pattern**: Command Query Responsibility Segregation - separating reads (queries) from writes (commands)
- **Event Sourcing**: Storing all changes as immutable events, deriving state from event history
- **SAGA Pattern**: Distributed transaction management for multi-step workflows
- **Row Level Security**: PostgreSQL/Supabase feature for fine-grained access control

