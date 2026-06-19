#include "gateway_client.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>

namespace {
String buildUrl(const DeviceConfig &cfg) {
  String url = cfg.gatewayBaseUrl;
  url += "/sky?lat=" + String(cfg.latitudeDeg, 5);
  url += "&lon=" + String(cfg.longitudeDeg, 5);
  url += "&altKm=" + String(cfg.altitudeKm, 4);
  url += "&rangeKm=" + String(cfg.flightRangeKm, 2);
  url += "&minEl=" + String(cfg.minElevationDeg, 2);
  return url;
}
}  // namespace

bool parseSkySnapshot(const String &json, SkySnapshot &out) {
  // Sized for ~16 flights + 12 sats + 6 passes. Adjust if you raise the caps.
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) {
    Serial.printf("[gateway] JSON parse error: %s\n", err.c_str());
    return false;
  }

  out = SkySnapshot();  // reset
  out.observedAt = doc["observedAt"] | "";

  JsonArrayConst flights = doc["flights"].as<JsonArrayConst>();
  for (JsonObjectConst f : flights) {
    if (out.flightCount >= MAX_FLIGHTS) break;
    JsonObjectConst a = f["aircraft"];
    Flight &dst = out.flights[out.flightCount++];
    dst.icao24 = a["icao24"] | "";
    dst.callsign = a["callsign"] | "";
    dst.baroAltitudeM = a["baroAltitudeM"] | 0.0f;
    dst.onGround = a["onGround"] | false;
    dst.distanceKm = f["distanceKm"] | 0.0f;
    dst.bearingDeg = f["bearingDeg"] | 0.0f;
  }

  JsonArrayConst sats = doc["satellitesOverhead"].as<JsonArrayConst>();
  for (JsonObjectConst s : sats) {
    if (out.satCount >= MAX_SATS) break;
    SatOverhead &dst = out.sats[out.satCount++];
    dst.name = s["satelliteName"] | "";
    dst.noradId = s["noradId"] | 0L;
    JsonObjectConst look = s["look"];
    dst.azimuthDeg = look["azimuthDeg"] | 0.0f;
    dst.elevationDeg = look["elevationDeg"] | 0.0f;
    dst.rangeKm = look["rangeKm"] | 0.0f;
  }

  JsonArrayConst passes = doc["upcomingPasses"].as<JsonArrayConst>();
  for (JsonObjectConst p : passes) {
    if (out.passCount >= MAX_PASSES) break;
    UpcomingPass &dst = out.passes[out.passCount++];
    dst.name = p["satelliteName"] | "";
    dst.aosTime = p["aosTime"] | "";
    dst.maxElevationDeg = p["maxElevationDeg"] | 0.0f;
    dst.durationSeconds = p["durationSeconds"] | 0L;
    dst.visible = p["visible"] | false;
  }

  JsonArrayConst warnings = doc["warnings"].as<JsonArrayConst>();
  if (!warnings.isNull() && warnings.size() > 0) {
    out.warning = warnings[0].as<const char *>();
  }
  return true;
}

bool fetchSkySnapshot(const DeviceConfig &cfg, SkySnapshot &out) {
  const String url = buildUrl(cfg);
  HTTPClient http;

  bool ok;
  if (url.startsWith("https")) {
    WiFiClientSecure client;
    client.setInsecure();  // self-hosted gateway; pin a cert for production
    ok = http.begin(client, url);
  } else {
    WiFiClient client;
    ok = http.begin(client, url);
  }
  if (!ok) {
    Serial.println("[gateway] http.begin failed");
    return false;
  }

  if (cfg.gatewayApiToken.length() > 0) {
    http.addHeader("Authorization", "Bearer " + cfg.gatewayApiToken);
  }

  const int code = http.GET();
  if (code != HTTP_CODE_OK) {
    Serial.printf("[gateway] GET %s -> %d\n", url.c_str(), code);
    http.end();
    return false;
  }

  const String body = http.getString();
  http.end();
  return parseSkySnapshot(body, out);
}
