# cognitum-agent (fw 0.22.7) main thread pegs ~95–98% CPU and starves the HTTP API — persists across reboot, independent of cogs / mesh / bridge

## Summary
On firmware **0.22.7** (confirmed latest by support), the `cognitum-agent`
process's **single main thread saturates one CPU core (~95–98%)**, which
starves the HTTP listener. The API on `:80` and `:8443` then returns
`503 {"error":"busy"}` or times out (`000`), serving only intermittently.

The device was fully responsive at the start of a working session and degraded
over it. The pegged state now **rebuilds within ~1 minute of every (re)start and
survives a full OS reboot**, so it is state-driven, not a transient.

## Device
- **Device ID:** (redacted — available to support on request)
- **Hardware:** Raspberry Pi, `Linux 6.12.47+rpt-rpi-v7 armv7l` (Raspbian), **~473 MB RAM**
- **Firmware:** `0.22.7` (latest)
- **Store:** ~34 MB on disk, ≈167k vectors, witness chain ≈290k entries
- **Binary:** `/opt/cognitum/cognitum-agent`, env `BIND_PORT=8443`, `RVF_STORE=/var/lib/cognitum/rvf-store`

## Impact
While the main thread is pegged, the HTTP API is effectively unusable:
- Local cogs (health-monitor, ruview-densepose, neural-trader) can't fetch the sensor stream.
- ESP32 CSI ingest (`POST /api/v1/store/ingest`) fails with `503`/timeout.
- MCP proxy and `/api/v1/*` are intermittent.

## What we ruled out (isolation)
The peg is **independent** of every external subsystem — each was disabled in turn with **no change** to agent CPU:
| Action | Result |
|---|---|
| Mesh overlay disabled (`mesh-config.json` `enabled:false`) + restart | agent still ~90–98% |
| All 3 cogs stopped | agent still ~92–97% |
| CSI bridge / all UDP ingestion stopped | agent still ~97% |
| **Full OS reboot** | healthy ~30–60 s (CPU ~54%, API `200`), then **re-pegs to ~90%+** |

`ps -T -p <agent_pid>` shows **a single thread** (TID == PID) at ~95.7% — i.e.
the agent appears single-threaded (or its async runtime is single-threaded), so a
CPU-bound loop blocks the HTTP handler on the same thread.

## Suspected hot loops (from on-disk config)
These run continuously regardless of cogs/mesh/bridge:
- **Sensor reflex pipeline** (`/var/lib/cognitum/sensor-config.json`):
  `reflex_hz: 10`, `hd_hash_bits: 1024`, `anti_spoofing.enabled: true`, drift
  detection firing every few seconds (`[sensor] drift detected: N events`).
- **Cognitive loop** (`/var/lib/cognitum/cognitive-config.json`):
  `enabled: true`, `tick_every_n_cycles: 3`.

Suspected trigger: accumulated state (vector store / witness-chain growth from
sustained CSI ingestion) pushing the agent's custody/optimizer/cognitive
processing past what one thread can sustain on a 512 MB Pi.

## Corroborating log line (possibly related, possibly separate)
Repeating every few seconds while mesh was enabled:
```
[mesh] WARNING: binary attestation UNKNOWN — control plane does not recognize this binary
```
(control plane: `https://us-central1-cognitum-20260110.cloudfunctions.net/cognitum-mesh-ctrl`)

## Reproduction / diagnostics used
```bash
# agent CPU (single thread)
ps -T -p $(pgrep -f /opt/cognitum/cognitum-agent) -o tid,pcpu,comm --sort=-pcpu
# API health (returns 503 or times out while pegged)
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' http://localhost/api/v1/status
# what the thread is doing
sudo journalctl -u cognitum-agent.service -f   # [sensor] drift / loop lines
```

## Questions for engineering
1. Is `cognitum-agent` intended to be single-threaded? Should the sensor
   HD-reflex and cognitive loops run off the HTTP-serving thread?
2. Can `reflex_hz` / `hd_hash_bits` / the cognitive loop be safely throttled or
   disabled as a mitigation? (Looking for a supported config, not a hack.)
3. Is there a **supported way to compact/reset the vector store or witness
   chain** if accumulated state is the trigger — without losing custody provenance?
4. Is `binary attestation UNKNOWN` expected on a stock 0.22.7 unit, or a separate issue?

## Workarounds currently in place on this unit
Mesh disabled, `sensor_source=auto`, cogs stopped, a static LAN IP set on the unit.
None resolve the CPU peg (confirming it's internal to the agent).
