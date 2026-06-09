-- Migration 012: Skill Lab Read Models (ADR-015)
-- Creates exercise catalog and attempt tracking tables in ruflo_demo schema.

SET search_path = ruflo_demo;

-- ─────────────────────────────────────────────────────────────────────────────
-- Exercise catalog (public read for published exercises)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_exercise_read_model (
  exercise_id        UUID         PRIMARY KEY,
  skill_lab_id       VARCHAR(128) NOT NULL,
  title              TEXT         NOT NULL,
  skill              VARCHAR(64)  NOT NULL,  -- message-passing|leader-election|consensus|topology|memory
  level              VARCHAR(32)  NOT NULL,  -- beginner|intermediate|advanced
  description        TEXT         NOT NULL,
  instructions       TEXT         NOT NULL,
  starter_code       TEXT         NOT NULL DEFAULT '',
  hints              JSONB        NOT NULL DEFAULT '[]',
  bonus_challenges   JSONB        NOT NULL DEFAULT '[]',
  status             VARCHAR(32)  NOT NULL DEFAULT 'published',
  lesson_id          UUID         NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_level  ON ruflo_demo.ruflo_demo_exercise_read_model (level);
CREATE INDEX IF NOT EXISTS idx_exercise_status ON ruflo_demo.ruflo_demo_exercise_read_model (status);
CREATE INDEX IF NOT EXISTS idx_exercise_skill  ON ruflo_demo.ruflo_demo_exercise_read_model (skill);

-- ─────────────────────────────────────────────────────────────────────────────
-- Exercise attempt tracking (owner-scoped per learner)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_exercise_attempt_read_model (
  attempt_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id     UUID        NOT NULL,
  exercise_id    UUID        NOT NULL,
  submitted_code TEXT,
  test_results   JSONB       NOT NULL DEFAULT '{}',
  hints_used     INT         NOT NULL DEFAULT 0,
  status         VARCHAR(32) NOT NULL DEFAULT 'in_progress',
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_attempt_learner   ON ruflo_demo.ruflo_demo_exercise_attempt_read_model (learner_id);
CREATE INDEX IF NOT EXISTS idx_attempt_exercise  ON ruflo_demo.ruflo_demo_exercise_attempt_read_model (exercise_id);
CREATE INDEX IF NOT EXISTS idx_attempt_status    ON ruflo_demo.ruflo_demo_exercise_attempt_read_model (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ruflo_demo.ruflo_demo_exercise_read_model         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo.ruflo_demo_exercise_attempt_read_model ENABLE ROW LEVEL SECURITY;

-- Exercises: public read for published rows
DROP POLICY IF EXISTS exercises_public_read ON ruflo_demo.ruflo_demo_exercise_read_model;
CREATE POLICY exercises_public_read
  ON ruflo_demo.ruflo_demo_exercise_read_model
  FOR SELECT
  USING (status = 'published');

-- Exercises: service role can do anything
DROP POLICY IF EXISTS exercises_service_all ON ruflo_demo.ruflo_demo_exercise_read_model;
CREATE POLICY exercises_service_all
  ON ruflo_demo.ruflo_demo_exercise_read_model
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Attempts: owner can read their own rows
DROP POLICY IF EXISTS attempts_owner_read ON ruflo_demo.ruflo_demo_exercise_attempt_read_model;
CREATE POLICY attempts_owner_read
  ON ruflo_demo.ruflo_demo_exercise_attempt_read_model
  FOR SELECT
  TO authenticated
  USING (auth.uid() = learner_id);

-- Attempts: owner can insert (start attempt)
DROP POLICY IF EXISTS attempts_owner_insert ON ruflo_demo.ruflo_demo_exercise_attempt_read_model;
CREATE POLICY attempts_owner_insert
  ON ruflo_demo.ruflo_demo_exercise_attempt_read_model
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = learner_id);

-- Attempts: owner can update their own rows
DROP POLICY IF EXISTS attempts_owner_update ON ruflo_demo.ruflo_demo_exercise_attempt_read_model;
CREATE POLICY attempts_owner_update
  ON ruflo_demo.ruflo_demo_exercise_attempt_read_model
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = learner_id)
  WITH CHECK (auth.uid() = learner_id);

-- Attempts: service role has full access
DROP POLICY IF EXISTS attempts_service_all ON ruflo_demo.ruflo_demo_exercise_attempt_read_model;
CREATE POLICY attempts_service_all
  ON ruflo_demo.ruflo_demo_exercise_attempt_read_model
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON ruflo_demo.ruflo_demo_exercise_read_model TO anon, authenticated;
GRANT ALL    ON ruflo_demo.ruflo_demo_exercise_attempt_read_model TO service_role;
GRANT SELECT, INSERT, UPDATE ON ruflo_demo.ruflo_demo_exercise_attempt_read_model TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed exercises — real Ruflo orchestration patterns (ADR-015 §1 / ADR-014)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO ruflo_demo.ruflo_demo_exercise_read_model
  (exercise_id, skill_lab_id, title, skill, level, description, instructions, starter_code, hints, bonus_challenges, status)
VALUES

-- Exercise 1: Beginner — SendMessage basics
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  'skill-lab-v1',
  'Your First Agent Pipeline',
  'message-passing',
  'beginner',
  'Learn the SendMessage-first coordination model by wiring two named agents together.',
  E'## Your First Agent Pipeline\n\n'
  'In Ruflo, agents coordinate via `SendMessage` — not polling. '
  'You''ll spawn a **writer** agent and a **reviewer** agent, and have the writer send its output to the reviewer.\n\n'
  '### Objectives\n'
  '- Spawn two named agents in a single message using `run_in_background: true`\n'
  '- Use `SendMessage` to pass work from writer → reviewer\n'
  '- Both agents must include `to:` and a `summary:` field\n\n'
  '### Requirements\n'
  '1. Spawn `writer` and `reviewer` agents in ONE call\n'
  '2. The writer must call `SendMessage({ to: "reviewer", summary: "...", message: "..." })`\n'
  '3. The reviewer must acknowledge receipt\n\n'
  '### Why this matters\n'
  'SendMessage-first coordination eliminates polling, prevents race conditions, '
  'and makes agent pipelines observable and debuggable.',
  E'// TODO: Spawn both agents in a single batch (run_in_background: true)\n'
  '// Agent 1 — writer\n'
  '// Agent({\n'
  '//   prompt: "Write a one-sentence summary of the Ruflo SendMessage pattern. '
  'Then SendMessage({ to: \\"reviewer\\", summary: \\"draft ready\\", message: \\"<your summary>\\" })",\n'
  '//   name: "writer",\n'
  '//   run_in_background: true\n'
  '// })\n\n'
  '// Agent 2 — reviewer\n'
  '// Agent({\n'
  '//   prompt: "Wait for a message from writer. Acknowledge by logging the summary you received.",\n'
  '//   name: "reviewer",\n'
  '//   run_in_background: true\n'
  '// })\n\n'
  '// TODO: Kick off the pipeline\n'
  '// SendMessage({ to: "writer", summary: "Start", message: "Begin the pipeline." })',
  '[
    {"index": 0, "text": "Both Agent() calls must be in the same message — that is what makes spawning parallel."},
    {"index": 1, "text": "SendMessage takes three fields: to (agent name), summary (short label), and message (full content)."}
  ]'::jsonb,
  '[{"text": "Add a third agent that logs metrics after the reviewer finishes."}]'::jsonb,
  'published'
),

-- Exercise 2: Beginner — Fan-out pattern
(
  'a1b2c3d4-0002-0002-0002-000000000002',
  'skill-lab-v1',
  'Fan-Out Research with Named Agents',
  'message-passing',
  'beginner',
  'Spawn three parallel research agents and collect their results with a coordinator.',
  E'## Fan-Out Research\n\n'
  'The **fan-out** pattern spawns multiple independent agents in one message, '
  'each doing a slice of work, then each sends results back to a **coordinator**.\n\n'
  '### Objectives\n'
  '- Spawn 3 research agents + 1 coordinator in ONE message\n'
  '- Each researcher sends findings to the coordinator via `SendMessage`\n'
  '- Coordinator waits for all three before summarising\n\n'
  '### Requirements\n'
  '1. Agents: `researcher-a`, `researcher-b`, `researcher-c`, `coordinator`\n'
  '2. Each researcher: `SendMessage({ to: "coordinator", summary: "findings", message: <result> })`\n'
  '3. Coordinator logs all three findings\n\n'
  '### Topology hint\n'
  'Fan-out suits tasks where sub-topics are independent. '
  'Use `hierarchical` topology when a lead agent must synthesise sub-results.',
  E'// TODO: Spawn all 4 agents in ONE message\n'
  '// Agent({ prompt: "Research topic A. Send findings to coordinator.", name: "researcher-a", run_in_background: true })\n'
  '// Agent({ prompt: "Research topic B. Send findings to coordinator.", name: "researcher-b", run_in_background: true })\n'
  '// Agent({ prompt: "Research topic C. Send findings to coordinator.", name: "researcher-c", run_in_background: true })\n'
  '// Agent({\n'
  '//   prompt: "Wait for messages from researcher-a, researcher-b, researcher-c. Log all findings.",\n'
  '//   name: "coordinator",\n'
  '//   run_in_background: true\n'
  '// })\n\n'
  '// TODO: kick off\n'
  '// SendMessage({ to: "researcher-a", summary: "Start", message: "Research Ruflo topologies." })\n'
  '// SendMessage({ to: "researcher-b", summary: "Start", message: "Research SendMessage protocol." })\n'
  '// SendMessage({ to: "researcher-c", summary: "Start", message: "Research memory patterns." })',
  '[
    {"index": 0, "text": "Spawn ALL 4 agents before sending any messages — otherwise some may not exist yet when messages arrive."},
    {"index": 1, "text": "The coordinator should wait (e.g. with a loop) until it has received messages from all three researchers."}
  ]'::jsonb,
  '[{"text": "Add a timeout: if a researcher does not respond in 30s, have the coordinator log a warning."}]'::jsonb,
  'published'
),

-- Exercise 3: Intermediate — Hierarchical topology
(
  'a1b2c3d4-0003-0003-0003-000000000003',
  'skill-lab-v1',
  'Hierarchical Swarm for Feature Development',
  'topology',
  'intermediate',
  'Build a hierarchical swarm where an architect delegates to a coder and a tester, then reviews their output.',
  E'## Hierarchical Swarm — Feature Development\n\n'
  'The **hierarchical** topology has a single coordinator that breaks down work, '
  'delegates to specialists, and synthesises results.\n\n'
  '### Objectives\n'
  '- Use `swarm init --topology hierarchical` (or the equivalent MCP call)\n'
  '- Architect delegates a sub-task to coder via `SendMessage`\n'
  '- Coder sends implementation to tester\n'
  '- Tester reports pass/fail back to architect\n\n'
  '### Requirements\n'
  '1. Agents: `architect`, `coder`, `tester`\n'
  '2. Message chain: architect → coder → tester → architect\n'
  '3. Architect must issue a final summary after receiving tester''s report\n\n'
  '### CLI reference\n'
  '```bash\n'
  'npx -y ruflo/cli swarm init --topology hierarchical --max-agents 4\n'
  '```',
  E'// TODO: initialise a hierarchical swarm via MCP or CLI\n'
  '// mcp__claude-flow__swarm_init({ topology: "hierarchical", maxAgents: 4, strategy: "specialized" })\n\n'
  '// TODO: Spawn all agents in ONE message\n'
  '// Agent({\n'
  '//   prompt: "You are the architect. Delegate \'implement a hello-world function\' to coder. '
  'After tester reports, summarise.",\n'
  '//   name: "architect", run_in_background: true\n'
  '// })\n'
  '// Agent({\n'
  '//   prompt: "Wait for architect. Implement the task. SendMessage to tester with your code.",\n'
  '//   name: "coder", run_in_background: true\n'
  '// })\n'
  '// Agent({\n'
  '//   prompt: "Wait for coder. Verify the code has a function body. '
  'SendMessage to architect with pass/fail.",\n'
  '//   name: "tester", run_in_background: true\n'
  '// })\n\n'
  '// TODO: kick off\n'
  '// SendMessage({ to: "architect", summary: "Start", message: "Begin the feature pipeline." })',
  '[
    {"index": 0, "text": "In hierarchical topology the architect (coordinator) is the only agent that talks to the user. All sub-agents communicate upward via SendMessage."},
    {"index": 1, "text": "Spawn all three agents BEFORE sending the kick-off message so they are all listening when messages arrive."}
  ]'::jsonb,
  '[{"text": "Add a reviewer agent that the architect consults before issuing the final summary."}]'::jsonb,
  'published'
),

-- Exercise 4: Intermediate — Memory coordination
(
  'a1b2c3d4-0004-0004-0004-000000000004',
  'skill-lab-v1',
  'Cross-Agent Memory Sharing',
  'memory',
  'intermediate',
  'Use Ruflo memory tools so agents can share state without direct messaging.',
  E'## Cross-Agent Memory Sharing\n\n'
  'Sometimes agents work in separate turns or sessions and cannot use direct `SendMessage`. '
  '`memory_store` and `memory_search` bridge the gap.\n\n'
  '### Objectives\n'
  '- Agent A stores a decision in memory with a namespaced key\n'
  '- Agent B retrieves it in a later turn without receiving a direct message\n'
  '- Use `mcp__claude-flow__memory_store` and `mcp__claude-flow__memory_search`\n\n'
  '### Requirements\n'
  '1. Key format: `swarm/<session-id>/agent-<name>/<step>` (namespaced, collision-safe)\n'
  '2. Value must include `{ timestamp, decision, nextSteps[] }`\n'
  '3. Agent B must log what it retrieved before acting\n\n'
  '### When to use memory vs SendMessage\n'
  '- **SendMessage**: real-time handoff within the same session\n'
  '- **memory_store**: async handoff across turns or sessions',
  E'// TODO: Agent A — store a decision\n'
  '// Agent({\n'
  '//   prompt: `Store a decision in memory:\n'
  '//     mcp__claude-flow__memory_store({\n'
  '//       key: "swarm/sess-1/agent-planner/step-1",\n'
  '//       value: JSON.stringify({ timestamp: Date.now(), decision: "use hierarchical topology", nextSteps: ["spawn architect"] }),\n'
  '//       namespace: "patterns"\n'
  '//     })\n'
  '//     Then log: "Decision stored."`,\n'
  '//   name: "planner", run_in_background: true\n'
  '// })\n\n'
  '// TODO: Agent B — retrieve in a later step\n'
  '// Agent({\n'
  '//   prompt: `Retrieve the planner decision:\n'
  '//     mcp__claude-flow__memory_search({ query: "hierarchical topology decision", namespace: "patterns" })\n'
  '//     Log what you find, then proceed.`,\n'
  '//   name: "executor", run_in_background: true\n'
  '// })',
  '[
    {"index": 0, "text": "Use a consistent key prefix (e.g. swarm/<id>/) to avoid collisions between concurrent sessions."},
    {"index": 1, "text": "memory_search does semantic lookup — you can search by concept, not just exact key."}
  ]'::jsonb,
  '[{"text": "Implement a cleanup step that deletes stale memory keys older than 1 hour."}]'::jsonb,
  'published'
),

-- Exercise 5: Advanced — Leader election
(
  'a1b2c3d4-0005-0005-0005-000000000005',
  'skill-lab-v1',
  'Leader Election in a Mesh Swarm',
  'leader-election',
  'advanced',
  'Implement a simple leader-election protocol in a 4-node mesh swarm using SendMessage voting.',
  E'## Leader Election — Mesh Swarm\n\n'
  'In a **mesh** topology every agent can message every other agent directly. '
  'Use this to implement a majority-vote leader election.\n\n'
  '### Objectives\n'
  '- Spawn 4 peer agents in a mesh\n'
  '- Each peer proposes itself as leader by broadcasting a vote request\n'
  '- A peer becomes leader when it has received 2+ votes\n'
  '- Leader sends `SendMessage({ to: "user", summary: "leader elected", message: <leaderId> })`\n\n'
  '### Requirements\n'
  '1. Agents: `node-a`, `node-b`, `node-c`, `node-d`\n'
  '2. First agent to collect a majority (≥ 3/4 votes) wins\n'
  '3. Leader announces itself to all peers\n\n'
  '### CLI reference\n'
  '```bash\n'
  'npx -y ruflo/cli swarm init --topology mesh --max-agents 4\n'
  '```\n\n'
  '### Topology comparison\n'
  '| Topology | Best for |\n'
  '|---|---|\n'
  '| `mesh` | Consensus / peer coordination |\n'
  '| `hierarchical` | Top-down delegation |\n'
  '| `hierarchical-mesh` | Large swarms with sub-groups |',
  E'// TODO: init mesh swarm\n'
  '// mcp__claude-flow__swarm_init({ topology: "mesh", maxAgents: 4, strategy: "consensus" })\n\n'
  '// TODO: spawn all 4 peers in ONE message\n'
  '// Agent({\n'
  '//   prompt: "You are node-a. Request votes from node-b, node-c, node-d. '
  'If you receive 2+ votes, announce leadership.",\n'
  '//   name: "node-a", run_in_background: true\n'
  '// })\n'
  '// Agent({\n'
  '//   prompt: "You are node-b. If asked to vote, send your vote to the requester. '
  'Also request votes from others.",\n'
  '//   name: "node-b", run_in_background: true\n'
  '// })\n'
  '// Agent({ prompt: "You are node-c. Same as node-b.", name: "node-c", run_in_background: true })\n'
  '// Agent({ prompt: "You are node-d. Same as node-b.", name: "node-d", run_in_background: true })\n\n'
  '// TODO: kick off election\n'
  '// SendMessage({ to: "node-a", summary: "ElectionStart", message: "Begin leader election." })',
  '[
    {"index": 0, "text": "Seed the election with a random delay per node (e.g. Math.random()*500ms) to avoid a tie on the first ballot."},
    {"index": 1, "text": "Use memory_store to record the current leader so late-arriving votes can check whether election is already decided."}
  ]'::jsonb,
  '[{"text": "Implement a re-election protocol: if the leader stops responding for 10s, the remaining peers elect a new one."}]'::jsonb,
  'published'
);
