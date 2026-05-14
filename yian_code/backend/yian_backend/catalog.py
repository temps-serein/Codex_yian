from __future__ import annotations

import json
from pathlib import Path

from .models import AgentManifest


class AgentCatalog:
    def __init__(self, agents_dir: Path) -> None:
        self._agents_dir = agents_dir
        self._agents = self._load_agents()

    def list(self) -> list[AgentManifest]:
        return list(self._agents.values())

    def get(self, agent_id: str) -> AgentManifest | None:
        return self._agents.get(agent_id)

    def _load_agents(self) -> dict[str, AgentManifest]:
        agents: dict[str, AgentManifest] = {}
        for path in sorted(self._agents_dir.glob("*.json")):
            payload = json.loads(path.read_text(encoding="utf-8"))
            records = payload.get("agents", payload) if isinstance(payload, dict) else payload
            for record in records:
                agent = AgentManifest.model_validate(record)
                agents[agent.id] = agent
        return agents
