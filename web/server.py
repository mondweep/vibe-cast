#!/usr/bin/env python3
"""Tiny server for the Cloud Run deployment.

Serves the static site, plus /run/<id> which executes a demo binary live and
returns its output as HTML. Only the six host demos are runnable; demo 4 is
bare metal and always served from its captured fixture.

Not needed for the Netlify deploy -- that publishes web/ as pure static files.
"""

from __future__ import annotations

import http.server
import json
import os
import socketserver
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build import ansi_to_html  # noqa: E402

WEB = Path(__file__).resolve().parent
BIN = Path(os.environ.get("DEMO_BIN_DIR", "/app/bin"))
PORT = int(os.environ.get("PORT", "8080"))
TIMEOUT_S = 60

RUNNABLE = {
    "01": "demo-01-witnessed-hello",
    "02": "demo-02-hello-denied",
    "03": "demo-03-prove-hello",
    "05": "demo-05-partition-pingpong",
    "06": "demo-06-agents-get-closer",
    "07": "demo-07-signed-hello",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(WEB), **kw)

    def log_message(self, fmt, *args):  # quieter logs
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/healthz":
            return self._json(200, {"ok": True})

        if self.path.startswith("/run/"):
            demo_id = self.path[len("/run/"):].strip("/")

            if demo_id == "04":
                fixture = WEB / "fixtures" / "04.txt"
                text = fixture.read_text() if fixture.exists() else "(not captured)"
                return self._json(200, {
                    "id": demo_id, "live": False,
                    "note": "demo 4 is bare metal; showing captured QEMU boot output",
                    "html": ansi_to_html(text),
                })

            package = RUNNABLE.get(demo_id)
            if package is None:
                return self._json(404, {"error": f"unknown demo {demo_id!r}"})

            exe = BIN / package
            if not exe.exists():
                return self._json(503, {"error": f"{package} not built into this image"})

            try:
                proc = subprocess.run([str(exe)], capture_output=True, text=True,
                                      timeout=TIMEOUT_S)
            except subprocess.TimeoutExpired:
                return self._json(504, {"error": f"{package} exceeded {TIMEOUT_S}s"})

            return self._json(200, {
                "id": demo_id, "live": True, "exit_code": proc.returncode,
                "html": ansi_to_html(proc.stdout + proc.stderr),
            })

        return super().do_GET()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("", PORT), Handler) as httpd:
        print(f"serving on :{PORT}", file=sys.stderr)
        httpd.serve_forever()
