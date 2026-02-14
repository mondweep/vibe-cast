# Lecture Structure Recommendations

## Proposed Duration: 90-120 minutes

---

## Part 1: From ML to Agents (20 min)

### Bridge from Prior Knowledge
- Students know ML basics, prediction, and the concept of agency
- Build the bridge: ML model -> LLM -> Tool-using LLM -> Agent -> Multi-Agent System
- Key distinction: reactive tools vs proactive agents that "accomplish goals, align stacked tasks, and complete those tasks without direct supervision"

### The Spectrum of AI Assistance
| Level | Description | Example |
|-------|-------------|---------|
| Copilot | Suggests completions | Microsoft Copilot (their tool) |
| Assistant | Follows instructions | ChatGPT, Claude |
| Agent | Pursues goals autonomously | Claude Code, Forge agents |
| Swarm | Coordinated multi-agent teams | Claude-Flow, Agentic QE |

### Introduce PACT Framework
- Proactive, Autonomous, Collaborative, Targeted
- Analogous to SAE levels for autonomous vehicles (a concept they can relate to)

---

## Part 2: Architecture of Agent Systems (20 min)

### How Agents Work (Conceptual, No Code)
- **Perception**: Agents read code, APIs, test results, user requirements
- **Reasoning**: LLMs process context and decide next actions
- **Action**: Agents execute through tools (file editing, running tests, API calls)
- **Memory**: Agents learn from outcomes and store patterns for reuse
- **Coordination**: Agents communicate through shared memory, quality gates, or direct protocols

### Real Architecture: Claude-Flow
- Show the 5-layer architecture visually
- Highlight: 60+ specialized agents, self-learning, multi-provider support
- Business metric: 2.8-4.4x faster task completion, 84.8% benchmark solve rate

### Specialization Pattern (Forge)
- 8 agents with distinct roles: Specification Verifier, Test Runner, Failure Analyzer, Bug Fixer, etc.
- Each agent matched to the right model tier (Haiku/Sonnet/Opus) for cost optimization
- Continuous loop: Specify -> Test -> Analyze -> Fix -> Audit -> Gate -> Commit -> Learn

---

## Part 3: Live Demonstrations (30 min)

### Demo 1: The 40-Minute App (Pre-Route)
- Show the agent collaboration report from the London Agentics Meetup
- 5 agents built a complete traffic monitoring app in 40 minutes
- Walk through the DEMO_GUIDE.md
- Business takeaway: speed to market with quality built in

### Demo 2: AI Security Audit (MAESTRO)
- Present the CISO London Summit analysis of ElizaOS
- 23 vulnerabilities found in 4 hours (vs 15-20 days traditional)
- Cost: $5-15K vs $50-150K (90% reduction)
- 16:1 ROI over 3 years
- Walk through the 7 MAESTRO layers
- Business takeaway: governance and security can be accelerated, not just development

### Demo 3: AI-Powered Analytics (Auto-Analyst)
- Show the automotive dealership analytics platform
- Interactive dashboards, pricing intelligence, market analysis
- Most relatable to data analytics students
- Business takeaway: AI transforms traditional analytical workflows

### Demo 4: Knowledge Graph (University Pitch - LBS)
- Semantic enrichment of university website content
- 3,963 nodes enriched for ~$14 total cost
- Sentiment analysis, topic extraction, persona classification
- Business takeaway: AI-driven content intelligence at minimal cost

### Demo 5-9: Live Vibe-Cast Apps (select 2-3 based on time)

All of these are live on Netlify and can be opened in the browser during the lecture. No setup required.

**Demo 5: WASM Image Filters** — [wasm-tinkering.netlify.app](https://wasm-tinkering.netlify.app/)
- Upload an image, apply filters, see JS vs WASM benchmark side-by-side
- 10-50x performance improvement with Rust/WASM over JavaScript
- All processing happens locally — data never leaves the browser
- Business takeaway: privacy-by-design and performance optimization are not mutually exclusive

**Demo 6: LuitPlayer / Grand Piano** — [grand-piano-thisismon.netlify.app](https://grand-piano-thisismon.netlify.app/)
- Play a 7-octave piano in the browser with 5 different timbres
- Built by a 7-agent Claude Flow swarm (coordinator, frontend, audio, OMR, test agents)
- Includes Optical Music Recognition for Assamese sheet music
- Business takeaway: multi-agent collaboration can produce sophisticated creative applications

**Demo 7: Kumno (Khasi Travel Companion)** — [kumno.netlify.app](https://kumno.netlify.app/)
- 80+ Khasi phrases with phonetic guides, organized by travel scenario
- AI-powered real-time translation with offline-first caching
- Cultural sensitivity: Bah/Kong honorific toggle
- Business takeaway: AI translation enabling cultural preservation and tourism

**Demo 8: Assam AI Governance** — [assam-ai-usecase-governance-pwa.netlify.app](https://assam-ai-usecase-governance-pwa.netlify.app/)
- Property registration digitalization (20-30 days → 5-7 days)
- Infrastructure cost auditing with AI anomaly detection
- Trilingual UI (English, Assamese, Hindi)
- Business takeaway: AI applied directly to government governance and transparency; 50+ crore INR savings target

**Demo 9: Driftwise** — [driftwise-discover-interesting-facts.netlify.app](https://driftwise-discover-interesting-facts.netlify.app/)
- Voice-first PWA that delivers GPS-triggered historical facts while driving
- Anti-generic filtering: rejects tourism clichés, surfaces named individuals and unusual events
- Gemini Live API for real-time bidirectional voice
- Business takeaway: voice-first design pattern; responsible AI (driver safety); creative consumer application

**Recommended selection for time-limited lectures**:
- D5 (WASM) — quick, visual, universally understandable
- D8 (Assam AI Governance) — directly demonstrates governance theme
- D9 (Driftwise) — shows voice-first, location-aware AI innovation

---

## Part 4: Governance & Responsible AI (20 min)

### The Governance Imperative
- Lead with the "honest limitations" from PACT research
- Weak business-rule understanding, reliability issues, over-engineering
- Frame: these are engineering trade-offs, not showstoppers

### Governance Mechanisms in Practice
1. **Quality Gates**: Define boundaries for autonomous operation (Forge's 7 gates)
2. **Confidence Tiers**: Trust earned through empirical evidence (Bronze -> Platinum)
3. **Cost Governance**: TinyDancer routing - not all tasks need the most expensive model (75% savings)
4. **Security Frameworks**: MAESTRO's 7-layer model for agentic AI security
5. **Human-in-the-Loop**: Agents augment, never fully replace human judgment

### Discussion Prompt
- "If you were deploying an agentic AI system in your organization, what quality gates would you define?"
- "How would you measure whether an agent has earned enough trust for increased autonomy?"

---

## Part 5: The Business Case & Future (15 min)

### ROI Evidence from Research
| Application | Traditional | AI-Driven | Improvement |
|------------|-------------|-----------|-------------|
| Security Audit | 15-20 days, $50-150K | 4 hours, $5-15K | 96% faster, 90% cheaper |
| Task Completion | Baseline | 2.8-4.4x faster | Up to 340% improvement |
| Token Costs | Baseline | 75% reduction | Via model routing |
| Content Enrichment | Manual | Automated, ~$14 for 3,963 nodes | Near-zero marginal cost |

### Where This Is Going
- From single agents to coordinated swarms
- From reactive testing to proactive quality engineering
- From manual governance to automated compliance with human oversight
- University sector already transforming (recruitment, tutoring, compliance)

### Your Role as Data Analysts
- Data analytics professionals are uniquely positioned to evaluate AI agent effectiveness
- Metrics, measurement, and critical analysis are your superpower
- The governance challenge needs business-minded people, not just engineers

---

## Part 6: Q&A and Discussion (15 min)

### Suggested Discussion Topics
1. What business processes in your industry could benefit from agentic AI?
2. How would you design governance for an agent that manages financial data?
3. What ethical considerations arise when agents learn from outcomes?
4. How does your experience with Microsoft Copilot map to the PACT framework?

---

## Supporting Materials

### Recommended for Students
- Forge SKILL.md for understanding agent specialization patterns
- PACT article on forge-quality.dev for governance thinking
- MAESTRO framework for security assessment methodology

### Recommended for Further Exploration
- claude-flow repository for architecture deep-dive
- agentic-qe repository for practical QE implementation
- Build with Quality skill for integrated development + quality approach
