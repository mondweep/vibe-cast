# Use case: bringing up a TinyC6 on an agent-tooled workstation

A working record of the session that produced this branch — what we set out to do,
what we found, what turned out to be wrong, and what is still open.

Session date: 2026-09-20 (updated 2026-09-23)
Machine: macOS 24.5.0 (darwin/arm64)

---

## 1. Objective

Two intertwined goals:

1. **Get the Ruflo/agentic-kit toolchain actually working** in this project — the
   toolkit appeared to be missing.
2. **Understand the ESP32-C6 board** plugged into the laptop, and decide what to
   build with it.

A principle emerged early and shaped everything after: **verify claims against the
system itself.** Tool self-reports were wrong repeatedly (details below), so every
conclusion here is backed by a command whose output we read.

---

## 2. The toolkit was never missing — it was misnamed

**Symptom:** "I do not see the Ruflo toolkit." An MCP server named `ruflo` was
failing with `CONNECTION_CLOSED`.

**Reality:** the toolkit was connected the whole time, registered under the name
**`claude-flow`** (user scope, `ruflo mcp start`), exposing **373 tools**. In the
`/mcp` list it appears as `claude-flow`, not `ruflo` — that naming mismatch was the
entire problem.

The entry actually *named* `ruflo` was a separate, broken duplicate scoped to
`/Users/mondweep/DxSure2`:

```json
"ruflo": { "command": "npx", "args": ["-y", "@claude-flow/cli@latest"] }
```

**First diagnosis was wrong.** We assumed it failed because it lacked the `mcp start`
subcommand. Testing the installed CLI disproved that — a bare `ruflo` with stdin not a
TTY *does* start stdio MCP mode. A JSON-RPC handshake probe found the real cause:

```
npm error ENOTEMPTY: rename '.../_npx/85fb20e3e7e3a233/node_modules/@claude-flow/cli'
child exited code=190  →  no handshake  →  CONNECTION_CLOSED
```

A **corrupt npx cache**. `npx -y ...@latest` reinstalls on every launch, and the
reinstall could not complete. 13 abandoned npm temp dirs (`.claude-flow-lZXtcXtp`,
`.ruvector-qNM0BLSZ`, …) were blocking renames. The same fault class had also broken
an unrelated npm upgrade, and very likely the `figma` and `ocr-provenance-mcp`
servers too (both `npx -y`).

**Fix:** removed the 13 abandoned temp dirs and the duplicate MCP entry
(backup at `~/.claude.json.bak-20260920-160118`). Freed ~16 GB as a side effect.

---

## 3. Tool self-reports could not be trusted

Four separate inaccuracies, each caught by independent verification:

| Claim | Reality |
|---|---|
| `ak status`: "npx cache holds no stale ruflo-family envs" | 13 abandoned temp dirs present |
| `ak sync`: "converged — no failing subsystems" | same log showed 3 failures |
| `ak sync`: "self-update: kit upgraded to alpha.53" | `ak --version` still reported alpha.40 |
| `ak setup`: "memory write VERIFIED" | true — but only confirmed by our own round-trip |

**The self-update bug is worth understanding.** The `ak` wrapper pins Node 22:

```sh
exec .../v22.22.3/bin/node .../v22.22.3/lib/node_modules/@pacphi/agentic-kit/...
```

but its self-update shells out to `npm`, which inherits whatever `node` is on `PATH`
(v20 here) and installs into **Node 20's** prefix. The new version lands on disk
somewhere the wrapper never looks. Reproduced it exactly: `$NODE22/bin/npm` is a shell
script and warned `EBADENGINE … current: v20.19.0`. Driving `npm-cli.js` with the Node
22 binary directly fixed it — `ak --version` now reports **4.0.0-alpha.53**.

**Memory verification** was done properly rather than trusting the success line:

```
store    → key verify-probe-1789936404-14643
retrieve → Value: tinyc6-probe-value-9f3a21   ← byte-for-byte match
```

Project health went **40 → 100**.

---

## 4. Cost findings (the most valuable outcome)

**aqe was billing a metered OpenAI key.** Its own health output:

> provider "openai" bills a pay-per-token API key (not your Claude subscription) and
> has **no server-side spend cap**

Switched to `AQE_LLM_PROVIDER=claude-code`, verified:

> Provider: claude-code ● Claude subscription (no per-token charge)

**Per-activity routing was also metered.** Five of twelve activities routed to
codex/gpt-5.x. All twelve now route to Claude (sonnet-5 for implementation/testing/
security-scan, haiku-4.5 for documentation/packaging, opus-5 retained for
architecture/design/debugging/security-analysis).

**Tradeoff accepted:** `qe-court`'s adversarial jury requires evidence from >= 2
distinct vendors. Routing everything to one vendor disables that. Same-vendor LLM
judges also run ~8-10pp inflated. Revisit if adversarial review is wanted.

### Where the API key actually lives

The user asked — reasonably — where `OPENAI_API_KEY` came from with no `.env` present:

| Location | Scope |
|---|---|
| `~/.zshrc:33` | every shell — persistent |
| `launchctl setenv` (also `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`) | login session; ephemeral, no LaunchAgent re-applies them |

**Key insight:** `ak` reports `OPENAI_API_KEY — api key overrides login`. Codex has a
complete OAuth session in `~/.codex/auth.json` (`OPENAI_API_KEY: null`, id/access/
refresh tokens all present). The env var was *shadowing* a working subscription login.
Removing it is therefore safe — codex falls back to OAuth.

**Status: not yet done.** `OPENAI_API_KEY` is still set.

---

## 5. The board

Discovered by probing, not assumption. USB descriptor showed only "Espressif"; the
firmware identified itself as `unexpectedmaker_tinyc6`.

Verified: ESP32-C6 (QFN40) rev v0.0 · RISC-V @160 MHz + LP core · 512 KB SRAM
(~242 KB free at runtime) · 8 MB Winbond flash (4 MB filesystem) · Wi-Fi 6 / BT 5 LE /
IEEE 802.15.4 · USB-Serial/JTAG · MAC `40:4c:ca:51:64:88`.

**Factory-fresh.** Running CircuitPython 10.2.1 with the stock demo. `test_results.txt`
is Unexpected Maker's end-of-line test ("WiFi Test: PASS … good to ship! — Seon"), not
user work — so nothing was at risk of being overwritten.

### Gotchas discovered the hard way

- **No `CIRCUITPY` drive, ever.** The C6's USB is Serial/JTAG only; it cannot do USB
  mass storage. Use the serial REPL or CircuitPython Web Workflow.
- **`esptool` induces safe mode.** It drives GPIO9/BOOT low; CircuitPython reads that
  as "BOOT held" and skips `code.py`. We caused this, then cleared it with a reset.
- **Serial `Errno 6: Device not configured`** on first open — toggle DTR and retry.
- **The port number moves.** Observed as both `/dev/cu.usbmodem2101` and
  `/dev/cu.usbmodem101` across replugs. Glob it, don't hardcode.

---

## 6. Direction

See `README.md` for the full catalogue. Summary of the reasoning:

- **Tier 1** (CircuitPython, no installs): battery logger, environmental sensor, BLE
  beacon, Web Workflow, analog logger.
- **Tier 2** (needs ESP-IDF >= 5.1): Matter over Wi-Fi, Matter over Thread, Zigbee,
  802.15.4 research. **This is the reason to own a C6** — a C3/S3 has no 802.15.4 radio.

**Thread vs Matter:** Thread is the network (low-power IPv6 mesh on 802.15.4 — the
road). Matter is the application layer (device model, commissioning, security — the
language). Matter runs over Thread, Wi-Fi or Ethernet; BLE handles commissioning.

**Recommended order: #4 → #1** — measure the real battery discharge curve first, then
size sleep intervals from data rather than guesses.

**Open question blocking Tier 2 choice:** is there a Thread Border Router in the house
(Apple TV 4K, HomePod mini, Nest Hub 2nd gen, Echo 4th gen+)? If not, Matter over
Wi-Fi needs no extra hardware.

---

## 7. Unresolved

| Item | Status |
|---|---|
| **RuvNet Brain KB refresh** | **Failing.** Two attempts, both `[forge-update] ERROR: unexpected: terminated` at the same point — downloading `ruvnet-brain.zip` (v4.3.26). The second ran detached under `nohup`, so the first theory (session restart killed it) was **wrong**. Cause still unknown. KB intact (187 stores, 1.8 GB), stale marker `.dev-version = 4.2.2-dev` vs `.running-version = 4.3.26`. Stores date Jul–Aug 2026 vs canonical 2026-09-18, which measurably weakened grounding all session. |
| **aqe native PageRank solver** | **Not fixable.** `@ruvector/solver`, `@ruvector/solver-node` and `ruvector-router-ffi` are all 404 on npm — never published. The TypeScript fallback is the designed path (`allowJsFallback`, `workerThreshold: 50_000`) and `aqe health` reports healthy. ak's warning chases a package that does not exist. **Native HNSW is separate and already working**: `@ruvector/router` 0.1.30 + `router-darwin-arm64` load natively (verified by `require`). |
| **API key cleanup** | Not done — `~/.zshrc:33` still exports `OPENAI_API_KEY`. |
| **ruflo 3.42.4** | Installed, but sessions started before the upgrade still run the old server until restarted. |
| **Board backup** | Factory `code.py` / `tinyc6.py` not yet copied into this repo. With no USB drive they are only recoverable over serial. |

---

## 8. Security note

`ak setup` generates a **private signing key** at
`.agentic-qe/witness-keys/*.key.pem` (`-----BEGIN PRIVATE KEY-----`). This repo's
remote (`mondweep/vibe-cast`) is **public**, so that file is excluded via `.gitignore`
and the exclusion was verified with `git check-ignore` before the first commit.

Anyone initialising a project with `ak` and pushing it to a public remote should check
for this.

---

## 9. Lessons

1. **A green check is a claim, not evidence.** Four separate tool self-reports were
   wrong here. Each was caught by running an independent command.
2. **Check the registry before believing a package name.** Three rUv package names
   referenced in ADRs and installer code do not exist on npm.
3. **Probe the device, don't infer it.** The USB PID said only "Espressif"; the
   firmware named the exact board.
4. **A failed pipeline can hide behind a successful exit code** — `ak sync` exited 0
   while its own log listed three failures.
5. **Beware masked failure in shell pipelines.** `grep -rl … | head` returns `head`'s
   exit status, so a `|| echo "not found"` fallback never fires. One early conclusion
   was worthless for this reason.
