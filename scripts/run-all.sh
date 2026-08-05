#!/usr/bin/env bash
# Run every host demo in order. Demo 4 is bare-metal and lives behind its
# own run.sh (needs QEMU); this script points at it rather than running it.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ ! -d ../rvm/crates ]; then
  echo "rvm checkout missing. Run ./scripts/bootstrap.sh first." >&2
  exit 1
fi

for demo in \
  demo-01-witnessed-hello \
  demo-02-hello-denied \
  demo-03-prove-hello \
  demo-05-partition-pingpong \
  demo-06-agents-get-closer \
  demo-07-signed-hello
do
  printf '\n\n\033[7m  %-72s\033[0m\n\n' "$demo"
  cargo run -q -p "$demo" --release
done

printf '\n\n\033[7m  %-72s\033[0m\n\n' "demo-04-uart-hello (bare metal)"
echo "Demo 4 boots under QEMU and is not part of the cargo workspace."
echo "Run it with:  cd demos/04-uart-hello && ./run.sh"
