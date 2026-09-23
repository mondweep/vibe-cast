# Stage 2: control the LED from a phone browser (Android/iOS, no app).
# The board runs its own Wi-Fi hotspot, so no home-network credentials are needed.
#   1. Join Wi-Fi "TinyC6" (password below) on the phone
#   2. Open http://192.168.4.1 in Chrome
import json
import time

import board
import digitalio
import neopixel
import socketpool
import wifi

AP_SSID = "TinyC6"
AP_PASSWORD = "tinyc6blink"

power = digitalio.DigitalInOut(board.NEOPIXEL_POWER)
power.direction = digitalio.Direction.OUTPUT
power.value = True
pixel = neopixel.NeoPixel(board.NEOPIXEL, 1, brightness=0.2, auto_write=True, pixel_order=neopixel.RGB)

state = {"mode": "blink", "period_ms": 500, "color": "#00ff00"}

PAGE = """<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">
<title>TinyC6</title><body style="font-family:sans-serif;max-width:420px;margin:1em auto;padding:0 1em">
<h2>TinyC6 LED</h2>
<p><button onclick="s({mode:'blink'})">Blink</button>
<button onclick="s({mode:'on'})">On</button>
<button onclick="s({mode:'off'})">Off</button></p>
<p>Period: <input id=p type=range min=100 max=2000 step=50 value=500
 oninput="q.textContent=this.value;s({period_ms:+this.value})"> <span id=q>500</span> ms</p>
<p>Colour: <input type=color value="#00ff00" onchange="s({color:this.value})"></p>
<pre id=o></pre>
<script>
function s(d){fetch('/api/control',{method:'POST',body:JSON.stringify(d)})
.then(r=>r.json()).then(j=>o.textContent=JSON.stringify(j))}
</script>"""


def hex_to_rgb(h):
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))


def respond(conn, status, ctype, body):
    data = body.encode()
    head = "HTTP/1.1 %s\r\nContent-Type: %s\r\nContent-Length: %d\r\nConnection: close\r\n\r\n" % (
        status,
        ctype,
        len(data),
    )
    payload = memoryview(head.encode() + data)
    while payload:
        sent = conn.send(payload)
        payload = payload[sent:]


def handle(conn):
    conn.settimeout(2)
    buf = bytearray(1024)
    n = conn.recv_into(buf)
    req = bytes(buf[:n]).decode("utf-8", "ignore")
    line = req.split("\r\n", 1)[0].split(" ")
    method, path = line[0], line[1] if len(line) > 1 else "/"
    if method == "POST" and path == "/api/control":
        try:
            update = json.loads(req.split("\r\n\r\n", 1)[1])
            if update.get("mode") in ("blink", "on", "off"):
                state["mode"] = update["mode"]
            if "period_ms" in update:
                state["period_ms"] = max(50, min(5000, int(update["period_ms"])))
            if "color" in update:
                hex_to_rgb(update["color"])  # validate
                state["color"] = update["color"]
            print("control:", state)
            respond(conn, "200 OK", "application/json", json.dumps(state))
        except (ValueError, IndexError, KeyError, TypeError):
            respond(conn, "400 Bad Request", "application/json", '{"error":"bad request"}')
    elif path == "/api/state":
        respond(conn, "200 OK", "application/json", json.dumps(state))
    else:
        respond(conn, "200 OK", "text/html", PAGE)


wifi.radio.start_ap(ssid=AP_SSID, password=AP_PASSWORD)
print("AP up:", AP_SSID, "http://%s" % wifi.radio.ipv4_address_ap)
pool = socketpool.SocketPool(wifi.radio)
server = pool.socket(pool.AF_INET, pool.SOCK_STREAM)
server.setsockopt(pool.SOL_SOCKET, pool.SO_REUSEADDR, 1)
server.bind(("0.0.0.0", 80))
server.listen(2)
server.settimeout(0)  # non-blocking so the LED keeps blinking

lit, last = False, time.monotonic()
while True:
    try:
        conn, _ = server.accept()
        try:
            handle(conn)
        except OSError as e:
            print("client error:", e)
        finally:
            conn.close()
    except OSError:
        pass  # no client waiting

    if state["mode"] == "on":
        pixel[0] = hex_to_rgb(state["color"])
    elif state["mode"] == "off":
        pixel[0] = (0, 0, 0)
    elif time.monotonic() - last >= state["period_ms"] / 2000:
        last, lit = time.monotonic(), not lit
        pixel[0] = hex_to_rgb(state["color"]) if lit else (0, 0, 0)
    time.sleep(0.01)
