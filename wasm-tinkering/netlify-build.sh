#!/bin/bash
# Netlify build script for WASM Image Filters

set -e

echo "=== Installing Rust ==="
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

echo "=== Installing wasm-pack ==="
cargo install wasm-pack

echo "=== Building WASM ==="
wasm-pack build --target web --out-dir www/pkg

echo "=== Build complete ==="
ls -la www/pkg/
