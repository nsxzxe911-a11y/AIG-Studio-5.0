import hmac
import os
from typing import Any

from fastapi import FastAPI, Header
from fastapi.responses import JSONResponse

ALLOWED_COMMANDS = frozenset({"NOX_STATUS", "NOX_START", "RESUME_463"})


def _authorized(authorization: str | None, expected: str) -> bool:
    if not expected or not authorization or not authorization.startswith("Bearer "):
        return False
    supplied = authorization[7:]
    return bool(supplied) and hmac.compare_digest(supplied, expected)


def create_app(store: Any = None) -> FastAPI:
    app = FastAPI(title="AIG Remote Command Bridge")
    command_store = store

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/api/commands")
    def enqueue_command(payload: dict[str, Any], authorization: str | None = Header(default=None)):
        if not _authorized(authorization, os.environ.get("AIG_CONTROLLER_TOKEN", "")):
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        name = payload.get("name")
        if name not in ALLOWED_COMMANDS:
            return JSONResponse({"error": "unsupported_command"}, status_code=400)
        if command_store is None:
            return JSONResponse({"error": "store_unavailable"}, status_code=503)
        return JSONResponse(command_store.enqueue(name), status_code=202)

    @app.get("/api/commands/{command_id}")
    def get_command(command_id: str, authorization: str | None = Header(default=None)):
        if not _authorized(authorization, os.environ.get("AIG_CONTROLLER_TOKEN", "")):
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        if command_store is None:
            return JSONResponse({"error": "store_unavailable"}, status_code=503)
        record = command_store.get(command_id)
        if record is None:
            return JSONResponse({"error": "not_found"}, status_code=404)
        return record

    return app


app = create_app()
