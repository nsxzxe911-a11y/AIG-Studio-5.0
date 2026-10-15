import hmac
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header
from fastapi.responses import HTMLResponse, JSONResponse

from sql_store import SqlCommandStore

ALLOWED_COMMANDS = frozenset({"WINDOWS_AI_UPDATE", "DUAL_ANDROID_UPDATE", "RESUME_463", "NOX_STATUS", "NOX_START"})


def _authorized(authorization: str | None, expected: str) -> bool:
    if not expected or not authorization or not authorization.startswith("Bearer "):
        return False
    supplied = authorization[7:]
    return bool(supplied) and hmac.compare_digest(supplied, expected)


def build_default_store():
    url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if not url:
        return None
    return SqlCommandStore.from_url(url)


def create_app(store: Any = None) -> FastAPI:
    app = FastAPI(title="AIG Remote Command Bridge")
    command_store = store
    control_page = Path(__file__).resolve().parent / "templates" / "control.html"
    auth_configured = bool(os.environ.get("AIG_CONTROLLER_TOKEN")) and bool(os.environ.get("AIG_AGENT_TOKEN"))
    print(
        "AIG_REMOTE_READINESS "
        f"STORE={'READY' if command_store is not None else 'MISSING'} "
        f"AUTH={'READY' if auth_configured else 'MISSING'} "
        "PRIMARY=WEB_TO_DUAL_ANDROID_FAST_LOOP",
        flush=True,
    )

    @app.get("/health")
    def health():
        store_configured = command_store is not None
        current_auth_configured = bool(os.environ.get("AIG_CONTROLLER_TOKEN")) and bool(os.environ.get("AIG_AGENT_TOKEN"))
        return {
            "status": "ok",
            "ready": store_configured and current_auth_configured,
            "store_configured": store_configured,
            "auth_configured": current_auth_configured,
            "primary_path": "WEB_TO_DUAL_ANDROID_FAST_LOOP",
        }

    @app.get("/control", response_class=HTMLResponse)
    def control():
        return HTMLResponse(control_page.read_text(encoding="utf-8"))

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

    @app.post("/api/agent/heartbeat")
    def agent_heartbeat(payload: dict[str, Any], authorization: str | None = Header(default=None)):
        if not _authorized(authorization, os.environ.get("AIG_AGENT_TOKEN", "")):
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        if command_store is None:
            return JSONResponse({"error": "store_unavailable"}, status_code=503)
        agent_id = str(payload.get("agent_id") or "").strip()
        if not agent_id:
            return JSONResponse({"error": "invalid_agent_id"}, status_code=400)
        command_store.heartbeat(agent_id)
        return {"status": "online", "agent_id": agent_id}

    @app.get("/api/agent/status/{agent_id}")
    def agent_status(agent_id: str, authorization: str | None = Header(default=None)):
        if not _authorized(authorization, os.environ.get("AIG_CONTROLLER_TOKEN", "")):
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        if command_store is None:
            return JSONResponse({"error": "store_unavailable"}, status_code=503)
        return command_store.agent_status(agent_id)

    @app.post("/api/agent/poll")
    def agent_poll(payload: dict[str, Any], authorization: str | None = Header(default=None)):
        if not _authorized(authorization, os.environ.get("AIG_AGENT_TOKEN", "")):
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        if command_store is None:
            return JSONResponse({"error": "store_unavailable"}, status_code=503)
        agent_id = str(payload.get("agent_id") or "").strip()
        if not agent_id:
            return JSONResponse({"error": "invalid_agent_id"}, status_code=400)
        return {"command": command_store.lease_next(agent_id)}

    @app.post("/api/agent/result")
    def agent_result(payload: dict[str, Any], authorization: str | None = Header(default=None)):
        if not _authorized(authorization, os.environ.get("AIG_AGENT_TOKEN", "")):
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        if command_store is None:
            return JSONResponse({"error": "store_unavailable"}, status_code=503)
        command_id = str(payload.get("command_id") or "").strip()
        status = str(payload.get("status") or "").strip()
        if not command_id or status not in {"succeeded", "failed"}:
            return JSONResponse({"error": "invalid_result"}, status_code=400)
        record = command_store.complete(command_id, status, str(payload.get("summary") or ""))
        if record is None:
            return JSONResponse({"error": "not_found"}, status_code=404)
        return record

    return app


app = create_app(build_default_store())
