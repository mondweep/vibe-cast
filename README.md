# Cognitum.One — Get Started

Notes, bridges, and firmware artefacts from getting a Cognitum.One seed device
talking to Claude (Desktop, Cowork, and Code CLI), and ingesting WiFi CSI
feature vectors from ESP32 nodes into the seed's vector store.

By [Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty)
([GitHub](https://www.github.com/mondweep)).

> This branch is an orphan snapshot of working artefacts as of session
> `20260506-214243`. It does not share history with `main`.

## Latest status (2026-05-24)

**Both ESP32 CSI nodes are streaming vitals to the Seed, with no laptop in the
data path, and the setup survives a power cycle.** The relay now runs *on the
Seed* (a Raspberry Pi) as a systemd service, ingesting to `localhost`; the
ESP32s send CSI over WiFi UDP to the Seed's **static** IP `192.168.68.133`.

```
ESP32 node 1 ─┐
              ├─ WiFi UDP/5006 ─▶ Seed (192.168.68.133) ─▶ on-Seed bridge ─▶ Seed vector store
ESP32 node 2 ─┘                          Raspberry Pi · systemd: csi-bridge.service
```

A few things changed since the `20260506` snapshot below: the Seed moved from
USB link-local (`169.254.42.1`) to WiFi (`cognitum-2c3c.local` / `.133`), direct
ESP32→Seed "swarm" mode proved broken on this firmware, and the laptop bridge
was replaced by an on-Seed service. Vitals available: **breathing rate +
presence/motion** (heart rate is faked by the firmware).

👉 **Full write-up — problems faced and how we fixed them:
[`24-May-26-Status.md`](./24-May-26-Status.md).**

## What's in this repo

| Path | What it is |
|------|------------|
| [`24-May-26-Status.md`](./24-May-26-Status.md) | **Current status & field log (2026-05-24):** the working ESP32→Seed vitals pipeline, the problems hit, and how each was fixed. Read this for the latest state. |
| [`MCP_SETUP_NOTES.md`](./MCP_SETUP_NOTES.md) | Long-form write-up of getting the seed's MCP server visible inside Claude clients, including four upstream bugs ready to file as GitHub issues. Start here. |
| [`MCP_SETUP_NOTES.pdf`](./MCP_SETUP_NOTES.pdf) | Same content, PDF rendering. |
| [`cognitum-bridge.mjs`](./cognitum-bridge.mjs) | ~160-line Node.js stdio↔HTTP shim that lets current MCP clients talk to the seed's `2025-11-25` MCP server. Strips non-standard schema fields (`tasks` capability, per-tool `execution`, non-standard annotations) that Zod validators reject silently. |
| [`cognitum-esp32-v0.6.3/`](./cognitum-esp32-v0.6.3) | ESP32-S3 firmware binaries (v0.6.3) plus the host-side CSI → seed RVF ingest bridge (`seed_csi_bridge.py`) and helper scripts. |
| [`wifi-csi-sensing-paper-public.md`](./wifi-csi-sensing-paper-public.md) / [`.pdf`](./wifi-csi-sensing-paper-public.pdf) | Reference paper on WiFi CSI sensing, used as background for the ESP32 ingest pipeline. (The non-`-public` originals contain author-specific network details and are gitignored.) |

## Quick start: connect the seed to Claude Code

Pair the seed, copy the bearer token, then register the bridge at user scope:

```bash
export COGNITUM_TOKEN='<your-bearer-token>'        # from pairing
export COGNITUM_SEED_URL='http://169.254.42.1/mcp' # default; over USB Ethernet

claude mcp add cognitum-seed -s user -- \
  node /absolute/path/to/cognitum-bridge.mjs
```

Verify with `claude mcp list` — you should see `cognitum-seed ✓ connected`.
Inside any Claude Code session you'll get ~40 `seed.*` tools across 12 groups
(`seed.device.*`, `seed.memory.*`, `seed.witness.*`, `seed.rvf.*`, etc.).

Set `COGNITUM_DEBUG=1` to log every JSON-RPC line to stderr and to
`/tmp/cognitum-bridge.log`.

## Why the bridge exists

Short version: the seed runs MCP protocol revision `2025-11-25`, which is
ahead of what shipping Claude clients support. The MCP SDK's Zod schemas
silently reject the seed's `initialize` and `tools/list` responses on fields
like `capabilities.tasks`, `tool.execution`, and the seed's custom tool
annotations (`authClass`, `scope`, `group`, `relatedTools`). Connection
appears to succeed but no tools are exposed.

The bridge does the minimum: forward stdio↔HTTP, inject the bearer token,
track `Mcp-Session-Id`, and strip the offending fields in `sanitizePayload()`
before they reach the client.

For the full diagnosis, things that didn't work, and the four bugs filed
against the seed firmware, see [`MCP_SETUP_NOTES.md`](./MCP_SETUP_NOTES.md).

## ESP32 CSI → seed RVF bridge (ADR-069)

The `cognitum-esp32-v0.6.3/` directory ships:

- **Firmware binaries** for ESP32-S3 (8MB and 4MB variants), bootloader,
  partition tables, and `ota_data_initial.bin`. SHA-256 sums in
  [`sha256sums.txt`](./cognitum-esp32-v0.6.3/sha256sums.txt).
- **`seed_csi_bridge.py`** — listens for CSI feature vectors over UDP,
  batches them, and ingests into the seed's RVF vector store via HTTPS REST.
  Accepts ADR-069 feature packets (magic `0xC5110003`) and legacy ADR-018
  raw CSI frames (`0xC5110001` / `0xC5110002`).
- **`run_bridge.sh` / `stop_bridge.sh`** — start/stop the bridge with
  verbose logging to `bridge.log`.
- **`provision.py`, `udp_listener.py`** — provisioning and packet inspection
  helpers.

Run it:

```bash
export SEED_TOKEN='<your-bearer-token>'
cd cognitum-esp32-v0.6.3
./run_bridge.sh
```

The script frees UDP/5006 if anything else is listening, then runs the
Python bridge with `--seed-url https://169.254.42.1:8443 --batch-size 5
--flush-interval 5 --verbose`, tee'd to `bridge.log`.

## Environment

- macOS (Darwin 24.x), Apple Silicon
- Node.js (any version with `fetch` — i.e. ≥18)
- Python 3
- Claude Code CLI 2.1.131 (or later); Claude Desktop optional
- A Cognitum.One USB seed exposing MCP at `http://169.254.42.1/mcp`
  (link-local USB Ethernet)

## License & status

This is a working snapshot, not a maintained project. The bridges are
expected to become unnecessary once Claude's MCP SDK catches up to protocol
revision `2025-11-25`.
