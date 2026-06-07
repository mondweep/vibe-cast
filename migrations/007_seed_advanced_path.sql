-- Migration: Seed Advanced Learning Path (12 lessons, full authored content)
-- Date: 2026-06-07
-- Source: PRD §4.4 "Advanced Path (60 hours, 12 lessons)"; ADR-013 Phase 5 (authored ContentBlock[]).
-- Accuracy: every Ruflo command / MCP tool / agent type / topology / consensus strategy verified
--   against the real Ruflo source (github.com/ruvnet/ruflo, mirrored at /tmp/ruflo-src):
--     topologies: hierarchical | mesh | hierarchical-mesh | adaptive   (CLAUDE.md "Hive-Mind Consensus")
--     consensus : byzantine (f<n/3) | raft (f<n/2) | gossip | crdt | quorum
--     agents    : byzantine-coordinator, raft-manager, gossip-coordinator, consensus-builder,
--                 crdt-synchronizer, quorum-manager, security-manager, security-architect,
--                 security-auditor, adaptive-coordinator, perf-analyzer, performance-benchmarker,
--                 system-architect, smart-agent (CLAUDE.md agent catalog)
--     federation: federation init/join + MCP tools federation_init, federation_join, federation_peers,
--                 federation_consensus, federation_query, federation_audit, federation_breaker_status
--     intelligence: SONA self-learning, ReasoningBank, HNSW vector memory (AgentDB), MicroLoRA, hooks
-- ContentBlock[] shape verified against src/web/pages/LessonPage.tsx:
--   objectives{items[]} | heading{text} | prose{markdown} | code{language,caption,code}
--   | callout{variant: note|tip|warning, markdown} | quiz{question,options[],answerIndex} | capstone{title,instructions}
-- Idempotent: ON CONFLICT DO NOTHING on primary keys.

-- ============================================================
-- Advanced path (prerequisite: Intermediate path c0000000-...)
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_learning_path_read_model
  (path_id, level, title, description, estimated_hours, lesson_count, ordered_lesson_ids, prerequisite_path_id, status)
VALUES (
  'd0000000-0000-4000-8000-000000000000',
  'advanced',
  'Advanced Path',
  'Architects designing large-scale systems. Game theory, Byzantine fault tolerance, ML-driven adaptive topologies, custom skill frameworks, multi-cloud and zero-trust federation — culminating in a production-grade capstone defended before a review board.',
  60,
  12,
  ARRAY[
    'd0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000004',
    'd0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000006',
    'd0000000-0000-4000-8000-000000000007','d0000000-0000-4000-8000-000000000008',
    'd0000000-0000-4000-8000-000000000009','d0000000-0000-4000-8000-000000000010',
    'd0000000-0000-4000-8000-000000000011','d0000000-0000-4000-8000-000000000012'
  ]::UUID[],
  'c0000000-0000-4000-8000-000000000000',
  'PUBLISHED'
)
ON CONFLICT (path_id) DO NOTHING;

-- ============================================================
-- Lesson 1 — Game Theory in Orchestration
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000000',1,
  'Game Theory in Orchestration', '["Equilibrium","incentives","coalition formation"]', 4, 'quiz', NULL,
  $json$[
    {"type":"objectives","items":[
      "Model multi-agent coordination as a strategic game and identify Nash equilibria",
      "Design incentive structures that align self-interested agents toward swarm goals",
      "Reason about coalition formation in a Ruflo hierarchical-mesh swarm",
      "Recognize when a topology produces socially-suboptimal equilibria and how to correct it"
    ]},
    {"type":"heading","text":"Why game theory matters for orchestration"},
    {"type":"prose","markdown":"When a Ruflo swarm has more than a handful of agents, coordination stops being a scheduling problem and becomes a *strategic* one. Each agent — especially a federated agent on another machine — acts on local information and local incentives. Game theory gives you the vocabulary to predict the **equilibrium** the swarm converges to, rather than the behaviour you hoped for."},
    {"type":"prose","markdown":"Three concepts carry most of the weight at architecture scale:\n\n- **Nash equilibrium** — no agent can improve its outcome by unilaterally changing strategy.\n- **Incentive compatibility** — the reward signal makes honest, cooperative behaviour the dominant strategy.\n- **Coalition formation** — subsets of agents that cooperate because the coalition's payoff exceeds going it alone."},
    {"type":"heading","text":"Topology shapes the game"},
    {"type":"prose","markdown":"Ruflo's coordination topology *is* the game board. In a `hierarchical` topology the Queen sets the payoff matrix; workers have little strategic freedom. In a `mesh` topology every peer negotiates, which is expressive but prone to oscillation. The recommended `hierarchical-mesh` hybrid bounds the strategy space: a coordinator constrains the equilibria a mesh of peers can reach."},
    {"type":"code","language":"bash","caption":"Initialise a hierarchical-mesh swarm — the game board for coordinated agents","code":"npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized"},
    {"type":"callout","variant":"note","markdown":"Ruflo's supported topologies are exactly `hierarchical`, `mesh`, `hierarchical-mesh`, and `adaptive`. `hierarchical-mesh` is the recommended hybrid because a central coordinator prevents the drift and oscillation a pure mesh can fall into."},
    {"type":"heading","text":"Designing incentives that converge"},
    {"type":"prose","markdown":"Ruflo's self-learning loop reinforces patterns that succeed. That reinforcement *is* an incentive mechanism: store the strategies that produced good outcomes so future planning retrieves them. If you reward only individual task completion, agents defect on shared work. Reward the coalition outcome and cooperation becomes the dominant strategy."},
    {"type":"code","language":"bash","caption":"Reward a successful cooperative pattern so the swarm converges on it","code":"npx @claude-flow/cli@latest memory store \\\n  --namespace patterns \\\n  --key \"coalition-router-handler\" \\\n  --value \"router+handler coalition beat solo handlers on p95 latency\"\n\nnpx @claude-flow/cli@latest hooks post-task --task-id \"ticket-batch-42\" --success true"},
    {"type":"callout","variant":"tip","markdown":"Make the reward signal a property of the **coalition**, not the individual. In Ruflo terms: store the pattern under a key that names the cooperating roles, and let `hooks route` retrieve it for the whole group on the next similar task."},
    {"type":"heading","text":"Spotting a bad equilibrium"},
    {"type":"prose","markdown":"A classic failure: two `coder` agents both wait for the other to claim a shared module (the *volunteer's dilemma*), so neither starts. The swarm is at a stable but useless equilibrium. The fix is structural — give a coordinator the authority to break ties — which is precisely why `hierarchical-mesh` exists."},
    {"type":"code","language":"javascript","caption":"A coordinator breaks the volunteer's-dilemma tie by assigning ownership","code":"// hierarchical-mesh: coordinator assigns, peers execute\nAgent({ prompt: \"Own auth module. SendMessage 'tester' when done.\",\n  subagent_type: \"coder\", name: \"coder-auth\", run_in_background: true })\nAgent({ prompt: \"Own billing module. SendMessage 'tester' when done.\",\n  subagent_type: \"coder\", name: \"coder-billing\", run_in_background: true })"},
    {"type":"callout","variant":"warning","markdown":"Never assume a swarm reaches the *socially optimal* outcome on its own. Self-interested agents converge to a Nash equilibrium, which is frequently worse for the group. Always design the payoff structure and the coordinator's authority deliberately."},
    {"type":"heading","text":"Coalition formation in practice"},
    {"type":"prose","markdown":"A coalition is worth forming when its joint payoff exceeds the sum of its members acting alone — the *superadditivity* condition. In Ruflo, coalitions map cleanly onto sub-swarms: a `system-architect` plus two `coder` agents plus a `tester` form a feature coalition coordinated through `SendMessage`, sharing context via AgentDB memory."},
    {"type":"quiz","question":"In Ruflo, which topology is recommended for bounding the strategy space of a multi-agent game while still allowing peer negotiation?","options":["pure mesh","hierarchical-mesh","star","ring"],"answerIndex":1},
    {"type":"quiz","question":"A coalition of agents is worth forming (superadditive) when:","options":["it has the most agents","its joint payoff exceeds the sum of members acting alone","every agent uses the same model","the coordinator is a raft-manager"],"answerIndex":1},
    {"type":"capstone","title":"Design Exercise: Incentive-Compatible Swarm","instructions":"Specify a 6-agent swarm for a code-migration task. Document (1) the topology and why, (2) the payoff/reward signal you store via `memory store` so cooperation is the dominant strategy, and (3) one Nash equilibrium that would be socially suboptimal and the structural fix that prevents it. Deliverable: a one-page design pattern."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 2 — Fault Tolerance Architectures
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000000',2,
  'Fault Tolerance Architectures', '["Byzantine fault tolerance","quorum","consensus strategies"]', 4, 'design_pattern', 'd0000000-0000-4000-8000-000000000001',
  $json$[
    {"type":"objectives","items":[
      "Compare Ruflo's five consensus strategies and their fault thresholds",
      "Choose between byzantine, raft, gossip, crdt and quorum for a given failure model",
      "Configure a hive-mind for Byzantine fault-tolerant agreement",
      "Reason about the f < n/3 and f < n/2 fault bounds when sizing a swarm"
    ]},
    {"type":"heading","text":"Failure models drive the architecture"},
    {"type":"prose","markdown":"Fault tolerance starts with naming the failure you fear. *Crash faults* (an agent stops) are benign. *Byzantine faults* (an agent lies, sends conflicting messages, or is compromised) are adversarial. The consensus strategy you pick must match — over-engineering wastes agents, under-engineering loses correctness."},
    {"type":"heading","text":"Ruflo's consensus strategies"},
    {"type":"prose","markdown":"Ruflo's hive-mind supports five consensus strategies, each with a precise fault tolerance:\n\n- **`byzantine`** — Byzantine fault tolerant; tolerates f < n/3 faulty agents.\n- **`raft`** — leader-based; tolerates f < n/2 crash faults, leader maintains authoritative state.\n- **`gossip`** — epidemic propagation for eventual consistency.\n- **`crdt`** — conflict-free replicated data types; merge without coordination.\n- **`quorum`** — configurable quorum-based agreement."},
    {"type":"callout","variant":"note","markdown":"The bounds are not arbitrary. BFT needs `n >= 3f + 1` to distinguish honest majority from a colluding adversary — hence f < n/3. Raft only defends against crashes, so a simple majority (f < n/2) suffices."},
    {"type":"code","language":"bash","caption":"Initialise a Byzantine fault-tolerant hive-mind (Queen-led)","code":"npx @claude-flow/cli@latest hive-mind init --consensus byzantine --topology hierarchical-mesh"},
    {"type":"heading","text":"Sizing for a fault budget"},
    {"type":"prose","markdown":"If you must tolerate up to 2 Byzantine agents, BFT requires at least `3*2 + 1 = 7` agents. With raft, tolerating 2 crash faults needs only 5. The architectural trade is clear: Byzantine safety roughly triples your agent budget per fault tolerated."},
    {"type":"code","language":"javascript","caption":"Request consensus from a Byzantine-tolerant hive-mind via MCP","code":"// mcp__claude-flow__hive-mind_consensus coordinates agreement;\n// the consensus-builder + byzantine-coordinator agents drive voting.\nmcp__claude-flow__hive_mind_consensus({\n  proposal: \"promote-build-42-to-staging\",\n  strategy: \"byzantine\"\n})"},
    {"type":"callout","variant":"tip","markdown":"Ruflo ships dedicated agents for each strategy: `byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, and `quorum-manager`. Spawn the one that matches your chosen strategy — don't hand-roll voting logic."},
    {"type":"heading","text":"When eventual consistency is enough"},
    {"type":"prose","markdown":"Not every decision needs strong agreement. Shared scratch state that converges — a set of discovered URLs, a merge of independent edits — is a perfect fit for `gossip` or `crdt`. They avoid the latency cost of synchronous voting entirely, at the price of temporary divergence."},
    {"type":"code","language":"bash","caption":"Use a CRDT-synchronised swarm for conflict-free shared state","code":"npx @claude-flow/cli@latest hive-mind init --consensus crdt --topology mesh"},
    {"type":"callout","variant":"warning","markdown":"Choosing `raft` when your threat model includes *compromised* agents is a correctness bug, not a performance tuning issue. Raft assumes agents fail honestly (crash-stop). A lying agent can corrupt a raft cluster; only `byzantine` defends against that."},
    {"type":"heading","text":"Layering: BFT decisions over gossip state"},
    {"type":"prose","markdown":"Production architectures layer strategies. Use `gossip`/`crdt` for high-volume, low-stakes shared state, and reserve a `byzantine` hive-mind for the few high-stakes commit points (deploy, spend, irreversible writes). This keeps the expensive consensus rare."},
    {"type":"quiz","question":"How many agents are required for a Byzantine fault-tolerant hive-mind that must tolerate 2 faulty agents?","options":["3","5","7","9"],"answerIndex":2},
    {"type":"quiz","question":"Your threat model includes agents that may be compromised and send conflicting messages. Which Ruflo consensus strategy is correct?","options":["raft","gossip","byzantine","crdt"],"answerIndex":2},
    {"type":"quiz","question":"Which strategy is best for high-volume shared state that only needs eventual consistency?","options":["byzantine","quorum","gossip","raft"],"answerIndex":2},
    {"type":"capstone","title":"Code Exercise: Two-Tier Consensus","instructions":"Build a hive-mind that uses `crdt` for a shared discovered-resources set and a `byzantine` quorum for the single 'deploy' commit. Initialise both via the CLI, spawn the matching coordinator agents (`crdt-synchronizer`, `byzantine-coordinator`), and demonstrate that the deploy still succeeds when one of seven agents is artificially made to vote incorrectly. Deliverable: runnable scripts plus a short note on why n=7 was chosen."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 3 — Adaptive Topologies
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000000',3,
  'Adaptive Topologies', '["ML-driven topology optimization","adaptive coordination","load-based reshaping"]', 4, 'code_exercise', 'd0000000-0000-4000-8000-000000000002',
  $json$[
    {"type":"objectives","items":[
      "Explain how Ruflo's adaptive topology reshapes a swarm based on load",
      "Use SONA self-learning and stored patterns to drive topology decisions",
      "Apply the hooks routing system to assign work to the right agents automatically",
      "Measure when an adaptive topology beats a fixed hierarchical-mesh"
    ]},
    {"type":"heading","text":"From fixed to adaptive coordination"},
    {"type":"prose","markdown":"`hierarchical`, `mesh`, and `hierarchical-mesh` are *static* — you pick one at init. The `adaptive` topology is different: it changes the agent network dynamically based on current load, letting the swarm tighten into a hierarchy under contention and loosen into a mesh when work is parallelisable."},
    {"type":"code","language":"bash","caption":"Initialise an adaptive swarm that reshapes itself under load","code":"npx @claude-flow/cli@latest swarm init --topology adaptive --max-agents 12 --strategy specialized"},
    {"type":"callout","variant":"note","markdown":"`adaptive` is one of Ruflo's four real topologies (`hierarchical`, `mesh`, `hierarchical-mesh`, `adaptive`). It is coordinated by the `adaptive-coordinator` agent, which observes load and reshapes the network."},
    {"type":"heading","text":"The learning loop drives the decision"},
    {"type":"prose","markdown":"Ruflo's intelligence stack — SONA self-learning, ReasoningBank, and HNSW-indexed AgentDB memory — is what makes 'ML-driven' topology more than a slogan. Each completed task records a trajectory; future planning retrieves similar past trajectories via HNSW vector search and reuses the topology that worked."},
    {"type":"code","language":"bash","caption":"Search prior topology decisions before reshaping","code":"npx @claude-flow/cli@latest memory search \\\n  --query \"high fan-out research workload topology\" \\\n  --namespace patterns"},
    {"type":"callout","variant":"tip","markdown":"Measured numbers matter: Ruflo's HNSW vector search is ~1.9x faster at N=20k and ~3.2x-4.7x at N=5k versus brute force (recall@10 ~0.99), but ties or loses below the crossover. Adaptive topology pays off at scale; for a tiny swarm a fixed `hierarchical-mesh` is simpler and just as fast."},
    {"type":"heading","text":"Hooks: automatic routing"},
    {"type":"prose","markdown":"You rarely reshape topology by hand. The hooks system routes each task to the right agents and topology automatically, drawing on learned patterns. `hooks route` is the entry point; the `adaptive-coordinator` consumes its decisions."},
    {"type":"code","language":"bash","caption":"Route a task — hooks pick agents and coordination shape from learned patterns","code":"npx @claude-flow/cli@latest hooks route --task \"refactor auth module across 6 files with tests\""},
    {"type":"code","language":"javascript","caption":"Reshape decisions surface through coordination MCP tools","code":"// mcp__claude-flow__coordination_topology inspects/adjusts the live shape;\n// coordination_load_balance redistributes work as agents join/leave.\nmcp__claude-flow__coordination_topology({ action: \"inspect\" })"},
    {"type":"heading","text":"When NOT to go adaptive"},
    {"type":"prose","markdown":"Adaptivity has overhead: monitoring load, evaluating reshapes, and the risk of *thrashing* (reshaping faster than work completes). For a stable, predictable workload, a fixed `hierarchical-mesh` avoids that overhead and is easier to reason about and debug."},
    {"type":"callout","variant":"warning","markdown":"Guard against topology thrashing. If your swarm reshapes more than once per task batch, the monitoring cost can exceed the coordination savings. Cap reshape frequency and prefer a fixed topology when load variance is low."},
    {"type":"heading","text":"Measuring the win"},
    {"type":"prose","markdown":"Justify adaptivity with data, not intuition. Benchmark the same workload under `hierarchical-mesh` and `adaptive`, compare end-to-end latency and token cost, and keep the configuration only if the adaptive run is meaningfully better on your real traffic shape."},
    {"type":"code","language":"bash","caption":"Benchmark to compare topologies on your workload","code":"npx @claude-flow/cli@latest performance benchmark"},
    {"type":"quiz","question":"Which Ruflo topology dynamically reshapes the agent network based on load?","options":["hierarchical","mesh","adaptive","hierarchical-mesh"],"answerIndex":2},
    {"type":"quiz","question":"What underlying technology lets Ruflo retrieve similar past task trajectories to inform topology decisions?","options":["a relational join","HNSW-indexed vector search in AgentDB","a fixed lookup table","random sampling"],"answerIndex":1},
    {"type":"quiz","question":"When is a fixed hierarchical-mesh preferable to adaptive?","options":["always","when load variance is low and predictable","when there are more than 50 agents","when using federation"],"answerIndex":1},
    {"type":"capstone","title":"Code Exercise: Adaptive vs Fixed","instructions":"Run an identical bursty workload (alternating high-fan-out research and serial refactor phases) under `--topology hierarchical-mesh` and `--topology adaptive`. Capture latency and token cost from `performance benchmark`, and add a reshape-frequency cap to prevent thrashing. Deliverable: the two configs, the benchmark numbers, and a recommendation with justification."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 4 — Building Custom Skill Frameworks
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000000',4,
  'Building Custom Skill Frameworks', '["Advanced Ruflo extensions","skills","plugins","custom agent types"]', 5, 'code_exercise', 'd0000000-0000-4000-8000-000000000003',
  $json$[
    {"type":"objectives","items":[
      "Distinguish Ruflo skills, plugins, and custom agent types",
      "Scaffold a new skill with correct structure using the skill-builder",
      "Define a custom agent type and wire it into a swarm",
      "Package an extension as a plugin and install it"
    ]},
    {"type":"heading","text":"Three extension surfaces"},
    {"type":"prose","markdown":"Ruflo extends in three layers:\n\n- **Skills** — packaged capabilities/domain knowledge invoked on demand (the slash-command surface).\n- **Plugins** — distributable bundles of skills, commands, and agent definitions (e.g. `ruflo-federation`, `ruflo-neural-trader`).\n- **Custom agent types** — any string works as an agent type, so you can define domain-specific coordinators."},
    {"type":"callout","variant":"note","markdown":"The CLI install path ships the full loop — agents, 60+ commands, 30 skills, MCP server, hooks, and daemon — while the Claude Code Plugin path gives slash commands plus per-plugin skills and agent definitions. Know which surface your extension targets."},
    {"type":"heading","text":"Scaffolding a skill"},
    {"type":"prose","markdown":"Skills follow a strict structure: YAML frontmatter (name, description, trigger), progressive-disclosure body, and a directory layout. Use the `skill-builder` skill to generate a compliant template rather than hand-writing frontmatter."},
    {"type":"code","language":"bash","caption":"Scaffold a new skill with the skill-builder","code":"# In Claude Code, invoke the skill-builder skill, or scaffold a plugin:\nnpx @claude-flow/cli@latest create-plugin"},
    {"type":"callout","variant":"tip","markdown":"A skill's `description` and `trigger` are load-bearing — they decide *when* Claude invokes the skill. Write the trigger as concrete conditions ('when the user wants to X'), not a vague topic, or the skill will be invoked at the wrong times or never."},
    {"type":"heading","text":"Custom agent types"},
    {"type":"prose","markdown":"Ruflo ships a deep catalog — `coder`, `reviewer`, `tester`, `system-architect`, `security-architect`, `perf-analyzer`, the consensus agents, and more — but you are not limited to it. Any string is a valid agent type, so a domain team can define, say, a `compliance-auditor` coordinator with bespoke instructions."},
    {"type":"code","language":"javascript","caption":"Spawn a custom agent type alongside built-ins","code":"// Built-in + custom types coexist in one swarm.\nAgent({ prompt: \"Audit changes against SOC2 controls. SendMessage 'reviewer'.\",\n  subagent_type: \"compliance-auditor\", name: \"compliance\", run_in_background: true })\nAgent({ prompt: \"Wait for 'compliance'. Final review.\",\n  subagent_type: \"reviewer\", name: \"reviewer\", run_in_background: true })"},
    {"type":"heading","text":"Wiring extensions into the learning loop"},
    {"type":"prose","markdown":"A custom skill becomes powerful when it participates in Ruflo's memory and hooks. Have the skill store successful patterns via `memory store --namespace patterns` and emit `hooks post-edit` / `hooks post-task` so the swarm learns from the skill's outputs like any native capability."},
    {"type":"code","language":"bash","caption":"Make a custom skill participate in self-learning","code":"npx @claude-flow/cli@latest hooks pre-edit --file \"$FILE\"\n# ... skill does its work ...\nnpx @claude-flow/cli@latest hooks post-edit --file \"$FILE\" --success true\nnpx @claude-flow/cli@latest memory store --namespace patterns \\\n  --key \"skill-myframework-success\" --value \"approach that worked\""},
    {"type":"heading","text":"Packaging as a plugin"},
    {"type":"prose","markdown":"To distribute, bundle skills, commands, and agent definitions into a plugin and validate it before publishing. Ruflo's plugin ecosystem (federation, neural-trader, and others) all follow this shape, installable via the plugin install flow."},
    {"type":"code","language":"bash","caption":"Validate a plugin before publishing","code":"npx @claude-flow/cli@latest validate-plugin"},
    {"type":"callout","variant":"warning","markdown":"Keep files under 500 lines and validate input at the skill's boundary. A custom agent or skill runs with the swarm's authority; treat its inputs as untrusted and scan them (Ruflo's AIDefence tools exist for exactly this) before acting."},
    {"type":"quiz","question":"In Ruflo, which statement about custom agent types is true?","options":["Only the built-in catalog of agent types is allowed","Any string is a valid agent type","Custom types must be compiled to WASM first","Custom types cannot use SendMessage"],"answerIndex":1},
    {"type":"quiz","question":"What makes a skill's description and trigger 'load-bearing'?","options":["They set the file size limit","They determine when Claude invokes the skill","They configure the consensus strategy","They are required for federation"],"answerIndex":1},
    {"type":"capstone","title":"Code Exercise: Ship a Custom Framework","instructions":"Build a small skill framework: (1) scaffold a skill with correct YAML frontmatter and a precise trigger, (2) define one custom agent type that uses it, (3) wire `hooks post-edit` + `memory store` so the skill feeds the learning loop, and (4) package and `validate-plugin`. Deliverable: the skill directory, a swarm script using the custom agent, and a passing validation run."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 5 — Multi-Cloud Orchestration
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000000',5,
  'Multi-Cloud Orchestration', '["Cloud-agnostic deployment","federation across machines","cross-region coordination"]', 4, 'design_document', 'd0000000-0000-4000-8000-000000000004',
  $json$[
    {"type":"objectives","items":[
      "Use Ruflo federation to coordinate agents across machines, orgs, and regions",
      "Bootstrap a federation with init and join and inspect peers",
      "Keep data safe across cloud boundaries with the PII pipeline and audit trail",
      "Reason about consensus over a federated, geographically distributed swarm"
    ]},
    {"type":"heading","text":"Federation: the multi-cloud primitive"},
    {"type":"prose","markdown":"Ruflo doesn't deploy clouds for you; it makes agents on *different* machines, orgs, and cloud regions collaborate securely. That capability — **agent federation** — is the foundation of cloud-agnostic orchestration: each region runs its own Ruflo node, and federation ties them together."},
    {"type":"callout","variant":"note","markdown":"Federation is zero-trust by default: remote agents start *untrusted*. Identity is proven via mTLS + ed25519 challenge-response — no API keys, no shared secrets. Trust upgrades as agents prove reliable and downgrades instantly on misbehaviour, with no human in the loop."},
    {"type":"heading","text":"Bootstrapping a federation"},
    {"type":"prose","markdown":"You don't manage certificates or handshakes by hand. `federation init` generates a keypair and configures the node; `federation join` connects to peers. After that, your agents simply start talking across the boundary."},
    {"type":"code","language":"bash","caption":"Stand up a federated node and join a peer","code":"# On each node\nnpx -y -p @claude-flow/plugin-agent-federation@latest ruflo-federation init\nnpx -y -p @claude-flow/plugin-agent-federation@latest ruflo-federation join --endpoint <peer-endpoint>\nnpx -y -p @claude-flow/plugin-agent-federation@latest ruflo-federation status"},
    {"type":"code","language":"javascript","caption":"Discover peers and run cross-node consensus via MCP","code":"// federation_peers lists reachable nodes; federation_consensus\n// coordinates an agreement across them.\nmcp__claude-flow__federation_peers({})\nmcp__claude-flow__federation_consensus({ proposal: \"promote-region-eu-build\" })"},
    {"type":"heading","text":"Data safety across the boundary"},
    {"type":"prose","markdown":"Crossing a cloud or org boundary is where data leaks happen. Ruflo strips PII *before* anything leaves a node, and every federation message is auditable for compliance (HIPAA, SOC2, GDPR modes). Untrusted peers see discovery info, never your memory."},
    {"type":"code","language":"bash","caption":"Query the audit trail for compliance","code":"npx -y -p @claude-flow/plugin-agent-federation@latest ruflo-federation audit"},
    {"type":"callout","variant":"tip","markdown":"Inspect the circuit breaker before relying on a remote region. `federation_breaker_status` tells you whether a peer is currently tripped — a tripped breaker means that region's agents are temporarily evicted and you should fail over rather than block."},
    {"type":"heading","text":"Consensus over latency"},
    {"type":"prose","markdown":"Cross-region consensus pays a real latency tax. A synchronous `byzantine` vote across continents is slow. Reserve strong consensus for rare, high-stakes commits; use `gossip`/`crdt` for the chatty cross-region state that can tolerate eventual consistency."},
    {"type":"callout","variant":"warning","markdown":"Never assume a federated peer is honest *or* reachable. Design for partition: a region can drop out mid-task. Use the circuit breaker, set quorum sizes that survive a region loss, and make cross-node operations idempotent."},
    {"type":"heading","text":"A cloud-agnostic deployment shape"},
    {"type":"prose","markdown":"A robust pattern: each cloud region hosts a self-sufficient Ruflo node with a local hierarchical-mesh swarm. A federation links the regions; a small `byzantine` quorum spanning regions guards global commits, while local work and gossiped state never leave their region unless needed."},
    {"type":"quiz","question":"How does Ruflo federation establish trust with a remote agent?","options":["shared API key","mTLS + ed25519 challenge-response, zero-trust by default","an allowlist of IP addresses","manual certificate exchange by an operator"],"answerIndex":1},
    {"type":"quiz","question":"What happens to PII when a federation message leaves a node?","options":["it is encrypted but sent in full","it is stripped before leaving the node","it is logged to the peer","nothing — PII handling is the peer's job"],"answerIndex":1},
    {"type":"quiz","question":"For chatty cross-region shared state that tolerates eventual consistency, prefer:","options":["a synchronous byzantine vote per update","gossip or crdt","raft with a global leader","no consensus at all"],"answerIndex":1},
    {"type":"capstone","title":"Design Document: Three-Region Federation","instructions":"Design a cloud-agnostic deployment across three regions (e.g. us, eu, ap). Specify: per-region swarm topology, the federation bootstrap (`federation init`/`join`), trust levels and the circuit-breaker fail-over plan, where PII stripping and audit apply, and which operations use byzantine consensus vs gossip/crdt. Deliverable: a 2-page architecture document with a diagram."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 6 — Advanced Security Models
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000006','d0000000-0000-4000-8000-000000000000',6,
  'Advanced Security Models', '["Zero-trust agents","threat models","prompt-injection defense","auditing"]', 4, 'review_checklist', 'd0000000-0000-4000-8000-000000000005',
  $json$[
    {"type":"objectives","items":[
      "Build a threat model for a multi-agent swarm including prompt injection and PII leakage",
      "Apply zero-trust principles to agents and federated peers",
      "Use Ruflo's AIDefence tools to scan inputs and detect PII",
      "Run a security audit and assign the right security agents"
    ]},
    {"type":"heading","text":"The agentic threat surface"},
    {"type":"prose","markdown":"A swarm's attack surface is unlike a monolith's. New classes appear: **prompt injection** (malicious input hijacks an agent's instructions), **PII exfiltration** (sensitive data leaking through agent messages or federation), and **compromised agents** (a Byzantine actor in your own swarm). Architect for all three explicitly."},
    {"type":"heading","text":"Zero-trust for agents"},
    {"type":"prose","markdown":"Zero-trust means no agent is trusted by virtue of being inside the swarm. This is already how federation works — remote agents start untrusted and earn privilege via mTLS + ed25519. Extend the same posture internally: validate inputs at every boundary and never let an agent's output flow into a privileged action unchecked."},
    {"type":"callout","variant":"note","markdown":"Ruflo's security agents are concrete: `security-architect` (designs the model), `security-auditor` (audits implementations), and `security-manager` (consensus/distributed security). Route security work to them rather than treating it as a side concern of `coder`."},
    {"type":"heading","text":"AIDefence: scanning untrusted input"},
    {"type":"prose","markdown":"Ruflo ships AIDefence specifically for the agentic threats above. Use it at system boundaries: scan inputs for prompt injection and unsafe content, and detect PII before data leaves a node or hits a log."},
    {"type":"code","language":"bash","caption":"Scan an input and check for PII before acting on it","code":"npx @claude-flow/cli@latest security scan\n# Programmatically via MCP:\n#   mcp__claude-flow__aidefence_scan / aidefence_is_safe / aidefence_has_pii"},
    {"type":"code","language":"javascript","caption":"Gate a privileged action on a safety check","code":"// Validate at the boundary, then act.\nconst safe = await mcp__claude-flow__aidefence_is_safe({ text: untrustedInput });\nif (!safe) throw new Error(\"Input failed AIDefence — refusing to proceed\");"},
    {"type":"callout","variant":"warning","markdown":"Treat every external string — user input, tool output, a federated peer's message — as hostile until scanned. The most common agentic breach is an injected instruction in 'data' that an agent then executes as a command."},
    {"type":"heading","text":"Defending against compromised agents"},
    {"type":"prose","markdown":"A compromised agent inside the swarm is a Byzantine fault. The defence is the same architecture from Lesson 2: run high-stakes decisions through `byzantine` consensus (f < n/3), so a single lying agent cannot forge agreement. Combine with federation's instant trust-downgrade to evict misbehaving peers."},
    {"type":"code","language":"bash","caption":"Run a full security audit of the project","code":"npx @claude-flow/cli@latest security scan\n# Or dispatch the audit background worker after security changes:\nnpx @claude-flow/cli@latest hooks worker dispatch --trigger audit"},
    {"type":"heading","text":"Compliance and audit trails"},
    {"type":"prose","markdown":"Auditability is a security control, not just paperwork. Federation produces a structured, searchable record of every cross-boundary event, with HIPAA/SOC2/GDPR compliance modes. For internal actions, the hooks and memory system give you the same traceability."},
    {"type":"callout","variant":"tip","markdown":"After any security-relevant change, dispatch the `audit` background worker. It runs asynchronously and flags regressions without blocking your main task — security review becomes continuous rather than a release-day scramble."},
    {"type":"quiz","question":"Which Ruflo capability is purpose-built to detect prompt injection and PII in untrusted input?","options":["the raft-manager agent","AIDefence (security scan / aidefence_* tools)","the gossip topology","HNSW search"],"answerIndex":1},
    {"type":"quiz","question":"A compromised agent inside your swarm is best modelled as which kind of fault, and defended with which consensus?","options":["crash fault, raft","Byzantine fault, byzantine consensus","crash fault, gossip","no fault, no consensus"],"answerIndex":1},
    {"type":"quiz","question":"What is the core principle of a zero-trust agent architecture?","options":["agents inside the swarm are trusted by default","no agent is trusted by location; identity and inputs are verified at every boundary","only the Queen agent is trusted","trust is granted once at startup and never revoked"],"answerIndex":1},
    {"type":"capstone","title":"Review Checklist: Swarm Security Audit","instructions":"Produce a security review checklist for a production swarm covering: a documented threat model (injection, PII, compromised agent), AIDefence scanning at each boundary, byzantine consensus on high-stakes commits, federation trust levels and eviction, and continuous `audit` worker dispatch. Run `security scan` / `audit` against a sample swarm and record findings against the checklist. Deliverable: the completed checklist plus the audit output."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 7 — Capstone Design Phase
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000007','d0000000-0000-4000-8000-000000000000',7,
  'Capstone Design Phase', '["Design production system","architecture decision records","topology and consensus selection"]', 6, 'architecture_doc', 'd0000000-0000-4000-8000-000000000006',
  $json$[
    {"type":"objectives","items":[
      "Translate a production requirement into a concrete swarm architecture",
      "Justify topology, consensus, and federation choices with the trade-offs from Lessons 1-6",
      "Write Architecture Decision Records (ADRs) for the capstone",
      "Plan the agent roster and coordination plan before writing code"
    ]},
    {"type":"heading","text":"The capstone, in one sentence"},
    {"type":"prose","markdown":"Over Lessons 7-11 you will **design, build, harden, deploy, and defend** a production-grade multi-agent system. This lesson is design only — no code. The goal is a defensible architecture you commit to before implementation, the way a real architect does."},
    {"type":"callout","variant":"note","markdown":"You are now operating as a `system-architect`. The deliverable is an architecture document plus ADRs — artifacts a review board (Lesson 11) will interrogate. Decisions made loosely here cost the most to undo in Lesson 8."},
    {"type":"heading","text":"From requirement to architecture"},
    {"type":"prose","markdown":"Start from a real requirement (e.g. a federated, multi-region task-processing platform). Decompose into bounded responsibilities, map each to an agent role, and only then choose how those agents coordinate. Architecture follows responsibility, not the other way around."},
    {"type":"heading","text":"Decision 1 — topology"},
    {"type":"prose","markdown":"Pick from Ruflo's real topologies: `hierarchical`, `mesh`, `hierarchical-mesh` (recommended default), or `adaptive`. Justify it against your load profile — stable load favours `hierarchical-mesh`; bursty, variable load may justify `adaptive` despite its overhead (Lesson 3)."},
    {"type":"code","language":"bash","caption":"Record the chosen topology as the swarm's init contract","code":"npx @claude-flow/cli@latest swarm init --topology hierarchical-mesh --max-agents 10 --strategy specialized"},
    {"type":"heading","text":"Decision 2 — consensus"},
    {"type":"prose","markdown":"Decide where you need agreement and how strong. Apply Lesson 2: `byzantine` (f < n/3) for high-stakes, adversary-tolerant commits; `raft` (f < n/2) for crash-only leadership; `gossip`/`crdt` for convergent state; `quorum` for tunable thresholds. Size your agent budget to the fault tolerance you commit to."},
    {"type":"heading","text":"Decision 3 — federation and security"},
    {"type":"prose","markdown":"If the system spans machines or regions, design the federation now: trust levels, PII boundaries, circuit-breaker fail-over (Lesson 5), and the threat model with AIDefence checkpoints (Lesson 6). Security designed in is cheap; bolted on is not."},
    {"type":"code","language":"bash","caption":"Search prior architectures before committing to yours","code":"npx @claude-flow/cli@latest memory search \\\n  --query \"federated multi-region production swarm architecture\" \\\n  --namespace patterns"},
    {"type":"callout","variant":"tip","markdown":"Use a design swarm to pressure-test your own architecture: spawn a `system-architect`, a `security-architect`, and a `perf-analyzer` and have them review the design via SendMessage before you write a line of implementation."},
    {"type":"heading","text":"Writing the ADRs"},
    {"type":"prose","markdown":"Every significant decision becomes an ADR: context, the decision, alternatives considered, and consequences. The review board will ask 'why not mesh?' or 'why raft over byzantine?' — your ADRs are the answers, written before you were under pressure."},
    {"type":"callout","variant":"warning","markdown":"Do not skip the agent roster and coordination plan. 'We'll figure out coordination during the build' is how Lesson 8 turns into a rewrite. Name every agent, its type, who it messages, and what it owns — now."},
    {"type":"heading","text":"Definition of done for the design phase"},
    {"type":"prose","markdown":"You are done when a peer could implement the system from your document alone: topology + max-agents fixed, consensus per decision point chosen and justified, federation/security boundaries drawn, agent roster and SendMessage plan complete, and an ADR for each major choice."},
    {"type":"quiz","question":"What is the correct order when designing the capstone swarm?","options":["choose topology, then find responsibilities to fit it","decompose responsibilities into agent roles, then choose how they coordinate","write code first, then document","pick consensus before knowing the failure model"],"answerIndex":1},
    {"type":"quiz","question":"Which artifact answers the review board's 'why not the alternative?' questions?","options":["the benchmark output","an Architecture Decision Record (ADR) per major choice","the agent logs","the federation audit trail"],"answerIndex":1},
    {"type":"capstone","title":"Architecture Document: Capstone Design","instructions":"Produce the capstone architecture document and ADRs. Required sections: requirement statement, responsibility-to-agent mapping, topology choice + justification, consensus per decision point + agent budget, federation/security model with AIDefence checkpoints, full agent roster with SendMessage coordination plan, and one ADR per major decision. Deliverable: an architecture doc a peer could build from unaided."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 8 — Capstone Build Phase
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000008','d0000000-0000-4000-8000-000000000000',8,
  'Capstone Build Phase', '["Full implementation","SendMessage coordination","memory and hooks integration"]', 8, 'code_exercise', 'd0000000-0000-4000-8000-000000000007',
  $json$[
    {"type":"objectives","items":[
      "Implement the designed swarm with named, coordinated agents",
      "Wire SendMessage-first coordination per the Lesson 7 roster",
      "Integrate AgentDB memory and hooks so the system self-learns",
      "Stand up the chosen consensus and (if applicable) federation"
    ]},
    {"type":"heading","text":"Build to the design, not around it"},
    {"type":"prose","markdown":"This phase implements exactly what Lesson 7 specified. Resist re-architecting mid-build; if the design is wrong, write an ADR amendment first. Discipline here is what separates an architect from someone who codes their way into a corner."},
    {"type":"heading","text":"Spawning the coordinated roster"},
    {"type":"prose","markdown":"Ruflo coordinates SendMessage-first: spawn all named agents in one batch, each knowing whom to message next, then kick off the pipeline. Names make agents addressable; background execution lets them run concurrently."},
    {"type":"code","language":"javascript","caption":"Spawn the capstone roster (all in one message) and start the pipeline","code":"Agent({ prompt: \"Research the domain. SendMessage findings to 'architect'.\",\n  subagent_type: \"researcher\", name: \"researcher\", run_in_background: true })\nAgent({ prompt: \"Wait for 'researcher'. Refine design. SendMessage to 'coder'.\",\n  subagent_type: \"system-architect\", name: \"architect\", run_in_background: true })\nAgent({ prompt: \"Wait for 'architect'. Implement. SendMessage to 'tester'.\",\n  subagent_type: \"coder\", name: \"coder\", run_in_background: true })\nAgent({ prompt: \"Wait for 'coder'. Write tests. SendMessage to 'reviewer'.\",\n  subagent_type: \"tester\", name: \"tester\", run_in_background: true })\nAgent({ prompt: \"Wait for 'tester'. Review quality + security.\",\n  subagent_type: \"reviewer\", name: \"reviewer\", run_in_background: true })\n\nSendMessage({ to: \"researcher\", summary: \"Start\", message: \"[capstone context]\" })"},
    {"type":"callout","variant":"note","markdown":"After spawning, the orchestrator stops and waits — agents message each other and complete automatically. Never poll status in a loop; that breaks the comms-first model and wastes tokens."},
    {"type":"heading","text":"Memory: making the build self-learning"},
    {"type":"prose","markdown":"Plans, trajectories, and outcomes flow into AgentDB; future steps retrieve past solutions via HNSW vector search. Before each major sub-task, search prior patterns; after success, store what worked. The build literally gets smarter as it proceeds."},
    {"type":"code","language":"bash","caption":"Search before, store after — the learning loop in the build","code":"npx @claude-flow/cli@latest memory search --query \"task router idempotency\" --namespace patterns\n# ... implement ...\nnpx @claude-flow/cli@latest memory store --namespace patterns \\\n  --key \"capstone-router-idempotency\" --value \"dedupe key = tenant+ticket+attempt\""},
    {"type":"heading","text":"Hooks: coordination and quality automation"},
    {"type":"prose","markdown":"Use `hooks pre-edit`/`post-edit` around every file change and `hooks post-task` at completion. These drive auto-formatting, neural pattern training, and progress tracking — the same hooks the rest of the swarm relies on for coordination."},
    {"type":"code","language":"bash","caption":"Standard hook discipline around an edit","code":"npx @claude-flow/cli@latest hooks pre-edit --file \"src/router.ts\"\n# ... edit ...\nnpx @claude-flow/cli@latest hooks post-edit --file \"src/router.ts\" --success true\nnpx @claude-flow/cli@latest hooks post-task --task-id \"build-router\" --success true"},
    {"type":"heading","text":"Standing up consensus and federation"},
    {"type":"prose","markdown":"Implement the consensus you designed: initialise the hive-mind with the chosen strategy and spawn its coordinator agent (`byzantine-coordinator`, `raft-manager`, `crdt-synchronizer`, etc). If the design is federated, run `federation init`/`join` per node and verify peers before routing cross-node work."},
    {"type":"callout","variant":"warning","markdown":"Build incrementally and keep it runnable. A capstone that only runs 'once everything is done' cannot be hardened or deployed in Lessons 9-10. Land a thin end-to-end slice first, then thicken it."},
    {"type":"heading","text":"Dispatch background workers as you go"},
    {"type":"prose","markdown":"As the codebase grows, let workers keep pace: dispatch `testgaps` after adding features and `map` every few file changes. They run asynchronously and surface gaps before they compound."},
    {"type":"code","language":"bash","caption":"Keep test coverage and the code map current during the build","code":"npx @claude-flow/cli@latest hooks worker dispatch --trigger testgaps\nnpx @claude-flow/cli@latest hooks worker dispatch --trigger map"},
    {"type":"quiz","question":"In SendMessage-first coordination, what does the orchestrator do after spawning the roster?","options":["poll each agent's status in a loop","stop and wait — agents message each other and complete automatically","terminate the swarm","re-spawn agents every 30 seconds"],"answerIndex":1},
    {"type":"quiz","question":"How does the build phase become self-learning?","options":["it re-trains the LLM weights","it searches prior patterns before sub-tasks and stores successes in AgentDB (HNSW)","it disables memory for speed","it copies code from a template repo"],"answerIndex":1},
    {"type":"capstone","title":"Running System: Capstone Build","instructions":"Implement the Lesson 7 design as a runnable system. Required: the named-agent roster wired SendMessage-first, the designed consensus initialised with its coordinator agent, memory search/store + hooks around the work, and (if federated) verified peers. Build a thin end-to-end slice first. Deliverable: a running system that executes the core workflow end to end."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 9 — Capstone Hardening Phase
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000009','d0000000-0000-4000-8000-000000000000',9,
  'Capstone Hardening Phase', '["Security audits","performance optimization","bottleneck detection","resilience"]', 6, 'test_suite', 'd0000000-0000-4000-8000-000000000008',
  $json$[
    {"type":"objectives","items":[
      "Run security and performance audits against the built capstone",
      "Find and remove bottlenecks with Ruflo's performance tooling",
      "Verify the system survives faults the design claims to tolerate",
      "Produce a hardening test suite as evidence"
    ]},
    {"type":"heading","text":"Hardening = prove the design's promises"},
    {"type":"prose","markdown":"Lessons 7-8 made claims: 'tolerates 2 Byzantine agents', 'p95 under X', 'no PII leaves a node'. Hardening is where you *prove* each claim or amend the design. Treat every architectural promise as a hypothesis to test."},
    {"type":"heading","text":"Security audit pass"},
    {"type":"prose","markdown":"Run the security audit and AIDefence scans against the real implementation, not the design. Route findings to `security-auditor`. Confirm every boundary scans untrusted input and that high-stakes commits genuinely route through byzantine consensus."},
    {"type":"code","language":"bash","caption":"Audit the implementation and scan for issues","code":"npx @claude-flow/cli@latest hooks worker dispatch --trigger audit\nnpx @claude-flow/cli@latest security scan\nnpx @claude-flow/cli@latest hooks worker dispatch --trigger audit"},
    {"type":"callout","variant":"note","markdown":"A passing design review does not imply a passing audit. Implementation drift — an unscanned input path, a privileged action wired to raw agent output — is exactly what the audit phase exists to catch."},
    {"type":"heading","text":"Performance and bottleneck detection"},
    {"type":"prose","markdown":"Profile before optimising. Ruflo's performance tooling benchmarks the swarm and surfaces bottlenecks; the `perf-analyzer` and `performance-benchmarker` agents specialise in interpreting the results. Optimise the measured hot path, not the one you assume."},
    {"type":"code","language":"bash","caption":"Benchmark and locate bottlenecks","code":"npx @claude-flow/cli@latest performance benchmark\n# Programmatically: mcp__claude-flow__performance_bottleneck / performance_profile\nnpx @claude-flow/cli@latest hooks worker dispatch --trigger optimize"},
    {"type":"callout","variant":"tip","markdown":"Real levers, with measured numbers: ReasoningBank retrieval (~-32% tokens), Agent Booster edits (~-15%), cache at 95% hit rate (~-10%), optimal batch size (~-20%). Tune batch size and cache hit rate before reaching for exotic changes."},
    {"type":"heading","text":"Fault-injection: test the tolerance claim"},
    {"type":"prose","markdown":"If the design tolerates f Byzantine agents, prove it: inject f misbehaving agents and confirm consensus still produces the correct commit. If it tolerates a region loss, trip the federation circuit breaker and confirm fail-over. A tolerance you never tested is a tolerance you don't have."},
    {"type":"code","language":"bash","caption":"Inspect the federation circuit breaker during fault tests","code":"npx -y -p @claude-flow/plugin-agent-federation@latest ruflo-federation status\n# mcp__claude-flow__federation_breaker_status reports tripped peers"},
    {"type":"callout","variant":"warning","markdown":"Do not 'optimise' away your fault tolerance. Shrinking a 7-agent byzantine quorum to 4 to cut cost silently drops you below n >= 3f+1 and breaks the safety guarantee. Re-derive the bound after any sizing change."},
    {"type":"heading","text":"The hardening test suite"},
    {"type":"prose","markdown":"Capture all of this as a repeatable test suite: security assertions, performance budgets (assert p95 < target), and fault-injection scenarios. This suite becomes the gate for Lesson 10's deployment and the evidence for Lesson 11's defense."},
    {"type":"code","language":"bash","caption":"Generate test coverage for gaps, then run the suite","code":"npx @claude-flow/cli@latest hooks worker dispatch --trigger testgaps\nnpm test"},
    {"type":"quiz","question":"Why must you run an audit against the implementation even after a passing design review?","options":["audits are required by law","implementation drift can introduce unscanned paths the design didn't have","the design review only checks formatting","to retrain the neural patterns"],"answerIndex":1},
    {"type":"quiz","question":"You shrink a byzantine quorum from 7 to 4 agents to save cost. What breaks?","options":["nothing","the n >= 3f+1 bound — fault tolerance silently drops","only latency","the gossip layer"],"answerIndex":1},
    {"type":"quiz","question":"Which measured optimization lever gives the largest token reduction?","options":["cache at 95% hit rate (~-10%)","ReasoningBank retrieval (~-32%)","Agent Booster edits (~-15%)","optimal batch size (~-20%)"],"answerIndex":1},
    {"type":"capstone","title":"Test Suite: Hardening Evidence","instructions":"Deliver a repeatable hardening test suite proving the capstone's claims: security assertions backed by `audit`/`security scan`, performance budgets asserted against `performance benchmark` output, and fault-injection scenarios (Byzantine agents and/or region loss) that confirm the designed tolerance. Deliverable: the passing suite plus a short report of what you found and fixed."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 10 — Capstone Deployment Phase
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000010','d0000000-0000-4000-8000-000000000000',10,
  'Capstone Deployment Phase', '["Production launch","SRE handoff","observability","daemon and monitoring"]', 5, 'production_deployment', 'd0000000-0000-4000-8000-000000000009',
  $json$[
    {"type":"objectives","items":[
      "Launch the hardened capstone to production with the Ruflo daemon",
      "Set up observability — tracing, metrics, and log correlation",
      "Prepare an SRE handoff package with runbooks and alerts",
      "Verify health across the swarm and any federated nodes"
    ]},
    {"type":"heading","text":"Deploy only what passed hardening"},
    {"type":"prose","markdown":"The gate into production is the Lesson 9 test suite. If it passes, deploy; if not, you are not ready. Deployment is a controlled promotion of a proven artifact, never the first time the system runs under real conditions."},
    {"type":"heading","text":"Running the production loop"},
    {"type":"prose","markdown":"On each node, the Ruflo daemon runs the coordination loop persistently; `doctor` verifies the installation and fixes common issues before launch. Stand these up per node, including each federated region."},
    {"type":"code","language":"bash","caption":"Verify the install and start the daemon on each node","code":"npx @claude-flow/cli@latest doctor --fix\nnpx @claude-flow/cli@latest daemon start\nnpx @claude-flow/cli@latest swarm init --topology hierarchical-mesh --max-agents 10 --strategy specialized"},
    {"type":"callout","variant":"note","markdown":"For a federated deployment, bring up federation per region (`federation init` / `join`) and confirm `federation status` shows the expected peers and trust levels before routing production traffic across boundaries."},
    {"type":"heading","text":"Observability is non-negotiable"},
    {"type":"prose","markdown":"You cannot operate what you cannot see. Wire tracing of agent execution, swarm metrics, and correlated logs. Ruflo's observability tooling lets you trace a task across agents and correlate telemetry — essential when a failure spans a multi-agent, multi-node system."},
    {"type":"code","language":"bash","caption":"Check system and swarm health post-launch","code":"npx @claude-flow/cli@latest status\nnpx @claude-flow/cli@latest swarm status\n# Observability MCP: mcp__claude-flow__system_health / swarm_health / performance_metrics"},
    {"type":"callout","variant":"tip","markdown":"Dispatch the `document` background worker after deployment to keep runbooks and API docs in sync with what actually shipped. SRE handoff quality lives or dies on whether the docs match reality."},
    {"type":"heading","text":"The SRE handoff package"},
    {"type":"prose","markdown":"A clean handoff includes: an architecture summary, runbooks for the top failure modes (region loss, tripped circuit breaker, consensus stall), alert thresholds tied to your hardening budgets, and the federation audit query SREs use for incident forensics. Hand over operability, not just code."},
    {"type":"code","language":"bash","caption":"Federation audit query for incident forensics","code":"npx -y -p @claude-flow/plugin-agent-federation@latest ruflo-federation audit"},
    {"type":"callout","variant":"warning","markdown":"Have a rollback before you launch, not after an incident. Know how to revert the deployment, evict a misbehaving federated peer, and fail a region over via the circuit breaker — and document each in the runbook."},
    {"type":"heading","text":"Definition of done for deployment"},
    {"type":"prose","markdown":"Deployment is complete when: the hardened build runs under the daemon on every node, observability (traces/metrics/logs) is live and alerting on the right budgets, federation health is verified, and the SRE handoff package — runbooks, alerts, rollback, audit access — is delivered and acknowledged."},
    {"type":"quiz","question":"What is the gate into the deployment phase?","options":["the architect's approval","a passing Lesson 9 hardening test suite","a green CI badge","the review board (Lesson 11)"],"answerIndex":1},
    {"type":"quiz","question":"Which Ruflo component runs the coordination loop persistently in production?","options":["the daemon","the quiz engine","a one-shot CLI invocation","the browser session"],"answerIndex":0},
    {"type":"quiz","question":"A clean SRE handoff must include which of these?","options":["only the source code","runbooks, alert thresholds, rollback plan, and audit access","just a Slack channel","the design ADRs alone"],"answerIndex":1},
    {"type":"capstone","title":"Deployment: Production Launch & SRE Handoff","instructions":"Deploy the hardened capstone: run `doctor --fix` and `daemon start` per node, initialise the production swarm and (if federated) verify peers, wire tracing/metrics/log correlation with alerts tied to hardening budgets, and dispatch the `document` worker. Deliver an SRE handoff package: architecture summary, runbooks for top failures, alert thresholds, rollback plan, and federation audit access. Deliverable: a live deployment plus the handoff package."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 11 — Capstone Defense
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000011','d0000000-0000-4000-8000-000000000000',11,
  'Capstone Defense', '["Technical presentation","architecture defense","trade-off justification"]', 2, 'community_presentation', 'd0000000-0000-4000-8000-000000000010',
  $json$[
    {"type":"objectives","items":[
      "Present the capstone architecture and results to a technical review board",
      "Defend topology, consensus, federation, and security choices with evidence",
      "Connect every claim back to measured results from the hardening phase",
      "Field hard questions on trade-offs and failure modes"
    ]},
    {"type":"heading","text":"The defense, framed"},
    {"type":"prose","markdown":"A capstone defense is not a demo — it is an architect justifying decisions to peers who will probe for weakness. Your ADRs (Lesson 7) and hardening evidence (Lesson 9) are your arguments. The board's job is to find where they break; yours is to show they don't."},
    {"type":"heading","text":"Structure of a strong defense"},
    {"type":"prose","markdown":"Lead with the requirement and the headline architecture, then walk the key decisions in order of risk. For each: the choice, the alternatives, and the *evidence* that the choice was right. Close with known limitations — naming them yourself is far stronger than having the board find them."},
    {"type":"callout","variant":"note","markdown":"Every assertion must trace to an artifact: a topology claim to a `performance benchmark` number, a fault-tolerance claim to a fault-injection test, a security claim to an `audit` result. 'It felt right' is not a defense."},
    {"type":"heading","text":"Anticipating the hard questions"},
    {"type":"prose","markdown":"Pre-write answers to the questions a sharp board will ask:\n\n- *Why hierarchical-mesh and not adaptive?* — load profile, thrashing risk, benchmark.\n- *Why byzantine and not raft?* — the threat model includes compromised agents; raft only handles crash faults.\n- *What happens when a region drops?* — circuit breaker fail-over, quorum sized to survive it.\n- *Where can PII leak?* — boundary scans + node-side PII stripping, proven by audit."},
    {"type":"code","language":"bash","caption":"Pull the evidence you will cite live during the defense","code":"npx @claude-flow/cli@latest performance benchmark   # latency/cost claims\nnpx @claude-flow/cli@latest security scan                    # security claims\nnpx -y -p @claude-flow/plugin-agent-federation@latest ruflo-federation audit         # compliance/forensics"},
    {"type":"callout","variant":"tip","markdown":"Rehearse with an adversarial swarm: spawn a `system-architect`, `security-architect`, and `perf-analyzer` and have them interrogate your design via SendMessage. Fix what they break *before* the real board sees it."},
    {"type":"heading","text":"Owning the limitations"},
    {"type":"prose","markdown":"Every architecture has limits — a latency ceiling, an untested failure combination, a cost trade-off. State them plainly with the rationale ('we accepted X to gain Y') and a path to address them. A defense that pretends there are no trade-offs is the least credible kind."},
    {"type":"callout","variant":"warning","markdown":"Do not bluff a number. If a metric wasn't measured, say so and explain how you'd measure it. A board will forgive a known gap; it will not forgive a fabricated result."},
    {"type":"heading","text":"What 'passing' means"},
    {"type":"prose","markdown":"You pass the defense when every major decision is justified by evidence, the failure modes are understood and mitigated, the limitations are owned, and the board agrees the system is fit for the production purpose it was designed for."},
    {"type":"quiz","question":"What must every assertion in the defense trace back to?","options":["the architect's opinion","a concrete artifact (benchmark, audit, fault-injection test)","the longest ADR","the number of agents used"],"answerIndex":1},
    {"type":"quiz","question":"If a board asks for a metric you never measured, the right move is to:","options":["estimate a plausible-sounding number","say it wasn't measured and explain how you'd measure it","change the subject","claim it's proprietary"],"answerIndex":1},
    {"type":"quiz","question":"Why state your architecture's limitations yourself?","options":["it wastes the board's time","naming them yourself is more credible than the board finding them","limitations are not allowed","to lengthen the presentation"],"answerIndex":1},
    {"type":"capstone","title":"Architecture Defense: Board Presentation","instructions":"Defend the capstone to a technical review board (a rehearsal swarm of system-architect, security-architect, and perf-analyzer counts). Required: requirement + headline architecture, key decisions walked by risk with alternatives and cited evidence, pre-written answers to the four hard questions, and an owned list of limitations with rationale and remediation path. Deliverable: the presentation plus a Q&A record showing how each challenge was answered."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;

-- ============================================================
-- Lesson 12 — Expert Mentorship Setup
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES (
  'd0000000-0000-4000-8000-000000000012','d0000000-0000-4000-8000-000000000000',12,
  'Expert Mentorship Setup', '["Mentoring junior architects","knowledge transfer","pattern libraries","community"]', 2, 'mentorship', 'd0000000-0000-4000-8000-000000000011',
  $json$[
    {"type":"objectives","items":[
      "Capture your capstone learnings as reusable patterns for others",
      "Set up a mentoring workflow for junior architects",
      "Use Ruflo's memory and skills to make expertise transferable",
      "Define a review checklist mentors can apply to mentee designs"
    ]},
    {"type":"heading","text":"From practitioner to mentor"},
    {"type":"prose","markdown":"Completing the Advanced path makes you an architect; the final step is multiplying that expertise. Mentorship is knowledge *transfer* — turning the hard-won judgment from your capstone into something a junior architect can learn from quickly."},
    {"type":"heading","text":"Encode expertise as patterns"},
    {"type":"prose","markdown":"The most durable way to share knowledge in Ruflo is the pattern memory. Every non-obvious decision from your capstone — why byzantine over raft here, how you sized the quorum, the federation fail-over shape — becomes a stored pattern a mentee's swarm can retrieve via HNSW search."},
    {"type":"code","language":"bash","caption":"Curate a pattern library from your capstone","code":"npx @claude-flow/cli@latest memory store --namespace patterns \\\n  --key \"federated-quorum-sizing\" \\\n  --value \"size byzantine quorum n>=3f+1 for f tolerated; re-derive after any cost cut\"\nnpx @claude-flow/cli@latest memory search --query \"quorum sizing\" --namespace patterns"},
    {"type":"callout","variant":"tip","markdown":"A good pattern names the *decision and its rationale*, not just the answer. 'Use byzantine' is weak; 'use byzantine when the threat model includes compromised agents, because raft only tolerates crash faults' is teachable."},
    {"type":"heading","text":"Package teaching as a skill"},
    {"type":"prose","markdown":"Recurring guidance can become a Ruflo skill (Lesson 4): scaffold one with `skill-builder`, encode your review heuristics, and a mentee invokes it on demand. Now your judgment is a tool, not a calendar dependency."},
    {"type":"heading","text":"A mentoring workflow"},
    {"type":"prose","markdown":"Set up a lightweight loop: a mentee designs (Lesson 7 style), you review against a checklist, and you point them at the relevant stored patterns instead of giving the answer. The goal is to grow their judgment, not to architect for them."},
    {"type":"code","language":"javascript","caption":"A reviewer agent applies your checklist to a mentee's design","code":"Agent({ prompt: \"Review the mentee's swarm design against the architecture checklist. \\\nCite stored patterns from the 'patterns' namespace; do not rewrite their design.\",\n  subagent_type: \"reviewer\", name: \"mentor-reviewer\", run_in_background: true })"},
    {"type":"callout","variant":"note","markdown":"Mentorship and the platform reinforce each other: every pattern you store and skill you publish raises the floor for the whole community, and the learning loop spreads those patterns automatically to future swarms."},
    {"type":"heading","text":"The mentor's review checklist"},
    {"type":"prose","markdown":"Give mentors a concrete rubric drawn from this path: Is the topology justified against the load profile? Does the consensus match the failure model (and is the quorum sized correctly)? Is the threat model documented with AIDefence checkpoints? Are decisions captured as ADRs? Are tolerance claims backed by fault-injection tests?"},
    {"type":"callout","variant":"warning","markdown":"Resist solving the mentee's problem for them. Handing over your capstone's answer teaches nothing; pointing to the pattern and the trade-off that produced it builds an architect who can decide the next case alone."},
    {"type":"heading","text":"Closing the loop"},
    {"type":"prose","markdown":"You have travelled from game theory to a defended, deployed production system, and now to teaching it forward. The Advanced path ends, but the learning loop does not — every pattern you contribute makes the next architect's path shorter."},
    {"type":"quiz","question":"What is the most durable way to make capstone expertise reusable in Ruflo?","options":["a long email","storing decisions-with-rationale as patterns retrievable via HNSW search","keeping it in your head","deleting old swarms"],"answerIndex":1},
    {"type":"quiz","question":"A strong mentoring move when reviewing a mentee's design is to:","options":["rewrite their architecture for them","point them at the relevant stored pattern and the trade-off behind it","approve everything to be encouraging","require they copy your capstone exactly"],"answerIndex":1},
    {"type":"quiz","question":"What makes a stored pattern 'teachable'?","options":["it is short","it names the decision AND its rationale, not just the answer","it uses the mesh topology","it has no quiz attached"],"answerIndex":1},
    {"type":"capstone","title":"Review Checklist: Mentor Rubric & Pattern Library","instructions":"Set up your mentorship practice: (1) curate at least five decisions-with-rationale from your capstone into the `patterns` namespace, (2) define a mentor review checklist covering topology, consensus/quorum sizing, threat model, ADRs, and tolerance evidence, and (3) wire a `reviewer` agent that applies the checklist and cites patterns without rewriting the design. Deliverable: the pattern library, the checklist, and a sample review of a mentee design."}
  ]$json$,
  'PUBLISHED'
)
ON CONFLICT (lesson_id) DO NOTHING;
