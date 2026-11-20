# ESP32 sensing mesh on a phone hotspot — 20 November 2026

Session log for bringing three ESP32 boards and the Cognitum Seed onto a single
Galaxy phone hotspot, with the boards streaming Wi‑Fi CSI (channel state
information) to the Seed as a time‑synchronised RuView sensing mesh.

Secrets (hotspot password, Seed pairing token) are **not** in this folder. The
script asks for them at a hidden prompt and keeps them in `~/.cognitum-mesh/`
(owner‑only, mode 600) on the Mac.

## Goal

- Seed on the phone hotspot (it already knew the home network).
- Three ESP32 boards on the same hotspot, each streaming to the Seed.
- The boards coordinated as one mesh (shared clock, separate transmit slots),
  rather than three independent sensors.

## Hardware

| Node | Board | Chip | Flash | Notes |
|------|-------|------|-------|-------|
| 1 | Original board (set up 19 Nov) | ESP32‑S3 (QFN56) rev 0.2, 8 MB PSRAM | 16 MB | Was on RuView CSI firmware 0.6.2 |
| 2 | New board | ESP32‑S3 (QFN56) rev 0.2, 8 MB PSRAM | 16 MB | Blank |
| 3 | New board, TinyC6 | ESP32‑C6 (QFN40) rev 0.0 | 8 MB | Blank |
| — | Cognitum Seed | — | — | Firmware 0.24.2, device `60faaf58…` |

## Network layout

```
Galaxy phone hotspot (2.4 GHz, channel 13, private 172.18.49.0/24)
 ├── Cognitum Seed      172.18.49.239   (also USB to the Mac at 169.254.42.1)
 ├── Node 1 (S3)        172.18.49.43    TDM slot 0/3, ESP‑NOW clock leader
 ├── Node 2 (S3)        172.18.49.153   TDM slot 1/3, follows node 1's clock
 └── Node 3 (C6)        pending         TDM slot 2/3
Each node: CSI + vitals UDP → Seed:5006, swarm bridge → http://<seed>/api/v1/store/ingest
```

The Seed keeps both networks saved (home Wi‑Fi and the hotspot) and joins
whichever is available. The ESP32 firmware stores **one** network only, so the
boards must be re‑provisioned to move between home and away.

## What was done

1. **Seed onto the hotspot.** Joined via the guide's WiFi Setup
   (`http://169.254.42.1/guide`, over USB). The guide then reported:
   *Connected — hotspot (172.18.49.239)*, *Internet online via hotspot*.
2. **Firmware choice.** Standardised every board on RuView
   [`v0.8.8-esp32`](https://github.com/ruvnet/RuView/releases/tag/v0.8.8-esp32)
   (latest stable), so the boards share the same TDM/ESP‑NOW timing code.
   Every bundle is checked against the release's `SHA256SUMS.txt`, and the files
   inside each bundle against the bundle's own checksums, before flashing.
3. **Wrote `esp-mesh-setup.sh`**, run once per board with only that board on
   USB:
   - finds the single serial port, reads chip and flash size, refuses anything
     that isn't an ESP32‑S3 or ESP32‑C6;
   - downloads and verifies the matching bundle, then writes the four images
     (bootloader `0x0`, partition table `0x8000`, OTA data `0xf000`,
     app `0x20000`);
   - provisions NVS with RuView's `provision.py`: hotspot SSID, password
     from an owner‑only file, target `<seed>:5006`, `node_id=N`,
     `tdm_slot=N‑1`, `tdm_total=3`, `edge_tier=2` (vitals), `zone=node-N`,
     and the Seed URL + token for the swarm bridge;
   - resets the board and prints the important boot‑log lines for 25 s.
4. **Node 1** reflashed from 0.6.2 to 0.8.8 and provisioned. Boot log: joined
   the hotspot, got an IP, `CSI streaming active → 172.18.49.239:5006`, swarm
   bridge initialised with token, ESP‑NOW sync leader.
5. **Node 2** flashed and provisioned. Boot log as above, plus ESP‑NOW sync
   received from node 1 (197 of ~200 beacons in 20 s), now following node 1's
   clock — the first two mesh members are synchronised.
6. **Node 3** (TinyC6): the chip check stopped the S3 bundle from being
   written. Script extended to pick the C6 bundle automatically. Flashing
   pending at the time of writing.

## Problems hit and fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| Seed's MCP link to Claude reported "Seed unreachable" | Seed was powered but not on the Mac's USB data port | Plugged the Seed's data micro‑USB into the Mac |
| Script stopped: "Flash isn't 8 MB" (board has 16 MB) | Script only accepted 8 MB | Accept 4 MB and larger |
| 8 MB release bundle unsuitable | It compiles in display support; on boards with no screen the panel probe false‑positives and CSI drops to 0 pps (per RuView README) | Use the headless 4 MB‑layout bundle. NVS is at `0x9000` in both layouts, so provisioning is unaffected; the rest of the flash is simply unused |
| Script stopped: "not an ESP32‑S3" on board 3 | It's a TinyC6 (ESP32‑C6) | Auto‑select the C6 bundle by detected chip |
| Boards log `swarm: HTTP POST status 503`, Seed lists no peers, vector count and epoch unchanged | The Seed is refusing writes to `/api/v1/store/ingest`. Likely the storage write lock seen in May (witness‑chain damage); not yet confirmed | **Open.** Owner approved clearing the lock (past Seed data is experimental only). The Seed was power‑cycled mid‑investigation, which may itself have changed the state |

## Open items

- [ ] Flash and provision node 3 (ESP32‑C6); confirm it joins the ESP‑NOW sync.
- [ ] Confirm whether the Seed still returns 503 after its restart; if so, clear
      the write lock and confirm the three nodes register and data arrives.
- [ ] Confirm the Seed actually consumes the UDP stream on port 5006.
- [ ] The Seed's hotspot address can change. If it does, re‑run
      `./esp-mesh-setup.sh N --no-flash` on each board with the new IP.
- [ ] Turn off the Seed's open setup AP (`Cognitum-Setup-XXXX`, still on the
      default password) in Network Overview.
- [ ] Optional: set the boards' LED to `steady` or `off` (it is a 40 Hz flicker
      showing motion energy: purple still → green → yellow moving).
- [ ] Optional: provision an OTA key (`--ota-psk-file`) so firmware can be
      updated over Wi‑Fi; NVS was rewritten without one, so OTA is fail‑closed.

## Using the script

```bash
./esp-mesh-setup.sh 1            # node 1: flash + provision
./esp-mesh-setup.sh 2
./esp-mesh-setup.sh 3
./esp-mesh-setup.sh 2 --no-flash # change Wi-Fi / Seed IP only
./esp-mesh-setup.sh 2 --monitor  # just show the boot log
```

Plug in **one** board at a time and use a different node number for each.
If a board won't respond: hold BOOT, tap RESET, release BOOT, run again.

## Caveats

- The 4 MB‑layout bundles are documented for 4 MB boards; running them on
  8 / 16 MB flash is technically sound (same NVS/app offsets) but not an
  officially listed combination.
- RuView treats the ESP32‑C6 as a research target. Mixed S3 + C6 TDM meshes are
  not explicitly covered in the 0.8.8 release notes.
- The swarm bridge sends the Seed bearer token over plain HTTP on the hotspot.
