#!/bin/bash
# Clone arnis and apply the GeoTIFF elevation + 1.18+ chunk format patches.
# Usage: ./apply-patch.sh [target-directory]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-/tmp/arnis-patched}"

echo "Cloning arnis to ${TARGET_DIR}..."
git clone --depth 1 https://github.com/louis-e/arnis.git "${TARGET_DIR}"

echo "Applying GeoTIFF elevation patch..."
cd "${TARGET_DIR}"
git apply "${SCRIPT_DIR}/geotiff-elevation.patch"

echo "Patch applied. Build with:"
echo "  cd ${TARGET_DIR} && cargo build --no-default-features --release"
