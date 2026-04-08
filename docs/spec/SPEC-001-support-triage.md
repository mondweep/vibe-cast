---
id: SPEC-001
title: Customer Support Triage Agent System - Technical Specification
status: approved
parent_prd: PRD-001
adrs: [ADR-001, ADR-002, ADR-003]
sprint: Demo Sprint
---

# SPEC-001: Customer Support Triage System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Netlify Frontend (React)                   │
│  • Dashboard (ticket queue, agent status, cost tracking)     │
│  • Mock ticket submission form                               │
│  • Real-time updates (WebSocket/polling)                     │
└────────────────┬────────────────────────────────────────────┘
                 │ REST API
┌────────────────▼────────────────────────────────────────────┐
│              Netlify Functions (Backend)                      │
│  • Ticket API (create, update, list)                         │
│  • Agent orchestrator (routes tickets to agents)             │
│  • WebSocket server (live dashboard updates)                 │
└────────────────┬────────────────────────────────────────────┘
                 │ Claude API / Agent SDK
┌────────────────▼────────────────────────────────────────────┐
│            Multi-Agent System (Orchestration)                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │ Intake Agent │ │  Billing     │ │  Technical   │          │
│  │              │ │  Specialist  │ │  Specialist  │          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────────────────────┐           │
│  │ Account Mgr  │ │   Escalation Manager         │           │
│  └──────────────┘ └──────────────────────────────┘           │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Demo Database (Supabase or local)                │
│  • Tickets table (id, content, category, status, etc.)       │
│  • Agent logs (agent_id, action, timestamp, tokens_used)     │
│  • Cost tracking (per-agent token count, budget)             │
└─────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Intake Agent
**Purpose**: Classify incoming tickets and extract metadata  
**Scope**: Auto-categorize every ticket, set priority

```typescript
interface TicketInput {
  id: string;
  customerName: string;
  email: string;
  subject: string;
  description: string;
  timestamp: ISO8601;
}

interface TicketClassification {
  ticketId: string;
  category: "billing" | "technical" | "account" | "feature-request";
  priority: "critical" | "high" | "medium" | "low";
  reasoning: string;
  confidence: 0-1;
  nextAgent: AgentId;
}
```

**Process**:
1. Receive ticket via API
2. Pass to Claude with classification prompt
3. Parse response, extract category/priority/confidence
4. Store classification
5. Emit event for routing

**Error Handling**:
| Scenario | Detection | Recovery | Fallback |
|----------|-----------|----------|----------|
| LLM timeout | No response in 10s | Retry with smaller context | "general" category, "medium" priority |
| Invalid category response | Response not in enum | Force to "general" | "general" |
| Confidence too low (<0.5) | Confidence field < 0.5 | Flag for escalation | Escalate immediately |

---

### 2. Billing Specialist Agent
**Purpose**: Resolve billing, payment, and subscription issues  
**Scope**: Refunds, invoices, payment method updates, subscription changes

```typescript
interface BillingResolution {
  ticketId: string;
  resolution: string;
  actionsTaken: string[];
  customerImpact: "refund" | "credit" | "explanation" | "no-action";
  amount?: number;
  escalationRequired: boolean;
  escalationReason?: string;
}
```

**Agent Capabilities**:
- Access mock customer account data (balance, subscription tier, payment history)
- Authorize refunds up to $100 without escalation
- Provide accurate billing explanations
- Detect fraud flags (unusual patterns) → escalate

**Error Handling**:
| Scenario | Detection | Recovery | Fallback |
|----------|-----------|----------|----------|
| Can't find customer | No matching email in mock DB | Ask for account ID | Escalate |
| Refund > $100 | Amount exceeds threshold | Auto-escalate | Suggest credit instead |
| Ambiguous request | Multiple interpretations | Ask clarifying question | Escalate |

---

### 3. Technical Specialist Agent
**Purpose**: Resolve technical, integration, and feature-usage issues  
**Scope**: Bug reports, API errors, integration troubleshooting, feature questions

```typescript
interface TechnicalResolution {
  ticketId: string;
  diagnosis: string;
  steps: string[];
  resourceLinks: string[];
  isKnownIssue: boolean;
  escalationRequired: boolean;
  escalationReason?: string;
}
```

**Agent Capabilities**:
- Access mock documentation and API specs
- Diagnose from error codes/logs
- Provide step-by-step troubleshooting
- Identify known issues and workarounds
- Detect actual bugs → escalate

**Error Handling**:
| Scenario | Detection | Recovery | Fallback |
|----------|-----------|----------|----------|
| Unknown error code | Code not in docs | Search web docs (mock) | Escalate to engineering |
| User can't follow steps | Agent detects complexity | Offer video call option | Escalate |
| Reproducing issue fails | Can't isolate problem | Collect more info | Escalate |

---

### 4. Account Manager Agent
**Purpose**: Handle account-related issues (access, permissions, profile)  
**Scope**: Password resets, account security, permissions, profile updates

```typescript
interface AccountResolution {
  ticketId: string;
  actionTaken: string;
  accountUpdated: boolean;
  securityIssueDetected: boolean;
  escalationRequired: boolean;
}
```

**Agent Capabilities**:
- Verify account ownership (mock verification)
- Reset passwords and access
- Update account settings
- Detect security breaches → escalate

---

### 5. Escalation Manager Agent
**Purpose**: Validate escalation flags and coordinate human handoff  
**Scope**: Review escalation reasons, ensure justified, update status

```typescript
interface EscalationReview {
  ticketId: string;
  originalAgentId: string;
  escalationReason: string;
  isJustified: boolean;
  reviewedAt: ISO8601;
  humanNotificationSent: boolean;
  status: "pending-human" | "rejected-reassign";
}
```

**Process**:
1. Receive escalation flag from any agent
2. Review ticket and reason
3. Validate: Is this truly out-of-scope?
4. If yes: mark as "pending-human", emit event
5. If no: suggest reassignment or alternate resolution

---

## API Contracts (REST)

### POST /api/tickets
Create a new support ticket (mock ingestion)

```json
Request:
{
  "customerName": "Alice Johnson",
  "email": "alice@example.com",
  "subject": "Unable to process payment",
  "description": "My credit card was declined..."
}

Response (201):
{
  "id": "ticket-12345",
  "status": "new",
  "createdAt": "2026-04-08T14:22:00Z",
  "classification": null
}
```

### GET /api/tickets
List all tickets with status

```json
Response (200):
{
  "tickets": [
    {
      "id": "ticket-001",
      "status": "classified",
      "category": "billing",
      "priority": "high",
      "currentAgent": "billing-specialist-1",
      "createdAt": "2026-04-08T14:20:00Z",
      "updatedAt": "2026-04-08T14:22:15Z"
    }
  ],
  "total": 12,
  "pending": 3,
  "resolved": 8,
  "escalated": 1
}
```

### GET /api/tickets/:id
Get full ticket details with transcript

```json
Response (200):
{
  "id": "ticket-001",
  "customerName": "Alice Johnson",
  "email": "alice@example.com",
  "subject": "Unable to process payment",
  "description": "My credit card was declined...",
  "status": "resolved",
  "category": "billing",
  "priority": "high",
  "resolution": "Refund of $50 issued to account balance",
  "transcript": [
    {
      "agent": "intake-agent",
      "action": "classified",
      "timestamp": "2026-04-08T14:20:30Z",
      "output": { "category": "billing", "priority": "high" }
    },
    {
      "agent": "billing-specialist-1",
      "action": "resolved",
      "timestamp": "2026-04-08T14:21:15Z",
      "reasoning": "Customer was charged twice...",
      "tokens_used": 450
    }
  ]
}
```

### GET /api/agents/status
Real-time agent status for dashboard

```json
Response (200):
{
  "agents": [
    {
      "id": "intake-agent",
      "status": "processing",
      "currentTicketId": "ticket-005",
      "tokensUsed": 1250,
      "monthlyBudget": 100000,
      "percentBudgetUsed": 1.25,
      "avgResponseTimeMs": 2300
    }
  ],
  "timestamp": "2026-04-08T14:22:45Z"
}
```

---

## Data Models

### Ticket Entity
```sql
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,  -- billing, technical, account, feature-request
  priority TEXT,  -- critical, high, medium, low
  status TEXT,    -- new, classified, assigned, processing, resolved, escalated
  current_agent_id TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution TEXT
);
```

### Agent Log Entry
```sql
CREATE TABLE agent_logs (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  action TEXT,  -- classified, processing, resolved, escalated
  reasoning TEXT,
  tokens_used INTEGER,
  timestamp TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);
```

### Cost Tracking
```sql
CREATE TABLE cost_tracking (
  agent_id TEXT NOT NULL,
  month TEXT,  -- YYYY-MM
  tokens_used INTEGER,
  estimated_cost DECIMAL,
  budget_limit DECIMAL,
  PRIMARY KEY (agent_id, month)
);
```

---

## Pipeline / Flow Specification

```
1. TICKET INGESTION
   User submits ticket → Stored in DB → Status: "new"

2. INTAKE CLASSIFICATION
   Intake Agent processes → Extracts category, priority
   → Status: "classified"
   → Emit: "ticket.classified" event

3. AGENT ROUTING
   Router receives "ticket.classified" event
   → Map category to specialist agent
   → Assign ticket
   → Status: "assigned"
   → Emit: "ticket.assigned" event

4. AGENT PROCESSING (Parallel)
   Specialist agent receives ticket
   → Status: "processing"
   → Agent reasons about solution
   → If can resolve: Go to step 5
   → If escalation needed: Go to step 6

5. RESOLUTION
   Agent provides resolution
   → Status: "resolved"
   → Record transcript, tokens_used
   → Emit: "ticket.resolved" event

6. ESCALATION
   Agent flags as out-of-scope
   → Escalation Manager reviews
   → If justified:
      → Status: "pending-human"
      → Emit: "ticket.escalated" event
   → If not justified:
      → Reassign to different agent
      → Go to step 4

7. DASHBOARD UPDATE
   All status changes trigger WebSocket broadcast
   → Dashboard updates live
   → Cost tracking updated
   → Agent status refreshed
```

---

## Error Handling Matrix

| Failure Scenario | Detection | Recovery | Fallback |
|------------------|-----------|----------|----------|
| Agent timeout (>15s) | No response after 15s | Kill request, log timeout | Auto-escalate ticket |
| API/Network error | HTTP 5xx or timeout | Retry 3x with backoff (1s, 2s, 4s) | Return cached response or escalate |
| Invalid LLM response | Response fails validation | Log error, request retry with stricter prompt | Escalate immediately |
| Concurrent assignment | 2 agents claim same ticket | Database transaction handles (first-write-wins) | Second agent gets next ticket |
| Cost overrun | Agent tokens > budget | Block agent from processing more | Route remaining tickets elsewhere |

---

## Testing Strategy

### Unit Tests
- Ticket classification accuracy (prompt + parsing)
- Category routing logic
- Cost calculation
- Status transitions

### Integration Tests
- End-to-end ticket flow (new → classified → resolved)
- Multi-agent concurrent processing
- Escalation flow validation
- Database persistence

### Evaluation Suite
- **Golden test cases**: 50 diverse tickets (typical, edge cases, adversarial)
- **LLM-as-judge**: Evaluate agent reasoning against rubric
- **Acceptance criteria**: All metrics from PRD met

### Manual Testing
- Demo walkthrough: Ingest 50 tickets, observe all agents working
- Dashboard responsiveness (<500ms page load)
- Cost tracking accuracy
- Agent reasoning transparency

---

## Implementation Order (Phased)

**Phase 1 (Core Infrastructure)**
1. Set up Next.js + Netlify Functions backend
2. Create Supabase/local DB schema
3. Implement ticket CRUD API

**Phase 2 (Intake Agent)**
4. Build intake agent (classification prompt)
5. Implement ticket routing logic
6. Create WebSocket/polling for live updates

**Phase 3 (Specialist Agents)**
7. Build Billing Specialist agent
8. Build Technical Specialist agent
9. Build Account Manager agent

**Phase 4 (Orchestration & Escalation)**
10. Implement Escalation Manager
11. Connect all agents via event system
12. Cost tracking and budget enforcement

**Phase 5 (Dashboard & Polish)**
13. Build React dashboard UI
14. Implement real-time data binding
15. Create mock data generator
16. Testing & refinement

---

## Acceptance Criteria (Traced to PRD-001)

✅ **Intake Classification Accuracy ≥95%**
  - Test with 50 diverse tickets
  - Manual verification of classifications
  - Acceptance: ≥47/50 correct

✅ **First Agent Response Time ≤5 sec**
  - Measure latency from ticket creation to agent processing
  - Acceptance: 95th percentile ≤5s

✅ **Specialist Agent Relevance ≥90%**
  - Verify agent assignment matches ticket category
  - Acceptance: ≥45/50 correct assignments

✅ **Escalation Detection ≥85%**
  - Inject out-of-scope tickets, verify detection
  - Acceptance: ≥17/20 escalations triggered

✅ **Dashboard Update Latency ≤3 sec**
  - Measure time from DB update to WebSocket broadcast
  - Acceptance: 95th percentile ≤3s

✅ **Cost per Ticket < $0.05**
  - Calculate avg tokens × model pricing
  - Acceptance: avg cost ≤ $0.05

---

*Specifications are the source of truth, not code. — BHIL*
