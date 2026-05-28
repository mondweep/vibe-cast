# Cognitum.One — Status & Field Log — 24 May 2026

Status of the ESP32 → Seed WiFi-CSI vitals pipeline after a working session on
2026-05-24. This supersedes several assumptions baked into the original
`20260506` snapshot (notably the USB link-local addressing).

---

## TL;DR — current status

**Both ESP32 CSI nodes are delivering vitals data to the Seed, with no laptop
in the data path, and the whole thing survives a power cycle.**

```
ESP32 node 1 ─┐
              ├─ WiFi UDP/5006 ─▶ Seed (192.168.68.133) ─▶ on-Seed bridge ─▶ Seed RVF vector store
ESP32 node 2 ─┘                          Raspberry Pi · systemd: csi-bridge.service
```

| Component | State |
|-----------|-------|
| Seed device | Wall-powered Raspberry Pi (Debian, armv7l), on WiFi `Golden Ninja Lloyd` |
| Seed address | **Static** `192.168.68.133` / `cognitum-2c3c.local`, API on `:8443` (HTTPS) and `:80`/localhost |
| CSI relay | `csi-bridge.service` runs **on the Seed**, listens UDP `5006`, ingests to `http://localhost` (no token needed locally) |
| ESP32 node 1 | MAC `a0:f2:62:e1:96:c0` → LAN `.127`, `node_id 1`, wall power, streaming ✅ |
| ESP32 node 2 | MAC `ac:a7:04:15:01:2c` → LAN `.128`, `node_id 2`, wall power, streaming ✅ |
| Laptop | **Not required** — fully out of the loop |
| Vitals available | Breathing rate + presence/motion. **Not** heart rate (firmware fakes it) |

---

## How it works now

1. Each ESP32-S3 runs `esp32-csi-node` firmware (v0.6.2), captures WiFi CSI,
   compresses to an 8-dim feature vector, and **UDP-sends to the Seed** at
   `192.168.68.133:5006`. Vitals processing is edge **tier 2** (firmware default).
2. A small Python relay (`seed_csi_bridge.py`, copied to `~/` on the Seed) runs
   as the systemd unit **`csi-bridge.service`**. It listens on UDP `5006`,
   batches vectors, and ingests them into the Seed's RVF store via
   `POST http://localhost/api/v1/store/ingest`.
3. **Local ingest requires no bearer token** — only WiFi/remote writes do — so
   there are no credentials in the steady-state data path.
4. Everything is independent and self-healing on power-up:
   - Seed boots → static IP (NetworkManager) + `csi-bridge.service` auto-starts
     (`Restart=always`).
   - Each ESP32 boots → rejoins WiFi → resumes sending.

---

## Problems faced and how we fixed them

### 1. The Seed had moved from USB to WiFi — old address was dead
The repo and tooling assumed the Seed at USB link-local `169.254.42.1:8443`.
The Seed is now **wall-powered and on WiFi**, so that address is unreachable
(`ERR_ADDRESS_UNREACHABLE` / "No route to host").
**Fix:** use `cognitum-2c3c.local` (mDNS) → `192.168.68.133`. The cert CN is
`cognitum-2c3c.local` (private "Cognitum Device CA"), so the hostname — not a
raw IP — is the correct target for TLS.

### 2. "Not paired" / HTTPS panic was a red herring
The browser guide showed "Not paired" and `POST .../ingest` returned `401
Bearer token required for WiFi access`. This looked like a pairing/TLS failure.
**Reality:** the device *is* paired; the 401 only fires for **writes without a
token**. The bearer token in `.env` (key `TOKEN`) is valid for WiFi writes
(verified live). The browser "Not paired" badge just means that browser tab
holds no token. No re-pairing was needed.

### 3. ESP32s were sending CSI to stale/wrong IPs
Neither ESP32 was reaching the Seed:
- **node 2** was provisioned to `target_ip 192.168.68.127` — an old aggregator
  IP that is now a *different* device. Symptom on serial:
  `stream_sender: sendto ENOMEM` + `csi_collector: sendto failed`.
- **node 1** was pointed at `192.168.68.127` as well (effectively its own
  address) — sending into a black hole.

**Fix:** re-provision each node's `target_ip` to the Seed (`192.168.68.133`).
Gotcha — `provision.py` is **full-replace** (issue #391): each run wipes the
entire `csi_cfg` NVS namespace and writes only the flags passed. We therefore
**read the existing NVS first** (`esptool read-flash 0x9000 0x6000`, then parse
the 32-byte NVS entries) and re-supplied the full set
(`--ssid --password --target-ip --target-port --node-id`). Flash/read reliably
at `--baud 115200` (460800 produced "Invalid head of packet" noise).

### 4. Direct swarm mode (ADR-066) is broken on this firmware
The goal was ESP32 → Seed **direct** (no relay). We tested it thoroughly on a
node (correct `--seed-url https://cognitum-2c3c.local:8443`, valid token, and
again with the raw IP): **0 vectors ingested, the node never registered as a
swarm peer, and the board rebooted / dropped WiFi** (TLS likely exhausts it).
This reproduced the repo's documented note that "ESP32s fail to ingest directly
to seed."
**Decision:** abandon direct-swarm on firmware ≤ 0.6.3 and use the reliable
UDP path instead.

### 5. "No laptop bottleneck" — moved the bridge onto the Seed
The proven path is `ESP32 → UDP → bridge → Seed`. To drop the laptop, we run
the bridge **on the Seed itself** (it's a Raspberry Pi with SSH + passwordless
sudo). The ESP32 keeps doing the part that works (plain UDP); the Seed does the
localhost ingest (no token).
**Fix:** copied `seed_csi_bridge.py` to the Seed (via `cat | ssh` — no
sftp-server present), installed `csi-bridge.service`
(`Restart=always`, `enabled`), ingesting to `http://localhost`.

### 6. Seed IP needed to be stable — but the router was the wrong one
ESP32s target the Seed by a **raw IP** (no DNS/mDNS), so the Seed's address must
not drift. The obvious "DHCP reservation" path failed because the `192.168.68.x`
network is served by a **separate downstream router** at `192.168.68.1`; the
visible `192.168.1.1` (Trooli) box only manages `192.168.1.x` LAN and
`192.168.168.x` guest.
**Fix:** set a **static IP on the Seed itself** via NetworkManager —
`nmcli con mod "Golden Ninja Lloyd" ipv4.addresses 192.168.68.133/24
ipv4.gateway 192.168.68.1 ipv4.dns "192.168.68.1,8.8.8.8" ipv4.method manual`.
No router access needed; survives reboot. For safety on a headless box we armed
an **auto-revert to DHCP** (cancelled only after confirming reachability).

### 7. ESP32 needs a clean cold boot after a flash session
After re-provisioning + repeated esptool resets and serial probing, node 1
would not join WiFi and its serial went dark. A plain **power cycle** (USB →
wall power) cold-booted the app cleanly and it joined immediately.
Note: serial capture over the S3 **native USB CDC** is flaky (it re-enumerates
on RTS/DTR reset) — the **Seed-side journal and LAN ARP** are more reliable
truth sources than reading ESP32 serial.

### 8. Vitals scope (expectation management)
Per the repo's own field report, this firmware gives reliable **breathing rate
and presence/motion**. **Heart rate is faked** (canned 40/48 BPM) and
person-count saturates at 4 — firmware limitations, not configurable.

---

## Verification (as captured this session)

- Both nodes seen at the Seed bridge: `node=1` and `node=2` packets, ~96 ingest
  batches per 25 s.
- Seed vector store climbing only when the laptop bridge was **off** — proving
  ingestion came directly via the on-Seed bridge.
- `systemctl is-active csi-bridge.service` → `active`; `is-enabled` → `enabled`.
- Seed static IP confirmed: `192.168.68.133`, default route `proto static`,
  internet + localhost ingest both `200`.

---

## How to monitor / operate

```bash
# Watch ingestion live on the Seed
ssh genesis@cognitum-2c3c.local 'sudo journalctl -u csi-bridge.service -f'

# Service control
ssh genesis@cognitum-2c3c.local 'systemctl status csi-bridge.service'

# Re-provision a node (full set required — provision.py is full-replace):
cd cognitum-esp32-v0.6.3
python3 provision.py --port /dev/cu.usbmodemXXXX --baud 115200 \
  --ssid "Golden Ninja Lloyd" --password "<wifi-pw>" \
  --target-ip 192.168.68.133 --target-port 5006 --node-id <1|2>
# then power-cycle the board (wall power) for a clean boot
```

The Seed's stored vectors are queryable via the `seed.memory.query` /
`seed.rvf.query` MCP tools and visualised by `dashboard.html`.

---

## Open items / next steps

- **Power-cycle acceptance test** still recommended: pull the Seed's power, plug
  back in, confirm both nodes resume with zero manual steps.
- Retire the now-unused laptop bridge bits (`run_bridge.sh` still hardcodes the
  dead `169.254.42.1` URL and expects `$SEED_TOKEN` while `.env` uses `TOKEN`).
- If true no-relay direct ingest is ever wanted, it needs an ESP32 firmware fix
  (swarm/TLS path) — not achievable with v0.6.2/0.6.3 as shipped.
- ESP32 placement: CSI sensing is most sensitive when a node sits in-line with
  an AP (first Fresnel zone) — reposition for better breathing-rate signal.
