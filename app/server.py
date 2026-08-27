import logging
import os

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.mqtt_client import start_background
from app.state import state

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Meshtastic Live Dashboard")

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def on_startup():
    if os.environ.get("DISABLE_MQTT") == "true":
        logging.getLogger("server").info("MQTT disabled via DISABLE_MQTT")
        return
    start_background()


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/api/state")
def api_state():
    return JSONResponse(state.snapshot())


@app.get("/", response_class=HTMLResponse)
def index():
    with open(os.path.join(STATIC_DIR, "index.html")) as f:
        return f.read()
