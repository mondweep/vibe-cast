# aave-mcp

> Aave V3 MCP server written in Rust — compiles to a native stdio binary **and** a WASM module from the same codebase.

---

## Architecture

```
aave-mcp/
├── src/
│   ├── lib.rs              # Crate root — gates native vs WASM
│   ├── aave/
│   │   ├── mod.rs          # Module re-exports
│   │   ├── types.rs        # Shared data types (Chain, UserAccountData, ReserveData)
│   │   ├── abi.rs          # alloy sol! ABI definitions + RAY→APY helpers
│   │   └── client.rs       # AaveClient — async reads, works on both targets
│   ├── mcp.rs              # rmcp MCP tools (native only, cfg-gated)
│   ├── wasm.rs             # wasm-bindgen API (WASM only, cfg-gated)
│   └── bin/
│       └── server.rs       # stdio MCP server entry point
├── build.sh                # One-command dual-target build
├── setup-branch.sh         # Orphan branch bootstrap
└── Cargo.toml
```

**Target split:**

| Feature | Native (`x86_64` / `aarch64`) | WASM (`wasm32-unknown-unknown`) |
|---|---|---|
| MCP transport | stdio (rmcp) | — |
| Async runtime | tokio | wasm-bindgen-futures |
| RPC transport | reqwest (native) | reqwest (WASM) |
| Signing | local signer (Phase 2) | wallet (MetaMask / WalletConnect) |
| Entry point | `src/bin/server.rs` | `src/wasm.rs` (AaveWasm class) |

---

## Prerequisites

```bash
# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# WASM target
rustup target add wasm32-unknown-unknown

# wasm-pack
cargo install wasm-pack
```

---

## Build

```bash
# Both targets in one command
bash build.sh

# Or individually:
cargo build --release --bin server          # native MCP binary
wasm-pack build --target web --release      # WASM module → ./pkg/
```

---

## Usage

### As a Claude MCP server

Add to your `.mcp.json` (Claude Code / Claude Desktop):

```json
{
  "mcpServers": {
    "aave": {
      "command": "/absolute/path/to/target/release/server"
    }
  }
}
```

Available tools:

| Tool | Description |
|---|---|
| `aave_get_markets` | All active Aave V3 reserves on `ethereum` or `base` |
| `aave_get_user_account` | Health factor + risk snapshot for a wallet address |

Example prompts:
- *"What are the current Aave V3 supply APYs on Base?"*
- *"Check if 0xAbCd… is at risk of liquidation on Ethereum."*

### As a WASM module (browser / Cloudflare Worker)

```ts
import init, { AaveWasm } from "./pkg/aave_mcp.js";

await init();

const sdk = new AaveWasm("base", undefined);

// Get all markets
const markets = JSON.parse(await sdk.get_markets());
console.log(markets);

// Check a wallet
const account = JSON.parse(await sdk.get_user_account("0xYourAddress"));
console.log(`Health factor: ${account.health_factor} (${account.risk_label})`);
```

---

## Supported Chains

| Chain | Chain ID | Aave V3 Pool |
|---|---|---|
| Ethereum mainnet | 1 | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |
| Base | 8453 | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |

Default public RPCs are provided (LlamaRPC / Base RPC). Pass a custom `rpc_url` for production — use Alchemy or Infura for rate-limit headroom.

---

## Roadmap

### Phase 1 (this branch) — Read-only ✅
- [x] `aave_get_markets` — all reserves + APYs
- [x] `aave_get_user_account` — health factor + risk label
- [x] Native stdio MCP server (rmcp)
- [x] WASM module (wasm-bindgen)

### Phase 2 — Write tools (native, testnet first)
- [ ] `aave_supply` — supply an asset as collateral
- [ ] `aave_borrow` — borrow against collateral
- [ ] `aave_repay` — repay a loan
- [ ] `aave_withdraw` — withdraw supplied assets
- [ ] Local signer via alloy's keystore / ledger transport

### Phase 3 — Agent integration
- [ ] Connect to Agentics Foundation agent via MCP
- [ ] n8n workflow trigger for liquidation alerts
- [ ] Cloudflare Worker deployment of WASM module

---

## Development notes

- **Never `println!` in the server binary** — stdout belongs to the JSON-RPC stream. Use `tracing` → stderr.
- Set `RUST_LOG=aave_mcp=debug` for verbose RPC call logging.
- The `WASM` build excludes `rmcp`, `tokio`, and `tracing-subscriber` via `#[cfg(not(target_arch = "wasm32"))]` — no binary bloat in the WASM output.
- alloy's `sol!` macro generates typed async call methods — no manual ABI encoding.
