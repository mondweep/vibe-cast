#!/bin/bash
# Netlify build script for WASM Image Filters

set -e

echo "=== Installing Rust (if needed) ==="
if ! command -v rustc &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi
source "$HOME/.cargo/env" 2>/dev/null || true

echo "=== Installing wasm-pack (if needed) ==="
if ! command -v wasm-pack &> /dev/null; then
    cargo install wasm-pack
else
    echo "wasm-pack already installed, skipping"
fi

echo "=== Building WASM ==="
wasm-pack build --target web --out-dir www/pkg

echo "=== Build complete ==="
ls -la www/pkg/
