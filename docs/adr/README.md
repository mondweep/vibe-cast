# Architecture Decision Records

Significant, hard-to-reverse decisions for SkyWatch. Format follows the
[template](./0000-template.md). Supersede rather than rewrite.

| ADR | Title | Status |
| --- | --- | --- |
| [0001](./0001-gateway-centric-thin-device.md) | Gateway-centric architecture with a thin ESP32 device | Accepted |
| [0002](./0002-flight-data-source-opensky.md) | OpenSky as the default flight feed, behind a pluggable port | Accepted |
| [0003](./0003-hexagonal-ddd-architecture.md) | Hexagonal architecture with DDD bounded contexts | Accepted |
| [0004](./0004-sgp4-via-satellite-js.md) | SGP4 propagation via satellite.js on the gateway | Accepted |
| [0005](./0005-tle-from-celestrak-cached.md) | TLE acquisition from CelesTrak with a TTL cache | Accepted |
| [0006](./0006-tdd-london-school.md) | TDD, London School (mockist) | Accepted |
| [0007](./0007-esp32-firmware-platformio-portal.md) | ESP32 firmware on Arduino/PlatformIO with a Wi-Fi config portal | Accepted |
| [0008](./0008-device-gateway-http-json.md) | HTTP/JSON polling as the device↔gateway contract | Accepted |
| [0009](./0009-browser-frontend.md) | Gateway-served browser front-end (second consumer) | Accepted |
| [0010](./0010-flight-satellite-enrichment.md) | Lazy flight & satellite enrichment (adsbdb + CelesTrak SATCAT) | Accepted |
