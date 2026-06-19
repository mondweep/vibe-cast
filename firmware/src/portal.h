// Wi-Fi captive config portal (ADR-0007). Wraps WiFiManager: on first boot (or
// when forced) it raises an AP + web form capturing Wi-Fi creds and the
// observer/gateway settings, persists them, then connects to the network.
#pragma once
#include "config.h"

// Run the portal if needed and connect to Wi-Fi.
//  - forcePortal: always show the portal (e.g. a "config" button was held).
// Returns true if connected to Wi-Fi.
bool startConfigPortalAndConnect(DeviceConfig &cfg, bool forcePortal);
