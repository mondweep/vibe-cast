# Week 12: Query Model Synchronization - SPECIFICATIONS

**Status:** UNBLOCKED - BEGIN IMPLEMENTATION  
**Date Issued:** 2026-06-03  
**Target:** developer-w10  
**Timeline:** Week 12 Implementation Sprint

---

## Executive Summary

Week 11 established event sourcing with an append-only event log. Week 12 builds read-optimized query models (denormalized views) that synchronize from the event stream using projectors. This implements the **CQRS pattern**: write model (events) is separate from read model (query tables).

Query models provide fast, denormalized queries without expensive joins across event logs.

---

## Implementation Overview

### Architecture Pattern: CQRS + Event Sourcing

```
Event Stream (Week 11)
        ↓
   [Projector]  ← Event Handler subscribes to events
        ↓
  Query Model (Week 12) ← Denormalized, optimized for reads
        ↓
  Query Service ← Fast queries without joins
```

---

## 1. Query Model Definitions

### 1.1 LearnerProfileReadModel

**Purpose:** Denormalized view of learner progress across all domains

**Location:** `/src/learning/infrastructure/readmodels/LearnerProfileReadModel.ts`

**Schema:**
```typescript
interface LearnerProfileReadModel {
  learnerId: UUID;
  enrollmentIds: UUID[]; // All enrollments
  completedEnrollmentCount: number;
  totalEnrollments: number;
  averageScore: number;
  badgesEarned: BadgeSnapshot[];
  skillsAchieved: SkillSnapshot[];
  lastActivityAt: ISO8601;
  projectionVersion: number; // Track projection schema version
  lastSyncedEventId: UUID; // Last event processed
}

interface BadgeSnapshot {
  badgeId: UUID;
  certificationName: string;
  issuedAt: ISO8601;
  status: 'ACTIVE' | 'REVOKED';
}

interface SkillSnapshot {
  skillId: UUID;
  skillName: string;
  score: number;
  achievedAt: ISO8601;
}
```

**Database Table:**
```sql
CREATE TABLE learner_profile_read_model (
  learner_id UUID PRIMARY KEY,
  enrollment_ids UUID[] NOT NULL DEFAULT '{}',
  completed_enrollment_count INTEGER NOT NULL DEFAULT 0,
  total_enrollments INTEGER NOT NULL DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  badges_earned JSONB NOT NULL DEFAULT '[]',
  skills_achieved JSONB NOT NULL DEFAULT '[]',
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  projection_version INTEGER NOT NULL DEFAULT 1,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learner_profile_last_activity ON learner_profile_read_model(last_activity_at DESC);
CREATE INDEX idx_learner_profile_updated ON learner_profile_read_model(updated_at DESC);
```

---

### 1.2 CertificationProgressReadModel

**Purpose:** Track exam attempts, grades, badge issuance per certification

**Location:** `/src/certification/infrastructure/readmodels/CertificationProgressReadModel.ts`

**Schema:**
```typescript
interface CertificationProgressReadModel {
  enrollmentId: UUID;
  learnerId: UUID;
  certificationId: UUID;
  enrollmentStatus: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REMEDIATION';
  examAttempts: ExamAttemptSnapshot[];
  currentGrade: number | null;
  badgeStatus: 'PENDING' | 'ISSUED' | 'REVOKED' | 'NONE';
  issuedBadgeId: UUID | null;
  nextRenewalDate: ISO8601 | null;
  lastSyncedEventId: UUID;
}

interface ExamAttemptSnapshot {
  examId: UUID;
  attemptNumber: number;
  score: number;
  completedAt: ISO8601;
  status: 'PASSED' | 'FAILED' | 'PENDING';
}
```

**Database Table:**
```sql
CREATE TABLE certification_progress_read_model (
  enrollment_id UUID PRIMARY KEY,
  learner_id UUID NOT NULL,
  certification_id UUID NOT NULL,
  enrollment_status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
  exam_attempts JSONB NOT NULL DEFAULT '[]',
  current_grade DECIMAL(5,2),
  badge_status VARCHAR(50) NOT NULL DEFAULT 'NONE',
  issued_badge_id UUID,
  next_renewal_date TIMESTAMP,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cert_progress_learner ON certification_progress_read_model(learner_id);
CREATE INDEX idx_cert_progress_status ON certification_progress_read_model(enrollment_status);
CREATE INDEX idx_cert_progress_certification ON certification_progress_read_model(certification_id);
```

---

### 1.3 CommunityProfileReadModel

**Purpose:** Learner's community presence, badges, achievements

**Location:** `/src/community/infrastructure/readmodels/CommunityProfileReadModel.ts`

**Schema:**
```typescript
interface CommunityProfileReadModel {
  learnerId: UUID;
  displayName: string;
  badgeCount: number;
  skillCount: number;
  reputationScore: number;
  badges: BadgeDetail[];
  skills: SkillDetail[];
  lastActivityAt: ISO8601;
}

interface BadgeDetail {
  badgeId: UUID;
  badgeName: string;
  issuedAt: ISO8601;
  displayOrder: number;
}

interface SkillDetail {
  skillId: UUID;
  skillName: string;
  proficiencyLevel: number;
  achievedAt: ISO8601;
}
```

**Database Table:**
```sql
CREATE TABLE community_profile_read_model (
  learner_id UUID PRIMARY KEY,
  display_name VARCHAR(255),
  badge_count INTEGER NOT NULL DEFAULT 0,
  skill_count INTEGER NOT NULL DEFAULT 0,
  reputation_score INTEGER NOT NULL DEFAULT 0,
  badges JSONB NOT NULL DEFAULT '[]',
  skills JSONB NOT NULL DEFAULT '[]',
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_profile_reputation ON community_profile_read_model(reputation_score DESC);
CREATE INDEX idx_community_profile_badge_count ON community_profile_read_model(badge_count DESC);
```

---

### 1.4 MetricsReadModel

**Purpose:** Aggregated metrics across all domains

**Location:** `/src/metrics/infrastructure/readmodels/MetricsReadModel.ts`

**Schema:**
```typescript
interface MetricsReadModel {
  metricsId: UUID;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  date: ISO8601;
  totalEventsProcessed: number;
  eventCountByType: Record<string, number>;
  totalLearnersActive: number;
  totalBadgesIssued: number;
  totalSkillsAchieved: number;
  averageCompletionTime: number; // milliseconds
  eventProcessingLatencyPercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}
```

**Database Table:**
```sql
CREATE TABLE metrics_read_model (
  metrics_id UUID PRIMARY KEY,
  period VARCHAR(50) NOT NULL,
  date TIMESTAMP NOT NULL,
  total_events_processed INTEGER NOT NULL DEFAULT 0,
  event_count_by_type JSONB NOT NULL DEFAULT '{}',
  total_learners_active INTEGER NOT NULL DEFAULT 0,
  total_badges_issued INTEGER NOT NULL DEFAULT 0,
  total_skills_achieved INTEGER NOT NULL DEFAULT 0,
  average_completion_time_ms INTEGER NOT NULL DEFAULT 0,
  latency_percentiles JSONB NOT NULL DEFAULT '{"p50":0,"p95":0,"p99":0}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_period_date ON metrics_read_model(period, date DESC);
CREATE INDEX idx_metrics_date ON metrics_read_model(date DESC);
```

---

## 2. Event Projectors

Each projector is an **event handler** that listens to specific domain events and updates the corresponding read model.

### 2.1 LearnerProfileProjector

**Location:** `/src/learning/infrastructure/projectors/LearnerProfileProjector.ts`

**Implementation Pattern:**
```typescript
export class LearnerProfileProjector implements EventHandler<DomainEvent> {
  constructor(private readModelRepository: ReadModelRepository) {}

  async handle(event: DomainEvent): Promise<void> {
    const learnerId = event.learnerId; // All events must have learnerId
    
    // Load current read model
    let profile = await this.readModelRepository.findLearnerProfile(learnerId);
    if (!profile) {
      profile = createEmptyLearnerProfile(learnerId);
    }

    // Update based on event type
    if (event instanceof EnrollmentCompleted) {
      this.updateFromEnrollmentCompleted(profile, event);
    } else if (event instanceof BadgeIssued) {
      this.updateFromBadgeIssued(profile, event);
    } else if (event instanceof ExerciseCompleted) {
      this.updateFromExerciseCompleted(profile, event);
    }

    profile.lastSyncedEventId = event.getId();
    profile.updated_at = new Date();

    // Persist updated read model
    await this.readModelRepository.saveLearnerProfile(profile);
  }

  private updateFromEnrollmentCompleted(profile, event) {
    profile.enrollmentIds.push(event.enrollmentId);
    profile.totalEnrollments++;
    profile.completedEnrollmentCount++;
    profile.lastActivityAt = event.completedAt;
    // Recalculate average score
    profile.averageScore = this.calculateAverageScore(profile);
  }

  private updateFromBadgeIssued(profile, event) {
    const badge: BadgeSnapshot = {
      badgeId: event.badgeId,
      certificationName: event.certificationName,
      issuedAt: event.issuedAt,
      status: 'ACTIVE'
    };
    profile.badgesEarned.push(badge);
    profile.lastActivityAt = event.issuedAt;
  }

  private updateFromExerciseCompleted(profile, event) {
    const skill: SkillSnapshot = {
      skillId: event.skillId,
      skillName: event.skillName || 'Unknown Skill',
      score: event.score,
      achievedAt: event.completedAt
    };
    profile.skillsAchieved.push(skill);
    profile.lastActivityAt = event.completedAt;
  }

  private calculateAverageScore(profile): number {
    // Implementation: average from enrollments
    return 0;
  }
}
```

**Registration in EventBus:**
```typescript
// In application bootstrap
const projector = new LearnerProfileProjector(readModelRepository);
eventBus.subscribe('EnrollmentCompleted', projector);
eventBus.subscribe('BadgeIssued', projector);
eventBus.subscribe('ExerciseCompleted', projector);
```

---

### 2.2 CertificationProgressProjector

**Location:** `/src/certification/infrastructure/projectors/CertificationProgressProjector.ts`

Handles: `ExamCompleted`, `BadgeIssued` events

**Key Logic:**
- Track exam attempts and scores
- Update badge status when badge issued
- Mark enrollment as COMPLETED when badge issued with score >= 80
- Set next renewal date (1 year from badge issuance)

---

### 2.3 CommunityProfileProjector

**Location:** `/src/community/infrastructure/readmodels/CommunityProfileProjector.ts`

Handles: `BadgeEarned`, `SkillAchieved` events

**Key Logic:**
- Increment badge count on BadgeEarned
- Increment skill count on SkillAchieved
- Calculate reputation score (badges * 50 + skills * 10)
- Track display order for badges

---

### 2.4 MetricsProjector

**Location:** `/src/metrics/infrastructure/projectors/MetricsProjector.ts`

Handles: ALL events via MetricsACL

**Key Logic:**
- Count total events per day/week/month
- Track event type distribution
- Calculate latency percentiles
- Track unique learners active per period

---

## 3. ReadModel Repository & Query Services

### 3.1 ReadModelRepository Interface

**Location:** `/src/shared/infrastructure/readmodels/IReadModelRepository.ts`

```typescript
export interface IReadModelRepository {
  // Learner Profile
  findLearnerProfile(learnerId: UUID): Promise<LearnerProfileReadModel | null>;
  saveLearnerProfile(profile: LearnerProfileReadModel): Promise<void>;
  findLearnerProfiles(learnerId?: UUID[]): Promise<LearnerProfileReadModel[]>;

  // Certification Progress
  findCertificationProgress(enrollmentId: UUID): Promise<CertificationProgressReadModel | null>;
  saveCertificationProgress(progress: CertificationProgressReadModel): Promise<void>;
  findCertificationProgressByLearner(learnerId: UUID): Promise<CertificationProgressReadModel[]>;

  // Community Profile
  findCommunityProfile(learnerId: UUID): Promise<CommunityProfileReadModel | null>;
  saveCommunityProfile(profile: CommunityProfileReadModel): Promise<void>;

  // Metrics
  findMetricsForPeriod(period: 'DAILY' | 'WEEKLY' | 'MONTHLY', date: ISO8601): Promise<MetricsReadModel | null>;
  saveMetrics(metrics: MetricsReadModel): Promise<void>;
}
```

### 3.2 Supabase ReadModelRepository Implementation

**Location:** `/src/shared/infrastructure/readmodels/SupabaseReadModelRepository.ts`

Use Supabase client to persist/query read models from PostgreSQL tables defined in migrations.

---

### 3.3 Query Services

Expose high-level query APIs that clients consume.

**LearnerProfileQueryService**
```typescript
async getLearnersWithBadges(minimumBadgeCount: number): Promise<LearnerProfileReadModel[]> {
  // Query from learner_profile_read_model WHERE badges.length >= minimumBadgeCount
}

async getTopLearnersByActivityDate(limit: number): Promise<LearnerProfileReadModel[]> {
  // Query sorted by last_activity_at DESC LIMIT limit
}
```

**CertificationProgressQueryService**
```typescript
async getProgressByLearner(learnerId: UUID): Promise<CertificationProgressReadModel[]> {
  // Get all enrollments for learner
}

async getCompletedCertifications(learnerId: UUID): Promise<CertificationProgressReadModel[]> {
  // WHERE badge_status = 'ISSUED'
}
```

**CommunityProfileQueryService**
```typescript
async getTopReputationLearners(limit: number): Promise<CommunityProfileReadModel[]> {
  // ORDER BY reputation_score DESC LIMIT limit
}

async getLearnersBySkillCount(minimumSkills: number): Promise<CommunityProfileReadModel[]> {
  // WHERE skill_count >= minimumSkills
}
```

---

## 4. Database Migrations

**Location:** `/migrations/002_create_query_models.sql`

Include all CREATE TABLE and CREATE INDEX statements for:
1. `learner_profile_read_model`
2. `certification_progress_read_model`
3. `community_profile_read_model`
4. `metrics_read_model`

---

## 5. Integration Tests

**Location:** `/tests/integration/query-model-synchronization.spec.ts`

### Test Scenarios

1. **Learner Profile Projection**
   - Publish EnrollmentCompleted → verify learner_profile read model updated
   - Publish BadgeIssued → verify badges array updated
   - Publish ExerciseCompleted → verify skills array updated

2. **Certification Progress Projection**
   - Publish ExamCompleted → verify exam_attempts array updated
   - Publish BadgeIssued → verify badge_status = 'ISSUED'
   - Verify next_renewal_date set to 1 year from issuance

3. **Community Profile Projection**
   - Publish BadgeEarned → verify badge_count incremented
   - Publish SkillAchieved → verify skill_count incremented
   - Verify reputation_score recalculated correctly

4. **Query Service Tests**
   - Query top learners by badge count → verify ordering
   - Query completed certifications → verify status filter
   - Query learners by skill count → verify threshold filter

5. **Concurrent Updates**
   - Multiple projectors update same read model → verify final state consistent
   - Events arrive out-of-order → verify projector handles gracefully

6. **Idempotency**
   - Duplicate event published → verify read model not updated twice
   - Use lastSyncedEventId to detect duplicate processing

---

## 6. Implementation Checklist

- [ ] Database migrations created (4 read model tables)
- [ ] IReadModelRepository interface defined
- [ ] SupabaseReadModelRepository implemented
- [ ] LearnerProfileProjector implemented
- [ ] CertificationProgressProjector implemented
- [ ] CommunityProfileProjector implemented
- [ ] MetricsProjector implemented
- [ ] 3 Query Services implemented
- [ ] Projectors registered with EventBus
- [ ] Integration tests passing
- [ ] Query service tests passing
- [ ] Read model data consistent with event log
- [ ] Performance: query latency <100ms (P95)

---

## 7. Performance Requirements

- **Projection latency:** <500ms (event → read model update)
- **Query latency:** <100ms (P95) for common queries
- **Read model consistency:** eventual consistency (same millisecond as event processing)
- **Concurrent projections:** handle multiple events updating same read model safely

---

## 8. Success Criteria

✅ All 4 read models created and populated via projectors  
✅ Query services return consistent results  
✅ Projectors handle events in order (via lastSyncedEventId)  
✅ Idempotency prevents duplicate read model updates  
✅ Integration tests pass (projections + queries)  
✅ Query latency <100ms for common queries  
✅ No schema breaking changes from Week 11  

---

## 9. Next Week (Week 13+)

- **Week 13:** Integration tests for multi-domain workflows
- **Week 14:** RabbitMQ implementation (swap EventBus)
- **Week 15:** Performance optimization & monitoring

---

**Status:** UNBLOCKED - BEGIN IMPLEMENTATION

Questions? Refer to this spec or contact lead architect.

---

*Specification issued: 2026-06-03 | Ready for implementation*
