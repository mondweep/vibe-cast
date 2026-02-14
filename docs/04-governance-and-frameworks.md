# Governance, Frameworks & Responsible AI

## 1. The PACT Framework (Agentic QE)

**Source**: Dragan Spiridonov / [forge-quality.dev](https://forge-quality.dev/articles/what-is-agentic-qe)

PACT classifies agentic systems across four dimensions - analogous to SAE levels for autonomous vehicles:

### Proactive
- Anticipating problems during analysis phases rather than discovering them post-deployment
- Agents analyze code to identify security issues and anti-patterns *before* execution
- Shift from reactive firefighting to proactive quality design

### Autonomous
- Systems making decisions independently while explaining their reasoning
- Requires safety mechanisms: frequent commits, clear decision traces
- NOT "set and forget" - requires designed autonomy boundaries

### Collaborative
- Agents working alongside humans and other systems
- Humans conduct overall strategy; agents handle execution
- Quality becomes a "team sport" between human expertise and AI capabilities

### Targeted
- Risk-based intelligence focusing effort on high-impact areas
- Agent-assisted iteration enables rapid pivoting when approaches fail
- Resource allocation driven by predicted risk, not uniform coverage

### Honest Limitations (Critical for Governance Discussion)
- Weak business-rule understanding
- Model reliability issues
- Over-engineering tendencies
- Severity calibration challenges
- Real maintenance overhead

**Lecture Application**: PACT provides an accessible, memorable framework for students to evaluate any agentic system. The "honest limitations" section models the kind of critical thinking expected in governance roles.

---

## 2. MAESTRO Framework (Cloud Security Alliance)

**Source**: [CISO London Summit demo](https://github.com/mondweep/agentic-ai-security-demo-rela8group-ciso-london-summit)

MAESTRO (Multi-Agent Environment, Security, Threat, Risk, and Outcome) provides 7 security layers for agentic AI:

| Layer | Focus | Example Concerns |
|-------|-------|-----------------|
| 1. Foundational Models | LLM integrations, inference | Prompt security, model poisoning |
| 2. Data Operations | Databases, RAG, vector storage | Data leakage, poisoned embeddings |
| 3. Agent Frameworks | Orchestration, decision logic | Rogue agents, decision manipulation |
| 4. Deployment & Infra | Runtime, APIs, networking | Unauthorized access, API abuse |
| 5. Evaluations & Observability | Logging, monitoring, testing | Blind spots, inadequate audit trails |
| 6. Security & Compliance | Auth, secrets, policies | Credential theft, policy violations |
| 7. Agent Ecosystem | Plugins, actions, tools | Supply chain attacks, malicious plugins |

### Real-World Application
The ElizaOS security analysis found:
- 23 vulnerabilities across 127 files
- 3 Critical (Risk Score >= 49/70)
- Most severe: Plugin Supply Chain Attack (56/70) - 42 plugins lacked signature verification
- Completed in 4 hours vs 15-20 days traditional assessment
- ROI: 16:1 over 3-year mitigation period

**Lecture Application**: MAESTRO gives students a structured way to think about security in agentic systems. The ElizaOS case study provides concrete numbers for risk assessment.

---

## 3. Quality Gates as Governance Mechanisms

**Source**: Forge / Agentic QE

### Seven Quality Gates (Forge)
Blocking gates that agents must pass before progressing:

1. **Functional Correctness**: Code compiles and passes unit tests
2. **Behavioral Compliance**: Gherkin specifications all pass
3. **Code Coverage**: Meets minimum thresholds (85% baseline, 95% critical)
4. **Security Violations**: No SAST/DAST findings above threshold
5. **API Contract Validation**: Responses match expected DTOs
6. **Accessibility**: WCAG AA compliance (warning, not blocking)
7. **Resilience**: Chaos testing passes (warning, not blocking)

### Confidence-Tiered Fix Patterns
Graduated trust based on empirical evidence:
- **Platinum/High**: 10+ successful applications - fully autonomous
- **Gold/Medium**: 3-9 applications - autonomous with monitoring
- **Silver/Low**: 1-2 applications - requires human review

**Lecture Application**: Quality gates demonstrate how organizations can give agents autonomy within guardrails. Confidence tiers show how trust is earned incrementally - a key governance concept.

---

## 4. TinyDancer: Cost Governance Through Model Routing

**Source**: Build with Quality Skill / Agentic QE

Intelligent task-to-model routing based on complexity:

| Complexity | Model | Use Cases | Cost Implication |
|-----------|-------|-----------|-----------------|
| 0-20 (Simple) | Haiku | Syntax fixes, type additions | Lowest cost |
| 20-70 (Standard) | Sonnet | Bug fixes, test generation | Moderate cost |
| 70-100 (Complex) | Opus | Architecture, security analysis | Highest cost |

Result: **75% token reduction** while maintaining quality output.

**Lecture Application**: Shows students how cost governance works in AI systems - not all tasks need the most expensive model. This is directly applicable to business decision-making about AI investments.

---

## 5. Agentic AI in Higher Education (2026 Context)

**Source**: [Inside Higher Ed, January 2026](https://www.insidehighered.com/opinion/columns/online-trending-now/2026/01/07/rise-agentic-ai-university-2026)

### Current University Applications
- **Recruitment**: 24/7 digital concierges handling credit evaluations and campus tours
- **Academic Support**: Socratic AI tutors generating practice problems from real-time performance
- **Predictive Intervention**: Identifying struggling students before midterms using LMS data
- **Mental Health**: Triage agents offering coping strategies while escalating serious cases
- **Finance**: Automated invoice processing, grant identification, proposal drafting
- **Compliance**: Regulatory reporting generating audit-ready documents

### Key Insight
Institutions operationalizing AI early will "widen their performance gap" while delayed adopters face uncontrolled shadow systems.

**Lecture Application**: Students can see agentic AI is already transforming their own institution type - making the topic immediately personal and relevant.

---

## 6. Governance Principles for Business Leaders

### Derived from Research

1. **Graduated Autonomy**: Start with low-autonomy agents; increase as trust is earned through empirical evidence (confidence tiers)
2. **Explainability**: Every autonomous decision needs a reason; every test flow needs explainability (PACT)
3. **Human Checkpoints**: Agent actions require human oversight at critical junctures - augmentation, not replacement
4. **Quality Gates**: Define clear boundaries within which agents can operate autonomously
5. **Cost Transparency**: Understand and control the cost of AI operations (model routing, token optimization)
6. **Security by Design**: Apply frameworks like MAESTRO from the start, not as an afterthought
7. **Mock Policy**: Only mock what you cannot control (external services); test reality for everything internal
8. **Rollback Capability**: Always maintain the ability to revert agent decisions
9. **Continuous Learning with Boundaries**: Agents should learn, but within defined namespaces to prevent cross-contamination
10. **Honest Assessment**: Acknowledge limitations - weak business-rule understanding, reliability issues, maintenance overhead
