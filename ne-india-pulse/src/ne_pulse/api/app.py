"""FastAPI application — read API + server-rendered dashboard.

Composition root: wires the GDELT raw-file gateway into PulseService. The
service can be overridden in tests via `create_app(service=...)`.
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from ..analytics.service import PulseService, UnknownScopeError
from ..domain.snapshot import REGION_SCOPE
from ..ingestion.gdelt_raw import GdeltRawFileGateway
from ..reference.states import NE_STATES
from .dto import snapshot_to_dict

_TEMPLATES = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


def _default_service() -> PulseService:
    hours = float(os.getenv("PULSE_WINDOW_HOURS", "6"))
    return PulseService(GdeltRawFileGateway(window_hours=hours))


def create_app(service: PulseService | None = None) -> FastAPI:
    service = service or _default_service()
    app = FastAPI(title="NE India Pulse", version="0.1.0")

    @app.get("/health")
    def health() -> dict:
        # NB: not "/healthz" — Google Front End reserves that path on *.run.app.
        return {"status": "ok"}

    @app.get("/api/snapshot")
    def api_snapshot(scope: str = REGION_SCOPE) -> JSONResponse:
        try:
            snap = service.snapshot(scope)
        except UnknownScopeError:
            raise HTTPException(status_code=404, detail=f"Unknown scope: {scope}") from None
        return JSONResponse(snapshot_to_dict(snap))

    @app.get("/", response_class=HTMLResponse)
    def dashboard(request: Request, scope: str = REGION_SCOPE) -> HTMLResponse:
        try:
            snap = service.snapshot(scope)
        except UnknownScopeError:
            raise HTTPException(status_code=404, detail=f"Unknown scope: {scope}") from None
        return _TEMPLATES.TemplateResponse(
            request,
            "dashboard.html",
            {"s": snap, "states": list(NE_STATES.values()), "region": REGION_SCOPE},
        )

    return app


app = create_app()
