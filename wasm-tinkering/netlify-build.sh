#!/bin/bash
# Netlify build script for WASM Image Filters

set -e

echo "=== Setting up Rust ==="
# Install Rust if not present
if ! command -v rustup &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi

# Source cargo environment
export PATH="$HOME/.cargo/bin:$PATH"
source "$HOME/.cargo/env" 2>/dev/null || true

# Ensure a default toolchain is set and wasm32 target is available
rustup default stable
rustup target add wasm32-unknown-unknown

echo "=== Installing wasm-pack (if needed) ==="
if ! command -v wasm-pack &> /dev/null; then
    cargo install wasm-pack
else
    echo "wasm-pack already installed, skipping"
fi

echo "=== Cleaning old build artifacts ==="
rm -rf www/pkg
rm -rf target/wasm32-unknown-unknown/release/.fingerprint
cargo clean 2>/dev/null || true

echo "=== Building WASM (fresh build) ==="
wasm-pack build --target web --out-dir www/pkg --release

echo "=== Verifying exported functions ==="
grep -o 'export function [a-z_]*' www/pkg/wasm_image_filters.js || echo "No exports found!"

echo "=== Build complete ==="
ls -la www/pkg/
