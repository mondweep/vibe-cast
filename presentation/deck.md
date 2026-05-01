---
marp: true
theme: default
paginate: true
size: 16:9
title: EV Repair Network Navigator — Proposal
author: Mondweep Chakravorty
style: |
  :root {
    --brand-navy: #0B2545;
    --brand-accent: #1B4965;
    --brand-light: #F5F7FA;
    --brand-rule: #CBD5E1;
    --brand-text: #1F2937;
    --brand-muted: #475569;
  }
  section {
    font-family: -apple-system, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #FFFFFF;
    color: var(--brand-text);
    padding: 60px 72px;
    font-size: 26px;
    line-height: 1.45;
  }
  section.lead {
    background: var(--brand-navy);
    color: #FFFFFF;
    justify-content: center;
  }
  section.lead h1 {
    color: #FFFFFF;
    font-size: 56px;
    letter-spacing: -0.5px;
  }
  section.lead h2 {
    color: #C7D2DC;
    font-weight: 400;
    border: none;
    padding: 0;
    margin-top: 0.6em;
  }
  section.lead .meta {
    color: #9AAAB8;
    font-size: 22px;
    margin-top: 1.6em;
  }
  h1 {
    color: var(--brand-navy);
    font-size: 40px;
    letter-spacing: -0.3px;
    margin-bottom: 0.35em;
  }
  h2 {
    color: var(--brand-accent);
    font-size: 28px;
    border-bottom: 2px solid var(--brand-rule);
    padding-bottom: 6px;
    margin-bottom: 0.6em;
  }
  h3 { color: var(--brand-accent); font-size: 24px; }
  strong { color: var(--brand-navy); }
  ul, ol { margin: 0.2em 0 0 1.1em; }
  li { margin-bottom: 0.35em; }
  blockquote {
    border-left: 4px solid var(--brand-accent);
    color: var(--brand-muted);
    background: var(--brand-light);
    padding: 12px 18px;
    margin: 0.6em 0;
    font-style: normal;
  }
  table {
    border-collapse: collapse;
    font-size: 22px;
    width: 100%;
  }
  th, td {
    border: 1px solid var(--brand-rule);
    padding: 8px 12px;
    text-align: left;
    vertical-align: top;
  }
  th { background: var(--brand-light); color: var(--brand-navy); }
  code {
    background: var(--brand-light);
    color: var(--brand-navy);
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 0.92em;
  }
  footer, header { color: var(--brand-muted); font-size: 14px; }
  section::after {
    color: var(--brand-muted);
    font-size: 14px;
  }
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
  .label {
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-size: 14px;
    color: var(--brand-muted);
    margin-bottom: 6px;
  }
  .pill {
    display: inline-block;
    background: var(--brand-light);
    color: var(--brand-navy);
    border: 1px solid var(--brand-rule);
    border-radius: 999px;
    padding: 2px 12px;
    font-size: 18px;
    margin: 2px 4px 2px 0;
  }
footer: "Mondweep Chakravorty  ·  Proposal for Chief Technical Strategy Officer  ·  Confidential"
---

<!-- _class: lead -->
<!-- _paginate: false -->
<!-- _footer: "" -->

# EV Repair Network Navigator

## A proposal for the Chief Technical Strategy Officer role

<div class="meta">
Mondweep Chakravorty &nbsp;·&nbsp; May 2026<br>
Research, architecture, and phased delivery plan — for validation
</div>

---

# The Opportunity

The UK's most sophisticated vehicle repair network must remain the **gold standard** as the industry transitions to **EV and ADAS**.

That transition demands a technical leader who can:

- Keep the network ahead of vehicle technology, not behind it
- **Influence OEMs** on safe, efficient, scalable repair practices
- Define the **"how"** for training, capability building, and standardised processes nationwide
- Future-proof the network for full **EV and ADAS integration**

> The role is fundamentally about translating standards (BSI PAS 1025, ATA, OEM-specific) into operating reality across a physical, distributed, safety-critical estate.

---

# What this proposal is — and isn't

<div class="two-col">

<div>

<div class="label">What it is</div>

- A **research, architecture, and roadmap** document
- A **phased build plan** for an interview-ready prototype
- Evidence of **how I think** about the problem before writing code
- A basis for **agreeing direction** with you and the client

</div>

<div>

<div class="label">What it isn't (yet)</div>

- A working prototype
- Final UI or branded product
- A binding implementation contract

</div>

</div>

> **If we agree on the direction, the working prototype follows as the next step** — Phase 1 is scoped to be recruiter- and client-demoable in 2–3 weeks.

---

# What this proposal demonstrates about my fit

- **Domain literacy** — BSI PAS 1025, ATA accreditation, OEM ADAS calibration regimes, EV battery safety and HV-bay readiness are baked into the data model, not bolted on
- **Architectural judgement** — every stack choice has a written rationale (ADRs) the client can challenge
- **Strategic-to-execution coherence** — the same artifact shows the boardroom narrative *and* the schema that backs it
- **Nationwide thinking** — RLS, PostGIS, append-only audit trails, and lookup-driven extensibility are chosen for a distributed estate, not a single workshop
- **OEM-facing posture** — clean API surfaces, transparent compliance evidence, and an integration layer designed for partnership conversations

---

# Architectural decisions (with rationale)

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | React Native (Expo) | One codebase reaches field technicians (mobile) and back-office (web) without splitting the team |
| **Mapping** | MapLibre + OpenStreetMap | No commercial gating during prototyping; nationwide UK coverage; production-viable |
| **Backend & DB** | Supabase (Postgres) | Relational integrity for safety-critical audit records; built-in auth & realtime |
| **Serverless** | Supabase Edge Functions (TypeScript) | Co-located with data; low-latency for routing & compliance checks |
| **Documentation** | ADRs in Git | Decisions are reviewable, not folkloric |

> ADRs covered: Supabase/Postgres over MongoDB · MapLibre/OSM over commercial map APIs · Modular OEM-integration layer

---

# Data architecture — the auditability spine

- **Append-only compliance & calibration logs** — every BSI / ATA / OEM event is timestamped with evidence URL and auditor; defensible to regulators and OEMs
- **Row-Level Security (RLS)** — customer, technician, network admin, and OEM rep see distinct slices of the same database, enforced in Postgres, not hoped for in app code
- **PostGIS-indexed geo** — nearest-compliant-facility queries are O(log n); ready for nationwide load
- **Lookup-driven standards & OEMs** — adding a new OEM partner or a future BSI revision is a row insert, not a schema migration
- **Storage buckets** for compliance PDFs, calibration reports, and training content

---

# Phase 1 (proposed) — Recruiter- and client-demoable

**Scope: 2–3 weeks once direction is agreed**

- Supabase auth (email / magic link)
- **Interactive nationwide map** of certified repair centres (MapLibre + OSM)
- **Search & filter** by OEM approval, ADAS capability, BSI / ATA status
- **Scenario simulation** — low-range EV route → nearest compliant repair / calibration centre
- **"Demo Mode" dashboard** narrating the architecture and ADRs live
- Seeded with representative UK facilities and standards data

> **Success criterion for Phase 1:** a 10-minute walkthrough that lets the client *feel* the gold-standard network on a phone or laptop.

---

# Phase 2 (proposed) — Real-time & training capability

- **Real-time availability** and technician scheduling indicators (Supabase Realtime)
- **Nationwide training & capability module** — modular content delivery for technicians
- **Process standardisation workflows** aligned to industry policy
- **Notifications** for compliance expiry, calibration due dates, training renewals

> Phase 2 is where the platform stops being a map and starts being how the network *operates* day-to-day.

---

# Phase 3 (proposed) — OEM integration & gold-standard layer

- **Compliance engine**
  - BSI PAS 1025 tracking
  - ATA guideline adherence
  - OEM-specific ADAS calibration procedures
  - EV battery diagnostics & repair protocols
- **ADAS sensor calibration workflow** with full documentation chain
- **OEM integration layer** — API hooks and bi-directional data sync patterns
- **Technical roadmap visualisation** for the digital / EV transition
- **Network-wide compliance & capability reporting** dashboard

---

# How this maps to the CTSO mandate

| Client requirement | How the platform answers it |
|---|---|
| Keep the network the **gold standard** as tech evolves | Compliance engine + OEM integration layer (Phase 3) |
| **Influence OEMs** at scale | Clean APIs and transparent compliance evidence by design |
| Define the **"how"** for nationwide training & process | Training module + standardised workflow engine (Phase 2) |
| **Future-proof for EV & ADAS** | EV routing, battery diagnostics, ADAS calibration are first-class data citizens |

---

# Strategic conversations this unlocks

- **With OEMs** — "Here is the live evidence of our calibration capability, by site, by procedure, by date — let's agree the integration contract."
- **With BSI / ATA** — "Our audit trail is append-only and queryable; we can demonstrate PAS 1025 conformance on demand."
- **With the executive team** — "Here is the compliance and capability heatmap of the network; here is where we invest next."
- **With insurers and fleet operators** — "Here is the evidence base for routing claim work to the right site, first time."

---

# Proposed next step

1. **You validate the direction** of this proposal — architecture, phasing, positioning
2. **I build the Phase 1 prototype** — 2–3 weeks, working demo against real seed data
3. **We walk it through together** — recruiter interview / client conversation, with ADRs and live schema visible
4. Phases 2 and 3 follow as scoped, prioritised increments

> The asset stays version-controlled in the Git repository throughout — every commit, ADR, and schema change reviewable by you or the client at any point.

---

# About Mondweep Chakravorty

<div class="two-col">

<div>

**Candidate for Chief Technical Strategy Officer**

Technology strategist and architect focused on scalable digital platforms for safety-critical, regulated industries — bridging executive strategy with hands-on technical leadership.

</div>

<div>

<div class="label">Links</div>

**LinkedIn**
[linkedin.com/in/mondweepchakravorty](https://www.linkedin.com/in/mondweepchakravorty/)

**GitHub repository**
[github.com/mondweep/vibe-cast (branch: vehicle-repair-network)](https://github.com/mondweep/vibe-cast/tree/vehicle-repair-network)

</div>

</div>

> *This proposal, the PRD, and all subsequent prototype work are maintained on the `vehicle-repair-network` branch of the repository above.*
