#!/usr/bin/env bash
# Vendor the wllama runtime and the model locally, so the game runs with no
# network at all. Optional — by default the page pulls wllama from jsdelivr and
# the model from HuggingFace.
#
#   ./fetch-assets.sh
#   python3 serve.py
#   open "http://localhost:8000/?wllama=./vendor/&model=./model.gguf"
set -euo pipefail
cd "$(dirname "$0")"

VER=3.6.1
echo "Fetching wllama $VER into ./vendor …"
mkdir -p vendor/wasm
curl -fsSL -o vendor/index.js \
  "https://cdn.jsdelivr.net/npm/@wllama/wllama@${VER}/esm/index.js"
curl -fsSL -o vendor/wasm/wllama.wasm \
  "https://cdn.jsdelivr.net/npm/@wllama/wllama@${VER}/esm/wasm/wllama.wasm"

if [ ! -f model.gguf ]; then
  echo "Fetching model (398 MB) …"
  curl -fL -o model.gguf \
    "https://huggingface.co/ruv/ruvltra/resolve/main/ruvltra-claude-code-0.5b-q4_k_m.gguf"
fi

echo "Done. Now: python3 serve.py"
echo "Then open: http://localhost:8000/?wllama=./vendor/&model=./model.gguf"
