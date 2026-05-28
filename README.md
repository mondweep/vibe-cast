# Cognitum.One — Get Started

Notes, bridges, and firmware artefacts from getting a Cognitum.One seed device
talking to Claude (Desktop, Cowork, and Code CLI), and ingesting WiFi CSI
feature vectors from ESP32 nodes into the seed's vector store.

By [Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty)
([GitHub](https://www.github.com/mondweep)).

> This branch is an orphan snapshot of working artefacts as of session
> `20260506-214243`. It does not share history with `main`.

## Latest status (2026-05-28)

**The CSI telemetry swarm is now fully cloud-integrated, RLS-secured, and 100% headless with zero laptop dependency.** Real-time vital metrics are parsed directly on the Raspberry Pi Seed device and streamed outbound to a Supabase Cloud PostgreSQL database, automatically updating an interactive vanilla HTML5 dashboard dynamically over secure WebSockets.

```
ESP32 Node 1 ─┐
              ├─ UDP/5006 ─▶ RPi Seed (Local Ingest) ──▶ systemd Pusher Service ──► Supabase (Cloud) ◀── Netlify App
ESP32 Node 2 ─┘                   Pi Zero 2 W                     Python standard lib       Postgres Realtime     WebSockets
```

### Key Milestones Achieved Today:
1. **Edge DB Optimization & Recovery:** Diagnosed high CPU usage (93.1%) and 9.6s API starvation on the Seed (Raspberry Pi Zero 2 W) caused by a 1.5M vector accumulation (`memopt.rvf` database). Recovered a boot-time witness-chain database corruption, executed full compaction, and re-initialized genesis—restoring local API latency to **1.9ms** and CPU load to **2.5%**.
2. **Headless Cloud Streaming:** Deployed a zero-dependency Python script (`seed_push_to_supabase.py`) on the Seed as a persistent, self-healing systemd service (**`csi-supabase-pusher.service`**). It operates 24/7 headlessly without a laptop in the path.
3. **10/10 Row Level Security (RLS):** Fully enabled RLS on the Supabase `swarm_vitals` table. Dropped all anonymous `INSERT` policies to completely block spoofing or telemetry injection from the public internet. Deployed the secret `service_role` key natively inside the physical Seed's daemon configuration to permit secure, authenticated writes.
4. **Real-time WebSockets Dashboard:** Built a highly polished, responsive, vanilla CSS/HTML dashboard (**`supabase_dashboard.html`**) utilizing Chart.js and the Supabase JS SDK. It loads historical vital lines and binds directly to PostgreSQL Realtime inserts for hands-free live updates.

👉 **Full write-ups & logs:**
* Local Telemetry Analysis: [`vitals_analysis_report.md`](file:///Users/mondweep/.gemini/antigravity-cli/brain/44fad3f7-f9bd-43c0-b2cf-c9f52e00641d/vitals_analysis_report.md)
* Headless Cloud Pusher: [`seed_push_to_supabase.py`](./seed_push_to_supabase.py)
* Interactive WebSockets UI: [`supabase_dashboard.html`](./supabase_dashboard.html)

---

## Status as of 2026-05-24

**Both ESP32 CSI nodes are streaming vitals to the Seed, with no laptop in the
data path, and the setup survives a power cycle.** The relay now runs *on the
Seed* (a Raspberry Pi) as a systemd service, ingesting to `localhost`; the
ESP32s send CSI over WiFi UDP to the Seed's **static** IP `192.168.68.133`.

👉 **2026-05-24 write-up — problems faced and how we fixed them:
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
