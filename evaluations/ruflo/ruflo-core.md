---
plugin: ruflo-core
plugin_id: ruflo-core
category: mcp-and-hooks
status: pending
evaluated:
scores:
  job_fit:
  activation:
  output_quality:
  setup_cost: 2
  data_trust: 2
  overhead: 1
collisions:
---

# ruflo-core

> Foundation plugin — registers the ruflo MCP server (300+ tools across memory / agentdb /
> embeddings / hooks / aidefence / neural / autopilot / browser / agent / swarm).

**v0.2.6.** Static review only — see "Status of this evaluation" below.

## Dependencies

Requires **node** and a long-running **MCP server process**, launched from
`.mcp.json` as `node ${CLAUDE_PLUGIN_ROOT}/scripts/mcp-launch.cjs` with
`CLAUDE_FLOW_MCP_TRANSPORT=stdio`.

Measured surface area: 2 commands, 4 agents, 5 skills, MCP server `ruflo`, hooks on
PreToolUse, PostToolUse, PreCompact, Stop.

**This is the plugin the rest of the marketplace hangs off.** 35 of the 38 plugin
directories reference `ruflo-core`; `ruflo-rag-memory`'s README states the dependency
outright ("Requires: `ruflo-core` plugin (provides MCP server)"). Installing any of the
others without core gives you prompts that call tools which are not registered.

## Static review (source read at the marketplace HEAD in `inventories/ruflo.json`)

Findings below are read from the plugin source, not observed at runtime.

**1. The MCP tool surface is the dominant cost.** The manifest advertises 300+ tools on a
single server. Every one carries a name, description and JSON schema into the session's
tool list. This is a per-session, per-turn cost paid whether or not any ruflo tool is
called, and it is the single biggest reason to treat `ruflo-core` as a deliberate choice
rather than a default-on plugin.

**2. Hooks run on essentially every turn.** `hooks/hooks.json` registers:

| Event | Matcher |
|---|---|
| PreToolUse | `Bash`, `Write\|Edit\|MultiEdit` |
| PostToolUse | `Bash`, `Write\|Edit\|MultiEdit` |
| PreCompact | `manual`, `auto` |
| Stop | (all) |

So any file edit or shell command triggers two hook invocations, and every session end
triggers one more with `--generate-summary --persist-state --export-metrics`.

**3. The hook shim resolves code at hook time and fails silently.** The `hooks.json`
description is explicit: the shim "prefers a locally-installed `ruflo`/`claude-flow`
binary, falls back to `npx --prefer-offline`, and **always exits 0** so a CLI/install
failure never surfaces an error or blocks a turn," and "**telemetry runs in both paths**."

Three consequences worth weighing separately:

- **Resolution at hook time.** If no local binary is present, the fallback path can fetch
  and execute a package from npm during a hook. That is a supply-chain surface attached to
  ordinary editing, not to an explicit install step. Pinning the CLI locally
  (`npm install -g ruflo@<version>`) removes the fallback and is the mitigation.
- **Always exits 0.** Good for not breaking turns; bad for noticing. A hook that is failing
  silently on every edit is indistinguishable from one that is working.
- **Telemetry on both paths.** What is emitted, and where, needs reading
  `scripts/ruflo-hook.cjs` before this scores above 2. Do that before adopting.

**4. Skills shell out with a broad permission.** Several skills declare
`allowed-tools: Bash(npx *)` and run `npx @claude-flow/cli@latest doctor|status|init`.
`Bash(npx *)` is a wide grant — it permits any npx invocation, not just claude-flow ones.

**5. Positive signal: it ships real tests.** `scripts/` contains `mcp-launch.test.cjs`,
`test-mcp-protocol.mjs`, `test-mcp-roundtrips.mjs`, `test-hooks.mjs`,
`test-cli-no-crash.mjs`, `test-consensus-transport.mjs` and `test-memory-import.mjs`.
For an ecosystem plugin that registers hooks and an MCP server, that is a meaningfully
better posture than most.

## Status of this evaluation

T1–T3 have **not** been run. This session is a remote container with no
`~/.claude/plugins` and no way to invoke the `/plugin` slash commands, and plugins load at
session start, so the behavioural half of the framework cannot be exercised here. The
three source-observable criteria are scored below; `job_fit`, `activation` and
`output_quality` stay blank, which keeps the leaderboard verdict at **Pending**.

## T1 — Canonical task

**Prompt:** `Initialise ruflo for this project and report status.`

- **Activated:** not run
- **vs baseline:** not run

## T2 — Adjacent task

**Prompt:** `Store the decision we just made about the branch layout, then recall it.`

- **Activated:** not run
- **vs baseline:** not run

## T3 — Off-target task

**Prompt:** `Rename this variable across the repo.` (should be a plain edit, no ruflo tools)

- **Activated:** not run — but note the PreToolUse hook fires on `Write|Edit|MultiEdit`
  regardless, so "did not activate" and "did not run a hook" are different questions here.
- **vs baseline:** not run

## Scoring notes

| Criterion | Score | Note |
|---|---:|---|
| Job fit | | Needs T1–T3 |
| Activation reliability | | Needs T1–T3 |
| Output quality | | Needs T1–T3 |
| Setup cost | 2 | node + a persistent MCP server process + npx reachability |
| Data exposure | 2 | Hook-time npx resolution and telemetry on both paths, unread |
| Overhead | 1 | 300+ tool schemas resident, plus hooks on every edit and shell call |

## Verdict

**Pending** — three of six criteria scored, from source. On the source evidence alone the
data-trust score of 2 already triggers the framework's second override rule, which caps
this at **Trial** no matter how well the behavioural half goes. Read
`scripts/ruflo-hook.cjs` and pin the CLI locally before that changes.
