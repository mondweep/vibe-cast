// Renders a Sky Snapshot. Serial output is always available; a round-display
// radar view is compiled in when -DUSE_TFT is set (see platformio.ini).
#pragma once
#include "config.h"
#include "sky_model.h"

void renderInit();
void renderSnapshot(const SkySnapshot &snap, const DeviceConfig &cfg);
void renderStatus(const String &message);
