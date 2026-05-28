#!/bin/bash
# Run the CSI -> Seed bridge with verbose logging.
# Logs go to bridge.log in this folder. Claude reads that file directly,
# so you don't need to copy/paste anything back to chat.

set -u
cd "$(dirname "$0")"

LOG="bridge.log"

# Automatically load TOKEN from root .env if SEED_TOKEN is not in env
if [ -z "${SEED_TOKEN:-}" ] && [ -f "../.env" ]; then
  echo "Loading token from root .env file..."
  export SEED_TOKEN="$(grep -E '^TOKEN=' ../.env | cut -d'=' -f2)"
fi

if [ -z "${SEED_TOKEN:-}" ]; then
  echo "ERROR: SEED_TOKEN is not set and could not be loaded from .env." >&2
  echo "Run this first:  export SEED_TOKEN='<your-bearer-token>'" >&2
  exit 1
fi

# If anything else is holding port 5006 (e.g. udp_listener.py), free it.
PIDS="$(lsof -ti:5006 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  echo "Stopping previous listener(s) on UDP/5006: $PIDS"
  echo "$PIDS" | xargs kill 2>/dev/null || true
  sleep 0.5
fi

echo "----------------------------------------------------------------"
echo "CSI -> Seed bridge starting."
echo "Log file: $(pwd)/$LOG  (overwritten each run)"
echo "Press Ctrl+C in this window to stop."
echo "----------------------------------------------------------------"
echo

# -u = unbuffered stdout so the log is line-by-line live.
exec python3 -u seed_csi_bridge.py \
  --token "$SEED_TOKEN" \
  --seed-url https://cognitum-2c3c.local:8443 \
  --udp-port 5006 \
  --batch-size 5 \
  --flush-interval 5 \
  --verbose 2>&1 | tee "$LOG"
