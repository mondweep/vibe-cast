# RVM "Hello World" — Exploration Branch

A scratch workspace for building a first program against
[ruvnet/rvm](https://github.com/ruvnet/rvm), a bare-metal Rust hypervisor
(`no_std`, AArch64, boots under QEMU) built around *coherence domains* —
partitions that re-shape themselves based on how agents actually communicate.

This is an **orphan branch**: it shares no history with `main`.

## Status

Nothing built yet. The options below are drawn from RVM's README and docs —
**the exact API signatures have not been verified against the source.** First
step for whichever option we pick is to clone rvm and confirm the real crate APIs.

## Candidate options

Ordered by setup cost. Tier 0 needs no emulator; Tier 1+ needs `qemu-system-aarch64`
and the `aarch64-unknown-none` target.

### Tier 0 — library only, `cargo run --features std`

| # | Name | Crates | What it shows |
|---|------|--------|---------------|
| 1 | **Witnessed Hello** | `rvm-witness` | Emit `"hello world"` as a witnessed action, print the 64-byte hash-chained record, tamper with one record, watch chain verification fail. Optionally loop 1M times for a throughput number (~17ns/emit claimed). |
| 2 | **Hello, Denied** | `rvm-cap`, `rvm-security` | Mint a `READ`-only capability, attempt `WRITE`, get gated. Re-mint with `GRANT_ONCE` and watch the right succeed exactly once, then evaporate. |
| 3 | **Three Ways to Prove Hello** | `rvm-proof` | One trivial state mutation pushed through P1, P2 and P3; print cost vs. guarantee for each tier. |

### Tier 1 — boot it

| # | Name | Crates | What it shows |
|---|------|--------|---------------|
| 4 | **UART Hello from a Bare Partition** | `rvm-boot`, `rvm-hal` | Classic OS hello world: `aarch64-unknown-none` binary printing to serial via `make build && make run`. Proves the toolchain and walks the 7-phase boot sequence. |
| 5 | **Partition Ping-Pong** | `rvm-partition`, `rvm-sched` | Two partitions bouncing `"hello"` / `"world"` while the two-signal scheduler switches between them (~6ns/switch claimed). Dump the witness log at the end for a full audit trail of the conversation. |

### Tier 2 — the actual thesis

| # | Name | Crates | What it shows |
|---|------|--------|---------------|
| 6 | **Two Agents That Get Closer** | `rvm-wasm`, `rvm-coherence` | Two WASM agents in separate partitions exchanging ~1 msg/sec. Print the coherence graph, raise the message rate, watch mincut re-place them into one domain, print the graph again. Drop a trust signal and watch them split back apart. |
| 7 | **Signed Hello Package** | `rvm-rvf` | Pack a hello agent into an RVForge `.rvf`, verify identity + manifest + segments, load and run. Then corrupt a byte and watch the loader refuse. |

## Recommended path

**#1** first — genuinely small, no emulator, and it demonstrates RVM's most
distinctive feature. Then **#4** to prove the toolchain end to end. Then **#6**
as the thing worth demoing to other people: that before/after graph diff is
RVM's entire pitch on one screen.

## Known unknowns

- Whether `rvm-coherence` re-partitioning is actually driven by observable
  message traffic in the current build, or is manually triggered. Option #6
  depends on this.
- Whether the Tier 0 crates are usable standalone under `--features std`, or
  whether they assume a booted kernel context.
- Real API signatures throughout — all of the above is from documentation.

## Upstream reference

```bash
git clone --recurse-submodules https://github.com/ruvnet/rvm.git && cd rvm
cargo test --workspace --lib        # 945 tests
rustup target add aarch64-unknown-none
make build && make run              # boot under QEMU
```
