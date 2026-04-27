# AWS Advanced Networking — Interactive Course

> Comprehensive, journey-based learning platform for AWS Advanced Networking (ANS-C01)

**Branch:** `aws-advanced-networking` (orphan — no shared history with `main`)  
**Linear Project:** [AWS Advanced Networking Course](https://linear.app/mondweep/project/aws-advanced-networking-course-82c5d59087e7)  
**Status:** Phase 0 — PRD & Architecture  
**Target:** September 30, 2026

---

## Learner Personas

| Persona | Path |
|---|---|
| 🎓 Student | Structured: Foundation → Core → Exam Prep |
| 🏫 Teacher | All modules + Facilitator view + Assessment banks |
| 🛠 Practitioner | Non-linear — deep dives + Reference architectures |

---

## Course Modules (61 hours · ANS-C01 Aligned)

| # | Module | Domain | Hours |
|---|---|---|---|
| M01 | VPC Deep Dive | Design | 6h |
| M02 | Hybrid Connectivity | Design | 8h |
| M03 | Transit & PrivateLink | Design | 5h |
| M04 | DNS & Route 53 | Operations | 5h |
| M05 | Load Balancing & CDN | Design | 6h |
| M06 | Network Security | Security | 7h |
| M07 | Monitoring & Troubleshooting | Operations | 5h |
| M08 | Network Automation | Automation | 6h |
| M09 | Multi-Account & Advanced Architecture | Design | 7h |
| M10 | BGP Deep Dive & Exam Mastery | Exam Prep | 6h |

---

## Tech Stack

- **Frontend:** Next.js 14 App Router · TypeScript · React 18
- **UI:** shadcn/ui · Tailwind CSS · Radix UI
- **Content:** MDX · next-mdx-remote · Contentlayer
- **Interactive Labs:** D3.js · React Flow · Custom simulators
- **Testing:** Jest · Testing Library · Playwright (London School TDD)
- **CI/CD:** GitHub Actions · Netlify

---

## Engineering Approach

- **DDD** — Four bounded contexts: Course, Learner, Progress, Assessment
- **TDD (London School)** — Outside-in: Playwright → Jest + mocks
- **ADR** — Architecture Decision Records in `/docs/adr/`

---

## Repository Structure

```
/src
  /app               ← Next.js App Router pages
  /components
    /ui              ← shadcn/ui primitives
    /course          ← Course domain UI
  /domains
    /course          ← Course bounded context
    /learner         ← Learner bounded context
    /progress        ← Progress bounded context
    /assessment      ← Assessment bounded context
/content
  /modules           ← MDX content (M01–M10)
/docs
  /adr               ← Architecture Decision Records
/tests
  /unit              ← Jest unit tests
  /e2e               ← Playwright E2E tests
```

---

## Phase Plan

| Phase | Name | Target |
|---|---|---|
| **0** | PRD, Architecture & ADRs | May 11, 2026 |
| **1** | Platform Foundation & Design System | Jun 8, 2026 |
| **2** | Course Content & Module Authoring | Jul 20, 2026 |
| **3** | Interactive Labs & Learning Paths | Aug 31, 2026 |
| **4** | QA, Accessibility & Production Launch | Sep 30, 2026 |

---

## Getting Started (Phase 1 onwards)

```bash
npm install
npm run dev        # Start dev server
npm run test       # Run Jest unit tests
npm run test:e2e   # Run Playwright E2E tests
npm run build      # Production build
```

---

*Tracked in Linear · MON-46 through MON-49*
