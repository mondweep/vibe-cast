# AI Benefits Advisor - Requirements Analysis & User Stories

## 1. PRD Analysis - Technology-Neutral View

### 1.1 Core Problem Statement

**£10.5 billion** in benefits goes unclaimed by UK pensioners annually. Independent Age's helpline handled 27,107 interactions in 2024 (+23% YoY), identifying £5.7 million in unclaimed benefits. Demand regularly exceeds capacity.

### 1.2 The Four Exclusions (Barriers to Access)

| Exclusion | Description | System Requirement |
|-----------|-------------|-------------------|
| **Temporal** | Services close at 5:30pm; carers/vulnerable seniors need evening access | Async/extended hours capability |
| **Linguistic** | Non-English speakers (Urdu, Punjabi, Bengali) face barriers | Multilingual transcription & understanding |
| **Operational** | 30-40% of call time spent on data collection vs expert advice | Automated documentation |
| **Stigma** | Pride prevents claiming ("I don't want a handout") | Reframing language support |

### 1.3 Priority Benefits (MVP Scope)

| Benefit | Unclaimed | Primary Barrier |
|---------|-----------|-----------------|
| **Attendance Allowance** | £5.2bn | Lack of awareness (60% don't know they qualify) |
| **Pension Credit** | £2.5bn | Pride/stigma; assumption of ineligibility |

**Gateway Strategy:** Pension Credit unlocks Council Tax Reduction, free TV licence (75+), Winter Fuel Payment, NHS costs, Warm Home Discount. Single application can unlock £3,000-5,000+/year.

### 1.4 Functional Requirements (Technology-Agnostic)

#### Real-Time Call Support
- **Requirement:** Listen to advisor-client calls in real-time
- **Capability needed:** Speech-to-text with speaker diarization
- **Language support:** English, Urdu, Punjabi (Mirpuri), Bengali
- **Code-switching:** Handle mixed-language sentences
- **Options to evaluate:** Deepgram, AssemblyAI, Whisper, Azure Speech, Google Speech-to-Text

#### Real-Time Messaging & Events
- **Requirement:** Stream transcripts and AI prompts to advisor dashboard
- **Capability needed:** Low-latency bidirectional messaging
- **Options to evaluate:** PubNub, Ably, Pusher, Socket.io, WebSockets, Server-Sent Events

#### Contextual AI Prompts
- **Requirement:** AI suggests follow-up questions, flags missed opportunities
- **Capability needed:** LLM with RAG over benefits knowledge base
- **Options to evaluate:** Claude, GPT-4, Gemini, Llama (self-hosted), Mistral

#### Knowledge Base (RAG)
- **Requirement:** Semantic search over DWP guidance, GOV.UK content
- **Capability needed:** Vector database with fast retrieval
- **Options to evaluate:** Pinecone, Weaviate, Qdrant, Chroma, RuVector, pgvector

#### Benefit Calculations
- **Requirement:** Deterministic calculations (LLM must NOT do arithmetic)
- **Capability needed:** External calculator API or rules engine
- **Options to evaluate:** EntitledTo API, Turn2Us API, Policy in Practice, custom rules engine

#### CRM Integration
- **Requirement:** Case management, advisor workflows
- **Capability needed:** System of record with API access
- **Options to evaluate:** Salesforce, HubSpot, Microsoft Dynamics, custom build

#### Telephony
- **Requirement:** UK phone numbers, call handling
- **Capability needed:** SIP trunking, call recording
- **Options to evaluate:** Twilio, Vonage, Bandwidth, Telnyx, 8x8

#### Cloud Hosting
- **Requirement:** GDPR compliant (UK/EU data residency)
- **Capability needed:** UK-based data centers
- **Options to evaluate:** Azure UK, AWS London, GCP London, OVHcloud UK

---

## 2. User Stories for Initial Prototype

### 2.1 Epic: Real-Time Call Assistance

#### US-001: Live Call Transcription
**As an** Independent Age advisor
**I want** to see a live transcript of my call with a client
**So that** I can focus on the conversation rather than taking notes

**Acceptance Criteria:**
- Transcript appears within 500ms of speech
- Speaker labels distinguish advisor from client
- Transcript is scrollable and searchable
- Works with English calls initially

**Priority:** P0 (Must Have)

---

#### US-002: Benefit Opportunity Detection
**As an** advisor
**I want** the system to highlight when a client mentions something that indicates benefit eligibility
**So that** I don't miss potential entitlements

**Acceptance Criteria:**
- System detects keywords/phrases indicating care needs (e.g., "difficulty dressing", "can't use the bath")
- System detects income indicators (e.g., "only on State Pension", "about £180 a week")
- Highlighted phrases link to relevant benefit (AA, PC)
- Detection happens in real-time during call

**Example triggers from PRD:**
- "Getting dressed takes me ages now" → Attendance Allowance indicator
- "I'm only on my State Pension, about £180 a week" → Pension Credit indicator

**Priority:** P0 (Must Have)

---

#### US-003: Contextual Prompts for Advisors
**As an** advisor
**I want** to receive suggested follow-up questions based on the conversation
**So that** I can gather the right information efficiently

**Acceptance Criteria:**
- Prompts appear in a dedicated panel alongside transcript
- Each prompt shows reasoning (why this question matters)
- Prompts reference authoritative sources (DMG chapter, GOV.UK)
- Prompts are dismissible if not relevant

**Example from PRD:**
> "Client mentioned mobility issues—consider prompting for Attendance Allowance. Ask about day AND night care needs for higher rate assessment."

**Priority:** P0 (Must Have)

---

#### US-004: Confidence Indicators
**As an** advisor
**I want** to see how confident the AI is in its suggestions
**So that** I know when to trust automated guidance vs seek supervisor input

**Acceptance Criteria:**
- Each AI suggestion shows confidence level: HIGH / MEDIUM / LOW / UNSOURCED
- HIGH = Direct citation from DMG or GOV.UK found
- MEDIUM = Inferred from related guidance
- LOW = Based on general knowledge
- UNSOURCED = No authoritative source (flag for human review)

**Priority:** P1 (Should Have)

---

### 2.2 Epic: Safeguarding ("Red Cord" Protocol)

#### US-005: Crisis Detection
**As an** advisor
**I want** the system to alert me immediately if a client expresses crisis indicators
**So that** I can prioritize their safety over benefit advice

**Acceptance Criteria:**
- System detects severe deprivation language ("no heat", "no food", "can't afford medication")
- System detects self-harm indicators ("don't want to go on", "what's the point")
- Alert is prominent and cannot be missed
- Alert includes recommended immediate actions

**Priority:** P0 (Must Have - Safety Critical)

---

#### US-006: Financial Abuse Indicators
**As an** advisor
**I want** the system to flag potential financial abuse indicators
**So that** I can assess whether the client needs safeguarding support

**Acceptance Criteria:**
- System detects phrases like "my son handles my money", "someone else opened this account"
- System notes if third party appears to be controlling conversation
- Advisor can flag for SAFEGUARDING_REVIEW
- Option to offer private callback is suggested

**Priority:** P0 (Must Have - Safety Critical)

---

#### US-007: Cognitive Impairment Indicators
**As an** advisor
**I want** the system to note signs of cognitive impairment
**So that** I can adjust my approach and suggest involving a trusted person

**Acceptance Criteria:**
- System detects repetition, confusion, inconsistent timeline
- Gentle suggestion: "Would it be helpful to have a family member join us?"
- Notes are added to case for continuity

**Priority:** P1 (Should Have)

---

### 2.3 Epic: Documentation & Outputs

#### US-008: Auto-Generated Case Notes
**As an** advisor
**I want** structured case notes generated from the conversation
**So that** I can reduce post-call admin time

**Acceptance Criteria:**
- Notes capture: client name, DOB, region, income sources, savings bracket, health conditions, household status
- Notes list benefits discussed and likely eligibility
- Notes include next steps and required documents
- Advisor can review and edit before saving

**Priority:** P0 (Must Have)

---

#### US-009: Client Summary Letter
**As an** advisor
**I want** to generate a plain-English summary letter for the client
**So that** they have a clear record of what was discussed

**Acceptance Criteria:**
- Letter summarizes: benefits discussed, likely eligibility, next steps
- Lists required documents for applications
- Sets timeline expectations
- Uses accessible language (reading age ~12)
- Advisor reviews before sending

**Priority:** P1 (Should Have)

---

#### US-010: Pre-Filled Application Forms
**As an** advisor
**I want** application forms pre-populated with data from the conversation
**So that** clients can submit claims faster

**Acceptance Criteria:**
- Maps conversation data to official form fields
- Initial scope: Pension Credit (PC1), Attendance Allowance (AA1)
- Advisor reviews and validates all data before client submission
- Highlights any missing required fields

**Priority:** P1 (Should Have)

---

### 2.4 Epic: Stigma & Objection Handling

#### US-011: Stigma Reframing Suggestions
**As an** advisor
**I want** suggested language when a client expresses reluctance due to pride
**So that** I can help reframe benefits as entitlements

**Acceptance Criteria:**
- System detects stigma language ("don't want a handout", "never asked for help")
- Provides reframing suggestions based on Independent Age guidance
- Example: "It's not a handout—you've paid National Insurance your whole life. This is money set aside for contributors like you."

**Priority:** P1 (Should Have)

---

### 2.5 Epic: Multilingual Support

#### US-012: Code-Switching Detection
**As an** advisor working with British South Asian clients
**I want** the system to understand mixed Urdu/Punjabi/English speech
**So that** I can serve clients who naturally switch between languages

**Acceptance Criteria:**
- System handles sentences like: "Beta, I am worried. Mera gas bill bahut high hai"
- Provides translation/interpretation for advisor
- Detects emotional content across languages

**Example from PRD:**
> User (Urdu/English): "Beta, I am worried. Mera gas bill bahut high hai (My gas bill is very high)."
> AI Prompt: "Client is worried about high energy bills. Consider Warm Home Discount or Cold Weather Payments."

**Priority:** P2 (Could Have for MVP, important for pilot region)

---

### 2.6 Epic: Knowledge Base

#### US-013: Authoritative Source Retrieval
**As an** advisor
**I want** AI suggestions to cite authoritative sources
**So that** I can trust the guidance and reference it if needed

**Acceptance Criteria:**
- Citations include: DMG chapter/paragraph, GOV.UK page, benefit rate table
- Sources follow authority hierarchy:
  1. DWP Decision Makers' Guide (DMG)
  2. GOV.UK benefits content
  3. Independent Age Factsheets
  4. Calculator API results
- UNSOURCED flag if no authoritative source found

**Priority:** P0 (Must Have)

---

#### US-014: Current Benefit Rates
**As an** advisor
**I want** the system to use current benefit rates
**So that** I give clients accurate information

**Acceptance Criteria:**
- Rates updated annually (April) or when DWP announces changes
- Current rates displayed:
  - Pension Credit Guarantee: £218.15/week (single), £332.95/week (couple)
  - Attendance Allowance Lower: £72.65/week
  - Attendance Allowance Higher: £108.55/week
  - Severe Disability Addition: £81.50/week
- System flags if rates may be outdated

**Priority:** P0 (Must Have)

---

### 2.7 Epic: Guardrails & Safety

#### US-015: No Eligibility Guarantees
**As a** system administrator
**I want** the AI to never guarantee eligibility
**So that** we don't mislead clients (only DWP can determine eligibility)

**Acceptance Criteria:**
- AI uses language like "you may be eligible", "worth applying for"
- AI never says "you will definitely qualify" or similar
- System blocks/rewrites responses that contain guarantees

**Priority:** P0 (Must Have - Compliance)

---

#### US-016: No LLM Arithmetic
**As a** system administrator
**I want** benefit calculations performed by external API, not the LLM
**So that** financial figures are accurate

**Acceptance Criteria:**
- LLM extracts variables (income, savings, household)
- Calculator API performs all arithmetic
- LLM presents results but doesn't compute them
- Audit log shows API calls for any £ amounts cited

**Priority:** P0 (Must Have - Accuracy)

---

#### US-017: Human Review Required
**As a** supervisor
**I want** all AI-generated outputs reviewed by advisor before reaching client
**So that** we maintain human oversight

**Acceptance Criteria:**
- Case notes require advisor approval before saving
- Client letters require advisor approval before sending
- Pre-filled forms require advisor validation
- No autonomous submission of applications

**Priority:** P0 (Must Have - Compliance)

---

## 3. Prototype Scope Recommendation

### 3.1 Phase 0: Minimal Viable Prototype (4 weeks)

**Goal:** Demonstrate core value proposition with minimal infrastructure

**User Stories for Prototype:**
| ID | Story | Priority | Complexity |
|----|-------|----------|------------|
| US-001 | Live Call Transcription | P0 | Medium |
| US-002 | Benefit Opportunity Detection | P0 | Medium |
| US-003 | Contextual Prompts | P0 | Medium |
| US-005 | Crisis Detection | P0 | Low |
| US-006 | Financial Abuse Indicators | P0 | Low |
| US-008 | Auto-Generated Case Notes | P0 | Medium |
| US-013 | Authoritative Source Retrieval | P0 | Medium |
| US-015 | No Eligibility Guarantees | P0 | Low |

**Prototype Architecture (Simplified):**
```
┌─────────────────────────────────────────────────────┐
│              ADVISOR WEB DASHBOARD                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Transcript │  │   Prompts   │  │ Case Notes  │  │
│  │    Panel    │  │    Panel    │  │   Panel     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
┌─────────────────────┐  ┌─────────────────────┐
│   REAL-TIME LAYER   │  │    AI PROCESSING    │
│                     │  │                     │
│  Options:           │  │  - LLM for prompts  │
│  - PubNub           │  │  - RAG for sources  │
│  - Ably             │  │  - Safeguarding     │
│  - WebSockets       │  │    detection        │
└─────────────────────┘  └─────────────────────┘
              │                    │
              ▼                    ▼
┌─────────────────────┐  ┌─────────────────────┐
│  SPEECH-TO-TEXT     │  │  KNOWLEDGE BASE     │
│                     │  │                     │
│  Options:           │  │  - DWP DMG chapters │
│  - Deepgram         │  │  - GOV.UK content   │
│  - AssemblyAI       │  │  - Benefit rates    │
│  - Whisper          │  │  - IA factsheets    │
└─────────────────────┘  └─────────────────────┘
```

### 3.2 Prototype Demonstration Scenarios

Based on PRD Appendix A, the prototype should handle these scenarios:

1. **The Reluctant First-Timer (Margaret)**
   - Detect stigma language
   - Suggest reframing
   - Identify care needs → Attendance Allowance

2. **The Midnight Carer (Daniel)**
   - Efficient information gathering
   - Third-party caller handling
   - Cascade benefit identification (AA + PC + SDA)

3. **Safeguarding Trigger (Doris)**
   - Detect third-party control
   - Flag for supervisor review
   - Offer private callback suggestion

4. **Gateway Cascade (Jean)**
   - Identify income below threshold
   - Explain gateway benefits
   - Connect health mention to AA

### 3.3 Success Criteria for Prototype

| Metric | Target |
|--------|--------|
| Transcription latency | <1 second |
| Prompt generation | <3 seconds |
| Benefit detection accuracy | >80% recall on test scenarios |
| Safeguarding detection | 100% (zero false negatives) |
| Advisor feedback | "Useful" rating from 3+ test advisors |

---

## 4. Technology Evaluation Criteria

When selecting technologies, evaluate against:

### 4.1 Functional Requirements
- [ ] Meets capability needs
- [ ] Supports required languages (EN, UR, PA, BN)
- [ ] Adequate performance (latency targets)

### 4.2 Non-Functional Requirements
- [ ] GDPR compliant (UK/EU data residency)
- [ ] SOC 2 or equivalent security certification
- [ ] Availability SLA (99.9%+)
- [ ] Disaster recovery capability

### 4.3 Organizational Fit
- [ ] Nonprofit pricing available
- [ ] Existing charity partnerships (Microsoft, Salesforce)
- [ ] Integration with existing systems
- [ ] Long-term viability of vendor

### 4.4 Cost Considerations
- [ ] Per-unit pricing model
- [ ] Nonprofit discounts
- [ ] Total cost of ownership
- [ ] Scalability costs

---

## 5. Real-Time Messaging Evaluation

### PubNub Consideration

**Pros:**
- Purpose-built for real-time messaging
- Presence detection (know when advisors are online)
- Message history and persistence
- Global edge network for low latency
- Nonprofit program available
- Functions (serverless compute at edge)

**Cons:**
- Additional vendor to manage
- Per-message pricing at scale

**Use Cases for Benefits Advisor:**
- Stream transcript chunks to dashboard
- Push AI prompts to advisor in real-time
- Safeguarding alerts with guaranteed delivery
- Presence: show supervisor which advisors are on calls

### Alternative: WebSockets / SSE

**Pros:**
- No additional vendor
- Full control over implementation
- No per-message costs

**Cons:**
- Must build/maintain infrastructure
- Handle reconnection, scaling
- No built-in presence

### Recommendation for Prototype

For the **prototype**, use the simplest option that demonstrates value:
- **Server-Sent Events (SSE)** for transcript streaming (one-way, simple)
- **WebSocket** if bidirectional needed
- Evaluate **PubNub** for production if real-time requirements are complex

---

## 6. Next Steps

1. **Review user stories** with Independent Age stakeholders
2. **Prioritize** based on advisor feedback
3. **Select technologies** using evaluation criteria
4. **Build prototype** focusing on P0 stories
5. **Test with advisors** using PRD scenarios
6. **Iterate** based on feedback

---

*Document Version: 2.0*
*Created: January 2026*
*Approach: Technology-Neutral Requirements Analysis*
