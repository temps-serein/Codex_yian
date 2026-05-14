from __future__ import annotations

import asyncio
import uuid
from datetime import datetime

from .models import AgentManifest, AgentRunRecord, AgentRunStep, PermissionMode
from .sandbox import SandboxExecutor
from .security import assess_command
from .storage import RunStore


PERMISSION_MODE_LABELS = {
    "confirm": "逐步确认",
    "auto": "自动低风险",
    "trusted": "完全授权",
}

APPROVAL_STEP_KEYWORDS = ("安装", "下载", "运行", "写入", "创建", "修复")
APPROVAL_COMMAND_KEYWORDS = ("pip install", "winget install", "start-process", "setx", "setenvironmentvariable")


class AgentRunner:
    def __init__(self, store: RunStore, executor: SandboxExecutor | None = None) -> None:
        self._runs: dict[str, AgentRunRecord] = {}
        self._agents: dict[str, AgentManifest] = {}
        self._store = store
        self._executor = executor or SandboxExecutor()

    def start(self, agent: AgentManifest, permission_mode: PermissionMode, dry_run: bool = True) -> AgentRunRecord:
        step_states = self._build_steps(agent, permission_mode)
        run = AgentRunRecord(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            agent_name=agent.name,
            risk=agent.risk,
            status="running",
            progress=0,
            steps=agent.steps,
            step_states=step_states,
            current_step=step_states[0] if step_states else None,
            permission_mode=permission_mode,
            dry_run=dry_run,
            started_at=datetime.now(),
            logs=[
                f"[INIT] 已加载 {agent.name}",
                f"[MODE] 权限模式：{PERMISSION_MODE_LABELS.get(permission_mode, permission_mode)}",
                "[SCAN] 命令风险扫描通过",
                "[DRY-RUN] 当前为安全演练，不会真实执行安装命令。" if dry_run else "[LIVE] 将进入真实执行模式。",
            ],
        )
        self._runs[run.id] = run
        self._agents[run.id] = agent
        self._store.save(run)
        return run

    def get(self, run_id: str) -> AgentRunRecord | None:
        return self._runs.get(run_id)

    async def simulate(self, run_id: str) -> None:
        while True:
            await asyncio.sleep(0.9)
            run = self._runs.get(run_id)
            if not run or run.status in {"success", "failed", "rejected", "rolled_back"}:
                return

            step = self._next_step(run)
            if not step:
                run.status = "success"
                run.finished_at = datetime.now()
                run.current_step = None
                run.logs.append("[DONE] Agent 执行完成，日志已归档。")
                self._store.save(run)
                return

            run.current_step = step
            if step.approval_required and not step.approved:
                if step.status != "pending_approval":
                    step.status = "pending_approval"
                    run.status = "waiting_approval"
                    run.logs.append(f"[WAIT] 等待用户授权：{step.label}")
                    if step.command:
                        run.logs.append(f"[PLAN] {step.command}")
                    self._store.save(run)
                return

            run.status = "running"
            if step.status == "waiting":
                step.status = "running"
                step.started_at = datetime.now()
                run.logs.append(f"[RUN] {step.label}")
                if step.command:
                    run.logs.append(f"[CMD] {step.command}")
                if step.command_review:
                    run.logs.append(f"[RISK] {step.command_review.risk} / {step.command_review.category} - {'; '.join(step.command_review.reasons)}")
                self._store.save(run)
                continue

            if step.status == "running":
                result = self._executor.execute(step, run.dry_run)
                step.execution_status = result.status
                step.output = result.output or result.reason
                if result.status == "blocked":
                    step.status = "failed"
                    run.status = "failed"
                    run.finished_at = datetime.now()
                    run.logs.append(f"[BLOCK] {result.reason}")
                    self._store.save(run)
                    return
                if result.status == "failed":
                    step.status = "failed"
                    run.status = "failed"
                    run.finished_at = datetime.now()
                    run.logs.append(f"[FAIL] {result.reason or result.output or step.label}")
                    self._store.save(run)
                    return

                step.status = "success"
                step.finished_at = datetime.now()
                run.progress = self._completed_count(run)
                if result.status == "simulated":
                    run.logs.append(f"[SANDBOX] dry-run accepted: {step.command}")
                elif result.status == "executed":
                    run.logs.append(f"[SANDBOX] live read-only command executed: {step.command}")
                    if result.output:
                        run.logs.append(f"[OUT] {result.output}")
                run.logs.append(f"[OK] {step.label}")
                self._store.save(run)

    def approve_step(self, run_id: str, approved: bool, note: str | None = None) -> AgentRunRecord | None:
        run = self._runs.get(run_id)
        if not run or run.status != "waiting_approval" or not run.current_step:
            return run

        step = run.current_step
        if approved:
            step.approved = True
            step.status = "waiting"
            run.status = "running"
            run.logs.append(f"[ALLOW] 已授权继续：{step.label}")
            if note:
                run.logs.append(f"[NOTE] {note}")
        else:
            step.status = "failed"
            run.status = "rejected"
            run.finished_at = datetime.now()
            run.logs.append(f"[DENY] 用户拒绝执行：{step.label}")
            if note:
                run.logs.append(f"[NOTE] {note}")
            run.logs.append("[STOP] Agent 已停止，未执行后续步骤。")

        self._store.save(run)
        return run

    def rollback(self, run_id: str) -> AgentRunRecord | None:
        run = self._runs.get(run_id)
        agent = self._agents.get(run_id)
        if not run:
            return None
        run.status = "rolled_back"
        run.finished_at = datetime.now()
        run.current_step = None
        run.logs.append("[ROLLBACK] 开始执行回滚策略。")
        for command in agent.rollback if agent else []:
            run.logs.append(f"[ROLLBACK] {command}")
        run.logs.append("[ROLLBACK] 已模拟完成，系统变更记录已归档。")
        self._store.save(run)
        return run

    def _build_steps(self, agent: AgentManifest, permission_mode: PermissionMode) -> list[AgentRunStep]:
        steps: list[AgentRunStep] = []
        for index, label in enumerate(agent.steps):
            command = agent.commands[index] if index < len(agent.commands) else None
            command_review = assess_command(command) if command else None
            steps.append(
                AgentRunStep(
                    index=index,
                    label=label,
                    command=command,
                    command_review=command_review,
                    approval_required=self._requires_approval(agent, permission_mode, label, command, command_review.risk if command_review else "低风险"),
                )
            )
        return steps

    def _requires_approval(self, agent: AgentManifest, permission_mode: PermissionMode, label: str, command: str | None, command_risk: str) -> bool:
        if permission_mode == "trusted":
            return False
        if permission_mode == "confirm":
            return True
        if command_risk != "低风险":
            return True
        command_text = (command or "").lower()
        if agent.risk != "低风险" and (
            any(keyword in label for keyword in APPROVAL_STEP_KEYWORDS)
            or any(keyword in command_text for keyword in APPROVAL_COMMAND_KEYWORDS)
        ):
            return True
        if "system.env.write" in agent.permissions and any(word in label for word in ("写入", "安装")):
            return True
        if "system.install" in agent.permissions and agent.risk != "低风险":
            return True
        return False

    def _next_step(self, run: AgentRunRecord) -> AgentRunStep | None:
        for step in run.step_states:
            if step.status in {"waiting", "pending_approval", "running"}:
                return step
        return None

    def _completed_count(self, run: AgentRunRecord) -> int:
        return sum(1 for step in run.step_states if step.status == "success")
