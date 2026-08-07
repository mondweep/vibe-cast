# PRD — RVM "Hello World"

**Status:** delivered · **Repo:** [mondweep/vibe-cast](https://github.com/mondweep/vibe-cast) ·
**Branch:** `claude/rvm-hello-world-ideas-mua6ja` · **Results:** [README.md](README.md)

---

## A note on what this document is

This is a **retrospective PRD**. The work was not specified up front — it grew
out of a conversation that started with "give me some ideas" and expanded a
step at a time. Writing it as though the requirements were known on day one
would be a nicer story and a false one.

So it is organised the way a PRD is organised — problem, goals, requirements,
acceptance criteria, decisions — but each requirement carries the point at
which it actually entered scope, and the decision log records what we changed
our minds about. A visitor should be able to read this top to bottom and
understand not just *what* exists in the repo but *why each piece is shaped
the way it is*.

If you only want the results, go to [README.md](README.md). If you want to see
them running, go to [`web/`](web/).

---

## 1. Problem

[ruvnet/rvm](https://github.com/ruvnet/rvm) is a bare-metal Rust hypervisor
(`no_std`, AArch64, 17 crates) organised around *coherence domains* —
partitions whose isolation and scheduling adapt to how agents communicate. It
is architecturally ambitious and documented at the level of ADRs and design
claims.

What it lacks is an on-ramp. There is no example directory, no tutorial
program, and no way to answer "what does using this actually look like?"
without reading kernel source. The stated quickstart (`make build && make run`)
produces no output at all.

The gap this work fills: **a set of small, runnable programs that exercise each
layer of RVM and report what the code actually does.**

## 2. Goals

| | Goal |
|---|---|
| G1 | Give a newcomer a runnable first program at every layer of the system, from library call to bare-metal boot |
| G2 | Ground every claim in measured behaviour, not documentation |
| G3 | Make the results legible to someone who will not clone the repo |
| G4 | Surface and report discrepancies between what RVM claims and what it does |

G4 was not an original goal. It emerged from G2 — once you insist on measuring
rather than quoting, the discrepancies find you.

## 3. Non-goals

- **Not** a contribution to rvm. Nothing upstream is modified. The one patch we
  produced (`rvm-boot-fixes.patch`) is evidence for a finding, not a PR.
- **Not** a benchmark suite. Timings are single-run wall-clock, sufficient to
  test order-of-magnitude claims and nothing finer.
- **Not** a security audit. Findings are what fell out of building demos, not
  the product of a systematic review.
- **Not** production code. These are demonstrations optimised for legibility.

## 4. Audience

1. **A developer evaluating RVM** — wants to know what the API feels like and
   whether the claims hold, in minutes rather than a day.
2. **A team being shown this work** — will look at a web page, not a terminal.
   Drove R6.
3. **The rvm maintainers** — findings are written so each is reproducible and
   points at a specific file, with a suggested fix where one is obvious.

## 5. Requirements

| ID | Requirement | Entered scope | Status |
|---|---|---|---|
| R1 | Propose candidate "hello world" programs, tiered by setup cost | Opening ask | Done — 7 candidates, 3 tiers |
| R2 | Isolate the work from the host repo's history | "create an orphan branch" | Done — orphan branch, no shared history |
| R3 | Build and run **all seven** candidates | "demonstrate all seven" | Done — 7/7 run |
| R4 | Every demo compiles against real rvm and runs to completion | Implied by R3 | Done — clean build, no warnings |
| R5 | Document method, results and findings | "create a README" | Done — [README.md](README.md) |
| R6 | Make results shareable without a toolchain | "how do I demo to my team" | Done — [`web/`](web/), two deploy targets |
| R7 | Explain the work's arc for a visitor | This document | Done |

### R3 in detail — the seven

Tiered by setup cost, which is how they were originally proposed:

**Tier 0 — library only, no emulator**

| # | Demo | Crates |
|---|---|---|
| 1 | Witnessed Hello | `rvm-witness` |
| 2 | Hello, Denied | `rvm-cap`, `rvm-security` |
| 3 | Three Ways to Prove Hello | `rvm-cap`, `rvm-security` |

**Tier 1 — boot it**

| # | Demo | Crates |
|---|---|---|
| 4 | UART Hello from a bare partition | `rvm-hal`, `rvm-boot` |
| 5 | Partition Ping-Pong | `rvm-partition`, `rvm-sched` |

**Tier 2 — the project's actual thesis**

| # | Demo | Crates |
|---|---|---|
| 6 | Two Agents That Get Closer | `rvm-coherence`, `rvm-wasm` |
| 7 | Signed Hello Package | `rvm-rvf` |

## 6. Method

The same loop for each demo, and the ordering matters:

1. **Read the source, not the README.** Dump each crate's public items, then
   read the bodies that matter. Documentation was treated as a hypothesis.
2. **Write against the real API.** Compile errors were resolved by reading
   ground truth, never by guessing signatures.
3. **Run it, and believe the output over the prose.** Where they disagreed, the
   demo was rewritten around the observed behaviour.
4. **Verify every surprise before reporting it.** A single failing case is an
   anecdote. See §8.
5. **Check the explanation too.** Findings 10 came out of writing documentation,
   not running code: the worked example for a non-technical reader was validated
   against the engine before publishing, and did not match. Explaining a thing
   simply is its own test of whether it works.

Step 3 is the one that did real work. Two demos changed shape:

- **Demo 3** was built around "P3 catches a revoked ancestor that P1 misses."
  The output showed both tiers failing. Reading `revoke.rs` explained why —
  revocation deliberately cascades through the derivation subtree so the cheap
  check catches it, with a source comment saying so. The demo was rewritten
  around delegation depth, which *is* a P3-only check.
- **Demo 6** was built to show RVM's headline behaviour. It showed the
  opposite, and was rebuilt around that (see §8).

## 7. Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| A1 | All seven demos build and run to completion | 7/7 |
| A2 | Workspace compiles with zero warnings | Clean |
| A3 | Demo 4 boots under QEMU and prints | Boots, 7 phases witnessed, chain verifies |
| A4 | Every reported number reproducible by re-running | `scripts/run-all.sh` |
| A5 | Findings cite a specific file and are independently checkable | 10/10 |
| A6 | Results viewable without a Rust toolchain | [`web/`](web/) on Netlify or Cloud Run |

## 8. Findings — and how each was established

Ten findings, in [README.md §Findings](README.md#findings). The two that took
the most work to establish:

**Finding 2 — the coherence engine's merge path never fires.** RVM's headline
claim is *"when two agents start talking more, RVM moves them closer."*
Observed behaviour is the reverse. Each partition's traffic splits into
*internal* (work it does alone) and *external* (traffic to other partitions);
cut pressure is `external / (internal + external)`. Traffic between two agents
is external **for both**, so the more they talk, the higher both their
pressures climb — and above the threshold the engine recommends *splitting*
them. See the worked example in
[README §What each demo actually showed](README.md#demo-6--the-headline-claim-and-why-it-doesnt-happen).

**Finding 10 — cut pressure double-counts self-loops.** Worth recording *how*
this one surfaced, because it validates the method in §6 from an unexpected
direction. It did not come from running a demo. It came from writing the
plain-language explanation of "external weight" for a non-technical reader: the
illustrative numbers were checked against the engine before publishing, and they
did not reconcile. The code was wrong, not the arithmetic. `total_weight` sums
outgoing and incoming, so a self-loop counts twice, while `internal_weight`
counts it once — one copy of a partition's own work is filed as external
traffic. An isolated partition with a self-loop and no neighbours reads 50%
cut pressure where `pressure.rs` says it should read 0%. It compounds finding 2:
inflating every partition's pressure pushes the already-unreachable merge window
further out of reach.

**On finding 2's evidence.** A single counterexample would have been weak — perhaps we picked bad weights.
So demo 6 sweeps 4,032 points of the two-partition weight space. `recommend()`
returns `MergeRecommended` **zero** times; the underlying merge signal is set
and then discarded in **1,244**. The arithmetic explains it: mutual coherence
tracks roughly `pressure − 5000`, so the merge condition implies pressure above
the split threshold, and `recommend()` returns on the first split it finds.

**Finding 3 — `make run` cannot work as shipped.** Three independent faults.
Diagnosis was iterative: a QEMU instruction trace showed a stack probe faulting
to a zeroed vector; enlarging the stack moved the fault to a SIMD instruction;
enabling `CPACR_EL1.FPEN` made it boot. Rather than assert this, we **applied
the fixes to rvm and watched its own kernel print its full boot banner**, then
reverted rvm to pristine and kept the diff as
[`rvm-boot-fixes.patch`](demos/04-uart-hello/rvm-boot-fixes.patch).

## 9. Decision log

| # | Decision | Alternative | Why |
|---|---|---|---|
| D1 | rvm as a **sibling checkout** (`../rvm`), not a cargo git dependency | git dependency | Cargo initialises submodules for git deps; rvm declares three its own workspace excludes, and fetching them exceeded 10 minutes. `scripts/bootstrap.sh` clones without them |
| D2 | Demo 4 **excluded** from the cargo workspace | Workspace member | It is `no_std`/`no_main` targeting `aarch64-unknown-none`; it cannot build for the host, so `cargo build --workspace` would break |
| D3 | Reimplement the RVF container writer in demo 7 | Use rvm-rvf's `testkit` | `testkit` is a private `mod`. Reimplementing against the public `format` API both worked and produced Finding 5 |
| D4 | Report the P2 gap as a finding; reach tier 2 via the security gate | Skip P2 | `verify_p2` takes an unexported type and is uncallable. Silently omitting it would have hidden Finding 4 |
| D5 | Static site as the **primary** shareable artifact | Live-execution service only | Demos are deterministic; captured output is faithful and costs nothing to host. Live execution was added as an option, not the default |
| D6 | One HTML file serving both hosting targets | Separate static and dynamic builds | The page probes `/healthz` and reveals "Run live" buttons only when a backend answers — no second build, no divergence |
| D7 | Demo 4 never runs live on Cloud Run | Ship QEMU in the image | Roughly triples image size for one demo. `/run/04` serves captured output and says so |
| D8 | Generate the site from **real runs**, never hand-copied | Paste output into HTML | `web/build.py` runs each demo and boots demo 4 under QEMU. Hand-copied output silently rots |

## 10. Timeline

Six commits, all on `claude/rvm-hello-world-ideas-mua6ja`:

| Commit | What landed |
|---|---|
| `39f9983` | Orphan branch, candidates written down |
| `ae49174` | Demos 1–3, bootstrap, workspace wiring |
| `b5a659e` | Demos 4–5, boot diagnosis, `rvm-boot-fixes.patch` |
| `fdae224` | Demos 6–7, coherence sweep |
| `062dd0a` | README as a full record |
| `9493ac4` | Demo site, Netlify + Cloud Run configs |

~1,800 lines of demo code across seven crates.

## 11. What we did not do

Deliberate omissions, so nobody assumes coverage that isn't there:

- **No upstream issues or PRs filed.** The findings are written to be
  actionable, but reporting them is the repo owner's call.
- **Finding 2's sweep is the two-partition case.** It does not prove merge is
  unreachable for every possible graph — only across the space a two-agent
  scenario can occupy, which is the scenario the project's own pitch describes.
- **`rvm-gpu`, `rvm-memory`, `rvm-launch`, `rvm-host` are untouched.** Seven
  demos do not cover 17 crates.
- **Timings are not statistically rigorous.** See §3.
- **Demo 6's original design called for a trust signal** to force a split.
  There is no trust input anywhere in `rvm-coherence`; the only split driver is
  cut pressure. The demo redirects traffic instead.

## 12. If this were taken further

Roughly in order of value:

1. **File findings 1–4 upstream.** Two are one-line fixes (D4's export, the
   Makefile path); finding 2 is a design question worth a maintainer's view.
2. **A demo that survives a merge fix**, to show the coherence loop closing —
   currently unwritable, because the behaviour does not exist.
3. **Criterion benchmarks** if any timing claim needs to bear weight.
4. **Coverage of the remaining crates**, particularly `rvm-memory`'s four-tier
   model, which no demo touches.
