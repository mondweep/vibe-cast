#!/usr/bin/env python3
"""
RuView WiFi DensePose — live dashboard.

Streams the DensePose cog's output log off the Seed over SSH (avoids the
agent's busy HTTP API) and serves a local skeleton visualiser at
http://localhost:8765 . Pure stdlib.

Run:  python3 ruview_dashboard.py
Then open http://localhost:8765 in a browser.
"""
import json, subprocess, threading, time, http.server, socketserver

SEED = "genesis@cognitum-2c3c.local"
LOG  = "/var/lib/cognitum/apps/ruview-densepose/output.log"
PORT = 8765

_latest = {"status": "connecting", "keypoints": [], "avg_confidence": 0,
           "raw_features": 0, "timestamp": 0, "rx": 0}
_lock = threading.Lock()


def tail_loop():
    """Persistent `tail -f` over SSH; parse keypoint JSON lines."""
    rx = 0
    while True:
        try:
            p = subprocess.Popen(
                ["ssh", "-o", "BatchMode=yes", "-o", "ServerAliveInterval=15",
                 "-o", "ServerAliveCountMax=3", SEED, f"tail -n 1 -f {LOG}"],
                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            for line in p.stdout:
                line = line.strip()
                if not line.startswith("{"):
                    continue
                try:
                    d = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if "keypoints" in d:
                    rx += 1
                    d["status"] = "live"
                    d["rx"] = rx
                    with _lock:
                        _latest.clear()
                        _latest.update(d)
        except Exception:
            pass
        with _lock:
            _latest["status"] = "reconnecting"
        time.sleep(2)


HTML = """<!doctype html><html><head><meta charset="utf-8">
<title>RuView WiFi DensePose — Live</title>
<style>
  :root{--bg:#0b0f17;--card:#131a26;--cyan:#39d0d8;--amber:#ffb454;--t1:#e6edf3;--t2:#8b98a9;--green:#3fb950}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--t1);
    font-family:-apple-system,Segoe UI,Roboto,sans-serif}
  header{padding:14px 20px;border-bottom:1px solid #1f2a3a;display:flex;align-items:center;gap:12px}
  h1{font-size:16px;margin:0;font-weight:600}
  .dot{width:10px;height:10px;border-radius:50%;background:#555}
  .dot.live{background:var(--green);box-shadow:0 0 8px var(--green)}
  .dot.reconnecting{background:var(--amber)}
  .wrap{display:flex;gap:20px;padding:20px;flex-wrap:wrap}
  canvas{background:#0e1420;border:1px solid #1f2a3a;border-radius:10px}
  .panel{background:var(--card);border:1px solid #1f2a3a;border-radius:10px;padding:16px;min-width:230px}
  .row{display:flex;justify-content:space-between;margin:8px 0;font-size:13px}
  .row .k{color:var(--t2)} .row .v{font-family:ui-monospace,Menlo,monospace}
  .bar{height:8px;background:#1f2a3a;border-radius:4px;overflow:hidden;margin-top:4px}
  .bar>div{height:100%;background:linear-gradient(90deg,var(--amber),var(--cyan))}
  .note{color:var(--t2);font-size:11px;margin-top:14px;line-height:1.5}
</style></head><body>
<header>
  <span class="dot" id="dot"></span>
  <h1>RuView WiFi DensePose — live skeleton</h1>
  <span id="status" style="color:var(--t2);font-size:12px"></span>
</header>
<div class="wrap">
  <canvas id="cv" width="360" height="480"></canvas>
  <div class="panel">
    <div class="row"><span class="k">Source</span><span class="v">ESP32 CSI → Seed</span></div>
    <div class="row"><span class="k">Keypoints</span><span class="v" id="nkp">–</span></div>
    <div class="row"><span class="k">Raw features</span><span class="v" id="rawf">–</span></div>
    <div class="row"><span class="k">Frames rx</span><span class="v" id="rx">0</span></div>
    <div class="row"><span class="k">Avg confidence</span><span class="v" id="confv">–</span></div>
    <div class="bar"><div id="confbar" style="width:0%"></div></div>
    <div class="row" style="margin-top:14px"><span class="k">Last frame</span><span class="v" id="age">–</span></div>
    <p class="note">Full-body pose inferred from WiFi CSI (no camera). On v0.6.x
    firmware this is <b>coarse</b> — joints are low-resolution and noisy. Move
    in/out of the line between an ESP32 node and the AP to see it react.</p>
  </div>
</div>
<script>
const KP=["nose","left_eye","right_eye","left_ear","right_ear","left_shoulder",
"right_shoulder","left_elbow","right_elbow","left_wrist","right_wrist","left_hip",
"right_hip","left_knee","right_knee","left_ankle","right_ankle"];
const BONES=[["left_shoulder","right_shoulder"],["left_shoulder","left_elbow"],
["left_elbow","left_wrist"],["right_shoulder","right_elbow"],["right_elbow","right_wrist"],
["left_shoulder","left_hip"],["right_shoulder","right_hip"],["left_hip","right_hip"],
["left_hip","left_knee"],["left_knee","left_ankle"],["right_hip","right_knee"],
["right_knee","right_ankle"],["nose","left_eye"],["nose","right_eye"],
["left_eye","left_ear"],["right_eye","right_ear"],["left_shoulder","nose"],["right_shoulder","nose"]];
const cv=document.getElementById("cv"),ctx=cv.getContext("2d"),W=cv.width,H=cv.height;
const M=28; // margin
function px(x){return M+x*(W-2*M);} function py(y){return M+y*(H-2*M);}
function draw(d){
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle="#16202e";ctx.lineWidth=1;
  for(let i=0;i<=10;i++){let g=M+i*(W-2*M)/10;ctx.beginPath();ctx.moveTo(g,M);ctx.lineTo(g,H-M);ctx.stroke();}
  const m={}; (d.keypoints||[]).forEach(k=>m[k.name]=k);
  // bones
  BONES.forEach(([a,b])=>{const ka=m[a],kb=m[b];if(!ka||!kb)return;
    const c=Math.min(ka.confidence,kb.confidence);if(c<0.12)return;
    ctx.strokeStyle="rgba(57,208,216,"+(0.25+0.7*c)+")";ctx.lineWidth=2+2*c;
    ctx.beginPath();ctx.moveTo(px(ka.x),py(ka.y));ctx.lineTo(px(kb.x),py(kb.y));ctx.stroke();});
  // joints
  (d.keypoints||[]).forEach(k=>{if(k.confidence<0.08)return;
    ctx.beginPath();ctx.arc(px(k.x),py(k.y),3+5*k.confidence,0,7);
    ctx.fillStyle="rgba(255,180,84,"+(0.4+0.6*k.confidence)+")";ctx.fill();});
}
async function tick(){
  try{
    const r=await fetch("/data",{cache:"no-store"});const d=await r.json();
    const live=d.status==="live";
    document.getElementById("dot").className="dot "+(d.status||"");
    document.getElementById("status").textContent=d.status||"";
    document.getElementById("nkp").textContent=d.num_keypoints||(d.keypoints?d.keypoints.length:"–");
    document.getElementById("rawf").textContent=d.raw_features||"–";
    document.getElementById("rx").textContent=d.rx||0;
    const c=d.avg_confidence||0;
    document.getElementById("confv").textContent=(c*100).toFixed(0)+"%";
    document.getElementById("confbar").style.width=(c*100).toFixed(0)+"%";
    if(d.timestamp){const age=Math.max(0,Math.floor(Date.now()/1000-d.timestamp));
      document.getElementById("age").textContent=age+"s ago";}
    if(d.keypoints&&d.keypoints.length)draw(d);
  }catch(e){document.getElementById("status").textContent="dashboard offline";}
}
setInterval(tick,400);tick();
</script></body></html>"""


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.startswith("/data"):
            with _lock:
                body = json.dumps(_latest).encode()
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
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as s:
        print(f"RuView dashboard -> http://localhost:{PORT}  (Ctrl+C to stop)")
        s.serve_forever()
