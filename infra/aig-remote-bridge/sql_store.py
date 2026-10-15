from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from store import COMMAND_TTL, FINAL, LEASE_TTL, RESULT_MAX

UTC = timezone.utc


def _iso(dt: datetime) -> str:
    return dt.astimezone(UTC).isoformat()


def _dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


class SqlCommandStore:
    def __init__(self, engine, now: Callable[[], datetime] | None = None):
        from sqlalchemy import Column, Integer, MetaData, String, Table, Text, UniqueConstraint

        self.engine = engine
        self._now = now or (lambda: datetime.now(UTC))
        self.metadata = MetaData()
        self.commands = Table(
            "aig_remote_commands",
            self.metadata,
            Column("seq", Integer, primary_key=True, autoincrement=True),
            Column("id", String(64), nullable=False),
            Column("name", String(64), nullable=False),
            Column("created_at", String(64), nullable=False),
            Column("expires_at", String(64), nullable=False),
            Column("status", String(32), nullable=False),
            Column("lease_until", String(64), nullable=True),
            Column("leased_by", String(255), nullable=True),
            Column("attempts", Integer, nullable=False, default=0),
            Column("result_summary", Text, nullable=True),
            UniqueConstraint("id", name="uq_aig_remote_command_id"),
        )
        self.agents = Table(
            "aig_remote_agents",
            self.metadata,
            Column("agent_id", String(255), primary_key=True),
            Column("last_seen", String(64), nullable=False),
        )
        self.metadata.create_all(self.engine)

    @classmethod
    def from_url(cls, url: str, **kwargs):
        from sqlalchemy import create_engine

        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://"):]
        return cls(create_engine(url, pool_pre_ping=True, future=True), **kwargs)

    @staticmethod
    def _public(row):
        if row is None:
            return None
        rec = dict(row._mapping)
        rec.pop("seq", None)
        return rec

    def _cleanup(self, conn, now: datetime) -> None:
        from sqlalchemy import and_, update

        now_s = _iso(now)
        conn.execute(
            update(self.commands)
            .where(and_(self.commands.c.status.in_(["queued", "leased"]), self.commands.c.expires_at <= now_s))
            .values(status="expired", lease_until=None, leased_by=None)
        )
        conn.execute(
            update(self.commands)
            .where(and_(self.commands.c.status == "leased", self.commands.c.lease_until.is_not(None), self.commands.c.lease_until <= now_s, self.commands.c.expires_at > now_s))
            .values(status="queued", lease_until=None, leased_by=None)
        )

    def enqueue(self, name: str) -> dict[str, Any]:
        from sqlalchemy import insert

        now = self._now()
        rec = {
            "id": uuid.uuid4().hex,
            "name": name,
            "created_at": _iso(now),
            "expires_at": _iso(now + COMMAND_TTL),
            "status": "queued",
            "lease_until": None,
            "leased_by": None,
            "attempts": 0,
            "result_summary": None,
        }
        with self.engine.begin() as conn:
            conn.execute(insert(self.commands).values(**rec))
        return dict(rec)

    def lease_next(self, agent_id: str) -> dict[str, Any] | None:
        from sqlalchemy import select, update

        now = self._now()
        with self.engine.begin() as conn:
            self._cleanup(conn, now)
            row = conn.execute(
                select(self.commands)
                .where(self.commands.c.status == "queued")
                .order_by(self.commands.c.seq.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            ).first()
            if row is None:
                return None
            rec = self._public(row)
            attempts = int(rec.get("attempts") or 0) + 1
            lease_until = _iso(now + LEASE_TTL)
            conn.execute(
                update(self.commands)
                .where(self.commands.c.id == rec["id"])
                .values(status="leased", leased_by=agent_id, lease_until=lease_until, attempts=attempts)
            )
            rec.update(status="leased", leased_by=agent_id, lease_until=lease_until, attempts=attempts)
            return rec

    def complete(self, command_id: str, status: str, summary: str) -> dict[str, Any] | None:
        from sqlalchemy import select, update

        if status not in {"succeeded", "failed"}:
            raise ValueError("completion status must be succeeded or failed")
        now = self._now()
        with self.engine.begin() as conn:
            self._cleanup(conn, now)
            row = conn.execute(select(self.commands).where(self.commands.c.id == command_id).with_for_update()).first()
            if row is None:
                return None
            rec = self._public(row)
            if rec.get("status") in FINAL:
                return rec
            result_summary = (summary or "")[:RESULT_MAX]
            conn.execute(
                update(self.commands)
                .where(self.commands.c.id == command_id)
                .values(status=status, lease_until=None, leased_by=None, result_summary=result_summary)
            )
            rec.update(status=status, lease_until=None, leased_by=None, result_summary=result_summary)
            return rec

    def get(self, command_id: str) -> dict[str, Any] | None:
        from sqlalchemy import select

        now = self._now()
        with self.engine.begin() as conn:
            self._cleanup(conn, now)
            row = conn.execute(select(self.commands).where(self.commands.c.id == command_id)).first()
            return self._public(row)

    def heartbeat(self, agent_id: str) -> dict[str, Any]:
        from sqlalchemy import insert, select, update

        now_s = _iso(self._now())
        with self.engine.begin() as conn:
            row = conn.execute(select(self.agents.c.agent_id).where(self.agents.c.agent_id == agent_id)).first()
            if row is None:
                conn.execute(insert(self.agents).values(agent_id=agent_id, last_seen=now_s))
            else:
                conn.execute(update(self.agents).where(self.agents.c.agent_id == agent_id).values(last_seen=now_s))
        return {"agent_id": agent_id, "last_seen": now_s, "online": True}

    def agent_status(self, agent_id: str) -> dict[str, Any]:
        from sqlalchemy import select

        now = self._now()
        with self.engine.begin() as conn:
            row = conn.execute(select(self.agents).where(self.agents.c.agent_id == agent_id)).first()
        if row is None:
            return {"agent_id": agent_id, "last_seen": None, "online": False}
        rec = dict(row._mapping)
        last_seen = _dt(rec.get("last_seen"))
        return {
            "agent_id": agent_id,
            "last_seen": rec.get("last_seen"),
            "online": bool(last_seen and (now - last_seen) <= timedelta(seconds=90)),
        }
