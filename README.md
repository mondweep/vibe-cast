# Multi-Agent Customer Support Triage System Demo

**Goal**: Demonstrate autonomous agent coordination handling realistic customer support scenarios.

## 🎯 Quick Start

Everything you need to implement this demo is in the `/docs` and `/mock-data` directories.

### Project Structure

```
docs/
├── prd/              # Product Requirements Documents
│   └── PRD-001-support-triage.md        ← Start here for requirements
├── spec/             # Technical Specifications
│   └── SPEC-001-support-triage.md       ← Architecture & APIs
├── adr/              # Architecture Decision Records
│   ├── ADR-001-agent-orchestration.md   ← Why we chose event-driven
│   └── (more ADRs as needed)
├── tasks/            # Implementation Breakdown
│   ├── SPRINT-PLAN.md                   ← Timeline & dependencies
│   ├── TASK-001-backend-setup.md        ← Start here (Phase 1)
│   ├── TASK-002-intake-agent.md         ← Phase 2
│   ├── (TASK-003 through TASK-009)      ← Rest of implementation
│   └── PROMPT-REGISTRY.md               ← Prompt versions & history
└── prompts/          # Versioned prompt templates
    └── INTAKE-CLASSIFICATION/
        └── v1.0/
            ├── system-prompt.md
            └── user-template.md

mock-data/
├── tickets.json      ← 30 realistic support ticket scenarios
├── customers.json    ← 10 customer profiles with billing history
└── (expansion data as needed)

src/
├── api/              # Backend endpoints (to be created)
├── agents/           # Agent implementations (to be created)
├── components/       # React components (to be created)
└── lib/              # Utilities & database layer (to be created)
```

## 📋 Implementation Roadmap

### Phase 1: Backend Foundation (1-2 hours)
**Status**: Spec Ready | Implementation: NOT STARTED

→ **Next Step**: Implement **TASK-001** (Backend Setup)
- Read: `docs/tasks/TASK-001-backend-setup.md`
- Creates database schema, ticket CRUD API, event system
- Unblocks all other tasks

### Phase 2: Agent Implementation (2-3 hours, parallelizable)
**Status**: Specs Ready | Implementation: NOT STARTED

→ **Next Steps** (in parallel after TASK-001):
1. **TASK-002**: Intake Agent (classifies tickets)
   - Read: `docs/tasks/TASK-002-intake-agent.md`
   - Unblocks specialist agents

2. **TASK-003-005**: Specialist Agents (in parallel after TASK-002)
   - Billing, Technical, Account specialist prompts + implementations

3. **TASK-006**: Escalation Manager
   - Validates escalation flags, routes to human queue

### Phase 3: Frontend & Real-time Dashboard (1-2 hours)
**Status**: UI Design Pending | Implementation: NOT STARTED

→ **Next Step**: **TASK-007** (Dashboard)
- Live ticket queue
- Agent status (currently processing)
- Cost tracking
- Real-time updates via WebSocket

### Phase 4: Testing & Deployment (1-2 hours)
**Status**: Test Plan Ready | Implementation: NOT STARTED

→ **Final Steps**:
1. **TASK-008**: Seed 50 mock tickets, verify accuracy
2. **TASK-009**: Deploy to Netlify, run load test

---

## 🎬 How to Demo This

1. **Start the backend** (Netlify Functions local or deployed)
2. **Start the frontend** (React dashboard on Netlify)
3. **Ingest 50 mock tickets** (via API or seeding script)
4. **Watch agents work** in real-time on the dashboard:
   - Intake Agent classifies each ticket
   - Specialists route to appropriate agent (Billing, Technical, Account)
   - Escalation Manager handles complex cases
   - Dashboard shows all activity live, cost tracking, reasoning

5. **Explain the flow** to your team:
   - Multiple agents working simultaneously (no human bottleneck)
   - Each agent decision is logged with reasoning
   - Cost tracked per agent, per ticket
   - System orchestrated by events, not sequential handoffs

---

## 📊 Success Criteria

Before the demo, verify:

- [ ] Intake Agent classifies tickets ≥95% accuracy
- [ ] First agent response ≤5 sec
- [ ] Dashboard updates live (<3 sec latency)
- [ ] Cost per ticket <$0.05
- [ ] All 50 tickets processed without manual intervention
- [ ] Agent reasoning visible/logged for every decision
- [ ] Team can explain: "Which agent is handling this ticket right now?"

---

## 🏗️ Key Files to Know

| File | Purpose |
|------|---------|
| `docs/prd/PRD-001-support-triage.md` | **What** we're building and **why** |
| `docs/spec/SPEC-001-support-triage.md` | **How** to build it (architecture + APIs) |
| `docs/adr/ADR-001-agent-orchestration.md` | **Why** event-driven architecture |
| `docs/tasks/SPRINT-PLAN.md` | **Timeline** and dependency order |
| `docs/tasks/TASK-00N-*.md` | **Step-by-step** implementation tasks |
| `mock-data/tickets.json` | **30 realistic** support scenarios |
| `mock-data/customers.json` | **Customer data** for agent context |

---

## 🚀 Running the Demo

```bash
# Seed database with mock data
npm run seed:db

# Start backend (Netlify Functions)
netlify dev

# Start frontend (in another terminal)
npm run dev

# Navigate to http://localhost:3000 (or Netlify deployed URL)
# Submit 50 tickets and watch agents coordinate in real-time
```

---

## 💡 What Makes This Demo Powerful

✅ **Real-world complexity**: 30 diverse ticket types covering billing, technical, account issues  
✅ **Transparent reasoning**: Every agent decision logged with explanation  
✅ **Cost visibility**: Team sees token usage + pricing per ticket  
✅ **Parallel execution**: 4+ agents working simultaneously (not sequential bottleneck)  
✅ **Autonomous escalation**: Agents detect out-of-scope issues and flag for human review  
✅ **Live dashboard**: Real-time view of ticket queue, agent status, costs  

**Message to Your Team**: "This is what autonomous agent coordination looks like. Multiple specialized agents, no human bottleneck, transparent decisions, cost-aware."

---

## 🤔 FAQ

**Q: Can I skip some agents for a faster demo?**  
A: Yes, but it weakens the demo. Start with Intake + 1 specialist (e.g., Billing) for MVP. Add others for full impact.

**Q: What if an agent fails?**  
A: System falls back gracefully (see SPEC-001 Error Handling Matrix). Ticket marked for escalation, system continues processing.

**Q: How do I test locally before Netlify?**  
A: Use `netlify dev` to run Functions locally. Dashboard can also run locally (`npm run dev`).

**Q: How realistic are the mock tickets?**  
A: Very. Based on real support patterns (payment issues, API errors, account access, feature requests, escalations). Your team will recognize patterns.

---

## 📚 Learning Path

1. **Understand the problem**: Read PRD-001 (5 min)
2. **Learn the design**: Read SPEC-001 sections on architecture + APIs (15 min)
3. **Understand the decisions**: Read ADR-001 (why event-driven) (5 min)
4. **See the plan**: Review SPRINT-PLAN.md (5 min)
5. **Start building**: Pick TASK-001 and begin (2+ hours)

---

## ⚡ BHIL Methodology

This project uses **BHIL (Barry Hurd Innovation Lab) AI-First Development Toolkit**:
- Specifications are the source of truth (not code)
- Quantified acceptance criteria (no vague goals)
- Agent questions reveal spec gaps (fix specs, not chat loops)
- Non-determinism is expected (probabilistic metrics, not exact match)

→ If you have a spec question, ask to clarify the docs, not just the code.

---

## 🎯 Next Action

**→ Start with TASK-001**: Backend Setup
- Open: `docs/tasks/TASK-001-backend-setup.md`
- Implement: Database schema, ticket CRUD API, event system
- Time: 2-3 hours
- Unblocks: Everything else

---

*"Specifications are the source of truth, not code." — BHIL*

---

**Questions?** Check the docs/ directory or review the relevant task file for detailed specs and acceptance criteria.
