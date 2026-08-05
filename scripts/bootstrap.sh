#!/usr/bin/env bash
# Clone the rvm checkout that these demos build against.
#
# Deliberately WITHOUT --recurse-submodules: rvm declares three submodules
# (rudevolution, ruvector, cuda-wasm) that its own workspace `exclude`s, and
# fetching them takes >10 minutes. Nothing here needs them.
set -euo pipefail

RVM_REV="${RVM_REV:-78acb36d3d906b098b2074b8aecf9ff88c2af4e0}"
DEST="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/rvm"

if [ -d "$DEST/.git" ]; then
  echo "rvm checkout already present at $DEST"
else
  echo "Cloning rvm -> $DEST"
  git clone https://github.com/ruvnet/rvm.git "$DEST"
fi

git -C "$DEST" fetch --depth 50 origin "$RVM_REV" 2>/dev/null || true
git -C "$DEST" checkout --quiet "$RVM_REV" 2>/dev/null \
  || echo "warning: could not pin to $RVM_REV, using $(git -C "$DEST" rev-parse --short HEAD)"

echo "rvm ready at $(git -C "$DEST" rev-parse --short HEAD)"
echo
echo "Now run:  cargo run -p demo-01-witnessed-hello"
