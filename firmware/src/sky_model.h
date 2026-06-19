// In-memory model of the gateway's Sky Snapshot (ADR-0008). Fixed-capacity
// arrays keep heap usage predictable on the ESP32.
#pragma once
#include <Arduino.h>

static const size_t MAX_FLIGHTS = 16;
static const size_t MAX_SATS = 12;
static const size_t MAX_PASSES = 6;

struct Flight {
  String icao24;
  String callsign;
  float distanceKm = 0;
  float bearingDeg = 0;
  float baroAltitudeM = 0;
  bool onGround = false;
};

struct SatOverhead {
  String name;
  long noradId = 0;
  float azimuthDeg = 0;
  float elevationDeg = 0;
  float rangeKm = 0;
};

struct UpcomingPass {
  String name;
  String aosTime;   // ISO-8601 string from the gateway
  float maxElevationDeg = 0;
  long durationSeconds = 0;
  bool visible = false;
};

struct SkySnapshot {
  String observedAt;
  Flight flights[MAX_FLIGHTS];
  size_t flightCount = 0;
  SatOverhead sats[MAX_SATS];
  size_t satCount = 0;
  UpcomingPass passes[MAX_PASSES];
  size_t passCount = 0;
  String warning;  // first warning, if any
};
