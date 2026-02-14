# Product Requirements Document (PRD)
# Practical LLMs & Agentic AI — Guest Lecture for University of Greenwich

**Version**: 1.0
**Date**: 2026-02-14
**Author**: Mondweep Chakravorty
**Status**: Draft

---

## 1. Executive Summary

This PRD defines the requirements for a guest lecture on "Practical LLMs and Agentic AI" for the University of Greenwich's MSc Data Analytics & Management programme. The lecture will bridge theoretical knowledge (ML basics, prediction, agency) with real-world implementations, practical applications, and governance considerations — without requiring hands-on coding.

The deliverable is a 90-120 minute lecture with live demonstrations, structured discussion, and take-away resources that equip ~200 postgraduate students to critically evaluate and propose agentic AI applications in business contexts.

---

## 2. Problem Statement

### The Gap
Students on the MSc Data Analytics & Management programme have covered machine learning basics, prediction models, and the theoretical concept of agency. However, there is a disconnect between:

- **Theoretical understanding** of agency and autonomous systems
- **Practical reality** of how agentic AI is being deployed in production business environments today
- **Governance awareness** of the risks, guardrails, and responsible practices needed for real-world deployment

### Why It Matters
- Agentic AI is the fastest-evolving area in enterprise technology (2025-2026)
- Data analytics graduates will be expected to evaluate, govern, and propose AI agent systems
- Without practical grounding, graduates risk either over-hyping or under-utilizing agentic AI capabilities
- Organizations adopting agentic AI early are widening their competitive advantage

---

## 3. Target Audience

| Attribute | Detail |
|-----------|--------|
| Programme | MSc Data Analytics & Management |
| Institution | University of Greenwich, Business School, London |
| Cohort Size | ~200 students |
| Background Split | 67% Business, 15% Computer Science, 18% Statistics/Mathematics |
| Prior Knowledge | ML basics, basic prediction, theoretical concept of agency |
| Tool Access | Microsoft Copilot (institutional license) |
| Coding Level | No hands-on coding permitted in session |

### Audience Personas

**Persona 1: Business Analyst (67%)**
- Strong on process, strategy, and organizational impact
- Needs: Business cases, ROI evidence, governance frameworks
- Risk: Losing engagement if content becomes too technical

**Persona 2: CS Graduate (15%)**
- Comfortable with technical architecture and systems thinking
- Needs: Architectural depth, implementation patterns
- Risk: Disengaging if content is too surface-level

**Persona 3: Stats/Maths Graduate (18%)**
- Data-driven, comfortable with metrics and models
- Needs: Measurable outcomes, evaluation frameworks, analytical rigor
- Risk: Skepticism without quantitative evidence

---

## 4. Goals & Success Criteria

### Primary Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | Bridge theory to practice | Students can describe 3+ real-world agentic AI applications |
| G2 | Build governance awareness | Students can identify 3+ governance mechanisms for agentic systems |
| G3 | Demonstrate business value | Students can articulate the ROI case for agentic AI in a business context |
| G4 | Inspire practical exploration | Students express interest in exploring agentic AI tools (post-session survey) |

### Secondary Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G5 | Establish university partnership | Positive feedback leads to recurring lecture invitation |
| G6 | Connect Copilot to agentic concepts | Students can position their licensed tool within the agent spectrum |
| G7 | Cross-industry awareness | Students can identify agentic AI applications across 3+ industries |

---

## 5. Requirements

### 5.1 Content Requirements

#### R1: Conceptual Foundation (Must Have)
- **R1.1**: Define the spectrum from ML models to multi-agent swarms
- **R1.2**: Introduce the PACT framework (Proactive, Autonomous, Collaborative, Targeted) as a classification system
- **R1.3**: Explain the architecture of agent systems without requiring code literacy (perception, reasoning, action, memory, coordination)
- **R1.4**: Position Microsoft Copilot within the agent spectrum as the audience's entry point

#### R2: Real-World Implementations (Must Have)
- **R2.1**: Demonstrate at least 3 live/recorded agent system demonstrations
- **R2.2**: Include cross-industry examples (technology, automotive, healthcare, education, security)
- **R2.3**: Provide quantitative metrics for each demonstration (speed, cost, quality improvements)
- **R2.4**: Show agent collaboration patterns (specialization, coordination, learning)

#### R3: Governance & Responsible AI (Must Have)
- **R3.1**: Present the MAESTRO framework (7 security layers for agentic AI)
- **R3.2**: Demonstrate quality gates as governance mechanisms (7 gates from Forge)
- **R3.3**: Explain confidence-tiered autonomy (graduated trust based on evidence)
- **R3.4**: Cover cost governance through intelligent model routing (TinyDancer)
- **R3.5**: Present honest limitations of current agentic AI systems
- **R3.6**: Discuss human-in-the-loop as a design principle, not a limitation

#### R4: Business Case Evidence (Must Have)
- **R4.1**: Security audit ROI: 96% faster, 90% cheaper, 16:1 3-year ROI
- **R4.2**: Development speed: 2.8-4.4x faster task completion
- **R4.3**: Cost optimization: 75% token reduction via model routing
- **R4.4**: Quality metrics: 85-95% coverage, F1 > 0.8 defect prediction

#### R5: Interactive Elements (Should Have)
- **R5.1**: Structured discussion prompts for audience participation
- **R5.2**: Industry-specific scenario exploration (students apply PACT/MAESTRO to their domain)
- **R5.3**: "Design your governance" exercise using quality gates concept

#### R6: Take-Away Resources (Should Have)
- **R6.1**: Links to all referenced open-source repositories
- **R6.2**: PACT framework reference card
- **R6.3**: MAESTRO framework summary
- **R6.4**: Recommended reading list for further exploration

---

### 5.2 Demonstration Requirements

| # | Demo | Source | Duration | Key Metric |
|---|------|--------|----------|------------|
| D1 | 40-Minute App Build | Pre-Route (London Agentics Meetup) | 5-7 min | 5 agents, 40 min to working app |
| D2 | AI Security Audit | MAESTRO/ElizaOS (CISO Summit) | 7-10 min | 23 vulns in 4 hrs, 16:1 ROI |
| D3 | AI-Powered Analytics | Auto-Analyst | 5-7 min | Real-time pricing intelligence |
| D4 | University Knowledge Graph | LBS Semantic KG | 5 min | 3,963 nodes enriched for $14 |

#### Live Vibe-Cast Demo Apps (Netlify)

These are live, deployable apps built with agentic AI tools within the vibe-cast repository. They can be opened in the browser during the lecture for hands-on visual demonstrations — no coding or setup required.

| # | Demo | Live URL | Branch | Duration | Key Theme |
|---|------|----------|--------|----------|-----------|
| D5 | WASM Image Filters | [wasm-tinkering.netlify.app](https://wasm-tinkering.netlify.app/) | `claude/wasm-tinkering-l5Rmh` | 3-5 min | Privacy-first processing; 10-50x WASM vs JS speedup benchmark |
| D6 | LuitPlayer (Grand Piano) | [grand-piano-thisismon.netlify.app](https://grand-piano-thisismon.netlify.app/) | `claude/sheet-music-player-w1UAI` | 3-5 min | 7-agent swarm built a 7-octave piano + sheet music OMR |
| D7 | Kumno (Khasi Travel) | [kumno.netlify.app](https://kumno.netlify.app/) | `claude/khasi-travel-companion-2N6mJ` | 3-5 min | Offline-first PWA; AI translation; cultural sensitivity |
| D8 | Assam AI Governance | [assam-ai-usecase-governance-pwa.netlify.app](https://assam-ai-usecase-governance-pwa.netlify.app/) | `claude/assam-use-case-01KyUJCwyzb371Ck5PogDXgm` | 5-7 min | Government AI for property registration + cost audit fraud detection |
| D9 | Driftwise | [driftwise-discover-interesting-facts.netlify.app](https://driftwise-discover-interesting-facts.netlify.app/) | `claude/init-driftwise-pwa-UF1It` | 3-5 min | Voice-first, GPS-triggered historical fact discovery |

**Demo Constraints**:
- All demos must be visual (screenshots, recorded walkthroughs, or live if connectivity allows)
- Live Netlify apps (D5-D9) can be opened directly in the browser — no setup needed
- No audience coding required
- Each demo must have a clear "business takeaway" slide

---

### 5.3 Presentation Requirements

| # | Requirement | Detail |
|---|------------|--------|
| P1 | Duration | 90-120 minutes (including Q&A) |
| P2 | Format | Slides + live/recorded demonstrations |
| P3 | Accessibility | All slides must be screen-reader compatible; demos captioned where possible |
| P4 | Jargon Level | Technical terms introduced with business-context definitions |
| P5 | Visual Design | Clean, professional; diagrams over text walls |
| P6 | Handouts | Digital resource pack (links, frameworks, reading list) |

---

## 6. Lecture Structure

### Part 1: From ML to Agents (20 min)
| Section | Content | Audience Connection |
|---------|---------|-------------------|
| 1.1 | Bridge from ML/prediction to agents | "You already understand the building blocks" |
| 1.2 | AI Assistance Spectrum (Copilot -> Agent -> Swarm) | Their Copilot experience is the starting point |
| 1.3 | PACT Framework introduction | Classification system they can apply immediately |

### Part 2: Architecture of Agent Systems (20 min)
| Section | Content | Audience Connection |
|---------|---------|-------------------|
| 2.1 | Agent anatomy (perception, reasoning, action, memory) | Conceptual, no code |
| 2.2 | Claude-Flow architecture (visual) | Real system at scale (500K downloads) |
| 2.3 | Agent specialization (Forge's 8 agents) | Like a team of analysts with different roles |

### Part 3: Live Demonstrations (30-40 min)
| Section | Content | Audience Connection |
|---------|---------|-------------------|
| 3.1 | Demo D1: 40-Minute App | "What would take weeks, done in under an hour" |
| 3.2 | Demo D2: Security Audit | "Governance at speed and scale" |
| 3.3 | Demo D3: Analytics Platform | "This is YOUR domain - data analytics transformed" |
| 3.4 | Demo D4: Knowledge Graph | "AI applied to a university - like Greenwich" |
| 3.5 | Demo D5: WASM Image Filters (live) | "Privacy by design — your data never leaves the browser" |
| 3.6 | Demo D8: Assam AI Governance (live) | "AI for government transparency and anti-fraud" |
| 3.7 | Demo D9: Driftwise (live) | "Voice-first AI — no screen, no hands, just discovery" |

**Note**: Demos D5, D8, D9 are live Netlify apps that can be opened in the browser during the lecture. Select 2-3 based on time available. D6 (LuitPlayer) and D7 (Kumno) are available as backup or can be shown as screenshots.

### Part 4: Governance & Responsible AI (20 min)
| Section | Content | Audience Connection |
|---------|---------|-------------------|
| 4.1 | Honest limitations of agentic AI | Critical thinking, not hype |
| 4.2 | MAESTRO security framework | 7 layers they can evaluate any system against |
| 4.3 | Quality gates & confidence tiers | Graduated trust - a business governance model |
| 4.4 | Cost governance (TinyDancer) | Budget management for AI operations |

### Part 5: Business Case & Future (15 min)
| Section | Content | Audience Connection |
|---------|---------|-------------------|
| 5.1 | ROI summary table | Numbers they can take to a board meeting |
| 5.2 | Cross-industry applications | Their career paths intersect with agentic AI |
| 5.3 | Role of data analysts | "You are uniquely positioned for this" |

### Part 6: Q&A & Discussion (15 min)
| Section | Content | Audience Connection |
|---------|---------|-------------------|
| 6.1 | Structured discussion prompts | Apply learning to their own domains |
| 6.2 | Open Q&A | Address specific interests and concerns |

---

## 7. Technical Dependencies

| Dependency | Purpose | Fallback |
|-----------|---------|----------|
| Projector + HDMI/USB-C | Slide presentation | Printed handouts |
| Internet connectivity | Live demos (if chosen) | Pre-recorded demo videos |
| Audio system | For audience of ~200 | Portable speaker |
| Screen recording software | Capture live demos for recording | Pre-record demos in advance |

---

## 8. Content Sources & References

### Primary Technical Sources

| Source | URL | Usage |
|--------|-----|-------|
| Claude-Flow | github.com/ruvnet/claude-flow | Multi-agent architecture reference |
| Forge Skills | github.com/ikennaokpala/forge/blob/main/SKILL.md | Agent specialization and quality gates |
| Forge README | github.com/ikennaokpala/forge/blob/main/README.md | Autonomous QE methodology |
| Build with Quality | vibe-cast repo (claude-code-v3-qe-skill) | Unified dev + QE agent system |
| Agentic QE Framework | agentic-qe.dev | PACT framework, 13 bounded contexts |
| Agentic QE Repo | github.com/proffesor-for-testing/agentic-qe | 59 agents, 75 skills, implementation |

### Demo Application Sources (Standalone Repos)

| Demo | Source Repo |
|------|------------|
| Pre-Route Traffic App | github.com/mondweep/london-agentics-meetup-13aug-25 |
| MAESTRO Security Audit | github.com/mondweep/agentic-ai-security-demo-rela8group-ciso-london-summit |
| Auto-Analyst | github.com/mondweep/Auto-Analyst |
| University Knowledge Graph | github.com/mondweep/university-pitch |
| Sentinel API Testing | github.com/mondweep/sentinel-api-testing |
| Guild Hall | github.com/mondweep/guild-hall |
| Hackathon TV5 | github.com/mondweep/hackathon-tv5 |
| AI Maturity Assessment | github.com/mondweep/ai-maturity-assessment |

### Live Vibe-Cast Demo Apps (Netlify-deployed, from vibe-cast branches)

| App | Live URL | Vibe-Cast Branch |
|-----|----------|-----------------|
| WASM Image Filters | [wasm-tinkering.netlify.app](https://wasm-tinkering.netlify.app/) | `claude/wasm-tinkering-l5Rmh` |
| LuitPlayer (Grand Piano) | [grand-piano-thisismon.netlify.app](https://grand-piano-thisismon.netlify.app/) | `claude/sheet-music-player-w1UAI` |
| Kumno (Khasi Travel) | [kumno.netlify.app](https://kumno.netlify.app/) | `claude/khasi-travel-companion-2N6mJ` |
| Assam AI Governance | [assam-ai-usecase-governance-pwa.netlify.app](https://assam-ai-usecase-governance-pwa.netlify.app/) | `claude/assam-use-case-01KyUJCwyzb371Ck5PogDXgm` |
| Driftwise | [driftwise-discover-interesting-facts.netlify.app](https://driftwise-discover-interesting-facts.netlify.app/) | `claude/init-driftwise-pwa-UF1It` |
| Axomiya (Assamese Travel) | *(not yet deployed)* | `claude/assamese-travel-companion-uRp3j` |

### Governance & Industry Sources

| Source | Usage |
|--------|-------|
| PACT Framework (forge-quality.dev) | Agentic system classification |
| MAESTRO (Cloud Security Alliance) | Agentic AI security layers |
| Inside Higher Ed (Jan 2026) | Agentic AI in universities |

---

## 9. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Internet failure during live demos | High | Medium | Pre-record all demos as video backups |
| Technical jargon alienates business students | High | Medium | Glossary slide; business-first framing for every concept |
| Content too shallow for CS students | Medium | Medium | Provide "deep dive" resource links; layer technical depth as enrichment |
| Audience disengagement (200 people) | Medium | Medium | Interactive elements every 20 min; discussion prompts; varied demo types |
| Demo tools change/break before lecture | Medium | Low | Pin demo versions; test 48 hours before |
| Copilot comparison feels forced | Low | Medium | Natural integration - start from their experience, don't force parallels |

---

## 10. Out of Scope

- Hands-on coding workshops (university constraint)
- Deep technical implementation tutorials
- Comparison/evaluation of commercial AI vendors
- Assessment or grading of student work
- Installation or configuration of any tools during the session

---

## 11. Success Measurement

### Immediate (During Lecture)
- Audience engagement during discussion segments
- Quality and depth of questions during Q&A
- Visible note-taking and photo-taking of framework slides

### Short-term (Post-Lecture)
- Post-session feedback survey scores (target: 4.0+/5.0)
- Student comments on theory-to-practice bridge
- Number of students accessing shared resource links

### Long-term (Partnership)
- Invitation for repeat/follow-up lecture
- Student projects referencing lecture frameworks
- University interest in deeper Agentics Foundation collaboration

---

## 12. Timeline

| Milestone | Target Date | Owner |
|-----------|-------------|-------|
| Research complete | 2026-02-14 | Mondweep |
| PRD approved | 2026-02-17 | Mondweep + University contact |
| Slide deck v1 | TBD | Mondweep |
| Demo recordings complete | TBD | Mondweep |
| Dry run / rehearsal | TBD (lecture date - 1 week) | Mondweep |
| Resource pack finalized | TBD (lecture date - 3 days) | Mondweep |
| Lecture delivery | TBD | Mondweep |
| Post-lecture survey | TBD (lecture date + 1 day) | University |

---

## Appendix A: Glossary for Business Audience

| Term | Business-Friendly Definition |
|------|---------------------------|
| Agent | An AI system that pursues goals autonomously, like a digital team member with a specific job |
| Swarm | A coordinated team of AI agents working together, like a project team with specialized roles |
| Multi-Agent Orchestration | Managing multiple AI agents to work together efficiently, like a project manager coordinating a team |
| Quality Gate | A checkpoint that work must pass before proceeding, like approval stages in a business process |
| Confidence Tier | A trust level based on track record, like a vendor performance rating |
| Model Routing | Directing tasks to the right-sized AI model, like assigning work to junior vs senior staff based on complexity |
| MCP (Model Context Protocol) | A standard way for AI agents to connect with tools, like USB for AI systems |
| PACT | A framework for classifying how autonomous an AI system is: Proactive, Autonomous, Collaborative, Targeted |
| MAESTRO | A 7-layer security framework for evaluating agentic AI systems |
| LLM | A large language model - the foundational AI technology behind agents like ChatGPT, Claude, and Copilot |
| RAG | Retrieval-Augmented Generation - connecting AI to specific data sources so it gives informed, contextual answers |

---

## Appendix B: Potential Follow-Up Opportunities

1. **Workshop Series**: Hands-on Copilot-based exercises applying PACT framework to case studies
2. **Student Projects**: AI maturity assessments of real organizations using the assessment tool framework
3. **Research Collaboration**: Joint paper on agentic AI governance in data analytics education
4. **Hackathon**: Greenwich University edition of the Agentics Foundation hackathon format
5. **Guest Lecture Series**: Deeper dives into specific topics (security, quality engineering, industry applications)
