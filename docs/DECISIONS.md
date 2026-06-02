# Week 9 Architectural Decisions Log

**Date:** 2026-06-02  
**Scope:** Foundation phase (Weeks 9-13); scaling to production (Weeks 14-16)  
**Format:** Decision summary with trade-offs, rationale, and consequences  

---

## Core Architecture Decisions

### ADR-001: Domain-Driven Design (DDD) with 5 Bounded Contexts
**Decision:** Organize system around five business domains: Learning, Certification, Skill Lab, Community, Metrics.  
**Rationale:** 500-learner scale; distinct team ownership; independent deployment cadence.  
**Trade-offs:**
- Pro: Team autonomy, parallel development, clear API contracts
- Con: Cross-domain communication complexity (anti-corruption layers, events)  
**Consequence:** Event-driven architecture required (ADR-009); SAGA patterns for workflows (ADR-010).  
**Status:** ACCEPTED (pre-existing, Week 8)

---

### ADR-002: Aggregate-Root Pattern (Event Sourcing in Certification)
**Decision:** Certification domain uses event sourcing (immutable event log as source of truth). Other domains: traditional persistence.  
**Rationale:** Certification: regulatory audit requirement (every exam review, score change tracked). Other domains: lower compliance burden.  
**Trade-offs:**
- Pro: Complete audit trail, temporal queries ("what was the learner's progress on June 1?"), easy replays
- Con: Schema evolution complexity, storage overhead (2x data)  
**Consequence:** SQLite event store (Week 9) → PostgreSQL event store (Week 11).  
**Status:** ACCEPTED (pre-existing, Week 8)

---

### ADR-003: Transactional Outbox Pattern (Future)
**Decision:** For Week 13+ reliability: write domain event + outbox row in same transaction. Background job polls outbox → publishes to RabbitMQ.  
**Rationale:** Prevent lost events (e.g., enrollment created but event not published due to crash).  
**Trade-offs:**
- Pro: Exactly-once event delivery semantics
- Con: Outbox polling adds latency (500ms-5s lag)  
**Consequence:** Requires PostgreSQL outbox table (Week 12 addition).  
**Status:** DEFERRED (implement Week 12, not Week 9)

---

### ADR-004: Repository Pattern + Data Mapper
**Decision:** Repositories abstract persistence; services talk to repositories, not directly to databases.  
**Rationale:** Testability (mock repositories), persistence agnostic (PostgreSQL → MongoDB swap possible).  
**Trade-offs:**
- Pro: Decoupling, easier unit tests
- Con: Additional abstraction layer (Mapper implementation)  
**Status:** ACCEPTED (pre-existing, Week 8)

---

### ADR-005: Value Objects for Domain Logic
**Decision:** Price, Score, Badge IDs are value objects (immutable, self-validating), not strings.  
**Rationale:** Type safety; invalid states impossible (e.g., Score < 0 or > 100 rejected at construction).  
**Trade-offs:**
- Pro: Compile-time safety, business logic clarity
- Con: More classes to maintain  
**Status:** ACCEPTED (pre-existing, Week 8)

---

### ADR-006: Bounded Context Anti-Corruption Layer (ACL)
**Decision:** Learning context → Certification context translation via ACL adapter. Not direct service calls.  
**Rationale:** Certification domain owns "exam" concept; Learning domain owns "enrollment" concept. Translation happens at boundary.  
**Example:** Learning publishes `EnrollmentCompleted` → Certification ACL translates to internal `CandidateQualified` event.  
**Trade-offs:**
- Pro: Domain language preserved, loose coupling
- Con: Translation logic duplication  
**Status:** ACCEPTED (pre-existing, Week 8)

---

### ADR-007: Repository Interfaces (Interface Segregation)
**Decision:** Repositories expose minimal CRUD interface; services extend with domain-specific queries.  
**Rationale:** Single Responsibility; repositories don't become god objects.  
**Trade-offs:**
- Pro: Focused, testable repositories
- Con: Scattered queries across services  
**Status:** ACCEPTED (pre-existing, Week 8)

---

## Week 9 Specific Decisions

### ADR-009: EventBus Design — In-Memory for Week 9, RabbitMQ for Production
**Decision:** Tiered event bus:
- Week 9: In-memory with SQLite persistence
- Week 10-13: Event handler testing, ACL development
- Week 14: Swap to RabbitMQ (same interface)  
**Rationale:**
- Week 9: Zero external dependencies, fast iteration
- Scale: 1000+ events/min (Week 15) requires RabbitMQ
- Interface-driven design allows swap without code changes  
**Trade-offs:**
- Week 9 single-machine: No event replication; system crash loses in-flight events
- Eventual consistency: Handlers run asynchronously (2-5s lag)
- Handler dependency: If slow, downstream delayed (mitigated by RabbitMQ async)  
**Consequences:**
- All handlers must be idempotent (check-before-add pattern)
- Event schema versioning required (v1, v2 compatibility)
- Correlationid + causationId for tracing cross-domain workflows  
**Status:** ACCEPTED (2026-06-02)

**Event Schema Decisions:**
- `type`: String (e.g., "LearnerEnrolled", "ExamPassed")
- `version`: Semantic (e.g., "v1", "v2") for schema evolution
- `aggregateId`: UUID of root aggregate (e.g., enrollmentId)
- `aggregateType`: String (e.g., "Enrollment", "Exam")
- `boundedContext`: String (e.g., "Learning", "Certification")
- `correlationId`: Unique per business flow (all related events share)
- `causationId`: Event that triggered this one (causal relationships)
- `timestamp`: Immutable event occurrence time
- `metadata`: Domain-specific data (learner name, exam score, etc.)  

**Partitioning Strategy:**
- Partition by bounded context (5 partitions), NOT by event type (30+ partitions)
- Rationale: Reduces operational complexity; natural retry semantics
- Order guarantee: Per-aggregateId (e.g., all exam attempts for candidate X sequenced)

**Migration Path (Week 9 → 14):**
1. Week 9: Develop handlers against in-memory EventBus
2. Week 10: Test ACL adapters (Learning → Certification events)
3. Week 11: RabbitMQ infrastructure (helm charts, failover testing)
4. Week 12: Parallel testing (both in-memory and RabbitMQ)
5. Week 13: Feature flag flip (USE_RABBITMQ=true)
6. Week 14: Monitor error rates; decommission in-memory code (keep for reference)

---

### ADR-010: SAGA Orchestration Pattern (vs Choreography)
**Decision:** Central CertificationOrchestrator coordinates 8-step certification workflow (vs event-driven choreography).  
**Rationale:**
- Scale: 500 learners, 50 concurrent workflows (manageable with orchestration)
- Visibility: Single source of truth for workflow state (helps with debugging)
- Compliance: Audit trail of every step (regulatory requirement)
- Failure recovery: Explicit compensation actions (revoke badge if exam invalid)  
**Trade-offs:**
- Pro: Observability, explicit error handling, audit trail
- Con: Orchestrator becomes a bottleneck; single point of failure  
**Consequences:**
- PostgreSQL saga_state table with JSONB workflow data
- Event handlers resume paused SAGAs (e.g., ExamCompleted → resume from WAIT_FOR_EXAM step)
- Retry logic: 3 attempts, exponential backoff, dead letter queue for poison pills  
**Status:** ACCEPTED (2026-06-02)

**Workflow Steps:**
1. INIT: Create workflow instance
2. CREATE_CANDIDATE: Insert candidate into Certification domain
3. SEND_WELCOME_EMAIL: Email service (non-blocking, can fail)
4. WAIT_FOR_EXAM: Pause, wait for ExamCompleted event
5. VALIDATE_EXAM: Check exam rules (score range, attempt count)
6. GRADE_EXAM: Score logic (74.9% fail, 75%+ pass)
7. ISSUE_BADGE_OR_REMEDIATE: Decision point (badge vs re-enrollment)
8. SCHEDULE_RENEWAL: Next certification date (12 months)
9. COMPLETE: Mark workflow done  

**Compensation (Rollback):**
- If exam invalid at step 6: walk back (revoke badge if already issued, delete candidate)
- Compensations are NOT transactional (eventual consistency); must be idempotent

**Observability:**
- SQL query: "SELECT * FROM sagas WHERE status = 'RUNNING' AND next_retry_at < NOW()" (find delayed workflows)
- Dashboard: Leaderboard of longest-running workflows (identify bottlenecks)
- Alerts: Workflow stuck >10min, exceeds retry limit

---

### ADR-011: CQRS Read Model Strategy — ClickHouse + Elasticsearch for Week 11
**Decision:** Tiered read models:
- Week 9-10: PostgreSQL materialized views (hourly refresh)
- Week 11: ClickHouse (real-time analytics) + Elasticsearch (full-text search)
- Week 12+: Kafka streaming → Flink denormalization (optional)  
**Rationale:**
- Week 9: Single machine, no analytics overhead
- Week 11: Analytical queries (GROUP BY 5 dimensions) slow down OLTP writes
- CQRS separates read and write models; independent scaling  
**Trade-offs:**
- Pro: Sub-100ms dashboards, scalable analytics, eventual consistency acceptable
- Con: 3x data duplication (PostgreSQL, ClickHouse, Elasticsearch), complexity, $400/month cost  
**Consequences:**
- Events flow: PostgreSQL (write) → ClickHouse materializer (insert fact) → materialized view update
- Cache layer: Redis for hot reads (leaderboard, learner progress)
- Denormalization lag: 2-5s (acceptable for dashboards, "last updated" timestamp shown to users)
- Late-arriving data: Exam score corrected 1h later; ClickHouse re-aggregates with idempotent views  
**Status:** ACCEPTED (2026-06-02)

**Read Model Mapping:**
| Query | Source | Latency | Freshness |
|-------|--------|---------|-----------|
| Leaderboard (top 100) | Elasticsearch sorted | 10-100ms | 1-2s lag |
| Learner progress | ClickHouse aggregate | 50-500ms | Event-driven |
| Cohort analytics | ClickHouse materialized view | 100-500ms | Per-minute |
| Audit trail (exam history) | PostgreSQL primary | 10-50ms | Transactional |

---

### ADR-012: Kubernetes Deployment Architecture — Istio Service Mesh for Week 13
**Decision:** Deploy on managed Kubernetes (EKS/AKS) with Istio service mesh (Week 13).  
**Rationale:**
- Week 9-12: Docker Compose on single machine
- Week 13: Multi-node cluster; services communicate via Envoy sidecars
- mTLS: All inter-service traffic encrypted by default
- Resilience: Circuit breaker, retries, rate limiting managed by Istio (not application code)  
**Trade-offs:**
- Pro: Auto-scaling, self-healing, zero-downtime deployments, observability
- Con: Operational complexity ($200+/month cost), learning curve, debugging harder  
**Consequences:**
- 5 services × 2-3 replicas each (10-15 pods)
- StatefulSets for PostgreSQL, RabbitMQ, Redis (persistent state)
- Canary deployments: Traffic shift 5% → 50% → 100% (automated rollback on error)
- Observability: Prometheus (metrics), Jaeger (tracing), Loki (logs)  
**Status:** ACCEPTED (2026-06-02)

**Traffic Management:**
- Circuit breaker: Eject pod after 5 consecutive 500-errors, retry after 30s
- Retries: 3 attempts with 2s timeout per attempt
- Load balancing: Round-robin (configurable: least request, ring hash)
- Rate limiting: 100 req/s per service (prevent thundering herd)
- Fault injection: 0.1% delay (chaos testing in production)

**Security:**
- mTLS: STRICT mode (all traffic encrypted)
- AuthorizationPolicy: Certificate-based access control (Learning ← Certification OK, Learning → Metrics DENY)
- JWT validation: At ingress gateway (API consumers)

---

## Cross-Cutting Decisions

### Data Persistence
**Decision Matrix:**
| Domain | Primary DB | Purpose | Week 9 |
|--------|-----------|---------|--------|
| Learning | PostgreSQL | Enrollments, courses, scores | Single DB |
| Certification | PostgreSQL + Event Store | Exams, candidates, event log | SQLite + PostgreSQL |
| Skill Lab | PostgreSQL | Lab sessions, submissions | Single DB |
| Community | PostgreSQL | Profiles, badges, reputation | Single DB |
| Metrics | ClickHouse (W11+) | Analytics facts, aggregations | PostgreSQL |

**Rationale:**
- PostgreSQL: ACID compliance, complex queries, proven at scale
- SQLite: Event sourcing (Certification), Week 9 convenience
- ClickHouse: Columnar analytics (Week 11 upgrade), not Week 9  
**Status:** ACCEPTED (2026-06-02)

---

### Authentication & Authorization
**Decision:** JWT tokens issued by centralized auth service (not in scope for Week 9). Services validate via JWKs endpoint.  
**Week 13 constraint:** Istio DENY by default (network policy); only specified paths allowed.  
**Status:** ACCEPTED (deferred implementation, assumed infrastructure)

---

### Logging & Observability
**Decision:**
- Structured logging: JSON format (timestamp, service, correlationId, level, message)
- Correlation ID: Propagated across all inter-service calls (HTTP header, RabbitMQ metadata)
- Metrics: Prometheus-compatible (REQUEST_LATENCY, ERROR_RATE, QUEUE_SIZE)
- Traces: OpenTelemetry SDK, exported to Jaeger (Week 13)  
**Week 9 scope:** Structured logs to stdout (collected by container orchestration)  
**Status:** ACCEPTED (2026-06-02)

---

### Backup & Disaster Recovery
**Decision:**
- Week 9-10: No backup (single machine, development data)
- Week 11: PostgreSQL backup (daily, 30-day retention)
- Week 13: Kubernetes StatefulSet persistent volumes (automatic snapshots)
- Event log: Immutable in PostgreSQL; recovery possible via event replay  
**Status:** DEFERRED (implement Week 11, not Week 9)

---

## Constraints & Assumptions

### Capacity Planning (500 learners)
- **Concurrent workflows:** 50 SAGA instances (certification path enrollment → exam → badge)
- **Event rate:** 1000+ events/min peak (holidays, exam day)
- **Database:** PostgreSQL single instance, 10GB storage
- **Cache:** Redis, 1GB for session + hot reads
- **Compute:** Single t3.large instance (Week 9) → 3 x t3.medium nodes (Week 13)

### Security Posture
- **Data at rest:** Encrypted (PostgreSQL pg_crypto, Kubernetes secrets)
- **Data in transit:** HTTPS (Week 13 Istio mTLS)
- **Secrets:** Kubernetes secrets, not .env files
- **GDPR:** Data retention policy (anonymize learner data after 3 years)

### Team Topology
- **Backend:** 3 engineers (1 per domain pair: Learning+Cert, Lab+Community, Metrics+Infra)
- **DevOps:** 1 engineer (database, CI/CD, monitoring)
- **Release:** Weekly to staging (Monday), biweekly to production (Friday)

---

## Decisions Not Made (Deferred)

### Week 10 Decisions
- Service mesh observability (Kiali dashboard)
- Event versioning strategy (v1 → v2 schema migration)
- Rate limiting per API consumer
- Kafka cluster topology (if RabbitMQ insufficient by Week 15)

### Week 11 Decisions
- Machine learning (learner drop-off prediction)
- Full-text search over exam history
- Data warehouse (Snowflake)
- Advanced caching strategies (distributed cache invalidation)

### Week 12+ Decisions
- Multi-region deployment (traffic failover)
- Blue-green deployments (vs canary)
- Compliance frameworks (SOC2, ISO27001)

---

## Decision Change Log

| Date | ADR | Decision | Reason | Status |
|------|-----|----------|--------|--------|
| 2026-06-02 | 009 | In-memory EventBus + SQLite | Week 9 fast iteration | ACCEPTED |
| 2026-06-02 | 010 | Orchestration pattern | Scale + observability | ACCEPTED |
| 2026-06-02 | 011 | PostgreSQL views (W9), ClickHouse (W11) | Tiered upgrade path | ACCEPTED |
| 2026-06-02 | 012 | Kubernetes + Istio (W13) | Production scale, reliability | ACCEPTED |

---

## Related Documentation
- **ARCHITECTURE.md:** High-level system design, domain models
- **EVENT_SCHEMA.md:** Event format specifications (shared across all domains)
- **KUBERNETES.md:** Operational runbooks (cluster setup, failover, scaling)
- **SAGA_WORKFLOWS.md:** Certification SAGA state machine diagram, step definitions
- **READ_MODELS.md:** ClickHouse schema, Elasticsearch document format
- **MONITORING.md:** Prometheus alerts, Grafana dashboards, SLOs

---

**Approved by:** Architecture Lead  
**Last updated:** 2026-06-02  
**Next review:** 2026-08-02 (pre-Week 13 infrastructure cutover)
