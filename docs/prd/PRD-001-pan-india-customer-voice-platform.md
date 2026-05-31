---
id: PRD-001
title: Pan-India Multi-Channel Customer Voice & Service Platform
status: draft
author: Customer Service Leadership, [Automotive OEM]
date: 2026-05-31
sprint: S01
priority: P0
---

# PRD-001 — Pan-India Multi-Channel Customer Voice & Service Platform

## 1. Problem statement

> **The Head of Customer Service at [OEM] cannot deliver consistent, regionally
> appropriate, fast service to customers across India because customer voice is
> fragmented across owned social channels (Facebook, Instagram, X, YouTube,
> brand website, app store) and earned industry channels (Autotrader-India,
> CarWale, CarDekho, Team-BHP, Google reviews, news comments), each with
> different languages, dialects, code-mixing, severity signals, and customer
> expectations — and the current organisation has no unified way to listen,
> understand, prioritise, route, and respond.**

Concretely, the unmet needs include:

- **Geographic heterogeneity.** A complaint posted in English on Instagram by
  a customer in Bengaluru and a Hinglish/Bhojpuri comment on a dealer's
  Facebook page in Patna require different triage logic, response tone,
  language, and dealer routing.
- **Channel heterogeneity.** Industry forums (e.g. Team-BHP) carry
  long-form, technically detailed grievances that influence purchase decisions
  for thousands of lurkers; Instagram DMs are short, emoji-laden and urgent.
  A single funnel cannot work.
- **Volume.** Estimated 5–10M public mentions/comments/reviews per year across
  channels, plus 0.5–1M direct messages. Human-only triage is infeasible.
- **Language.** 12+ Indian languages in active use, with Hinglish, Tanglish,
  Banglish code-mixing on social. Off-the-shelf English-first sentiment models
  miss the most important nuance.

---

## 2. Goals (qualitative)

1. **One pane of glass** for customer voice across all listed channels.
2. **AI-assisted, human-approved** responses in the customer's language and
   register.
3. **Region-aware routing** to the correct dealer / regional service manager
   with the right SLA tier.
4. **Closed-loop learning** — every approved response, override, and outcome
   flows back to evaluation sets and prompt registries.
5. **Auditable & compliant** with DPDP Act (India, 2023), platform ToS, and
   internal data-residency policy.

---

## 3. User stories (EARS format)

EARS = Event-driven / State-driven / Unwanted-behaviour / Optional-feature.

### 3.1 Event-driven

- **EARS-E-01.** *When* a new public comment, review, or DM is posted on any
  monitored channel, *the system shall* ingest it, classify language and
  intent, score sentiment and severity, and surface it in the agent console
  **within 60 seconds (P95)**.
- **EARS-E-02.** *When* a comment is classified as `severity ≥ HIGH` (e.g.
  safety, accident, fire, regulatory keywords), *the system shall* page the
  on-call regional service manager via SMS + Slack **within 90 seconds**.
- **EARS-E-03.** *When* an agent approves an AI-drafted response, *the system
  shall* post it to the originating channel within 5 seconds and log the
  interaction to the CRM case record.

### 3.2 State-driven

- **EARS-S-01.** *While* a case is open and the customer is in a Tier-3/4
  town in Bihar or Jharkhand, *the system shall* default the response
  language to Hindi (Devanagari script) and the channel to WhatsApp Business
  unless the customer originated on a different channel.
- **EARS-S-02.** *While* a case is open and the customer's profile or
  inferred geography is South India metro (Bengaluru, Chennai, Hyderabad),
  *the system shall* default to English with optional Tamil/Telugu/Kannada
  fallback and offer self-service deep links (app, chatbot, booking) before
  human escalation.
- **EARS-S-03.** *While* an SLA timer is within 20% of breach, *the system
  shall* visibly flag the case red in the agent console and notify the
  agent's team lead.

### 3.3 Unwanted-behaviour

- **EARS-U-01.** *If* the AI's draft response confidence score is **< 0.70**
  on the LLM-as-judge rubric, *then* the system shall **not** auto-suggest
  it as primary and shall require the agent to compose from scratch or pick
  a vernacular template.
- **EARS-U-02.** *If* an inbound message contains personally identifiable
  information (Aadhaar, PAN, full vehicle VIN, phone, address), *then* the
  system shall redact PII from the AI prompt context and store the raw
  message in the encrypted PII vault only.
- **EARS-U-03.** *If* a channel API returns rate-limit or auth errors for
  **> 5 minutes**, *then* the system shall raise a P1 alert and switch the
  affected channel to a degraded "monitor-only" mode without dropping
  events.

### 3.4 Optional features

- **EARS-O-01.** *Where* configured per region, *the system may* auto-respond
  to clearly informational queries (showroom hours, service-centre address,
  brochure links) with a templated reply that has confidence ≥ 0.90, with
  the agent notified post-hoc for audit.

---

## 4. Success metrics (quantified)

All targets measured at 90 days post-launch unless stated.

### 4.1 Customer-outcome metrics

| Metric | Baseline (today) | Target | Measurement |
|---|---|---|---|
| First response time (P50) across channels | ~6 h | **≤ 15 min** | Channel timestamp Δ vs response post |
| First response time (P95) | ~24 h | **≤ 60 min** | Same |
| Case resolution time (P50) | ~72 h | **≤ 24 h** | Case open → closed |
| CSAT post-resolution survey | not measured | **≥ 4.2 / 5.0** | Post-case 2-question survey |
| Public-channel negative-sentiment escalation to media | n/a | **≤ 2 / quarter** | Manual incident log |
| Regional CSAT parity (max metro vs Tier-3/4 town gap) | unknown | **≤ 0.5 / 5.0** | CSAT by pincode bucket |

### 4.2 Operational metrics

| Metric | Target |
|---|---|
| Mentions ingested per day | ≥ 30,000 sustained, 100,000 burst |
| Agent productivity (cases handled / agent / day) | **+40%** vs baseline |
| % AI-drafted responses approved as-is by agent | **≥ 55%** |
| % AI-drafted responses approved with minor edit (< 20 char Δ) | **≥ 25%** |
| Channel coverage | 100% of channels listed in §1 within 6 months |

### 4.3 AI quality metrics (probabilistic acceptance)

Evaluated on a frozen golden set of 1,000 examples per language, refreshed
quarterly. LLM-as-judge with human spot-audit of 10% of judgments.

| Capability | Metric | Threshold |
|---|---|---|
| Language identification | F1 across 12 Indic languages + English + code-mix | **≥ 0.93** |
| Intent classification (12 intents: complaint, query, praise, accident, service-booking, …) | macro-F1 | **≥ 0.85** |
| Sentiment (5-class) | macro-F1 | **≥ 0.80** |
| Severity scoring (LOW/MED/HIGH/CRITICAL) | recall on CRITICAL | **≥ 0.97** |
| Response faithfulness (no hallucinated facts about vehicle, warranty, policy) | LLM-judge rubric 1–5 | mean **≥ 4.3**, P10 ≥ 3.5 |
| Response tone-fit to region | LLM-judge rubric 1–5 | mean **≥ 4.0** |
| Toxicity / brand-safety violations in drafts | rate | **≤ 0.1%** |
| PII leakage from prompt context to logs | rate | **0 incidents** (hard gate) |

---

## 5. Non-functional requirements

| NFR | Target |
|---|---|
| Availability (agent console + ingestion) | **99.9%** monthly |
| End-to-end ingestion-to-console latency (P95) | **≤ 60 s** |
| Data residency | All Indian customer PII stored in **India region** only |
| Compliance | DPDP Act 2023, Meta/X/Google platform ToS, ISO 27001 controls |
| Auditability | 7-year retention of agent actions, AI drafts, model + prompt versions |
| Cost ceiling | ≤ **₹X per handled case** (X to be set in ADR-002 after vendor RFP) |
| Accessibility of agent console | WCAG 2.1 AA |
| Disaster recovery | RPO ≤ 15 min, RTO ≤ 4 h |

---

## 6. Out of scope (with rationale)

| Item | Rationale |
|---|---|
| Voice-call (IVR / call-centre) deflection | Existing CCaaS investment; integrate later as PRD-002 |
| Outbound marketing / lead-gen campaigns | Owned by Marketing, separate roadmap |
| Dealer DMS replacement | DMS stays; we integrate read/write APIs only |
| Vehicle telematics / IoT alerts | Different data plane; future PRD |
| Warranty claim adjudication logic | Owned by Service Operations policy team |
| Real-time translation of agent voice calls | Out — channel scope is text/social only |

---

## 7. Constraints

- Regulatory: DPDP Act 2023 (India) and TRAI commercial-comms rules apply.
- Platform: Meta / X / Google API ToS impose rate limits and data retention
  caps; must be respected even if it slows ingestion.
- Linguistic: Robust support required for **Hindi, English, Tamil, Telugu,
  Kannada, Malayalam, Marathi, Gujarati, Bengali, Punjabi, Odia, Assamese**,
  plus code-mixed Hinglish / Tanglish / Banglish.
- Organisational: rollout must not require dealer staff to abandon current
  DMS; the platform plugs in via APIs.
- Talent: assume access to ≤ 6 ML engineers + ≤ 10 platform engineers in
  the first year; designs that need a 50-person ML team are out.

## 8. Assumptions

- Channel APIs (Meta Graph, X Enterprise, Google Business Profile, app-store
  scraping partners, Autotrader/CarWale/CarDekho partner feeds) remain
  commercially accessible.
- The OEM has or can procure a CRM/case-management system (Salesforce, Zoho,
  Freshdesk, or in-house) with open APIs.
- Indic foundation models (AI4Bharat IndicBERT/IndicTrans2, Sarvam-1,
  Krutrim, or hosted Claude/Gemini with multilingual capability) are
  sufficient for the §4.3 thresholds with OEM-specific fine-tuning.
- Agents are willing to work in a single console; change-management plan
  exists.

---

## 9. Dependencies & risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Indic NLU accuracy below threshold for low-resource languages (Assamese, Odia) | M | H | Phase rollout; start with top-6 languages; collect labelled data in pilot |
| Channel API ToS change (Meta/X) blocks ingestion | M | H | Multi-vendor abstraction; SaaS ingestion layer (see Option C in OPTIONS.md) |
| Dealer adoption resistance | H | M | Region-by-region pilot; dealer-incentive alignment |
| PII leakage incident | L | Critical | PII redaction before LLM context; encrypted vault; quarterly red-team eval |
| Hallucinated warranty/policy answers cause legal exposure | M | H | Retrieval-grounded responses only for policy questions; human approval gate < 0.70 confidence |
| Cost overrun on LLM inference | M | M | Tiered model routing (small model for triage, large only for response drafting); cache; ADR-002 cost ceiling |

---

## 10. Open questions (resolve before approval)

1. Which CRM / case-management system is canonical — existing, or new?
2. Which Indic foundation model family is preferred for fine-tuning
   (AI4Bharat, Sarvam, Krutrim, or hosted frontier)? → resolve in ADR-002.
3. Build vs buy vs hybrid for ingestion layer? → resolve in ADR-001.
4. Pilot geography — South India metros, or one metro + one Tier-3 town in
   parallel for representativeness?
5. Budget envelope and per-case cost ceiling.
6. Auto-response policy: which intents qualify, in which regions, at what
   confidence threshold?

---

## 11. Downstream artifacts to be created on approval

- **OPTIONS.md** — already drafted, summarises macro build/buy/hybrid options.
- **ADR-001** — Build vs Buy vs Hybrid for ingestion + case management.
- **ADR-002** — Indic LLM / model-selection decision with benchmarks and
  per-case cost target.
- **ADR-003** — Agent orchestration pattern (single-agent vs pipeline vs
  multi-agent with router → classifier → drafter → critic).
- **SPEC-001** — Technical specification realising this PRD (component
  diagram, interfaces, error matrix, phased implementation order).
- **TASK-001..NNN** — sprint-scoped tasks broken out from SPEC-001.

---

## 12. Quality gate — approval checklist

Required for status → `in-review`:

- [ ] Problem statement validated with 3+ regional service managers (incl.
      at least one from Bihar/Jharkhand and one from South India).
- [ ] Success metrics signed off by Head of Customer Service and CFO office.
- [ ] Legal & DPO sign-off on §5 (NFRs) and §7 (constraints).
- [ ] Out-of-scope items confirmed with owning teams (Marketing, CCaaS,
      Service Operations).
- [ ] Open questions §10 have named owners and target dates.
- [ ] Risk register §9 reviewed by CISO and CRO.

Required for status → `approved`:

- [ ] All §10 open questions resolved or explicitly deferred to a child ADR.
- [ ] OPTIONS.md reviewed and one option carried into ADR-001.
- [ ] Budget envelope confirmed.

---

*"Specifications are the source of truth, not code." — BHIL*
