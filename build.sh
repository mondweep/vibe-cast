#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# aave-mcp build script
# Builds both the native MCP server binary and the WASM module.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[build]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn ]${NC} $*"; }
error() { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

# ── Prereq checks ─────────────────────────────────────────────────────────────
command -v cargo     >/dev/null || error "cargo not found — install Rust via rustup.rs"
command -v wasm-pack >/dev/null || {
    warn "wasm-pack not found — installing..."
    cargo install wasm-pack
}

WASM_TARGET="wasm32-unknown-unknown"
rustup target list --installed | grep -q "$WASM_TARGET" || {
    info "Adding WASM target..."
    rustup target add "$WASM_TARGET"
}

# ── Native binary ─────────────────────────────────────────────────────────────
info "Building native MCP server (release)..."
cargo build --release --bin server
NATIVE_BIN="$(pwd)/target/release/server"
info "Native binary: ${NATIVE_BIN}"

# ── WASM module ───────────────────────────────────────────────────────────────
info "Building WASM module via wasm-pack..."
wasm-pack build \
    --target web \
    --out-dir pkg \
    --release \
    -- --no-default-features

info "WASM output: $(pwd)/pkg/"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✓ Build complete${NC}"
echo ""
echo "  Native MCP server:  ${NATIVE_BIN}"
echo "  WASM module:        $(pwd)/pkg/aave_mcp.js + aave_mcp_bg.wasm"
echo ""
echo "  Add to Claude Code (.mcp.json):"
echo '  {'
echo '    "mcpServers": {'
echo '      "aave": {'
echo "        \"command\": \"${NATIVE_BIN}\""
echo '      }'
echo '    }'
echo '  }'
echo ""
echo "  WASM usage:"
echo "    import init, { AaveWasm } from './pkg/aave_mcp.js';"
echo "    await init();"
echo "    const sdk = new AaveWasm('base', undefined);"
echo "    const markets = JSON.parse(await sdk.get_markets());"
