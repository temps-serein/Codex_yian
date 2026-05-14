from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


RiskLevel = Literal["低风险", "中风险", "高风险"]
CheckStatus = Literal["ok", "warn", "info", "danger"]
RunStatus = Literal["queued", "running", "waiting_approval", "success", "failed", "rejected", "rolled_back"]
PermissionMode = Literal["confirm", "auto", "trusted"]
StepStatus = Literal["waiting", "pending_approval", "running", "success", "failed", "skipped"]
ExecutionStatus = Literal["simulated", "executed", "blocked", "failed"]
AuditVerdict = Literal["approved", "needs_review", "rejected"]
AuditFindingLevel = Literal["ok", "warn", "info", "danger"]


class AgentManifest(BaseModel):
    id: str
    name: str
    version: str = "0.1.0"
    category: str
    source: str
    risk: RiskLevel
    rating: str
    downloads: str
    platform: str
    runtime: str
    icon: str
    summary: str
    permissions: list[str] = Field(default_factory=list)
    commands: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    rollback: list[str] = Field(default_factory=list)
    repair: str


class SystemCheck(BaseModel):
    id: str
    label: str
    value: str
    status: CheckStatus
    detail: str | None = None


class SystemInfo(BaseModel):
    generated_at: datetime
    checks: list[SystemCheck]


class AgentRunRequest(BaseModel):
    agent_id: str
    permission_mode: PermissionMode = "auto"
    dry_run: bool = True


class AgentRunRecord(BaseModel):
    id: str
    agent_id: str
    agent_name: str
    risk: RiskLevel
    status: RunStatus
    progress: int = 0
    steps: list[str]
    step_states: list["AgentRunStep"] = Field(default_factory=list)
    current_step: "AgentRunStep | None" = None
    permission_mode: PermissionMode = "auto"
    logs: list[str] = Field(default_factory=list)
    dry_run: bool = True
    started_at: datetime
    finished_at: datetime | None = None


class AgentRunStep(BaseModel):
    index: int
    label: str
    command: str | None = None
    command_review: "CommandReview | None" = None
    status: StepStatus = "waiting"
    approval_required: bool = False
    approved: bool = False
    execution_status: ExecutionStatus | None = None
    output: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None


class AgentApprovalRequest(BaseModel):
    approved: bool
    note: str | None = None


class DiagnosisRequest(BaseModel):
    issue: str
    logs: list[str] = Field(default_factory=list)


class DiagnosisFinding(BaseModel):
    title: str
    level: str
    detail: str
    action: str


class CommandReview(BaseModel):
    command: str
    allowed: bool
    risk: RiskLevel
    category: str
    reasons: list[str] = Field(default_factory=list)


class AgentAuditRequest(BaseModel):
    manifest: dict[str, Any] | list[Any]


class AgentAuditFinding(BaseModel):
    title: str
    level: AuditFindingLevel
    detail: str
    action: str


class AgentAuditResult(BaseModel):
    verdict: AuditVerdict
    score: int
    summary: str
    agent: AgentManifest | None = None
    findings: list[AgentAuditFinding] = Field(default_factory=list)
    command_reviews: list[CommandReview] = Field(default_factory=list)


class DangerScanResult(BaseModel):
    safe: bool
    blocked: list[str] = Field(default_factory=list)
    reviews: list[CommandReview] = Field(default_factory=list)


class SecurityScanRequest(BaseModel):
    commands: list[str]


class CommandExecutionResult(BaseModel):
    status: ExecutionStatus
    exit_code: int | None = None
    output: str | None = None
    reason: str | None = None
