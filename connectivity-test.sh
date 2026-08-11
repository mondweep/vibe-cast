#!/usr/bin/env bash
#
# connectivity-test.sh - continuous internet connectivity + speed logger.
#
# Runs a round of checks every INTERVAL seconds and appends one CSV row per
# check to a daily log file. Designed to be left running overnight so the
# resulting log can be turned into an ISP-ready report with analyze-results.py.
#
# Usage:
#   ./connectivity-test.sh                      # run until Ctrl-C, 60s rounds
#   ./connectivity-test.sh --hours 10           # stop after 10 hours
#   ./connectivity-test.sh --interval 30 --speed-every 15
#   ./connectivity-test.sh --no-speed           # latency/loss only
#
set -uo pipefail

INTERVAL=60             # seconds between rounds
HOURS=0                 # 0 = run until interrupted
SPEED_EVERY=30          # minutes between speed tests (0 = disable)
LOG_DIR="./logs"
PING_COUNT=10           # packets per ping sample (gives loss + jitter)
PING_TARGETS="1.1.1.1 8.8.8.8"
DNS_TARGETS="www.google.com cloudflare.com"
HTTP_TARGETS="https://www.google.com/generate_204 https://www.cloudflare.com/cdn-cgi/trace"
HTTP_TIMEOUT=15
DOWNLOAD_URL="https://speed.cloudflare.com/__down?bytes=25000000"
UPLOAD_URL="https://speed.cloudflare.com/__up"
UPLOAD_BYTES=5000000
SPEED_TIMEOUT=60

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

while [ $# -gt 0 ]; do
  case "$1" in
    --interval)    INTERVAL="$2"; shift 2 ;;
    --hours)       HOURS="$2"; shift 2 ;;
    --speed-every) SPEED_EVERY="$2"; shift 2 ;;
    --no-speed)    SPEED_EVERY=0; shift ;;
    --log-dir)     LOG_DIR="$2"; shift 2 ;;
    --ping-count)  PING_COUNT="$2"; shift 2 ;;
    --ping-targets) PING_TARGETS="$2"; shift 2 ;;
    --http-targets) HTTP_TARGETS="$2"; shift 2 ;;
    --dns-targets)  DNS_TARGETS="$2"; shift 2 ;;
    -h|--help)     usage ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }

HAVE_PING=0; command -v ping >/dev/null 2>&1 && HAVE_PING=1
HAVE_DIG=0;  command -v dig  >/dev/null 2>&1 && HAVE_DIG=1
HAVE_TIMEOUT=0; command -v timeout >/dev/null 2>&1 && HAVE_TIMEOUT=1

# --- helpers ---------------------------------------------------------------

# Milliseconds since epoch. GNU date supports %N; fall back to python3.
if [ "$(date +%s%3N 2>/dev/null | tr -d '0-9')" = "" ] && [ -n "$(date +%s%3N 2>/dev/null)" ]; then
  now_ms() { date +%s%3N; }
elif command -v python3 >/dev/null 2>&1; then
  now_ms() { python3 -c 'import time; print(int(time.time()*1000))'; }
else
  now_ms() { echo "$(date +%s)000"; }
fi

iso_utc() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

# Strip characters that would break the CSV.
clean() { printf '%s' "$1" | tr ',\n\r"' ';   ' | tr -s ' '; }

with_timeout() {
  local secs="$1"; shift
  if [ "$HAVE_TIMEOUT" = "1" ]; then
    timeout "$secs" "$@"
  else
    "$@"
  fi
}

ROUND=0
LOG_FILE=""

open_log() {
  local day file
  day=$(date -u +"%Y-%m-%d")
  file="$LOG_DIR/connectivity-$day.csv"
  if [ "$file" != "$LOG_FILE" ]; then
    LOG_FILE="$file"
    if [ ! -f "$LOG_FILE" ]; then
      echo "timestamp_utc,epoch_ms,round,check,target,status,latency_ms,loss_pct,jitter_ms,speed_mbps,http_code,detail" > "$LOG_FILE"
    fi
    echo "[$(iso_utc)] logging to $LOG_FILE"
  fi
}

# row <check> <target> <status> <latency_ms> <loss_pct> <jitter_ms> <speed_mbps> <http_code> <detail>
row() {
  open_log
  printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n' \
    "$(iso_utc)" "$(now_ms)" "$ROUND" "$1" "$(clean "$2")" "$3" \
    "$4" "$5" "$6" "$7" "$8" "$(clean "$9")" >> "$LOG_FILE"
}

# --- checks ----------------------------------------------------------------

check_ping() {
  local host="$1" out rtt loss jitter avg
  out=$(with_timeout $((PING_COUNT * 2 + 10)) ping -n -c "$PING_COUNT" "$host" 2>&1)
  loss=$(printf '%s' "$out" | grep -o '[0-9.]*%[ ]*packet loss' | grep -o '[0-9.]*' | head -1)
  rtt=$(printf '%s' "$out" | grep -o 'min/avg/max[^=]*= [0-9./]*' | awk -F'= ' '{print $2}')
  [ -z "$loss" ] && loss=100
  if [ -n "$rtt" ]; then
    avg=$(printf '%s' "$rtt" | cut -d/ -f2)
    jitter=$(printf '%s' "$rtt" | cut -d/ -f4)
  else
    avg=""; jitter=""
  fi
  # 100% loss, or no RTT at all, means this target was unreachable.
  if [ "$loss" = "100" ] || [ -z "$avg" ]; then
    row ping "$host" fail "$avg" "$loss" "$jitter" "" "" "unreachable"
  else
    row ping "$host" ok "$avg" "$loss" "$jitter" "" "" "min/avg/max/mdev=$rtt"
  fi
}

check_dns() {
  local host="$1" start end ms out rc
  start=$(now_ms)
  if [ "$HAVE_DIG" = "1" ]; then
    out=$(with_timeout 15 dig +tries=1 +time=5 +short A "$host" 2>&1); rc=$?
  else
    out=$(with_timeout 15 getent hosts "$host" 2>&1); rc=$?
  fi
  end=$(now_ms); ms=$((end - start))
  if [ "$rc" -ne 0 ] || [ -z "$out" ]; then
    row dns "$host" fail "$ms" "" "" "" "" "no answer"
  else
    row dns "$host" ok "$ms" "" "" "" "" "$(printf '%s' "$out" | head -1)"
  fi
}

check_http() {
  local url="$1" out code total dns conn tls ttfb rc
  out=$(with_timeout $((HTTP_TIMEOUT + 5)) curl -sS -o /dev/null \
        --max-time "$HTTP_TIMEOUT" \
        -w '%{http_code} %{time_total} %{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer}' \
        "$url" 2>&1); rc=$?
  if [ "$rc" -ne 0 ]; then
    row http "$url" fail "" "" "" "" "" "curl rc=$rc $(printf '%s' "$out" | head -1)"
    return
  fi
  set -- $out
  code="$1"; total="$2"; dns="$3"; conn="$4"; tls="$5"; ttfb="$6"
  # curl reports seconds; convert to ms for the log.
  total=$(awk -v t="$total" 'BEGIN{printf "%.1f", t*1000}')
  if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    row http "$url" ok "$total" "" "" "" "$code" "dns=${dns}s connect=${conn}s tls=${tls}s ttfb=${ttfb}s"
  else
    row http "$url" fail "$total" "" "" "" "$code" "http $code"
  fi
}

check_download() {
  local out rc speed bytes total
  out=$(with_timeout $((SPEED_TIMEOUT + 10)) curl -sS -o /dev/null \
        --max-time "$SPEED_TIMEOUT" \
        -w '%{speed_download} %{size_download} %{time_total}' \
        "$DOWNLOAD_URL" 2>&1); rc=$?
  if [ "$rc" -ne 0 ]; then
    row speed_down "$DOWNLOAD_URL" fail "" "" "" "" "" "curl rc=$rc"
    return
  fi
  set -- $out
  speed="$1"; bytes="$2"; total="$3"
  # curl gives bytes/sec; report megabits/sec.
  speed=$(awk -v s="$speed" 'BEGIN{printf "%.2f", s*8/1000000}')
  total=$(awk -v t="$total" 'BEGIN{printf "%.1f", t*1000}')
  row speed_down "download" ok "$total" "" "" "$speed" "" "bytes=$bytes"
}

check_upload() {
  local out rc speed total
  out=$(head -c "$UPLOAD_BYTES" /dev/zero 2>/dev/null | \
        with_timeout $((SPEED_TIMEOUT + 10)) curl -sS -o /dev/null \
        --max-time "$SPEED_TIMEOUT" \
        -X POST -H 'Content-Type: application/octet-stream' --data-binary @- \
        -w '%{speed_upload} %{time_total}' \
        "$UPLOAD_URL" 2>&1); rc=$?
  if [ "$rc" -ne 0 ]; then
    row speed_up "$UPLOAD_URL" fail "" "" "" "" "" "curl rc=$rc"
    return
  fi
  set -- $out
  speed="$1"; total="$2"
  speed=$(awk -v s="$speed" 'BEGIN{printf "%.2f", s*8/1000000}')
  total=$(awk -v t="$total" 'BEGIN{printf "%.1f", t*1000}')
  row speed_up "upload" ok "$total" "" "" "$speed" "" "bytes=$UPLOAD_BYTES"
}

# --- main loop -------------------------------------------------------------

mkdir -p "$LOG_DIR"
open_log

RUNNING=1
stop() { RUNNING=0; echo; echo "[$(iso_utc)] stopping after $ROUND rounds"; }
trap stop INT TERM

START=$(date +%s)
DEADLINE=0
[ "$HOURS" != "0" ] && DEADLINE=$(awk -v s="$START" -v h="$HOURS" 'BEGIN{printf "%d", s + h*3600}')
NEXT_SPEED=$START

echo "[$(iso_utc)] round interval ${INTERVAL}s, speed test every ${SPEED_EVERY}m, log dir $LOG_DIR"
[ "$DEADLINE" != "0" ] && echo "[$(iso_utc)] will stop at $(date -u -d "@$DEADLINE" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "+${HOURS}h")"

while [ "$RUNNING" = "1" ]; do
  ROUND=$((ROUND + 1))
  round_start=$(date +%s)

  if [ "$HAVE_PING" = "1" ]; then
    for t in $PING_TARGETS; do check_ping "$t"; done
  fi
  for t in $DNS_TARGETS;  do check_dns  "$t"; done
  for t in $HTTP_TARGETS; do check_http "$t"; done

  now=$(date +%s)
  if [ "$SPEED_EVERY" != "0" ] && [ "$now" -ge "$NEXT_SPEED" ]; then
    check_download
    check_upload
    NEXT_SPEED=$((now + SPEED_EVERY * 60))
  fi

  # Progress line so a watched terminal shows something useful.
  fails=$(awk -F, -v r="$ROUND" '$3==r && $6=="fail"' "$LOG_FILE" | wc -l | tr -d ' ')
  echo "[$(iso_utc)] round $ROUND done, $fails failed check(s)"

  [ "$DEADLINE" != "0" ] && [ "$(date +%s)" -ge "$DEADLINE" ] && break

  # Sleep the remainder of the interval, in 1s slices so Ctrl-C is responsive.
  elapsed=$(( $(date +%s) - round_start ))
  remaining=$(( INTERVAL - elapsed ))
  while [ "$remaining" -gt 0 ] && [ "$RUNNING" = "1" ]; do
    sleep 1
    remaining=$((remaining - 1))
  done
done

echo "[$(iso_utc)] finished. Generate the ISP report with:"
echo "  python3 analyze-results.py --log-dir $LOG_DIR --out isp-report.md"
