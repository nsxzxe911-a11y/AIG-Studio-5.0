import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sql_store import SqlCommandStore

UTC = timezone.utc
BASE = datetime(2026, 10, 15, 0, 0, tzinfo=UTC)


def make_store(current):
    return SqlCommandStore.from_url('sqlite+pysqlite:///:memory:', now=lambda: current[0])


def test_sql_store_fifo_ttl_lease_retry_and_completion():
    current = [BASE]
    s = make_store(current)
    a = s.enqueue('NOX_STATUS')
    b = s.enqueue('NOX_START')
    assert datetime.fromisoformat(a['expires_at']) - datetime.fromisoformat(a['created_at']) == timedelta(minutes=15)
    first = s.lease_next('agent-1')
    assert first['id'] == a['id']
    assert first['attempts'] == 1
    current[0] += timedelta(seconds=91)
    retry = s.lease_next('agent-2')
    assert retry['id'] == a['id']
    assert retry['attempts'] == 2
    done = s.complete(a['id'], 'succeeded', 'ok')
    assert done['status'] == 'succeeded'
    assert s.complete(a['id'], 'failed', 'replace')['status'] == 'succeeded'
    assert s.lease_next('agent-1')['id'] == b['id']


def test_sql_store_expiry_and_heartbeat():
    current = [BASE]
    s = make_store(current)
    cmd = s.enqueue('NOX_STATUS')
    s.heartbeat('DESKTOP-6KOFHUK')
    assert s.agent_status('DESKTOP-6KOFHUK')['online'] is True
    current[0] += timedelta(seconds=91)
    assert s.agent_status('DESKTOP-6KOFHUK')['online'] is False
    current[0] = BASE + timedelta(minutes=16)
    assert s.lease_next('agent-1') is None
    assert s.get(cmd['id'])['status'] == 'expired'
