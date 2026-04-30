# esb32-tinker / RuView

Notes and artefacts from a one-evening session bringing up an ESP32-S3 board as a [RuView](https://github.com/ruvnet/RuView) WiFi-CSI sensing node, end-to-end:
chip identification → flashing → Wi-Fi provisioning → Rust host pipeline → live presence and vital-sign data on a local dashboard.

This branch is **orphan** (no shared history with `main`); it carries only the writeup, not the upstream code.

## Files

| File | What |
|---|---|
| `PROGRESS_LOG.md` | Step-by-step log: hardware spec, deployment, the six bugs we hit and their root causes, diagnostic commands, observed wire format, final state. **Read this for the full story.** |
| `README.md` | This file. |
| `.gitignore` | Excludes parent-side build artefacts and empty scaffolding dirs. |
| `RuView/` | Git submodule pinned to upstream commit `9a078e4` (firmware `v0.4.3.1-esp32-3`). Run `git submodule update --init --recursive` after cloning, or pass `--recurse-submodules` to `git clone`. |

## What got built

- **Device**: ESP32-S3 (16 MB flash, 8 MB PSRAM, dual-core LX7 @ 240 MHz, native USB-Serial/JTAG)
- **Firmware on device**: RuView prebuilt `esp32-csi-node` v0.4.3.1, configured at `edge_tier=0` (raw CSI passthrough). Streams ~10 Hz CSI frames over UDP.
- **Host on Mac**: RuView's Rust `wifi-densepose-sensing-server` (Axum + RuVector) — receives UDP, decodes CSI, derives presence / motion / breathing rate / heart rate, exposes JSON API + WebSocket + browser dashboard.

## Reproducing

The full procedure is in `PROGRESS_LOG.md` §3. Short version:

1. Clone this repo with the submodule:
   ```
   git clone --recurse-submodules -b esb32-tinker-ruview https://github.com/mondweep/vibe-cast esb32-tinker-ruview
   cd esb32-tinker-ruview
   ```
   (`RuView/` will be checked out at the same upstream commit we used: `9a078e4`.)
2. Flash the prebuilt firmware (`firmware/esp32-csi-node/release_bins/`) at offsets `0x0`, `0x8000`, `0xf000`, `0x20000`.
3. Provision Wi-Fi + your Mac's LAN IP via `firmware/esp32-csi-node/provision.py --edge-tier 0`.
4. Build and run the Rust server: `cargo run -p wifi-densepose-sensing-server --release -- --source esp32 --ui-path <abs path to RuView/ui>`.
5. Open `http://localhost:3000/ui/index.html`.

## Known gotchas (compressed)

- ESP32-S3 USB-Serial/JTAG interprets host DTR/RTS as IO0 / EN strap pins — pyserial's default toggling can silently strand the chip in download mode. Open the port without manipulating control lines.
- Default `EDGE_TIER=2` does on-device DSP and only emits vitals on motion. For continuous raw CSI streaming, re-provision with `--edge-tier 0`.
- macOS Application Firewall silently drops inbound UDP for unsigned binaries; the server needs an explicit `socketfilterfw --unblockapp` rule.
- The firmware target IP is baked into NVS — set up DHCP reservation for the Mac's MAC, or be prepared to re-provision after every IP change.

## Status

Pipeline is live; dashboard renders real `presence: true` / `motion_level: "active"` from CSI. See `PROGRESS_LOG.md` §8 for the full final state.
