# Week 9-16 Coordination Notes: Domain Readiness & Dependencies

**Date:** 2026-06-02  
**Scope:** Architectural integration across five bounded contexts  
**Format:** Dependency matrix, readiness status, risk/blocker tracking  

---

## Domain Readiness Summary (Week 9)

### Learning Domain
**Owner:** Backend Team A  
**Status:** 🟢 READY for Event Publishing  
**Completion:**
- ✅ Enrollment aggregate (create, complete, drop)
- ✅ Course progression logic
- ✅ Score calculation + validation
- ✅ Domain events (LearnerEnrolled, EnrollmentCompleted, CourseCompleted)
- ✅ Event publishing via EventBus interface
- ✅ Unit tests (aggregate, repository, event handler)
- ⏳ Integration tests (event flow to other domains) — Week 10

**Contract (Events Produced):**
```typescript
LearnerEnrolled(learnerId, pathId, enrolledAt)
CourseCompleted(enrollmentId, courseId, score)
EnrollmentCompleted(enrollmentId, learnerId, pathId, finalScore)
EnrollmentDropped(enrollmentId, reason)
```

**Dependencies (Consumes):**
- `CandidateQualified` (from Certification) → triggers Learning record update
- `BadgeIssued` (from Community) → learner profile enrichment (future)

**Known Issues:**
- None at ADR stage; implementation blockers tracked separately

---

### Certification Domain
**Owner:** Backend Team A  
**Status:** 🟢 READY for Event Sourcing + SAGA  
**Completion:**
- ✅ Exam aggregate (schedule, complete, grade)
- ✅ Candidate aggregate (qualify, attempt, pass/fail)
- ✅ Event sourcing implementation (event store)
- ✅ SAGA orchestrator (CertificationOrchestrator class skeleton)
- ✅ Domain events (ExamScheduled, ExamCompleted, ExamPassed, BadgeIssued)
- ✅ ACL adapter (listens to Learning.EnrollmentCompleted)
- ⏳ SAGA persistence (PostgreSQL saga_state table) — Week 10
- ⏳ Compensation logic (revoke badge) — Week 11

**Contract (Events Produced):**
```typescript
CandidateQualified(learnerId, pathId)
ExamScheduled(candidateId, examId, scheduledDate)
ExamCompleted(candidateId, examId, score, completedAt)
ExamPassed(candidateId, examId, score)
ExamFailed(candidateId, examId, score, retryCount)
BadgeIssued(learnerId, badgeId, certificateId)
CertificationRenewed(candidateId, nextRenewalDate)
```

**Dependencies (Consumes):**
- `LearnerEnrolled` (from Learning) → triggers ACL, creates Candidate record
- `EnrollmentCompleted` (from Learning) → qualifies for exam (ACL translation)
- `SkillLabChallengeCompleted` (from SkillLab) → prerequisite check (future)

**Known Issues:**
- SAGA persistence layer not yet implemented (database schema needed Week 10)
- Compensation logic complex; needs detailed test coverage

---

### Skill Lab Domain
**Owner:** Backend Team B  
**Status:** 🟡 READY for Core Aggregates, PENDING Event Integration  
**Completion:**
- ✅ Lab session aggregate (create, start, complete)
- ✅ Challenge aggregate (submit, grade, provide feedback)
- ✅ Solution artifact storage + versioning
- ✅ Domain events (LabSessionStarted, SolutionSubmitted, ChallengeCompleted)
- ✅ Unit tests
- ⏳ Event publishing integration (via EventBus) — Week 10
- ⏳ Integration tests (event flow) — Week 10

**Contract (Events Produced):**
```typescript
LabSessionStarted(learnerId, labId, sessionId)
SolutionSubmitted(sessionId, challengeId, solutionId, language, attemptCount)
ChallengeCompleted(sessionId, challengeId, score, allTestsPassed)
SkillLabPathCompleted(learnerId, labPathId, totalScore)
```

**Dependencies (Consumes):**
- `EnrollmentCreated` (from Learning) → learner access to labs
- `BadgeIssued` (from Community) → display badge on learner lab profile (future)

**Known Issues:**
- Code execution engine (language runtime) not yet integrated; placeholder implementation
- Timeout handling for long-running submissions needs testing

---

### Community Domain
**Owner:** Backend Team B  
**Status:** 🟡 READY for Core Aggregates, PENDING Event Integration  
**Completion:**
- ✅ Learner profile aggregate (name, bio, avatar)
- ✅ Badge repository (define, award, track)
- ✅ Reputation point system (calculations, leaderboard logic)
- ✅ Domain events (BadgeEarned, ContributionCreated, ReputationEarned)
- ✅ Unit tests
- ⏳ Event publishing integration — Week 10
- ⏳ Leaderboard query (via read model) — Week 11

**Contract (Events Produced):**
```typescript
BadgeEarned(learnerId, badgeId)
ReputationPointsEarned(learnerId, pointCount, reason)
LeaderboardEntryUpdated(learnerId, rank, totalReputation)
ContributionCreated(learnerId, contributionType, content)
```

**Dependencies (Consumes):**
- `BadgeIssued` (from Certification) → award badge to learner
- `ChallengeCompleted` (from SkillLab) → award "Problem Solver" badge
- `EnrollmentCompleted` (from Learning) → award "Learner" badge
- `ContributionCreated` (internal) → increase reputation, update leaderboard

**Known Issues:**
- Reputation formula needs stakeholder sign-off (currently weighted sum)
- Leaderboard cache invalidation strategy TBD (Week 11)

---

### Metrics Domain
**Owner:** Backend Team C  
**Status:** 🔴 BLOCKED until EventBus Ready, PENDING Read Model  
**Completion:**
- ✅ Analytics event schema (fact table design)
- ✅ Aggregation logic (cohort analysis, pass rates)
- ⏳ Event consumer implementation (materializer) — Week 10
- ⏳ ClickHouse integration — Week 11
- ⏳ Dashboard queries — Week 11

**Contract (Events Produced):**
```typescript
MetricsComputed(eventType, aggregation, timestamp, value)
AnomalyDetected(metricName, threshold, currentValue, severity)
KPIBreached(kpiName, targetValue, actualValue)
```

**Dependencies (Consumes):**
- `*` (all events from all domains) → compute analytics
- `EnrollmentCreated`, `CourseCompleted`, `ExamPassed`, `BadgeIssued`, `ChallengeCompleted`, etc.

**Known Issues:**
- Blocking issue: EventBus not yet implemented (in-memory prototype Week 9, full implementation Week 10)
- ClickHouse schema design frozen; aggregation logic may need adjustment based on scale testing

---

## Dependency Graph (Critical Path)

```
Week 9: Foundation
  └─ Learning.publish(EnrollmentCreated)
      ├─ Certification.ACL.onEnrollmentCreated() [WAIT for Learning.Completed]
      │   └─ Certification.CREATE_CANDIDATE (SAGA step 1)
      │       └─ Certification.publish(CandidateQualified)
      │           └─ [FUTURE] Community.onCandidateQualified() [Week 10]
      │
      ├─ SkillLab: blocked on EventBus [EVENT_BUS_READY dependency]
      │
      ├─ Community: blocked on EventBus [EVENT_BUS_READY dependency]
      │
      └─ Metrics: blocked on EventBus [EVENT_BUS_READY dependency]

Week 10: Event Integration
  └─ EventBus fully operational
      ├─ Learning.EnrollmentCompleted → triggers Certification.SAGA
      ├─ Certification.CandidateQualified → Community.onCandidateQualified
      ├─ SkillLab.ChallengeCompleted → Community.onChallengeCompleted (award badge)
      ├─ Community.BadgeEarned → Metrics.onBadgeEarned (compute reputation)
      └─ All domains → Metrics.* (full observability)

Week 11: Read Models
  └─ ClickHouse materialization
      ├─ Learning: cohort analytics
      ├─ Certification: exam pass rates
      ├─ SkillLab: completion rates
      ├─ Community: leaderboard
      └─ Metrics: anomaly detection

Week 13: Kubernetes
  └─ Service mesh (Istio)
      ├─ mTLS between all services
      ├─ Circuit breaking
      └─ Distributed tracing (correlationId)
```

---

## Critical Dependencies (Blocking Issues)

### 🔴 EventBus Implementation (Week 10)
**Impact:** Metrics domain blocked. Event integration testing blocked.  
**Root Cause:** EventBus interface defined (ADR-009), in-memory implementation placeholder.  
**Mitigation:** Use mock EventBus in unit tests (Week 9). Full EventBus Week 10.  
**Owner:** Backend Team C  
**Target:** EOD June 10, 2026

**Blocker Status:**
- [ ] EventBus interface finalized
- [ ] InMemoryEventBus implementation complete
- [ ] SQLite event store integration
- [ ] Integration test: Learning.publish → Certification.onEvent

---

### 🟡 Certification SAGA Persistence (Week 10)
**Impact:** SAGA orchestration testable, but not persisted (recovery impossible).  
**Root Cause:** PostgreSQL saga_state schema not yet created.  
**Mitigation:** Use in-memory SAGA state (Week 9 only). Minimal; prototyping only.  
**Owner:** Backend Team A  
**Target:** EOD June 12, 2026  
**Dependency:** PostgreSQL schema review + approval (Architecture Lead)

---

### 🟡 Read Model Schema (ClickHouse) — Week 11
**Impact:** Analytics queries cannot run. Dashboards require fallback (PostgreSQL materialized views).  
**Root Cause:** ClickHouse DDL design in-progress; requires capacity planning.  
**Mitigation:** PostgreSQL views sufficient for Week 10 (hourly refresh). OK for 50-learner scale.  
**Owner:** Backend Team C  
**Target:** EOD July 15, 2026

---

## Integration Test Plan (Week 10)

### Test Suite 1: Learning → Certification
**Scenario:** Learner enrolls in path, completes course, qualifies for exam.  
**Flow:**
1. Learning.enroll(learnerId, pathId) → LearnerEnrolled event
2. Wait 500ms (handler latency)
3. Learning.completeCourse(enrollmentId, score=95) → EnrollmentCompleted event
4. Certification.ACL listens, creates Candidate
5. Assert: Candidate record exists in Certification database

**Expected Latency:** <1s (in-memory EventBus)  
**Failure Threshold:** >5s (indicates handler bottleneck)

---

### Test Suite 2: Certification SAGA
**Scenario:** Candidate takes exam, passes, gets badge.  
**Flow:**
1. Certification.scheduleExam(candidateId, examDate) → ExamScheduled event
2. Certification SAGA waits for ExamCompleted event
3. Test service publishes: ExamCompleted(candidateId, score=80)
4. SAGA resumes, grades exam (score >= 75 → pass)
5. Certification.publishBadgeIssued(badgeId, learnerId)
6. Assert: BadgeIssued event published; SAGA status = COMPLETED

**Expected Latency:** <2s (SAGA state lookup + event publish)  
**Failure Threshold:** >5s (deadlock or retry exhaustion)

---

### Test Suite 3: Cross-Domain Events (Week 10+)
**Scenario:** Certification badge published → Community leaderboard updates.  
**Flow:**
1. Certification publishes BadgeIssued(learnerId, badgeId="TDD Expert")
2. Community.onBadgeIssued() handler fires
3. Assert: Learner profile updated with badge
4. Assert: Leaderboard rank increased

**Expected Latency:** <2s  
**Failure Threshold:** >5s

---

## Milestones & Dates

### Week 9 (June 2-8, 2026)
**Deliverable:** ADRs, domain aggregates, event schemas  
- [x] ADR-009: EventBus Design
- [x] ADR-010: SAGA Orchestration
- [x] ADR-011: CQRS Read Model Strategy
- [x] ADR-012: Kubernetes Deployment
- [x] Learning domain: Core aggregates
- [x] Certification domain: Event sourcing setup
- [x] SkillLab domain: Core aggregates
- [x] Community domain: Core aggregates
- [x] Metrics domain: Analytics schema

**Blockers:** None  
**Risk:** Low (definition phase)

### Week 10 (June 9-15, 2026)
**Deliverable:** Event integration, cross-domain testing  
- [ ] EventBus full implementation
- [ ] All domains: Event publishing integration
- [ ] Certification SAGA persistence (PostgreSQL)
- [ ] Integration test suite (cross-domain)
- [ ] ACL adapters (Learning → Certification, etc.)

**Blockers:** EventBus implementation (critical path)  
**Risk:** Medium (event handler complexity)

### Week 11 (June 16-22, 2026)
**Deliverable:** Read models, analytics, observability  
- [ ] ClickHouse cluster setup
- [ ] Elasticsearch cluster setup
- [ ] Read model materializers (event handlers)
- [ ] Dashboard API endpoints
- [ ] Prometheus monitoring + alerts

**Blockers:** None (EventBus complete from Week 10)  
**Risk:** Medium (new infrastructure, operational complexity)

### Week 12 (June 23-29, 2026)
**Deliverable:** Load testing, performance tuning, schema finalization  
- [ ] Load test: 1000+ events/min sustained
- [ ] Identify bottlenecks (database, cache, event handler)
- [ ] Finalize event schema versioning strategy
- [ ] Backup & disaster recovery runbooks

**Blockers:** None  
**Risk:** Medium (scale testing uncertainty)

### Week 13 (June 30-July 6, 2026)
**Deliverable:** Kubernetes deployment, service mesh  
- [ ] EKS cluster provisioning
- [ ] Istio service mesh setup
- [ ] Service deployments (Learning, Certification, Lab, Community, Metrics)
- [ ] Canary deployment testing
- [ ] Failover testing (pod, node, service failures)

**Blockers:** None (independent track)  
**Risk:** High (new infrastructure, team learning curve)

### Weeks 14-16 (July 7-27, 2026)
**Deliverable:** Production stabilization, RabbitMQ migration, performance optimization  
- [ ] RabbitMQ cluster (Week 14 migration from in-memory)
- [ ] Parallel testing (both EventBus implementations)
- [ ] Feature flag cutover (Week 14)
- [ ] Performance optimization (query tuning, caching)
- [ ] Security hardening (GDPR compliance, penetration testing)

**Blockers:** None (previous weeks unblock this track)  
**Risk:** Low (infrastructure stable by Week 13)

---

## Risk & Mitigation Matrix

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|-----------|-------|
| EventBus implementation delayed | Medium | High | Start Week 9, mock testing in parallel | Team C |
| SAGA complexity (compensation logic) | High | Medium | Detailed test coverage, peer review | Team A |
| ClickHouse schema redesign (scale) | Medium | Medium | Load test Week 12, adjust Week 13 | Team C |
| Kubernetes learning curve | High | Medium | Training Week 12, gradual migration | DevOps |
| RabbitMQ failover issues | Low | High | Replication testing Week 13, runbooks | DevOps |
| Data consistency issues (eventual consistency) | Medium | Low | Idempotency tests, compensations | Team A |

---

## Handoff Plan (Week 9 → Week 10)

### From Architecture to Developers
**Deliverables:**
1. ADRs (009-012) finalized and approved
2. Domain event schema (shared across teams)
3. EventBus interface + stub implementation
4. Database schema (PostgreSQL, SQLite)
5. Deployment checklist (what to build, what to test)

**Acceptance Criteria:**
- [ ] All teams have signed ADRs
- [ ] Teams ready to implement aggregates + event publishing
- [ ] EventBus interface understood (no blocking questions)
- [ ] Test plan agreed (integration test scenarios)

### From Week 10 Leads to Week 11 Leads
**Knowledge Transfer:**
- EventBus implementation lessons learned
- Event handler idempotency gotchas
- SAGA state machine complexities
- Read model denormalization patterns

**Artifacts:**
- Event handler template (copy-paste starter)
- Integration test examples
- SAGA step implementation guide

---

## Success Criteria (Week 9 Completion)

### Architecture Level
- [ ] All 4 ADRs written, reviewed, approved
- [ ] Decision log (DECISIONS.md) complete
- [ ] Coordination notes updated (this doc)
- [ ] Zero unresolved architectural ambiguities

### Implementation Level (Domains)
- [x] Learning domain: Aggregates + events designed
- [x] Certification domain: Event sourcing + SAGA skeleton
- [x] SkillLab domain: Aggregates + events designed
- [x] Community domain: Aggregates + events designed
- [x] Metrics domain: Analytics schema designed

### Testing & Quality
- [ ] Unit test coverage >80% (each domain)
- [ ] No integration test failures (cross-domain events)
- [ ] Code review sign-off (2/3 reviewers)
- [ ] Zero security vulnerabilities (dependency scan)

### Documentation
- [x] Architecture decision records (ADRs 009-012)
- [x] Event schema documented
- [ ] API contracts documented (event payloads)
- [ ] Deployment runbooks (Week 13 Kubernetes)

---

**Next Review Date:** June 10, 2026 (end of Week 10, before production migration)  
**Prepared by:** Knowledge Lead  
**Approved by:** Architecture Lead
