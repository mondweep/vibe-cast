# ADR-017: Metrics Domain — Learner & Cohort Analytics

**Status:** PROPOSED (2026-06-07)
**Context:** Closes the gap between PRD §8 (Metrics Domain) and the shipped build
**Deciders:** (pending) Product owner, Architecture team
**Methodology:** SPARC + DDD + TDD (London School), per PRD
**Related:** [ADR-011 CQRS Read Models], [ADR-009 EventBus], [ADR-013 Learning Domain], [ADR-015 Skill Lab], [ADR-016 Community]

---

## Problem

PRD §8 specifies a **Metrics Domain**: a **Learner Analytics Dashboard** for instructors — cohort overview (size, active %, avg progress, completion rate, churn risk), per-learner detail (path progress, exercises completed, submission quality, time invested, engagement trend, estimated certification date), exam analytics (avg score, pass rate, difficulty, most-missed questions, distribution), and CSV/PDF export. **None of it is built.** A `metrics` read model placeholder exists in the legacy schema but is unused.

---

## Decision

Implement **Metrics** as a **pure read/analytics context** (CQRS read side, ADR-011). It owns **no write aggregates** — it is a set of **projectors** that subscribe to events from Learning (§4), Skill Lab (§5/ADR-015), Certification (§6), and Community (§7/ADR-016), plus a **query/aggregation engine**. This keeps analytics decoupled and avoids duplicating source-of-truth state.

### 1. Projection model (read side only)

```
Projectors (subscribe to EventBus, ADR-009):
  LessonCompleted/PathCompleted (§4)  → learner path progress, time invested
  ExerciseCompleted (ADR-015)          → exercises completed X/Y, submission quality
  ExamSubmitted/Graded (§6)            → exam analytics
  PatternRated/PeerReviewSubmitted     → engagement signals
  (any activity)                       → lastActivity, engagement trend, daysInactive

Aggregation engine (query-time + scheduled rollups):
  cohortMetrics(cohortId)  → size, activeThisWeek %, avgPathProgress, completionRate, avgTimePerLesson, churnRisk[]
  learnerMetrics(learnerId)→ pathProgress, exercisesCompleted, submissionQuality, lastActivity, timeInvested, engagementTrend (↗/→/↘), estimatedCertDate
  examStats(examId)        → averageScore, passRate, scoreDistribution, mostMissedQuestions, cohortComparison
```

**Churn risk:** learners with `daysInactive ≥ threshold` (default 7; configurable). **Engagement trend:** slope of activity over a trailing window.

### 2. Read models (CQRS — `ruflo_demo`, doubled-prefix, RLS + `projection_version`/`last_synced_event_id`)
- `ruflo_demo_cohort_read_model` (cohort_id, name, learner_ids[], instructor_id).
- `ruflo_demo_learner_metrics_read_model` (per learner: progress %, exercises_completed/total, submission_quality, time_invested_hours, last_activity_at, days_inactive, engagement_trend, est_cert_date).
- `ruflo_demo_exam_analytics_read_model` (per exam: avg_score, pass_rate, score_distribution jsonb, most_missed jsonb).
- Instructor-scoped RLS; a learner may read **only their own** metrics row (the §4.3 dashboard already surfaces a learner-facing subset).

### 3. Roles
Add an **instructor** persona (a role on `learner_profile` or a small `instructor` table mapping instructor → cohort). Cohort/exam analytics require the instructor role; per-learner analytics are visible to the instructor of that learner's cohort and to the learner themselves.

### 4. API
- `GET /api/v1/metrics/cohorts/:id` — cohort overview (instructor-gated).
- `GET /api/v1/metrics/learners/:id` — individual learner metrics.
- `GET /api/v1/metrics/exams/:examId` — exam analytics.
- `GET /api/v1/metrics/cohorts/:id/export?format=csv|pdf&from=&to=&metrics=` — report export.

### 5. Frontend
- `AnalyticsPage` (cohort cards: size, active %, avg progress, completion, avg time/lesson, churn-risk list), `LearnerDetailPage` (progress, exercises, quality, last activity, time, trend, est cert date), `ExamAnalyticsPage` (distribution chart, most-missed, cohort comparison), export dialog (format + date range + metric selection).

### 6. Refresh strategy
Cheap metrics compute at query time. Expensive cohort rollups (averages, est-cert-date, distributions) are materialized by a **scheduled refresh worker** (Ruflo loop-workers / cron) and stored in the read models with `projection_version`, so the dashboard stays fast.

---

## Consequences / Risks
- **No source-of-truth duplication** — Metrics derives everything from events; if a projector lags, `last_synced_event_id` makes it observable and replayable.
- **Privacy:** instructor access to per-learner data must be RLS-enforced and scoped to their cohort.
- Export (PDF) adds a rendering dependency — defer to P3.

## Phasing
1. **P1:** Cohort + learner read models & projectors; `AnalyticsPage` + `LearnerDetailPage`.
2. **P2:** Exam analytics + churn risk + engagement trend.
3. **P3:** CSV/PDF export; scheduled rollup worker; cohort-over-cohort comparison.

## Test strategy (London School)
Mock `MetricsRepository`, `AnalyticsEngine`, and the source-domain projections; assert cohort aggregation (active %, avg progress), churn-risk identification (inactive ≥ threshold), and exam statistics (avg, pass rate) — per the PRD §8 test sketches.
