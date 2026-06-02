# ADR-011: CQRS Read Model Strategy — ClickHouse + Elasticsearch for Week 11

**Status:** ACCEPTED (2026-06-02)  
**Context:** Week 9 foundation; Week 11 analytics integration; Phase 2 observability  
**Deciders:** Architecture team, Analytics lead  

---

## Problem

Vibe-Cast operational queries require low-latency, complex aggregations across unbounded data volumes:

1. **Dashboard queries** (real-time):
   - Learner progress by path (GROUP BY pathId, COUNT enrollments, AVG score)
   - Certification exam results histogram (by attempt, by cohort, by date range)
   - Community leaderboard (TOP 100 by reputation score, badge count, contribution count)
   - Metrics anomalies (e.g., "exam pass rate dropped 15% in last 2 hours")

2. **Analytical queries** (batch, multi-minute aggregations):
   - Cohort analytics (Week 1-9 learner retention, success rate by path)
   - Certification ROI (cost per badge issued, time to certification)
   - Community sentiment (badge earn rate, peer review quality trends)
   - Predictive metrics (learner drop-off risk, exam failure probability)

3. **Event-driven updates:**
   - New events (EnrollmentCreated, ExamPassed, BadgeIssued) must materialize to dashboards within 2-5 seconds
   - Schema changes must be backward compatible (e.g., adding new dimensions to learner profile)
   - Late-arriving data must not corrupt aggregate snapshots (e.g., exam score corrected 1 hour later)

4. **Constraints:**
   - Week 9: Single-machine, no external dependencies → queries run against primary PostgreSQL read-only replica
   - Week 10: In-process aggregations (memory-resident materialized views)
   - Week 11: Distributed analytics (ClickHouse for aggregations, Elasticsearch for search)
   - Week 12: Real-time streaming (Kafka → Flink → ClickHouse denormalization)
   - Scale: 500 learners, 50 concurrent dashboards, 1000+ events/min peak

**Problem:** PostgreSQL optimized for OLTP (high concurrency, small writes). Analytical queries (scanning 100k+ rows, GROUP BY 5 dimensions) lock readers or slow writes. CQRS separates writes (OLTP) from reads (OLAP) using event-driven materialization.

---

## Decision

Implement **CQRS (Command Query Responsibility Segregation)** with tiered read models:

```
┌──────────────────────────────────────────────────────────┐
│         Event Stream (ADR-009 EventBus)                  │
│  LearnerEnrolled, ExamPassed, BadgeIssued, etc.          │
└─────────────┬────────────────────────────────────────────┘
              │
         ┌────┴──────────────┬───────────────────┬──────────────┐
         │                   │                   │              │
    ┌────▼────┐      ┌──────▼──────┐  ┌────────▼────┐  ┌─────▼────────┐
    │PostgreSQL│      │ClickHouse   │  │ Elasticsearch│  │ Redis Cache  │
    │(OLTP)   │      │ (Analytics) │  │ (Full-text) │  │ (Hot reads)  │
    │Primary  │      │ Aggregates  │  │ Denormal    │  │ Session data │
    │Write    │      │ Snapshots   │  │ Documents   │  │              │
    └─────────┘      └─────────────┘  └─────────────┘  └──────────────┘
         │                   │               │               │
         └──────────────┬────┴───────────────┴───────────────┘
                        │
                  ┌─────▼──────────────┐
                  │  Dashboard / API   │
                  │  (10ms latency)    │
                  └────────────────────┘
```

### Week 9-10: PostgreSQL Read Replica

**Tier 1 (Immediate):**
- Write model: PostgreSQL primary (transactional)
- Read model: PostgreSQL replica (denormalized views)
- Query patterns: Views materialized on-demand or hourly

```sql
-- Materialized view: learner progress
CREATE MATERIALIZED VIEW mv_learner_progress AS
SELECT
  e.learner_id,
  e.path_id,
  COUNT(*) as courses_completed,
  AVG(e.final_score) as avg_score,
  MAX(e.completed_at) as last_completed,
  COUNT(CASE WHEN e.status = 'ACTIVE' THEN 1 END) as active_enrollments
FROM enrollments e
GROUP BY e.learner_id, e.path_id;

CREATE INDEX idx_mv_learner_progress_learner_id ON mv_learner_progress(learner_id);

-- Materialized view: exam pass rates by cohort
CREATE MATERIALIZED VIEW mv_exam_pass_rates AS
SELECT
  DATE(ex.completed_at) as exam_date,
  ex.exam_name,
  COUNT(*) as attempts,
  COUNT(CASE WHEN ex.score >= 75 THEN 1 END) as passes,
  ROUND(100.0 * COUNT(CASE WHEN ex.score >= 75 THEN 1 END) / COUNT(*), 2) as pass_rate
FROM exams ex
WHERE ex.status = 'COMPLETED'
GROUP BY DATE(ex.completed_at), ex.exam_name;

-- Refresh materialized view every 5 minutes
-- (via cron job or Airflow)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_learner_progress;
```

**Cost:** Zero (exists already). **Latency:** 5-30 seconds (hourly refresh).

### Week 11: ClickHouse + Elasticsearch (Production)

**Tier 2 (Event-driven materialization):**

#### ClickHouse (Time-series analytics)

**Architecture:**
```typescript
// Event handler: consume from EventBus, write to ClickHouse
class ClickHouseMaterializer {
  async onDomainEvent(event: DomainEvent): Promise<void> {
    // 1. Map event to fact table row
    const factRow = this.mapEventToFact(event);
    
    // 2. Write to ClickHouse (async batch)
    await this.clickHouseClient.insert({
      table: 'vibe_facts',
      values: [factRow],
      format: 'JSONEachRow'
    });
    
    // 3. Trigger incremental aggregation (materialized view)
    // ClickHouse materializes instantly (column-oriented OLAP)
  }
  
  mapEventToFact(event: DomainEvent): any {
    if (event.type === 'LearnerEnrolled') {
      return {
        eventId: event.id,
        eventType: 'enrollment_created',
        timestamp: event.timestamp,
        learnerId: event.data.learnerId,
        pathId: event.data.pathId,
        enrolledAt: event.data.enrolledAt,
        correlationId: event.correlationId,
        source: event.boundedContext
      };
    }
    // ... other event types
  }
}
```

**Schema (DDL):**
```sql
-- Fact table: immutable, append-only, columnar
CREATE TABLE vibe_facts (
  eventId UUID,
  eventType String,
  timestamp DateTime,
  learnerId UUID,
  pathId Nullable(UUID),
  enrolledAt Nullable(DateTime),
  score Nullable(Float32),
  badgeId Nullable(UUID),
  competencyId Nullable(UUID),
  correlationId UUID,
  source String
) ENGINE = MergeTree()
ORDER BY (timestamp, learnerId)
PARTITION BY toYYYYMM(timestamp);

-- Materialized view: learner progress snapshot
CREATE MATERIALIZED VIEW mv_learner_stats TO learner_stats AS
SELECT
  learnerId,
  pathId,
  countIf(eventType = 'enrollment_created') as enrollments,
  avgIf(score, score > 0) as avg_score,
  maxIf(timestamp, eventType = 'exam_passed') as last_exam,
  countIf(eventType = 'badge_issued') as badges_earned
FROM vibe_facts
GROUP BY learnerId, pathId;

-- Dashboard query: sub-100ms at 500 learners
SELECT
  pathId,
  countDistinct(learnerId) as learner_count,
  round(avgIf(avg_score, avg_score > 0), 2) as cohort_avg_score,
  countIf(badges_earned > 0) as badges_issued_count
FROM learner_stats
GROUP BY pathId;
```

**Why ClickHouse?**
- **Column-oriented:** Queries touching 5 dimensions scan 1/10th the data of PostgreSQL row store
- **Compression:** 10-100x compression; 100k exam records = 5MB on disk
- **Materialized views:** Instant aggregation on INSERT (no batch jobs)
- **Distributed:** Can shard by learnerId or pathId for 100k+ concurrent aggregations
- **Cost:** $200/month managed (Week 11 onward)

#### Elasticsearch (Full-text + fuzzy search)

**Architecture:**
```typescript
// Event handler: enrich and denormalize for search
class ElasticsearchDenormalizer {
  async onDomainEvent(event: DomainEvent): Promise<void> {
    const doc = this.mapEventToDocument(event);
    
    await this.elasticsearchClient.index({
      index: 'vibe_learners',
      id: event.data.learnerId,
      body: doc,
      refresh: true // Update search index immediately
    });
  }
  
  mapEventToDocument(event: DomainEvent): any {
    // Aggregate: flatten nested data for search
    return {
      learnerId: event.data.learnerId,
      name: event.metadata.learnerName,  // Denormalized from enrollments
      email: event.metadata.email,       // Denormalized
      paths: event.metadata.enrolledPaths,
      badges: event.metadata.badges,
      reputation_score: event.metadata.reputationScore,
      last_activity: event.timestamp,
      status: 'active',
      // Suggest field for autocomplete
      suggest: {
        input: [event.metadata.learnerName, event.metadata.email],
        weight: event.metadata.reputationScore
      }
    };
  }
}
```

**Queries (Elasticsearch):**
```typescript
// Leaderboard: TOP 100 by reputation
const leaderboard = await elasticsearchClient.search({
  index: 'vibe_learners',
  body: {
    query: { match_all: {} },
    sort: [{ reputation_score: { order: 'desc' } }],
    size: 100,
    _source: ['learnerId', 'name', 'reputation_score', 'badges']
  }
});

// Autocomplete: "ja" → John, Jane
const suggestions = await elasticsearchClient.search({
  index: 'vibe_learners',
  body: {
    query: {
      match: {
        suggest: {
          query: 'ja',
          fuzziness: 'AUTO',
          operator: 'and'
        }
      }
    },
    size: 10
  }
});

// Badge holders: community members with "TDD Expert" badge
const badgeHolders = await elasticsearchClient.search({
  index: 'vibe_learners',
  body: {
    query: {
      nested: {
        path: 'badges',
        query: { term: { 'badges.name': 'TDD Expert' } }
      }
    }
  }
});
```

**Why Elasticsearch?**
- **Full-text search:** "find all learners who mention 'React' in profiles"
- **Fuzzy matching:** Typo tolerance ("Jon" → "John")
- **Autocomplete:** Real-time suggestions for learner names
- **Aggregations:** Leaderboard queries (sort by reputation) in <100ms
- **Cost:** $200/month managed (Week 11 onward)

### Redis Cache (Hot Reads)

**Tier 0 (Sub-millisecond access):**

```typescript
// Cache layer: most-requested queries
class ReadModelCache {
  async getLeaderboard(limit = 100): Promise<Learner[]> {
    const cached = await this.redis.get('leaderboard:top100');
    if (cached) return JSON.parse(cached);
    
    // Cache miss: query Elasticsearch
    const leaderboard = await elasticsearchClient.search({
      index: 'vibe_learners',
      sort: [{ reputation_score: { order: 'desc' } }],
      size: limit
    });
    
    // Cache for 30 seconds (leaderboard updates infrequently)
    await this.redis.setex('leaderboard:top100', 30, JSON.stringify(leaderboard.hits.hits));
    return leaderboard.hits.hits;
  }
  
  async getLearnerProgress(learnerId: UUID): Promise<Progress> {
    const cached = await this.redis.hgetall(`learner:${learnerId}:progress`);
    if (cached.enrollments) return cached; // Cache hit
    
    // Cache miss: query ClickHouse
    const progress = await clickHouseClient.query({
      query: `SELECT * FROM learner_stats WHERE learnerId = ?`,
      query_params: [learnerId]
    });
    
    // Cache with TTL = time until next expected event (e.g., exam completion)
    await this.redis.hset(`learner:${learnerId}:progress`, progress);
    await this.redis.expire(`learner:${learnerId}:progress`, 300); // 5 min
    return progress;
  }
  
  // Invalidation on domain event
  onBadgeIssued(event: BadgeIssuedEvent): void {
    // Invalidate learner cache (badge count changed)
    this.redis.del(`learner:${event.learnerId}:progress`);
    // Invalidate leaderboard (reputation may have changed)
    this.redis.del('leaderboard:*');
  }
}
```

---

## Read Model Update Flow (Event-Driven)

```sequence
Learning Service
  │
  ├─→ Create Enrollment
  │   (Write to PostgreSQL primary)
  │
  └─→ Publish LearnerEnrolled event
      (to EventBus)
         │
         ├─→ ClickHouseMaterializer
         │   (Insert fact row to vibe_facts table)
         │   ├─→ Materialized view updates instantly
         │   └─→ Dashboard query <100ms latency
         │
         ├─→ ElasticsearchDenormalizer
         │   (Upsert learner document)
         │   └─→ Leaderboard search <50ms latency
         │
         └─→ CacheInvalidator
             (Delete cached queries)
             └─→ Next query recomputes fresh
```

---

## Data Freshness & Consistency

| Query Type | Source | Latency | Freshness | Trade-off |
|------------|--------|---------|-----------|-----------|
| **Hot reads** (leaderboard, progress) | Redis → ClickHouse | <50ms | 5-30s stale | Cache TTL |
| **Analytical** (cohort stats, ROI) | ClickHouse materialized view | 50-500ms | 0-2s (event-driven) | Near real-time |
| **Full-text** (badge search) | Elasticsearch | 10-100ms | 1-2s (refresh) | Acceptable lag |
| **Audit trail** (exam history) | PostgreSQL primary | 10-50ms | Transactional | Slow for 100k rows |

**Late-arriving data handling:**
```typescript
// Example: Exam score corrected 1 hour after completion
async onExamCorrected(event: ExamCorrectedEvent) {
  const examId = event.data.examId;
  const newScore = event.data.correctedScore;
  
  // 1. Update PostgreSQL primary (transactional)
  await prisma.exam.update({
    where: { id: examId },
    data: { score: newScore }
  });
  
  // 2. Emit correction event (ClickHouse fact table)
  await eventBus.publish(new ExamCorrectionEvent({
    examId,
    originalScore: event.data.previousScore,
    correctedScore: newScore,
    correctionReason: 'grading error'
  }));
  
  // 3. Re-aggregate ClickHouse materialized views
  // (ClickHouse idempotent: duplicate fact rows ignored via DISTINCT)
  
  // 4. Invalidate cache
  await cache.del(`learner:${event.data.learnerId}:progress`);
}
```

---

## Failure Modes & Recovery

### Week 9-10 (PostgreSQL-only)
| Scenario | Recovery |
|----------|----------|
| Materialized view stale | Manual REFRESH (hourly cron) |
| Read query times out | Increase replica hardware or add index |
| Event not processed | Replay from SQLite event log |

### Week 11 (ClickHouse + Elasticsearch)
| Scenario | Recovery |
|----------|----------|
| ClickHouse node down | Replicate to secondary, failover DNS |
| Elasticsearch index corrupted | Rebuild from event log replay |
| Cache stale (Redis down) | Query ClickHouse directly (higher latency) |
| Denormalization lag (2s) | Acceptable; dashboard eventual consistency |

---

## Configuration

**Week 9-10 (.env):**
```bash
READ_MODEL_TYPE=postgresql
READ_MODEL_REPLICA_URL=postgresql://user:pass@replica.local:5432/vibe-cast
MATERIALIZED_VIEW_REFRESH_INTERVAL_MINUTES=60
CACHE_TYPE=none
```

**Week 11 (.env upgrade):**
```bash
READ_MODEL_TYPE=multi
CLICKHOUSE_URL=http://clickhouse.local:8123
CLICKHOUSE_DATABASE=vibe_cast
ELASTICSEARCH_NODES=https://elasticsearch.local:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=
REDIS_URL=redis://redis.local:6379
READ_MODEL_CACHE_TTL_SECONDS=300
DENORMALIZATION_BATCH_SIZE=1000
DENORMALIZATION_INTERVAL_MS=5000
```

---

## Observability & Debugging

**ClickHouse queries (operational):**
```sql
-- Fact table size
SELECT
  table,
  sum(bytes) as size_bytes,
  count() as row_count
FROM system.parts
WHERE table = 'vibe_facts'
GROUP BY table;

-- Slow queries (>1s)
SELECT
  query_start_time,
  query,
  query_duration_ms
FROM system.query_log
WHERE query_duration_ms > 1000
ORDER BY query_start_time DESC
LIMIT 10;

-- Data freshness (last event written)
SELECT
  max(timestamp) as last_event,
  now() - max(timestamp) as lag_seconds
FROM vibe_facts;
```

**Elasticsearch diagnostics:**
```bash
# Index health
curl -X GET "localhost:9200/_cluster/health?pretty"

# Shard allocation
curl -X GET "localhost:9200/_cat/shards?pretty"

# Index stats
curl -X GET "localhost:9200/vibe_learners/_stats?pretty"
```

**Cache hit rate:**
```typescript
async getMetrics(): Promise<CacheMetrics> {
  const info = await redis.info('stats');
  const hits = parseInt(info.keyspace_hits);
  const misses = parseInt(info.keyspace_misses);
  const hitRate = hits / (hits + misses);
  
  return {
    hitRate: `${(hitRate * 100).toFixed(2)}%`,
    hits,
    misses,
    recommendation: hitRate < 0.8 ? 'Increase cache TTL or pre-warm' : 'Optimal'
  };
}
```

---

## Consequences

### Positive
✅ **Sub-100ms dashboards:** ClickHouse + Redis for hot reads  
✅ **Scalable analytics:** Time-series facts partitioned by month; add nodes for throughput  
✅ **Eventual consistency:** Event-driven updates tolerate 2-5s lag; UI shows "last updated" timestamp  
✅ **Late-arriving data:** ClickHouse idempotent; corrections replay cleanly  
✅ **Search + aggregations:** Elasticsearch handles leaderboards, Elasticsearch handles full-text  

### Tradeoffs
⚠️ **Complexity:** Three databases to operate and monitor (ClickHouse, Elasticsearch, Redis)  
⚠️ **Data duplication:** Events stored 3x (PostgreSQL, ClickHouse, Elasticsearch indices)  
⚠️ **Denormalization lag:** Leaderboard may be 2-5s behind reality  
⚠️ **Storage cost:** ClickHouse + Elasticsearch = $400/month Week 11+ (vs PostgreSQL $50/month)  
⚠️ **Operational complexity:** Replica failures, shard rebalancing, index rebuilds  

---

## Alternatives Considered

### 1. PostgreSQL Aggregation Tables (No CQRS)
**Rejected:** As load grows (5k learners, 100+ concurrent dashboards), aggregate queries lock writes.  
Symptoms: "Leaderboard query running, enrollment creation blocked for 500ms."

### 2. GraphQL with DataLoader (Client-side batching)
**Rejected:** Pushes complexity to client; doesn't solve database contention.

### 3. Kafka Streams (Real-time materialization)
**Rejected:** Too heavy for Week 11; ClickHouse + event handler simpler.

### 4. Data Warehouse (Snowflake/BigQuery)
**Rejected:** Cloud cost + egress fees; 500-learner scale doesn't justify.

---

## Implementation Checklist (Week 11)

- [ ] Design ClickHouse schema (fact table, materialized views)
- [ ] Implement ClickHouseMaterializer (event handler)
- [ ] Create event-to-fact mapping for all domain events
- [ ] Design Elasticsearch document schema (denormalized learner profile)
- [ ] Implement ElasticsearchDenormalizer (event handler)
- [ ] Set up Redis as cache layer
- [ ] Create dashboard API endpoints (querying each read model)
- [ ] Implement cache invalidation logic on domain events
- [ ] Write integration tests (event → ClickHouse → dashboard latency <100ms)
- [ ] Monitor denormalization lag (emit metrics)
- [ ] Create operational runbooks (ClickHouse failover, Elasticsearch recovery)
- [ ] Document read model schema (docs/READ_MODELS.md)

**Testing Strategy:**
```typescript
// Integration test: EnrollmentCreated → Dashboard shows learner progress
describe('Read Model: EnrollmentCreated flow', () => {
  it('Learner enrolled → ClickHouse updated → Dashboard query returns <100ms', async () => {
    // 1. Create enrollment (write to PostgreSQL)
    const enrollment = await enrollmentService.enroll(learnerId, pathId);
    
    // 2. Event published → ClickHouseMaterializer processes
    await eventBus.publish(enrollment.getUncommittedEvents()[0]);
    
    // 3. Wait for denormalization
    await wait(500);
    
    // 4. Query ClickHouse materialized view
    const start = Date.now();
    const progress = await dashboardService.getLearnerProgress(learnerId);
    const latency = Date.now() - start;
    
    // Assert
    expect(latency).toBeLessThan(100);
    expect(progress.enrollments).toBe(1);
  });
});
```

---

## Related Decisions
- **ADR-009:** EventBus design (source of read model updates)
- **ADR-010:** SAGA orchestration (consumes read models for decision-making)
- **ADR-003:** Domain event sourcing (event schema)

---

**Approved by:** Architecture Lead  
**Date:** 2026-06-02  
**Review date:** 2026-09-02 (after Week 11 ClickHouse migration)
