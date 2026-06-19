#include "render.h"

#ifdef USE_TFT
#include <TFT_eSPI.h>
namespace {
TFT_eSPI tft = TFT_eSPI();
const int16_t CX = 120;  // centre x for a 240x240 round display
const int16_t CY = 120;
const int16_t R = 116;   // outer radar radius

// Map a compass bearing + normalised radius (0=centre, 1=edge) to x/y.
void polarToXY(float bearingDeg, float radius0to1, int16_t &x, int16_t &y) {
  const float a = (bearingDeg - 90.0f) * 0.01745329f;  // 0deg = up (north)
  x = CX + (int16_t)(cosf(a) * radius0to1 * R);
  y = CY + (int16_t)(sinf(a) * radius0to1 * R);
}
}  // namespace
#endif

void renderInit() {
#ifdef USE_TFT
  tft.init();
  tft.setRotation(0);
  tft.fillScreen(TFT_BLACK);
#endif
  Serial.println("[render] ready");
}

static void renderSerial(const SkySnapshot &snap) {
  Serial.println("==== SkyWatch ====");
  Serial.printf("@ %s\n", snap.observedAt.c_str());
  Serial.printf("Flights (%u):\n", (unsigned)snap.flightCount);
  for (size_t i = 0; i < snap.flightCount; i++) {
    const Flight &f = snap.flights[i];
    Serial.printf("  %-8s %5.1fkm  brg %5.1f  %5.0fm\n",
                  f.callsign.c_str(), f.distanceKm, f.bearingDeg, f.baroAltitudeM);
  }
  Serial.printf("Satellites overhead (%u):\n", (unsigned)snap.satCount);
  for (size_t i = 0; i < snap.satCount; i++) {
    const SatOverhead &s = snap.sats[i];
    Serial.printf("  %-14s el %4.1f  az %5.1f\n",
                  s.name.c_str(), s.elevationDeg, s.azimuthDeg);
  }
  if (snap.passCount > 0) {
    const UpcomingPass &p = snap.passes[0];
    Serial.printf("Next pass: %s @ %s  max el %.0f  %s\n",
                  p.name.c_str(), p.aosTime.c_str(), p.maxElevationDeg,
                  p.visible ? "(VISIBLE)" : "");
  }
  if (snap.warning.length() > 0) {
    Serial.printf("! %s\n", snap.warning.c_str());
  }
}

void renderSnapshot(const SkySnapshot &snap, const DeviceConfig &cfg) {
  renderSerial(snap);

#ifdef USE_TFT
  tft.fillScreen(TFT_BLACK);
  // Range rings + cardinal marks.
  for (int i = 1; i <= 3; i++) tft.drawCircle(CX, CY, (R * i) / 3, TFT_DARKGREY);
  tft.drawLine(CX, CY - R, CX, CY + R, TFT_DARKGREY);
  tft.drawLine(CX - R, CY, CX + R, CY, TFT_DARKGREY);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("N", CX - 3, 2, 2);

  // Flights: position by bearing, radius by distance/range.
  for (size_t i = 0; i < snap.flightCount; i++) {
    const Flight &f = snap.flights[i];
    float rr = cfg.flightRangeKm > 0 ? f.distanceKm / (float)cfg.flightRangeKm : 1.0f;
    if (rr > 1.0f) rr = 1.0f;
    int16_t x, y;
    polarToXY(f.bearingDeg, rr, x, y);
    tft.fillCircle(x, y, 3, TFT_YELLOW);
  }

  // Satellites: sky-dome view — azimuth = bearing, radius = (90-elevation)/90
  // so the zenith is the centre and the horizon is the rim.
  for (size_t i = 0; i < snap.satCount; i++) {
    const SatOverhead &s = snap.sats[i];
    float rr = (90.0f - s.elevationDeg) / 90.0f;
    int16_t x, y;
    polarToXY(s.azimuthDeg, rr, x, y);
    tft.fillTriangle(x, y - 4, x - 4, y + 3, x + 4, y + 3, TFT_CYAN);
  }

  // Next-pass banner.
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  if (snap.passCount > 0) {
    const UpcomingPass &p = snap.passes[0];
    String line = p.name + " el" + String((int)p.maxElevationDeg);
    if (p.visible) line += " *";
    tft.drawString(line, 12, CY + R - 18, 2);
  }
#else
  (void)cfg;
#endif
}

void renderStatus(const String &message) {
  Serial.printf("[status] %s\n", message.c_str());
#ifdef USE_TFT
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString(message, 10, 110, 2);
#endif
}
