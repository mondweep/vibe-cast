# Meshtastic Live Dashboard

A small live dashboard that demonstrates [Meshtastic](https://meshtastic.org/) —
an open-source, off-grid LoRa mesh networking project — without needing any
LoRa hardware.

## How it works

Meshtastic nodes with an internet-connected gateway bridge their mesh traffic
onto a public MQTT broker (`mqtt.meshtastic.org`) using a documented topic
layout:

```
msh/<REGION>/2/json/<CHANNEL>/<NODE_ID>
```

Each message is a small JSON packet carrying a type (`text`, `position`,
`telemetry`, `nodeinfo`, ...) and a payload. This app:

1. Subscribes to `msh/+/2/json/#` on the public broker (`app/mqtt_client.py`).
2. Parses each packet and folds it into an in-memory node registry and a
   rolling log of text messages (`app/state.py`).
3. Serves a live web dashboard (`app/server.py` + `static/index.html`) that
   polls `/api/state` every few seconds and shows nodes heard, their last
   known position/battery, and recent chat.

No radio, no pairing, no hardware — it just observes real mesh traffic that
other people's gateways are relaying onto the internet.

## Running locally

```bash
pip install -r requirements.txt
uvicorn app.server:app --reload
```

Then open http://localhost:8000.

Note: this requires outbound access to raw MQTT (TCP port 1883, or 8883 for
TLS) — a sandboxed environment that only permits HTTPS-443 egress (like the
one this was developed in) cannot reach the broker directly. Cloud Run and a
normal workstation/laptop both have unrestricted outbound access and work
fine.

Set `DISABLE_MQTT=true` to run the web server without connecting to MQTT
(useful for UI-only testing).

## Configuration

All via environment variables, all optional:

| Variable | Default | Purpose |
|---|---|---|
| `MQTT_HOST` | `mqtt.meshtastic.org` | Broker host |
| `MQTT_PORT` | `1883` | Broker port |
| `MQTT_TLS` | `false` | Use TLS (port 8883 typically) |
| `MQTT_USERNAME` | `meshdev` | Public broker's documented username |
| `MQTT_PASSWORD` | `large4cats` | Public broker's documented password |
| `MQTT_TOPIC` | `msh/+/2/json/#` | Topic filter (e.g. `msh/US/2/json/#` to scope to one region) |
| `DISABLE_MQTT` | `false` | Skip connecting to MQTT entirely |

## Tests

```bash
pytest tests/
```

Covers the packet-parsing logic (text messages, scaled lat/lon integers,
telemetry/nodeinfo merging into the same node) without requiring a live
broker connection.

## Deploying to Cloud Run

```bash
gcloud run deploy meshtastic-dashboard \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances=1 --max-instances=1
```

`--max-instances=1` matters here: node/message state lives in process
memory, so keeping it to a single instance avoids fragmenting state across
replicas. For a real multi-instance deployment, back `MeshState` with Redis
or similar instead.

## What this demonstrates

- Meshtastic's mesh-to-internet bridging model (MQTT, not a REST API).
- Its JSON packet schema for text, position, telemetry, and node-info
  messages.
- That you can build real tooling against a live, public LoRa mesh network
  with nothing more than an MQTT client — the same approach a mapping
  tool, a bot, or a home-automation integration would use.
