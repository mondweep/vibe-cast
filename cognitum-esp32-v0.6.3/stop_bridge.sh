#!/bin/bash
# Cleanly stop the bridge (and any other UDP/5006 listeners).
PIDS="$(lsof -ti:5006 2>/dev/null || true)"
if [ -z "$PIDS" ]; then
  echo "Nothing on UDP/5006."
  exit 0
fi
echo "Killing: $PIDS"
echo "$PIDS" | xargs kill 2>/dev/null || true
