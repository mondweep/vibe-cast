---
id: TASK-002
title: Intake Agent Implementation
spec: SPEC-001
adrs: [ADR-001]
status: pending
depends_on: [TASK-001]
parallel: false
estimated_tokens: 2500
---

# TASK-002: Intake Agent Implementation

## Task Context & Purpose

Implement the Intake Agent that classifies incoming support tickets into categories (billing, technical, account, feature-request) and extracts priority levels. This is the first agent in the pipeline and enables all downstream routing.

## Session Start Instructions

1. Read SPEC-001 (Intake Agent section)
2. Review ADR-001 (orchestration pattern)
3. Study TASK-001 results (database is ready)
4. Review prompt guidelines (when available in docs/prompts/)

## Scope

### Files to Create
- `agents/intake-agent.ts` — Intake Agent implementation
- `docs/prompts/INTAKE-CLASSIFICATION/v1.0/system-prompt.md` — Agent system prompt
- `docs/prompts/INTAKE-CLASSIFICATION/v1.0/user-template.md` — Classification request template

### Files to Modify
- `lib/events.ts` — Add listener for "ticket.created" events
- `api/routes/tickets.ts` — Call intake agent on ticket creation
- `lib/types.ts` — Add types if needed (TicketClassification interface)

### Files Excluded
- Other agents
- Dashboard UI

## Implementation Steps

### Step 1: Create Classification Prompt
Create `docs/prompts/INTAKE-CLASSIFICATION/v1.0/system-prompt.md`:

**System Prompt Content**:
- Role: "You are a customer support triage specialist."
- Task: "Analyze the support ticket and classify it into one of 4 categories."
- Categories with examples:
  - **billing**: Payment issues, refunds, subscription problems, invoicing, pricing questions
  - **technical**: API errors, bugs, integrations, performance, server issues
  - **account**: Login/password, permissions, account settings, profile, team management
  - **feature-request**: Enhancement requests, new capabilities, roadmap feedback
- Priority levels:
  - **critical**: System down, data loss, security, urgent business impact
  - **high**: Significant feature broken, customer blocked, financial impact
  - **medium**: Workaround exists, moderate inconvenience
  - **low**: Nice-to-have, cosmetic, inquiry-only
- Output format: JSON with fields: `category`, `priority`, `reasoning`, `confidence` (0-1)
- Constraints: "Return valid JSON only. No markdown."

---

### Step 2: Create User Prompt Template
Create `docs/prompts/INTAKE-CLASSIFICATION/v1.0/user-template.md`:

Template content:
```
Customer: {customerName}
Email: {email}
Subject: {subject}
Description: {description}

Classify this ticket.
```

---

### Step 3: Implement Intake Agent Function
Create `agents/intake-agent.ts`:

```typescript
export async function classifyTicket(ticket: Ticket): Promise<TicketClassification> {
  // 1. Load system prompt from file
  // 2. Build user message from template
  // 3. Call Claude API
  // 4. Parse JSON response
  // 5. Return classification
  // 6. Handle errors per SPEC-001 error matrix
}
```

**Implementation Details**:
- Use Claude API (claude-3-5-sonnet or latest)
- Timeout: 15 seconds max
- Retry on timeout: 1 retry with simpler context
- Token tracking: Log tokens used
- Error handling:
  - LLM timeout → fallback to "general" category, "medium" priority
  - Invalid JSON → retry prompt with stricter formatting
  - Confidence < 0.5 → mark for escalation

---

### Step 4: Wire Up Event Flow
Modify `lib/events.ts`:
- Add listener for "ticket.created" event
- Call `classifyTicket()` on ticket
- Update ticket status to "classified"
- Emit "ticket.classified" event with classification data
- Log execution time and token cost

Modify `api/routes/tickets.ts`:
- On POST /api/tickets, emit "ticket.created" event (async, don't wait)

---

### Step 5: Add Token Tracking
Modify `agents/intake-agent.ts`:
- Track tokens used in API response
- Store in agent_logs with action="classified"
- Update cost_tracking table with monthly total

**Calculation**: tokens × price_per_1k_tokens

---

## Test Requirements

### Unit Tests (`tests/intake-agent.test.ts`)
- [ ] Billing ticket classified correctly (≥5 test cases)
- [ ] Technical ticket classified correctly (≥5 test cases)
- [ ] Account ticket classified correctly (≥5 test cases)
- [ ] Feature-request ticket classified correctly (≥5 test cases)
- [ ] Priority extraction: critical > high > medium > low
- [ ] Confidence score between 0-1
- [ ] Invalid JSON response triggers retry

### Integration Tests
- [ ] "ticket.created" event triggers classification
- [ ] Classification updates ticket status
- [ ] "ticket.classified" event emitted after classification
- [ ] agent_logs record created with token count
- [ ] cost_tracking incremented

### Manual Testing (`tests/intake-agent.manual.md`)
- [ ] Ingest 10 diverse tickets from mock-data/tickets.json
- [ ] Verify all 10 classified correctly (≥95% accuracy threshold)
- [ ] Check response time: avg < 5 sec (95th percentile)
- [ ] View agent_logs: all 10 tickets have log entries
- [ ] View cost_tracking: tokens tracked accurately

---

## Acceptance Criteria (Quantified)

✅ **Classification Accuracy ≥95%**
- Test with 30 mock tickets
- Verify category matches expectedCategory
- Measure: 28/30+ correct

✅ **Confidence Score**
- All classifications return confidence 0-1
- High-confidence (>0.8): 90%+ of tickets
- Low-confidence (<0.6): triggers escalation flag

✅ **Response Time ≤5 sec**
- Measure API latency from event emission to classification
- Target: 95th percentile ≤5 sec

✅ **Token Tracking**
- Every classification logs tokens used
- Cost calculation correct (tokens × model pricing)
- No missing logs

✅ **Error Handling**
- Timeout after 15s → fallback category assigned
- Invalid JSON → retry succeeds
- Invalid classification → logged and escalated

---

## Definition of Done

- [ ] System prompt created (docs/prompts/INTAKE-CLASSIFICATION/v1.0/system-prompt.md)
- [ ] User template created (docs/prompts/INTAKE-CLASSIFICATION/v1.0/user-template.md)
- [ ] Intake agent function implemented (agents/intake-agent.ts)
- [ ] Event listeners wired up (lib/events.ts)
- [ ] API endpoint triggers agent (api/routes/tickets.ts)
- [ ] Token tracking implemented + cost_tracking updated
- [ ] Unit tests pass (≥95% accuracy on 30 tickets)
- [ ] Integration tests pass (events flow correctly)
- [ ] Manual test: 10 sample tickets classified correctly
- [ ] Response time acceptable (<5 sec avg)
- [ ] All classification records logged in agent_logs

---

*Specifications are the source of truth, not code. — BHIL*
