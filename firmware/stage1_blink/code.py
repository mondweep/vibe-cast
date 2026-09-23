# Stage 1: blink the TinyC6 NeoPixel (GPIO + timing).
# The LED rail is switched by NEOPIXEL_POWER, so it must be driven high first.
import time

import board
import digitalio
import neopixel

power = digitalio.DigitalInOut(board.NEOPIXEL_POWER)
power.direction = digitalio.Direction.OUTPUT
power.value = True

pixel = neopixel.NeoPixel(board.NEOPIXEL, 1, brightness=0.2, auto_write=True, pixel_order=neopixel.RGB)

# (period_ms, colour): slow red, medium green, fast blue
STEPS = [(1000, (255, 0, 0)), (500, (0, 255, 0)), (250, (0, 0, 255))]
BLINKS_PER_STEP = 4

while True:
    for period_ms, colour in STEPS:
        print("period_ms =", period_ms)
        for _ in range(BLINKS_PER_STEP):
            pixel[0] = colour
            time.sleep(period_ms / 2000)
            pixel[0] = (0, 0, 0)
            time.sleep(period_ms / 2000)
