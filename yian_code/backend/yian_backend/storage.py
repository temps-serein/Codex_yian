from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .models import AgentRunRecord


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
