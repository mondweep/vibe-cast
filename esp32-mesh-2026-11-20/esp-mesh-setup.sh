#!/bin/bash
# esp-mesh-setup.sh — flash + provision one ESP32-S3 or ESP32-C6 (4 MB+ flash) as a RuView CSI node
# on the Galaxy hotspot, streaming to the Cognitum Seed, as part of a 3-node TDM mesh.
#
# Usage (one board plugged into the Mac at a time):
#   ./esp-mesh-setup.sh 1        # node 1 ... up to node 16
#   ./esp-mesh-setup.sh 2
# Every node must use the same "boards in mesh" total; if you add boards,
# re-run the existing ones with --no-flash so they learn the new total.
# Options:
#   --no-flash    only re-provision Wi-Fi/mesh settings (board already on 0.8.8)
#   --monitor     only show the board's serial log for 25 s
#   --flash-only  install firmware but leave the board unprovisioned (spares);
#                 the node number is ignored. Provision later with --no-flash.
#
# Asks for the hotspot password (hidden) on the first run and keeps it in an
# owner-only file in ~/.cognitum-mesh/. Nothing secret is written into this folder.

set -euo pipefail

NODE="${1:-}"; shift || true
DO_FLASH=1; ONLY_MONITOR=0; FLASH_ONLY=0
for a in "$@"; do
  case "$a" in
    --no-flash) DO_FLASH=0 ;;
    --monitor)  ONLY_MONITOR=1 ;;
    --flash-only) FLASH_ONLY=1 ;;
    *) echo "Unknown option: $a"; exit 1 ;;
  esac
done
case "$NODE" in [1-9]|1[0-6]) ;; *) echo "Usage: $0 <node 1-16> [--no-flash|--monitor]"; exit 1 ;; esac
UDP_PORT=5006
FW_TAG="v0.8.8-esp32"
# Headless (no-display) build. The 8 MB release enables display support, which
# false-detects a panel on bare boards and drops CSI to 0 pps. The 4 MB layout
# runs fine on 8/16 MB flash (it just leaves the rest unused).
# Bundle is chosen per chip after detection (S3 or C6); both use the 4 MB layout
# with NVS at 0x9000, which also runs on 8/16 MB flash.
S3_ZIP="esp32-csi-node-v0.8.8-s3-4mb-flash-bundle.zip"
S3_SHA="3862ece2fa83c0ec4bb62b718c85d4f613e0221667577b3daf164e46a39d1c8b"
C6_ZIP="esp32-csi-node-v0.8.8-c6-4mb-flash-bundle.zip"
C6_SHA="cbcaa1564d9fe71f0eda1d6a1fad0e63fe5cb54a8cc5cf97b24f82af786d55d5"
PROV_URL="https://raw.githubusercontent.com/ruvnet/RuView/main/firmware/esp32-csi-node/provision.py"

STATE="$HOME/.cognitum-mesh"; mkdir -p "$STATE"; chmod 700 "$STATE"
CONF="$STATE/mesh.conf"
[ -f "$CONF" ] && . "$CONF"

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die()  { printf '\n\033[31mSTOP: %s\033[0m\n' "$*"; exit 1; }

# ---- tools ---------------------------------------------------------------
if command -v esptool >/dev/null 2>&1; then ESPTOOL=(esptool)
elif python3 -c "import esptool" 2>/dev/null; then ESPTOOL=(python3 -m esptool)
else say "Installing esptool"; python3 -m pip install --quiet esptool; ESPTOOL=(python3 -m esptool); fi
python3 -c "import serial" 2>/dev/null || python3 -m pip install --quiet pyserial
python3 -c "import esp_idf_nvs_partition_gen" 2>/dev/null || python3 -m pip install --quiet esp-idf-nvs-partition-gen

# ---- find the one plugged-in board ---------------------------------------
PORTS=$(ls /dev/cu.usbmodem* /dev/cu.usbserial* /dev/cu.wchusbserial* /dev/cu.SLAB_USBtoUART* 2>/dev/null || true)
COUNT=$(printf '%s\n' "$PORTS" | grep -c . || true)
[ "$COUNT" -eq 0 ] && die "No ESP32 found. Re-plug it, try another (data) cable, then run: ls /dev/cu.*"
[ "$COUNT" -gt 1 ] && die "More than one board plugged in:
$PORTS
Unplug all but the one you're setting up as node $NODE."
PORT="$PORTS"
say "Node $NODE on $PORT"

monitor() {
  python3 - "$PORT" <<'PY'
import sys, time, serial
s = serial.Serial(sys.argv[1], 115200, timeout=0.5)
s.dtr = False; s.rts = True; time.sleep(0.1); s.rts = False   # reset the board
keys = ("version", "connected", "got ip", "csi streaming", "tdm", "swarm", "error", "fail")
end = time.time() + 25
while time.time() < end:
    line = s.readline().decode(errors="replace").strip()
    if line and any(k in line.lower() for k in keys):
        print(line)
PY
}
if [ "$ONLY_MONITOR" -eq 1 ]; then monitor; exit 0; fi

# ---- settings (asked once, remembered) -----------------------------------
if [ "$FLASH_ONLY" -eq 0 ]; then
ask() { # var prompt default
  local cur="${!1:-$3}" v
  read -r -p "$2 [${cur}]: " v; v="${v:-$cur}"; [ -n "$v" ] || die "$2 is required"
  printf -v "$1" '%s' "$v"
}
ask HOTSPOT_SSID "Galaxy hotspot name" "${HOTSPOT_SSID:-}"
ask SEED_IP     "Seed's IP on the hotspot (Galaxy > Hotspot > Connected devices)" "${SEED_IP:-}"
ask TOTAL       "Total boards in the mesh (same on every board)" "${TOTAL:-3}"
case "$TOTAL" in [1-9]|1[0-6]) ;; *) die "Total must be 1-16" ;; esac
[ "$NODE" -le "$TOTAL" ] || die "Node $NODE is higher than the total of $TOTAL"
SLOT=$((NODE - 1))
printf 'HOTSPOT_SSID=%q\nSEED_IP=%q\nTOTAL=%q\n' "$HOTSPOT_SSID" "$SEED_IP" "$TOTAL" > "$CONF"; chmod 600 "$CONF"

PASSFILE="$STATE/hotspot-pass"
if [ ! -s "$PASSFILE" ]; then
  read -r -s -p "Hotspot password (hidden): " P; echo
  [ ${#P} -ge 8 ] || die "Hotspot passwords are at least 8 characters"
  ( umask 077; printf '%s' "$P" > "$PASSFILE" ); unset P
fi

TOKFILE="$STATE/seed-token"
if [ ! -f "$TOKFILE" ]; then
  read -r -s -p "Seed pairing token for the swarm bridge (hidden; Enter to skip): " T; echo
  ( umask 077; printf '%s' "$T" > "$TOKFILE" ); unset T
fi
SEED_TOKEN="$(cat "$TOKFILE")"
fi

# ---- check the chip ------------------------------------------------------
say "Checking chip"
INFO=$("${ESPTOOL[@]}" --port "$PORT" flash_id 2>&1) || { echo "$INFO" | tail -5; die "Can't talk to the board. Hold BOOT, tap RESET, release BOOT, and run again."; }
echo "$INFO" | grep -E "Chip type|Chip is|flash size|MAC:" || true
# ---- which board is this? -------------------------------------------------
# Boards are identified by MAC. Our own register (~/.cognitum-mesh/boards.tsv)
# records every run; RuView's provisioning state (one JSON per MAC) is the
# fallback for boards provisioned before the register existed.
REG="$STATE/boards.tsv"; touch "$REG"; chmod 600 "$REG"
MACS=$(echo "$INFO" | awk '/^(BASE )?MAC:/{print tolower($NF)}')
MAC=$(echo "$MACS" | head -1)
KNOWN=""
for m in $MACS; do
  r=$(awk -F'\t' -v m="$m" '$1==m{l=$0} END{print l}' "$REG")
  if [ -n "$r" ]; then KNOWN=$(echo "$r" | awk -F'\t' '{printf "node %s (%s, %s)", $2, $3, $4}'); break; fi
  j="$HOME/.config/wifi-densepose/esp32-provision-state/mac-$(echo "$m" | tr -d :).json"
  if [ -f "$j" ]; then
    n=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("node_id",""))' "$j" 2>/dev/null || true)
    [ -n "$n" ] && { KNOWN="node $n (from RuView provisioning record)"; break; }
  fi
done
if [ -n "$KNOWN" ]; then echo "This board was last set up as: $KNOWN"
else echo "This board isn't in the register yet (new or unrecorded board)."; fi
PREV_NODE=$(echo "$KNOWN" | awk '{print $2}')
if [ "$ONLY_MONITOR" -eq 0 ] && [ "$FLASH_ONLY" -eq 0 ] && [ -n "$PREV_NODE" ] && [ "$PREV_NODE" != "$NODE" ]; then
  read -r -p "You asked for node $NODE but this board was node $PREV_NODE. Continue as node $NODE? [y/N] " yn
  case "$yn" in y|Y) ;; *) die "Stopped. Re-run with: $0 $PREV_NODE ..." ;; esac
fi
record() { # mode
  awk -F'\t' -v m="$MAC" '$1!=m' "$REG" > "$REG.tmp" && mv "$REG.tmp" "$REG"
  printf '%s\t%s\t%s\t%s\n' "$MAC" "$NODE" "$1" "$(date '+%Y-%m-%d %H:%M')" >> "$REG"; chmod 600 "$REG"
}

if   echo "$INFO" | grep -qi "ESP32-S3"; then CHIP=esp32s3; FW_ZIP="$S3_ZIP"; FW_ZIP_SHA="$S3_SHA"; KIND=s3
elif echo "$INFO" | grep -qi "ESP32-C6"; then CHIP=esp32c6; FW_ZIP="$C6_ZIP"; FW_ZIP_SHA="$C6_SHA"; KIND=c6
else die "Chip is neither ESP32-S3 nor ESP32-C6. Tell Claude the chip type shown above."; fi
FW_URL="https://github.com/ruvnet/RuView/releases/download/${FW_TAG}/${FW_ZIP}"
echo "Using the $KIND firmware bundle"
echo "$INFO" | grep -qiE "flash size: *(4|8|16|32)MB" || die "Flash is smaller than 4 MB or unreadable. Tell Claude the size shown above."

# ---- firmware ------------------------------------------------------------
if [ "$DO_FLASH" -eq 1 ]; then
  FW="$STATE/fw-${FW_TAG}-${KIND}"
  if [ ! -f "$FW/esp32-csi-node.bin" ]; then
    say "Downloading RuView firmware ${FW_TAG}"
    curl -fsSL -o "$STATE/$FW_ZIP" "$FW_URL"
    echo "$FW_ZIP_SHA  $STATE/$FW_ZIP" | shasum -a 256 -c - || die "Firmware checksum mismatch"
    mkdir -p "$FW"; unzip -oq "$STATE/$FW_ZIP" -d "$FW"
    ( cd "$FW" && shasum -a 256 -c SHA256SUMS.txt >/dev/null ) || die "Bundle contents failed checksum"
  fi
  say "Flashing (keeps existing settings partition)"
  ( cd "$FW" && "${ESPTOOL[@]}" --chip "$CHIP" --port "$PORT" --baud 460800 write_flash \
      0x0 bootloader.bin 0x8000 partition-table.bin 0xf000 ota_data_initial.bin 0x20000 esp32-csi-node.bin )
fi

if [ "$FLASH_ONLY" -eq 1 ]; then
  record "spare, firmware only"
  say "Firmware installed. No Wi-Fi or node settings were written (the node number $NODE is not stored)."
  echo "Tip: put a sticker on the board (e.g. \"$NODE\") so you know which spare it is."
  echo "When you deploy it, give it its node number with:  $0 $NODE --no-flash"
  exit 0
fi

# ---- provision -----------------------------------------------------------
PROV="$STATE/provision.py"
[ -f "$PROV" ] || curl -fsSL -o "$PROV" "$PROV_URL"
say "Writing Wi-Fi + mesh settings: node $NODE, TDM slot $SLOT of $TOTAL -> $SEED_IP:$UDP_PORT"
EXTRA=()
[ -n "$SEED_TOKEN" ] && EXTRA=(--seed-url "http://$SEED_IP" --seed-token "$SEED_TOKEN")
python3 "$PROV" --port "$PORT" \
  --ssid "$HOTSPOT_SSID" --password-file "$PASSFILE" \
  --target-ip "$SEED_IP" --target-port "$UDP_PORT" \
  --node-id "$NODE" --tdm-slot "$SLOT" --tdm-total "$TOTAL" \
  --edge-tier 2 --zone "node-$NODE" ${EXTRA[@]+"${EXTRA[@]}"}

record "provisioned, total $TOTAL"
say "Boot log (25 s) — look for 'connected', 'Got IP' and 'CSI streaming active'"
sleep 2; monitor
say "Node $NODE done. Unplug it, power it from any USB charger, and plug in the next board."
