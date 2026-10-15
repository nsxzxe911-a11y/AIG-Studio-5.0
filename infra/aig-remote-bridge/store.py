from __future__ import annotations

import copy
import json
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Callable, Any

UTC = timezone.utc
COMMAND_TTL = timedelta(minutes=15)
LEASE_TTL = timedelta(seconds=90)
RESULT_MAX = 4096
FINAL = {"succeeded", "failed", "expired"}


def _iso(dt: datetime) -> str:
    return dt.astimezone(UTC).isoformat()


def _dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def _empty_state() -> dict[str, Any]:
    return {"commands": {}, "queue": [], "heartbeats": {}}


class _CommandSemantics:
    def __init__(self, now: Callable[[], datetime] | None = None):
        self._now = now or (lambda: datetime.now(UTC))

    def _mutate(self, fn):
        raise NotImplementedError

    def _expire_and_requeue(self, state: dict[str, Any], now: datetime) -> None:
        queue = state["queue"]
        for cid, rec in list(state["commands"].items()):
            expires_at = _dt(rec.get("expires_at"))
            if rec.get("status") not in FINAL and expires_at and now >= expires_at:
                rec["status"] = "expired"
                rec["lease_until"] = None
                rec["leased_by"] = None
                state["queue"] = [x for x in state["queue"] if x != cid]
                continue
            if rec.get("status") == "leased":
                lease_until = _dt(rec.get("lease_until"))
                if lease_until and now >= lease_until:
                    rec["status"] = "queued"
                    rec["lease_until"] = None
                    rec["leased_by"] = None
                    if cid not in queue:
                        queue.append(cid)

    def heartbeat(self, agent_id: str) -> dict[str, Any]:
        now = self._now()
        def op(state):
            state.setdefault("heartbeats", {})
            rec = {"agent_id": agent_id, "last_seen": _iso(now), "online": True}
            state["heartbeats"][agent_id] = rec
            return copy.deepcopy(rec)
        return self._mutate(op)

    def agent_status(self, agent_id: str) -> dict[str, Any]:
        now = self._now()
        def op(state):
            state.setdefault("heartbeats", {})
            rec = state["heartbeats"].get(agent_id)
            if not rec:
                return {"agent_id": agent_id, "last_seen": None, "online": False}
            last_seen = _dt(rec.get("last_seen"))
            online = bool(last_seen and (now - last_seen) <= timedelta(seconds=90))
            return {"agent_id": agent_id, "last_seen": rec.get("last_seen"), "online": online}
        return self._mutate(op)

    def enqueue(self, name: str) -> dict[str, Any]:
        now = self._now()
        def op(state):
            cid = uuid.uuid4().hex
            rec = {"id": cid, "name": name, "created_at": _iso(now), "expires_at": _iso(now + COMMAND_TTL), "status": "queued", "lease_until": None, "leased_by": None, "attempts": 0, "result_summary": None}
            state["commands"][cid] = rec
            state["queue"].append(cid)
            return copy.deepcopy(rec)
        return self._mutate(op)

    def lease_next(self, agent_id: str) -> dict[str, Any] | None:
        now = self._now()
        def op(state):
            self._expire_and_requeue(state, now)
            while state["queue"]:
                cid = state["queue"].pop(0)
                rec = state["commands"].get(cid)
                if not rec or rec.get("status") != "queued":
                    continue
                expires_at = _dt(rec.get("expires_at"))
                if expires_at and now >= expires_at:
                    rec["status"] = "expired"
                    continue
                rec["status"] = "leased"
                rec["leased_by"] = agent_id
                rec["lease_until"] = _iso(now + LEASE_TTL)
                rec["attempts"] = int(rec.get("attempts", 0)) + 1
                return copy.deepcopy(rec)
            return None
        return self._mutate(op)

    def complete(self, command_id: str, status: str, summary: str) -> dict[str, Any] | None:
        if status not in {"succeeded", "failed"}:
            raise ValueError("completion status must be succeeded or failed")
        now = self._now()
        def op(state):
            self._expire_and_requeue(state, now)
            rec = state["commands"].get(command_id)
            if rec is None:
                return None
            if rec.get("status") in FINAL:
                return copy.deepcopy(rec)
            rec["status"] = status
            rec["lease_until"] = None
            rec["leased_by"] = None
            rec["result_summary"] = (summary or "")[:RESULT_MAX]
            state["queue"] = [x for x in state["queue"] if x != command_id]
            return copy.deepcopy(rec)
        return self._mutate(op)

    def get(self, command_id: str) -> dict[str, Any] | None:
        now = self._now()
        def op(state):
            self._expire_and_requeue(state, now)
            rec = state["commands"].get(command_id)
            return copy.deepcopy(rec) if rec else None
        return self._mutate(op)


class MemoryCommandStore(_CommandSemantics):
    def __init__(self, now: Callable[[], datetime] | None = None):
        super().__init__(now=now)
        self._state = _empty_state()
        self._lock = threading.Lock()
    def _mutate(self, fn):
        with self._lock:
            return fn(self._state)


class RedisCommandStore(_CommandSemantics):
    def __init__(self, client, key: str = "aig:remote:command-state", now: Callable[[], datetime] | None = None):
        super().__init__(now=now)
        self.client = client
        self.key = key
    @classmethod
    def from_url(cls, url: str, **kwargs):
        import redis
        return cls(redis.Redis.from_url(url, decode_responses=True), **kwargs)
    def _mutate(self, fn):
        import redis
        while True:
            pipe = self.client.pipeline()
            try:
                pipe.watch(self.key)
                raw = pipe.get(self.key)
                state = json.loads(raw) if raw else _empty_state()
                result = fn(state)
                pipe.multi()
                pipe.set(self.key, json.dumps(state, separators=(",", ":")))
                pipe.execute()
                return result
            except redis.WatchError:
                continue
            finally:
                pipe.reset()
