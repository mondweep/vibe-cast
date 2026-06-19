// Persistent device configuration (ADR-0007), stored in NVS via Preferences.
#pragma once
#include <Arduino.h>

struct DeviceConfig {
  // Observer — the centre of the sky.
  double latitudeDeg = 51.5074;
  double longitudeDeg = -0.1278;
  double altitudeKm = 0.03;
  double flightRangeKm = 50.0;
  double minElevationDeg = 10.0;
  String satelliteGroup = "visual";

  // Gateway (ADR-0008).
  String gatewayBaseUrl = "";   // e.g. http://192.168.1.10:8080
  String gatewayApiToken = "";  // optional

  // Polling.
  uint32_t pollIntervalMs = 10000;
};

// Load config from NVS into `cfg` (leaves defaults for any missing key).
void loadConfig(DeviceConfig &cfg);

// Persist `cfg` to NVS.
void saveConfig(const DeviceConfig &cfg);

// True once a gateway URL has been configured (i.e. setup has been completed).
bool isConfigured(const DeviceConfig &cfg);
