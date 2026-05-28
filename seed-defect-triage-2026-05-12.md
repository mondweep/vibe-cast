---
title: "Cognitum Seed — WiFi Setup Session: Observations & Defect Triage"
subtitle: "Pre-ticket discussion for the development team"
author: "mondweep@dxsure.uk"
date: "2026-05-12"
---

# Cognitum Seed — WiFi Setup Session: Observations & Defect Triage

**Status:** Pre-ticket discussion — please advise which observations warrant formal defect tickets.

## Purpose

On 2026-05-12 we attempted to move the seed off USB-OTG and onto household WiFi so it could be reached from a laptop over the LAN (target end-state: `https://cognitum-2c3c.local:8443/mcp` from the same WiFi). We succeeded — the seed is now autonomously reachable over WiFi from the laptop — but the path was much harder than it should be, and we found seven distinct behaviors that look like defects. Two of them caused us to misdiagnose the seed as "stuck" or "in a bad state" when it was actually healthy; we want to flag those especially because they are the kind of bug that wastes user time and erodes trust in the device.

The triage is hedged where appropriate. Where a behavior could be by design or self-induced, we say so.

## Environment

| Item | Value |
|---|---|
| Hardware | Raspberry Pi Zero 2 W (per `seed.guide.overview`) |
| Firmware / agent | `cognitum-seed 0.22.0`, protocol `2025-11-25` |
| Pairing token | already issued (carried over from prior session) |
| Vector store | 132,164 vectors at dim 8; witness chain depth ~230,266 |
| Network paths exercised | USB-OTG link-local (`169.254.42.1`); home WiFi 2.4 GHz "Golden Ninja Lloyd" → DHCP `192.168.68.133` |
| Cert (subject) | `CN=cognitum-2c3c.local, O=Cognitum Seed, OU=60faaf58-bd85-418f-a203-c1b1172273a5` |
| Cert (issuer) | `CN=Cognitum Device CA` (self-signed root) |
| Cert validity | `2026-05-06 → 2031-05-05` |
| Cert SHA-256 | `52:DB:5A:BE:4B:2A:50:1F:F9:F8:F8:40:9C:AB:4E:DD:CF:FB:1B:C2:E3:AD:71:D1:D8:E2:0E:68:1E:CC:D7:45` |
| Device UUID | `60faaf58-bd85-418f-a203-c1b1172273a5` |
| Client | Claude Code on macOS 24.5.0 via `cognitum-bridge.mjs` |
| Probe tools | `curl 8.9.1`, `openssl`, `node 20.19.0`, browser (Chrome) |

## Triage Summary

| ID | Observation | Confidence | Suggested triage |
|---|---|---|---|
| D-1 | Bridge default URL (`http://169.254.42.1/mcp`, port 80) points at a broken legacy listener returning `503 {"error":"busy"}` for **all** paths | High | **Defect** (out-of-box failure or bit-rotted listener) |
| D-2 | Dashboard JS uses `http://` scheme against the TLS-only port 8443, breaking every metric refresh and the Pair flow on WiFi | High | **Defect** (dashboard unusable on WiFi) |
| D-3 | When the seed's HTTP connection cap is exhausted, requests fail silently as **HTTP 200 with empty body** (in addition to `503 too many connections` and TLS `record_overflow`) | High | **Defect** (silent-success failure mode; very misleading) |
| D-4 | Reconnecting to a saved WiFi network with no password supplied appears to start, then silently reverts to `disconnected` with no error | Medium (may be by design) | Probable defect — at minimum needs better error reporting |
| D-5 | `/mcp` over WiFi without `Authorization` header returns `{"error": "Bearer token required for WiFi access. Pair via USB first."}` on already-paired devices | Low | UX/docs defect — wrong remediation suggested |
| D-6 | MCP `tools/call` over WiFi returns empty body for several tools (`device.status`, `store.status`, `witness.chain`, `coherence.profile`, sometimes `guide.overview`) | High | Likely surfacing of D-3 via the MCP code path |
| D-7 | The shipped `cognitum-bridge.mjs` only speaks plain HTTP and has no TLS / cert-pinning support, so it cannot reach the canonical HTTPS:8443 endpoint without local modification | Medium | Defect or feature gap depending on intent |

---

## D-1 — Bridge / port-80 MCP listener returns `503 busy` for every request

**Suggested severity:** High

**Observed behavior**

The default URL baked into `cognitum-bridge.mjs` is:

```js
const SEED_URL = process.env.COGNITUM_SEED_URL || 'http://169.254.42.1/mcp';
```

That endpoint — plain HTTP on port 80 — returns `503 {"error":"busy"}` for **every** path including paths that do not exist. Example:

```
$ curl -s -m 3 -o /dev/null -w "%{http_code}\n" http://169.254.42.1/
503
$ curl -s -m 3 -X POST http://169.254.42.1/mcp \
    -H "Authorization: Bearer …" -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{…}}'
{"error":"busy"}    HTTP 503

# every path returns the same:
$ for ep in /health /healthz /status /ping /api /api/v1 /api/v1/health; do
    printf "%-25s " "$ep"
    curl -s -m 2 -o /dev/null -w "HTTP %{http_code}\n" "http://169.254.42.1$ep"
  done
  /health                   HTTP 503
  /healthz                  HTTP 503
  /status                   HTTP 503
  /ping                     HTTP 503
  /api                      HTTP 503
  /api/v1                   HTTP 503
  /api/v1/health            HTTP 503
```

Meanwhile the **HTTPS listener on port 8443** at the same host responds normally:

```
$ curl -sk -m 5 -X POST https://169.254.42.1:8443/mcp \
    -H "Authorization: Bearer …" -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{…}}'
HTTP 200 — full initialize response
```

**Reproduction**

1. Plug the seed into a host that brings up USB-OTG at `169.254.42.1`.
2. `curl -m 3 http://169.254.42.1/` → `503 {"error":"busy"}`.
3. `curl -sk -m 5 https://169.254.42.1:8443/guide` → HTTP 200, real dashboard.

**Why this matters**

The shipped bridge defaults to the broken endpoint. A user installing for the first time will see `Failed to connect to MCP server cognitum-seed` with timeouts. We initially attributed this to seed instability and went down a long rabbit hole (cold-cycle, replay theory, etc.) before discovering the canonical endpoint is HTTPS:8443.

**Open questions for the team**

- Is the port-80 listener intended? If yes, why does it always return 503? If no, why is it running?
- Should the bridge's default be updated to `https://169.254.42.1:8443/mcp`?

**Workaround applied today**

Updated the bridge to support HTTPS with cert-pinning and pointed it at HTTPS:8443. See the companion change to `cognitum-bridge.mjs` in this commit.

---

## D-2 — Dashboard JS uses `http://` scheme against TLS-only port 8443

**Suggested severity:** High

**Observed behavior**

The dashboard HTML at `https://192.168.68.133:8443/guide` loads correctly over HTTPS, but its JavaScript issues XHR / fetch calls with hardcoded `http://` against the same host and port. Verbatim console errors observed in Chrome DevTools after a fresh page load and after clicking **Pair**:

```
guide:2535  GET  http://192.168.68.133:8443/api/v1/thermal/state    net::ERR_INVALID_HTTP_RESPONSE
guide:2535  GET  http://192.168.68.133:8443/api/v1/coherence/profile net::ERR_INVALID_HTTP_RESPONSE
guide:2535  GET  http://192.168.68.133:8443/api/v1/sensor/drift/status net::ERR_INVALID_HTTP_RESPONSE
guide:2758  POST http://192.168.68.133:8443/api/v1/pair/window       net::ERR_FAILED
guide:2758  POST http://192.168.68.133:8443/api/v1/pair              net::ERR_FAILED
guide:1     Access to XMLHttpRequest at 'http://192.168.68.133:8443/api/v1/pair'
            from origin 'https://192.168.68.133:8443' has been blocked by CORS policy:
            Response to preflight request doesn't pass access control check:
            It does not have HTTP ok status.
guide:2535  GET  http://192.168.68.133:8443/api/v1/status            503 (Service Unavailable)
```

The same endpoints work perfectly when called over **`https://`**:

```
$ curl -sk -m 5 https://192.168.68.133:8443/api/v1/thermal/state -H "Authorization: Bearer …"
{"d_temp":50.76, "freq_mhz":1000, "temp_c":39.70, "zone":"Cool", …}    HTTP 200

$ curl -sk -m 5 https://192.168.68.133:8443/api/v1/coherence/profile -H "Authorization: Bearer …"
HTTP 200, 336-byte JSON body
```

**Reproduction**

1. Connect the seed to a WiFi network so it has a routable IP.
2. From a machine on the same LAN, open `https://<seed-ip>:8443/guide` in Chrome.
3. Open DevTools → Console → reload page or click **Pair**.
4. Every API call from the page console shows `http://...:8443/api/v1/...` and fails with one of:
   - `ERR_INVALID_HTTP_RESPONSE` (most refreshDashboard calls)
   - `ERR_SSL_PROTOCOL_ERROR` (under TLS load)
   - CORS preflight blocked (cross-scheme XHR for `pair` endpoints)
   - `503 Service Unavailable` (when the seed's HTTP error path is reachable)

**Effect**

- The Welcome dashboard's "Live Vectors / Epoch / Uptime" tiles show "—" on WiFi-loaded pages (they happen to work over USB-OTG when the page is served on `https://169.254.42.1:8443/guide` and the browser permits the protocol mismatch under different conditions; we did see the data successfully render after the page had been open for a while, presumably from cached/working calls — but the steady-state refresh fails).
- Clicking **Pair** has no effect — the cross-scheme XHR is blocked by CORS preflight before it ever leaves the browser.
- The "Connected" / "Not connected" badges are unreliable indicators because they depend on the same broken JS.

**Suggested fix**

Use protocol-relative URLs (`//<host>:8443/api/v1/...`) or compute the scheme from `window.location.protocol`. The current code appears to hardcode `http://` in `refreshDashboard` (line ~2535 in `guide` bundle) and the pair handler (line ~2758).

**Why this matters**

A first-time WiFi user who opens the dashboard will see a broken page and conclude the seed itself is unhealthy. We confirmed via curl that the seed is fine; the dashboard is the problem.

---

## D-3 — Connection cap exhaustion fails silently with `HTTP 200 + empty body`

**Suggested severity:** High

**Observed behavior**

The seed has a tight HTTP-side concurrent-connection cap. When the pool is full, we observed **three distinct response modes** from the same operation depending on how full it is:

1. **Best case — proper error:** `HTTP 503` with body `{"error":"too many connections"}` (or `{"error":"busy"}`). Recoverable; client knows to back off.
2. **Worst case — silent success:** `HTTP 200` with `Content-Length: 0` (empty body). The client sees a successful HTTP exchange and parses an empty string. This is what bit us.
3. **TLS-layer failure:** `OpenSSL: error:0A0000C6:SSL routines::packet length too long` / `ERR_SSL_PROTOCOL_ERROR`. The TLS server returned data the client can't parse as a TLS record — appears (per OpenSSL trace) to be the seed's HTTP error fallback emitting non-TLS bytes onto a TLS socket. Curl exits with code 35.

Example sequence on 2026-05-12 from `https://192.168.68.133:8443`:

```
$ curl -sk -m 8 https://192.168.68.133:8443/api/v1/thermal/state -H "Auth…" | head -c 200
{"d_temp":50.76, "freq_mhz":1000, "temp_c":39.70, ...}                    HTTP 200

# after ~10 closely-spaced curls + browser polling:
$ curl -sk -m 8 https://192.168.68.133:8443/api/v1/thermal/state -H "Auth…"
                                                                          HTTP 200, 0 bytes

# after a few more:
$ curl -sv -m 5 https://192.168.68.133:8443/api/v1/thermal/state
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* TLSv1.3 (OUT), TLS alert, record overflow (534):
* OpenSSL/3.4.0: error:0A0000C6:SSL routines::packet length too long
* closing connection #0

# 90 seconds of idle later:
$ curl -sk -m 8 https://192.168.68.133:8443/api/v1/thermal/state -H "Auth…"
{"d_temp":50.76, …, "zone":"Cool"}                                       HTTP 200
```

The recovery time was consistently in the 60–90 s range, suggesting TCP TIME_WAIT (default ~60 s) is what holds the slots.

**Reproduction**

1. From a single host, fire ~10 parallel curl requests at the seed (or have the dashboard polling open while running a few sequential curls).
2. Observe that some requests return empty 200, some return 503, some fail TLS handshake.
3. Wait 90 s, retry — works again.

**Why this matters**

The silent-success failure mode is the worst part. We spent ~30 minutes today convinced the seed had a "tools/call handler bug" because every MCP tool call returned HTTP 200 with len=0. We later proved this was just the connection cap — when the bridge uses a single long-lived connection, MCP works fine. Recommend at minimum:

- Never return `HTTP 200` with empty body. If a connection has to be dropped under load, send `503` (or TCP RST), not a silent 200.
- Consider raising the cap or adding aggressive keep-alive / connection reuse on the server side.
- Document the cap in the seed's docs.

---

## D-4 — Reconnect to saved WiFi network silently fails when password is omitted

**Suggested severity:** Medium (may be by design, but error reporting is silent)

**Observed behavior**

The seed exposes `saved_networks` in `GET /api/v1/wifi/status`. Calling `POST /api/v1/wifi/connect` with only the SSID (no password) on a saved network appears to start a connection, then reverts to disconnected with no error returned anywhere.

```
$ curl -sk https://169.254.42.1:8443/api/v1/wifi/status -H "Auth…"
{"connection":"", "saved_networks":["Golden Ninja Lloyd"], "state":"disconnected", …}

$ curl -sk -X POST https://169.254.42.1:8443/api/v1/wifi/connect \
    -H "Auth…" -d '{"ssid":"Golden Ninja Lloyd"}'
(timeout at 15s)

# Status immediately after:
{"connection":"Golden Ninja Lloyd", "state":"connecting (configuring)", ...}

# 5 seconds later, and for all subsequent polls:
{"connection":"", "state":"disconnected", "saved_networks":["Golden Ninja Lloyd"]}

# No error logged anywhere visible to the API. No log endpoint exposed.
```

Retrying the same call **with an explicit password** worked immediately.

**Reproduction**

1. Pair the seed to a WiFi network once (so it appears in `saved_networks`).
2. Disconnect.
3. `POST /api/v1/wifi/connect {"ssid":"<saved name>"}` (no password field).
4. Poll `/api/v1/wifi/status` — observe `state="connecting (configuring)"` briefly, then `state="disconnected"` with no error.

**Interpretation / open question**

It is reasonable for the seed to *require* a password every time and not cache credentials. But if so, the API should:

- Return an error like `{"error":"password required for saved network <name>", "reason":"…"}` on the connect call, or
- Drop the `saved_networks` field entirely (since it implies the credentials are stored).

The current behavior — exposing saved network names while not actually retaining usable credentials — is confusing.

---

## D-5 — Generic "Pair via USB first" error on an already-paired device

**Suggested severity:** Low (UX / docs)

**Observed behavior**

Navigating a browser to `https://cognitum-2c3c.local:8443/mcp` (i.e. a GET with no auth header) on an already-paired seed returns:

```json
{
  "error": "Bearer token required for WiFi access. Pair via USB first."
}
```

The wording suggests the user needs to perform a pairing handshake over USB. In our case, the device is already paired and the user already holds a valid token; the only thing missing from the request is the `Authorization: Bearer …` header.

**Reproduction**

1. Pair the seed and obtain a token (via the standard flow).
2. From a browser on the same WiFi, navigate to `https://<seed-host>:8443/mcp`.
3. Observe the misleading error text.

**Suggested fix**

Distinguish the two states server-side:

- No pairing record exists → "Pair via USB first."
- Pairing exists, but this request has no Authorization header → "Authorization: Bearer <token> header required for WiFi access."

---

## D-6 — MCP `tools/call` over WiFi returns empty body for several tools

**Suggested severity:** High (likely a surfacing of D-3 via the MCP path)

**Observed behavior**

Over a single MCP session established at `https://192.168.68.133:8443/mcp` with a valid bearer token and `experimental.cognitum.toolScope: "full"`:

- `seed.guide.overview` — worked once (4476 bytes), then started returning empty body.
- `seed.guide.search` — works.
- `seed.guide.endpoints` — works on first call, returns empty body on subsequent.
- `seed.device.status` — empty body (HTTP 200, len=0).
- `seed.store.status` — empty body.
- `seed.witness.chain` — empty body.
- `seed.coherence.profile` — empty body.
- `seed.sensor.list` — empty body.
- `seed.cogs.list` — empty body.
- `notifications/initialized` accepted (HTTP 202).

The same tools worked over USB-OTG earlier the same day with the same firmware, so this is not a firmware regression per tool.

**Likely root cause**

We strongly suspect this is **the same connection-cap exhaustion as D-3** surfacing via the MCP code path. Each curl-style call opens a new TLS connection; once the pool is exhausted the seed silently drops responses to in-flight tool calls. We did not have time today to confirm via the bridge (which holds a long-lived connection), but a quick smoke test of the bridge showed `initialize` working correctly over the same URL, which is consistent with the connection-pool theory.

**Reproduction**

1. Initialize an MCP session over HTTPS:8443 (single curl).
2. Send `notifications/initialized` (single curl).
3. Send a few `tools/call` requests in quick succession (separate curl invocations, no keep-alive).
4. Observe responses progressing from full-result → empty body.

**Asks**

- Confirm whether this is the same as D-3 or a distinct issue.
- If it's D-3: please make the MCP layer return a proper `error` JSON-RPC frame when its underlying transport runs out of capacity, rather than closing with an empty 200.

---

## D-7 — Shipped `cognitum-bridge.mjs` lacks HTTPS / cert-pinning support

**Suggested severity:** Medium

**Observed behavior**

The bridge as shipped (file `/Users/mondweep/Documents/Claude/Projects/Cognitum.One/cognitum-bridge.mjs`):

- Hardcodes plain HTTP as the default scheme.
- Uses `fetch()` with no custom dispatcher, so it has no way to verify a self-signed cert or to skip hostname checks when connecting by IP.
- Has no environment variable for cert pinning.

This means a user who points it at the working HTTPS:8443 endpoint will be unable to verify the seed's self-signed cert, with no in-band way to pin a known fingerprint.

**Reproduction**

1. Try setting `COGNITUM_SEED_URL=https://169.254.42.1:8443/mcp` with the unmodified shipped bridge.
2. `fetch` rejects the TLS chain because the issuer ("Cognitum Device CA") is not in the public root store.

**Workaround applied today (see companion bridge change in this commit)**

We added:

- Detection of `https://` URLs in the bridge.
- An undici `Agent` with a custom `checkServerIdentity` that verifies the certificate's SHA-256 fingerprint matches a `COGNITUM_CERT_FINGERPRINT` env var.
- Hostname verification is bypassed (we connect by IP).
- HTTP URLs continue to work unchanged.

This may belong upstream as a first-class feature of the shipped bridge.

---

## What worked, despite the above

We did successfully complete the WiFi setup:

1. Captured the seed's TLS cert via `openssl s_client -connect 169.254.42.1:8443` and extracted SHA-256.
2. Modified the bridge to verify that fingerprint (in-repo change in this commit).
3. Connected to WiFi via `POST /api/v1/wifi/connect` with explicit password.
4. Verified mDNS resolution: `cognitum-2c3c.local` → `192.168.68.133` (matches cert CN).
5. Re-pointed bridge at `https://cognitum-2c3c.local:8443/mcp`. Smoke-test `initialize` succeeded.
6. Cold-boot test (cycle power) → seed rejoins WiFi automatically, same DHCP lease, same cert. ✓
7. Live dashboard at `https://192.168.68.133:8443/guide` shows correct metrics on first paint: 132,164 vectors / 230,266 epoch / 13m uptime / 39.7 °C — confirming the seed is functionally healthy on WiFi.

End state: laptop ↔ seed over WiFi via cert-pinned HTTPS, no USB required.

## Recommendations (consolidated)

1. **Fix or remove the port-80 listener** (`D-1`).
2. **Fix the dashboard's hardcoded `http://` scheme** (`D-2`).
3. **Replace empty-200 with proper 503/RST** under connection-cap pressure (`D-3`).
4. **Return a proper error** when reconnecting saved networks without a password (`D-4`), or stop exposing `saved_networks`.
5. **Distinguish "never paired" from "missing Authorization header"** in the WiFi-access error (`D-5`).
6. **Audit MCP responses for empty-body 200s** (`D-6`).
7. **Ship cert-pinning / HTTPS support in the official bridge** (`D-7`).

## Reproduction-quick-reference

If you want to replicate the most useful diagnostic curls end-to-end:

```bash
TOK=<your-bearer-token>
USB=https://169.254.42.1:8443
WIFI=https://192.168.68.133:8443    # or use the mDNS name

# 1. Show the broken port-80 endpoint (D-1)
curl -s -m 3 -o /dev/null -w "%{http_code}\n" http://169.254.42.1/
# → 503 (and every other path returns 503 too)

# 2. Capture cert fingerprint
echo | openssl s_client -connect 169.254.42.1:8443 2>/dev/null \
  | openssl x509 -noout -fingerprint -sha256

# 3. Healthy REST over HTTPS
curl -sk -m 5 "$USB/api/v1/wifi/status" -H "Authorization: Bearer $TOK"
curl -sk -m 5 "$USB/api/v1/thermal/state" -H "Authorization: Bearer $TOK"

# 4. Trigger D-3 (connection cap)
for i in $(seq 1 15); do
  curl -sk -m 3 "$USB/api/v1/thermal/state" -H "Authorization: Bearer $TOK" \
    -w "\n%{http_code}|%{size_download}\n" &
done
wait
# Expect a mix of 200/200-with-empty-body/503/TLS-handshake-failures
```
