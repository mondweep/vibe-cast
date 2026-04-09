# Sprint S1 Plan: Pi Network Explorer MVP

**Status:** draft  
**Duration:** 4 weeks (estimated)  
**Goal:** Deliver fully functional Pi Network Explorer with real-time updates via PubNub, hosted on Netlify  

## Sprint Overview

This sprint delivers the complete MVP per PRD-001 and SPEC-001, emphasizing:
- **Rapid iteration** (BHIL principle: fast spec → code → test cycles)
- **Specification-first** (no code without approved SPEC/TASK)
- **Quantified metrics** (all success criteria measurable)
- **Risk mitigation** (timeout handling, rate limiting, error recovery)

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│  TASK-001: Project Scaffold & Infrastructure Setup              │
│  (Netlify, React, Vite, TypeScript, PubNub setup)               │
│  ↓                                                               │
├─────────────────────────────────────────────────────────────────┤
│  TASK-002: Netlify API Functions                                │
│  (search, contribute, vote functions)                           │
│  ↓                                                               │
├──────────────────┬─────────────────────────────────────────────┤
│                  │                                              │
│  TASK-003A:      │  TASK-003B:                                 │
│  SearchView      │  ContributeView & VoteView                 │
│  Component       │  Components                                 │
│  ↓               │  ↓                                           │
├──────────────────┼─────────────────────────────────────────────┤
│                  │                                              │
│  (parallel)      │  (parallel)                                 │
│                  │                                              │
└──────────────────┴─────────────────────────────────────────────┘
                   │
                   ↓
          ┌─────────────────┐
          │ TASK-004:       │
          │ Dashboard &     │
          │ Real-time Feed  │
          └─────────────────┘
                   │
                   ↓
          ┌─────────────────┐
          │ TASK-005:       │
          │ Integration &   │
          │ E2E Testing     │
          └─────────────────┘
```

## Task Breakdown

| Task ID | Title | Duration | Dependencies | Status |
|---------|-------|----------|--------------|--------|
| TASK-001 | Project Scaffold & Infrastructure | 1-2 days | None | pending |
| TASK-002 | Netlify API Functions | 2-3 days | TASK-001 | pending |
| TASK-003A | SearchView Component (parallel) | 2 days | TASK-002 | pending |
| TASK-003B | Contribute/Vote Components (parallel) | 2 days | TASK-002 | pending |
| TASK-004 | Dashboard & Real-time Feed | 2 days | TASK-003A + 003B | pending |
| TASK-005 | Integration & E2E Testing | 2-3 days | TASK-004 | pending |
| TASK-006 | Deployment & Documentation | 1 day | TASK-005 | pending |

**Total Estimated Effort:** 12-16 days (4 weeks @ 3 days/week)

## Week-by-Week Schedule

### Week 1: Foundation
- **Days 1-2:** TASK-001 (scaffold) — Project structure, dependencies, build system
- **Days 3-5:** TASK-002 (API functions) — Backend implementation, local testing

**Deliverable:** Working backend that calls pi.ruv.io and publishes to PubNub

### Week 2: UI Components (Parallel)
- **Days 1-3:** TASK-003A (SearchView) — Search form, results display, PubNub subscription
- **Days 3-5:** TASK-003B (Contribute/Vote) — Forms, validation, submission

**Deliverable:** All interactive components working with mock data

### Week 3: Integration & Real-time
- **Days 1-2:** TASK-004 (Dashboard) — Activity feed, live stats, real-time updates
- **Days 3-5:** TASK-005 (Testing & integration) — E2E tests, cross-component validation

**Deliverable:** Full app working end-to-end with real pi network

### Week 4: Polish & Release
- **Days 1-3:** Bug fixes, performance optimization, accessibility (WCAG 2.1 AA)
- **Days 4-5:** TASK-006 (deployment) — Documentation, Netlify setup, go-live

**Deliverable:** Production-ready app deployed to Netlify

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Pi.ruv.io API timeout (>10s) | Medium | High | Implement exponential backoff; fallback to degraded mode |
| PubNub message quota exceeded | Low | Medium | Monitor usage; upgrade tier if needed; batch updates |
| Netlify Function timeout (>26s) | Low | Medium | Keep api calls <8s; use PubNub for async results |
| Rate limiting by pi.ruv.io | Medium | Medium | Implement client-side request throttling; queue |
| Concurrent user scaling | Low | Medium | Monitor concurrent connections; scale PubNub if needed |
| TypeScript type errors blocking build | Low | Low | Enable strict mode early; type test utilities |

## Success Metrics (from PRD-001)

| Metric | Target | Measurement | Gate |
|--------|--------|-------------|------|
| Page load time | <2s | Lighthouse score ≥90 | Pass/fail |
| Real-time latency | <500ms | PubNub message roundtrip | 90th percentile |
| API response time | <3s | Synthetic monitoring | 95% of requests |
| Search accuracy | ≥85% | Golden test set (50 queries) | Manual review |
| Feature completeness | 100% | Feature checklist | All 5 features working |
| Uptime | ≥99% | Monitoring during 72h test | Uptime dashboard |

## Approval Workflow

Each task requires:
1. **Implementation** — Code written per SPEC/TASK
2. **Testing** — Acceptance criteria verified
3. **Review** — Code review against SPEC (see ADR/SPEC for architecture)
4. **Approval** — Sign-off before merging to main

## Rollback Plan

If critical blocker discovered:
1. Branch off issue fix to separate branch (`bugfix/issue-name`)
2. Fix in isolation
3. Merge back to `claude/pi-tinkering-86sN1` with issue trace
4. Update affected TASK acceptance criteria
5. No rollback of prior sprints (immutable history per BHIL)

## Review Gates

Each week requires:
- **Monday:** Sprint kickoff (review schedule, blockers)
- **Wednesday:** Midweek check-in (progress, risks)
- **Friday:** Sprint review (metrics, next week plan)

## Documentation Requirements

By end of sprint:
- [x] PRD-001 (complete)
- [x] SPEC-001 (complete)
- [x] ADR-001, 002, 003 (complete)
- [x] All TASK-NNN files (complete)
- [ ] DEPLOYMENT.md (setup steps for production)
- [ ] API.md (endpoint documentation)
- [ ] TROUBLESHOOTING.md (common issues)

## Sign-off

- [ ] Product Owner (confirms PRD scope met)
- [ ] Tech Lead (confirms SPEC/ADR compliance)
- [ ] QA Lead (confirms test coverage)
- [ ] DevOps (confirms deployment ready)

---

*Specifications are the source of truth, not code.* — BHIL
