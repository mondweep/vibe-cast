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
