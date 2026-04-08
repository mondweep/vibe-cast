---
id: ADR-001
title: Multi-Agent Orchestration Pattern
status: approved
type: agent-orchestration
date: 2026-04-08
related_prds: [PRD-001]
related_specs: [SPEC-001]
---

# ADR-001: Multi-Agent Orchestration Pattern

## Context & Problem Statement

We need to coordinate 5 specialized agents (Intake, Billing, Technical, Account, Escalation) to process customer support tickets in parallel without duplication, deadlock, or loss of context.

**Challenges**:
- Multiple agents processing simultaneously → risk of concurrent access to same ticket
- Agents need ticket context but shouldn't modify each other's work
- Escalation must prevent "ping-pong" between agents
- Agent state must be visible for dashboard

## Decision Drivers

| Driver | Weight | Target |
|--------|--------|--------|
| **Throughput** | 9/10 | Process ≥50 tickets in 30 min demo |
| **Correctness** | 10/10 | No duplicate/lost tickets |
| **Observability** | 8/10 | Real-time agent status visible |
| **Simplicity** | 7/10 | Can be debugged/extended in 1-2 hours |
| **Cost** | 6/10 | Efficient token usage |

## Options Evaluated

### Option A: Event-Driven (Chosen)
**Architecture**: Ticket state machine + event bus + stateless agents

- Intake Agent emits `ticket.classified` → Router assigns to specialist
- Specialist emits `ticket.resolved` or `ticket.needs_escalation`
- Escalation Manager listens and updates status
- All state changes → WebSocket broadcast to dashboard

**Scores**:
- Throughput: ✅ 9/10 (parallel, non-blocking)
- Correctness: ✅ 10/10 (atomic ticket state transitions)
- Observability: ✅ 10/10 (every event captured)
- Simplicity: ✅ 8/10 (clear flow, easy to trace)
- Cost: ✅ 8/10 (agents don't wait for each other)

---

### Option B: Sequential Waterfall
**Architecture**: Ticket passes through each agent in series (Intake → Specialist → Escalation)

- Simpler code (linear flow)
- Easy to understand
- **Problem**: Throughput = ticket_time × 5, very slow

**Scores**:
- Throughput: ❌ 2/10 (sequential bottleneck)
- Correctness: ✅ 10/10 (zero concurrency issues)
- Simplicity: ✅ 9/10 (linear, predictable)
- Cost: ❌ 5/10 (agents idle waiting)

---

### Option C: Shared Agent Pool (Paperclip-style)
**Architecture**: Single agent pool, tickets dispatched by orchestrator

- Paperclip handles routing and state
- Minimal custom code
- **Problem**: Less visibility into individual agent reasoning, harder to customize

**Scores**:
- Throughput: ✅ 8/10 (Paperclip optimized)
- Correctness: ✅ 10/10 (battle-tested)
- Observability: ❌ 6/10 (Paperclip's logging, not ours)
- Simplicity: ❌ 5/10 (Paperclip learning curve)
- Cost: ✅ 9/10 (Paperclip efficient)

---

## Chosen Option: Event-Driven (Option A)

**Rationale**: Balances throughput (critical for demo), correctness (no lost tickets), and observability (dashboard visibility). Paperclip is excellent for production, but for a **visible demo**, custom orchestration gives us transparent agent reasoning.

## Acceptance Criteria

✅ System processes ≥50 tickets in 30 min (>1.5 tickets/sec sustained)  
✅ Zero tickets lost or duplicated across runs  
✅ Each agent's decisions logged with reasoning and token count  
✅ Dashboard updates every ticket status change within 3 sec  
✅ All 5 agents can process in parallel; time to resolution doesn't add linearly  

## Rejected Options

**Waterfall**: Too slow; would only process ~6-10 tickets in 30 min demo. Unacceptable.

**Paperclip-only**: Great for production, but demo loses visibility into our agent logic. Paperclip would handle routing perfectly, but our demo needs to showcase agent reasoning transparently.

## Consequences

**Positive**:
- Agents run in parallel → high throughput
- Every decision logged transparently → great for demos
- Event model scales; easy to add agents
- Clear state machine → easy to reason about

**Negative**:
- Custom code for orchestration (vs. using Paperclip)
- Event ordering must be correct (need atomic DB updates)
- WebSocket management adds complexity

## Review Triggers

- If dashboard updates lag beyond 3 sec: revisit WebSocket strategy
- If tickets are lost (correctness drops below 100%): revisit atomic transactions
- If cost/token usage spikes: profile and optimize prompts

---

*Specifications are the source of truth, not code. — BHIL*
