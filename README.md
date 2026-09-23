# C6-hacking

Exploration and project work on an **Unexpected Maker TinyC6** (Espressif ESP32-C6)
connected over USB-C.

## Aim

Learn what this board can actually do, then build on it — starting with what runs
today under CircuitPython, and working toward the capability that justifies choosing
a C6 over a C3/S3: the **IEEE 802.15.4 radio** (Thread / Matter / Zigbee).

Working principle for this repo: **verify against the hardware, don't trust the
datasheet.** Everything in the table below was read off the device itself.

## Hardware

| Property | Value | Source |
|---|---|---|
| Chip | ESP32-C6 (QFN40) rev v0.0 | `esptool` |
| Board | `unexpectedmaker_tinyc6` | firmware `board.board_id` |
| CPU | RISC-V @160 MHz + separate LP core @20 MHz | esptool / `microcontroller.cpu` |
| RAM | 512 KB SRAM (~242 KB free at CircuitPython runtime) | `gc.mem_free()` |
| Flash | 8 MB Winbond (`ef:4017`); 4 MB exposed as filesystem | `flash-id`, `os.statvfs` |
| Radios | Wi-Fi 6 (802.11ax), BT 5 LE, **IEEE 802.15.4** | esptool feature bits |
| USB | USB-Serial/JTAG (native, **no OTG**) | esptool |
| Base MAC | `40:4c:ca:51:64:88` | esptool |
| Port | `/dev/cu.usbmodem*` — **varies per replug** (seen as `2101`, `101`) | macOS |

Vendor specs (from Unexpected Maker docs, not device-verified): 35 x 17.8 mm,
USB-C with reverse back-feed protection, 700 mA 3.3 V LDO, LiPo charging via JST
pads on the back, VBAT + 5 V presence sensing, 17 GPIO, 3D high-gain antenna.
A u.FL external-antenna variant also exists.

### Exposed pins

`A0 A1 A2 A3 A5 A6` · `D0`–`D21` · `I2C`/`SDA`/`SCL` · `SPI`/`MOSI`/`MISO`/`SCK` ·
`UART`/`TX`/`RX` · `NEOPIXEL` + `NEOPIXEL_POWER` · `BATTERY` / `VBAT_SENSE` /
`VBUS_SENSE` / `VOLTAGE_MONITOR`

## Current board state

Factory-fresh. Running **CircuitPython 10.2.1** (built 2026-05-13) with the stock
Unexpected Maker demo. Nothing custom has been flashed.

On-board files: `code.py` (rainbow NeoPixel demo), `tinyc6.py` (vendor helpers),
`lib/` (empty), `settings.toml` (empty — no Wi-Fi credentials), `boot_out.txt`,
`test_results.txt` (factory Wi-Fi test: PASS, 5.835 s connect).

### `tinyc6.py` helpers (already on the board)

| Function | Purpose |
|---|---|
| `set_pixel_power(state)` | Cut power to the RGB LED entirely — the deep-sleep trick |
| `get_battery_voltage()` | LiPo voltage via onboard divider (`adc.value / 5371`, 1S 4.2 V max) |
| `get_vbus_present()` | Detect USB 5 V — lets code behave differently on battery |
| `rgb_color_wheel(pos)` | Rainbow helper |

## Constraints worth knowing up front

- **No `CIRCUITPY` drag-and-drop drive, ever.** The C6's USB is Serial/JTAG only and
  physically cannot present mass storage. Move files via the serial REPL
  (`ampy`, `circup`, Thonny/Mu) or CircuitPython's **Web Workflow** over Wi-Fi.
- **`esptool` puts the board into safe mode.** It drives GPIO9/BOOT low to enter
  download mode; CircuitPython reads that as "BOOT button held" and refuses to run
  `code.py`. Press reset to clear. Nothing is broken.
- **Wi-Fi 6 battery savings need a WPA3/802.11ax AP.** Target Wake Time only helps on
  a modern access point; on an older AP this behaves like any 2.4 GHz board.
- **~242 KB free RAM** is ample for sensors, but rules out heavy buffering or
  TLS-heavy multi-connection work under CircuitPython.
- **Matter/Thread/Zigbee cannot be done in CircuitPython** — they need ESP-IDF.

## Project catalogue

### Tier 1 — runs today (CircuitPython, no installs)

| # | Project | Notes |
|---|---|---|
| 1 | Battery-powered environmental sensor | I²C sensor + Wi-Fi post + deep sleep; switchable LED rail makes multi-month life realistic |
| 2 | BLE sensor / beacon | Already advertising as `CIRCUITPY51648a`; phone-readable, no network needed |
| 3 | Web Workflow dev box | Wi-Fi creds in `settings.toml` → browser-based editing; the proper answer to having no USB drive |
| 4 | Battery-health logger | Log `get_battery_voltage()` across a full discharge to 4 MB flash; tells you real runtime before deploying |
| 5 | Analog data logger | `A0`–`A6` + 4 MB storage; fully offline |

### Tier 2 — the reason to own a C6 (needs ESP-IDF >= 5.1)

| # | Project | Notes |
|---|---|---|
| 6 | **Matter over Wi-Fi** | No Border Router needed. Pairs with Apple/Google Home over existing Wi-Fi. Easiest route into Matter |
| 7 | **Matter over Thread** | Full low-power IPv6 mesh. Needs a Thread Border Router (Apple TV 4K, HomePod mini, Nest Hub 2nd gen, Echo 4th gen+) |
| 8 | Zigbee device or router | Same 802.15.4 radio; pairs with Zigbee2MQTT / Home Assistant |
| 9 | 802.15.4 / BLE wireless research | Sniffing, scanning, monitor mode. Own hardware and networks only |

**Thread vs Matter:** Thread is the *network* (low-power IPv6 mesh on 802.15.4 —
the road). Matter is the *application layer* (device model, commissioning, security —
the language spoken on it). Matter runs over Thread, Wi-Fi or Ethernet; BLE handles
initial commissioning in all cases.

### Suggested order

**#4 → #1.** Measure the real battery curve first, then design the sensor's sleep
intervals around measured data instead of guesses. Then #6 or #7 depending on whether
a Thread Border Router is available.

## Toolchain status

| Tool | State |
|---|---|
| `esptool` 5.2.0 | installed — read/flash/identify |
| `python3` + `pyserial` 3.5 | installed — REPL scripting |
| `idf.py` (ESP-IDF) | **missing** — required for Tier 2 |
| `espflash` / `cargo-espflash` | missing |

ESP-IDF is a multi-GB install; check free disk before starting Tier 2.

## Working with the board

```bash
# resolve the port first — the number changes between replugs
PORT=$(ls /dev/cu.usbmodem* | head -1)

# identify chip / flash
esptool --port "$PORT" chip-id
esptool --port "$PORT" flash-id

# serial REPL (Ctrl-C to interrupt, Ctrl-D to reload)
screen "$PORT" 115200
```

Note: if a serial open returns `Errno 6: Device not configured`, toggle DTR and retry —
the CDC endpoint sometimes needs a settle on first open.

**Back up `code.py` and `tinyc6.py` into this repo before overwriting them** — with no
USB drive, the factory demo is only recoverable over serial.

## Repo layout

| Path | Contents |
|---|---|
| `README.md` | this file — hardware, constraints, project catalogue |
| `usecase.md` | session record: findings, corrections, unresolved items |
| `firmware/factory/` | **byte-exact backup of the as-shipped board** (`code.py`, `tinyc6.py`) — restore point, since there is no USB drive to copy them off |
| `firmware/stage1_blink/` | NeoPixel blink — GPIO + the switched `NEOPIXEL_POWER` rail |
| `firmware/stage2_web_control/` | board runs its own Wi-Fi AP (`TinyC6`), phone browser controls the LED at `http://192.168.4.1` — no home network needed |
| `firmware/stage3_ble/` | BLE service: advertise, connect, read/write blink period (nRF Connect) |
| `scripts/cp_repl.py` | raw-REPL client (`exec`/`get`/`put`/`ls`) — the file-transfer workaround for having no `CIRCUITPY` drive |

## Repo tooling

Initialised with agentic-kit (`ak`): ruflo 3.42.4 + agentic-qe 3.14.2, project memory
at `.swarm/memory.db`, hierarchical-mesh swarm config (see `CLAUDE.md`). The Ruflo MCP
server registers under the name **`claude-flow`**, not `ruflo`.
