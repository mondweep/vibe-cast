import logging
import os
import threading
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.mqtt_client import NotConnected, publish_text, start_background
from app.state import state

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Meshtastic Live Dashboard")

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Simple per-IP + global rate limit so this app stays a good citizen on the
# shared public MQTT broker (no auth in front of /api/send otherwise).
_RATE_LOCK = threading.Lock()
_last_send_by_ip = {}
_last_send_global = 0.0
MIN_SECONDS_BETWEEN_SENDS_PER_IP = 10
MIN_SECONDS_BETWEEN_SENDS_GLOBAL = 2


class SendMessageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=180)


@app.on_event("startup")
def on_startup():
    if os.environ.get("DISABLE_MQTT") == "true":
        logging.getLogger("server").info("MQTT disabled via DISABLE_MQTT")
        return
    start_background()


@app.get("/health")
def health():
    # NB: "/healthz" is intercepted by Google's frontend on *.run.app domains
    # before it reaches the container, so this endpoint deliberately avoids it.
    return {"ok": True}


@app.get("/api/state")
def api_state():
    return JSONResponse(state.snapshot())


@app.post("/api/send")
def api_send(req: SendMessageRequest, request: Request):
    global _last_send_global
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    with _RATE_LOCK:
        if now - _last_send_global < MIN_SECONDS_BETWEEN_SENDS_GLOBAL:
            raise HTTPException(status_code=429, detail="Slow down, sending too fast globally.")
        last_ip = _last_send_by_ip.get(client_ip, 0.0)
        if now - last_ip < MIN_SECONDS_BETWEEN_SENDS_PER_IP:
            raise HTTPException(status_code=429, detail="Slow down, please wait before sending again.")
        _last_send_by_ip[client_ip] = now
        _last_send_global = now

    try:
        publish_text(req.text)
    except NotConnected:
        raise HTTPException(status_code=503, detail="Not connected to the mesh MQTT broker yet.")

    return {"ok": True}


@app.get("/", response_class=HTMLResponse)
def index():
    with open(os.path.join(STATIC_DIR, "index.html")) as f:
        return f.read()
