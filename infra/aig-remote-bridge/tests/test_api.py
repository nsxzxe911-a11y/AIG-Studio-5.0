import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import create_app


class MemoryStore:
    def __init__(self):
        self.commands = {}
        self.seq = 0

    def enqueue(self, name):
        self.seq += 1
        cid = f"cmd-{self.seq}"
        now = datetime.now(timezone.utc)
        rec = {
            "id": cid,
            "name": name,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(minutes=15)).isoformat(),
            "status": "queued",
        }
        self.commands[cid] = rec
        return rec

    def get(self, cid):
        return self.commands.get(cid)


def make_client(monkeypatch):
    monkeypatch.setenv("AIG_CONTROLLER_TOKEN", "controller-secret")
    monkeypatch.setenv("AIG_AGENT_TOKEN", "agent-secret")
    return TestClient(create_app(MemoryStore()))


def auth(token="controller-secret"):
    return {"Authorization": f"Bearer {token}"}


def test_health_is_public(monkeypatch):
    c = make_client(monkeypatch)
    r = c.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_missing_or_wrong_controller_token_is_401(monkeypatch):
    c = make_client(monkeypatch)
    assert c.post("/api/commands", json={"name": "NOX_STATUS"}).status_code == 401
    assert c.post("/api/commands", json={"name": "NOX_STATUS"}, headers=auth("wrong")).status_code == 401


def test_unknown_command_is_rejected(monkeypatch):
    c = make_client(monkeypatch)
    r = c.post("/api/commands", json={"name": "SHELL"}, headers=auth())
    assert r.status_code == 400
    assert r.json()["error"] == "unsupported_command"


def test_valid_nox_status_queues_with_15_minute_expiry(monkeypatch):
    c = make_client(monkeypatch)
    r = c.post("/api/commands", json={"name": "NOX_STATUS"}, headers=auth())
    assert r.status_code == 202
    body = r.json()
    assert body["name"] == "NOX_STATUS"
    assert body["status"] == "queued"
    assert body["id"].startswith("cmd-")
    created = datetime.fromisoformat(body["created_at"])
    expires = datetime.fromisoformat(body["expires_at"])
    assert timedelta(minutes=14, seconds=59) <= expires - created <= timedelta(minutes=15, seconds=1)


def test_get_command_requires_controller_token(monkeypatch):
    c = make_client(monkeypatch)
    queued = c.post("/api/commands", json={"name": "NOX_STATUS"}, headers=auth()).json()
    assert c.get(f"/api/commands/{queued['id']}").status_code == 401
    r = c.get(f"/api/commands/{queued['id']}", headers=auth())
    assert r.status_code == 200
    assert r.json()["id"] == queued["id"]
