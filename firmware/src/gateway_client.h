// Polls the gateway's GET /sky endpoint and parses the Sky Snapshot (ADR-0008).
#pragma once
#include "config.h"
#include "sky_model.h"

// Fetch + parse the current Sky Snapshot into `out`.
// Returns true on success; on failure `out` is left unchanged and the reason is
// printed to Serial.
bool fetchSkySnapshot(const DeviceConfig &cfg, SkySnapshot &out);

// Exposed for host-side testing: parse a Sky Snapshot JSON document.
bool parseSkySnapshot(const String &json, SkySnapshot &out);
