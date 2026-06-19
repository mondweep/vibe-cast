# NE India Pulse 🧭

> **What is North East India thinking about today?**
> A near-real-time public-discourse sensor for the eight North East Indian states,
> built on open data from the [GDELT Project](https://www.gdeltproject.org/).

Part of the [Vibe Cast](../README.md) build-in-public lab. This branch is a
self-contained ("orphan") project: a GDELT-powered web app that surfaces the
**themes, emotional tone, trending entities and news-volume spikes** across
Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim and
Tripura — refreshed throughout the day.

---

## Why

GDELT monitors the world's news media in 100+ languages and updates every 15
minutes, scoring every article for themes, emotion (GCAM) and geography. That
makes it possible to ask, in near-real-time: *what is a specific region talking
and feeling about right now?* — without running our own scrapers or NLP. This
project focuses that lens on North East India.

> ⚠️ **What this is not:** GDELT measures the **news/media conversation**, not
> direct public opinion. "What NE India is thinking" is a proxy built from what
> the press (online, and to a degree vernacular) is reporting and how. Bias and
> caveats are documented in the PRD and research notes.

## How it's being built

This project is delivered by a **RuFlo (claude-flow) agent swarm** using a
disciplined engineering process:

| Discipline | Where |
|---|---|
| **Domain-Driven Design** PRD | [`docs/prd/`](docs/prd/) |
| **Architecture Decision Records** | [`docs/adr/`](docs/adr/) |
| **TDD — London School** (outside-in, mock-driven) | [`tests/`](tests/) + `tdd-london-swarm` agent |
| **Deep research** feeding the PRD | [`docs/research/`](docs/research/) |
| **Swarm + model-matching strategy** | [`docs/SWARM-STRATEGY.md`](docs/SWARM-STRATEGY.md) |
| **Phased plan** | [`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md) |

**Target platform:** Google Cloud Run, with GitHub Actions for CI/CD.

## Status

🟡 **Phase 0 — Discovery & PRD.** Swarm initialised, deep research underway,
PRD being authored. See [`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md) for the
roadmap and current phase.

## Repository layout

```
ne-india-pulse/
├── docs/
│   ├── research/   # Deep-research reports (GDELT capabilities, NE India data)
│   ├── prd/        # Product Requirements (Domain-Driven Design)
│   ├── adr/        # Architecture Decision Records
│   └── design/     # Domain model, context maps, API contracts
├── src/            # Application source (added in build phases)
├── tests/          # London-School TDD suites
├── .claude/        # RuFlo swarm agents, commands, skills
└── CLAUDE.md       # Swarm guidance & configuration
```

## Data & licensing

GDELT data is free under its [terms of use](https://www.gdeltproject.org/about.html#termsofuse).
Demographic baselines come from the Census of India / MoSPI (open data). All
external data sources and their licences are catalogued in the research notes.
