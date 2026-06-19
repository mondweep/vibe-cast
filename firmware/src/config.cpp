#include "config.h"
#include <Preferences.h>

namespace {
const char *NS = "skywatch";
}

void loadConfig(DeviceConfig &cfg) {
  Preferences prefs;
  prefs.begin(NS, /*readOnly=*/true);
  cfg.latitudeDeg = prefs.getDouble("lat", cfg.latitudeDeg);
  cfg.longitudeDeg = prefs.getDouble("lon", cfg.longitudeDeg);
  cfg.altitudeKm = prefs.getDouble("altKm", cfg.altitudeKm);
  cfg.flightRangeKm = prefs.getDouble("rangeKm", cfg.flightRangeKm);
  cfg.minElevationDeg = prefs.getDouble("minEl", cfg.minElevationDeg);
  cfg.satelliteGroup = prefs.getString("group", cfg.satelliteGroup);
  cfg.gatewayBaseUrl = prefs.getString("gw", cfg.gatewayBaseUrl);
  cfg.gatewayApiToken = prefs.getString("token", cfg.gatewayApiToken);
  cfg.pollIntervalMs = prefs.getULong("poll", cfg.pollIntervalMs);
  prefs.end();
}

void saveConfig(const DeviceConfig &cfg) {
  Preferences prefs;
  prefs.begin(NS, /*readOnly=*/false);
  prefs.putDouble("lat", cfg.latitudeDeg);
  prefs.putDouble("lon", cfg.longitudeDeg);
  prefs.putDouble("altKm", cfg.altitudeKm);
  prefs.putDouble("rangeKm", cfg.flightRangeKm);
  prefs.putDouble("minEl", cfg.minElevationDeg);
  prefs.putString("group", cfg.satelliteGroup);
  prefs.putString("gw", cfg.gatewayBaseUrl);
  prefs.putString("token", cfg.gatewayApiToken);
  prefs.putULong("poll", cfg.pollIntervalMs);
  prefs.end();
}

bool isConfigured(const DeviceConfig &cfg) {
  return cfg.gatewayBaseUrl.length() > 0;
}
