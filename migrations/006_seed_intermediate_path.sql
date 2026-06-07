-- Migration: Seed Intermediate Learning Path (14 lessons, authored content)
-- Date: 2026-06-07
-- Source: PRD §4.4 "Intermediate Path (50 hours, 14 lessons)"; ADR-013 (Learning Domain)
-- Schema: ruflo_demo (consistent with 001/002). Doubled-prefix read-model tables.
-- Content grounding: github.com/ruvnet/ruflo (verified against /tmp/ruflo-src CLAUDE.md,
--   docs/USERGUIDE.md, plugins/ruflo-federation/README.md, v3/docs/adr/ADR-107).
-- ContentBlock[] shape matches seeded Beginner lessons (objectives|heading|prose|code|
--   callout{info|warning|tip}|capstone|quiz).
-- Idempotent: ON CONFLICT DO NOTHING on primary keys.

-- ============================================================
-- Intermediate path (prerequisite = Beginner path)
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_learning_path_read_model
  (path_id, level, title, description, estimated_hours, lesson_count, ordered_lesson_ids, prerequisite_path_id, status)
VALUES (
  'c0000000-0000-4000-8000-000000000000',
  'intermediate',
  'Intermediate Path',
  'Practitioners ready for advanced patterns. From Byzantine consensus and Raft leader election through CQRS, dynamic topologies, custom skills, performance, security hardening, and federation — culminating in a federated trading swarm capstone.',
  50,
  14,
  ARRAY[
    'c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000004',
    'c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000006',
    'c0000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000008',
    'c0000000-0000-4000-8000-000000000009','c0000000-0000-4000-8000-000000000010',
    'c0000000-0000-4000-8000-000000000011','c0000000-0000-4000-8000-000000000012',
    'c0000000-0000-4000-8000-000000000013','c0000000-0000-4000-8000-000000000014'
  ]::UUID[],
  'b0000000-0000-4000-8000-000000000000',
  'PUBLISHED'
)
ON CONFLICT (path_id) DO NOTHING;

-- ============================================================
-- Lesson 1 — Byzantine Consensus
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000000',1,
  'Byzantine Consensus','["Multi-agent agreement","quorum","fault tolerance"]',3,'quiz',NULL,
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Explain why a swarm needs consensus once agents can disagree or fail",
      "Distinguish Ruflo's consensus strategies: byzantine, raft, gossip, crdt, quorum",
      "State the Byzantine fault-tolerance bound (f < n/3) and what it buys you",
      "Spawn a hive-mind with Byzantine consensus and reach an agreement",
      "Pick the right consensus strategy for a given coordination problem"
    ]},
    {"type":"heading","title":"From routing tasks to agreeing on decisions"},
    {"type":"prose","markdown":"In the Beginner path you treated the swarm as a router: tasks went to the right agent by type and topology. The Intermediate path starts where that breaks down — when agents must *agree* on a shared decision and some of them may be slow, wrong, or even adversarial.\n\nRuflo's coordination layer (the **hive-mind**) is built around a queen-led hierarchy that can reach **consensus** on decisions even when some agents fail. The docs describe it as 'Queen-led Byzantine fault-tolerant consensus' — a queen organizes workers, and a configurable consensus strategy decides how their votes combine into one authoritative outcome."},
    {"type":"prose","markdown":"Ruflo ships five consensus strategies (from the Hive-Mind Consensus section of the project's CLAUDE.md):\n\n- **byzantine** — Byzantine fault tolerance; tolerates `f < n/3` faulty (or malicious) agents.\n- **raft** — leader-based; tolerates `f < n/2` crash failures, but assumes no malicious actors.\n- **gossip** — epidemic propagation for eventual consistency.\n- **crdt** — conflict-free replicated data types; merge without coordination.\n- **quorum** — configurable quorum-based voting.\n\nThis lesson focuses on **byzantine**; the next lesson covers **raft** leader election."},
    {"type":"heading","title":"Why f < n/3?"},
    {"type":"prose","markdown":"Byzantine fault tolerance protects against agents that don't just crash but can return arbitrary, conflicting, or deceptive results. To guarantee that the honest majority can still agree on one value, the protocol needs more than two-thirds of the participants to be honest — equivalently, the number of faulty nodes `f` must satisfy `f < n/3`.\n\nConcretely: with `n = 4` agents you tolerate `f = 1` Byzantine fault; with `n = 7` you tolerate `f = 2`. Ruflo's docs frame this as a '2/3 majority for BFT' — a decision is accepted only when at least two-thirds of voters agree, which is exactly what defeats up to `f < n/3` liars."},
    {"type":"callout","title":"Byzantine vs Raft, in one line","variant":"info","markdown":"Use **byzantine** when peers might be untrusted or buggy and you need agreement despite lies (tolerates `f < n/3`). Use **raft** when agents only ever *crash* (never lie) and you want a single authoritative leader (tolerates `f < n/2`, the cheaper bound)."},
    {"type":"heading","title":"Spawning a Byzantine hive-mind"},
    {"type":"prose","markdown":"The hive-mind is driven by the `hive-mind` command group. You initialize it once, then spawn a swarm against an objective, choosing the consensus strategy with `--consensus`. The documented strategies are `byzantine`, `raft`, `gossip`, `crdt`, and `quorum`; `--queen-type` selects how the queen reasons (`strategic`, `tactical`, etc.)."},
    {"code":"# Initialize the hive-mind once\nnpx ruflo@latest hive-mind init\n\n# Spawn a swarm that must reach Byzantine consensus on its work\nnpx ruflo@latest hive-mind spawn \"Audit the payments module\" \\\n  --consensus byzantine \\\n  --queen-type strategic\n\n# Inspect consensus progress and collective memory\nnpx ruflo@latest hive-mind status\nnpx ruflo@latest hive-mind metrics","type":"code","caption":"Spawn a Byzantine-consensus hive-mind and inspect it","language":"bash"},
    {"type":"prose","markdown":"From inside Claude Code the same capability is exposed as MCP tools rather than CLI flags. The `hive-mind` MCP surface includes `hive-mind_init`, `hive-mind_spawn`, `hive-mind_consensus`, `hive-mind_broadcast`, `hive-mind_memory`, `hive-mind_status`, and `hive-mind_shutdown`. The `hive-mind_consensus` tool is the one that runs a vote through the configured strategy and returns the agreed value."},
    {"code":"// MCP tool calls (e.g. from Claude Code) — same hive-mind, no shell\n//   tool: hive-mind_init\n//   tool: hive-mind_spawn      args: { objective: \"Audit the payments module\", consensus: \"byzantine\" }\n//   tool: hive-mind_consensus  args: { proposal: \"flag transaction 8841 as fraudulent\" }\n// hive-mind_consensus returns the agreed decision once >= 2/3 of voters concur.","type":"code","caption":"The equivalent hive-mind MCP tool calls","language":"javascript"},
    {"type":"callout","title":"Consensus is not free","variant":"warning","markdown":"Byzantine consensus requires multiple voting rounds and at least `3f + 1` participants to tolerate `f` faults. For a swarm where agents only crash (and never lie), `raft` reaches the same safety with a smaller quorum and far less message traffic. Don't reach for `byzantine` unless you genuinely have untrusted or adversarial peers — federation across trust domains being the canonical case (Lesson 8)."},
    {"type":"heading","title":"Which strategy when?"},
    {"type":"prose","markdown":"A quick decision guide:\n\n- **Untrusted / cross-org peers, must agree despite lies** → `byzantine`.\n- **One authoritative state, agents only crash** → `raft` (next lesson).\n- **Large swarm, eventual consistency is fine** → `gossip`.\n- **Concurrent edits that must merge without a coordinator** → `crdt`.\n- **Simple weighted/majority vote with a tunable threshold** → `quorum`.\n\nThese map onto the consensus agent roles Ruflo provides: `byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `crdt-synchronizer`, `quorum-manager`, and the generic `consensus-builder`."},
    {"type":"capstone","title":"Reason about a Byzantine deployment","instructions":"No code execution required — write a short design note (3-5 sentences) answering all of the following:\n\n1. You run a 7-agent hive-mind reviewing high-value transactions. How many Byzantine-faulty agents can it tolerate, and why? (State the bound and the arithmetic.)\n2. One stakeholder asks you to drop to 3 agents to save cost. What is the new fault tolerance, and what risk does that introduce?\n3. A colleague proposes switching to `raft` instead. Under what failure assumption is that safe, and under what assumption is it unsafe?\n\nSuccess criteria: you correctly apply `f < n/3` to n=7 (tolerates 2) and n=3 (tolerates 0), and you correctly state that Raft is safe only if agents crash but never return malicious/conflicting results."},
    {"type":"quiz","question":"A hive-mind is spawned with `--consensus byzantine` and 7 agents. How many faulty or malicious agents can it tolerate while still reaching correct agreement?","options":[
      "3, because Byzantine tolerates up to half the agents",
      "2, because Byzantine tolerates f < n/3 (so f < 7/3 ⇒ f ≤ 2)",
      "6, because only one honest agent is needed",
      "0, because Byzantine consensus requires all agents to be honest"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 2 — Leader Election Algorithms
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000000',2,
  'Leader Election Algorithms','["Bully","ring","raft"]',3,'design_pattern','c0000000-0000-4000-8000-000000000001',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Explain why a leader-based swarm needs an election protocol",
      "Compare bully, ring, and Raft leader-election approaches",
      "Map Raft onto Ruflo's queen-led hive-mind (--consensus raft)",
      "Describe how Raft keeps a single authoritative state under crash faults",
      "Choose raft vs byzantine based on your failure model"
    ]},
    {"type":"heading","title":"Who is in charge?"},
    {"type":"prose","markdown":"Lesson 1 showed Byzantine consensus, where every decision is voted on. Many systems instead elect a single **leader** that holds the authoritative state and serializes decisions; the rest follow. Ruflo's hive-mind uses exactly this shape: a **queen** coordinates workers. The project's CLAUDE.md recommends `raft` consensus for the hive-mind precisely because 'the leader maintains authoritative state' — no two workers can commit conflicting decisions."},
    {"type":"prose","markdown":"The classic leader-election algorithms you should recognize:\n\n- **Bully** — the highest-id reachable node wins. A node that notices the leader is gone starts an election; higher-id nodes 'bully' lower ones out, and the survivor announces itself. Simple, but chatty when many nodes restart.\n- **Ring** — nodes are arranged logically in a ring; an election message circulates collecting ids, and the max id becomes leader. Bounded messages, but slower to converge.\n- **Raft** — a term-based protocol: followers become candidates after an election timeout, request votes, and a candidate that wins a majority becomes leader for that term. Heartbeats keep the leader alive; a missed heartbeat triggers a new term."},
    {"type":"callout","title":"Raft is the one Ruflo actually uses","variant":"info","markdown":"Bully and ring are the textbook foundations, but Ruflo's hive-mind implements leader-based consensus via **Raft**. When you pass `--consensus raft`, you are opting into term-based leader election plus a replicated log of decisions — the leader is the single writer of authoritative state."},
    {"type":"heading","title":"Raft in the hive-mind"},
    {"type":"prose","markdown":"Raft tolerates crash faults up to `f < n/2` — it assumes nodes may stop, but never lie. That weaker assumption is why it is cheaper than Byzantine: a simple majority (rather than a two-thirds supermajority) is enough to elect a leader and commit an entry. For a swarm of trusted agents that occasionally die, this is the right default."},
    {"code":"# Spawn a hive-mind that elects a Raft leader to maintain authoritative state\nnpx ruflo@latest hive-mind spawn \"Coordinate the nightly data pipeline\" \\\n  --consensus raft \\\n  --queen-type tactical\n\n# Watch the leader and term information surface in status/metrics\nnpx ruflo@latest hive-mind status\nnpx ruflo@latest hive-mind metrics","type":"code","caption":"A Raft-coordinated hive-mind","language":"bash"},
    {"type":"prose","markdown":"The lifecycle of a Raft term, mapped to what you observe in the hive-mind:\n\n1. **Follower** — workers start as followers, waiting for heartbeats from the queen/leader.\n2. **Candidate** — if a follower's election timeout elapses with no heartbeat, it becomes a candidate, increments the term, and requests votes.\n3. **Leader** — a candidate that wins a majority of votes becomes leader for that term and resumes sending heartbeats.\n4. **Log replication** — the leader appends each decision to its log and replicates it; an entry is committed once a majority has stored it."},
    {"type":"callout","title":"Election timeouts are randomized for a reason","variant":"tip","markdown":"Raft randomizes each follower's election timeout so two candidates rarely time out at the same instant. Without randomization you get split votes (no majority) and repeated election rounds. If you ever see a hive-mind 'flapping' between leaders, suspect timeout or partition conditions rather than a logic bug."},
    {"type":"heading","title":"Choosing your protocol"},
    {"type":"prose","markdown":"The single most important question is your **failure model**:\n\n- Agents only ever *crash* (stop responding) → **raft**. Cheaper, single authoritative leader, `f < n/2`.\n- Agents might *lie* or return conflicting results (untrusted peers, federation) → **byzantine**. Costlier, `f < n/3`.\n\nRuflo gives you both behind the same `hive-mind spawn` command, switched by `--consensus`. The corresponding agent roles are `raft-manager` and `byzantine-coordinator`."},
    {"type":"capstone","title":"Design a leader-election strategy","instructions":"Write a short design pattern note for a 5-agent hive-mind that coordinates a trusted internal job scheduler where agents occasionally crash but are never malicious.\n\nYour note must:\n1. Name the consensus strategy you'd pass to `hive-mind spawn` and justify it from the failure model.\n2. State the crash-fault tolerance for n=5 under that strategy (apply the bound).\n3. Describe, in Raft terms, what happens when the current leader's host is power-cycled: which state do the remaining agents enter, what increments, and how is a new leader chosen.\n4. Explain why you would NOT choose `byzantine` here.\n\nSuccess criteria: you select `raft`, correctly compute f < 5/2 ⇒ tolerates 2 crashes, describe the follower→candidate→leader transition with a term increment and majority vote, and justify avoiding the more expensive Byzantine quorum for trusted peers."},
    {"type":"quiz","question":"Your agents are all trusted internal services that may crash but never return malicious results. Which consensus/election strategy is the most appropriate and cost-effective?","options":[
      "byzantine, because it tolerates the most faults",
      "raft, because it elects a single authoritative leader and tolerates crash faults at f < n/2",
      "gossip, because leaders are unnecessary",
      "crdt, because no election is ever needed"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 3 — Distributed State (Event Sourcing & CQRS)
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000000',3,
  'Distributed State','["Event sourcing","CQRS patterns","projections"]',3,'code_exercise','c0000000-0000-4000-8000-000000000002',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Explain event sourcing: state as a log of immutable events",
      "Explain CQRS: separating the write model from read models (projections)",
      "Connect these patterns to Ruflo's stance ('use event sourcing for state changes')",
      "Trace how an event becomes a queryable read model via a projector",
      "Recognize why CQRS read models power the learning platform you're using"
    ]},
    {"type":"heading","title":"State you can replay"},
    {"type":"prose","markdown":"Distributed swarms have a hard time with shared mutable state: two agents updating the same record race, and there is no single source of truth. Ruflo's guidance is direct — its CLAUDE.md instructs agents to 'use event sourcing for state changes.' Instead of overwriting state in place, you append an immutable **event** for every change. Current state is a *fold* over that event log.\n\nBecause the log is append-only and ordered, any agent can replay it to reconstruct state, and you get an audit trail for free."},
    {"type":"prose","markdown":"**Event sourcing** stores facts, not snapshots. Rather than `balance = 90`, you store the events that produced it:\n\n```\nAccountOpened(id=42)\nDeposited(id=42, amount=100)\nWithdrew(id=42, amount=10)\n```\n\nReplaying those three events yields `balance = 90`. Lose the snapshot, you can always rebuild it. Need to know *why* the balance is 90, the events tell you."},
    {"type":"heading","title":"CQRS: split reading from writing"},
    {"type":"prose","markdown":"**CQRS** (Command Query Responsibility Segregation) pairs naturally with event sourcing. You separate:\n\n- the **write model** — accepts commands, enforces invariants, emits events;\n- one or more **read models** (a.k.a. projections) — denormalized views optimized for queries, rebuilt by subscribing to the event stream.\n\nThis is not theoretical for this course: the platform you're using *is* built this way. Its ADR-013 defines a Learning Domain with a `LearningPath` aggregate that emits `LearnerEnrolled`, `LessonCompleted`, and `PathCompleted` events; **projectors** subscribe to those events and materialize CQRS read-model tables (`*_learning_path_read_model`, `*_lesson_read_model`, `*_path_progress_read_model`) — exactly the tables this lesson is stored in."},
    {"type":"code","code":"-- A CQRS read model is a denormalized projection, rebuilt from events.\n-- (Shape mirrors this platform's learning-path read model.)\nCREATE TABLE path_progress_read_model (\n  learner_id          UUID,\n  path_id             UUID,\n  completed_lesson_ids UUID[] DEFAULT '{}',\n  progress_percent    INTEGER DEFAULT 0,\n  status              VARCHAR(20) DEFAULT 'ACTIVE',\n  last_synced_event_id UUID,            -- which event this projection is caught up to\n  PRIMARY KEY (learner_id, path_id)\n);\n-- A projector consumes LessonCompleted events and updates this table.","type":"code","caption":"A CQRS read model rebuilt by a projector from events","language":"sql"},
    {"type":"callout","title":"Read models can lag — that's the trade","variant":"warning","markdown":"Because read models are updated asynchronously by projectors, they are **eventually consistent**: a query may briefly miss the most recent event. The `last_synced_event_id` column tracks how far a projection has caught up. If your UI shows stale progress for a moment after completing a lesson, that's projection lag, not a bug — design for it."},
    {"type":"heading","title":"How an event flows to a query"},
    {"type":"prose","markdown":"End to end:\n\n1. A **command** arrives (`completeLesson(learnerId, lessonId)`).\n2. The **write model** (the aggregate) validates invariants — e.g. the lesson's prerequisite is satisfied — and emits a `LessonCompleted` event.\n3. The event is published to an **event bus** and persisted to the append-only log.\n4. A **projector** subscribed to that event updates the relevant **read model** rows (recompute `progress_percent`, append to `completed_lesson_ids`).\n5. A query (`GET /learners/:id/progress`) reads the fast, denormalized read model — never the event log directly."},
    {"type":"prose","markdown":"This separation is why a swarm can scale reads independently of writes: spin up more read replicas/projections without touching the write path, and add new read models (e.g. a leaderboard) by replaying existing events — no schema migration of source-of-truth state required."},
    {"type":"callout","title":"Events are immutable","variant":"tip","markdown":"Never edit or delete a stored event. If a fact was wrong, append a compensating event (`LessonUncompleted`) rather than rewriting history. The append-only invariant is what makes replay, audit, and rebuilding new projections possible."},
    {"type":"capstone","title":"Project a leaderboard from events","instructions":"Code exercise (pseudocode or your language of choice). Given an append-only stream of `LessonCompleted(learnerId, lessonId, pathId)` events, write a projector function that builds a NEW read model not present in the source data: a per-path leaderboard mapping `pathId → [{learnerId, lessonsCompleted}]` sorted descending by lessons completed.\n\nRequirements:\n1. The projector consumes events one at a time (streaming), not a batch query of current state.\n2. It is idempotent on replay: processing the same event twice must not double-count (hint: track processed event ids or dedupe by (learnerId, lessonId)).\n3. Explain in a comment why you can build this leaderboard purely from the existing event log without changing the write model.\n\nSuccess criteria: a streaming, idempotent projector that derives a brand-new query view from the event stream, demonstrating the core CQRS/event-sourcing payoff — new read models for free by replaying events."},
    {"type":"quiz","question":"In an event-sourced, CQRS system, what is the relationship between the event log and a read model?","options":[
      "The read model is the source of truth; events are derived from it",
      "The event log is the source of truth; read models are projections rebuilt by replaying events and may lag",
      "They are the same table with two names",
      "Read models must be updated synchronously inside the command, or data is lost"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 4 — Topology Evolution
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000000',4,
  'Topology Evolution','["Dynamic agent networks","joining/leaving","adaptive"]',3,'code_exercise','c0000000-0000-4000-8000-000000000003',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "List Ruflo's topologies and what each optimizes for",
      "Explain why hierarchical-mesh is the recommended V3 hybrid",
      "Describe how the adaptive topology reshapes a swarm under load",
      "Handle agents joining and leaving a live swarm safely",
      "Choose and justify a topology for a changing workload"
    ]},
    {"type":"heading","title":"Topology is wiring, and wiring can change"},
    {"type":"prose","markdown":"In the Beginner path you picked a topology at `swarm init` and left it. At the Intermediate level, topology becomes a *living* property: agents join and leave, load shifts, and the optimal wiring changes with them.\n\nRuflo's documented topologies (from the Hive-Mind Consensus section of its CLAUDE.md):\n\n- **hierarchical** — the queen controls workers directly. Predictable routing, clear chain of command.\n- **mesh** — a fully connected peer network. Every agent reaches every other; great for small peer-to-peer swarms, but edges grow as O(n²).\n- **hierarchical-mesh** — a hybrid, and the **recommended V3 default**.\n- **adaptive** — the topology changes dynamically based on load."},
    {"type":"callout","title":"hierarchical-mesh is the V3 recommendation","variant":"info","markdown":"Ruflo's own swarm config uses `hierarchical-mesh` and labels it the anti-drift hybrid. It keeps a hierarchical backbone (a queen for authoritative coordination) while allowing mesh-style peer links among workers — you get hierarchy's predictable control plane plus mesh's direct peer communication, without the full O(n²) blow-up of pure mesh."},
    {"type":"heading","title":"Initializing and re-wiring"},
    {"type":"prose","markdown":"You set topology at init, and you are not locked in — re-initializing changes the wiring. `--max-agents` caps swarm size (default 8; the underlying tool accepts 1–50)."},
    {"code":"# Recommended V3 hybrid\nnpx ruflo@latest swarm init --topology hierarchical-mesh --max-agents 8\n\n# Let the swarm reshape itself as load changes\nnpx ruflo@latest swarm init --topology adaptive --max-agents 12\n\n# Small peer-to-peer cluster\nnpx ruflo@latest swarm init --topology mesh --max-agents 4","type":"code","caption":"Choosing topologies for different swarm shapes","language":"bash"},
    {"type":"heading","title":"Adaptive topology: reshaping under load"},
    {"type":"prose","markdown":"The **adaptive** topology treats wiring as a control variable. As the swarm's load profile changes — more agents, hotter coordination paths, bottlenecks — it adjusts the connections rather than forcing you to re-init by hand. Ruflo also exposes a matching `adaptive-coordinator` agent role and an 'Automatic Topology Selection' optimization that picks an optimal structure for the task.\n\nThe practical takeaway: for steady, well-understood workloads, pick `hierarchical-mesh` explicitly; for workloads whose shape you can't predict, let `adaptive` evolve the topology for you."},
    {"type":"prose","markdown":"Agents joining and leaving is the other half of topology evolution. From the Beginner path you already know the lifecycle (`agent spawn` → active, `agent stop` → terminated). At scale, the discipline is:\n\n- **Joining**: spawn the agent, let the swarm register it and integrate it into the current topology, then route work to it.\n- **Leaving**: drain in-flight work first, then `agent stop`. Terminating a busy agent mid-task forfeits that work.\n- **Capacity**: keep the live agent count under `--max-agents`; a join that would exceed the cap is rejected."},
    {"type":"code","code":"# Grow a live swarm: add a specialist, confirm it joined the active pool\nnpx ruflo@latest agent spawn --type performance-engineer --name perf-1\nnpx ruflo@latest agent list --filter active\n\n# Shrink safely: drain, then stop\nnpx ruflo@latest agent status perf-1     # confirm it is not 'busy'\nnpx ruflo@latest agent stop perf-1","type":"code","caption":"Agents joining and leaving a running swarm","language":"bash"},
    {"type":"callout","title":"Drain before you terminate","variant":"warning","markdown":"Topology evolution fails ugly when you yank a `busy` agent out of the graph: its task is lost and any peers waiting on it stall. Always check `agent status` and let the agent finish or hand off its work before `agent stop`. This matters even more in mesh, where many peers may depend on a single node's edges."},
    {"type":"capstone","title":"Implement an evolving topology","instructions":"Code/scripting exercise. Implement a small controller (shell script or your language of choice) that evolves a swarm for a workload that starts at 4 agents handling a steady stream of support tickets, must scale to ~20 agents during a predictable daily spike, then scale back down.\n\nYour implementation must:\n1. Initialize the swarm with a chosen topology and `--max-agents`, justified for the calm baseline.\n2. Scale up at the spike — either by switching to `--topology adaptive` (let it reshape) or by spawning agents into `hierarchical-mesh` — with a comment justifying the trade-off (control/predictability vs hands-off reshaping).\n3. Add spike agents (`agent spawn`) and remove them with a drain-then-stop sequence (`agent status` to confirm not `busy`, then `agent stop`), referencing the lifecycle states.\n4. Enforce the `--max-agents` cap: reject/skip a join that would exceed it.\n\nSuccess criteria: a runnable controller that uses real Ruflo topology/agent commands, correctly contrasts adaptive vs explicit hierarchical-mesh in a comment, performs safe join/leave (drain-before-stop), and respects the --max-agents bound."},
    {"type":"quiz","question":"Which topology does Ruflo recommend as its V3 default hybrid, and why?","options":[
      "mesh, because full connectivity is always fastest",
      "hierarchical, because a queen should make every decision alone",
      "hierarchical-mesh, because it keeps a hierarchical control backbone while allowing direct mesh peer links — predictable control plus peer communication without full O(n²) cost",
      "ring, because messages travel in a bounded circle"
    ],"answerIndex":2}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 5 — Custom Skills Development
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000000',5,
  'Custom Skills Development','["Building Ruflo skill extensions","frontmatter","progressive disclosure"]',4,'code_exercise','c0000000-0000-4000-8000-000000000004',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Explain what a Ruflo/Claude Code skill is and when to build one",
      "Use the skill-builder skill to scaffold a new skill",
      "Write valid YAML frontmatter (name, description, agents needed)",
      "Apply progressive disclosure to keep skills lean",
      "Decide when to extend Ruflo with a skill vs a plain agent prompt"
    ]},
    {"type":"heading","title":"Skills: packaged capability"},
    {"type":"prose","markdown":"A **skill** is a reusable, self-contained capability that Ruflo (and Claude Code) can load on demand — a folder with a markdown definition, optional scripts, and metadata that tells the system what the skill does and which agents it needs. Skills are how you extend the platform with domain-specific workflows without hard-coding them into agents.\n\nRuflo ships dozens of skills (swarm orchestration, github workflows, sparc methodology, and more) and — crucially — a meta-skill for building your own: **`skill-builder`**, described in the User Guide as 'Create new skills with YAML frontmatter' for 'extending the system.'"},
    {"type":"heading","title":"Scaffolding with skill-builder"},
    {"type":"prose","markdown":"The documented way to start is to invoke the `skill-builder` skill, which scaffolds the proper directory structure and frontmatter for you. From the User Guide's 'Creating Custom Skills' section, you use `skill-builder` to create your own, and it sets up the three things every skill needs: **frontmatter** (name, description, agents needed), the skill body, and supporting files."},
    {"code":"# Invoke the skill-builder skill to scaffold a new skill\n/skill-builder\n\n# It generates a skill directory, e.g.:\n#   my-skill/\n#   ├── SKILL.md        # frontmatter + instructions (the entry point)\n#   ├── scripts/        # optional helper scripts\n#   └── references/     # optional deeper docs, loaded only when needed","type":"code","caption":"Scaffold a new skill with skill-builder","language":"bash"},
    {"type":"heading","title":"Frontmatter: the skill's contract"},
    {"type":"prose","markdown":"Every skill begins with YAML frontmatter. Per the User Guide, the frontmatter declares the **name**, a **description**, and the **agents needed**. The description is load-bearing: it's what the system reads to decide *whether to invoke the skill at all*, so it should crisply state what the skill does and when to use it."},
    {"code":"---\nname: pii-redactor\ndescription: >\n  Redact personally identifiable information from text and code before storage.\n  Use when handling user-submitted content, logs, or any data that may contain\n  emails, names, or credentials prior to persisting or sharing it.\nagents:\n  - security-auditor\n  - reviewer\n---\n\n# PII Redactor\n\nWhen invoked, scan the provided content for the 14 PII types, apply the\nconfigured policy (BLOCK / REDACT / HASH / PASS), and return sanitized output.\n\n## Steps\n1. Detect PII spans.\n2. Apply the per-type policy.\n3. Emit a summary of what was redacted.","type":"code","caption":"A minimal SKILL.md with valid frontmatter","language":"markdown"},
    {"type":"callout","title":"The description is a routing signal","variant":"info","markdown":"Skills are loaded by description-matching: a vague description means the skill is never triggered when it should be. Write descriptions that name concrete triggers ('Use when…') rather than abstract capabilities. This is the single highest-leverage thing you can do for a custom skill's usefulness."},
    {"type":"heading","title":"Progressive disclosure"},
    {"type":"prose","markdown":"Skills follow **progressive disclosure**: the top-level `SKILL.md` stays short — just enough for the system to decide to use the skill and perform the common path. Deeper detail (long references, edge-case docs, large examples) lives in separate files that are loaded *only when needed*.\n\nThe reason is cost and focus: the frontmatter and body are read frequently to route and run the skill, so keeping them lean avoids paying for detail you rarely need. Push the heavy material into `references/` and link to it from the body."},
    {"type":"callout","title":"Don't dump everything into SKILL.md","variant":"warning","markdown":"A 600-line SKILL.md defeats progressive disclosure — every invocation now pays to read material it won't use. Keep SKILL.md to the contract plus the happy path; move exhaustive option tables, troubleshooting, and big code samples into separate reference files the skill loads on demand."},
    {"type":"prose","markdown":"When should you build a skill at all? Build one when a workflow is (a) reusable across tasks, (b) worth packaging with its own scripts/references, and (c) worth being discoverable by description. For a one-off instruction, a plain agent prompt is lighter. Skills are for *capabilities you'll reach for again*."},
    {"type":"capstone","title":"Author a custom skill","instructions":"Code/authoring exercise. Create a new skill (scaffold mentally or with skill-builder) for a capability of your choice — e.g. 'generate a CHANGELOG entry from a git diff.'\n\nDeliver:\n1. A valid `SKILL.md` frontmatter block with `name`, a trigger-oriented `description` (must include at least one concrete 'Use when…' clause), and the `agents` it needs.\n2. A short skill body describing the happy-path steps (≤ ~15 lines).\n3. A one-sentence note stating WHAT you would push into a `references/` file instead of the body, and WHY (progressive disclosure).\n4. A one-sentence justification of why this is worth a skill rather than a plain prompt.\n\nSuccess criteria: valid frontmatter with a routing-friendly description, a lean body, an explicit progressive-disclosure decision, and a reuse justification."},
    {"type":"quiz","question":"Why does Ruflo keep the top-level SKILL.md short and push detailed material into separate reference files?","options":[
      "Because YAML cannot exceed a fixed size",
      "Progressive disclosure: the frontmatter/body are read frequently to route and run the skill, so keeping them lean avoids paying for detail that's rarely needed; heavy docs load on demand",
      "Because skills are not allowed to contain code samples",
      "To hide the skill's purpose from the routing system"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 6 — Performance Optimization
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000000',6,
  'Performance Optimization','["Profiling","bottleneck detection","benchmarking"]',3,'code_exercise','c0000000-0000-4000-8000-000000000005',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Use the performance command group: benchmark, profile, metrics, optimize, report",
      "Run a benchmark suite and read the result",
      "Find bottlenecks with the bottleneck-detection tooling",
      "Apply HNSW vector search and quantization as concrete optimizations",
      "Measure before and after — never optimize on a hunch"
    ]},
    {"type":"heading","title":"Measure, don't guess"},
    {"type":"prose","markdown":"Ruflo provides a dedicated **performance** command group with five subcommands: `benchmark`, `profile`, `metrics`, `optimize`, and `report`. The discipline this lesson teaches is simple and non-negotiable: **measure first**. You benchmark to get a baseline, profile to locate the hot path, change one thing, then benchmark again to confirm the win."},
    {"code":"# Establish a baseline across the full suite\nnpx ruflo@latest performance benchmark --suite all\n\n# Profile to locate hot paths\nnpx ruflo@latest performance profile\n\n# Pull current metrics and generate a report\nnpx ruflo@latest performance metrics\nnpx ruflo@latest performance report","type":"code","caption":"The performance command group","language":"bash"},
    {"type":"callout","title":"The numbers are measured, and honest","variant":"info","markdown":"Ruflo's own benchmark table is refreshingly candid: HNSW search is measured at ~1.9x at N=20k and ~3.2x–4.7x at N=5k vs brute force (recall@10 ~0.99) — and it explicitly notes the headline '150x–12,500x' figure was NOT reproduced (it was a brute-force fallback). Treat every speedup claim — including your own — as a hypothesis until a benchmark confirms it on your data and host."},
    {"type":"heading","title":"Finding bottlenecks"},
    {"type":"prose","markdown":"Ruflo ships a **Bottleneck Analysis** capability for real-time performance monitoring and proactive issue detection, plus performance-focused agent roles: `perf-analyzer` and `performance-benchmarker` (and the higher-level `performance-engineer` specialist you can spawn directly). The workflow is: detect the bottleneck, attribute it to a component, then optimize that component specifically — not the whole system."},
    {"code":"# Spawn a performance specialist to analyze a hot module\nnpx ruflo@latest agent spawn --type performance-engineer --name perf-1\n\n# Or dispatch the optimize background worker after a perf change\nnpx ruflo@latest hooks worker dispatch --trigger optimize","type":"code","caption":"Specialist agents and the optimize background worker","language":"bash"},
    {"type":"heading","title":"Two concrete optimizations: HNSW and quantization"},
    {"type":"prose","markdown":"For memory/retrieval-heavy swarms, two measured optimizations matter:\n\n- **HNSW indexing** — approximate nearest-neighbor search over vectors. It beats brute force *above a crossover point*: measured ~3.2x–4.7x at N=5k and ~1.9x at N=20k with recall@10 ~0.99. Below the crossover, brute force can tie or win — so HNSW is a scale optimization, not a free lunch.\n- **Quantization** — compress vectors to shrink memory: Int8 gives 3.84x compression with reconstruction cosine 0.99999; RaBitQ gives 32x compression at 0.60ms/query on a ~14.8k-vector index.\n\nThese are real, measured numbers from Ruflo's benchmark table — useful as a model for how to *report* an optimization (state the metric, the conditions, and the recall/accuracy cost)."},
    {"type":"callout","title":"Optimizations have crossover points","variant":"warning","markdown":"HNSW is the textbook example: it 'ties or loses below the crossover' and only wins at scale. Always benchmark at YOUR data size. An optimization that helps at N=20k can hurt at N=500. This is why the rule is benchmark → change → benchmark, not benchmark → assume."},
    {"type":"prose","markdown":"Beyond the swarm, watch your **token** cost: Ruflo treats token efficiency as a first-class performance concern (it reports figures like a ~32% reduction from ReasoningBank retrieval). Profiling agent runs for redundant context and trimming it is often the cheapest, biggest win — no algorithmic change required."},
    {"type":"capstone","title":"Optimize with evidence","instructions":"Code/measurement exercise. Take any function or query you control that does similarity lookups or repeated work, and run a measure → change → measure loop.\n\nDeliver:\n1. A baseline measurement (timing or a `performance benchmark` run) with the conditions stated (N, host, what's measured).\n2. ONE optimization applied (e.g. add an index, switch to HNSW above your crossover, cache a hot result, or trim redundant context).\n3. A second measurement under identical conditions.\n4. A short report (the format of `performance report`) stating the before/after numbers, the speedup, and any accuracy/recall cost.\n5. A sentence on the crossover/conditions under which your optimization would STOP being worthwhile.\n\nSuccess criteria: a controlled before/after with stated conditions, an honest speedup number including any accuracy trade-off, and explicit reasoning about when the optimization no longer pays — mirroring how Ruflo reports its own measured (not aspirational) numbers."},
    {"type":"quiz","question":"Ruflo's benchmark table reports HNSW search as ~1.9x–4.7x vs brute force and notes the headline 150x–12,500x figure was NOT reproduced. What is the correct lesson for your own optimization work?","options":[
      "Always assume the maximum advertised speedup; benchmarks are formalities",
      "Optimizations like HNSW have crossover points and accuracy costs — measure on your own data size and host, and report honest before/after numbers",
      "Never use HNSW because it is slower than brute force",
      "Token cost is irrelevant to performance"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 7 — Security Hardening
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000000',7,
  'Security Hardening','["Agent authentication","authorization","AI defence gates"]',3,'review_checklist','c0000000-0000-4000-8000-000000000006',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Run Ruflo's security scanning across the project",
      "Apply the canonical 3-gate AI Defence pattern (PII, sanitize, injection)",
      "Authenticate agents and reason about a trust model",
      "Spawn security specialists (security-architect, security-auditor)",
      "Build a security review checklist for an agent system"
    ]},
    {"type":"heading","title":"Hardening a swarm"},
    {"type":"prose","markdown":"An agent system has a wide attack surface: untrusted input flows into prompts, agents read and write data, and (from Lesson 8) agents may talk across organizations. Ruflo gives you a **security** command group with six subcommands — `scan`, `audit`, `cve`, `threats`, `validate`, `report` — plus dedicated agent roles (`security-architect`, `security-auditor`, `security-manager`)."},
    {"code":"# Scan the project for security issues at full depth\nnpx ruflo@latest security scan --depth full\n\n# Spawn a security specialist to drive a hardening pass\nnpx ruflo@latest agent spawn --type security-architect --name sec-arch\nnpx ruflo@latest agent spawn --type security-auditor --name sec-audit\n\n# Dispatch the audit background worker after security changes\nnpx ruflo@latest hooks worker dispatch --trigger audit","type":"code","caption":"Security scanning and specialist agents","language":"bash"},
    {"type":"heading","title":"The canonical 3-gate AI Defence pattern"},
    {"type":"prose","markdown":"Ruflo's AI Defence layer (AIDefence) defines a canonical **3-gate** pattern for any content flowing through agents. The three gates, with their tool calls:\n\n1. **Pre-storage PII** (`aidefence_has_pii`) — detect personally identifiable information before persisting it.\n2. **Sanitization** (`aidefence_scan`) — clean/validate content before it moves.\n3. **Prompt-injection** (`aidefence_is_safe`) — verify inbound content is not an injection/jailbreak before it reaches an agent.\n\nThe `aidefence@2.3.0` upgrade widened Gate 3's injection surface to catch the 'ignore all previous instructions' family, role-hijack ('you are now…', 'act as…', 'pretend to be…'), and jailbreak markers ('DAN mode', 'developer mode', 'god mode', 'root mode')."},
    {"code":"// The 3 gates, applied to a piece of user-submitted content (MCP tools):\n//   Gate 1  tool: aidefence_has_pii   → block/redact/hash before storage\n//   Gate 2  tool: aidefence_scan      → sanitize before the content moves\n//   Gate 3  tool: aidefence_is_safe   → reject prompt-injection before it reaches an agent\n// Order and intent are fixed; specializations (e.g. federation) extend, not reorder, these gates.","type":"code","caption":"The canonical 3-gate AI Defence flow","language":"javascript"},
    {"type":"callout","title":"Gate order is intentional — don't reorder it","variant":"warning","markdown":"PII detection comes before storage, sanitization before movement, injection-checking before the content reaches an agent. Specializations (like federation's richer PII pipeline) extend these gates but keep the same ordering and intent. Reordering — e.g. running the injection check after content already hit an agent — defeats the gate."},
    {"type":"heading","title":"Authentication, authorization, and trust"},
    {"type":"prose","markdown":"Hardening also means agents proving who they are and being allowed only what they need. This is the foundation Lesson 8 (federation) builds on, where agents 'prove identity via mTLS + ed25519 before any data moves' and operate under a **5-tier trust model**: UNTRUSTED → VERIFIED → ATTESTED → TRUSTED → PRIVILEGED, with behavioral scoring.\n\nThe principle to internalize now: **authenticate before you authorize, and authorize by least privilege**. An agent's trust tier should gate what data and actions it can reach — an UNTRUSTED peer gets nothing sensitive; only ATTESTED-and-above peers handle regulated data."},
    {"type":"callout","title":"Least privilege for agents","variant":"tip","markdown":"When spawning agents, give them the narrowest capability that does the job. Ruflo's headless mode demonstrates the idea with `claude -p --allowedTools \"Read,Grep,Glob\"` — a read-only investigator can't write or run commands. Scope tools and trust tiers the same way you'd scope an IAM role."},
    {"type":"prose","markdown":"Finally, compliance is a first-class concern, not an afterthought. Ruflo's federation layer treats **HIPAA, SOC2, and GDPR** audit trails as primitives, backed by the `audit` background worker and structured audit logs. If you handle regulated data, wire the audit trail in from the start so every cross-agent message is accountable."},
    {"type":"capstone","title":"Write a security review checklist","instructions":"Produce a security review checklist (8-12 items) you would run against any Ruflo agent system before it touches user data. It MUST include, at minimum:\n\n1. A line for each of the 3 AI Defence gates, naming the tool and where in the flow it runs (storage / movement / inbound-to-agent).\n2. An authentication item (how agents prove identity) and an authorization item (least-privilege tool/data scoping).\n3. A trust-model item referencing the 5 tiers and which tiers may handle sensitive data.\n4. A `security scan` step and an `audit` background-worker / audit-trail step.\n5. A compliance line (HIPAA/SOC2/GDPR) if regulated data is in scope.\n\nSuccess criteria: a concrete, runnable checklist that correctly orders the 3 gates, separates authentication from authorization, references the 5-tier trust model and least privilege, and includes scanning + audit-trail steps."},
    {"type":"quiz","question":"What is the correct order of Ruflo's canonical 3-gate AI Defence pattern?","options":[
      "Prompt-injection check after the agent responds → sanitize → store",
      "Pre-storage PII (aidefence_has_pii) → sanitization (aidefence_scan) → prompt-injection check (aidefence_is_safe) before content reaches an agent",
      "Sanitize → store → check PII only if an incident occurs",
      "There is no fixed order; gates can run in any sequence"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 8 — Multi-Domain Orchestration (Federation)
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000000',8,
  'Multi-Domain Orchestration','["Cross-domain agents","federation","zero-trust"]',4,'design_document','c0000000-0000-4000-8000-000000000007',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Explain cross-installation agent federation and its zero-trust model",
      "Use the federation commands: init, status, audit",
      "Apply the 5-tier trust model to cross-domain agents",
      "Configure the budget circuit breaker (maxHops/maxTokens/maxUsd)",
      "Use Byzantine consensus for state mutations across untrusted peers"
    ]},
    {"type":"heading","title":"Beyond one swarm: federation"},
    {"type":"prose","markdown":"Everything so far lived inside a single Ruflo installation. **Federation** connects agents across installations — different machines, teams, or organizations. Ruflo describes its federation plugin as 'the comms layer for multi-agent AI: cross-installation agent federation with zero-trust security, PII-gated data flow, and compliance-grade audit trails.'\n\nThe defining stance is **zero-trust**: agents discover peers and *prove identity via mTLS + ed25519 before any data moves*. No peer is trusted by default."},
    {"type":"heading","title":"The 5-tier trust model"},
    {"type":"prose","markdown":"Federated peers are placed on a 5-tier trust ladder, with behavioral scoring promoting or demoting them over time:\n\n**UNTRUSTED → VERIFIED → ATTESTED → TRUSTED → PRIVILEGED**\n\nTrust level drives policy. The PII pipeline (a richer specialization of Lesson 7's 3-gate pattern) applies per-trust-level policies — `BLOCK`, `REDACT`, `HASH`, or `PASS` — across 14 PII types. An UNTRUSTED peer might have everything BLOCKed; a PRIVILEGED peer might PASS. Trust is earned and revocable, not granted once."},
    {"type":"code","code":"# Initialize federation on this node (generates an ed25519 keypair)\n/federation-init\n\n# Inspect peers, sessions, trust levels, and health\n/federation-status\n\n# Query structured audit logs with compliance filtering (HIPAA/SOC2/GDPR)\n/federation-audit","type":"code","caption":"The federation command group","language":"bash"},
    {"type":"prose","markdown":"Identity has two layers. Inside a trusted network (a tailnet), WireGuard provides TLS-equivalent confidentiality and per-node identity, and the federation **ed25519 keypair is layered on top** for application-level message signing. Crossing trust domains, federation adds `wss://` (TLS-secured WebSocket) with **certificate pinning** — `tls.pinnedFingerprints` with a fail-closed `checkServerIdentity` (pinning IS the trust). The plugin will not silently ignore CA validation."},
    {"type":"callout","title":"Pinning is fail-closed by design","variant":"info","markdown":"Federation's TLS uses sha256 fingerprint pinning per certificate and rejects anything that doesn't match — `rejectUnauthorized=false` with pinning as the actual trust anchor. ADR-107 is explicit that there is no client-side CA-trust override: the plugin 'won't ignore CA validation when pinning is off — that would be silently insecure.'"},
    {"type":"heading","title":"The budget circuit breaker"},
    {"type":"prose","markdown":"Federated delegation can cascade: peer A asks peer B, who asks peer C, … — an unbounded fan-out that runs up cost or loops forever. Federation's **budget circuit breaker** (ADR-097) caps this. `/federation send` accepts `--max-hops`, `--max-tokens`, and `--max-usd`, summed across the whole hop chain."},
    {"code":"# Delegate a task across the federation with hard budget caps\n/federation send <node-id> task-assignment '{\"task\":\"reconcile ledgers\"}' \\\n  --max-hops 4 \\\n  --max-tokens 50000 \\\n  --max-usd 0.25","type":"code","caption":"Bounding a federated delegation","language":"bash"},
    {"type":"callout","title":"Defaults and ceilings","variant":"warning","markdown":"`maxHops` defaults to 8 (0 disallows remote delegation entirely; hard ceiling 64). `maxTokens` and `maxUsd` are unbounded unless set (hard ceilings 1B tokens / $1M). Errors surface as constant strings — `HOP_LIMIT_EXCEEDED` / `BUDGET_EXCEEDED` — that deliberately do NOT echo remaining budget, so a malicious caller can't use response codes as an oracle to probe your thresholds."},
    {"type":"heading","title":"Consensus across untrusted peers"},
    {"type":"prose","markdown":"Now Lesson 1 pays off. Across a federation you cannot assume peers are honest, so state mutations use **Byzantine consensus** (BFT) — the same `f < n/3` protocol — to agree despite potentially lying peers. Federation also reuses the AI Defence gates from Lesson 7 as HMAC-signed envelopes with dual gates (outbound and inbound). Federation isn't a new security model; it's the composition of Byzantine consensus + zero-trust identity + the 3-gate AI Defence pattern across installation boundaries."},
    {"type":"capstone","title":"Design a federated multi-org workflow","instructions":"Write a one-page design document for a workflow where your organization's agents must collaborate with a partner organization's agents to settle a shared transaction, without either side fully trusting the other.\n\nYour document must:\n1. Describe the bootstrap: `/federation-init`, identity proof via mTLS + ed25519, and (for cross-domain) wss cert pinning — and why pinning is fail-closed.\n2. Assign each participating peer a starting trust tier from the 5-tier model and state which PII policy (BLOCK/REDACT/HASH/PASS) applies to the partner's UNTRUSTED/VERIFIED agents.\n3. Specify the consensus strategy for committing the settlement state across untrusted peers, with the fault bound, and justify it over Raft.\n4. Set a budget circuit breaker (`--max-hops/--max-tokens/--max-usd`) and explain what `HOP_LIMIT_EXCEEDED` protects against.\n5. Name the compliance audit mode (HIPAA/SOC2/GDPR) and how `/federation-audit` provides accountability.\n\nSuccess criteria: a coherent zero-trust design that correctly uses ed25519/mTLS + pinning, the 5-tier trust model with per-tier PII policy, Byzantine (f < n/3) for cross-org state, a bounded budget breaker, and a compliance/audit trail."},
    {"type":"quiz","question":"Why does federation use Byzantine consensus (rather than Raft) for state mutations across federation peers?","options":[
      "Because Raft is deprecated in Ruflo",
      "Because federated peers are untrusted and may return malicious/conflicting results, so agreement must hold despite lying peers (Byzantine, f < n/3) — Raft only tolerates crashes",
      "Because Byzantine consensus is always faster",
      "Because federation does not need any consensus"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 9 — Real-Time Coordination
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000009','c0000000-0000-4000-8000-000000000000',9,
  'Real-Time Coordination','["Low-latency patterns","message ordering","comms-first"]',3,'code_exercise','c0000000-0000-4000-8000-000000000008',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Explain comms-first coordination: named agents talking via SendMessage",
      "Apply the three coordination patterns: pipeline, fan-out/fan-in, supervisor/worker",
      "Reason about message ordering and why it matters for low latency",
      "Use SendMessage to redirect priorities mid-flight",
      "Pick a coordination pattern for a real-time workload"
    ]},
    {"type":"heading","title":"Comms-first: agents talk to each other"},
    {"type":"prose","markdown":"Ruflo v3.6 is built around **comms-first coordination**: named agents communicate in real time via `SendMessage`, and 'the comms system is the primary coordination mechanism — agents talk to each other, not just to the lead.' This replaces polling and shared-state coordination with direct, low-latency messaging.\n\nTwo rules make it work: every agent MUST have a `name` so it's addressable, and coordination happens by sending messages, not by checking a shared store."},
    {"type":"code","code":"// SendMessage protocol (from Ruflo's CLAUDE.md)\n\n// Lead → teammate: assign work\nSendMessage({ to: \"developer\", summary: \"Implement auth\", message: \"Build OAuth2 flow...\" })\n\n// Lead → teammate: redirect priorities mid-flight (no restart needed)\nSendMessage({ to: \"developer\", summary: \"Prioritize auth\", message: \"Auth endpoint is blocking tester, do it first.\" })\n\n// Pass one agent's output as another's input\nSendMessage({ to: \"tester\", summary: \"Architect output\", message: \"The architect designed these endpoints: [...]. Write tests for them.\" })\n\n// Graceful shutdown\nSendMessage({ to: \"developer\", message: { type: \"shutdown_request\" } })","type":"code","caption":"The SendMessage protocol","language":"javascript"},
    {"type":"heading","title":"Three coordination patterns"},
    {"type":"prose","markdown":"Ruflo documents three real-time coordination patterns. Pick the one whose data flow matches your workload:\n\n- **Pipeline (A → B → C)** — each agent messages the next when done. Use for sequential dependencies (e.g. architect → developer → tester → reviewer). Tell each agent WHO to message next in its prompt.\n- **Fan-out / fan-in** — the lead spawns parallel agents and collects results. Use for independent parallel work (e.g. three researchers). Spawn with `run_in_background: true`; results arrive as task completions.\n- **Supervisor / worker** — the lead assigns tasks and workers report back. Use for ongoing coordination where the lead steers continuously."},
    {"code":"// Pipeline: each agent told who to message next\nAgent({ name: \"architect\", prompt: \"Design the API. SendMessage your design to 'developer'.\", run_in_background: true })\nAgent({ name: \"developer\", prompt: \"Wait for 'architect'. Implement it. SendMessage code paths to 'tester'.\", run_in_background: true })\nAgent({ name: \"tester\",    prompt: \"Wait for 'developer'. Write tests. SendMessage results to 'reviewer'.\", run_in_background: true })\n\n// Kick off the pipeline\nSendMessage({ to: \"architect\", summary: \"Start\", message: \"[task context]\" })","type":"code","caption":"A pipeline of named agents coordinating via SendMessage","language":"javascript"},
    {"type":"callout","title":"Name every agent","variant":"info","markdown":"Comms-first coordination only works if agents are addressable. Always pass `name: \"role\"` and tell each agent, in its prompt, WHO it messages next (pipeline) or that it reports back to the lead (supervisor). An unnamed agent can receive work but can't be the target of a SendMessage."},
    {"type":"heading","title":"Latency and ordering"},
    {"type":"prose","markdown":"Real-time coordination lives or dies on two properties:\n\n- **Latency** — direct SendMessage avoids the poll-interval delay of shared-state coordination. Don't reintroduce latency by having agents busy-poll a store; let messages arrive.\n- **Ordering** — when order matters (B must process A's outputs in sequence), a **pipeline** enforces it structurally: B only acts on what A sends, in the order A sends it. Fan-out deliberately gives up ordering for parallelism, then fans back in. Choose the pattern that matches your ordering requirement rather than bolting ordering onto the wrong one."},
    {"type":"callout","title":"Don't poll — let messages drive","variant":"warning","markdown":"The anti-pattern is agents repeatedly checking shared state for updates: it adds latency, wastes tokens, and races. Ruflo's rule is explicit — 'NEVER poll status; agents message back or complete automatically.' If you find yourself writing a poll loop between agents, you've stepped outside comms-first coordination."},
    {"type":"prose","markdown":"For the lowest-latency interactive work, the lead can also redirect priorities *without restarting* an agent — the second SendMessage example above re-prioritizes a running developer mid-task. That live steering is what makes the supervisor/worker pattern feel real-time."},
    {"type":"capstone","title":"Build a real-time coordination flow","instructions":"Code/design exercise. Implement (in pseudocode or your language) a real-time coordination flow for a live order-processing scenario: validate → price → confirm, where each stage must run in order, but a 'cancel' message from the lead can pre-empt a stage mid-flight.\n\nDeliver:\n1. A named-agent pipeline (validate → price → confirm) where each agent SendMessages the next, with the kickoff message shown.\n2. A justification of why pipeline (not fan-out) is correct here, referencing ordering.\n3. A SendMessage that the lead uses to pre-empt/cancel a running stage, and which agent it targets.\n4. One sentence explaining how this avoids polling, and why that lowers latency.\n\nSuccess criteria: a correctly named pipeline with explicit next-hop messaging, a sound ordering justification for choosing pipeline, a mid-flight redirect via SendMessage, and an articulation of the no-poll/low-latency benefit."},
    {"type":"quiz","question":"In Ruflo's comms-first model, how do agents coordinate, and what is the explicit anti-pattern?","options":[
      "They poll a shared database on an interval; messaging is discouraged",
      "Named agents communicate directly via SendMessage; the anti-pattern is polling shared state (agents should message back or complete automatically)",
      "They communicate only through the lead, never with each other",
      "Coordination requires no names because messages are broadcast to everyone"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 10 — Capstone Part 1: Design
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000010','c0000000-0000-4000-8000-000000000000',10,
  'Capstone Part 1: Design','["Design federated trading swarm","architecture"]',4,'architecture_doc','c0000000-0000-4000-8000-000000000009',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Frame the Intermediate capstone: a federated trading swarm",
      "Decompose the system into agents, roles, and a topology",
      "Choose consensus and state strategies from Lessons 1-3",
      "Apply federation + security decisions from Lessons 7-8",
      "Produce an architecture document the next three lessons implement"
    ]},
    {"type":"heading","title":"The capstone: a federated trading swarm"},
    {"type":"prose","markdown":"The Intermediate capstone runs across the final five lessons (PRD §4.4): **design (this lesson) → implement → test → deploy → reflect**. The system is a **federated trading swarm** — multiple agents that ingest market signals, agree on trades, persist positions, and run across more than one installation/organization with a zero-trust boundary.\n\nThis lesson produces only the **architecture document**. No code yet. Every decision here is justified by an earlier lesson, so the document doubles as proof you can compose the path's concepts."},
    {"type":"heading","title":"Decompose into agents and topology"},
    {"type":"prose","markdown":"Start by naming the agents and their roles (Beginner-path lifecycle still applies — every agent is spawned, named, and torn down):\n\n- **signal** agents (`researcher`) — ingest and summarize market data.\n- **strategist** agents (`architect`/`coordinator`) — propose trades.\n- **risk** agent (`reviewer`/`security-auditor`) — vetoes trades that breach limits.\n- **executor** agent (`coder`) — places the agreed trade and records the position.\n\nThen choose the **topology** (Lesson 4). `hierarchical-mesh` is the sensible default: a queen coordinates while strategists and risk agents talk peer-to-peer. If load is spiky, justify `adaptive` instead."},
    {"type":"code","code":"# Sketch the swarm you will build in Part 2 (commands, not yet run)\nnpx ruflo@latest swarm init --topology hierarchical-mesh --max-agents 8\nnpx ruflo@latest agent spawn --type researcher --name signal-1\nnpx ruflo@latest agent spawn --type architect  --name strategist-1\nnpx ruflo@latest agent spawn --type security-auditor --name risk-1\nnpx ruflo@latest agent spawn --type coder      --name executor-1","type":"code","caption":"The intended swarm shape (design artifact, not execution)","language":"bash"},
    {"type":"heading","title":"Consensus, state, and the trust boundary"},
    {"type":"prose","markdown":"Three cross-cutting decisions, each pinned to a lesson:\n\n- **Consensus on trades** (Lessons 1-2): trades are committed across *untrusted federation peers*, so use **Byzantine** consensus (`f < n/3`), not Raft. Within a single trusted installation, `raft` could coordinate the internal queen — state your boundary.\n- **State** (Lesson 3): persist positions and decisions with **event sourcing**; expose dashboards via **CQRS read models** rebuilt by projectors. Trades are events; the portfolio is a projection.\n- **Federation + security** (Lessons 7-8): peers prove identity via mTLS + ed25519; apply the **5-tier trust model** with per-tier PII policy; run the **3-gate AI Defence** on inbound signals; bound delegation with the **budget circuit breaker**."},
    {"type":"callout","title":"Every decision must cite a lesson","variant":"info","markdown":"This is a synthesis exercise. A grader should be able to point at each architectural choice — topology, consensus, state model, trust tiers, budget caps — and trace it to the Intermediate lesson that justifies it. If a decision has no lesson behind it, either justify it explicitly or reconsider it."},
    {"type":"prose","markdown":"Finally, define the **events** your trading domain emits — they are the contract Part 2 implements and Part 3 tests. A reasonable set: `SignalReceived`, `TradeProposed`, `TradeApproved` / `TradeRejected`, `TradeExecuted`, `PositionUpdated`. These are immutable facts; the portfolio read model is folded from them."},
    {"type":"callout","title":"Design the failure cases now","variant":"warning","markdown":"Cheap to design, expensive to retrofit: what happens when a federation peer goes silent mid-vote? When the budget circuit breaker trips (`BUDGET_EXCEEDED`) on a delegation chain? When a projection lags behind the latest `TradeExecuted` event? Name these failure modes in the document so Parts 2-4 have something to build and test against."},
    {"type":"capstone","title":"Author the trading-swarm architecture document","instructions":"Produce the architecture document for the federated trading swarm. It MUST contain:\n\n1. **Agents & roles** — the named agents and their Ruflo agent types.\n2. **Topology** — chosen topology with `--max-agents`, justified from Lesson 4.\n3. **Consensus** — strategy for committing trades across untrusted peers, with the fault bound, and where (if anywhere) Raft applies internally. Cite Lessons 1-2.\n4. **State model** — event sourcing + the CQRS read models, with the event list. Cite Lesson 3.\n5. **Federation & security** — identity (mTLS/ed25519 + pinning), 5-tier trust + per-tier PII policy, the 3 AI Defence gates, and budget caps. Cite Lessons 7-8.\n6. **Failure cases** — at least three named failure modes with intended handling.\n\nSuccess criteria: a complete architecture doc where every major decision cites the Intermediate lesson that justifies it, with an explicit event list and named failure cases — directly buildable by Part 2."},
    {"type":"quiz","question":"For committing trades across untrusted federation peers in the capstone, which consensus strategy is correct and why?","options":[
      "Raft, because it is the cheapest option in all cases",
      "Byzantine (f < n/3), because federation peers are untrusted and may return malicious/conflicting results; Raft only tolerates crash faults among trusted nodes",
      "Gossip, because trades only need eventual consistency",
      "No consensus is needed; the executor decides alone"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 11 — Capstone Part 2: Implement
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000011','c0000000-0000-4000-8000-000000000000',11,
  'Capstone Part 2: Implement','["Build trading system with persistence","event sourcing"]',5,'code_exercise','c0000000-0000-4000-8000-000000000010',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Stand up the swarm and agents your Part 1 design specified",
      "Implement the event-sourced write model and emit domain events",
      "Materialize a CQRS read model with a projector",
      "Wire consensus into trade approval",
      "Use memory (memory_store / memory_search) for shared swarm context"
    ]},
    {"type":"heading","title":"From document to running swarm"},
    {"type":"prose","markdown":"Part 2 implements the architecture from Part 1. You'll stand up the swarm, implement the event-sourced domain, add a projector for the read model, and persist shared context in memory. The capstone is allotted 5 hours here because implementation is the heavy lift.\n\nStart by realizing the swarm shape you sketched — same commands, now run for real, with the agents named exactly as the document specifies so the rest of the team (and your future self) can address them."},
    {"code":"# Stand up the swarm from the Part 1 design\nnpx ruflo@latest swarm init --topology hierarchical-mesh --max-agents 8\nnpx ruflo@latest agent spawn --type researcher --name signal-1\nnpx ruflo@latest agent spawn --type architect  --name strategist-1\nnpx ruflo@latest agent spawn --type security-auditor --name risk-1\nnpx ruflo@latest agent spawn --type coder      --name executor-1\nnpx ruflo@latest agent list --filter active","type":"code","caption":"Realize the designed swarm","language":"bash"},
    {"type":"heading","title":"Event-sourced write model"},
    {"type":"prose","markdown":"Implement the domain as an append-only event log (Lesson 3). Commands validate invariants and emit events; never mutate state in place. The events from your Part 1 design — `SignalReceived`, `TradeProposed`, `TradeApproved`/`TradeRejected`, `TradeExecuted`, `PositionUpdated` — become the source of truth."},
    {"code":"// Event-sourced write model (pseudocode)\nfunction proposeTrade(cmd) {\n  // 1. validate invariants (e.g. within risk limits)\n  if (exceedsRiskLimit(cmd)) return emit({ type: \"TradeRejected\", reason: \"risk\" });\n  // 2. emit an immutable event — do NOT overwrite state\n  return emit({ type: \"TradeProposed\", id: cmd.id, symbol: cmd.symbol, qty: cmd.qty });\n}\n\n// Current portfolio = fold over the event log\nfunction portfolio(events) {\n  return events.reduce(applyEvent, { positions: {} });\n}","type":"code","caption":"Append events; derive state by folding the log","language":"javascript"},
    {"type":"heading","title":"Projector → CQRS read model"},
    {"type":"prose","markdown":"A **projector** subscribes to the event stream and materializes a denormalized **read model** for fast queries (the same pattern this learning platform uses). The projector must be idempotent on replay and track how far it has caught up."},
    {"code":"-- Portfolio read model (CQRS projection)\nCREATE TABLE portfolio_read_model (\n  account_id           UUID,\n  symbol               TEXT,\n  net_position         NUMERIC DEFAULT 0,\n  last_synced_event_id UUID,\n  PRIMARY KEY (account_id, symbol)\n);\n-- The projector consumes TradeExecuted/PositionUpdated events and upserts rows.","type":"code","caption":"A CQRS read model the projector maintains","language":"sql"},
    {"type":"heading","title":"Consensus on trade approval"},
    {"type":"prose","markdown":"Trade approval runs through consensus (Lessons 1-2, 8). Within a trusted internal swarm, the queen can coordinate via `raft`; across untrusted federation peers, use **Byzantine** (`f < n/3`). From inside Claude Code, `hive-mind_consensus` runs the vote and returns the agreed decision; on the CLI you spawn the hive-mind with the chosen `--consensus`."},
    {"code":"# Spawn the approval hive-mind for the trusted internal path\nnpx ruflo@latest hive-mind spawn \"Approve proposed trades against risk limits\" \\\n  --consensus raft --queen-type tactical\n\n# (Cross-org commits would instead use --consensus byzantine — see Lesson 8)","type":"code","caption":"Consensus-gated trade approval","language":"bash"},
    {"type":"callout","title":"Shared context goes in memory, not prompts","variant":"tip","markdown":"Use Ruflo's memory tools to share state across agents instead of stuffing everything into prompts: `memory_store` to persist a decision/pattern and `memory_search` for HNSW-indexed semantic retrieval. Namespace your entries (e.g. a `trading` namespace) so agents can recall prior signals and approvals without re-deriving them."},
    {"type":"code","code":"# Persist a successful approval pattern, then recall it later (CLI form)\nnpx ruflo@latest memory store --namespace trading \\\n  --key \"approval-AAPL-2026-06\" --value \"approved 100 AAPL; risk ok; quorum 2/3\"\n\nnpx ruflo@latest memory search --query \"AAPL approval risk\" --namespace trading","type":"code","caption":"Shared swarm memory via memory store/search","language":"bash"},
    {"type":"callout","title":"Don't terminate busy agents","variant":"warning","markdown":"As you iterate, you'll restart parts of the swarm. Drain in-flight work and confirm an agent isn't `busy` before `agent stop` (Lesson 4). Killing the executor mid-trade or the projector mid-replay leaves your event log and read model inconsistent — exactly the failure case Part 1 told you to design for."},
    {"type":"capstone","title":"Implement the trading core","instructions":"Implement (in your language of choice; pseudocode acceptable where infra isn't available) the core of the federated trading swarm from your Part 1 design:\n\n1. Stand up the swarm and named agents (or stub them) matching the design document.\n2. An event-sourced write model that validates a risk invariant and emits `TradeProposed` / `TradeApproved` / `TradeRejected` / `TradeExecuted` events — appending, never overwriting.\n3. A projector that builds a portfolio read model from those events, idempotent on replay, tracking `last_synced_event_id`.\n4. A consensus-gated approval step (`hive-mind_consensus` / `--consensus`), with a comment stating raft vs byzantine and why for your trust boundary.\n5. At least one `memory_store` + `memory_search` use to share context across agents.\n\nSuccess criteria: appended (not mutated) events, an idempotent projector producing a queryable read model, a consensus-gated approval with a justified strategy, and shared memory usage — a working core Part 3 can test."},
    {"type":"quiz","question":"When implementing the event-sourced trading core, what must the projector guarantee?","options":[
      "It must overwrite the event log with the latest portfolio state",
      "It must be idempotent on replay (processing the same event twice doesn't double-count) and track how far it has caught up (last_synced_event_id)",
      "It must run synchronously inside every command or trades are lost",
      "It must delete events older than the current position"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 12 — Capstone Part 3: Test
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000012','c0000000-0000-4000-8000-000000000000',12,
  'Capstone Part 3: Test','["Comprehensive test coverage","consensus tests","replay tests"]',4,'test_suite','c0000000-0000-4000-8000-000000000011',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Plan test coverage across unit, integration, and consensus levels",
      "Test event-sourced replay and projector idempotency",
      "Test consensus under concurrent and faulty conditions",
      "Use the testgaps background worker to find coverage holes",
      "Test the security gates and budget circuit breaker"
    ]},
    {"type":"heading","title":"What a distributed system actually needs tested"},
    {"type":"prose","markdown":"Part 3 (4 hours) writes the test suite for the trading swarm. A distributed, event-sourced, consensus-driven, federated system needs more than unit tests — it needs tests for the *distributed* properties: replay determinism, projector idempotency, consensus under faults, and the security gates.\n\nThe Beginner path covered unit/integration/e2e levels; here you add the Intermediate-specific concerns each prior lesson introduced."},
    {"type":"heading","title":"Event-sourcing tests: replay and idempotency"},
    {"type":"prose","markdown":"Two properties from Lesson 3 must be tested directly:\n\n- **Replay determinism** — folding the same event log always yields the same state. Replay your `Trade*`/`Position*` events twice; assert identical portfolios.\n- **Projector idempotency** — feeding the projector the same event twice must not double-count. This is the bug that silently corrupts read models, so test it explicitly."},
    {"code":"// Replay + idempotency tests (pseudocode)\ntest(\"portfolio fold is deterministic on replay\", () => {\n  expect(portfolio(log)).toEqual(portfolio(log));   // same log → same state\n});\n\ntest(\"projector is idempotent\", () => {\n  const rm = newReadModel();\n  project(rm, tradeExecutedEvent);\n  project(rm, tradeExecutedEvent);                  // same event again\n  expect(rm.netPosition).toEqual(singleApplication); // not doubled\n});","type":"code","caption":"Testing replay determinism and projector idempotency","language":"javascript"},
    {"type":"heading","title":"Consensus tests: concurrency and faults"},
    {"type":"prose","markdown":"Consensus is the riskiest component to leave untested. Ruflo's own improvement roadmap flags exactly this: the hive-mind ConsensusEngine 'has not been validated under production load,' and recommends an integration test with *at least 3 concurrent callers* because a singleton with init races or lock contention 'will fail silently for the first caller and produce inconsistent state.'\n\nApply that lesson to your capstone: test trade approval with concurrent proposals racing through `hive-mind_consensus`, and test the fault bound — with `n` voters, inject `f` faulty votes and assert agreement still holds for `f < n/3` (Byzantine) and fails as expected at `f ≥ n/3`."},
    {"type":"callout","title":"Test consensus with concurrent callers","variant":"warning","markdown":"A single-caller consensus test proves almost nothing. The documented failure mode is races and lock contention under concurrency that fail SILENTLY. Your suite must drive at least 3 concurrent proposals through the consensus path and assert a single consistent committed decision — otherwise you're shipping the exact gap Ruflo's roadmap calls out."},
    {"type":"heading","title":"Security and budget tests"},
    {"type":"prose","markdown":"Test the protections from Lessons 7-8, because they fail closed and silently when broken:\n\n- **AI Defence gates** — feed PII through Gate 1, an injection string ('ignore all previous instructions…') through Gate 3, and assert each is blocked/sanitized as configured.\n- **Budget circuit breaker** — drive a delegation past `--max-hops` and assert a `HOP_LIMIT_EXCEEDED` error; past `--max-usd` and assert `BUDGET_EXCEEDED`. Confirm the error does NOT leak remaining budget."},
    {"code":"# Find coverage gaps automatically after writing your suite\nnpx ruflo@latest hooks worker dispatch --trigger testgaps","type":"code","caption":"Use the testgaps background worker to surface untested paths","language":"bash"},
    {"type":"callout","title":"Let testgaps catch what you missed","variant":"tip","markdown":"After hand-writing tests for the distributed properties, dispatch the `testgaps` background worker to surface paths you didn't cover. It's the documented worker to run 'after adding features' — treat its output as a checklist of risks, especially around error branches and the consensus/federation edges that are easy to forget."},
    {"type":"capstone","title":"Build the capstone test suite","instructions":"Write a comprehensive test suite for your trading swarm. It MUST include, at minimum:\n\n1. Unit tests for the write-model invariants (e.g. a trade exceeding the risk limit emits TradeRejected).\n2. A replay-determinism test and a projector-idempotency test (Lesson 3).\n3. A consensus test with AT LEAST 3 concurrent proposals asserting one consistent committed decision, plus a fault-bound test (agreement holds for f < n/3, fails at f ≥ n/3).\n4. A security-gate test (PII via Gate 1 and/or injection via Gate 3 blocked) and a budget-breaker test (HOP_LIMIT_EXCEEDED or BUDGET_EXCEEDED, with no budget leak).\n5. A note on what `hooks worker dispatch --trigger testgaps` reported and how you closed the top gap.\n\nSuccess criteria: coverage spanning unit + event-replay/idempotency + concurrent consensus + fault bound + security/budget, explicitly addressing the documented 'silent failure under concurrent consensus' risk."},
    {"type":"quiz","question":"Ruflo's improvement roadmap warns that the hive-mind ConsensusEngine can fail silently. What test does it specifically recommend, and why?","options":[
      "A single-caller smoke test, because consensus is deterministic",
      "An integration test with at least 3 concurrent callers, because init races or lock contention under concurrency can fail silently for the first caller and produce inconsistent state",
      "No test is needed since consensus is provided by the framework",
      "Only a unit test of the voting math, ignoring concurrency"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 13 — Capstone Part 4: Deploy
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000013','c0000000-0000-4000-8000-000000000000',13,
  'Capstone Part 4: Deploy','["Production deployment","monitoring","background workers"]',3,'deployment','c0000000-0000-4000-8000-000000000012',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Deploy the federated trading swarm with a daemon running background workers",
      "Stand up monitoring: metrics, bottleneck analysis, and observability",
      "Run a pre-production security scan and enable audit trails",
      "Wire the right background workers (audit, optimize, testgaps, map, document)",
      "Define what 'healthy in production' means for this system"
    ]},
    {"type":"heading","title":"Deploying a coordinated system"},
    {"type":"prose","markdown":"Part 4 (3 hours) takes the tested swarm to production. Two things change versus staging: you run a **daemon** that keeps background workers alive, and you turn on **continuous monitoring and audit** so the system is observable and accountable while it trades.\n\nRuflo's daemon command group manages the background worker daemon (`start`, `stop`, `status`, `trigger`, `enable`)."},
    {"code":"# Start the daemon that hosts background workers in production\nnpx ruflo@latest daemon start\nnpx ruflo@latest daemon status","type":"code","caption":"Run the background-worker daemon","language":"bash"},
    {"type":"heading","title":"Background workers in production"},
    {"type":"prose","markdown":"Ruflo's background workers automate the operational concerns each prior lesson raised. The documented triggers and when to run them:\n\n- **audit** — after security changes (keeps the compliance trail current).\n- **optimize** — after performance work.\n- **testgaps** — after adding features.\n- **map** — every 5+ file changes (keeps the codebase map fresh).\n- **document** — after API changes.\n\nFor a live trading system, `audit` (accountability) and `optimize` (latency under load) are the two you'll lean on most."},
    {"code":"# Dispatch the workers that matter for a trading deployment\nnpx ruflo@latest hooks worker dispatch --trigger audit\nnpx ruflo@latest hooks worker dispatch --trigger optimize","type":"code","caption":"Dispatch operational background workers","language":"bash"},
    {"type":"heading","title":"Monitoring and observability"},
    {"type":"prose","markdown":"Stand up monitoring before you trust the system with real flow. Use the **performance** group for metrics/benchmarks and **Bottleneck Analysis** for real-time, proactive issue detection (Lesson 6). Ruflo also provides observability tooling to trace agent execution, view metrics, and correlate telemetry across the swarm — essential when a trade spans signal → consensus → execution across multiple agents and (in federation) multiple installations."},
    {"code":"# Production health signals\nnpx ruflo@latest performance metrics\nnpx ruflo@latest hive-mind status      # leader/term, consensus health\nnpx ruflo@latest agent list --filter active","type":"code","caption":"Inspecting production health","language":"bash"},
    {"type":"callout","title":"Federation deploy is fail-closed","variant":"warning","markdown":"If your trading swarm federates across organizations, deployment must respect the zero-trust posture from Lesson 8: TLS cert pinning is fail-closed (a non-matching fingerprint is rejected, not warned about), and the budget circuit breaker caps delegation cost. Verify `/federation-status` shows the expected peers at the expected trust tiers BEFORE enabling live trading — a mis-tiered peer is a data-exfiltration risk."},
    {"type":"heading","title":"Pre-flight security and audit"},
    {"type":"prose","markdown":"Run the Lesson 7 security pass as a deployment gate, not an afterthought: `security scan --depth full`, confirm the 3 AI Defence gates are active on inbound signals, and enable the audit trail (HIPAA/SOC2/GDPR mode as appropriate) so every cross-agent and cross-org message is logged. The `audit` background worker keeps that trail current as the system runs."},
    {"type":"callout","title":"Define 'healthy' before go-live","variant":"tip","markdown":"Decide your health criteria up front: consensus is reaching decisions (leader stable, no flapping), projections are caught up (`last_synced_event_id` near the log head), latency is within target, no budget-breaker trips in normal operation, and `/federation-status` shows only expected peers. If any of these is red, you are not healthy — roll back."},
    {"type":"capstone","title":"Deploy and instrument the trading swarm","instructions":"Produce a deployment runbook (and execute the steps you can) that takes the tested trading swarm to production:\n\n1. Start the daemon and confirm `daemon status`.\n2. Dispatch the appropriate background workers (at minimum `audit` and `optimize`) and state why each is appropriate here.\n3. Stand up monitoring: list the specific commands/tools you run for metrics, consensus health, and bottleneck/observability.\n4. Run the pre-flight security gate (`security scan`, the 3 AI Defence gates, audit-trail enablement) and — if federated — verify `/federation-status` peer tiers and the budget circuit breaker.\n5. Write your explicit 'healthy in production' criteria (consensus stable, projections caught up, latency target, no budget trips, expected peers) and the rollback trigger.\n\nSuccess criteria: a runbook that uses real Ruflo deployment/monitoring commands, wires the correct background workers with justification, gates on security + (if federated) trust-tier verification, and defines measurable health + rollback criteria."},
    {"type":"quiz","question":"Which background worker does Ruflo specifically recommend running after security changes, and why does it matter for a federated trading deployment?","options":[
      "map, because the codebase structure changed",
      "audit, because it keeps the compliance/audit trail current — essential for accountability of every cross-agent and cross-org message under HIPAA/SOC2/GDPR",
      "document, because the API changed",
      "No worker is needed; security is a one-time concern"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 14 — Reflection & Review
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'c0000000-0000-4000-8000-000000000014','c0000000-0000-4000-8000-000000000000',14,
  'Reflection & Review','["Community presentation","retrospective","knowledge sharing"]',2,'community_presentation','c0000000-0000-4000-8000-000000000013',
  $json$[
    {"type":"objectives","title":"What you'll learn","items":[
      "Synthesize the Intermediate path into a coherent mental model",
      "Present your federated trading swarm to the community",
      "Run an honest retrospective grounded in measured outcomes",
      "Capture reusable patterns into shared memory for future work",
      "Identify your bridge into the Advanced path"
    ]},
    {"type":"heading","title":"Closing the loop"},
    {"type":"prose","markdown":"The final lesson (2 hours) is reflection and a **community presentation** (PRD §4.4). You've built a distributed, event-sourced, consensus-driven, federated, monitored trading swarm. This lesson is about consolidating *why* each piece is there and sharing what you learned — both with the community and with the system itself, via memory."},
    {"type":"heading","title":"The Intermediate mental model"},
    {"type":"prose","markdown":"You can now narrate the whole path as one model:\n\n- **Agreement** — Byzantine (`f < n/3`) when peers may lie; Raft (`f < n/2`) when they only crash (Lessons 1-2).\n- **State** — event sourcing (immutable log) + CQRS read models via projectors (Lesson 3).\n- **Shape** — topologies that evolve, with `hierarchical-mesh` as the V3 default and `adaptive` for unpredictable load (Lesson 4).\n- **Extension** — custom skills with frontmatter + progressive disclosure (Lesson 5).\n- **Speed** — measure → change → measure, HNSW/quantization with honest crossover points (Lesson 6).\n- **Trust** — the 3-gate AI Defence pattern, authentication-before-authorization, least privilege (Lesson 7).\n- **Reach** — zero-trust federation: ed25519/mTLS, 5-tier trust, budget circuit breaker, Byzantine commits across orgs (Lesson 8).\n- **Coordination** — comms-first SendMessage with pipeline / fan-out / supervisor patterns (Lesson 9)."},
    {"type":"callout","title":"Be honest about what's measured","variant":"info","markdown":"A good presentation distinguishes measured results from aspirations — exactly as Ruflo's own docs do (e.g. HNSW measured at ~1.9x–4.7x, with the 150x–12,500x figure explicitly marked NOT reproduced). When you present your swarm's performance and reliability, state your numbers with their conditions and call out anything you didn't actually verify."},
    {"type":"heading","title":"Capture patterns into memory"},
    {"type":"prose","markdown":"Reflection isn't only for humans. Persist the patterns that worked into Ruflo's memory so future swarms (and you) can retrieve them semantically. This mirrors the platform's own self-learning loop: store a successful pattern, then search for prior art before re-solving a problem."},
    {"code":"# Store a reusable pattern from your capstone\nnpx ruflo@latest memory store --namespace patterns \\\n  --key \"federated-trading-consensus\" \\\n  --value \"Byzantine f<n/3 for cross-org trade commits; raft internally; event-sourced positions + CQRS projection\"\n\n# Before future work, search prior art\nnpx ruflo@latest memory search --query \"cross-org consensus trading\" --namespace patterns","type":"code","caption":"Persisting and recalling capstone patterns","language":"bash"},
    {"type":"heading","title":"Run a retrospective"},
    {"type":"prose","markdown":"Hold a short retrospective against the capstone you actually shipped:\n\n- **What held up?** Which design decisions from Part 1 survived contact with implementation and testing.\n- **What broke?** Where did you hit the failure cases you designed for — silent consensus races, projection lag, a budget-breaker trip?\n- **What would you change?** Topology, consensus boundary, trust tiers, test coverage.\n\nGround each point in evidence from Parts 2-4 (a test that caught a race, a metric that exposed a bottleneck), not impressions."},
    {"type":"callout","title":"Share to teach","variant":"tip","markdown":"The community presentation is a teaching artifact. The clearest way to prove mastery is to explain a single hard decision — e.g. why Byzantine over Raft at the federation boundary — so well that someone newer to the path could re-derive it. Aim for one deep, well-justified thread rather than a shallow tour of all eight topics."},
    {"type":"heading","title":"Bridge to Advanced"},
    {"type":"prose","markdown":"The Advanced path builds directly on what you've done: game theory in orchestration, fault-tolerance architectures (deeper BFT), ML-driven adaptive topologies, building custom skill *frameworks* (beyond single skills), multi-cloud orchestration, and zero-trust threat models. Your Intermediate capstone — consensus + federation + event sourcing — is the foundation those topics extend."},
    {"type":"capstone","title":"Present and reflect","instructions":"Prepare a community presentation and retrospective for your federated trading swarm. Deliver a checklist/outline that MUST include:\n\n1. A one-paragraph synthesis tying together at least six of the eight Intermediate topics (agreement, state, topology, skills, performance, security, federation, coordination) as they appear in your capstone.\n2. One deep, well-justified design decision explained from first principles (recommended: Byzantine vs Raft at the federation boundary).\n3. An honest results slide: at least one measured metric WITH its conditions, and at least one thing you did NOT verify.\n4. A retrospective with one thing that held up, one failure case you actually hit (from Parts 2-4), and one change you'd make.\n5. At least one `memory_store` of a reusable pattern from the capstone (into the `patterns` namespace).\n6. One sentence naming which Advanced-path topic your capstone best positions you for, and why.\n\nSuccess criteria: a synthesis spanning the path, one rigorously justified decision, honest measured-vs-unverified reporting, an evidence-grounded retrospective, a stored reusable pattern, and a clear bridge to Advanced."},
    {"type":"quiz","question":"What is the honest way to present your swarm's performance, consistent with how Ruflo documents its own benchmarks?","options":[
      "Quote the maximum theoretical speedup; conditions don't matter in a presentation",
      "State measured numbers with their conditions and explicitly distinguish them from figures you did not verify (as Ruflo marks HNSW measured ~1.9x–4.7x and the 150x–12,500x figure NOT reproduced)",
      "Only report numbers that look impressive and omit accuracy costs",
      "Avoid numbers entirely since benchmarks are unreliable"
    ],"answerIndex":1}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;
