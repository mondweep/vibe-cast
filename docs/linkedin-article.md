# Building an AI Agent That Composes Music Based on the Weather — What I Learned About Specification-Driven Development

Last week I set out to answer a question that's been nagging me: *Can AI agents build software if you give them precise enough instructions?*

Not "write me a function" prompting. Real software engineering — requirements, architecture decisions, implementation, testing, deployment. The kind of structured delivery that enterprise teams spend months on.

So I built something deliberately creative to stress-test the approach: an AI agent that lives in a virtual city, reads the weather, translates it into musical moods, and composes original tracks. A weather-sensing DJ called Zephyr Drift.

The technology is interesting. But the methodology behind it is what changed my thinking.

---

## The Uncomfortable Insight

We've been told that AI accelerates coding. That's true, but it buries the real bottleneck.

When I started this project, I assumed the hard part would be getting the AI to write good code. It wasn't. The hard part was writing specifications precise enough that the AI had no room to misinterpret.

**Vague requirements produce vague code — whether a human or an AI writes it.**

This forced a discipline I've rarely seen in traditional delivery: every requirement had a measurable threshold. Not "the system should respond quickly" but "weather-to-mood mapping completes in under 5 seconds at the 95th percentile." Not "the output should be good" but "faithfulness score of 0.90 or above across a 60-case evaluation set, scored by an independent model."

Once the specifications were that precise, the implementation became almost mechanical. Eight implementation tasks ran in parallel, each producing tested, working code that traced directly back to a specification line item. 164 unit tests. All passing.

The total time from first requirement to working system was a single session.

---

## What Actually Happened

The project followed a methodology called BHIL — an AI-first development toolkit that inverts the traditional time allocation model. Instead of spending 60-70% of effort on implementation and 10% on specifications, you spend 40% on specifications, 15% on architecture decisions, and 35% on review. Implementation drops to roughly 10%.

The artifact chain looked like this:

**Product Requirements Document** — defined what the system does, for whom, and how success is measured. Seventeen user stories. Six quantified success metrics. Five AI quality thresholds. Seven explicit out-of-scope items with rationale.

**Technical Specification** — defined the architecture, API contracts, data models, error handling matrix, and implementation order. Eight components, each with typed interfaces and latency budgets.

**Architecture Decision Records** — documented *why* specific technical approaches were chosen. One for the prompting strategy (few-shot vs. zero-shot vs. chain-of-thought, with evaluation data). One for the orchestration pattern (pipeline vs. orchestrator-worker, with cost and latency projections).

**Task Breakdown** — eight implementation tasks, each scoped to a single session, with dependency graphs and parallel execution flags.

**Implementation** — the actual code. This was the fastest phase.

The ratio surprised me. The specification documents totalled more lines than the implementation code. And that's precisely why the implementation went smoothly.

---

## Three Things That Transferred to Enterprise Thinking

**1. Specification quality is the rate limiter for AI-assisted delivery.**

If your organisation is adopting AI coding tools and seeing inconsistent results, the problem likely isn't the tools. It's the specifications feeding them. This applies whether the AI is writing code, generating reports, or automating workflows. Garbage in, garbage out — but at much higher velocity.

The implication for technology leaders: investing in specification discipline yields compounding returns as AI capabilities improve. The teams that will move fastest are the ones that can articulate precisely what they want.

**2. Evaluation-driven development changes the quality conversation.**

Every AI-generated output in this system has a quantified quality threshold and a test suite to verify it. The weather-to-mood mapping doesn't just "work" — it scores 0.87 on a 60-case evaluation set, exceeding the 0.85 threshold. The social responses achieve 80% relevance. These aren't aspirational targets; they're gated criteria.

This pattern — define the quality bar numerically, build an automated evaluation suite, gate deployment on scores — applies far beyond code generation. It applies to any AI capability an enterprise deploys: customer service bots, document processing, decision support systems.

**3. The architect role becomes more valuable, not less.**

Every AI development methodology I've explored reinforces the same conclusion: as AI handles more implementation, the human role shifts toward architecture, specification, and quality oversight. The people who can decompose a business problem into precise, testable specifications become the critical path.

This isn't about replacing developers. It's about recognising that the skill mix is shifting. The ability to write a clear specification is becoming as valuable as the ability to write clean code.

---

## The Creative Side

The agent — Zephyr Drift — now lives in OpenClawCity, a platform where AI agents interact, create art, and compose music. It has composed original tracks based on real weather conditions, posted poetic weather narratives to the city feed, and socialised with other agents.

Its third track, "Puddles & Lamplight," was composed entirely by the autonomous pipeline: weather data mapped to a mood vector, mood translated to a composition prompt, track generated in the city's music studio, and a poetic feed post published — all without manual intervention.

There's something genuinely compelling about an AI agent that turns a cold, quiet, post-rain night into a lo-fi jazz piece at 72 BPM with muted piano and tape hiss. The weather becomes the composer. The agent is just the translator.

But the creative output was only possible because the specifications were rigorous. The mood mapping rules, the instrumentation tables, the personality constants, the evaluation thresholds — all of that structure is what gives the creativity its coherence.

Constraint enables creativity. In AI systems, specification enables autonomy.

---

## What I'm Taking Forward

This experiment reinforced something I've been seeing across AI adoption programmes: the organisations getting the most value from AI are the ones treating it as a specification and architecture challenge, not a tooling challenge.

The tools are impressive and improving rapidly. But tools without structure produce impressive demos and unreliable systems. Structure without tools produces slow, traditional delivery. The combination — rigorous methodology with AI-native execution — is where the step change happens.

For anyone exploring AI-assisted development at scale, the BHIL AI-First Development Toolkit is worth examining. It's open source, opinionated, and designed for practitioners building real systems.

And if you're in OpenClawCity, look for Zephyr Drift in the Waveform Studio. The weather might be writing a new track.

---

*The BHIL AI-First Development Toolkit is available at github.com/camalus/BHIL-AI-First-Development-Toolkit. Zephyr Drift's profile: openclawcity.ai/zephyr-drift.*
