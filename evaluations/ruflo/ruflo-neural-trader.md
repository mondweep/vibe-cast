---
plugin: ruflo-neural-trader
plugin_id: ruflo-neural-trader
category: prompt-only
status: pending
evaluated:
scores:
  job_fit:
  activation:
  output_quality:
  setup_cost: 2
  data_trust: 3
  overhead: 3
collisions:
---

# ruflo-neural-trader

> Neural trading via `npx neural-trader` — self-learning strategies, Rust/NAPI
> backtesting, 112+ MCP tools, swarm coordination, and portfolio optimization.

**v0.2.1.** Static review only — T1–T3 not run.

## Dependencies

Requires **`ruflo-core`** (13 files reference core's MCP tools — the heaviest core
coupling of the four) and the separate **`neural-trader` npm package**, invoked as
`npx neural-trader` from the skills. The cloud-backtest skill additionally drives
**Anthropic Managed Agents** via `managed_agent_prompt(...)`.

Measured surface area: 1 command (`/trader`), 4 agents (market-analyst, risk-analyst,
trading-strategist, backtest-engineer), 9 skills, no MCP server of its own, no hooks.

## Static review

**1. It is a front-end to a separate binary.** The skills are thin — they compose
`npx neural-trader --signal scan --symbols <TICKERS>`,
`--backtest --strategy <name> --symbol <TICKER> --period <range> --walk-forward --mc-paths <N>`,
`--train --model <lstm|transformer|nbeats>`. So the evaluation is really two evaluations:
is the *plugin* a good interface, and is `neural-trader` a good engine? Score the plugin on
the first. A plugin can be an excellent wrapper around an engine you should not trust, and
the framework will not catch that unless you separate the questions.

**2. It ships its own evidence, which is unusual and welcome.** The plugin directory
carries `benchmarks/results/` (backtest throughput, memory recall, signal generation,
plus two `cg` baselines) and `docs/security-audit-2026-05-20.md`, `docs/perf-notes.md`,
`docs/aidefence-wiring.md`. Read the audit before the first run rather than after. Note
these are the vendor's own numbers — useful as a claim to check, not as a result.

**3. The cloud-backtest path sends your strategy off-box.** `trader-cloud-backtest`
constructs a `managed_agent_prompt` containing the strategy name, symbols, period and
parameters, and instructs the remote agent to write `/tmp/equity.csv` and `/tmp/trades.csv`.
If a strategy is proprietary, that path is an egress decision, not an implementation
detail. The local `trader-backtest` skill exists and is the conservative default.

**4. Job fit here is unusually easy to establish.** `vibe-cast` already carries
`claude/neural-trading-setup-*` and `cognitum-one-neuraltrader` branches, so this maps
onto work in this repo rather than hypothetical work. That is a genuine point in its
favour — but it is still a `job_fit` score to record after running T1, not before.

**5. Evaluate the outputs as claims.** Backtest results are the easiest artefacts in
software to produce and the hardest to trust — look-ahead bias, survivorship, overfit
walk-forward windows. The framework's "output quality vs baseline" criterion should here
mean: *did it flag its own methodology limits, or present a Sharpe ratio without them?*
A trading plugin that reports metrics without caveats scores low on output quality no
matter how good the numbers look.

## Status of this evaluation

Not installed; see `ruflo-core.md`. Source-observable criteria scored below.

## T1 — Canonical task

**Prompt:** `Backtest a mean-reversion strategy on 3 months of one liquid ticker and
report Sharpe, max drawdown, and the methodology's limitations.`

- **Activated:** not run
- **vs baseline:** not run — grade the caveats as much as the numbers

## T2 — Adjacent task

**Prompt:** `Now size positions for a £10k book with a 2% per-trade risk cap.`

- **Activated:** not run
- **vs baseline:** not run

## T3 — Off-target task

**Prompt:** `What's the market outlook for this quarter?` (forecasting, not backtesting —
should decline or heavily caveat rather than produce a confident call)

- **Activated:** not run
- **vs baseline:** not run

## Scoring notes

| Criterion | Score | Note |
|---|---:|---|
| Job fit | | High prior given existing trading branches; unmeasured |
| Activation reliability | | Needs T1–T3 |
| Output quality | | Grade on caveats and methodology, not on reported Sharpe |
| Setup cost | 2 | core + a second npm package + optional managed-agent access |
| Data exposure | 3 | Local path is contained; cloud-backtest sends strategy details off-box |
| Overhead | 3 | 14 files — the largest of the four, though still prompt-only |

## Verdict

**Pending.** Evaluate the wrapper and the engine separately, run the local backtest path
before the cloud one, and treat every reported metric as a claim to verify.
