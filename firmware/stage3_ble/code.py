# Stage 3: Bluetooth LE — advertise, connect, exchange values (no Wi-Fi, no router).
# Phone: nRF Connect for Mobile -> scan "TinyC6-LED" -> Connect -> open the service
#   UUID ...def0 -> characteristic ...def1 (2 bytes, little-endian, milliseconds):
#     write 0x01F4 (500) = blink every 500 ms    write 0x0000 = LED off
#   Read/notify shows the current period. Colour shows the link state:
#     blue = advertising (waiting), green = connected.
import struct
import time

import _bleio
import board
import digitalio
import neopixel

NAME = "TinyC6-LED"
SVC_UUID = _bleio.UUID("12345678-1234-5678-1234-56789abcdef0")
CHR_UUID = _bleio.UUID("12345678-1234-5678-1234-56789abcdef1")

power = digitalio.DigitalInOut(board.NEOPIXEL_POWER)
power.direction = digitalio.Direction.OUTPUT
power.value = True
pixel = neopixel.NeoPixel(board.NEOPIXEL, 1, brightness=0.2, auto_write=True, pixel_order=neopixel.RGB)

adapter = _bleio.adapter
adapter.stop_advertising()  # the built-in BLE workflow may already be advertising

service = _bleio.Service(SVC_UUID)
period = _bleio.Characteristic.add_to_service(
    service,
    CHR_UUID,
    properties=_bleio.Characteristic.READ | _bleio.Characteristic.WRITE | _bleio.Characteristic.NOTIFY,
    max_length=2,
    fixed_length=True,
    initial_value=struct.pack("<H", 500),
)

# Advertising payload is limited to 31 bytes: flags + name here, 128-bit UUID in the scan response.
adv = bytes([2, 0x01, 0x06, len(NAME) + 1, 0x09]) + NAME.encode()
scan_rsp = bytes([17, 0x07]) + bytes(SVC_UUID.uuid128)


def advertise():
    adapter.start_advertising(adv, scan_response=scan_rsp, connectable=True, interval=0.1)
    print("advertising as", NAME, adapter.address)


advertise()
current_ms, lit, last, was_connected = 500, False, time.monotonic(), False

while True:
    connected = adapter.connected
    if connected != was_connected:
        was_connected = connected
        print("connected" if connected else "disconnected")
        if not connected:
            advertise()

    value = struct.unpack("<H", period.value)[0]
    if value != current_ms:
        current_ms = value
        print("period_ms =", current_ms)
        if connected:
            period.value = struct.pack("<H", current_ms)  # re-publish so notify subscribers see it

    colour = (0, 255, 0) if connected else (0, 0, 255)
    if current_ms == 0:
        pixel[0] = (0, 0, 0)
    elif time.monotonic() - last >= current_ms / 2000:
        last, lit = time.monotonic(), not lit
        pixel[0] = colour if lit else (0, 0, 0)
    time.sleep(0.01)
