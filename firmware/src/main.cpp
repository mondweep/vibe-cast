// SkyWatch ESP32 firmware (ADR-0001, ADR-0007, ADR-0008).
//
// Thin client: self-configure via a Wi-Fi portal, then poll the gateway's
// GET /sky Sky Snapshot on an interval and render flights + satellites.
//
// Out of the box this builds with Serial output; define -DUSE_TFT (and provide
// a TFT_eSPI User_Setup for your display) to enable the round-display radar.

#include <Arduino.h>
#include <WiFi.h>
#include "config.h"
#include "portal.h"
#include "gateway_client.h"
#include "render.h"

// Hold this GPIO low at boot to force the config portal (e.g. BOOT button).
#ifndef CONFIG_BUTTON_PIN
#define CONFIG_BUTTON_PIN 9  // ESP32-C3 BOOT button
#endif

static DeviceConfig g_config;
static SkySnapshot g_snapshot;
static uint32_t g_lastPollMs = 0;

static bool configButtonHeld() {
  pinMode(CONFIG_BUTTON_PIN, INPUT_PULLUP);
  delay(20);
  return digitalRead(CONFIG_BUTTON_PIN) == LOW;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println(F("\nSkyWatch booting..."));

  renderInit();
  loadConfig(g_config);

  const bool force = configButtonHeld();
  renderStatus(force ? "Config portal..." : "Connecting Wi-Fi...");

  if (!startConfigPortalAndConnect(g_config, force)) {
    renderStatus("Wi-Fi failed; rebooting");
    delay(3000);
    ESP.restart();
  }

  Serial.printf("Wi-Fi connected: %s\n", WiFi.localIP().toString().c_str());
  if (!isConfigured(g_config)) {
    renderStatus("Set gateway URL in portal");
  }
  g_lastPollMs = millis() - g_config.pollIntervalMs;  // poll immediately
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    renderStatus("Wi-Fi lost; reconnecting");
    WiFi.reconnect();
    delay(2000);
    return;
  }

  const uint32_t now = millis();
  if (now - g_lastPollMs >= g_config.pollIntervalMs) {
    g_lastPollMs = now;
    if (isConfigured(g_config) && fetchSkySnapshot(g_config, g_snapshot)) {
      renderSnapshot(g_snapshot, g_config);
    } else if (!isConfigured(g_config)) {
      renderStatus("No gateway configured");
    }
  }
  delay(50);
}
