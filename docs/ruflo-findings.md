# Ruflo Marketplace — Structural Findings

Source: [ruvnet/ruflo](https://github.com/ruvnet/ruflo), shallow clone, HEAD recorded in
`inventories/ruflo.json`. Everything here is read from the plugin source and measured by
`scripts/build_ruflo_inventory.py`. **Nothing here is a runtime observation** — no Ruflo
plugin has been installed or exercised (see "Why nothing is installed" below).

---

## 1. The marketplace is one plugin plus 37 front-ends

| Category | Count | What it means |
|---|---:|---|
| `prompt-only` | 36 | Markdown only: commands, agents, skills. No MCP server, no hooks. |
| `mcp-and-hooks` | 1 | `ruflo-core` — registers the MCP server *and* four hook events. |
| `hooks` | 1 | `ruflo-cost-tracker` — a `Stop` hook, no MCP server. |

**35 of 38 plugin directories reference `ruflo-core`.** `ruflo-rag-memory` states the
dependency in its README; the others reference core's `mcp__plugin_ruflo-core_*` tools
directly. The practical consequence:

> The install list is not a menu of 38 independent choices. It is one architectural
> decision — take `ruflo-core` or don't — followed by 37 cheap add-ons that only work
> if you took it.

This changes how the framework applies. Evaluate `ruflo-core` on its own terms and score
it hard, because everything else inherits its setup cost, its data path and its context
overhead. The satellites should then be scored on their *marginal* contribution above core.

## 2. Nearly all the cost is concentrated in one place

`ruflo-core` advertises **300+ MCP tools on a single server**. Every tool's name,
description and schema is resident in the session's tool list from the first turn, whether
or not it is used. Against that, the satellites are rounding errors — `ruflo-swarm` is six
markdown files.

So the overhead question is binary, not incremental: installing core is expensive;
installing ten more Ruflo plugins after it is nearly free. Anyone reasoning "I'll just try
one small one first" should know that the small one does nothing without the large one.

## 3. The hook layer deserves a deliberate read

From `plugins/ruflo-core/hooks/hooks.json` — the manifest's own description, quoted:

> "prefers a locally-installed `ruflo`/`claude-flow` binary, falls back to
> `npx --prefer-offline`, and **always exits 0** so a CLI/install failure never surfaces
> an error or blocks a turn" … "**Telemetry runs in both paths.**"

Hooks are registered on `PreToolUse` (Bash, Write|Edit|MultiEdit), `PostToolUse` (same),
`PreCompact` (manual and auto), and `Stop`. Every file edit and every shell command in
every session triggers hook code.

Three separable properties, worth judging separately rather than as one verdict:

1. **Resolution happens at hook time.** With no local binary, the `npx` fallback can fetch
   and execute a package from the network during an ordinary edit. Pinning the CLI locally
   (`npm install -g ruflo@<version>`) removes that path — do this before adopting.
2. **Silent success on failure.** `exit 0` unconditionally means a broken hook and a
   working hook look identical. Good for turn stability, bad for operability.
3. **Telemetry on both paths.** Contents and destination are not documented in
   `hooks.json`. Read `scripts/ruflo-hook.cjs` before enabling on any repo with sensitive
   source.

None of this is unusual for the ecosystem, and the design intent — never break a turn — is
defensible. It is simply the part of the install that warrants reading rather than trusting.

## 4. Credit where due

Two things put Ruflo above the median for plugin ecosystems:

- **`ruflo-core` ships real tests** — `mcp-launch.test.cjs`, `test-mcp-protocol.mjs`,
  `test-mcp-roundtrips.mjs`, `test-hooks.mjs`, `test-cli-no-crash.mjs`,
  `test-consensus-transport.mjs`, `test-memory-import.mjs`.
- **`ruflo-neural-trader` ships its own security audit and benchmark results** in-tree
  (`docs/security-audit-2026-05-20.md`, `benchmarks/results/`). Vendor-produced, so treat
  them as claims to verify — but most plugins do not publish anything to verify at all.

## 5. Where Ruflo overlaps what Claude Code already does

Several plugins cover ground the harness now covers natively — `ruflo-swarm` against
`Agent` / `Workflow` / `Monitor` / worktree isolation, `ruflo-loop-workers` against `/loop`
and `CronCreate`, `ruflo-browser` against the preinstalled Playwright + Chromium.

For these, **the baseline arm of every A/B test must be the native capability, not bare
Claude.** Testing `ruflo-swarm` against "Claude with no orchestration" measures nothing
useful and will produce a flattering, wrong result.

The plugins with the clearest non-overlapping value are the ones addressing genuine gaps:
`ruflo-rag-memory` (cross-session persistent memory), `ruflo-cost-tracker` (per-agent cost
attribution), `ruflo-neural-trader` (a domain engine).

## 6. Why nothing is installed

`/plugin marketplace add` and `/plugin install` are built-in Claude Code CLI commands for
an interactive session. This evaluation ran in a remote container with no
`~/.claude/plugins`, no way to invoke those commands programmatically, and — decisively —
plugins are loaded at session start, so even hand-writing the config would not activate
them mid-session.

The install commands are recorded in the root `README.md` for a local run. Until that
happens, every Ruflo evaluation in this branch stays at **Pending**, with only the three
source-observable criteria scored.

## 7. Suggested order of work

1. Install locally, `ruflo-core` first and alone. Measure the context cost before and
   after — that number decides most of the rest.
2. Read `scripts/ruflo-hook.cjs`; pin the CLI; re-score `data_trust` on evidence.
3. Run the full T1–T3 protocol on `ruflo-rag-memory` — best gap-to-cost ratio.
4. Run `ruflo-swarm` head-to-head against native `Workflow` on one real task.
5. Only then decide whether core earns its place; the satellites follow that verdict.
