#!/usr/bin/env bash
# Build the demo-4 kernel and boot it under QEMU.
#   ./run.sh          boot, exit automatically after a few seconds
#   ./run.sh -i       boot interactively (Ctrl-A X to quit)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

command -v qemu-system-aarch64 >/dev/null || {
  echo "qemu-system-aarch64 not found (apt-get install qemu-system-arm)" >&2; exit 1; }
rustup target list --installed | grep -qx aarch64-unknown-none || {
  echo "run: rustup target add aarch64-unknown-none" >&2; exit 1; }

cargo build --release
KERNEL=target/aarch64-unknown-none/release/demo-04-uart-hello

QEMU_ARGS=(-M virt -cpu cortex-a72 -m 128M -nographic -kernel "$KERNEL")

if [ "${1:-}" = "-i" ]; then
  exec qemu-system-aarch64 "${QEMU_ARGS[@]}"
else
  timeout 10 qemu-system-aarch64 "${QEMU_ARGS[@]}" </dev/null || true
fi
