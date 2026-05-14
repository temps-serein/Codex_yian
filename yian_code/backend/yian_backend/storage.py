from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

from .models import AgentAuditResult, AgentManifest, AgentRunRecord, UserAgentRecord, UserAgentStatus


class RunStore:
    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def save(self, run: AgentRunRecord) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO install_logs
                (id, agent_id, agent_name, status, risk, payload, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run.id,
                    run.agent_id,
                    run.agent_name,
                    run.status,
                    run.risk,
                    run.model_dump_json(),
                    run.started_at.isoformat(),
                ),
            )

    def list_runs(self) -> list[dict[str, object]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, agent_name, status, risk, payload, created_at
                FROM install_logs
                ORDER BY created_at DESC
                LIMIT 50
                """
            ).fetchall()
        return [
            {
                "id": row["id"],
                "name": row["agent_name"],
                "status": row["status"],
                "risk": row["risk"],
                "created_at": row["created_at"],
                "payload": json.loads(row["payload"]),
            }
            for row in rows
        ]

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS install_logs (
                  id TEXT PRIMARY KEY,
                  agent_id TEXT NOT NULL,
                  agent_name TEXT NOT NULL,
                  status TEXT NOT NULL,
                  risk TEXT NOT NULL,
                  payload TEXT NOT NULL,
                  created_at TEXT NOT NULL
                )
                """
            )


class UserAgentStore:
    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def ids(self) -> list[str]:
        with self._connect() as conn:
            rows = conn.execute("SELECT agent_id FROM user_agents ORDER BY agent_id").fetchall()
        return [row["agent_id"] for row in rows]

    def list_records(self) -> list[UserAgentRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT agent_id, status, manifest, audit_payload, created_at, updated_at
                FROM user_agents
                ORDER BY updated_at DESC
                """
            ).fetchall()
        return [self._record_from_row(row) for row in rows]

    def list_enabled_agents(self) -> list[AgentManifest]:
        return [record.agent for record in self.list_records() if record.status == "enabled"]

    def get_record(self, agent_id: str) -> UserAgentRecord | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT agent_id, status, manifest, audit_payload, created_at, updated_at
                FROM user_agents
                WHERE agent_id = ?
                """,
                (agent_id,),
            ).fetchone()
        return self._record_from_row(row) if row else None

    def get_enabled_agent(self, agent_id: str) -> AgentManifest | None:
        record = self.get_record(agent_id)
        if not record or record.status != "enabled":
            return None
        return record.agent

    def save(self, audit: AgentAuditResult, status: UserAgentStatus = "enabled") -> UserAgentRecord:
        if not audit.agent:
            raise ValueError("Audit result has no valid agent manifest.")

        now = datetime.now(timezone.utc).isoformat()
        existing = self.get_record(audit.agent.id)
        created_at = existing.created_at.isoformat() if existing else now
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO user_agents
                (agent_id, status, manifest, audit_payload, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    audit.agent.id,
                    status,
                    audit.agent.model_dump_json(),
                    audit.model_dump_json(),
                    created_at,
                    now,
                ),
            )
        saved = self.get_record(audit.agent.id)
        if not saved:
            raise RuntimeError("Failed to save user agent.")
        return saved

    def set_status(self, agent_id: str, status: UserAgentStatus) -> UserAgentRecord | None:
        if not self.get_record(agent_id):
            return None
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE user_agents
                SET status = ?, updated_at = ?
                WHERE agent_id = ?
                """,
                (status, now, agent_id),
            )
        return self.get_record(agent_id)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS user_agents (
                  agent_id TEXT PRIMARY KEY,
                  status TEXT NOT NULL,
                  manifest TEXT NOT NULL,
                  audit_payload TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                )
                """
            )

    def _record_from_row(self, row: sqlite3.Row) -> UserAgentRecord:
        return UserAgentRecord(
            agent=AgentManifest.model_validate_json(row["manifest"]),
            status=row["status"],
            audit=AgentAuditResult.model_validate_json(row["audit_payload"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )
