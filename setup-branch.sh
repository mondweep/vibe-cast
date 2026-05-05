#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-branch.sh
#
# Creates an orphan branch `aave-mcp` inside the vibe-cast repository,
# copies the scaffold, and makes an initial commit.
#
# Run from the ROOT of your vibe-cast repo:
#   bash setup-branch.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BRANCH="aave-mcp"
SCAFFOLD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'; NC='\033[0m'
info() { echo -e "${GREEN}[setup]${NC} $*"; }

# Confirm we're inside a git repo
git rev-parse --git-dir >/dev/null 2>&1 || {
    echo "ERROR: not inside a git repository. cd into vibe-cast first." >&2
    exit 1
}

REPO_ROOT="$(git rev-parse --show-toplevel)"
info "Repository root: ${REPO_ROOT}"

# Stash any uncommitted work on the current branch
STASH_RESULT=$(git stash push -m "auto-stash before aave-mcp orphan branch" 2>&1 || true)

# Create orphan branch (completely isolated history)
info "Creating orphan branch: ${BRANCH}"
git checkout --orphan "$BRANCH"

# Remove everything from the index (orphan starts with a clean slate)
git rm -rf . >/dev/null 2>&1 || true

# Copy scaffold files into the repo root
info "Copying scaffold files..."
cp -r "${SCAFFOLD_DIR}/." "${REPO_ROOT}/"

# Stage everything
git add .

# Initial commit
git commit -m "feat(aave-mcp): initial Rust MCP scaffold

- Dual-target: native stdio MCP server (rmcp) + WASM module (wasm-bindgen)
- Aave V3 read tools: aave_get_markets, aave_get_user_account
- Supports Ethereum mainnet and Base
- alloy sol! macro ABI definitions for Pool + ProtocolDataProvider
- cfg-gated: native uses tokio/rmcp, WASM uses wasm-bindgen-futures
- build.sh for one-command dual-target build"

info "Orphan branch '${BRANCH}' created with initial commit."
info ""
info "Next steps:"
info "  git push origin ${BRANCH}           # push to remote"
info "  bash build.sh                        # build native + WASM"
info "  cargo check                          # quick compile check"
info ""
info "To return to your main branch:"
info "  git checkout main   (or master)"
if echo "$STASH_RESULT" | grep -q "Saved"; then
    info "  git stash pop       (restore your stashed work)"
fi
