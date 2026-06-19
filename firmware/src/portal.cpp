#include "portal.h"
#include <WiFiManager.h>

namespace {
// Helper: WiFiManager parameters carry strings; we convert on save.
String fmt(double v) {
  char buf[24];
  dtostrf(v, 0, 4, buf);
  return String(buf);
}
}  // namespace

bool startConfigPortalAndConnect(DeviceConfig &cfg, bool forcePortal) {
  WiFiManager wm;
  wm.setConfigPortalTimeout(180);  // seconds; don't block forever

  WiFiManagerParameter pLat("lat", "Latitude (deg)", fmt(cfg.latitudeDeg).c_str(), 16);
  WiFiManagerParameter pLon("lon", "Longitude (deg)", fmt(cfg.longitudeDeg).c_str(), 16);
  WiFiManagerParameter pAlt("altKm", "Altitude (km)", fmt(cfg.altitudeKm).c_str(), 12);
  WiFiManagerParameter pRange("rangeKm", "Flight range (km)", fmt(cfg.flightRangeKm).c_str(), 12);
  WiFiManagerParameter pMinEl("minEl", "Min elevation (deg)", fmt(cfg.minElevationDeg).c_str(), 12);
  WiFiManagerParameter pGroup("group", "Satellite group", cfg.satelliteGroup.c_str(), 24);
  WiFiManagerParameter pGw("gw", "Gateway URL", cfg.gatewayBaseUrl.c_str(), 96);
  WiFiManagerParameter pToken("token", "Gateway API token", cfg.gatewayApiToken.c_str(), 96);

  wm.addParameter(&pLat);
  wm.addParameter(&pLon);
  wm.addParameter(&pAlt);
  wm.addParameter(&pRange);
  wm.addParameter(&pMinEl);
  wm.addParameter(&pGroup);
  wm.addParameter(&pGw);
  wm.addParameter(&pToken);

  bool saved = false;
  wm.setSaveParamsCallback([&]() { saved = true; });

  bool connected;
  if (forcePortal || !isConfigured(cfg)) {
    connected = wm.startConfigPortal("SkyWatch-Setup");
  } else {
    connected = wm.autoConnect("SkyWatch-Setup");
  }

  if (saved) {
    cfg.latitudeDeg = atof(pLat.getValue());
    cfg.longitudeDeg = atof(pLon.getValue());
    cfg.altitudeKm = atof(pAlt.getValue());
    cfg.flightRangeKm = atof(pRange.getValue());
    cfg.minElevationDeg = atof(pMinEl.getValue());
    cfg.satelliteGroup = String(pGroup.getValue());
    cfg.gatewayBaseUrl = String(pGw.getValue());
    cfg.gatewayApiToken = String(pToken.getValue());
    saveConfig(cfg);
  }
  return connected;
}
