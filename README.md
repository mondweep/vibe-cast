# Plugin Evaluation Lab

> An orphan branch of [`vibe-cast`](https://github.com/mondweep/vibe-cast) — no shared
> history with `main`. A workspace for deciding which Claude plugins are worth keeping
> enabled, and why.

Two marketplaces are under evaluation:

| Inventory | Source | Plugins |
|---|---|---:|
| `inventories/claude-account.json` | plugins enabled on this claude.ai account | 21 |
| `inventories/ruflo.json` | [ruvnet/ruflo](https://github.com/ruvnet/ruflo) marketplace | 38 |

**Current state: everything is `Pending`.** The framework, tooling and per-plugin
evaluation files are in place; the behavioural test protocol has not been run. See
[Status](#status) for exactly what has and has not been done — the distinction is
deliberate and enforced by the tooling.

---

## Why this exists

A plugin is not free. It adds skills, commands, hooks, agents and sometimes hundreds of
MCP tool schemas to every session — costing context, adding surface area for
mis-triggering, and sometimes moving data off-box. With 21 plugins already enabled and 38
more on offer, "does it look useful?" stops being a usable filter.

So this branch answers a narrower question, per plugin: **is it worth its cost for the way
I actually work?** Six weighted criteria, a three-task test protocol, four verdict bands.

Read [`docs/evaluation-framework.md`](docs/evaluation-framework.md) first — it is the
contract everything else implements.

## Layout

```
docs/evaluation-framework.md   the six criteria, the T1–T3 protocol, verdict bands
docs/ruflo-findings.md         structural findings on the Ruflo marketplace
docs/leaderboard.md            generated — do not edit by hand
inventories/*.json             what is being evaluated, and its measured surface area
evaluations/TEMPLATE.md        the shape of an evaluation
evaluations/<marketplace>/     one file per plugin
scripts/                       inventory builder, stub generator, scorer, tests
```

## Usage

```bash
# Rebuild the Ruflo inventory from a fresh checkout
git clone --depth 1 https://github.com/ruvnet/ruflo.git /tmp/ruflo
python3 scripts/build_ruflo_inventory.py /tmp/ruflo

# Create evaluation stubs for anything new in an inventory (existing files untouched)
python3 scripts/bootstrap_evals.py inventories/ruflo.json

# Score everything and regenerate the leaderboard
python3 scripts/score.py

# What is overdue for re-evaluation?
python3 scripts/score.py --stale

# Tests for the scoring logic
python3 scripts/test_score.py
```

Python 3, standard library only. No dependencies, no build step.

## How scoring works

Each plugin is scored 0–5 on six criteria, weighted to a 0–100 total:

| Criterion | Weight |
|---|---:|
| Job fit | 20 |
| Activation reliability | 20 |
| Output quality vs baseline | 20 |
| Setup & dependency cost | 10 |
| Data exposure & trust | 15 |
| Context & interference overhead | 15 |

Bands: **Adopt** ≥ 75 · **Trial** 55–74 · **Hold** 35–54 · **Drop** < 35 — subject to
override rules that cap the verdict when a criterion is disqualifyingly weak (a zero
anywhere, weak data trust, or unreliable activation). A plugin with incomplete scores
reports `Pending`; one whose dependencies are unavailable reports `Blocked`. Neither is
a verdict, and neither can be faked by leaving fields blank.

## Status

**Done**

- Framework, scoring tool, stub generator, and 15 passing tests
- Both inventories built; Ruflo's surface area measured from source (commands, agents,
  skills, MCP servers, hook events per plugin)
- 59 evaluation files created
- Static source review written for the four plugins named for evaluation:
  [`ruflo-core`](evaluations/ruflo/ruflo-core.md),
  [`ruflo-swarm`](evaluations/ruflo/ruflo-swarm.md),
  [`ruflo-rag-memory`](evaluations/ruflo/ruflo-rag-memory.md),
  [`ruflo-neural-trader`](evaluations/ruflo/ruflo-neural-trader.md)
- Cross-cutting marketplace findings in [`docs/ruflo-findings.md`](docs/ruflo-findings.md)

**Not done**

- **No plugin has been installed or run.** `/plugin marketplace add` and `/plugin install`
  are interactive Claude Code CLI commands; this work was done in a remote container with
  no `~/.claude/plugins`, and plugins load at session start, so they cannot be activated
  mid-session. The commands are below for a local run.
- T1–T3 have not been executed for any plugin, so `job_fit`, `activation` and
  `output_quality` are blank everywhere and every verdict reads `Pending`.
- `apollo` is marked `Blocked` — its MCP server is not authorised on this account.

Scores that *are* recorded (setup cost, data trust, overhead for the four Ruflo plugins)
come from reading the source, and each file says so.

## Running the behavioural half locally

```bash
# Add the marketplace
/plugin marketplace add ruvnet/ruflo

# Install core first, alone, and measure the context cost before and after
/plugin install ruflo-core@ruflo

# Then the satellites
/plugin install ruflo-swarm@ruflo
/plugin install ruflo-rag-memory@ruflo
/plugin install ruflo-neural-trader@ruflo
```

Install `ruflo-core` on its own first. It carries essentially all of the cost — 300+ MCP
tools and hooks on every edit and shell command — and 35 of the 38 plugins do nothing
without it. That measurement decides most of the rest. Details in
[`docs/ruflo-findings.md`](docs/ruflo-findings.md).

Then, per plugin: run T1–T3 with the plugin enabled and again with it disabled, fill in
the six scores, set `status: evaluated` and the `evaluated` date, and re-run
`python3 scripts/score.py`.

One rule worth repeating: **for anything that overlaps a native capability — swarm vs
`Workflow`, loop-workers vs `/loop`, browser vs Playwright — the baseline arm is the
native tool, not bare Claude.** Otherwise the plugin beats a strawman and the score is
worthless.
