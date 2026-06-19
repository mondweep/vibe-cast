# ADR-0008: HTTP/JSON polling as the device↔gateway contract

- **Status:** Accepted
- **Date:** 2026-06-19

## Context
The thin device (ADR-0001) needs the Sky Snapshot from the gateway. Transport
options: HTTP request/response polling, WebSocket push, or MQTT. ESP32 handles
all three, but simplicity and debuggability matter for v1.

## Decision
Use **HTTP/JSON polling**: the gateway exposes `GET /sky?...` returning the
**Sky Snapshot** Published Language (a stable JSON contract — ADR-0003). The
device polls on an interval (default ~10 s for flights; passes change slowly).
The contract is versioned and documented alongside the gateway.

### Sky Snapshot (response shape)
```jsonc
{
  "observedAt": "2026-06-19T12:00:00.000Z",
  "flights": [
    { "aircraft": { "icao24": "abc123", "callsign": "BAW123",
                    "latitudeDeg": 51.47, "longitudeDeg": -0.45,
                    "baroAltitudeM": 11000, "velocityMps": 240,
                    "headingDeg": 95, "onGround": false },
      "distanceKm": 12.3, "bearingDeg": 218.4 }
  ],
  "satellitesOverhead": [
    { "satelliteName": "ISS (ZARYA)", "noradId": 25544,
      "look": { "azimuthDeg": 130.2, "elevationDeg": 47.8, "rangeKm": 612.5 } }
  ],
  "upcomingPasses": [
    { "satelliteName": "ISS (ZARYA)", "noradId": 25544,
      "aosTime": "2026-06-19T20:14:00.000Z",
      "tcaTime": "2026-06-19T20:17:30.000Z",
      "losTime": "2026-06-19T20:21:00.000Z",
      "maxElevationDeg": 61.0, "durationSeconds": 420 }
  ]
}
```

## Consequences
### Positive
- Trivial to implement/debug on ESP32 (HTTPClient + ArduinoJson) and with curl.
- Stateless gateway endpoint; easy caching.
### Negative / trade-offs
- Polling has latency vs. push; fine for this glanceable use case.
### Follow-ups
- Phase 5: optional MQTT/WebSocket push for multi-device or lower latency.

## Alternatives considered
- **MQTT:** great for many devices/push, but adds a broker dependency for v1.
- **WebSocket:** lower latency, more firmware complexity than polling needs.
