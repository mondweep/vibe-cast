# RVM "Hello World" — Seven Demos

Seven runnable first-programs built against [ruvnet/rvm](https://github.com/ruvnet/rvm),
a bare-metal Rust hypervisor (`no_std`, AArch64) built around *coherence
domains*: partitions that reshape themselves based on how agents communicate.

All seven run. Everything below was measured on this machine against rvm at
rev `78acb36`, not taken from the docs — and where the code and the docs
disagree, the demos say so.

This is an **orphan branch**: it shares no history with `main`.

## Quick start

```bash
./scripts/bootstrap.sh          # clones rvm as a sibling checkout
./scripts/run-all.sh            # runs demos 1-3 and 5-7
cd demos/04-uart-hello && ./run.sh    # boots demo 4 under QEMU
```

Demo 4 additionally needs `qemu-system-aarch64` and the `aarch64-unknown-none`
target:

```bash
sudo apt-get install -y qemu-system-arm
rustup target add aarch64-unknown-none
```

## The demos

| # | Demo | Crates | What it shows |
|---|------|--------|---------------|
| 1 | [Witnessed Hello](demos/01-witnessed-hello) | `rvm-witness` | Hash-chained 64-byte audit records; what tampering the chain catches vs. what only the HMAC catches; emission throughput |
| 2 | [Hello, Denied](demos/02-hello-denied) | `rvm-cap`, `rvm-security` | Capability minting, monotonic attenuation, `GRANT_ONCE` consumed after one delegation, denials witnessed alongside grants |
| 3 | [Three Ways to Prove Hello](demos/03-prove-hello) | `rvm-cap`, `rvm-security` | P1/P2/P3 proof tiers, what each catches, and their cost |
| 4 | [UART Hello](demos/04-uart-hello) | `rvm-hal`, `rvm-boot` | A `no_std` AArch64 kernel booting under QEMU, emitting a witness per boot phase |
| 5 | [Partition Ping-Pong](demos/05-partition-pingpong) | `rvm-partition`, `rvm-sched` | Directional comm edges, scheduler picks, edge weight climbing per send |
| 6 | [Two Agents That Get Closer](demos/06-agents-get-closer) | `rvm-coherence`, `rvm-wasm` | The coherence graph reshaping under traffic — and why the merge half never fires |
| 7 | [Signed Hello Package](demos/07-signed-hello) | `rvm-rvf` | Building a signed RVForge container, then six ways of breaking it, each refused with a distinct detail code |

## What we found

Building these surfaced nine things worth reporting upstream. Each is
reproduced by the demo listed, and each was verified against the source rather
than inferred.

### Correctness

**1. `record_hash` does not cover record contents.** (demo 1)
`WitnessLog::append` sets `record_hash = compute_chain_hash(prev_hash, sequence)`
— derived purely from position in the chain. The field's own docs describe it
as "FNV-1a hash of bytes [0..44] of this record (self-integrity)", and
`hash.rs` exports an unused `compute_record_hash(data)` that would do exactly
that. Consequence: `verify_chain` proves *ordering*, not *content*. Editing a
record's payload is invisible to it. Only the HMAC signature written by
`signed_append` covers contents — so a deployment using plain `append` has no
tamper evidence on payloads at all.

**2. The merge half of the coherence engine is unreachable.** (demo 6)
This is the behaviour the project leads with: *"When two agents start talking
more, RVM moves them closer."* It does the opposite. Cross-partition traffic is
external weight, cut pressure is `external/total`, so talking more drives
pressure *up* and triggers `SplitRecommended`.

Worse, `recommend()` scans for a split candidate first and returns on the first
hit. Across a 4,032-point sweep of the two-partition weight space, it returned
`MergeRecommended` **zero times**, while the underlying `evaluate_merge` signal
was set and then discarded in **1,244** of them. The arithmetic is why:
mutual coherence tracks roughly `pressure − 5000`, so `should_merge` (≥4000 bp)
implies pressure ≈9000 bp, always over the 8000 bp split threshold.

`pressure.rs` already carries a comment about lowering the merge threshold from
7000 to 4000 because "a threshold of 7000 (70%) was unreachable, preventing
merge signals from ever firing". That fixed `evaluate_merge`; the shadowing in
`recommend()` is the half still open. A fix means ranking split and merge
candidates against each other instead of returning on the first split found.

**3. `make run` cannot work as shipped.** (demo 4)
Three independent faults, all confirmed:

- `KERNEL_ELF` is `target/$(TARGET)/release/rvm-kernel`, but rvm-kernel's
  `[[bin]]` is named `rvm`. QEMU exits with "could not load kernel".
- `rvm_main` builds a `rvm_kernel::Kernel` as a stack local. That value is
  **232,768 bytes**; `rvm.ld` reserves **65,536**. The compiler's stack probe
  walks off the bottom of the stack and faults.
- FP/SIMD is trapped at EL1 (`CPACR_EL1.FPEN` unset) and LLVM emits
  `movi v0.2d, #0` to zero large structs, so the first big initialisation
  traps. `VBAR_EL1` is also unset, so it vectors to address `0x200` — zeroes.

Fixing the last two makes rvm's own kernel print its full boot banner;
verified, and saved as [`rvm-boot-fixes.patch`](demos/04-uart-hello/rvm-boot-fixes.patch).
Note that cargo does not track `rvm.ld`, so editing it alone will not trigger
a rebuild.

### API reachability

**4. P2 verification is public but uncallable.** (demo 3)
`CapabilityManager::verify_p2` and `ProofVerifier::verify_p2` both take
`ctx: &PolicyContext`. `rvm-cap/src/lib.rs` declares `mod verify;` privately
and re-exports only `ProofVerifier` — never `PolicyContext`. No external caller
can name the type, so neither function can be called. Nothing else in the
workspace re-exports it. One-line fix:
`pub use verify::{ProofVerifier, PolicyContext};`

**5. rvm-rvf can read containers but nothing can write one.** (demo 7)
The crate is read-only by design, and its `testkit` — the only container
builder in the tree — is a private `mod`. Demo 7 reimplements the segment
layout against the public `format` API to have anything to verify. Making
`testkit` public, or shipping a writer, would save every downstream user this
work.

### Caller traps

**6. `report.ok == true` does not mean the signature was checked.** (demo 7)
With no trusted key supplied, the signature check is recorded `Skip` and the
report is still `ok = true`. `ok` means "nothing failed", and a skip is
correctly not a pass — but a caller reading only `ok` accepts an artifact whose
signature was never verified. Requiring a verified signature means supplying a
trusted key *and* confirming the `Signature` record is `Pass`.

**7. `report.capabilities` stays populated on a failed report.** (demo 7)
The rustdoc says a failed capability check yields the deny-everything mapping,
which is true but narrower than it reads: *only* a `CapabilityMapping` failure
zeroes it. A package failing `ContentHash` and `Signature` still reports
`granted: [Network, Clock]`. Callers must gate on `report.ok` first.

### Documentation

**8. The ~17ns witness figure is the FNV-1a path.** (demo 1)
`rvm-witness`'s default features include `crypto-sha256`, which is what you get
unless you opt out. Measured here:

| build | ns/op |
|---|---|
| `append`, crypto-sha256 off (FNV-1a) | ~22 |
| `append`, crypto-sha256 on (**default**) | ~295 |
| `signed_append` (chain + HMAC-SHA256) | ~1665 |

rvm's own benchmark agrees on this machine (`witness_log_append_256` ≈ 295ns).
Both figures are honest for their build; the README just doesn't say which one
it is quoting. The ADR targets are still met by orders of magnitude either way.

**9. Two capability claims are narrower than they sound.** (demos 5, 6)

- `rvm-wasm` validates modules and manages a 7-state agent lifecycle. It does
  not execute WebAssembly — there is no interpreter or JIT. "Running" is a
  state label.
- `IpcMessage` carries no payload bytes, only `payload_len` and `msg_type`.
  RVM moves message *headers*; the payload is expected to live in a shared
  region the receiver already holds a capability for.

Neither is a defect — both are reasonable designs — but "WASM agent runtime"
and "inter-partition messaging" both read as more than they are.

## What works well

Worth saying plainly, because the list above is all problems:

- **The capability system is solid.** Monotonic attenuation, `GRANT_ONCE`
  consumption, cascading revocation through the derivation subtree, and
  hypervisor-only root minting all behave exactly as documented (demo 2).
  Revocation deliberately force-invalidates every descendant's table slot so
  the cheap P1 check catches it — with a source comment explaining why.
- **RVF verification is genuinely good** (demo 7). Six different tampering
  modes each produce a distinct, specific detail code, the signature covers
  header fields and not just payload bytes, and reports are deterministic.
- **P1/P3 are far inside their ADR targets** — ~1.3ns and ~4.7ns against
  budgets of 1µs and "deep" (demo 3).
- **Everything compiles clean and the test suite passes.** 17 crates, `no_std`
  throughout, and the AArch64 cross-build works.

## Layout

```
demos/01-witnessed-hello/       cargo run -p demo-01-witnessed-hello
demos/02-hello-denied/          cargo run -p demo-02-hello-denied
demos/03-prove-hello/           cargo run -p demo-03-prove-hello
demos/04-uart-hello/            ./run.sh    (standalone; excluded from workspace)
demos/05-partition-pingpong/    cargo run -p demo-05-partition-pingpong
demos/06-agents-get-closer/     cargo run -p demo-06-agents-get-closer
demos/07-signed-hello/          cargo run -p demo-07-signed-hello
scripts/bootstrap.sh            clones rvm to ../rvm at a pinned rev
scripts/run-all.sh              runs every host demo in order
```

rvm is consumed as a **sibling checkout** at `../rvm`, not a git dependency:
cargo initialises submodules for git deps, and rvm declares three
(`rudevolution`, `ruvector`, `cuda-wasm`) that its own workspace `exclude`s and
that take >10 minutes to fetch. `bootstrap.sh` clones without them.
