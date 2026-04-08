---
id: TASK-001
title: Backend Infrastructure & API Setup
spec: SPEC-001
adrs: [ADR-001]
status: pending
depends_on: []
parallel: false
estimated_tokens: 3000
---

# TASK-001: Backend Infrastructure & API Setup

## Task Context & Purpose

Establish the foundational backend infrastructure for the multi-agent support triage system. This includes the Next.js API routes, database schema, and base ticket CRUD operations. All other agent implementations depend on this.

## Session Start Instructions

1. Read SPEC-001 (Component Specifications section)
2. Review ADR-001 (Event-Driven Architecture)
3. Understand the ticket data model and API contracts from SPEC-001

## Scope

### Files to Create
- `api/routes/tickets.ts` — Ticket CRUD endpoints
- `lib/db.ts` — Database connection/initialization
- `lib/types.ts` — TypeScript interfaces
- `public/schema.sql` — Database schema (Supabase/PostgreSQL)

### Files to Modify
- None (greenfield for this task)

### Files Excluded
- Agent implementations (separate tasks)
- Dashboard UI (separate task)
- Prompt templates (separate task)

## Implementation Steps

### Step 1: Set Up Database Schema
Create `public/schema.sql` with tables for:
- `tickets` (id, customer_name, email, subject, description, category, priority, status, current_agent_id, created_at, updated_at, resolved_at, resolution)
- `agent_logs` (id, ticket_id, agent_id, action, reasoning, tokens_used, timestamp)
- `cost_tracking` (agent_id, month, tokens_used, estimated_cost, budget_limit)

**Acceptance**: Schema matches SPEC-001 Data Models section exactly

---

### Step 2: Create TypeScript Types
Create `lib/types.ts` with interfaces:
- `TicketInput` — Request body for creating tickets
- `TicketClassification` — Output from Intake Agent
- `Ticket` — Full ticket record from DB
- `AgentLog` — Agent action log entry
- `CostTracking` — Monthly cost tracking

**Acceptance**: All types compile without errors; used in subsequent steps

---

### Step 3: Database Connection Layer
Create `lib/db.ts` with:
- Database connection (Supabase client or local SQLite for demo)
- Transaction helpers (atomic ticket updates)
- Query builders for common operations

**Acceptance**: Can execute raw SQL and handle transactions safely

---

### Step 4: Implement Ticket CRUD Endpoints
Create `api/routes/tickets.ts`:

**POST /api/tickets**
- Body: `TicketInput`
- Response: Ticket with status="new"
- Side effects: Insert into DB, emit "ticket.created" event

**GET /api/tickets**
- Query params: `?status=classified&limit=10`
- Response: List of tickets matching filter
- Side effects: None

**GET /api/tickets/:id**
- Response: Full ticket with transcript (agent_logs joined)
- Side effects: None

**PATCH /api/tickets/:id**
- Body: Partial ticket update (category, priority, status, resolution, current_agent_id)
- Response: Updated ticket
- Side effects: Insert into agent_logs, broadcast WebSocket event
- Constraint: Use transaction to ensure atomic update + log

**Acceptance Criteria**:
- All 4 endpoints implemented
- POST returns 201 with ticket ID
- GET /tickets/:id includes full agent_logs array
- PATCH atomically updates ticket and logs action
- All responses match SPEC-001 API contract examples exactly

---

### Step 5: Event Emission Layer
Create `lib/events.ts` with:
- Event emitter (emit "ticket.created", "ticket.classified", "ticket.assigned", "ticket.resolved", "ticket.escalated")
- Event listeners registration
- WebSocket broadcast helpers

**Acceptance**: Can emit events from API endpoints; subscribers receive events

---

### Step 6: Seed Mock Data
Create `scripts/seed-db.ts`:
- Load mock tickets from `mock-data/tickets.json`
- Load mock customers from `mock-data/customers.json`
- Insert into DB (reset tables first)
- Log summary: "Inserted X tickets, Y customers"

**Acceptance**: Script runs without errors; DB contains 30 tickets + 10 customers

---

## Test Requirements

### Unit Tests (`tests/db.test.ts`)
- [ ] Database connection succeeds
- [ ] Ticket insert returns ID
- [ ] Ticket update is atomic (+ log created simultaneously)
- [ ] Transaction rollback on error

### Integration Tests (`tests/api.test.ts`)
- [ ] POST /api/tickets creates ticket, returns 201
- [ ] GET /api/tickets lists all tickets
- [ ] GET /api/tickets/:id returns full record with logs
- [ ] PATCH /api/tickets/:id updates status + creates log entry
- [ ] Invalid ticket ID returns 404

### Manual Testing
- [ ] Seed database with mock data
- [ ] View all tickets via GET /api/tickets
- [ ] View single ticket details including mock agent logs
- [ ] Verify ticket table has all 30 mock tickets

---

## Acceptance Criteria (Measurable)

✅ **Database Setup**
- Schema matches SPEC-001 exactly
- Tables can be created without errors
- Foreign key constraints enforced

✅ **CRUD Endpoints**
- POST returns 201 with ticket object
- GET /tickets returns array of tickets, sortable by status
- GET /tickets/:id returns ticket + full transcript
- PATCH updates atomically, creates log entry
- Invalid IDs return 404

✅ **Types & Compilation**
- All TypeScript files compile without errors
- No `any` types without comments justifying

✅ **Mock Data**
- 30 tickets seeded from mock-data/tickets.json
- 10 customers seeded from mock-data/customers.json
- All tickets have valid structure matching schema

✅ **Events**
- Events emitted on ticket creation/update
- Event listeners can subscribe
- WebSocket broadcast helper available (even if not fully implemented yet)

---

## Definition of Done

- [ ] Schema created (public/schema.sql)
- [ ] All TypeScript types in lib/types.ts
- [ ] Database layer (lib/db.ts) handles connections + transactions
- [ ] All 4 CRUD endpoints implemented (api/routes/tickets.ts)
- [ ] Event emission layer (lib/events.ts) with subscribers
- [ ] Seed script populates mock data
- [ ] Unit + integration tests pass
- [ ] Manual test: 30 tickets visible via API
- [ ] No TypeScript errors
- [ ] Code follows project conventions (error handling per SPEC-001)

---

*Specifications are the source of truth, not code. — BHIL*
