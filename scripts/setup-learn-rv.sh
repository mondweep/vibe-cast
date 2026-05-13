#!/usr/bin/env bash
# scripts/setup-learn-rv.sh — Reproduce the Appendix-E learner-rv setup on a
# fresh arm64 macOS box. See EXPLORATION_LOG.md § Appendix E for the why.
#
# What this does (idempotent — safe to re-run):
#   1. Download + install the `learn` CLI (v0.2.9 prebuilt for aarch64-apple-darwin)
#   2. Create the KB root at ~/Docs/KB (the binary's preflight requires it)
#   3. Download BAAI/bge-large-en-v1.5 ONNX + tokenizer into the expected cache
#   4. Run `learn doctor` to confirm
#
# After this finishes, build your first KB with:
#   learn ingest "ytsearch10:<your query>" --topic <slug>
#
# Pre-existing prereqs (verified by `learn doctor` after install): ffmpeg, yt-dlp, git, curl.

set -euo pipefail

LEARN_VERSION="v0.2.9"
ARCH_TARGET="aarch64-apple-darwin"
TARBALL="learn-${ARCH_TARGET}.tar.gz"
RELEASE_URL="https://github.com/stuinfla/learner-rv/releases/download/${LEARN_VERSION}/${TARBALL}"

KB_ROOT="${HOME}/Docs/KB"
MODEL_DIR="${HOME}/Library/Caches/learn-rs/models/bge-large-en-v15"
HF_BASE="https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main"

if [[ "$(uname -sm)" != "Darwin arm64" ]]; then
  echo "ERROR: this script targets arm64 macOS. Adapt RELEASE_URL for your platform" >&2
  echo "       (see https://github.com/stuinfla/learner-rv/releases)." >&2
  exit 1
fi

echo "[1/4] Installing learn ${LEARN_VERSION}..."
if command -v learn >/dev/null 2>&1; then
  echo "  learn already on PATH ($(learn --version)) — skipping download."
else
  curl -fL --progress-bar -o "/tmp/${TARBALL}" "${RELEASE_URL}"
  tar -xzf "/tmp/${TARBALL}" -C /tmp/
  bash "/tmp/learn-${ARCH_TARGET}/install.sh"
fi

echo "[2/4] Ensuring KB root exists at ${KB_ROOT}..."
mkdir -p "${KB_ROOT}"

echo "[3/4] Installing BGE-large-en-v1.5 ONNX into ${MODEL_DIR}..."
mkdir -p "${MODEL_DIR}"
cd "${MODEL_DIR}"

if [[ -s model.onnx ]] && [[ "$(stat -f %z model.onnx)" -gt 1000000000 ]]; then
  echo "  model.onnx already present (>1 GB) — skipping."
else
  echo "  downloading model.onnx (~1.3 GB)..."
  curl -fL --progress-bar -o model.onnx "${HF_BASE}/onnx/model.onnx"
fi

for f in tokenizer.json tokenizer_config.json vocab.txt special_tokens_map.json config.json; do
  if [[ -s "$f" ]]; then
    echo "  $f already present — skipping."
  else
    curl -fL -s -o "$f" "${HF_BASE}/${f}"
    echo "  fetched $f ($(wc -c < "$f") bytes)"
  fi
done

echo "[4/4] Running learn doctor..."
learn doctor || true

cat <<EOF

Done. Next steps:
  learn ingest "ytsearch10:<your query>" --topic <slug>
  learn list
  learn status <slug>

To use the KB from Claude Desktop (under your Max subscription, no API key):
  Add to ~/Library/Application Support/Claude/claude_desktop_config.json under "mcpServers":
    "learn-rv": {
      "command": "${HOME}/.cargo/bin/learn",
      "args": ["serve", "<slug>"],
      "env": {}
    }
  Then Cmd+Q and reopen Claude Desktop.

Claude Code picks up the global skill at ~/.claude/skills/learn-rv/ automatically.
EOF
