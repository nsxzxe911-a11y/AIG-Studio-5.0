import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from store import MemoryCommandStore

UTC = timezone.utc
BASE = datetime(2026, 10, 15, 0, 0, tzinfo=UTC)


def test_fifo_enqueue_and_15_minute_ttl():
    s = MemoryCommandStore(now=lambda: BASE)
    a = s.enqueue("NOX_STATUS")
    b = s.enqueue("NOX_START")
    assert a["status"] == "queued"
    assert b["status"] == "queued"
    assert datetime.fromisoformat(a["expires_at"]) - datetime.fromisoformat(a["created_at"]) == timedelta(minutes=15)
    assert s.lease_next("agent-1")["id"] == a["id"]
    assert s.lease_next("agent-1")["id"] == b["id"]


def test_lease_is_90_seconds_and_retries_after_expiry():
    current = [BASE]
    s = MemoryCommandStore(now=lambda: current[0])
    cmd = s.enqueue("NOX_STATUS")
    leased = s.lease_next("agent-1")
    assert leased["status"] == "leased"
    assert datetime.fromisoformat(leased["lease_until"]) - current[0] == timedelta(seconds=90)
    assert s.lease_next("agent-2") is None
    current[0] += timedelta(seconds=91)
    redelivered = s.lease_next("agent-2")
    assert redelivered["id"] == cmd["id"]
    assert redelivered["attempts"] == 2


def test_expired_command_is_never_leased():
    current = [BASE]
    s = MemoryCommandStore(now=lambda: current[0])
    cmd = s.enqueue("NOX_STATUS")
    current[0] += timedelta(minutes=16)
    assert s.lease_next("agent-1") is None
    assert s.get(cmd["id"])["status"] == "expired"


def test_duplicate_completion_is_idempotent_and_not_redelivered():
    s = MemoryCommandStore(now=lambda: BASE)
    cmd = s.enqueue("NOX_STATUS")
    s.lease_next("agent-1")
    first = s.complete(cmd["id"], "succeeded", "ok")
    second = s.complete(cmd["id"], "failed", "should-not-replace")
    assert first["status"] == "succeeded"
    assert second["status"] == "succeeded"
    assert second["result_summary"] == "ok"
    assert s.lease_next("agent-1") is None
