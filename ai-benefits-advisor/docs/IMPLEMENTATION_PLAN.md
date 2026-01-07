# AI Benefits Advisor - Implementation Plan

## Executive Summary

This document outlines a phased implementation plan for the AI Benefits Advisor, an advisor copilot that helps Independent Age staff assist UK pensioners in accessing £10.5 billion in unclaimed benefits.

**Development Approach:**
- **SPARC Methodology** - Structured development (Specification, Pseudocode, Architecture, Refinement, Completion)
- **Multi-Agent Architecture** - Specialized agents for transcription, benefits advice, safeguarding, documentation
- **Technology-Neutral** - Evaluate options based on requirements, not predetermined vendors

**See Also:** [USER_STORIES.md](USER_STORIES.md) for detailed user stories and technology evaluation criteria

---

## 1. Technology Mapping to PRD Requirements

### 1.1 SPARC Methodology Application

The SPARC framework (Specification, Pseudocode, Architecture, Refinement, Completion) will guide our development process:

| SPARC Phase | AI Benefits Advisor Application |
|-------------|--------------------------------|
| **Specification** | PRD v2.8 provides comprehensive specs; map to user stories |
| **Pseudocode** | Design conversation flows, safeguarding logic, benefit decision trees |
| **Architecture** | Multi-agent system design, data flows, security layers |
| **Refinement** | Shadow mode testing, advisor feedback loops, accuracy audits |
| **Completion** | Production deployment with monitoring and continuous improvement |

### 1.2 Claude-Flow for Agent Orchestration

Claude-Flow's multi-agent swarm architecture maps directly to the copilot's functional requirements:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLAUDE-FLOW ORCHESTRATOR                      │
│                      (Queen Agent - Coordinator)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ TRANSCRIPTION│  │  BENEFITS    │  │ SAFEGUARDING │           │
│  │    AGENT     │  │   ADVISOR    │  │    AGENT     │           │
│  │              │  │    AGENT     │  │              │           │
│  │ - Deepgram   │  │              │  │ - Red Cord   │           │
│  │ - Multilingual│ │ - Eligibility │ │ - Crisis     │           │
│  │ - Diarization│  │ - Prompts    │  │ - Escalation │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐           │
│  │ DOCUMENTATION│  │  CALCULATOR  │  │    FORM      │           │
│  │    AGENT     │  │    AGENT     │  │  PRE-FILL    │           │
│  │              │  │              │  │    AGENT     │           │
│  │ - Case notes │  │ - EntitledTo │  │              │           │
│  │ - Summaries  │  │ - Deterministic│ │ - PC/AA/HB  │           │
│  │ - Letters    │  │ - API calls  │  │ - Mapping    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Claude-Flow Features to Leverage:**
- **Hive-mind intelligence**: Queen agent coordinates specialized workers
- **Stream-JSON chaining**: Real-time agent-to-agent communication during calls
- **MCP Protocol**: Native integration with Claude Code for development
- **Fault tolerance**: Self-organizing agents handle failures gracefully

### 1.3 RuVector for Knowledge Base

RuVector provides the high-performance vector database needed for RAG over DWP guidance:

| RuVector Feature | Benefits Advisor Use Case |
|-----------------|--------------------------|
| **HNSW Indexing** | <0.5ms query latency for real-time call prompts |
| **96-164x faster** | Critical for live call support |
| **Self-learning** | Index improves with advisor feedback |
| **Cypher queries** | Complex benefit relationship queries |
| **SIMD operations** | Fast embedding similarity on UK benefits corpus |

**Knowledge Base Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    RUVECTOR CLUSTER                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Collection: dwp_guidance                                │
│  ├── DMG Vol 10 Ch 61 (Attendance Allowance)            │
│  ├── DMG Vol 13-14 (Pension Credit)                     │
│  ├── DMG Vol 1 (Decision Making)                        │
│  └── Medical Guidance A-Z                               │
│                                                          │
│  Collection: gov_uk_benefits                             │
│  ├── Attendance Allowance pages                         │
│  ├── Pension Credit pages                               │
│  ├── Carer's Allowance pages                            │
│  └── Benefit rate tables (2025/26)                      │
│                                                          │
│  Collection: independent_age                             │
│  ├── Factsheets                                         │
│  ├── Stigma reframing scripts                           │
│  └── Conversation templates                             │
│                                                          │
│  Collection: safeguarding                                │
│  ├── Red Cord triggers                                  │
│  ├── Crisis protocols                                   │
│  └── Escalation procedures                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 1.4 Agentic-Flow for Cost Optimization

Given the PRD's concern about cost overrun (~£0.15/min for voice AI), Agentic-Flow enables intelligent model switching:

| Task | Model | Rationale |
|------|-------|-----------|
| Real-time transcription | Deepgram Nova-2 | Specialized, cost-effective |
| Simple data extraction | Claude Haiku | Fast, low-cost for structured extraction |
| Complex reasoning | Claude Sonnet | Benefits eligibility logic |
| Safeguarding detection | Claude Sonnet | Critical accuracy required |
| Document generation | Claude Haiku | Template-based, predictable |
| Edge cases | Claude Opus | Complex benefit interactions |

**Cost Optimization Strategy:**
- Route 70% of tokens through Haiku for routine operations
- Reserve Sonnet for eligibility reasoning and safeguarding
- Escalate to Opus only for complex multi-benefit interactions
- Target: <£0.10/min effective cost (33% reduction from baseline)

---

## 2. System Architecture

### 2.1 High-Level Architecture (Technology-Neutral)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ADVISOR DASHBOARD                              │
│                         (Web Application)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Live Call   │  │  Reasoning  │  │   Case      │  │    KPI      │    │
│  │ Transcript  │  │   Panel     │  │   Notes     │  │  Dashboard  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY                                   │
│                     Authentication / Rate Limiting                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   TELEPHONY &     │   │     AGENT         │   │   KNOWLEDGE       │
│   REAL-TIME       │   │   ORCHESTRATOR    │   │     BASE          │
│                   │   │                   │   │                   │
│ Options:          │   │ - Agent Swarm     │   │ Options:          │
│ - Twilio/Vonage   │   │ - Workflow Engine │   │ - Pinecone        │
│ - Deepgram/       │   │ - Memory Layer    │   │ - Weaviate        │
│   AssemblyAI      │   │                   │   │ - RuVector        │
│ - PubNub/Ably/    │   │ Options:          │   │ - Qdrant          │
│   WebSockets      │   │ - Claude-Flow     │   │ - pgvector        │
│                   │   │ - Custom          │   │                   │
└───────────────────┘   └───────────────────┘   └───────────────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL INTEGRATIONS                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    CRM      │  │  Benefits   │  │     LLM     │  │   Form      │    │
│  │  (TBD)      │  │ Calculator  │  │   Provider  │  │  Templates  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Options to Evaluate

| Capability | Options | Evaluation Criteria |
|------------|---------|---------------------|
| **Telephony** | Twilio, Vonage, Bandwidth, Telnyx | UK numbers, nonprofit pricing, API quality |
| **Speech-to-Text** | Deepgram, AssemblyAI, Whisper, Azure Speech | Multilingual, UK accents, latency, cost |
| **Real-Time Messaging** | PubNub, Ably, Pusher, WebSockets, SSE | Latency, reliability, presence features |
| **LLM** | Claude, GPT-4, Gemini, Llama, Mistral | Accuracy, cost, UK data residency |
| **Vector DB** | Pinecone, Weaviate, RuVector, Qdrant, pgvector | Performance, cost, managed vs self-hosted |
| **Calculator API** | EntitledTo, Turn2Us, Policy in Practice | Coverage, accuracy, API availability |
| **CRM** | Salesforce, HubSpot, Dynamics, custom | Nonprofit pricing, existing usage |
| **Cloud** | Azure UK, AWS London, GCP London | GDPR, nonprofit credits, ecosystem |

### 2.2 Data Flow for Live Call

```
1. CALL INITIATED
   └─► Twilio receives call → Routes to Vapi.ai

2. REAL-TIME TRANSCRIPTION
   └─► Deepgram Nova-2 transcribes
       └─► Language detection (EN/UR/PA/BN)
       └─► Speaker diarization (Advisor vs Client)

3. CLAUDE-FLOW PROCESSING (per utterance)
   └─► Transcription Agent → streams text
       └─► Benefits Advisor Agent → analyzes for:
           ├─► Benefit eligibility signals
           ├─► Missing information gaps
           └─► Follow-up question suggestions
       └─► Safeguarding Agent → monitors for:
           ├─► Crisis indicators (URGENT_POVERTY)
           ├─► Self-harm language (URGENT_HARM)
           ├─► Financial abuse (SAFEGUARDING_REVIEW)
           └─► Cognitive impairment signs

4. RUVECTOR RETRIEVAL
   └─► Semantic search for relevant guidance
       └─► Source: DMG chapters, GOV.UK, IA factsheets
       └─► Returns with confidence level and citation

5. ADVISOR DASHBOARD UPDATE
   └─► Real-time prompt display
       └─► Reasoning panel with sources
       └─► Confidence indicator (HIGH/MEDIUM/LOW/UNSOURCED)

6. CALL COMPLETION
   └─► Documentation Agent generates:
       ├─► Structured case notes
       ├─► Client summary letter
       └─► Pre-filled form data (JSON)
   └─► Salesforce sync
```

---

## 3. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

#### Week 1: Infrastructure Setup
- [ ] Provision Azure UK South resources (GDPR compliance)
- [ ] Set up RuVector cluster with initial collections
- [ ] Configure Twilio UK phone numbers
- [ ] Initialize Claude-Flow project structure

#### Week 2: Knowledge Base Population
- [ ] Ingest DMG chapters into RuVector
- [ ] Ingest GOV.UK benefits content
- [ ] Create embedding pipeline for content refresh
- [ ] Implement source authority hierarchy

#### Week 3: Core Agent Development
- [ ] Implement Transcription Agent (Deepgram integration)
- [ ] Implement Benefits Advisor Agent (core prompts)
- [ ] Implement Safeguarding Agent (Red Cord protocol)
- [ ] Set up Agentic-Flow model routing

#### Week 4: Integration & Internal Testing
- [ ] Integrate agents via Claude-Flow orchestrator
- [ ] Build initial advisor dashboard (MVP)
- [ ] Internal QA with test scenarios
- [ ] Native Urdu/Punjabi speaker testing

**Phase 1 Deliverables:**
- Functional agent swarm processing test calls
- Knowledge base with 95%+ coverage of MVP benefits
- Basic advisor dashboard showing live transcription + prompts

### Phase 2: Shadow Mode (Weeks 5-8)

#### Week 5-6: Pilot Deployment
- [ ] Deploy to 3 pilot advisors
- [ ] 100% manual review of all AI outputs
- [ ] Daily accuracy audits
- [ ] Safeguarding false-negative testing

#### Week 7-8: Refinement
- [ ] Prompt engineering based on feedback
- [ ] Add Documentation Agent (case notes)
- [ ] Add Client Summary generation
- [ ] Expand stigma reframing library

**Phase 2 Deliverables:**
- 500 calls processed with human review
- Accuracy baseline established
- Advisor feedback incorporated
- Zero safeguarding false negatives

### Phase 3: Validated Operation (Weeks 9-16)

#### Weeks 9-12: Feature Completion
- [ ] Form Pre-Fill Agent (PC/AA forms)
- [ ] EntitledTo API integration (Calculator Agent)
- [ ] Full advisor dashboard with KPIs
- [ ] Salesforce CRM integration

#### Weeks 13-16: Scale Preparation
- [ ] Reduce manual review to 20% sampling
- [ ] Performance optimization (<500ms latency)
- [ ] Load testing (concurrent calls)
- [ ] Security audit and penetration testing

**Phase 3 Deliverables:**
- Complete MVP feature set
- 2,000 calls processed
- Form pre-fill for Pension Credit and Attendance Allowance
- KPI dashboard operational

### Phase 4: Scale (Months 4-6)

- [ ] Expand to full advisor team
- [ ] Add Housing Benefit guidance
- [ ] Add Council Tax Reduction (via partners)
- [ ] Evaluate consumer-facing WhatsApp pilot
- [ ] Target: 5,000+ calls

---

## 4. Agent Specifications

### 4.1 Transcription Agent

```yaml
name: transcription-agent
type: worker
tools:
  - deepgram-streaming
  - language-detection
  - speaker-diarization

inputs:
  - audio_stream: Twilio/Vapi audio

outputs:
  - transcript_chunk:
      text: string
      speaker: "advisor" | "client"
      language: "en" | "ur" | "pa" | "bn"
      confidence: float
      timestamp: datetime

model: deepgram-nova-2
latency_target: <300ms
```

### 4.2 Benefits Advisor Agent

```yaml
name: benefits-advisor-agent
type: worker
tools:
  - ruvector-search
  - entitledto-api

inputs:
  - transcript_chunk: from transcription-agent
  - conversation_context: accumulated state
  - client_profile: extracted data

outputs:
  - advisor_prompt:
      text: string
      type: "question" | "information" | "flag" | "reframe"
      source: string (DMG chapter, GOV.UK page)
      confidence: "HIGH" | "MEDIUM" | "LOW" | "UNSOURCED"
      reasoning: string
  - benefit_signals:
      - benefit: string
        likelihood: float
        missing_info: string[]

model: claude-sonnet (via agentic-flow)
fallback: claude-opus for complex interactions
```

### 4.3 Safeguarding Agent

```yaml
name: safeguarding-agent
type: worker
priority: CRITICAL
tools:
  - pattern-matcher
  - escalation-trigger

inputs:
  - transcript_chunk: from transcription-agent
  - conversation_context: full history

outputs:
  - safeguarding_alert:
      level: "NONE" | "MONITOR" | "ESCALATE" | "HARD_STOP"
      type: "URGENT_POVERTY" | "URGENT_HARM" | "SAFEGUARDING_REVIEW" | "COGNITIVE"
      trigger_phrase: string
      recommended_action: string
      supervisor_notify: boolean

triggers:
  severe_deprivation:
    - "no heat"
    - "no food"
    - "can't afford medication"
  self_harm:
    - "don't want to go on"
    - "what's the point"
    - "better off without me"
  financial_abuse:
    - "handles my money"
    - "someone else opened"
    - "won't let me"
  cognitive:
    - repetition_detected
    - timeline_inconsistency
    - confusion_indicators

model: claude-sonnet (never downgrade for safety)
```

### 4.4 Documentation Agent

```yaml
name: documentation-agent
type: worker
tools:
  - template-renderer
  - salesforce-api

inputs:
  - conversation_transcript: full call
  - extracted_data: client profile
  - benefit_signals: identified benefits

outputs:
  - case_notes:
      summary: string
      client_data: structured
      benefits_discussed: string[]
      next_steps: string[]
      safeguarding_flags: string[]
  - client_letter:
      format: "plain_english"
      language: "en" | translated
      benefits_explained: string[]
      documents_needed: string[]
      timeline: string
  - form_data:
      pension_credit: PC1_fields
      attendance_allowance: AA1_fields

model: claude-haiku (template-based)
```

---

## 5. RuVector Schema Design

### 5.1 Collections

```rust
// DWP Guidance Collection
Collection {
    name: "dwp_guidance",
    schema: {
        id: UUID,
        content: String,
        embedding: Vector<768>,
        source: {
            document: String,      // "DMG Vol 10 Ch 61"
            chapter: String,
            paragraph: String,
            url: String,
        },
        benefit: String[],         // ["attendance_allowance", "dla"]
        topics: String[],          // ["care_needs", "day_conditions"]
        last_updated: DateTime,
        version: String,
    },
    indexes: {
        hnsw: {
            m: 16,
            ef_construction: 200,
        }
    }
}

// Benefit Rates Collection (deterministic, not for RAG)
Collection {
    name: "benefit_rates",
    schema: {
        id: UUID,
        benefit: String,
        rate_name: String,
        amount_weekly: Decimal,
        amount_annual: Decimal,
        conditions: String[],
        effective_from: Date,
        effective_to: Date,
    }
}

// Safeguarding Patterns Collection
Collection {
    name: "safeguarding_patterns",
    schema: {
        id: UUID,
        pattern: String,
        pattern_type: String,
        severity: String,
        action: String,
        embedding: Vector<768>,
    }
}
```

### 5.2 Query Patterns

```cypher
// Find relevant guidance for benefit eligibility
MATCH (chunk:DWPGuidance)
WHERE chunk.benefit CONTAINS $benefit
  AND vector_similarity(chunk.embedding, $query_embedding) > 0.8
RETURN chunk.content, chunk.source
ORDER BY vector_similarity DESC
LIMIT 5

// Find related benefits (gateway pattern)
MATCH (b1:Benefit)-[:UNLOCKS]->(b2:Benefit)
WHERE b1.name = "pension_credit"
RETURN b2.name, b2.estimated_value

// Check safeguarding patterns
MATCH (p:SafeguardingPattern)
WHERE vector_similarity(p.embedding, $utterance_embedding) > 0.85
RETURN p.pattern_type, p.severity, p.action
```

---

## 6. Key Technical Decisions

### 6.1 LLM vs Deterministic Code Separation

**CRITICAL RULE**: The LLM must NEVER perform arithmetic.

| Operation | Handler | Rationale |
|-----------|---------|-----------|
| Conversation flow | LLM | Natural language understanding |
| Data extraction | LLM | Unstructured → structured |
| Eligibility reasoning | LLM + Rules | Complex conditions |
| Benefit calculations | EntitledTo API | Deterministic accuracy |
| Rate lookups | Database | No hallucination risk |
| Safeguarding detection | LLM + Patterns | Nuance + reliability |

### 6.2 Confidence Levels

```typescript
enum ConfidenceLevel {
  HIGH = "HIGH",       // Direct DMG/GOV.UK citation found
  MEDIUM = "MEDIUM",   // Inferred from related guidance
  LOW = "LOW",         // Based on general knowledge
  UNSOURCED = "UNSOURCED"  // No authoritative source - FLAG FOR REVIEW
}
```

### 6.3 Guardrails Implementation

```typescript
const ABSOLUTE_RED_LINES = [
  "NEVER guarantee eligibility",
  "NEVER perform benefit calculations",
  "NEVER submit applications without human review",
  "NEVER continue if safeguarding triggered",
  "NEVER provide Scottish/NI-specific advice"
];

// Enforced at orchestrator level, not just in prompts
```

---

## 7. Success Metrics

### 7.1 MVP KPIs (from PRD)

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Average call duration | 45-60 mins | 25-35 mins | Telephony logs |
| Time to submission | 6-12 weeks | 3-4 weeks | CRM tracking |
| Amount claimable | £5.7m | £25m | Case records |
| Application completion | 45% | 70% | CRM funnel |
| Advisor satisfaction | N/A | 4.7/5 | Survey |
| Safeguarding detection | Unknown | 100% | Audit |

### 7.2 Technical KPIs

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Transcription latency | <300ms | >500ms |
| Prompt generation latency | <500ms | >1000ms |
| RuVector query latency | <50ms | >100ms |
| System availability | 99.9% | <99.5% |
| Cost per call minute | <£0.10 | >£0.15 |

---

## 8. Risk Mitigations

| Risk | Mitigation | Technology |
|------|------------|------------|
| AI hallucination | RAG with source citations, confidence levels | RuVector + Claude-Flow |
| Cost overrun | Model routing via Agentic-Flow | Agentic-Flow |
| Latency spikes | Caching, pre-computed embeddings | RuVector HNSW |
| Translation errors | Native speaker QA, bilingual review | Human-in-loop |
| Safeguarding miss | Multi-pattern detection, low threshold | Safeguarding Agent |
| Knowledge staleness | Automated refresh pipeline | RuVector + monitoring |

---

## 9. Development Environment Setup

### 9.1 Prerequisites

```bash
# Install Claude-Flow
npm install -g @anthropic-ai/claude-code
npx claude-flow@alpha init --force

# Install RuVector
cargo install ruvector-cli
# or for Node.js
npm install ruvector

# Environment variables
export ANTHROPIC_API_KEY=xxx
export AZURE_OPENAI_KEY=xxx
export DEEPGRAM_API_KEY=xxx
export TWILIO_ACCOUNT_SID=xxx
export ENTITLEDTO_API_KEY=xxx
export SALESFORCE_CLIENT_ID=xxx
```

### 9.2 Project Structure

```
ai-benefits-advisor/
├── docs/
│   ├── AI_Benefits_Advisor_PRD_v2.8.pdf
│   └── IMPLEMENTATION_PLAN.md
├── src/
│   ├── agents/
│   │   ├── transcription/
│   │   ├── benefits-advisor/
│   │   ├── safeguarding/
│   │   ├── documentation/
│   │   └── calculator/
│   ├── orchestrator/
│   │   └── claude-flow-config.yaml
│   ├── knowledge-base/
│   │   ├── ingestion/
│   │   └── ruvector-schema/
│   ├── dashboard/
│   │   └── (React app)
│   └── integrations/
│       ├── twilio/
│       ├── salesforce/
│       └── entitledto/
├── tests/
│   ├── scenarios/
│   │   ├── stigma-barrier.test.ts
│   │   ├── midnight-carer.test.ts
│   │   ├── code-switcher.test.ts
│   │   └── safeguarding.test.ts
│   └── accuracy/
├── scripts/
│   └── knowledge-refresh/
└── infrastructure/
    └── terraform/
```

---

## 10. Next Steps

### Immediate Actions (Week 1)

1. **Commission DPIA** - Data Protection Impact Assessment required before any data processing
2. **Confirm insurance** - Professional indemnity must explicitly cover AI-assisted advice
3. **Engage technology partners** - Vapi.ai, Azure, EntitledTo API agreements
4. **Initialize repository** - Set up project structure per Section 9.2
5. **Provision Azure resources** - UK South region for GDPR compliance

### Technology Partner Applications

| Partner | Program | Action |
|---------|---------|--------|
| Microsoft | Nonprofit Program + Elevate | Register for Azure credits |
| Salesforce | Power of Us + AI for Impact | Apply to accelerator |

---

## Appendix: Technology References

### Sources

- **SPARC Methodology**: [GitHub - ruvnet/sparc](https://github.com/ruvnet/sparc)
- **Claude-Flow**: [GitHub - ruvnet/claude-flow](https://github.com/ruvnet/claude-flow)
- **Agentic-Flow**: [GitHub - ruvnet/agentic-flow](https://github.com/ruvnet/agentic-flow)
- **RuVector**: [GitHub - ruvnet/ruvector](https://github.com/ruvnet/ruvector)
- **SPARC 2.0**: [GitHub - agenticsorg/sparc2](https://github.com/agenticsorg/sparc2)

---

*Document Version: 1.0*
*Created: January 2026*
*Based on: AI Benefits Advisor PRD v2.8*
