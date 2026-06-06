# Vibe-Cast Monitoring & Observability Documentation

**Phase 4 - Documentation & Observability**

## Overview

Vibe-Cast implements a comprehensive observability strategy across three pillars:
1. **Metrics** - Quantitative measurements (counters, gauges, histograms)
2. **Logs** - Structured event logs with correlation IDs
3. **Traces** - Distributed request tracing via correlation IDs

This enables rapid detection and diagnosis of issues in the event-sourced, SAGA-orchestrated system.

---

## 1. Observability Architecture

```
┌───────────────────────────────────────────────────────────────┐
│              APPLICATION LAYER (Source)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐          │
│  │EventBus     │  │SagaOrch     │  │Projectors    │          │
│  │- publish()  │  │- execute()  │  │- handle()    │          │
│  │- retry()    │  │- compensate │  │- persist()   │          │
│  └─────────────┘  └─────────────┘  └──────────────┘          │
│         │                │                │                    │
└─────────┼────────────────┼────────────────┼────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌───────────────────────────────────────────────────────────────┐
│             INSTRUMENTATION LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Logger (structured JSON with correlationId)               │ │
│  │ - INFO: normal operations                                 │ │
│  │ - WARN: degradation / slow paths                          │ │
│  │ - ERROR: handler failures, DLQ additions                  │ │
│  │ - DEBUG: execution steps, projection updates              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ MetricsCollector (Counter, Gauge, Histogram)              │ │
│  │ - Event processing rates (events/sec)                     │ │
│  │ - Latency tracking (event → projection time)              │ │
│  │ - Handler success/failure rates                           │ │
│  │ - DLQ size and retry counts                               │ │
│  │ - SAGA step durations                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ CorrelationId Propagation                                  │ │
│  │ - Threaded through all operations                          │ │
│  │ - Enables end-to-end request tracing                       │ │
│  │ - Links logs, metrics, and traces                          │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌───────────────────────────────────────────────────────────────┐
│            STORAGE & AGGREGATION LAYER                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Supabase Postgres Database                               │  │
│  │ - Logs table with JSON indexing                          │  │
│  │ - Dead Letter Queue table (dlq_events)                   │  │
│  │ - SAGA state & step history                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Time-Series Database (e.g., Prometheus/Grafana)          │  │
│  │ - Metrics scraping every 15 seconds                       │  │
│  │ - 15-day retention by default                             │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌───────────────────────────────────────────────────────────────┐
│           VISUALIZATION & ALERTING LAYER                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │ Grafana Dashboard│  │ Datadog APM      │  │ PagerDuty  │  │
│  │ - Real-time KPIs │  │ - Distributed    │  │ - On-call  │  │
│  │ - SAGA flow vis. │  │   traces         │  │ - Alerts   │  │
│  │ - DLQ health     │  │ - Error profiles │  │ - Escalate │  │
│  └──────────────────┘  └──────────────────┘  └────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Key Metrics to Monitor

### 2.1 Event Bus Metrics

#### Events Published (Counter)
```
Metric: eventbus_events_published_total
Labels: event_type (EnrollmentStarted, BadgeIssued, etc)
Query:  rate(eventbus_events_published_total[5m])
Target: > 100 events/min during peak hours
Alert:  < 10 events/min for 5+ minutes = anomaly
```

#### Event Handler Success Rate (Counter)
```
Metric: eventbus_handler_executions_total
Labels: 
  - event_type
  - handler_type (ProjectorA, SagaOrch, etc)
  - status (success, failed, skipped)

Example Query:
  sum by (event_type) (
    rate(eventbus_handler_executions_total{status="success"}[5m])
  )

Alert: handler_success_rate < 95% for 5 minutes
```

#### Handler Execution Latency (Histogram)
```
Metric: eventbus_handler_execution_duration_ms
Labels:
  - event_type
  - handler_type
  - status

Queries:
  p50:  histogram_quantile(0.50, eventbus_handler_execution_duration_ms)
  p95:  histogram_quantile(0.95, eventbus_handler_execution_duration_ms)
  p99:  histogram_quantile(0.99, eventbus_handler_execution_duration_ms)

Target:
  p50  < 50ms   (typical)
  p95  < 200ms  (acceptable)
  p99  < 1000ms (degraded)
  
Alert: p99 latency > 2000ms for 5 minutes
```

#### Dead Letter Queue Size (Gauge)
```
Metric: eventbus_dead_letter_queue_size_events
Labels: none

Query:  eventbus_dead_letter_queue_size_events
Target: 0 (should be empty)
Alert:  > 5 events in DLQ (manual intervention needed)
Alert:  > 50 events in DLQ (critical - system degradation)
```

#### DLQ Retry Attempts (Counter)
```
Metric: eventbus_dlq_retry_attempts_total
Labels:
  - retry_count (0, 1, 2, 3)
  - result (success, failed)

Query:  sum by (result) (rate(eventbus_dlq_retry_attempts_total[5m]))
Target: Most retries succeed on 1st attempt
Alert:  Retries failing > 3 times (pattern = sustained issue)
```

#### Subscription Count (Gauge)
```
Metric: eventbus_subscriptions_total
Labels: event_type

Query:  eventbus_subscriptions_total
Target: All event types have >= 1 handler
Alert:  < 1 handler for critical event types
```

#### Event Bus Health Status (Gauge)
```
Metric: eventbus_health_status
Values:
  1 = healthy (DLQ < 10, handlers exist, scheduler running)
  0 = unhealthy

Query:  eventbus_health_status
Alert:  eventbus_health_status == 0
```

---

### 2.2 SAGA Orchestration Metrics

#### SAGA Executions (Counter)
```
Metric: saga_executions_total
Labels:
  - saga_type (EnrollmentSaga, CertificationSaga, etc)
  - status (started, completed, failed, compensated)

Query:  rate(saga_executions_total{status="started"}[5m])
Target: > 50 SAGAs/min during peak
Alert:  Sudden drop in SAGA initiation
```

#### SAGA Step Execution Time (Histogram)
```
Metric: saga_step_execution_duration_ms
Labels:
  - saga_type
  - step_name (VERIFICATION, CREATION, COMPENSATION, etc)

Queries:
  p50:  histogram_quantile(0.50, saga_step_execution_duration_ms)
  p95:  histogram_quantile(0.95, saga_step_execution_duration_ms)

Example Alert:
  VERIFICATION step p95 > 5000ms (indication of slow dependency)
```

#### SAGA Compensation Triggers (Counter)
```
Metric: saga_compensations_total
Labels:
  - saga_type
  - trigger_reason (step_failed, optimistic_lock_failed, exception)

Query:  sum by (trigger_reason) (rate(saga_compensations_total[5m]))
Target: < 1 compensation per 100 SAGA executions
Alert:  Compensation rate > 5%
```

#### SAGA State Distribution (Gauge)
```
Metric: saga_state_count
Labels:
  - saga_type
  - state (IDLE, WAITING_FOR_EVENT, PROCESSING, COMPLETED, FAILED)

Query:  saga_state_count{state="WAITING_FOR_EVENT"}
Target: Should transition out within 5 minutes
Alert:  > 100 SAGAs stuck in WAITING_FOR_EVENT
```

#### SAGA Step Failures (Counter)
```
Metric: saga_step_failures_total
Labels:
  - saga_type
  - step_name
  - error_type (validation_error, external_service_error, timeout)

Query:  sum by (step_name, error_type) (rate(saga_step_failures_total[5m]))
Alert:  Any step with > 1% failure rate
```

---

### 2.3 Projection Metrics

#### Projection Update Latency (Histogram)
```
Metric: projection_update_latency_ms
Labels:
  - projection_type (LearnerProfileProjection, CertProgressProjection)
  - event_type

Queries:
  p50:  histogram_quantile(0.50, projection_update_latency_ms)
  p95:  histogram_quantile(0.95, projection_update_latency_ms)

Target:
  p50  < 50ms   (typical)
  p95  < 200ms  (acceptable eventual consistency window)
  
Alert: p95 > 1000ms (projection staleness = poor user experience)
```

#### Projection Staleness (Gauge)
```
Metric: projection_staleness_seconds
Labels: projection_type

Calculated as: 
  now() - projection.last_synced_event_id.timestamp

Query:  projection_staleness_seconds
Target: < 100 milliseconds
Alert:  > 5 seconds (user reads stale data)
```

#### Projection Failures (Counter)
```
Metric: projection_failures_total
Labels:
  - projection_type
  - error_type (db_error, validation_error, timeout)

Query:  sum by (projection_type) (rate(projection_failures_total[5m]))
Alert:  Any projection with > 0 failures per minute
```

#### Projection Version Mismatch (Gauge)
```
Metric: projection_version_lag_events
Labels: projection_type

Indicates how many events a projection is behind

Query:  projection_version_lag_events
Target: 0 (always caught up)
Alert:  > 10 events behind
```

---

### 2.4 Database & Persistence Metrics

#### Event Store Size (Gauge)
```
Metric: eventstore_size_bytes
Query:  SELECT pg_total_relation_size('event_store')
Target: Growth proportional to event volume
Alert:  Unexpected growth spike (possible bug)
```

#### SAGA State Table Size (Gauge)
```
Metric: saga_state_table_size_bytes
Query:  SELECT pg_total_relation_size('saga_state')
Target: Keep < 500MB (archive old completed SAGAs)
```

#### Dead Letter Queue Table Size (Gauge)
```
Metric: dlq_table_size_bytes
Query:  SELECT pg_total_relation_size('dead_letter_queue')
Alert:  Growing unbounded (indicates systemic issue)
```

#### Read Model Staleness (Gauge)
```
Metric: readmodel_projection_lag_events
Labels: readmodel_name

Query:  SELECT projection_version - (SELECT MAX(version) FROM event_store)
Alert:  Lag > 100 events
```

#### Database Connection Pool (Gauge)
```
Metric: db_connection_pool_active
Metric: db_connection_pool_waiting

Query:  db_connection_pool_active
Target: Steady state < 80% of max
Alert:  Waiting > 0 (connection exhaustion imminent)
```

---

## 3. Event Sourcing Audit Queries

### Query 1: Event Volume by Type

```sql
-- Show event publishing rates over time
SELECT 
  event_type,
  DATE_TRUNC('minute', created_at) AS minute,
  COUNT(*) AS event_count,
  AVG(EXTRACT(EPOCH FROM (published_at - created_at))) AS avg_latency_sec
FROM event_store
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY event_type, DATE_TRUNC('minute', created_at)
ORDER BY minute DESC, event_count DESC;
```

### Query 2: Event Processing Latency Distribution

```sql
-- P50, P95, P99 latencies for handlers
SELECT 
  event_type,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY handler_latency_ms) AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY handler_latency_ms) AS p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY handler_latency_ms) AS p99_ms,
  MAX(handler_latency_ms) AS max_ms,
  COUNT(*) AS handler_executions
FROM event_handler_executions
WHERE executed_at >= NOW() - INTERVAL '1 hour'
GROUP BY event_type
ORDER BY p99_ms DESC;
```

### Query 3: Dead Letter Queue Health

```sql
-- Find events stuck in DLQ
SELECT 
  event_id,
  event_type,
  correlation_id,
  retry_count,
  created_at,
  last_attempted_at,
  failure_reason,
  AGE(NOW(), created_at) AS time_in_dlq
FROM dead_letter_queue
WHERE resolved_at IS NULL
ORDER BY created_at ASC;
```

### Query 4: SAGA Execution Audit Trail

```sql
-- Complete audit trail for a SAGA execution
SELECT 
  saga_id,
  state,
  current_step,
  step_name,
  step_status,
  execution_time_ms,
  executed_at,
  error_message
FROM saga_state
LEFT JOIN saga_step_history ON saga_state.saga_id = saga_step_history.saga_id
WHERE saga_id = $1
ORDER BY executed_at ASC;
```

### Query 5: Compensation Event Analysis

```sql
-- Identify compensation patterns (failures triggering rollback)
SELECT 
  saga_type,
  current_step AS failure_step,
  COUNT(*) AS compensation_count,
  ROUND(100.0 * COUNT(*) / (
    SELECT COUNT(*) FROM saga_state WHERE saga_type = $1
  ), 2) AS compensation_percentage
FROM saga_state
WHERE is_compensated = TRUE
  AND saga_type = $1
  AND completed_at >= NOW() - INTERVAL '24 hours'
GROUP BY saga_type, current_step
ORDER BY compensation_count DESC;
```

### Query 6: Idempotency Verification

```sql
-- Verify no duplicate handler executions for same event
SELECT 
  event_id,
  handler_id,
  COUNT(*) AS execution_count,
  CASE 
    WHEN COUNT(*) > 1 THEN 'DUPLICATE_DETECTED'
    ELSE 'OK'
  END AS idempotency_status
FROM event_idempotency
GROUP BY event_id, handler_id
HAVING COUNT(*) > 1
ORDER BY execution_count DESC;
```

### Query 7: Projection Consistency Check

```sql
-- Verify projection event versions match source
SELECT 
  p.projection_type,
  p.projection_version,
  MAX(e.version) AS latest_event_version,
  (MAX(e.version) - p.projection_version) AS lag_events,
  p.last_synced_event_id,
  p.updated_at
FROM read_model_metadata p
LEFT JOIN event_store e ON e.id = p.last_synced_event_id
GROUP BY p.projection_type, p.projection_version, p.last_synced_event_id, p.updated_at
ORDER BY lag_events DESC;
```

---

## 4. Health Check Endpoints

### Endpoint 1: System Health

```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-06-15T14:22:00Z",
  "checks": {
    "eventbus": {
      "status": "healthy",
      "dlq_size": 0,
      "subscription_count": 12,
      "processed_events": 45823
    },
    "database": {
      "status": "healthy",
      "connection_pool_active": 8,
      "connection_pool_max": 20,
      "response_time_ms": 5
    },
    "projections": {
      "status": "healthy",
      "staleness_max_ms": 87,
      "failed_updates": 0
    },
    "sagas": {
      "status": "healthy",
      "active_sagas": 23,
      "failed_compensation": 0
    }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2026-06-15T14:22:00Z",
  "issues": [
    "EventBus: DLQ size = 15 (threshold: 10)",
    "Projections: LearnerProfileProjector staleness = 5247ms (threshold: 1000ms)"
  ]
}
```

### Endpoint 2: EventBus Health

```http
GET /health/eventbus
```

**Response:**
```json
{
  "status": "healthy",
  "dlq_size": 0,
  "dlq_max_retries": 3,
  "subscription_count": 12,
  "processed_event_count": 45823,
  "scheduler_running": true,
  "backoff_delays_ms": [1000, 2000, 4000, 8000]
}
```

### Endpoint 3: SAGA Orchestrator Health

```http
GET /health/sagas
```

**Response:**
```json
{
  "status": "healthy",
  "active_sagas": 23,
  "sagas_by_state": {
    "IDLE": 5,
    "WAITING_FOR_EVENT": 12,
    "PROCESSING": 6,
    "COMPLETED": 10234,
    "FAILED": 2
  },
  "recent_failures": [
    {
      "saga_id": "saga-001",
      "type": "CertificationSaga",
      "failed_at": "2026-06-15T14:20:00Z",
      "failure_reason": "External certification service timeout"
    }
  ]
}
```

---

## 5. Dashboard Recommendations

### Dashboard 1: Real-Time Event Flow

**Title:** Event Processing Pipeline

**Panels:**
1. **Events Published/sec** (time series)
   - Metric: `rate(eventbus_events_published_total[1m])`
   - Color: green if > 50, yellow if 10-50, red if < 10
   
2. **Handler Success Rate** (gauge)
   - Metric: `sum(rate(eventbus_handler_executions_total{status="success"}[5m])) / sum(rate(eventbus_handler_executions_total[5m]))`
   - Target: > 95%
   
3. **Event Latency P95** (gauge)
   - Metric: `histogram_quantile(0.95, eventbus_handler_execution_duration_ms)`
   - Target: < 200ms
   
4. **Dead Letter Queue Size** (gauge)
   - Metric: `eventbus_dead_letter_queue_size_events`
   - Target: 0
   - Alert threshold: > 5

5. **Active Subscriptions** (bar chart)
   - Metric: `eventbus_subscriptions_total`
   - Group by: event_type

### Dashboard 2: SAGA Orchestration

**Title:** Distributed Transaction Workflows

**Panels:**
1. **SAGA Executions per Type** (bar chart)
   - Metric: `sum by (saga_type) (rate(saga_executions_total[5m]))`
   
2. **SAGA Success Rate** (gauge)
   - Metric: Success / (Success + Failed) over 1 hour
   
3. **Compensation Rate** (time series)
   - Metric: `rate(saga_compensations_total[5m])`
   - Target: < 1% of executions
   
4. **SAGA Step Durations** (heatmap)
   - Metric: `saga_step_execution_duration_ms`
   - Shows which steps are slow
   
5. **Active SAGAs by State** (stacked area)
   - Metric: `saga_state_count`
   - Group by: state

### Dashboard 3: Projection Consistency

**Title:** Read Model Health

**Panels:**
1. **Projection Staleness** (time series)
   - Metric: `projection_staleness_seconds`
   - Target: < 100ms (all projections)
   
2. **Update Latency by Projection** (bar chart)
   - Metric: `histogram_quantile(0.95, projection_update_latency_ms)`
   - Group by: projection_type
   
3. **Projection Failures** (time series)
   - Metric: `rate(projection_failures_total[5m])`
   - Group by: projection_type
   
4. **Event Lag Distribution** (table)
   - Query audit query #7
   - Shows which projections are behind

### Dashboard 4: System Overview

**Title:** Operational Health

**Panels:**
1. **Overall System Status** (status card)
   - Green: All checks healthy
   - Yellow: One check degraded
   - Red: Multiple checks failed
   
2. **Top Issues** (table)
   - Auto-generated from alert rules firing
   
3. **Throughput Capacity** (gauge)
   - Events/sec vs configured max
   - Target: < 80% of capacity
   
4. **Cost Tracking** (time series)
   - Database storage growth
   - Compute utilization

---

## 6. Alerting Rules

### Alert 1: Dead Letter Queue Accumulation

```
name: DLQAccumulation
condition: eventbus_dead_letter_queue_size_events > 5
for: 5 minutes
severity: warning

name: DLQCritical
condition: eventbus_dead_letter_queue_size_events > 50
for: 1 minute
severity: critical
```

**Action:** Page on-call engineer; DLQ indicates sustained failures requiring manual intervention.

### Alert 2: Handler Failure Rate Spike

```
name: HandlerFailureRateHigh
condition: 
  (1 - (sum(rate(eventbus_handler_executions_total{status="success"}[5m])) / 
        sum(rate(eventbus_handler_executions_total[5m])))) > 0.05
for: 5 minutes
severity: warning
```

**Action:** Investigate failing handler type; check logs for error patterns.

### Alert 3: Projection Staleness

```
name: ProjectionStaleness
condition: projection_staleness_seconds > 5
for: 3 minutes
severity: warning

name: ProjectionStalenessCritical
condition: projection_staleness_seconds > 30
for: 1 minute
severity: critical
```

**Action:** Check projector logs; may indicate database performance issue or missing event handler.

### Alert 4: SAGA Compensation Spike

```
name: SAGACompensationRateHigh
condition: 
  rate(saga_compensations_total[5m]) / rate(saga_executions_total[5m]) > 0.01
for: 5 minutes
severity: warning
```

**Action:** Review SAGA step failures; may indicate external service degradation.

### Alert 5: Database Connection Exhaustion

```
name: DatabaseConnectionPoolExhausted
condition: db_connection_pool_waiting > 0
for: 1 minute
severity: critical
```

**Action:** Immediate incident response; connection exhaustion causes request queuing/timeouts.

### Alert 6: Event Bus Scheduler Down

```
name: EventBusSchedulerDown
condition: eventbus_health_status == 0
for: 1 minute
severity: critical
```

**Action:** Application needs restart; DLQ retry mechanism is not running.

---

## 7. Performance Baselines

### Expected Metrics (Normal Operation)

| Metric | P50 | P95 | P99 | Max |
|--------|-----|-----|-----|-----|
| Event publish → handler execution | 5ms | 50ms | 200ms | 500ms |
| Event → projection update | 10ms | 100ms | 300ms | 1000ms |
| SAGA step execution | 20ms | 100ms | 500ms | 2000ms |
| DLQ retry latency | 5ms | 50ms | 200ms | 500ms |
| Handler success rate | 99.5% | 99.8% | 99.9% | - |
| SAGA completion rate | 98% | 99% | 99.5% | - |

### Degraded Operation Indicators

| Condition | Action |
|-----------|--------|
| Handler latency p95 > 500ms | Check database slow query log |
| Handler failure rate > 5% | Review error logs; check external dependencies |
| Projection staleness > 5 seconds | Restart projector; check database |
| SAGA compensation rate > 2% | Review step failures; check external services |
| DLQ size > 10 | Page on-call; manual intervention required |

---

## 8. Runbooks

### Runbook 1: High DLQ Size

**Problem:** DLQ size > 10 events

**Diagnosis:**
```bash
# 1. Query what's in DLQ
SELECT event_id, event_type, failure_reason, retry_count, created_at
FROM dead_letter_queue
WHERE resolved_at IS NULL
ORDER BY created_at ASC;

# 2. Check handler logs for errors
SELECT * FROM logs 
WHERE correlationId IN (SELECT correlation_id FROM dead_letter_queue WHERE resolved_at IS NULL)
ORDER BY timestamp DESC;

# 3. Check external service status (e.g., certification system)
curl https://external-service/health
```

**Resolution:**
1. If transient (temp service outage): Wait for service recovery; DLQ will auto-retry
2. If handler bug: Fix code, redeploy
3. If data issue: Fix data in database, manually retry specific DLQ events:
   ```bash
   curl -X POST /admin/dlq/retry/{dlqEventId}
   ```

### Runbook 2: Projection Staleness

**Problem:** Projection hasn't been updated for > 5 seconds

**Diagnosis:**
```bash
# 1. Check projector logs
SELECT * FROM logs WHERE logger_name LIKE '%Projector%' 
AND timestamp >= NOW() - INTERVAL '10 minutes'
ORDER BY timestamp DESC;

# 2. Verify events are being published
SELECT COUNT(*) FROM event_store 
WHERE created_at >= NOW() - INTERVAL '5 minutes';

# 3. Check if handler is registered
GET /health/eventbus
```

**Resolution:**
1. Check if projector handler is registered: `eventbus_subscriptions_total`
2. Restart projector service
3. If events are not being published: check EventBus health
4. If DLQ is full: work through DLQ runbook

### Runbook 3: SAGA Compensation Spike

**Problem:** SAGA compensation rate > 2%

**Diagnosis:**
```bash
# 1. Find failing SAGAs
SELECT saga_type, current_step, COUNT(*) AS failure_count
FROM saga_state
WHERE is_compensated = TRUE AND completed_at >= NOW() - INTERVAL '1 hour'
GROUP BY saga_type, current_step
ORDER BY failure_count DESC;

# 2. Check why specific step fails
SELECT * FROM logs
WHERE saga_id = $1
ORDER BY timestamp ASC;

# 3. Check external service status (if step calls external API)
curl https://external-certification-service/health
```

**Resolution:**
1. If external service is down: wait for recovery; SAGAs will retry
2. If validation error: check if business logic changed; may need data migration
3. If exception in code: fix bug, redeploy, manually retry failed SAGAs:
   ```bash
   curl -X POST /admin/sagas/{sagaId}/retry
   ```

---

## 9. Correlation ID Tracking

### Correlation ID Format
```
corr-{ISO8601-timestamp}-{random-8-chars}
Example: corr-2026-06-15T14-22-00Z-abc123xy
```

### Correlation ID Flow

```
API Request arrives:
  POST /enrollment
  Body: { learnerId, pathId, correlationId: "corr-..." }
    │
    ├─> Application Service
    │   └─> Log: { correlationId: "corr-...", action: "CreateEnrollment" }
    │
    ├─> Domain Aggregate
    │   └─> Event created: { id: "evt-...", correlationId: "corr-..." }
    │
    ├─> EventBus.publish()
    │   └─> Log: { correlationId: "corr-...", event: "EnrollmentStarted" }
    │
    ├─> LearnerProfileProjector.handle()
    │   └─> Log: { correlationId: "corr-...", action: "UpdateProfile" }
    │
    ├─> CertificationSAGA.handleEvent()
    │   └─> Log: { correlationId: "corr-...", saga: "CertificationSaga" }
    │
    └─> Final Response: { enrollmentId: "...", correlationId: "corr-..." }
```

### Using Correlation IDs in Queries

```bash
# Trace single request through system
SELECT * FROM logs WHERE correlationId = 'corr-...' ORDER BY timestamp;

# Track event publishing and handling
SELECT event_id, correlationId, event_type, status FROM events
WHERE correlationId = 'corr-...';

# Find SAGA execution for request
SELECT saga_id, state, current_step FROM saga_state
WHERE correlationId = 'corr-...';
```

---

## 10. Observability Checklist

Before deploying to production:

- [ ] Logger initialized with correlationId tracking
- [ ] MetricsCollector integrated with EventBus
- [ ] All handler executions wrapped with execution_time tracking
- [ ] SAGA step executions tracked with histogram metrics
- [ ] Dead Letter Queue exports size gauge
- [ ] Projection update latency measured
- [ ] Database queries indexed for observability tables
- [ ] Health check endpoints implemented
- [ ] Alerting rules configured in monitoring tool
- [ ] Grafana dashboards created
- [ ] Runbooks documented
- [ ] On-call rotation configured

---

## References

- [API Documentation](./API.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [SAGA Flows Design](./SAGA_FLOWS_DESIGN.md)
- [EventBus Implementation](../src/shared/infrastructure/events/EventBus.ts)
- [SagaOrchestrator Implementation](../src/shared/domain/SagaOrchestrator.ts)
