# Way Forward — Strategic Options

> Companion to `docs/prd/PRD-001-project-sarathi.md`.
> This document lists the macro options for *how* to deliver the PRD.
> It does **not** select one — that selection is captured later in
> `docs/adr/ADR-001-build-vs-buy-vs-hybrid.md` once the PRD is approved.

The problem space has four moving parts:

| Layer | What it does | Maturity in India |
|---|---|---|
| **Channel ingestion** | Pull comments/DMs/reviews from FB, IG, X, YouTube, Autotrader, CarWale, CarDekho, Team-BHP, Google reviews, Play Store, app store | High — multiple SaaS vendors |
| **Indic NLU** | Understand 12+ Indian languages incl. Hinglish/Tanglish code-mix; intent, sentiment, severity, vehicle/part entity extraction | Medium — improving fast with IndicBERT, AI4Bharat, Sarvam, Krutrim |
| **Service workflow** | Route to dealer/CRM, generate response drafts, track SLA, close loop | High — Salesforce, Zoho, Freshdesk, in-house DMS |
| **Region-aware response** | Tone, language, channel preference tuned to geography (e.g. metro South vs Tier-3 Bihar) | Low — usually built bespoke |

---

## Option A — Buy a unified suite (single vendor)

**What:** Adopt an enterprise social-CX suite (Sprinklr, Khoros, Salesforce
Service Cloud Social Studio, Zoho Social + Desk) and configure it.

- **Pros:** fastest time-to-value (3–6 months); vendor handles channel APIs,
  compliance, uptime; existing OEM reference customers in India.
- **Cons:** Indic NLU is generic — weak on Hinglish/Tanglish nuance; limited
  control over routing logic; per-seat + per-volume costs scale painfully at
  10M+ mentions/year; vendor lock-in.
- **Best when:** speed and risk-aversion outweigh differentiation.

## Option B — Build in-house end-to-end

**What:** Custom microservices for ingestion + fine-tuned Indic models on
AI4Bharat / IndicBERT / Sarvam-1 / Krutrim, custom agent console.

- **Pros:** full IP and data ownership; deepest regional/dialectal tuning;
  lowest unit economics at scale; differentiating capability.
- **Cons:** 12–18 month build; needs senior ML + platform talent; carry full
  channel-API maintenance burden as Meta/X change terms; eval/MLOps from
  scratch.
- **Best when:** the OEM treats customer-experience AI as a core competency.

## Option C — Hybrid: SaaS ingestion + custom Indic AI layer + agent console **(recommended starting hypothesis)**

**What:**
1. **Buy** social listening + ticketing plumbing (e.g. Sprinklr or Locobuzz
   for ingestion; Salesforce/Zoho/Freshdesk for case management).
2. **Build** the Indic NLU + region-aware routing + response-generation layer
   on top, using AI4Bharat / Sarvam / Krutrim with OEM-specific fine-tuning.
3. **Wrap** with a thin agent console that surfaces AI suggestions for
   human-in-the-loop approval, with feedback flowing back to the eval suite.

- **Pros:** 4–6 month MVP, defensible AI moat in the layer that matters,
  swap-out flexibility for any single vendor, focused build budget.
- **Cons:** integration tax; clear interface contracts (BHIL SPECs) become
  critical; needs internal ML team but smaller than Option B.
- **Best when:** the OEM wants differentiation *and* speed, and can invest in
  spec/eval discipline.

## Option D — Phased pilot before commitment

**What:** Pick one region (e.g., **South India metros**) and one channel set
(e.g., **Instagram + Autotrader-India**), run a 90-day pilot of Option C, then
decide build/buy ratio with real data.

- **Pros:** lowest-risk learning; surfaces real costs of Indic NLU accuracy,
  agent productivity gains, and SLA improvements before scaling.
- **Cons:** delays national rollout; pilot results in metros may not
  generalise to Tier-3/4 markets without a second pilot in, e.g., Bihar.
- **Best when:** stakeholders need evidence before approving a multi-crore
  programme.

---

## Recommended next move

Approve **PRD-001** (this PR introduces it) on the assumption that **Option C
+ Option D** will be evaluated as the lead candidate in **ADR-001**. The PRD
is written to be option-agnostic — success metrics, NFRs and out-of-scope
items hold regardless of which option wins.

---

*"Specifications are the source of truth, not code." — BHIL*
