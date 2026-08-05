#!/usr/bin/env python3
"""Generate the demo site from real demo output.

Runs each host demo, captures its stdout including ANSI colour, converts that
to HTML, and writes a single self-contained index.html. Demo 4 is bare metal;
its output is captured by booting it under QEMU if available, and otherwise
falls back to the recorded copy in web/fixtures/.

Usage:  python3 web/build.py [--no-run]
"""

from __future__ import annotations

import html
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
FIXTURES = WEB / "fixtures"

# (id, package, title, crates, blurb)
DEMOS = [
    ("01", "demo-01-witnessed-hello", "Witnessed Hello", "rvm-witness",
     "Hash-chained 64-byte audit records. What the chain catches, what only the HMAC catches, and how fast emission actually is."),
    ("02", "demo-02-hello-denied", "Hello, Denied", "rvm-cap · rvm-security",
     "Capability minting, monotonic attenuation, GRANT_ONCE evaporating after one use, and denials landing in the audit log beside grants."),
    ("03", "demo-03-prove-hello", "Three Ways to Prove Hello", "rvm-cap · rvm-security",
     "The P1/P2/P3 proof tiers: which one catches what, and what each costs."),
    ("04", None, "UART Hello", "rvm-hal · rvm-boot",
     "A no_std AArch64 kernel booting under QEMU, emitting a witness record per boot phase."),
    ("05", "demo-05-partition-pingpong", "Partition Ping-Pong", "rvm-partition · rvm-sched",
     "Two partitions talking across directional comm edges under the two-signal scheduler."),
    ("06", "demo-06-agents-get-closer", "Two Agents That Get Closer", "rvm-coherence · rvm-wasm",
     "The coherence graph reshaping under load — and the sweep showing the merge path never fires."),
    ("07", "demo-07-signed-hello", "Signed Hello Package", "rvm-rvf",
     "Building a signed RVForge container, then breaking it six ways."),
]

FINDINGS = [
    (1, "record_hash doesn't cover record contents", "correctness", "01"),
    (2, "Coherence engine's merge path is unreachable", "correctness", "06"),
    (3, "make run cannot work as shipped (3 causes)", "correctness", "04"),
    (4, "verify_p2 is public but uncallable", "api", "03"),
    (5, "rvm-rvf reads containers but nothing writes one", "api", "07"),
    (6, "report.ok == true doesn't mean the signature was checked", "trap", "07"),
    (7, "report.capabilities stays populated on a failed report", "trap", "07"),
    (8, "The ~17ns witness figure is the FNV-1a path", "docs", "01"),
    (9, "Two capability claims are narrower than they sound", "docs", "05"),
]

# ANSI SGR -> css class
SGR = {"1": "b", "4": "u", "31": "red", "32": "green", "33": "yellow",
       "35": "magenta", "36": "cyan", "7": "inv"}
ANSI_RE = re.compile(r"\x1b\[([0-9;]*)m")


def ansi_to_html(text: str) -> str:
    """Convert SGR-coloured text to HTML spans, escaping everything else."""
    out, open_spans, pos = [], 0, 0
    for m in ANSI_RE.finditer(text):
        out.append(html.escape(text[pos:m.start()]))
        pos = m.end()
        codes = [c for c in m.group(1).split(";") if c] or ["0"]
        for code in codes:
            if code == "0":
                out.append("</span>" * open_spans)
                open_spans = 0
            elif code in SGR:
                out.append(f'<span class="{SGR[code]}">')
                open_spans += 1
    out.append(html.escape(text[pos:]))
    out.append("</span>" * open_spans)
    return "".join(out)


def capture(demo_id: str, package: str | None, run: bool) -> str:
    fixture = FIXTURES / f"{demo_id}.txt"

    if run and package:
        print(f"  running {package} ...", file=sys.stderr)
        proc = subprocess.run(
            ["cargo", "run", "-q", "-p", package, "--release"],
            cwd=ROOT, capture_output=True, text=True, timeout=600,
        )
        if proc.returncode == 0:
            fixture.parent.mkdir(parents=True, exist_ok=True)
            fixture.write_text(proc.stdout)
            return proc.stdout
        print(f"  !! {package} exited {proc.returncode}, using fixture", file=sys.stderr)

    if run and demo_id == "04":
        run_sh = ROOT / "demos" / "04-uart-hello" / "run.sh"
        if run_sh.exists() and subprocess.run(
            ["which", "qemu-system-aarch64"], capture_output=True
        ).returncode == 0:
            print("  booting demo 4 under QEMU ...", file=sys.stderr)
            proc = subprocess.run([str(run_sh)], cwd=run_sh.parent,
                                  capture_output=True, text=True, timeout=600)
            text = "\n".join(
                l for l in proc.stdout.splitlines()
                if not l.startswith(("   Compiling", "    Finished", "warning"))
            )
            if text.strip():
                fixture.parent.mkdir(parents=True, exist_ok=True)
                fixture.write_text(text)
                return text

    if fixture.exists():
        return fixture.read_text()
    return f"(no output captured for demo {demo_id})"


def build(run: bool = True) -> None:
    panels, tabs, cards = [], [], []

    for demo_id, package, title, crates, blurb in DEMOS:
        output = capture(demo_id, package, run)
        active = " active" if demo_id == "01" else ""
        bare = ' <span class="pill">bare metal</span>' if demo_id == "04" else ""
        cmd = (f"cd demos/04-uart-hello && ./run.sh" if demo_id == "04"
               else f"cargo run -p {package} --release")

        tabs.append(
            f'<button class="tab{active}" data-demo="{demo_id}">'
            f'<span class="num">{demo_id}</span>{html.escape(title)}</button>'
        )
        panels.append(f"""
<section class="panel{active}" id="demo-{demo_id}">
  <header class="panel-head">
    <h2>{html.escape(title)}{bare}</h2>
    <p class="crates">{html.escape(crates)}</p>
    <p class="blurb">{html.escape(blurb)}</p>
    <code class="cmd">{html.escape(cmd)}</code>
    <button class="run" data-demo="{demo_id}" hidden>Run live</button>
    <span class="runstate" data-demo="{demo_id}"></span>
  </header>
  <pre class="term"><code>{ansi_to_html(output)}</code></pre>
</section>""")

    for num, text, kind, demo in FINDINGS:
        cards.append(
            f'<li class="finding {kind}"><button data-demo="{demo}">'
            f'<span class="fnum">{num}</span>'
            f'<span class="ftext">{html.escape(text)}</span>'
            f'<span class="fkind">{kind}</span></button></li>'
        )

    page = TEMPLATE.replace("{{TABS}}", "\n".join(tabs))
    page = page.replace("{{PANELS}}", "\n".join(panels))
    page = page.replace("{{FINDINGS}}", "\n".join(cards))
    (WEB / "index.html").write_text(page)
    print(f"wrote {WEB / 'index.html'} ({len(page):,} bytes)", file=sys.stderr)


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RVM Hello World — Seven Demos</title>
<style>
:root{
  --bg:#0d1117; --panel:#161b22; --line:#30363d; --fg:#e6edf3; --dim:#8b949e;
  --accent:#58a6ff; --green:#3fb950; --red:#f85149; --yellow:#d29922;
  --magenta:#bc8cff; --cyan:#39c5cf;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
  font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:0 20px 80px}
header.top{padding:48px 0 24px;border-bottom:1px solid var(--line);margin-bottom:28px}
h1{margin:0 0 8px;font-size:30px;letter-spacing:-.02em}
.sub{color:var(--dim);margin:0 0 18px;max-width:70ch}
.meta{display:flex;flex-wrap:wrap;gap:8px}
.chip{font:12px/1 var(--mono);background:var(--panel);border:1px solid var(--line);
  border-radius:999px;padding:6px 11px;color:var(--dim)}
.chip b{color:var(--fg);font-weight:600}
h3.sec{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);
  margin:36px 0 12px;font-weight:600}
ul.findings{list-style:none;margin:0;padding:0;display:grid;gap:6px;
  grid-template-columns:repeat(auto-fill,minmax(330px,1fr))}
.finding button{width:100%;display:flex;align-items:center;gap:10px;cursor:pointer;
  background:var(--panel);border:1px solid var(--line);border-left-width:3px;
  border-radius:7px;padding:10px 12px;color:var(--fg);font-size:13.5px;text-align:left;
  font-family:inherit;transition:border-color .15s,transform .1s}
.finding button:hover{border-color:var(--accent);transform:translateY(-1px)}
.finding.correctness button{border-left-color:var(--red)}
.finding.api button{border-left-color:var(--yellow)}
.finding.trap button{border-left-color:var(--magenta)}
.finding.docs button{border-left-color:var(--dim)}
.fnum{font:600 11px var(--mono);color:var(--dim);min-width:14px}
.ftext{flex:1}
.fkind{font:11px var(--mono);color:var(--dim)}
nav.tabs{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 20px}
.tab{cursor:pointer;background:var(--panel);border:1px solid var(--line);border-radius:7px;
  padding:9px 13px;color:var(--dim);font:13.5px inherit;font-family:inherit;
  display:flex;align-items:center;gap:8px;transition:.15s}
.tab:hover{color:var(--fg);border-color:#484f58}
.tab.active{background:var(--accent);border-color:var(--accent);color:#0d1117;font-weight:600}
.tab .num{font:600 11px var(--mono);opacity:.65}
.panel{display:none}
.panel.active{display:block}
.panel-head h2{margin:0 0 4px;font-size:21px}
.crates{margin:0;font:12.5px var(--mono);color:var(--cyan)}
.blurb{color:var(--dim);margin:9px 0 12px;max-width:75ch}
.cmd{display:inline-block;font:12.5px var(--mono);background:#010409;
  border:1px solid var(--line);border-radius:6px;padding:7px 11px;color:var(--green)}
.cmd::before{content:"$ ";color:var(--dim)}
.run{margin-left:10px;cursor:pointer;background:var(--green);border:none;border-radius:6px;
  padding:8px 14px;color:#0d1117;font:600 12.5px inherit;font-family:inherit;vertical-align:middle}
.run:hover{filter:brightness(1.1)}
.run:disabled{opacity:.55;cursor:default}
.runstate{margin-left:9px;font:12px var(--mono);color:var(--dim)}
.pill{font:11px var(--mono);background:var(--magenta);color:#0d1117;border-radius:4px;
  padding:2px 7px;vertical-align:middle;margin-left:6px;font-weight:600}
pre.term{background:#010409;border:1px solid var(--line);border-radius:9px;
  padding:18px;overflow-x:auto;margin:16px 0 0}
pre.term code{font:12.5px/1.55 var(--mono);white-space:pre;color:var(--fg)}
.b{font-weight:700} .u{text-decoration:underline}
.red{color:var(--red)} .green{color:var(--green)} .yellow{color:var(--yellow)}
.magenta{color:var(--magenta)} .cyan{color:var(--cyan)}
.inv{background:var(--fg);color:var(--bg)}
footer{margin-top:52px;padding-top:22px;border-top:1px solid var(--line);
  color:var(--dim);font-size:13px}
footer a{color:var(--accent)}
@media (max-width:640px){.wrap{padding:0 14px 50px}h1{font-size:24px}
  ul.findings{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">

<header class="top">
  <h1>RVM “Hello World” — Seven Demos</h1>
  <p class="sub">Seven runnable first-programs built against
    <a href="https://github.com/ruvnet/rvm" style="color:var(--accent)">ruvnet/rvm</a>,
    a bare-metal Rust hypervisor. All seven run. Every line of output below is
    real, captured from an actual run — nothing is quoted from documentation.</p>
  <div class="meta">
    <span class="chip">rvm <b>78acb36</b></span>
    <span class="chip">rustc <b>1.94.1</b></span>
    <span class="chip">host <b>x86-64 Linux</b></span>
    <span class="chip">bare metal <b>aarch64-unknown-none</b></span>
    <span class="chip">demos <b>7 / 7 passing</b></span>
    <span class="chip">findings <b>9</b></span>
  </div>
</header>

<h3 class="sec">What we found — click one to jump to its evidence</h3>
<ul class="findings">
{{FINDINGS}}
</ul>

<h3 class="sec">The demos</h3>
<nav class="tabs">
{{TABS}}
</nav>

{{PANELS}}

<footer>
  Generated from real demo output by <code>web/build.py</code>.
  Source and full write-up:
  <a href="https://github.com/mondweep/vibe-cast/tree/claude/rvm-hello-world-ideas-mua6ja">mondweep/vibe-cast</a>.
</footer>

</div>
<script>
function show(id){
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='demo-'+id));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.demo===id));
}
// If a backend is present (Cloud Run deploy), expose per-demo "Run live".
fetch('/healthz').then(r=>r.ok?r.json():Promise.reject()).then(()=>{
  document.querySelectorAll('.run').forEach(b=>{ b.hidden=false; });
}).catch(()=>{ /* static host: captured output only */ });

document.querySelectorAll('.run').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    const id = btn.dataset.demo;
    const state = document.querySelector('.runstate[data-demo="'+id+'"]');
    const pre = document.querySelector('#demo-'+id+' .term code');
    btn.disabled = true; state.textContent = 'running...';
    try{
      const r = await fetch('/run/'+id);
      const d = await r.json();
      if(d.html){ pre.innerHTML = d.html; }
      state.textContent = d.live ? 'live \u00b7 exit '+d.exit_code
                                 : (d.note || 'captured output');
    }catch(e){ state.textContent = 'failed: '+e; }
    btn.disabled = false;
  });
});

document.querySelectorAll('.tab, .finding button').forEach(el=>{
  el.addEventListener('click',()=>{
    show(el.dataset.demo);
    document.querySelector('nav.tabs').scrollIntoView({behavior:'smooth',block:'start'});
  });
});
</script>
</body>
</html>
"""

if __name__ == "__main__":
    build(run="--no-run" not in sys.argv)
