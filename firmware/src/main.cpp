// SkyWatch ESP32 firmware — Phase 4 scaffold (ADR-0001, ADR-0007, ADR-0008).
//
// Thin client: self-configure via a Wi-Fi portal, then poll the gateway's
// GET /sky Sky Snapshot and render it. This skeleton wires the lifecycle and
// leaves portal/render/parse bodies as clearly marked TODOs to be implemented
// against the gateway contract.

#include <Arduino.h>

// --- Configuration persisted to NVS by the Wi-Fi portal (ADR-0007) ----------
struct DeviceConfig {
  // Wi-Fi
  String wifiSsid;
  String wifiPassword;
  // Observer (the centre of the sky)
  double latitudeDeg = 0.0;
  double longitudeDeg = 0.0;
  double altitudeKm = 0.0;
  double flightRangeKm = 50.0;
  double minElevationDeg = 10.0;
  String satelliteGroup = "visual";
  // Gateway (ADR-0008)
  String gatewayBaseUrl;     // e.g. http://192.168.1.10:8080
  String gatewayApiToken;    // optional
  // Polling
  uint32_t pollIntervalMs = 10000;
};

static DeviceConfig g_config;
static uint32_t g_lastPollMs = 0;

// TODO(Phase 4): start a Wi-Fi AP + captive portal (WiFiManager) capturing the
// fields above, persist to NVS, then connect to the configured network.
static void startConfigPortalAndConnect() {
  // Placeholder for WiFiManager integration.
}

// TODO(Phase 4): GET {gatewayBaseUrl}/sky with the observer query params,
// parse the Sky Snapshot JSON (ArduinoJson), and hand it to the renderer.
static void pollSkySnapshot() {
  // Placeholder: HTTPClient + ArduinoJson per ADR-0008 contract.
}

// TODO(Phase 4): draw the flight radar (bearing/distance) + sky dome (az/el)
// + next-pass banner on the display (TFT_eSPI / LVGL).
static void renderSky() {
  // Placeholder for display rendering.
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println(F("SkyWatch booting..."));
  startConfigPortalAndConnect();
}

void loop() {
  const uint32_t now = millis();
  if (now - g_lastPollMs >= g_config.pollIntervalMs) {
    g_lastPollMs = now;
    pollSkySnapshot();
    renderSky();
  }
}
