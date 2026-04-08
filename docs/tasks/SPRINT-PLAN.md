---
id: SPRINT-PLAN
title: London Meetup Demo Sprint Plan
sprint: Demo Sprint
---

# Sprint Plan: Customer Support Triage Demo

## Sprint Goal
Demonstrate a functional multi-agent customer support system handling 50+ realistic support tickets live at the London meetup on 2026-04-08.

## Dependency Graph

```
TASK-001 (Backend Setup)
    ↓
TASK-002 (Intake Agent)
    ↓
├─→ TASK-003 (Billing Specialist)
├─→ TASK-004 (Technical Specialist)
├─→ TASK-005 (Account Manager)
│       ↓
└─→ TASK-006 (Escalation Manager)
    ↓
TASK-007 (Dashboard UI & WebSocket)
    ↓
TASK-008 (Mock Data Generator & Testing)
    ↓
TASK-009 (Netlify Deployment)
```

## Timeline (Optimized for Parallel Execution)

### Phase 1: Foundation (1-2 hours)
**Goal**: Database and API ready for agents

- **TASK-001** (Backend Setup) → 2-3 hours
  - Implement ticket CRUD API
  - Database schema and connection
  - Event emission layer
  - Dependencies: None
  - **Owner**: Backend Dev
  - **Blocker for**: All other tasks

---

### Phase 2: Agent Implementation (Parallel, 2-3 hours each)
**Goal**: All 5 agents operational and processing tickets

- **TASK-002** (Intake Agent) → 2 hours
  - Classification prompt + implementation
  - Event wiring
  - Token tracking
  - **Dependencies**: TASK-001
  - **Owner**: Agent Dev 1
  - **Blocker for**: TASK-003, TASK-004, TASK-005

- **TASK-003** (Billing Specialist) → 2 hours
  - Billing resolution prompt + implementation
  - Mock customer data access
  - Refund authorization logic
  - **Dependencies**: TASK-001, TASK-002
  - **Owner**: Agent Dev 2
  - **Parallel**: Yes (start after TASK-002)

- **TASK-004** (Technical Specialist) → 2 hours
  - Technical troubleshooting prompt + implementation
  - Error code reference data
  - Known issues database
  - **Dependencies**: TASK-001, TASK-002
  - **Owner**: Agent Dev 3
  - **Parallel**: Yes (start after TASK-002)

- **TASK-005** (Account Manager) → 1.5 hours
  - Account resolution prompt + implementation
  - Mock account database
  - **Dependencies**: TASK-001, TASK-002
  - **Owner**: Agent Dev 1
  - **Parallel**: Yes (start after TASK-002)

- **TASK-006** (Escalation Manager) → 1.5 hours
  - Escalation review prompt + implementation
  - Event wiring (listens to escalation flags)
  - **Dependencies**: TASK-001, TASK-002, all specialist agents
  - **Owner**: Agent Dev 2
  - **Parallel**: Yes (can start in parallel but completes last)

---

### Phase 3: Frontend & Integration (Parallel, 1-2 hours)
**Goal**: Live dashboard showing real-time agent activity

- **TASK-007** (Dashboard UI) → 2 hours
  - React dashboard component
  - WebSocket integration
  - Real-time ticket queue view
  - Agent status display
  - Cost tracking visualization
  - **Dependencies**: TASK-001 (needs API)
  - **Owner**: Frontend Dev
  - **Parallel**: Yes (can start early)

---

### Phase 4: Testing & Deployment (1-2 hours)
**Goal**: System ready for live demo

- **TASK-008** (Mock Data Generation & Testing) → 1 hour
  - Load 50 mock tickets into database
  - Verify classification accuracy
  - Check performance metrics
  - **Dependencies**: All agents complete (TASK-002 through TASK-006)
  - **Owner**: QA/Testing
  - **Blocker for**: TASK-009

- **TASK-009** (Netlify Deployment) → 1 hour
  - Deploy backend (Netlify Functions)
  - Deploy frontend (Netlify static hosting)
  - Verify live environment
  - Load test (50 concurrent tickets)
  - **Dependencies**: TASK-007, TASK-008
  - **Owner**: DevOps/Deployment
  - **Final step**: Everything else complete

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| LLM API timeout/rate limits | Demo stops | Medium | Cache responses, use fallback logic |
| Database connection issues | All agents fail | Low | Use local SQLite fallback |
| WebSocket latency | Dashboard feels slow | Low | Implement polling fallback |
| Prompt quality too low | Wrong classifications | Medium | Have backup prompts ready |
| Concurrent ticket processing bug | Duplicate/lost tickets | Low | Atomic DB transactions, thorough testing |
| Netlify function cold starts | First request slow | Medium | Pre-warm functions, increase memory |

---

## Critical Success Factors

1. **TASK-001 unblocks everything** — Must complete first, no shortcuts
2. **TASK-002 unblocks all specialist agents** — Cannot parallelize specialists without Intake
3. **Agent accuracy matters** — All agents must achieve ≥90% accuracy before demo
4. **Dashboard must be live** — If dashboard is broken, demo impact is high
5. **Mock data must be realistic** — Credibility depends on authentic-looking tickets/resolutions

---

## Day-of Demo Checklist

- [ ] Database seeded with 50 mock tickets
- [ ] Intake Agent accuracy ≥95%
- [ ] All specialist agents responding
- [ ] Dashboard loading, updating live (<3 sec latency)
- [ ] Cost tracking visible and accurate
- [ ] No LLM errors or timeouts in first 10 tickets
- [ ] Team can answer: "Which agent is handling ticket-005 right now?" in <2 sec
- [ ] Full run from ticket-001 to ticket-050 completes without manual intervention
- [ ] Netlify deployment is live (no local dev server)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|------------|
| **Intake Classification Accuracy** | ≥95% | % of tickets correctly categorized |
| **First Agent Response** | ≤5 sec | Time from ticket submission to first agent action |
| **Dashboard Update Latency** | ≤3 sec | Time from ticket change to UI update |
| **Cost per Ticket** | <$0.05 | Total tokens × model pricing / ticket count |
| **Uptime During Demo** | 100% | No crashes/errors in 30+ min demo window |
| **Team Understanding** | 100% | All attendees can explain agent routing |

---

*Specifications are the source of truth, not code. — BHIL*
