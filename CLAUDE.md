# Project Sarathi — Pan-India Automotive Omnichannel CX Platform (vibe-cast)

> Working repository for designing an AI-first omnichannel customer-experience
> platform — "Project Sarathi" — for an automotive OEM operating across India.
>
> The canonical PRD is
> [`docs/prd/PRD-001-project-sarathi.md`](docs/prd/PRD-001-project-sarathi.md),
> provided by the Head of Customer Service as the source of truth for v1.0.

This branch is an **orphan branch** scaffolded with the
[BHIL AI-First Development Toolkit](https://github.com/camalus/BHIL-AI-First-Development-Toolkit)
methodology. It contains **specifications, not code**. Code is downstream of specs.

---

## Purpose

Design a unified platform that:

1. **Listens** to customer voice across owned (Facebook, Instagram, X, YouTube,
   brand website, app store reviews) and earned (Autotrader-India, CarWale,
   CarDekho, Team-BHI, Google reviews, news comments) channels.
2. **Understands** intent, sentiment, language, dialect, region, and severity
   using AI tuned for Indian languages and code-mixed text (Hinglish, Tanglish,
   Banglish, etc.).
3. **Routes** issues to the right service workflow with region-aware SLAs and
   tone, recognising that customer expectations differ sharply between, e.g.,
   tech-savvy metros in South India and value-sensitive markets in Bihar &
   Jharkhand.
4. **Responds** through a human-in-the-loop agent console with AI-drafted
   replies, vernacular templates, and closed-loop feedback to the eval suite.

---

## Repository structure (BHIL convention)

```
docs/prd/        # Product Requirements Documents  (PRD-NNN)
docs/spec/       # Technical Specifications        (SPEC-NNN)
docs/adr/        # Architecture Decision Records   (ADR-NNN)
docs/tasks/      # Task breakdowns                 (TASK-NNN)
docs/prompts/    # Versioned prompt registry
evals/           # Promptfoo configs + golden sets
OPTIONS.md       # High-level "way forward" options summary
```

Traceability rule: **PRD → SPEC → ADR → TASK**. Children always reference parents.

## BHIL conventions in force

- Specifications are the source of truth, not code.
- Agent questions reveal specification failures — fix the artifact, not the chat.
- Non-determinism is architectural reality — all acceptance criteria are
  probabilistic with explicit thresholds.
- Status lifecycle for every artifact: `draft → in-review → approved → complete`.
- No tasks created before parent SPEC is approved.
- Approved ADRs are immutable — supersede, never modify.
- Time allocation: 40% specs, 15% ADRs, 35% review, 10% implementation.

---

*"Specifications are the source of truth, not code." — BHIL*
