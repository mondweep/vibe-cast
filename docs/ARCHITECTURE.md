# Vibe-Cast: Comprehensive Architectural Design
**Domain-Driven Design + Architecture Decision Records**

**Strategic Context:**
- 500 active learners, 20% certification conversion target
- 5 core domains: Learning, Certification, Skill Lab, Community, Metrics
- Stakeholders: Learners, Instructors, Certifiers, Community Members
- Vision: Certified Orchestration Architects

---

## Part 1: Domain-Driven Design Model

### 1.1 Strategic Domain Landscape

```
┌─────────────────────────────────────────────────────────┐
│                    VIBE-CAST SYSTEM                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   LEARNING   │  │CERTIFICATION │  │  SKILL LAB   │   │
│  │   DOMAIN     │  │    DOMAIN    │  │    DOMAIN    │   │
│  │              │  │              │  │              │   │
│  │ Core: Paths  │  │ Core: Creds  │  │ Core: Labs   │   │
│  │ & Progress   │  │ & Badges     │  │ & Practice   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│         △                  △                  △          │
│         │                  │                  │          │
│         └──────────┬───────┴──────────┬───────┘          │
│                    │                  │                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │         COMMUNITY DOMAIN                            │ │
│  │  Connections, Collaboration, Reputation            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │         METRICS DOMAIN (Cross-Cutting)             │ │
│  │  Analytics, Events, Dashboards, KPIs               │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Part 2: Domain Details (DDD Model)

### Domain 1: LEARNING

#### Ubiquitous Language
- **Learning Path**: Curated sequence of courses → progression goal
- **Course**: Atomic unit of instruction (video, labs, quizzes)
- **Learner**: Active participant in a path
- **Completion**: Path/course finished with passing score
- **Progress**: Current position in a learning sequence
- **Enrollment**: Act of joining a path

#### Core Business Rules (Invariants)
1. A learner can only advance to next course after current course completion
2. Progress is only recorded on course completion (all modules + passing assessment)
3. A path requires minimum 3 courses
4. Learner can have multiple concurrent paths but max 5 active paths
5. Course videos cannot be skipped; completion requires sequential viewing

#### Aggregates

**LearningPath Aggregate**
```typescript
Aggregate Root: LearningPath
├── Properties
│   ├── id: UUID
│   ├── title: string
│   ├── description: string
│   ├── difficulty: Enum (BEGINNER | INTERMEDIATE | ADVANCED)
│   ├── estimatedHours: number
│   ├── courses: Course[] (1..n)
│   ├── createdBy: Instructor
│   ├── prerequisites: LearningPath[] (0..n)
│   └── status: Enum (DRAFT | PUBLISHED | ARCHIVED)
│
├── Value Objects
│   ├── PathMetadata {icon, color, tags}
│   └── RequirementSet {minScore, minCompletionRate}
│
├── Methods
│   ├── addCourse(course): void
│   ├── removeCourse(courseId): void
│   ├── publish(): void
│   └── canEnrollLearner(learner): boolean
│
└── Commands
    ├── CreatePath(title, description)
    ├── PublishPath()
    └── ArchivePath()
```

**Enrollment Aggregate**
```typescript
Aggregate Root: Enrollment
├── Properties
│   ├── id: UUID
│   ├── learnerId: UUID
│   ├── pathId: UUID
│   ├── enrolledAt: DateTime
│   ├── completedAt: DateTime | null
│   ├── currentCourseIndex: number
│   ├── progressPercentage: decimal (0..100)
│   └── status: Enum (ACTIVE | COMPLETED | ABANDONED)
│
├── Value Objects
│   ├── CourseProgress {
│   │   courseId: UUID,
│   │   completedAt: DateTime | null,
│   │   score: number (0..100),
│   │   timeSpent: Duration
│   │ }
│   └── MilestoneAchievement {
│       name: string,
│       unlockedAt: DateTime
│     }
│
├── Methods
│   ├── startCourse(courseId): void
│   ├── completeCourse(score): void
│   ├── abandon(): void
│   └── getCompletionETA(): DateTime
│
└── Commands
    ├── EnrollLearner(learnerId, pathId)
    ├── CompleteCourse(courseId, score)
    └── AbandonEnrollment()
```

#### Repositories & Queries
```typescript
interface LearningPathRepository {
  save(path: LearningPath): Promise<void>
  findById(id: UUID): Promise<LearningPath | null>
  findByDifficulty(difficulty: Difficulty): Promise<LearningPath[]>
  findPublished(): Promise<LearningPath[]>
  findByInstructor(instructorId: UUID): Promise<LearningPath[]>
}

interface EnrollmentRepository {
  save(enrollment: Enrollment): Promise<void>
  findByLearnerId(learnerId: UUID): Promise<Enrollment[]>
  findActiveByLearner(learnerId: UUID): Promise<Enrollment[]>
  findByPathId(pathId: UUID): Promise<Enrollment[]>
}

// Queries
interface LearningQueries {
  listPathsByCategory(category: string): Promise<LearningPath[]>
  getEnrollmentProgress(enrollmentId: UUID): Promise<ProgressSnapshot>
  getRecommendedPaths(learnerId: UUID): Promise<LearningPath[]>
  getTopPerformers(pathId: UUID): Promise<Learner[]>
}
```

#### Domain Events
```
1. PathCreated(pathId, instructorId, title)
   -> Triggers: Notify instructors dashboard
   
2. PathPublished(pathId)
   -> Triggers: Index for learner discovery
   -> Triggers: Notify waiting subscribers
   
3. LearnerEnrolled(enrollmentId, learnerId, pathId)
   -> Triggers: Send welcome email
   -> Triggers: Record in Metrics domain (conversion)
   -> Triggers: Update Community reputation
   
4. CourseCompleted(enrollmentId, courseId, score)
   -> Triggers: Award certificates if applicable
   -> Triggers: Unlock next course
   -> Triggers: Update Metrics (completion rate)
   
5. EnrollmentCompleted(enrollmentId, learnerId, pathId)
   -> Triggers: CertificationDomain.IssueCertificateCandidate
   -> Triggers: CommunityDomain.UnlockAchievement
   -> Triggers: MetricsDomain.RecordPathCompletion
   
6. LearnerAbandoned(enrollmentId, learnerId)
   -> Triggers: MetricsDomain.RecordAbandonmentReason
   -> Triggers: Send re-engagement email
```

---

### Domain 2: CERTIFICATION

#### Ubiquitous Language
- **Certification**: Credential that proves mastery (e.g., "Orchestration Architect")
- **Candidate**: Learner eligible to attempt certification exam
- **Exam**: Assessment for certification (practical + theory)
- **Badge**: Visual credential awarded after successful exam
- **Renewal**: Periodic re-certification requirement
- **Verifier**: Authority who validates exam eligibility

#### Core Business Rules (Invariants)
1. Only learners who completed all prerequisite paths can take exam
2. Exam can only be administered by certified verifiers
3. Badge is awarded only if exam score >= 75%
4. Certification valid for 2 years; must renew or lose badge
5. Maximum 3 exam attempts per 12-month period
6. Exam integrity: proctored, time-limited (120 min), single-session

#### Aggregates

**Certification Aggregate**
```typescript
Aggregate Root: Certification
├── Properties
│   ├── id: UUID (e.g., "ORCH-ARCH-001")
│   ├── name: string
│   ├── description: string
│   ├── level: Enum (ASSOCIATE | PROFESSIONAL | EXPERT)
│   ├── requiredPaths: LearningPath[] (1..n)
│   ├── exam: ExamSpecification
│   ├── badge: BadgeDesign
│   ├── validityPeriodMonths: number (default: 24)
│   └── status: Enum (DRAFT | ACTIVE | RETIRED)
│
├── Value Objects
│   ├── ExamSpecification {
│   │   duration: Duration,
│   │   passingScore: number (0..100),
│   │   questionCount: number,
│   │   practicalWeight: decimal,
│   │   theoreticalWeight: decimal
│   │ }
│   ├── BadgeDesign {
│   │   imageUrl: string,
│   │   color: string,
│   │   issuer: Organization
│   │ }
│   └── RequirementSet {
│       minPathCount: number,
│       totalHourStudy: number
│     }
│
├── Methods
│   ├── canCandidateTakeExam(learner): boolean
│   ├── issueBadge(candidate, examScore): Badge
│   └── scheduleRenewal(badgeHolder): RenewalTask
│
└── Commands
    ├── CreateCertification(name, level)
    ├── PublishCertification()
    └── RetireCertification()
```

**CertificationAttempt Aggregate**
```typescript
Aggregate Root: CertificationAttempt
├── Properties
│   ├── id: UUID
│   ├── candidateId: UUID
│   ├── certificationId: UUID
│   ├── attemptNumber: number (1..3)
│   ├── scheduledFor: DateTime
│   ├── startedAt: DateTime | null
│   ├── completedAt: DateTime | null
│   ├── responses: ExamResponse[]
│   ├── score: number | null
│   ├── status: Enum (SCHEDULED | IN_PROGRESS | COMPLETED | FAILED | EXPIRED)
│   └── proctorId: UUID | null
│
├── Value Objects
│   ├── ExamResponse {
│       questionId: UUID,
│       answer: string,
│       isCorrect: boolean,
│       timeSpent: Duration
│     }
│   └── ExamSession {
│       sessionToken: string,
│       ipAddress: string,
│       verified: boolean
│     }
│
├── Methods
│   ├── startExam(proctor): void
│   ├── submitAnswer(questionId, answer): void
│   ├── finishExam(): void
│   ├── calculateScore(): number
│   └── canRetake(): boolean
│
└── Commands
    ├── ScheduleExam(candidateId, certId)
    ├── StartExam(proctorId)
    ├── SubmitAnswer(questionId, answer)
    └── FinishExam()
```

#### Domain Events
```
1. CertificationCreated(certId, name, level)
   -> Triggers: Marketing domain (content)
   
2. CertificationPublished(certId)
   -> Triggers: Make available in catalog
   -> Triggers: Notify eligible learners
   
3. CandidateQualified(learnerId, certId)
   -> Triggers: Allow exam scheduling
   -> Triggers: Send exam prep materials
   
4. ExamScheduled(attemptId, candidateId, certId)
   -> Triggers: Send calendar invite
   -> Triggers: Notify proctor
   
5. ExamCompleted(attemptId, candidateId, certId, score)
   -> Triggers: Grade exam
   -> Decision Point: Score >= 75% ?
   
6. ExamPassed(attemptId, candidateId, certId, score)
   -> Triggers: IssueBadge
   -> Triggers: RecordCredential (blockchain)
   -> Triggers: UpdateCommunityReputation
   -> Triggers: RecordMetrics
   
7. ExamFailed(attemptId, candidateId, certId, score)
   -> Triggers: Send remediation plan
   -> Triggers: Schedule retry coaching
   
8. BadgeIssued(badgeId, candidateId, certId)
   -> Triggers: Send celebratory email
   -> Triggers: Add to learner profile
   -> Triggers: Enable badge sharing
   
9. CertificationRenewed(badgeId, candidateId)
   -> Triggers: Validate continued eligibility
   -> Triggers: Issue new badge
   
10. CertificationExpired(badgeId)
    -> Triggers: Remove from active profile
    -> Triggers: Notify learner (renewal option)
```

---

### Domain 3: SKILL LAB

#### Ubiquitous Language
- **Lab**: Interactive hands-on environment to practice skills
- **Challenge**: Specific task to complete in a lab
- **Scenario**: Real-world situation labs are based on
- **Solution**: Code/config a learner submits for validation
- **Validation**: Automated test checking solution correctness
- **Leaderboard**: Ranking of top performers by speed/quality

#### Core Business Rules (Invariants)
1. Lab must have minimum 3 challenges
2. Challenge is auto-graded within 30 seconds
3. Learner can attempt challenge unlimited times (learning focus)
4. Labs are scoped to specific technology stack
5. Solution code is versioned (track learner progression)
6. Labs reset after 72 hours of inactivity (fresh attempt)

#### Aggregates

**Lab Aggregate**
```typescript
Aggregate Root: Lab
├── Properties
│   ├── id: UUID
│   ├── title: string
│   ├── description: string
│   ├── technologyStack: TechStack
│   ├── difficulty: Enum (BEGINNER | INTERMEDIATE | ADVANCED)
│   ├── challenges: Challenge[] (3..n)
│   ├── environment: LabEnvironment
│   ├── createdBy: Instructor
│   ├── estimatedMinutes: number
│   └── status: Enum (DRAFT | PUBLISHED | ARCHIVED)
│
├── Value Objects
│   ├── TechStack {
│       language: string,
│       frameworks: string[],
│       tools: string[]
│     }
│   ├── LabEnvironment {
│       dockerImage: string,
│       port: number,
│       maxInstances: number
│     }
│   └── ScoringCriteria {
│       timeLimit: Duration,
│       correctnessWeight: 0.6,
│       codeQualityWeight: 0.4
│     }
│
├── Methods
│   ├── addChallenge(challenge): void
│   ├── validateChallenge(solution): TestResult
│   ├── getLeaderboard(): Learner[]
│   └── resetLearnersProgress(): void
│
└── Commands
    ├── CreateLab(title, technologyStack)
    ├── PublishLab()
    └── ArchiveLab()
```

**LabSession Aggregate**
```typescript
Aggregate Root: LabSession
├── Properties
│   ├── id: UUID
│   ├── learnerId: UUID
│   ├── labId: UUID
│   ├── startedAt: DateTime
│   ├── lastActivityAt: DateTime
│   ├── currentChallengeIndex: number
│   ├── completedChallenges: Challenge[]
│   ├── solutions: Solution[]
│   ├── environmentId: UUID (container/VM ID)
│   ├── score: number | null
│   └── status: Enum (ACTIVE | COMPLETED | ABANDONED | EXPIRED)
│
├── Value Objects
│   ├── Solution {
│       challengeId: UUID,
│       code: string,
│       submittedAt: DateTime,
│       testResult: TestResult
│     }
│   └── TestResult {
│       passed: boolean,
│       score: number,
│       feedback: string,
│       testCases: {
│           name: string,
│           passed: boolean,
│           output: string
│       }[]
│     }
│
├── Methods
│   ├── submitSolution(challengeId, code): TestResult
│   ├── completeChallenge(challengeId): void
│   ├── skipChallenge(challengeId): void
│   ├── finishLab(): void
│   └── isExpired(): boolean
│
└── Commands
    ├── StartLabSession(learnerId, labId)
    ├── SubmitSolution(challengeId, code)
    └── FinishLabSession()
```

#### Domain Events
```
1. LabCreated(labId, title, technologyStack)
   -> Index for discovery
   
2. LabPublished(labId)
   -> Make available to learners
   
3. LabSessionStarted(sessionId, learnerId, labId)
   -> Spin up environment (container/VM)
   -> Send welcome instructions
   
4. SolutionSubmitted(sessionId, challengeId, code)
   -> Trigger auto-grading pipeline
   -> Record submission time
   
5. ChallengeValidated(sessionId, challengeId, passed, score)
   -> If failed: Send hints
   -> If passed: Unlock next challenge
   
6. ChallengeCompleted(sessionId, challengeId)
   -> Update progress
   -> Update leaderboard
   
7. LabSessionCompleted(sessionId, learnerId, labId, finalScore)
   -> Record completion in metrics
   -> Award XP/badges if applicable
   -> Update learner portfolio
   
8. LabSessionExpired(sessionId)
   -> Spin down environment
   -> Save progress snapshot
   -> Offer resume opportunity
   
9. LeaderboardUpdated(labId, rank, learnerId, score)
   -> Notify affected learners
   -> Update gamification
```

---

### Domain 4: COMMUNITY

#### Ubiquitous Language
- **Learner Profile**: Public/private view of learner achievements
- **Contribution**: Post, comment, code review, etc.
- **Collaboration**: Working together on a lab/project
- **Reputation**: Points earned through contributions
- **Achievement**: Badge earned for milestones (e.g., "Code Reviewer")
- **Peer Review**: Learner-to-learner code feedback

#### Core Business Rules (Invariants)
1. Reputation is non-negative; earned through verified contributions
2. Learner can have max 10 concurrent collaborations
3. Peer review requires reviewer to be certified in that domain
4. Profile visibility: learner controls (public/private/peers-only)
5. Contributions are moderated; can be flagged for review
6. Community features require minimum reputation (anti-spam)

#### Aggregates

**LearnerProfile Aggregate**
```typescript
Aggregate Root: LearnerProfile
├── Properties
│   ├── id: UUID (same as Learner ID)
│   ├── username: string (unique)
│   ├── displayName: string
│   ├── bio: string
│   ├── avatar: string (URL)
│   ├── badges: Badge[]
│   ├── reputation: number (0..∞)
│   ├── contributions: Contribution[]
│   ├── collaborations: Collaboration[] (0..10)
│   ├── visibility: Enum (PUBLIC | PRIVATE | PEERS_ONLY)
│   ├── social: {github, linkedin, twitter} URLs
│   └── preferences: PrivacyPreferences
│
├── Value Objects
│   ├── Achievement {
│       name: string,
│       description: string,
│       earnedAt: DateTime,
│       category: Enum (LEARNER | CONTRIBUTOR | REVIEWER | ...)
│     }
│   └── ReputationHistory {
│       points: number,
│       reason: string,
│       timestamp: DateTime
│     }
│
├── Methods
│   ├── earnReputation(points, reason): void
│   ├── addBadge(badge): void
│   ├── getPublicProfile(): PublicProfile
│   ├── updateVisibility(visibility): void
│   └── canReview(certification): boolean
│
└── Commands
    ├── CreateProfile(username, displayName)
    ├── UpdateBio(bio)
    └── SetVisibility(visibility)
```

**Collaboration Aggregate**
```typescript
Aggregate Root: Collaboration
├── Properties
│   ├── id: UUID
│   ├── initiatorId: UUID
│   ├── participantIds: UUID[]
│   ├── resourceId: UUID (lab/project)
│   ├── resourceType: Enum (LAB | PROJECT | CHALLENGE)
│   ├── createdAt: DateTime
│   ├── status: Enum (ACTIVE | COMPLETED | DISSOLVED)
│   ├── sharedCode: string | null
│   └── messages: Message[]
│
├── Value Objects
│   ├── Participant {
│       userId: UUID,
│       role: Enum (INITIATOR | CONTRIBUTOR | OBSERVER),
│       joinedAt: DateTime
│     }
│   └── Message {
│       authorId: UUID,
│       content: string,
│       timestamp: DateTime,
│       reactions: string[] (emoji)
│     }
│
├── Methods
│   ├── addParticipant(userId, role): void
│   ├── removeParticipant(userId): void
│   ├── postMessage(userId, content): void
│   ├── shareCode(sharedCode): void
│   └── complete(): void
│
└── Commands
    ├── InitiateCollaboration(initiatorId, resourceId)
    ├── AddParticipant(userId, role)
    └── CompleteCollaboration()
```

#### Domain Events
```
1. ProfileCreated(learnerId, username)
   -> Initialize community presence
   
2. ProfileUpdated(learnerId)
   -> Refresh public view
   
3. BadgeEarned(learnerId, badgeName)
   -> Update profile
   -> Broadcast achievement
   -> Update community leaderboards
   
4. ContributionCreated(learnerId, contributionId)
   -> Index for discovery
   -> Notify mentioned users
   
5. ReputationEarned(learnerId, points, reason)
   -> Update cumulative reputation
   -> Evaluate milestone achievements
   -> Unlock features if threshold reached
   
6. CollaborationStarted(collaborationId, initiatorId)
   -> Notify participants
   -> Create shared workspace
   
7. PeerReviewSubmitted(collaborationId, reviewerId, targetUserId)
   -> Store feedback
   -> Notify reviewed person
   -> Award reviewer reputation
   
8. ProfileVisibilityChanged(learnerId, visibility)
   -> Update search indexes
   -> Clear/restore public view
```

---

### Domain 5: METRICS (Cross-Cutting)

#### Ubiquitous Language
- **Event**: Anything measurable in system (enrollment, completion, login, etc.)
- **Metric**: Aggregated measurement (completion rate, time-to-cert, etc.)
- **Dashboard**: Visualization of metrics (learner view, instructor view, admin view)
- **KPI**: Key performance indicator aligned to business goals
- **Cohort**: Group of learners analyzed together
- **Anomaly**: Unusual pattern (high abandonment, sudden drop, etc.)

#### Core Business Rules (Invariants)
1. All events must be immutable once recorded
2. Metrics are computed hourly (near real-time)
3. Dashboard KPIs must be accessible within 2 seconds
4. Data retention: raw events 1 year, aggregated metrics 3 years
5. Anomaly detection runs every 6 hours
6. No PII in metric exports

#### Aggregates

**Event Aggregate**
```typescript
Aggregate Root: Event
├── Properties
│   ├── id: UUID
│   ├── type: Enum (ENROLLMENT | COMPLETION | ABANDONMENT | ...)
│   ├── learnerId: UUID | null
│   ├── instructorId: UUID | null
│   ├── resourceId: UUID (pathId, labId, certId, etc.)
│   ├── resourceType: Enum (PATH | LAB | CERTIFICATION | ...)
│   ├── timestamp: DateTime (immutable)
│   ├── metadata: Map<string, object>
│   └── cohortId: UUID | null
│
├── Value Objects
│   └── EventMetadata {
│       location: string,
│       device: string,
│       duration: Duration,
│       score: number | null
│     }
│
├── Methods (read-only after creation)
│   └── [no mutations - events are immutable]
│
└── Commands
    └── RecordEvent(type, learnerId, resourceId)
```

**MetricSnapshot Aggregate**
```typescript
Aggregate Root: MetricSnapshot
├── Properties
│   ├── id: UUID
│   ├── snapshotTime: DateTime
│   ├── metrics: {
│   │   enrollmentRate: number,
│   │   completionRate: number,
│   │   abandonmentRate: number,
│   │   avgTimeToCompletion: Duration,
│   │   certificationConversionRate: number,
│   │   engagementScore: number,
│   │   reputationDistribution: Histogram
│   │ }
│   ├── cohortMetrics: CohortMetric[]
│   ├── anomalies: Anomaly[]
│   └── status: Enum (COMPUTED | PUBLISHED | ARCHIVED)
│
├── Value Objects
│   ├── CohortMetric {
│       cohortId: UUID,
│       cohortName: string,
│       metrics: Metrics
│     }
│   └── Anomaly {
│       type: string,
│       severity: Enum (LOW | MEDIUM | HIGH),
│       message: string,
│       affectedMetric: string
│     }
│
├── Methods
│   ├── computeMetrics(events): void
│   ├── detectAnomalies(): void
│   ├── getMetricByName(name): number
│   └── getCohortMetrics(cohortId): CohortMetric
│
└── Commands
    └── ComputeSnapshot(startTime, endTime)
```

#### Domain Events
```
1. EventRecorded(eventId, type, learnerId, resourceId)
   -> Append to event log (immutable)
   -> Update session metrics
   
2. MetricsComputed(snapshotId, timestamp)
   -> Store snapshot
   -> Trigger dashboard refresh
   -> Check KPIs against targets
   
3. AnomalyDetected(anomalyId, type, severity)
   -> Alert relevant team (Slack/email)
   -> Create incident if HIGH severity
   -> Store for investigation
   
4. KPIThresholdBreached(kpiName, currentValue, target)
   -> Escalate to leadership
   -> Trigger remediation workflow
   
5. CohortAnalysisCompleted(cohortId)
   -> Update cohort-specific insights
   -> Notify instructors
   
6. ReportGenerated(reportId)
   -> Make available in dashboard
   -> Send to stakeholders
```

---

## Part 3: Bounded Contexts & Anti-Corruption Layers

### 3.1 Bounded Context Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         VIBE-CAST SYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │   LEARNING BC    │      │ CERTIFICATION BC │                 │
│  │                  │      │                  │                 │
│  │ - Paths          │  ↔   │ - Certification  │                 │
│  │ - Courses        │ ACL  │ - Exams          │                 │
│  │ - Enrollments    │      │ - Badges         │                 │
│  │ - Progress       │      │ - Verifiers      │                 │
│  └──────────────────┘      └──────────────────┘                 │
│         ↓ Event                     ↓ Event                      │
│    (EnrollmentCompleted)      (BadgeIssued)                      │
│         ↓                           ↓                            │
│  ┌───────────────────────────────────────────────┐              │
│  │         COMMUNITY BC                          │              │
│  │ ACL:                                          │              │
│  │ - Translate EnrollmentCompleted              │              │
│  │   → UserBadgeEarned (reputation)             │              │
│  │ - Translate CourseCompleted                  │              │
│  │   → ContributionScored                       │              │
│  └───────────────────────────────────────────────┘              │
│         ↑ (listens to Learning, Cert)                           │
│         │                                                        │
│  ┌──────────────────────────────────────────────┐               │
│  │       SKILL LAB BC                           │               │
│  │                                              │               │
│  │ - Labs           ↔ Learning BC               │               │
│  │ - Challenges     (publish course)            │               │
│  │ - Sessions                                   │               │
│  │ - Solutions                                  │               │
│  └──────────────────────────────────────────────┘               │
│         ↓ Event                                                  │
│    (LabSessionCompleted)                                        │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────┐               │
│  │      METRICS BC (Event Sink / Aggregator)    │               │
│  │                                              │               │
│  │ Listens to ALL domains:                      │               │
│  │ - Learning: Enrollment, Course Complete     │               │
│  │ - Cert: Exam Passed, Badge Issued           │               │
│  │ - Lab: Session Complete                     │               │
│  │ - Community: Badge Earned, Profile Updated  │               │
│  │                                              │               │
│  │ Outputs: Metrics, KPIs, Dashboards         │               │
│  └──────────────────────────────────────────────┘               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 API Contracts Between Contexts

#### Learning → Certification

**API: LearningPathCompleted**
```typescript
// Fired by Learning BC
Event {
  enrollmentId: UUID,
  learnerId: UUID,
  pathId: UUID,
  completedAt: DateTime,
  finalScore: number (0..100)
}

// Certification BC listens and:
- Check if learner now qualifies for any certification
- Create CertificationCandidate record
- Send "Ready to Certify" email
```

#### Certification → Community

**API: BadgeIssued**
```typescript
// Fired by Certification BC
Event {
  badgeId: UUID,
  learnerId: UUID,
  certificationId: UUID,
  issueDate: DateTime,
  badge: {
    name: string,
    imageUrl: string
  }
}

// Community BC listens and:
- Add Badge to LearnerProfile
- Award 50-100 reputation points
- Unlock "Certified" achievement
- Update leaderboards
```

#### Skill Lab → Community

**API: LabSessionCompleted**
```typescript
// Fired by Skill Lab BC
Event {
  sessionId: UUID,
  learnerId: UUID,
  labId: UUID,
  finalScore: number,
  timeSpentMinutes: number
}

// Community BC listens and:
- Award 10-30 reputation (based on score)
- Record contribution (lab completed)
- Update skill badges if threshold reached
```

#### Anti-Corruption Layer: Learning → Certification

```typescript
// Certification BC's ACL (Adapter)
class CertificationACL {
  
  onPathCompleted(event: PathCompletedEvent): void {
    // Translate Learning domain terms → Cert domain terms
    const qualifiedPaths = this.certRepo
      .findRequiredPaths()
      .map(p => p.learningPathId);
    
    if (qualifiedPaths.includes(event.pathId)) {
      const candidate = CertificationCandidate.create({
        learnerId: event.learnerId,
        certificationId: this.mapPathToCert(event.pathId),
        qualifiedAt: event.completedAt
      });
      
      this.candidateRepo.save(candidate);
      this.notificationService.sendEmail(
        event.learnerId,
        "You're ready to certify!"
      );
    }
  }
}
```

---

## Part 4: Architecture Decisions (ADRs)

### ADR-001: Event-Driven Architecture for Cross-Domain Communication

**Status:** ACCEPTED

**Decision:** Use asynchronous, event-driven communication between bounded contexts instead of direct service calls.

**Problem:**
- Tight coupling between domains limits scalability
- Certification domain doesn't need to know Learning API details
- Metrics need to aggregate data from all domains
- Supports future domain additions without modifying existing code

**Decision:**
- Each bounded context publishes domain events
- Event bus (RabbitMQ/Kafka) routes events to subscribers
- Metrics domain subscribes to ALL events (event sink pattern)
- Anti-corruption layers translate events between domain languages

**Consequences:**
- ✅ Loose coupling, high cohesion
- ✅ Easy to add new features (e.g., "send email on badge earned")
- ⚠️ Eventual consistency (2-5s latency acceptable)
- ⚠️ Event schema evolution requires versioning strategy
- ⚠️ Requires idempotent event handlers (no duplicates)

**Implementation:**
```yaml
Event Schema Versioning:
  BadgeIssuedV1: {badgeId, learnerId, certId}
  BadgeIssuedV2: {badgeId, learnerId, certId, issuedByVerifierId}
  # Support both versions temporarily; deprecate V1 after 30 days
```

---

### ADR-002: Separate Read Model (CQRS) for Metrics & Dashboards

**Status:** ACCEPTED

**Decision:** Implement Command Query Responsibility Segregation (CQRS) for metric aggregations.

**Problem:**
- Dashboards need fast reads across multiple domains
- Write-heavy application (events flowing from multiple sources)
- Computing metrics in real-time from raw events is expensive
- Different stakeholders need different views (learner vs instructor vs admin)

**Decision:**
- Commands (create enrollment, submit solution) write to transactional database
- Metrics domain builds separate read models (denormalized, indexed)
- Read models updated asynchronously from events
- Dashboards query read models (not transactional DB)

**Consequences:**
- ✅ Queries return in <2s (indexed, denormalized)
- ✅ Separates scaling concerns (read vs write)
- ✅ Supports multiple read model views
- ⚠️ Extra complexity (two data stores)
- ⚠️ Metrics lag events by 1-2 seconds (acceptable)

**Implementation:**
```yaml
Write Side:
  Database: PostgreSQL (ACID, events table)
  Pattern: Event sourcing for audit trail
  
Read Side:
  Cache: Redis (hot metrics)
  Analytics: ClickHouse (time-series)
  Search: Elasticsearch (full-text)
  
Sync:
  Event Bus → Metrics Service → Update caches
  Latency: <2 seconds (acceptable for dashboards)
```

---

### ADR-003: Domain Event Sourcing for Certification Audit Trail

**Status:** ACCEPTED

**Decision:** Implement event sourcing for Certification domain to maintain complete audit trail.

**Problem:**
- Certifications are legal/compliance-sensitive
- Must replay history to investigate disputes
- Regulatory requirement: "prove user was certified on X date"
- Current exam grade must be verifiable

**Decision:**
- Certification domain stores all events (never deletes)
- Current state derived from event replay
- Snapshots every 100 events for performance
- Audit queries reconstruct state at any point in time

**Consequences:**
- ✅ Complete audit trail for compliance
- ✅ Can replay to investigate disputes
- ✅ Supports time-travel queries
- ⚠️ Storage overhead (~2GB/year per 500 learners)
- ⚠️ Complex event replay logic
- ⚠️ Requires careful event versioning

**Implementation:**
```typescript
interface CertificationEventStore {
  append(event: CertificationEvent): Promise<void>
  getAllEvents(certId: UUID): Promise<CertificationEvent[]>
  getEventsAfter(certId: UUID, timestamp: DateTime): Promise<CertificationEvent[]>
  getSnapshot(certId: UUID, timestamp: DateTime): Promise<CertificationState>
}

// Example: Reconstruct certification state at audit time
function reconstructCertState(certId, auditDate) {
  const events = eventStore.getEventsAfter(certId, EPOCH).until(auditDate);
  const state = CertificationState.empty();
  for (const event of events) {
    state.apply(event);
  }
  return state;
}
```

---

### ADR-004: Microservices with Orchestration (vs Choreography)

**Status:** ACCEPTED

**Decision:** Use orchestration (central coordinator) rather than choreography (peer events) for complex workflows.

**Problem:**
- Certification workflow: EnrollmentCompleted → QualifyForCert → ScheduleExam → Issue Badge
- With choreography, each service reacts independently (hard to debug if step fails)
- Need visibility into multi-step workflows
- Need to retry failed steps in order

**Decision:**
- Use SAGA pattern with orchestration coordinator
- Certification Orchestrator owns workflow definition
- Each step is atomic; coordinator retries on failure
- Coordinator logs all steps (observability)

**Consequences:**
- ✅ Clear workflow visibility
- ✅ Easy to debug stuck workflows
- ✅ Built-in compensating transactions (rollback)
- ⚠️ Coordinator is a potential bottleneck
- ⚠️ Coordinator itself must be resilient (replicated)

**Implementation:**
```yaml
CertificationWorkflow Orchestrator:
  Steps:
    1. Receive EnrollmentCompleted event
       → Check prerequisites ✓
    
    2. Create CertificationCandidate
       → Persist to DB ✓
    
    3. Send "Ready to Exam" email
       → Via email service (retry 3x) ✓
    
    4. Schedule auto-expiry (2 years)
       → Via scheduler ✓
    
  Failure Handling:
    - If step 3 fails → Retry with exponential backoff
    - If step 4 fails → Alert admin, manual resolution
    - Timeout: 5 minutes per step
```

---

### ADR-005: Learner Data Privacy (GDPR/CCPA Compliance)

**Status:** ACCEPTED

**Decision:** Implement privacy-by-design with data minimization and right-to-forget.

**Problem:**
- GDPR right-to-be-forgotten: learner can request all data deletion
- CCPA data portability: learner can download data
- Metrics domain aggregates sensitive data (completion patterns, scores)
- Certification domain holds legal records (can't delete, but can anonymize)

**Decision:**
- Learning domain: deletion supported (soft-delete, then hard-delete after 30 days)
- Certification domain: anonymize instead of delete (replace name with ID)
- Metrics domain: aggregate queries use anonymized data
- Right-to-download: export tool generates learner's data package

**Consequences:**
- ✅ GDPR/CCPA compliant
- ✅ Privacy respects learner autonomy
- ⚠️ Certification domain has permanent records
- ⚠️ Requires careful data segregation
- ⚠️ Right-to-forget requires 30-day grace period

**Implementation:**
```typescript
// Learning Domain: Soft Delete + Hard Delete
class LearnerRepository {
  async softDelete(learnerId: UUID): Promise<void> {
    await db.query(`
      UPDATE learners SET deleted_at = NOW() WHERE id = ?
    `, [learnerId]);
  }
  
  // Runs nightly: hard delete anything soft-deleted >30 days ago
  async hardDeleteExpired(): Promise<void> {
    await db.query(`
      DELETE FROM learners 
      WHERE deleted_at < NOW() - INTERVAL '30 days'
    `);
  }
}

// Certification Domain: Anonymize (not delete)
class CertificationAggregator {
  private async anonymizeLearner(learnerId: UUID): Promise<void> {
    await db.query(`
      UPDATE certifications 
      SET learner_id = ? -- anonymized ID
      WHERE learner_id = ?
    `, [anonymizedId(learnerId), learnerId]);
  }
}
```

---

### ADR-006: Skill Lab Sandbox Isolation (Security)

**Status:** ACCEPTED

**Decision:** Run skill labs in isolated Docker containers with resource limits.

**Problem:**
- Untrusted code execution (learner solutions)
- Prevent fork bombs, infinite loops, resource exhaustion
- Prevent escape attempts (container breakout)
- Learners could try to inspect other learners' code

**Decision:**
- Each lab session runs in separate Docker container
- Containers: Alpine Linux base, 512MB RAM, 1CPU, 60s timeout
- Network: isolated, no internet
- File system: read-only except /tmp (cleared after session)
- Auto-kill process after 60s (prevent hangs)

**Consequences:**
- ✅ Secure against malicious code
- ✅ Prevents resource exhaustion
- ✅ Isolates learners from each other
- ⚠️ Infrastructure cost (~$0.01 per session)
- ⚠️ 3-5s startup latency per container
- ⚠️ Requires container orchestration (Kubernetes)

**Implementation:**
```dockerfile
# Lab Container Template
FROM alpine:3.18
RUN apk add --no-cache nodejs npm python3
WORKDIR /lab
COPY challenge /lab/
RUN npm install --production

# Security constraints
USER nobody
HEALTHCHECK --interval=5s CMD test -f /tmp/health

CMD timeout 60 node challenge.js
```

---

### ADR-007: Certification Exam Proctoring (Integrity)

**Status:** ACCEPTED

**Decision:** Implement automated and human proctoring for exams.

**Problem:**
- Badges must be trustworthy (prevent cheating)
- Online exams vulnerable to screen sharing, external help
- Manual proctoring expensive (1:1 ratio)
- Different certification levels have different requirements

**Decision:**
- **Associate level**: Automated (browser lock, keystroke analysis, camera)
- **Professional level**: AI proctoring (gaze tracking, environment scan)
- **Expert level**: Human proctoring (live video, Q&A session)
- Record exam session (audio, video, screen) for 90 days
- Suspicious behavior flags for human review

**Consequences:**
- ✅ Prevents cheating, maintains badge credibility
- ✅ Scales across certification levels
- ⚠️ Privacy concerns (recording, camera access)
- ⚠️ Tech support burden (camera/mic issues)
- ⚠️ Cost: ~$5-20 per exam depending on level

**Implementation:**
```typescript
enum ProctorType {
  AUTOMATED = 'automated',      // Associate
  AI = 'ai',                     // Professional
  HUMAN = 'human'               // Expert
}

interface ExamSession {
  proctorType: ProctorType;
  recordingUrl: string;          // S3 URL, expires 90 days
  suspiciousFlags: string[];     // ['eye_off_screen', 'external_audio']
  humanReviewRequired: boolean;
  verifierId?: UUID;             // Assigned human proctor
}
```

---

## Part 5: Technology Stack Decisions

### Backend Services

```yaml
Learning Service:
  Language: TypeScript/Node.js
  Framework: NestJS
  Database: PostgreSQL (relational, foreign keys)
  Cache: Redis (sessions, recommendations)
  Message Queue: RabbitMQ (event publishing)
  
Certification Service:
  Language: TypeScript/Node.js
  Framework: NestJS
  Database: PostgreSQL (ACID for exams)
  Event Store: PostgreSQL (event sourcing)
  Cache: Redis (candidate lookup)
  External: Proctoring API (ProctorU/Examity)
  
Skill Lab Service:
  Language: TypeScript/Node.js
  Framework: Express (lightweight)
  Orchestration: Kubernetes (container mgmt)
  Sandbox: Docker containers
  Metrics: Prometheus (resource usage)
  
Community Service:
  Language: TypeScript/Node.js
  Framework: NestJS
  Database: PostgreSQL + Elasticsearch (search)
  Cache: Redis (leaderboards)
  Graph: Neo4j (optional: collaboration graph)
  
Metrics Service:
  Language: Go (performance-critical)
  Framework: Gin
  Analytics DB: ClickHouse (time-series)
  Cache: Redis
  Search: Elasticsearch
  Message Queue: Kafka (high-throughput)
```

### Data Flow Architecture

```
┌──────────────────────────────────┐
│  Learner/Instructor Actions      │
│  (UI/API calls)                  │
└──────────────────┬───────────────┘
                   ↓
┌──────────────────────────────────────┐
│  Service Layer (NestJS)              │
│  - Commands → Database               │
│  - Events → Message Queue            │
└──────────────────┬───────────────────┘
                   ↓
┌──────────────────────────────────────┐
│  Event Bus (RabbitMQ/Kafka)          │
│  Topic: vibe-cast-events             │
│  Partitions: by domain               │
└─────┬──────────────────────┬─────────┘
      │                      │
      ↓                      ↓
┌──────────────────┐  ┌──────────────────┐
│ ACL Adapters     │  │ Metrics Service  │
│ (Translation)    │  │ (Event Sink)     │
└────────┬─────────┘  └──────────┬───────┘
         ↓                       ↓
┌──────────────────────────────────────┐
│  Domain Specific Stores              │
│  - PostgreSQL (transactional)        │
│  - Event Store (immutable)           │
│  - ClickHouse (time-series)          │
│  - Elasticsearch (search)            │
│  - Redis (cache)                     │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Read Models (Dashboards/API)        │
│  - Metrics snapshots                 │
│  - Leaderboards                      │
│  - Reports                           │
└──────────────────────────────────────┘
```

---

## Part 6: Ruflo Agent Mapping to Domains

### Agent-to-Domain Assignment

```yaml
Learning Domain:
  Quality Assurance: tdd-london-swarm
    └─ Validates: CourseContent, EnrollmentLogic, ProgressTracking
  
  Development: backend-dev, coder
    └─ Implements: LearningPathService, EnrollmentRepository
  
  Architecture: system-architect
    └─ Designs: Data model, API contracts

Certification Domain:
  Security: security-architect, security-auditor
    └─ Validates: ExamIntegrity, ProctoringSecurity, DataValidation
  
  Testing: tdd-london-swarm
    └─ Validates: BadgeIssuance, ExamGrading, RenewalLogic
  
  Development: backend-dev, coder
    └─ Implements: ExamService, EventSourcingStore

Skill Lab Domain:
  Testing: tdd-london-swarm, production-validator
    └─ Validates: SolutionGrading, SandboxIsolation, ResourceLimits
  
  Infrastructure: cicd-engineer
    └─ Manages: Docker, Kubernetes, Container orchestration
  
  Development: backend-dev, coder
    └─ Implements: LabService, ChallengeValidator

Community Domain:
  Development: backend-dev, coder
    └─ Implements: ProfileService, CollaborationManager
  
  Code Review: pr-manager, code-review-swarm
    └─ Reviews: PeerReviewLogic, ReputationCalculations

Metrics Domain:
  Performance: performance-engineer, perf-analyzer
    └─ Optimizes: ClickHouse queries, Redis caching, Kafka throughput
  
  Analytics: code-analyzer
    └─ Analyzes: Anomaly detection, KPI calculations
  
  Development: backend-dev, coder
    └─ Implements: MetricsAggregator, DashboardAPI

Cross-Domain:
  Orchestration: hierarchical-coordinator
    └─ Manages: Multi-domain workflows (certification saga)
  
  Architecture: system-architect, sparc-architect
    └─ Designs: Bounded contexts, event flows, API contracts
  
  DevOps: cicd-engineer
    └─ Manages: Deployment, monitoring, incident response
```

---

## Part 7: Event-Driven Data Flow

### Complete Event Flow for "Certification Path"

```
User Journey: Learner → Certified Professional

1. ENROLLMENT PHASE
   ├─ LearnerEnrolled event (Learning BC)
   │  └─ Community BC: Add to "Learner" role
   │
   ├─ CourseCompleted event (Learning BC)
   │  ├─ Metrics: Track completion rate
   │  └─ (repeat for all courses in path)
   │
   └─ EnrollmentCompleted event (Learning BC)
      ├─ Certification BC: Create CandidateQualified
      ├─ Community BC: Award achievement badge
      └─ Metrics: Track "path completion" KPI

2. CERTIFICATION PREPARATION
   ├─ CertificationCandidateCreated event (Cert BC)
   │  └─ Community BC: Unlock "Certifiable" badge
   │
   ├─ ExamScheduled event (Cert BC)
   │  ├─ Metrics: Track "exams scheduled" KPI
   │  └─ Community BC: Update profile status
   │
   └─ ExamStarted event (Cert BC)
      └─ Metrics: Start timing exam duration

3. EXAM COMPLETION
   ├─ ExamAnswersSubmitted event (Cert BC)
   │  └─ Auto-grading pipeline
   │
   └─ ExamGraded event (Cert BC)
      ├─ Score >= 75% ? → ExamPassed : ExamFailed
      │
      ├─ ExamPassed event (Cert BC)
      │  ├─ BadgeIssuedV1 event
      │  │  ├─ Community BC: 
      │  │  │   - Add to LearnerProfile
      │  │  │   - Award 100 reputation
      │  │  │   - Unlock "Certified" achievement
      │  │  │   - Update leaderboards
      │  │  │
      │  │  ├─ Learning BC:
      │  │  │   - Unlock advanced paths
      │  │  │
      │  │  ├─ Metrics:
      │  │  │   - Track "certification rate" KPI
      │  │  │   - Segment: by cert level
      │  │  │   - Calculate: "time to certification"
      │  │  │
      │  │  └─ External (optional):
      │  │     - Blockchain: Record credential
      │  │     - Email: Send certificate
      │  │     - Slack: Celebrate in #wins
      │  │
      │  └─ CertificationRenewalScheduled event
      │     └─ Scheduler: Set 2-year renewal reminder
      │
      └─ ExamFailed event (Cert BC)
         ├─ Community BC: Send encouragement
         └─ Metrics: Track failure rate (trigger alert if >30%)

4. ONGOING (METRICS)
   ├─ Hourly: MetricsComputed event
   │  ├─ Aggregates all events from past hour
   │  ├─ Updates ClickHouse snapshots
   │  ├─ Checks KPI thresholds
   │  └─ Runs anomaly detection
   │
   ├─ Daily: DashboardRefresh event
   │  └─ Regenerates all views
   │
   └─ Quarterly: CohortAnalysis event
      └─ Deep dive on learner segments
```

### Event Versioning Strategy

```yaml
Event Version Management:

BadgeIssuedV1 (current):
  Fields: badgeId, learnerId, certId
  Status: CURRENT
  
BadgeIssuedV2 (proposed):
  Fields: badgeId, learnerId, certId, issuedByVerifierId
  Status: PLANNED (30 days from release)
  Migration: auto-populate issuedByVerifierId = NULL for old events

Transition Timeline:
  Week 1:  Support both V1 and V2 (V1 → V2 adapter)
  Week 2:  Publish new events as V2
  Week 3:  Backfill historical V1 events to V2
  Week 4:  Deprecate V1 handler
  Week 5:  V1 handler fully removed

Handler Code:
  if (event.version === 'V1') {
    const v2 = adaptV1toV2(event);
    handle(v2);
  } else if (event.version === 'V2') {
    handle(event);
  }
```

---

## Part 8: Deployment Architecture

### Service Topology (Kubernetes)

```yaml
Namespace: vibe-cast-prod

Services:
  learning-service:
    Replicas: 3 (high traffic)
    CPU: 500m, Memory: 1Gi
    PVC: PostgreSQL (20Gi)
    
  certification-service:
    Replicas: 2 (lower traffic, critical)
    CPU: 300m, Memory: 512Mi
    PVC: PostgreSQL event store (50Gi)
    
  skill-lab-service:
    Replicas: 2 (background jobs)
    CPU: 1000m, Memory: 2Gi
    DaemonSet: Lab sandbox (per node)
    
  community-service:
    Replicas: 2
    CPU: 300m, Memory: 512Mi
    PVC: PostgreSQL + Elasticsearch
    
  metrics-service:
    Replicas: 1 (stateful)
    CPU: 1000m, Memory: 4Gi
    PVC: ClickHouse (100Gi)

Message Queues:
  rabbitmq:
    StatefulSet: 3 replicas
    Partition: vibe-cast-events
    
  kafka:
    StatefulSet: 3 brokers
    Topic: metrics-stream (20 partitions)

Caching:
  redis:
    StatefulSet: 1 master + 2 replicas
    Persistence: AOF enabled
    Memory: 4Gi

Databases:
  postgresql:
    StatefulSet: 1 primary + 2 replicas
    Storage: 500Gi (PostgreSQL)
    Backup: Daily snapshots → S3

  clickhouse:
    StatefulSet: 1 + 2 replicas
    Storage: 200Gi
    Backup: Daily snapshots → S3

Observability:
  prometheus:
    ConfigMap: scrape configs
    PVC: 50Gi (metrics storage)
    
  grafana:
    Deployment: 1 replica
    PVC: 10Gi (dashboard configs)
    
  elasticsearch:
    StatefulSet: 3 nodes
    Storage: 100Gi (logs)
    
  kibana:
    Deployment: 1 replica
    Port: 5601
```

---

## Part 9: Monitoring & Observability

### Key Metrics per Domain

```yaml
Learning Domain KPIs:
  - Enrollment rate (target: +10% MoM)
  - Path completion rate (target: >60%)
  - Abandonment rate (alert if >30%)
  - Average time-to-completion (target: <60 days)
  - Course satisfaction (NPS survey)

Certification Domain KPIs:
  - Certification conversion rate (target: 20%)
  - Exam pass rate (target: >85%)
  - Exam failure rate (alert if >20%)
  - Average time-to-certification (target: <120 days)
  - Badge renewal rate (target: >90%)

Skill Lab KPIs:
  - Lab completion rate (target: >80%)
  - Challenge difficulty calibration (target: 70% pass rate)
  - Average time per lab (trend)
  - Code quality score evolution (trend)

Community KPIs:
  - Daily active users (DAU)
  - Peer reviews completed (target: +15% MoM)
  - Collaboration frequency
  - User retention (30-day, 90-day)

System KPIs:
  - API response time (p95 < 200ms)
  - Service availability (target: 99.9%)
  - Event processing latency (p95 < 2s)
  - Database query performance (p95 < 100ms)
```

### Alert Rules

```yaml
Alerts:
  # Learning Domain
  - Rule: HighAbandonmentRate
    Condition: "abandonment_rate > 0.30"
    Severity: WARNING
    Action: Notify instructor team
    
  # Certification Domain
  - Rule: ExamPassRateAnomaly
    Condition: "exam_pass_rate < 0.75"
    Severity: CRITICAL
    Action: Escalate to certification manager
    
  # Infrastructure
  - Rule: DatabaseReplicationLag
    Condition: "pg_replication_lag_seconds > 5"
    Severity: CRITICAL
    Action: Page on-call DBA
    
  - Rule: EventQueueBacklog
    Condition: "rabbitmq_queue_messages_ready > 10000"
    Severity: WARNING
    Action: Scale metrics-service consumer replicas
```

---

## Part 10: Deployment Checklist & Runbooks

### Pre-Launch Verification

```
[ ] Domain Models Reviewed
    - [ ] Aggregates have clear boundaries
    - [ ] Value objects immutable
    - [ ] Invariants enforced
    
[ ] Event Schema Finalized
    - [ ] All events versioned (V1, V2, etc.)
    - [ ] Migration strategy documented
    - [ ] Anti-corruption layers tested
    
[ ] ACLs Implemented
    - [ ] Learning → Cert ACL tested
    - [ ] Cert → Community ACL tested
    - [ ] All domains → Metrics ACL tested
    
[ ] ADRs Documented & Approved
    - [ ] All 7 ADRs signed off
    - [ ] Alternative options recorded
    - [ ] Consequences acknowledged
    
[ ] Integration Tests Passing
    - [ ] Cross-domain event flows
    - [ ] SAGA orchestration workflows
    - [ ] Failure scenarios (retry, timeout)
    
[ ] Security & Compliance
    - [ ] GDPR compliance review
    - [ ] Exam proctoring tested
    - [ ] Data encryption at rest/transit
    - [ ] Penetration testing results
    
[ ] Monitoring & Alerting
    - [ ] All KPI dashboards created
    - [ ] Alert rules configured
    - [ ] Runbooks written for each alert
    
[ ] Documentation
    - [ ] ADRs published
    - [ ] API contracts documented
    - [ ] Event schema published
    - [ ] Runbooks for ops team
```

---

## Summary: Strategic Impact

### How This Architecture Supports Business Goals

| Goal | Mechanism | Outcome |
|------|-----------|---------|
| **500 learners** | Microservices, horizontal scaling | Handle 10k+ concurrent users |
| **20% conversion** | Event-driven feedback loops | Track conversion at each stage |
| **Certified architects** | Proctored exams, integrity checks | Trusted credentials |
| **Extensibility** | Bounded contexts, event bus | Add domains without breaking existing |
| **Compliance** | Event sourcing, audit trails | GDPR/CCPA ready |
| **Performance** | CQRS read models, caching | Dashboards load <2s |

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-02  
**Next Review:** 2026-09-02 (quarterly)

