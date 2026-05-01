# ESP32-S3 RuView Deployment — Progress Log

**Date:** 2026-04-30
**Goal:** Identify the connected ESP32 board, then deploy [RuView](https://github.com/ruvnet/RuView) (WiFi sensing platform that uses Channel State Information for presence detection, vital signs, etc.) and validate live data flow end-to-end.

---

## 1. Hardware identified

Connected board: **ESP32-S3** (QFN56, revision v0.2)

| Property | Value |
|---|---|
| CPU | Dual-core Xtensa LX7 @ 240 MHz + low-power RISC-V core |
| Wireless | Wi-Fi 2.4 GHz, Bluetooth 5 LE |
| Flash | 16 MB (SPI quad, 3.3 V) |
| PSRAM | 8 MB embedded |
| Crystal | 40 MHz |
| USB | Native USB-Serial/JTAG (no external bridge IC) |
| MAC | `ac:a7:04:XX:XX:XX` (Espressif OUI; per-chip suffix redacted) |
| Vendor ID / Product ID | `0x303a` / `0x4001` (running) — `0x303a / 0x0002` style ROM in download mode |

USB enumerates as two distinct ports depending on chip state:

- `/dev/cu.usbmodem1234561` — **application firmware** running (Espressif Systems descriptor)
- `/dev/cu.usbmodem2101` — **ROM bootloader** (Espressif descriptor) — used by `esptool` for flashing

These are the same physical cable; the chip presents different USB descriptors after a reset depending on whether it boots into firmware or download mode.

---

## 2. Concepts established

- **CPU "core"** — independent execution unit with its own program counter, registers, ALU. Dual-core means two real parallel execution streams.
- **MAC** — Media Access Control address; 48-bit globally unique hardware ID. First 3 bytes identify the manufacturer (`ac:a7:04` = Espressif), last 3 are unique per chip. Used at OSI layer 2 for switch/AP delivery decisions.
- **CSI** — Channel State Information; per-subcarrier amplitude + phase measurements that most Wi-Fi chips throw away after decoding. ESP32-S3 exposes it via `esp_wifi_set_csi_rx_cb`. ~100× richer than RSSI; the entire RuView pipeline is built on it.

---

## 3. Deployment steps (what worked)

1. Installed `esptool` via `pip3 install --user esptool` → confirmed chip type and 16 MB flash.
2. Cloned RuView (`git clone --depth 1 https://github.com/ruvnet/RuView`) into `./RuView/`.
3. Inspected `firmware/esp32-csi-node/release_bins/` — used the 8 MB-target prebuilt set (fits comfortably in 16 MB flash).
4. Read `partitions_display.csv` to confirm OTA layout offsets.
5. Flashed via `esptool write-flash` at 460 800 baud:
   - `0x00000` `bootloader.bin` (18.9 KB)
   - `0x08000` `partition-table.bin` (3 KB)
   - `0x0F000` `ota_data_initial.bin` (8 KB)
   - `0x20000` `esp32-csi-node.bin` (990 KB) — slot `ota_0`

   Total ≈ 1 MB across 4 regions, ~7 s.
6. Installed `esp-idf-nvs-partition-gen` for the provisioning step.
7. Provisioned Wi-Fi via `firmware/esp32-csi-node/provision.py`:
   ```
   --ssid "<your-2.4GHz-ssid>" --password ******** --target-ip <your-mac-lan-ip>
   ```
   This writes NVS at `0x9000` (24 KB).
8. Re-provisioned with `--edge-tier 0` once we discovered the default tier suppressed raw CSI streaming (see §4).
9. Built the Rust host pipeline: `cargo build -p wifi-densepose-sensing-server --release` from `RuView/v2/` (Rust 1.89, ~5 min).
10. Ran with `--source esp32 --ui-path <abs path to RuView/ui>` so it doesn't auto-fall-back to simulation and can find the static UI assets.
11. Verified live data via the HTTP API (`/api/v1/sensing/latest`, `/api/v1/vital-signs`) — `source: "esp32"`, `presence: true`, `tick` advancing.

Final endpoints:

| Service | URL |
|---|---|
| Dashboard UI | http://localhost:3000/ui/index.html |
| Sensing JSON | http://localhost:3000/api/v1/sensing/latest |
| Vitals JSON | http://localhost:3000/api/v1/vital-signs |
| WebSocket | ws://localhost:8765/ws/sensing |
| ESP32 OTA / WASM | http://192.168.68.131:8032/ota/status |
| ESP32 → Mac CSI | UDP `192.168.68.131:* → 192.168.68.127:5005` |

---

## 4. Issues and root causes

The path from "everything looks fine" to "data actually flowing" hit five separate blockers stacked on top of each other. Documenting them because each is non-obvious and likely to bite next time.

### 4.1 USB-Serial/JTAG `read-flash` is unreliable

Attempted backup of original 16 MB flash failed after a few KB at both 921 600 and 460 800 baud with "serial data stream stopped". Known flakiness of the ESP32-S3's built-in USB-Serial/JTAG peripheral with long reads. Skipped backup; the prebuilt RuView image only writes the lower 6 MB so the upper region is undisturbed regardless.

### 4.2 DTR/RTS toggling kept rebooting the chip into download mode

ESP32-S3's USB-Serial/JTAG peripheral interprets host DTR/RTS as IO0 / EN strap signals. The combination `DTR=False, RTS=True` is exactly the "enter download mode" sequence. Pyserial's default behavior of toggling these on port open kept silently flipping the chip back into bootloader.

**Fix:** open the port without manipulating DTR/RTS (defaults to both asserted = "normal boot, no reset"), and when a clean reset is needed, ask the user for a physical USB unplug/replug.

### 4.3 Firmware default `edge_tier=2` produces no raw CSI stream

Kconfig `EDGE_TIER` defaults to **2** (full DSP pipeline). At Tier 2 the firmware computes vitals on-device and only emits a vitals packet (`magic 0xC511_0002`) when motion/presence is detected — no continuous raw CSI stream. With no person actively moving, the chip captured CSI but emitted nothing.

**Fix:** re-provision with `--edge-tier 0` (raw passthrough). Now streams `magic 0xC511_0001` packets at ~10 Hz unconditionally.

### 4.4 macOS Application Firewall blocked the unsigned Rust binary

The first-time launch silently dropped inbound UDP because `sensing-server` is an unsigned Mach-O outside `/Applications`. Tested two layers:

1. Added explicit allow rule via `socketfilterfw --add` + `--unblockapp`. Necessary but not sufficient on its own in this case — confirmed via tcpdump that packets *do* reach `en0` once allowed.
2. Temporarily disabled the firewall entirely (`--setglobalstate off`) for definitive isolation of the next bug.

The right long-term posture is firewall ON with the explicit allow rule already in place.

### 4.5 Stale zombie sensing-server processes held the UDP socket

When earlier `sensing-server` instances were terminated by `pkill`, several entered uninterruptible-exit (`UE`) state and continued holding `UDP *:5005`. New instances bound but were never the recipient of the packets — kernel was still delivering to the zombies' socket. `lsof` showed only the new PID, masking the issue.

**Fix:** explicit `kill -9 <PID>` of every visible PID before restarting; verified via `netstat -an -p udp | grep 5005` that exactly one binding exists.

### 4.6 `head -3` in pipeline killed the server with SIGPIPE

A debugging shorthand `./sensing-server | head -3` looked harmless but EOF'd the pipe after 3 lines. Next write to stdout faulted the process into a half-dead state where it kept the UDP socket bound but never read from it.

**Fix:** redirect output to a real file (`> /tmp/sensing-server.log 2>&1 &`) — never pipe a long-running daemon's stdout through `head` or any line-limited filter.

---

## 5. Diagnostic toolkit (commands worth keeping)

```sh
# Identify the chip (in download mode)
python3 -m esptool --port /dev/cu.usbmodem2101 chip-id

# Check flash size
python3 -m esptool --port /dev/cu.usbmodem2101 flash-id

# Read serial WITHOUT toggling control lines (preserves firmware boot state)
python3 -c "import serial,time,sys; s=serial.Serial('/dev/cu.usbmodem2101',115200,timeout=0.5,rtscts=False,dsrdtr=False); end=time.time()+15
while time.time()<end:
    c=s.read(4096)
    if c: sys.stdout.buffer.write(c); sys.stdout.flush()
s.close()"

# Confirm chip is on the LAN (use your chip's MAC — esptool prints it)
arp -an | grep -i ac:a7:4
ping -c 3 192.168.68.131

# Confirm firmware is running (HTTP, not just ICMP)
curl -s http://192.168.68.131:8032/ota/status

# Live UDP arrival count delta (no socket → packets to wrong port; full buffers → app not draining)
netstat -s -p udp | egrep "datagrams received|no socket|full socket"

# Capture actual packets on the wire (root needed)
sudo tcpdump -i en0 -nn 'host 192.168.68.131'

# Inspect raw CSI packet bytes (kill server first, then bind a Python listener on 5005)
python3 -c "import socket
s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.bind(('0.0.0.0',5005)); s.settimeout(5)
d,a=s.recvfrom(8192); print(a, len(d), 'magic=0x'+d[:4].hex())"

# macOS Application Firewall state
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
/usr/libexec/ApplicationFirewall/socketfilterfw --listapps | grep sensing
```

---

## 6. CSI packet wire format observed

Live packet on UDP 5005, 148 bytes, from `192.168.68.131:63233`:

```
hex (first 32):  01 00 11 c5 01 01 40 00 94 09 00 00 46 39 00 00
                 b4 a0 00 00 00 00 00 00 00 00 00 00 00 00 00 00
                 ↑           ↑  ↑  ↑     ↑           ↑
                 magic LE    nid ant nsub freq (lo)   sequence
                 0xC5110001  =1  =1  =64  =0x0994     =0x3946
```

Header is 20 bytes; remaining 128 bytes = 1 antenna × 64 subcarriers × 2 bytes (signed I, signed Q). Matches `parse_esp32_frame` in `wifi-densepose-sensing-server/src/main.rs:804`.

---

## 7. Operational notes

- **Wi-Fi credentials are persistent** in NVS — survive reboot. Re-provisioning replaces the entire `csi_cfg` namespace, so always pass SSID + password + target-ip together.
- **Target IP is hardcoded to the Mac's current LAN address.** If the Mac's DHCP lease changes, CSI silently goes nowhere. A DHCP reservation for the Mac's MAC on the router is the durable fix; otherwise re-provision after any IP change (requires bringing the board back to USB).
- **Firmware survives unplug → wall-USB.** The ESP32 has no host-side dependency. Moving it to a wall adapter actually improves spatial sensing because the chip is no longer co-located with the receiver.
- **OTA endpoint exists at `:8032/ota`** for re-flashing without USB. Has not been exercised yet.
- **Edge tier change requires NVS re-write**, not a re-flash. Provisioning script with `--edge-tier N` is the only step needed.
- **Restoring stock firmware**: backup of original was skipped; if needed, Espressif's stock test firmware can be re-downloaded.

---

## 8. Final state

| Component | State |
|---|---|
| ESP32 firmware | RuView `v0.4.3.1-esp32-3-g66e2fa083-dir`, edge_tier=0 |
| ESP32 IP | `192.168.68.131` (DHCP, not reserved) |
| CSI capture rate | ~10 Hz, 64 subcarriers, 1 antenna, RSSI ~ -75 to -83 dBm, channel 9 |
| Sensing server | Rust release build, running with `--source esp32` |
| Dashboard | http://localhost:3000/ui/index.html — live data |
| `/api/v1/sensing/latest` | `source: "esp32"`, `presence: true`, `motion_level: "active"`, tick advancing |
| Firewall | Currently OFF for diagnosis; allow-rule for `sensing-server` is still installed |
| Backup of stock firmware | Not captured (USB-Serial/JTAG read-flash unreliable) |

---

## 9. Open items / next steps

- Re-enable firewall: `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on` (allow rule for `sensing-server` already in place from earlier `--unblockapp`).
- DHCP-reserve the Mac's IP on the router so the firmware's hardcoded target-ip stays valid across reboots / lease renewals.
- Consider relocating the ESP32 (wall adapter, across the room) to get more useful CSI multipath geometry. Currently it sits adjacent to the laptop, which provides the worst possible sensing baseline.
- Future: explore writing a custom WASM module (Rust → wasm32) and uploading via `:8032/wasm/upload` for on-device sensing logic — fits the user's preference for Rust on the device side.
- Future: a second ESP32-S3 node would unlock multistatic features (pose estimation, through-wall sensing per RuView's docs).

---

## 10. Session: 2026-05-01 — v0.6.3 upgrade + edge_tier sweep + UI bug hunt

Picked up from §8 final state. Mentor pointed at two upstream releases:
- [`ruvllm-esp32 v0.3.0-rc2`](https://github.com/ruvnet/RuVector/releases/tag/ruvllm-esp32-v0.3.0-rc2) — tiny on-device agents (vector search, RAG, anomaly, MicroLoRA). **Different firmware**, would replace RuView. Not flashed; deferred until a multi-chip cluster is on the bench.
- [`RuView v0.6.3-esp32`](https://github.com/ruvnet/RuView/releases/tag/v0.6.3-esp32) — direct upgrade for the SPI cache crash + defensive copies. **Targeted this one.**

### 10.1 OTA attempt → rollback (the safety net works)

OTA endpoint at `:8032/ota` accepts firmware uploads (POST, `application/octet-stream`, max 900 KB).

Procedure:
1. `GET /ota/status` confirmed v0.4.3.1 on `ota_0`, next slot `ota_1`.
2. POST'd `esp32-csi-node.bin` (865,776 B). Curl saw connection-reset-by-peer — that's the signature of `esp_restart()` killing the TCP socket mid-flush of the OK response.
3. Waited for reboot. New `/ota/status` came back **still** reporting v0.4.3.1 on ota_0.

**Diagnosis**: ESP-IDF bootloader rolled back. The new app booted into `ota_1`, didn't mark itself valid (the firmware doesn't call `esp_ota_mark_app_valid_cancel_rollback()` on a health-check), bootloader counted failed boots and reverted. **No harm done — board kept streaming on the known-good slot.**

### 10.2 Surprise from inspecting the v0.6.3 release asset

Dumped the `esp_app_desc_t` directly from `esp32-csi-node.bin` at offset `0x20`:
```
version:    0.6.2          ← release tagged v0.6.3 ships a 0.6.2 binary
project:    esp32-csi-node
date:       Apr 28 2026 08:31:43
idf_ver:    -128-NOTFOUND  ← CI git context missing during build
```

Two flags worth raising upstream: tag/binary version mismatch, and the `-128-NOTFOUND` idf_ver suggests the build environment was incomplete. Validation in the release notes was on a different MAC (`3c:0f:02:e9:b5:f8` vs ours `ac:a7:04:15:01:2c`).

### 10.3 Full USB flash succeeds where OTA failed

OTA only swaps the app partition. The new app needed v0.6.3's new bootloader + partition table. Full flash via `python3 -m esptool` at offsets `0x0` / `0x8000` / `0xf000` / `0x20000` (8 MB layout — same as before). Took 5.7s @ 1208 kbit/s, all four regions hash-verified. After hard reset, `/ota/status` correctly reported `0.6.2`, `running_partition: ota_0`. NVS preserved (Wi-Fi, target IP, node_id, edge_tier all survived).

### 10.4 v0.6.3's MGMT-only filter starves CSI in low-traffic environments

The release notes' headline fix is `WIFI_PROMIS_FILTER_MASK_MGMT` — narrowing CSI capture from "all frames" (100–500 Hz with DATA included) to just management frames (~10 Hz beacons). Combined with `CSI_MIN_PROCESS_INTERVAL_US` (50 Hz callback-rate gate) this prevents the SPI cache crash on busy APs.

**Side-effect on this LAN**: capture rate dropped to roughly **1 frame per 30+ seconds** in some rooms. Server's `last_seen_ms` climbed past 25 minutes between packets. The pipeline never had enough samples to compute coherent vitals.

### 10.5 Edge-tier sweep

Re-provisioned NVS multiple times via `provision.py` (NVS partition write at `0x9000`, full-replace semantics — must pass entire WiFi trio every time):

| Config | Result |
|---|---|
| `edge_tier=1` + `filter-mac d8:07:b6:5f:45:c2` (AP BSSID) | 1 packet captured at boot, then **silent**. The narrow filter is too restrictive for our environment. |
| `edge_tier=1` no filter-mac | Better — periodic packets — but capture stayed sparse with capture-RSSI ~ -86 dBm. |
| `edge_tier=0` no filter-mac (raw passthrough) | **Continuous live data flowing.** No on-device gating; every captured frame fired to UDP. Server tick advancing, variance & motion-band updating in real time. |
| `edge_tier=1` no filter-mac, `vital_int=200`, `vital_win=300`, `pres_thresh=5` | **Best** — vitals packets every 200 ms, RSSI surfaced live in `/api/v1/edge-vitals`, breathing & heart-rate FFTs running on-device. |

### 10.6 The "n_persons: 4" coincidence

Edge-vitals packets always reported `n_persons: 4`, exactly matching the room. **Coincidence**. From `firmware/esp32-csi-node/main/edge_processing.c:481`:

```c
uint8_t n_persons = s_top_k_count / 2;   // 32 / 2 = 16
if (n_persons > EDGE_MAX_PERSONS) n_persons = EDGE_MAX_PERSONS;  // clamp to 4
```

`n_persons` is just the firmware's pre-allocated person-slot count, clamped to `EDGE_MAX_PERSONS` (=4). It will report 4 whether the room has 1 person or 12. **Not a real headcount.** The system has no per-individual identification.

### 10.7 UI bugs found and patched (in `RuView/` submodule — local only)

The dashboard at `localhost:3000` masked diagnosis on three separate occasions. Fixes applied to the local working tree but **not committed upstream** — submodule pinned to `9a078e4`.

#### a) `RuView/ui/components/SensingTab.js:251`
```diff
- this._setText('sensingRssi', `${(f.mean_rssi || -80).toFixed(1)} dBm`);
+ this._setText('sensingRssi', f.mean_rssi ? `${f.mean_rssi.toFixed(1)} dBm` : '— dBm');
```
The `||` operator falls through on `0` (which is what the server sends when no RSSI is aggregated, e.g. at edge_tier=0). Original code rendered the **constant -80** as if it were a measurement. Fooled diagnosis for ~30 minutes during the room-relocation experiment. Same bug appears in line 362 for per-node RSSI; same fix.

#### b) `RuView/ui/services/sensing.service.js:_handleData`
At edge_tier=1 the websocket emits two message types: `sensing_update` (bulk, but `mean_rssi=0`) and `edge_vitals` (small, but with real `rssi`). Patched to cache the latest `edge_vitals.rssi` and inject it into `features.mean_rssi` of subsequent `sensing_update` messages, so the dashboard's existing reader gets a real value:

```js
if (data.type === 'edge_vitals' && typeof data.rssi === 'number') {
  this._latestEdgeRssi = data.rssi;
}
if (data.type === 'sensing_update' && this._latestEdgeRssi != null) {
  if (!data.features) data.features = {};
  if (!data.features.mean_rssi) data.features.mean_rssi = this._latestEdgeRssi;
}
```

#### c) `RuView/ui/observatory/js/main.js:484`
The observatory page's `_ws.onclose` was silently overwriting `settings.dataSource = 'demo'` whenever the WebSocket cycled — quietly hijacking the user's "Live WebSocket" choice and reverting to demo data. Patched to leave the user's choice alone:

```diff
- this.settings.dataSource = 'demo';
- this._hud.updateSourceBadge('demo', null);
+ // Keep settings.dataSource as-is — don't silently override the user's choice.
+ this._hud.updateSourceBadge(this.settings.dataSource, null);
```

#### d) `RuView/ui/observatory/js/main.js:483`
Same file: `onmessage` was stuffing **both** `sensing_update` and `edge_vitals` messages into `_liveData`, so the visualizer received malformed objects when an `edge_vitals` arrived (no `nodes`, no `features`). Filtered to only accept `sensing_update`:

```js
if (msg && msg.type === 'sensing_update') this._liveData = msg;
```

Worth contributing these upstream as a small PR; preserved here as patches against pinned commit `9a078e4`.

### 10.8 Stale-cache trap from `/api/v1/edge-vitals`

When the device went silent for 25+ minutes, the server kept returning the **last** edge-vitals packet ever received as if fresh. The dashboard had no way to tell. Workaround: restarted `sensing-server` (`kill 67224; nohup ./target/release/sensing-server …`) which purged in-memory state. Worth a small server-side fix to expose `last_seen_ms` and let the UI render "STALE" when it exceeds a threshold.

### 10.9 60-second live capture (see `detection.md` for raw data)

After settling on `edge_tier=1, vital_int=200, no filter-mac` and ensuring the device was in a room reachable by the AP:

| Metric | Value |
|---|---|
| Unique device packets in 60s | **60 / 60** (one fresh per second) |
| RSSI | -83 to -58 dBm (mean -80.85, stdev 4.23) |
| Presence | True for **60/60** samples |
| Motion | True for **60/60** samples; energy 2.3 → 34.4 (mean 7.94) |
| Falls | 0 |
| Breathing rate | 6.7 – 30.5 bpm, mean **17.07 bpm**, stdev 8.05 |
| Heart rate | 43.0 – 51.4 bpm, mean **46.37 bpm**, stdev 2.09 |

**Interpretation:**
- **Presence + motion**: solid. The system genuinely sees humans.
- **Breathing rate**: mean is biologically plausible (12–20 bpm normal range). Per-sample variance is too high for clinical use — with multiple people moving, the FFT picks the strongest peak in the breathing band each window, which can be a different person's breathing each second. Single-occupant monitoring would be much cleaner.
- **Heart rate**: ~46 bpm mean is implausibly low for awake adults. Most likely the FFT is locking on a sub-harmonic of breathing or multipath wobble in the cardiac band — the actual ~1 mm chest-wall vibration from a heartbeat is too small to extract through 4 moving bodies at -80 dBm capture signal.
- **`n_persons`**: ignore; firmware constant.

### 10.10 Final state (this session)

| Component | State |
|---|---|
| ESP32 firmware | RuView **v0.6.3** (binary embedded version `0.6.2`), `running_partition: ota_0` |
| NVS provisioning | `edge_tier=1`, `vital_int=200`, `vital_win=300`, `pres_thresh=5`, no `filter_mac`, target_ip `192.168.68.127`, node_id 1 |
| ESP32 IP | `192.168.68.131` (DHCP) |
| Capture RSSI | -78 to -83 dBm typical, occasional -58 dBm bursts |
| Sensing server | Restarted PID 2217, fresh state |
| Dashboard | `localhost:3000/ui/index.html` — live, "— dBm" patch applied |
| Observatory | `localhost:3000/ui/observatory.html` — live-WebSocket fix applied, badge correctly shows LIVE |
| Detection capture | `detection.md` — 60s, 60/60 unique device packets |

### 10.11 Open items added by this session

- Submit upstream PR for the four UI patches (cache them locally as `.patch` files against commit `9a078e4`).
- Server-side: surface `last_seen_ms` in `/api/v1/edge-vitals` and have the dashboard render "STALE" when stale, instead of frozen-cache replay.
- Heart-rate detection at this signal strength is not viable. Either (a) move ESP much closer to AP and isolate one still subject, or (b) a second multistatic node would help disambiguate.
- The v0.6.3 release packaging quirks (binary version `0.6.2`, `idf_ver=-128-NOTFOUND`) are worth filing upstream.
