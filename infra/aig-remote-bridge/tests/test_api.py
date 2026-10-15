import sys
from datetime import datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import create_app
from store import MemoryCommandStore


def make_client(monkeypatch):
    monkeypatch.setenv("AIG_CONTROLLER_TOKEN", "controller-secret")
    monkeypatch.setenv("AIG_AGENT_TOKEN", "agent-secret")
    return TestClient(create_app(MemoryCommandStore()))


def auth(token="controller-secret"):
    return {"Authorization": f"Bearer {token}"}


def agent_auth(token="agent-secret"):
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
    created = datetime.fromisoformat(body["created_at"])
    expires = datetime.fromisoformat(body["expires_at"])
    assert timedelta(minutes=14, seconds=59) <= expires - created <= timedelta(minutes=15, seconds=1)


def test_windows_ai_update_direct_trigger_is_whitelisted(monkeypatch):
    c = make_client(monkeypatch)
    r = c.post("/api/commands", json={"name": "WINDOWS_AI_UPDATE"}, headers=auth())
    assert r.status_code == 202
    body = r.json()
    assert body["name"] == "WINDOWS_AI_UPDATE"
    assert body["status"] == "queued"


def test_dual_android_update_fast_loop_trigger_is_whitelisted(monkeypatch):
    c = make_client(monkeypatch)
    r = c.post("/api/commands", json={"name": "DUAL_ANDROID_UPDATE"}, headers=auth())
    assert r.status_code == 202
    body = r.json()
    assert body["name"] == "DUAL_ANDROID_UPDATE"
    assert body["status"] == "queued"


def test_aig_dual_ai_update_is_canonical_whitelisted_trigger(monkeypatch):
    c = make_client(monkeypatch)
    r = c.post("/api/commands", json={"name": "AIG_DUAL_AI_UPDATE"}, headers=auth())
    assert r.status_code == 202
    body = r.json()
    assert body["name"] == "AIG_DUAL_AI_UPDATE"
    assert body["status"] == "queued"


def test_get_command_requires_controller_token(monkeypatch):
    c = make_client(monkeypatch)
    queued = c.post("/api/commands", json={"name": "NOX_STATUS"}, headers=auth()).json()
    assert c.get(f"/api/commands/{queued['id']}").status_code == 401
    r = c.get(f"/api/commands/{queued['id']}", headers=auth())
    assert r.status_code == 200
    assert r.json()["id"] == queued["id"]


def test_agent_token_is_isolated_from_controller_token(monkeypatch):
    c = make_client(monkeypatch)
    r = c.post("/api/agent/heartbeat", json={"agent_id": "DESKTOP-6KOFHUK"}, headers=auth())
    assert r.status_code == 401


def test_agent_heartbeat(monkeypatch):
    c = make_client(monkeypatch)
    r = c.post("/api/agent/heartbeat", json={"agent_id": "DESKTOP-6KOFHUK"}, headers=agent_auth())
    assert r.status_code == 200
    assert r.json()["status"] == "online"
    assert r.json()["agent_id"] == "DESKTOP-6KOFHUK"


def test_agent_poll_leases_next_command(monkeypatch):
    c = make_client(monkeypatch)
    queued = c.post("/api/commands", json={"name": "NOX_STATUS"}, headers=auth()).json()
    r = c.post("/api/agent/poll", json={"agent_id": "DESKTOP-6KOFHUK"}, headers=agent_auth())
    assert r.status_code == 200
    assert r.json()["command"]["id"] == queued["id"]
    assert r.json()["command"]["status"] == "leased"


def test_agent_result_success_and_failure(monkeypatch):
    c = make_client(monkeypatch)
    queued = c.post("/api/commands", json={"name": "NOX_STATUS"}, headers=auth()).json()
    c.post("/api/agent/poll", json={"agent_id": "DESKTOP-6KOFHUK"}, headers=agent_auth())
    ok = c.post("/api/agent/result", json={"command_id": queued["id"], "status": "succeeded", "summary": "device"}, headers=agent_auth())
    assert ok.status_code == 200
    assert ok.json()["status"] == "succeeded"

    queued2 = c.post("/api/commands", json={"name": "NOX_START"}, headers=auth()).json()
    c.post("/api/agent/poll", json={"agent_id": "DESKTOP-6KOFHUK"}, headers=agent_auth())
    fail = c.post("/api/agent/result", json={"command_id": queued2["id"], "status": "failed", "summary": "nox missing"}, headers=agent_auth())
    assert fail.status_code == 200
    assert fail.json()["status"] == "failed"


def test_agent_result_summary_is_truncated(monkeypatch):
    c = make_client(monkeypatch)
    queued = c.post("/api/commands", json={"name": "NOX_STATUS"}, headers=auth()).json()
    c.post("/api/agent/poll", json={"agent_id": "DESKTOP-6KOFHUK"}, headers=agent_auth())
    r = c.post("/api/agent/result", json={"command_id": queued["id"], "status": "succeeded", "summary": "x" * 5000}, headers=agent_auth())
    assert r.status_code == 200
    assert len(r.json()["result_summary"]) == 4096


def test_controller_can_read_agent_online_status(monkeypatch):
    c = make_client(monkeypatch)
    c.post('/api/agent/heartbeat', json={'agent_id': 'DESKTOP-6KOFHUK'}, headers=agent_auth())
    assert c.get('/api/agent/status/DESKTOP-6KOFHUK').status_code == 401
    r = c.get('/api/agent/status/DESKTOP-6KOFHUK', headers=auth())
    assert r.status_code == 200
    assert r.json()['online'] is True


def test_control_page_is_aig_web_migration_without_remote_controls(monkeypatch):
    c = make_client(monkeypatch)
    r = c.get('/control')
    assert r.status_code == 200
    text = r.text
    assert 'AIG 雙專案 AI 更新' in text
    assert 'https://aig-studio-rgb-runtime.onrender.com/updates/' in text
    assert 'CURRENT STABLE RETAINED' in text
    for forbidden in ['WINDOWS_AI_UPDATE', 'DUAL_ANDROID_UPDATE', 'RESUME_463', 'NOX_STATUS', 'NOX_START', 'DESKTOP-6KOFHUK', 'Controller token', 'localStorage']:
        assert forbidden not in text
    assert 'controller-secret' not in text
    assert 'agent-secret' not in text


def test_runtime_store_uses_database_url(monkeypatch):
    import app as app_module
    marker = object()
    seen = {}
    monkeypatch.setenv('DATABASE_URL', 'postgresql://example/db')
    monkeypatch.setattr(app_module.SqlCommandStore, 'from_url', lambda url: seen.setdefault(url, marker))
    assert app_module.build_default_store() is marker
    assert 'postgresql://example/db' in seen


def test_health_reports_not_ready_without_store_or_tokens(monkeypatch):
    monkeypatch.delenv('AIG_CONTROLLER_TOKEN', raising=False)
    monkeypatch.delenv('AIG_AGENT_TOKEN', raising=False)
    c = TestClient(create_app(None))
    body = c.get('/health').json()
    assert body['status'] == 'ok'
    assert body['ready'] is False
    assert body['store_configured'] is False
    assert body['auth_configured'] is False


def test_health_reports_ready_with_store_and_both_tokens(monkeypatch):
    monkeypatch.setenv('AIG_CONTROLLER_TOKEN', 'controller-secret')
    monkeypatch.setenv('AIG_AGENT_TOKEN', 'agent-secret')
    c = TestClient(create_app(MemoryCommandStore()))
    body = c.get('/health').json()
    assert body['status'] == 'ok'
    assert body['ready'] is True
    assert body['store_configured'] is True
    assert body['auth_configured'] is True
