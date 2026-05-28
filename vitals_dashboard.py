#!/usr/bin/env python3
"""
Cognitum ESP32 WiFi-CSI — live vitals dashboard.

Tails the on-Seed CSI bridge's verbose log over SSH (no load on the pegged
store API), decodes each 8-dim feature vector into physical units per the
RuView feature spec, and serves a per-node dashboard at http://localhost:8765 .

Run:  python3 vitals_dashboard.py   →   open http://localhost:8765
Requires: bridge running with --verbose (it is), SSH key access to the Seed.
"""
import json, re, subprocess, threading, time, http.server, socketserver
from collections import deque, defaultdict

SEED = "genesis@cognitum-2c3c.local"
PORT = 8765
HIST = 240  # samples of history per node (~ a few minutes)

LINE = re.compile(r"node=(\d+).*?features=\[([0-9.eE+\- ,]+)\]")
nodes = defaultdict(lambda: {"latest": None, "t": 0, "n": 0,
                             "hist": deque(maxlen=HIST)})
status = {"state": "connecting"}
lock = threading.Lock()


def decode(f):
    """8-dim feature vector -> physical units (per RuView spec §7.1)."""
    return {
        "presence":   round(f[0], 3),               # 0..1  (reliable)
        "motion":     round(f[1], 3),               # 0..1  (reliable)
        "breathing_bpm": round(f[2] * 30, 1),       # reliable vital
        "heart_bpm":  round(f[3] * 120, 1),         # BROKEN (canned)
        "phase_var":  round(f[4], 3),               # binarized
        "persons":    round(f[5] * 4, 1),           # BROKEN (saturated)
        "fall":       int(round(f[6])),             # 0/1 (reliable)
        "rssi_dbm":   round(f[7] * 100 - 100, 0),   # reliable
    }


def tail_loop():
    while True:
        try:
            p = subprocess.Popen(
                ["ssh", "-o", "BatchMode=yes", "-o", "ServerAliveInterval=15",
                 SEED, "sudo journalctl -u csi-bridge.service -f -n 0 --output=cat"],
                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            with lock:
                status["state"] = "live"
            for line in p.stdout:
                m = LINE.search(line)
                if not m:
                    continue
                nid = int(m.group(1))
                try:
                    f = [float(x) for x in m.group(2).split(",")]
                except ValueError:
                    continue
                if len(f) != 8:
                    continue
                d = decode(f)
                with lock:
                    n = nodes[nid]
                    n["latest"] = d
                    n["t"] = time.time()
                    n["n"] += 1
                    n["hist"].append({"presence": d["presence"],
                                      "motion": d["motion"],
                                      "breathing": d["breathing_bpm"]})
        except Exception:
            pass
        with lock:
            status["state"] = "reconnecting"
        time.sleep(2)


HTML = """<!doctype html><html><head><meta charset="utf-8">
<title>Cognitum WiFi-CSI Vitals — Live</title><style>
:root{--bg:#0b0f17;--card:#131a26;--bd:#1f2a3a;--t1:#e6edf3;--t2:#8b98a9;
--ok:#3fb950;--cyan:#39d0d8;--amber:#ffb454;--red:#f85149}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t1);
font-family:-apple-system,Segoe UI,Roboto,sans-serif}
header{padding:14px 20px;border-bottom:1px solid var(--bd);display:flex;gap:12px;align-items:center}
h1{font-size:16px;margin:0}.dot{width:10px;height:10px;border-radius:50%;background:#555}
.dot.live{background:var(--ok);box-shadow:0 0 8px var(--ok)}.dot.reconnecting{background:var(--amber)}
.grid{display:flex;gap:18px;padding:20px;flex-wrap:wrap}
.node{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px;width:430px}
.node h2{margin:0 0 4px;font-size:15px}.sub{color:var(--t2);font-size:11px;margin-bottom:12px}
.big{display:flex;gap:18px;margin-bottom:12px}
.metric{flex:1}.metric .v{font-size:30px;font-weight:600;font-variant-numeric:tabular-nums}
.metric .l{color:var(--t2);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.unit{font-size:13px;color:var(--t2);font-weight:400}
.bars div{margin:7px 0;font-size:12px;display:flex;align-items:center;gap:8px}
.bars .lab{width:90px;color:var(--t2)}.bar{flex:1;height:8px;background:#0e1622;border-radius:4px;overflow:hidden}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--cyan),var(--ok))}
.bars .val{width:64px;text-align:right;font-variant-numeric:tabular-nums}
.flag{color:var(--red);font-size:10px;margin-left:6px}
.flag.warn{color:var(--amber)}
canvas{width:100%;height:60px;background:#0e1622;border-radius:6px;margin-top:6px}
.empty{color:var(--t2);font-size:13px;padding:30px;text-align:center}
.foot{color:var(--t2);font-size:11px;padding:0 20px 20px;line-height:1.6}
</style></head><body>
<header><span class="dot" id="dot"></span><h1>Cognitum WiFi-CSI — live vitals</h1>
<span id="st" style="color:var(--t2);font-size:12px"></span></header>
<div class="grid" id="grid"><div class="empty">waiting for ESP32 data…</div></div>
<div class="foot">
Source: ESP32 CSI → on-Seed bridge (live, ~1&nbsp;Hz/node). Reliable channels:
presence, motion, <b>breathing rate</b>, fall, RSSI.
<span class="flag">red</span> = firmware-broken (heart rate canned 40/48; person-count saturated at 4);
<span class="flag warn">amber</span> = low-information (phase variance binarised).
</div>
<script>
function bar(lab,v,max,extra){const p=Math.max(0,Math.min(100,100*v/max));
 return `<div><span class="lab">${lab}</span><span class="bar"><i style="width:${p}%"></i></span>`
 +`<span class="val">${v}${extra||""}</span></div>`;}
function spark(cv,hist){const c=cv.getContext("2d"),W=cv.width=cv.clientWidth,H=cv.height=60;
 c.clearRect(0,0,W,H);if(!hist.length)return;
 ["motion","presence"].forEach((k,ki)=>{c.beginPath();
  hist.forEach((h,i)=>{const x=W*i/(hist.length-1||1),y=H-4-(H-8)*Math.min(1,h[k]);
   i?c.lineTo(x,y):c.moveTo(x,y);});
  c.strokeStyle=ki?"rgba(57,208,216,.7)":"rgba(63,185,80,.9)";c.lineWidth=1.5;c.stroke();});}
async function tick(){
 let d;try{d=await(await fetch("/data",{cache:"no-store"})).json();}catch(e){return;}
 document.getElementById("dot").className="dot "+(d.status||"");
 document.getElementById("st").textContent=d.status+" · "+Object.keys(d.nodes).length+" node(s)";
 const g=document.getElementById("grid");
 const ids=Object.keys(d.nodes).sort();
 if(!ids.length){g.innerHTML='<div class="empty">waiting for ESP32 data…</div>';return;}
 g.innerHTML=ids.map(id=>{const n=d.nodes[id],m=n.latest||{};const age=Math.floor(Date.now()/1000-n.t);
  return `<div class="node"><h2>ESP32 node ${id}</h2>
   <div class="sub">${n.n} packets · last ${age}s ago</div>
   <div class="big">
     <div class="metric"><div class="v">${(m.breathing_bpm??0).toFixed(1)} <span class="unit">BPM</span></div><div class="l">Breathing rate</div></div>
     <div class="metric"><div class="v">${m.presence>0.5?"Yes":"No"}</div><div class="l">Presence (${(m.presence??0).toFixed(2)})</div></div>
   </div>
   <div class="bars">
     ${bar("Presence",(m.presence??0),1)}
     ${bar("Motion",(m.motion??0),1)}
     ${bar("Breathing",(m.breathing_bpm??0),30," BPM")}
     <div><span class="lab">Heart rate<span class="flag">broken</span></span><span class="bar"><i style="width:0"></i></span><span class="val">${(m.heart_bpm??0)} BPM</span></div>
     <div><span class="lab">Persons<span class="flag">broken</span></span><span class="bar"><i style="width:0"></i></span><span class="val">${(m.persons??0)}</span></div>
     <div><span class="lab">Phase var<span class="flag warn">1-bit</span></span><span class="bar"><i style="width:0"></i></span><span class="val">${(m.phase_var??0)}</span></div>
     <div><span class="lab">Fall</span><span class="bar"><i style="width:0"></i></span><span class="val">${m.fall? "⚠ FALL":"no"}</span></div>
     <div><span class="lab">RSSI</span><span class="bar"><i style="width:0"></i></span><span class="val">${(m.rssi_dbm??0)} dBm</span></div>
   </div>
   <canvas id="sp${id}"></canvas>
   <div class="sub" style="margin-top:4px">▇ motion (green) · ▇ presence (cyan) — recent history</div>
   </div>`;}).join("");
 ids.forEach(id=>{const cv=document.getElementById("sp"+id);if(cv)spark(cv,d.nodes[id].hist);});
}
setInterval(tick,1000);tick();
</script></body></html>"""


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        return

    def do_GET(self):
        if self.path.startswith("/data"):
            with lock:
                payload = {"status": status["state"],
                           "nodes": {str(k): {"latest": v["latest"], "t": v["t"],
                                              "n": v["n"], "hist": list(v["hist"])}
                                     for k, v in nodes.items()}}
            body = json.dumps(payload).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
        else:
            body = HTML.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    threading.Thread(target=tail_loop, daemon=True).start()
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), H) as s:
        print(f"Vitals dashboard -> http://localhost:{PORT}  (Ctrl+C to stop)")
        s.serve_forever()
