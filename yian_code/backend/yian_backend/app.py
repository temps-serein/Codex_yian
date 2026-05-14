from __future__ import annotations

import os
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .audit import audit_agent_manifest
from .catalog import AgentCatalog
from .models import AgentApprovalRequest, AgentAuditRequest, AgentAuditResult, AgentRunRecord, AgentRunRequest, DiagnosisFinding, DiagnosisRequest, SecurityScanRequest
from .runner import AgentRunner
from .sandbox import SandboxExecutor
from .security import scan_commands
from .storage import RunStore
from .system_probe import probe_system


BASE_DIR = Path(__file__).resolve().parents[1]

app = FastAPI(title="Yian Local Agent API", version="0.5.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

catalog = AgentCatalog(BASE_DIR / "agents")
store = RunStore(BASE_DIR / "data" / "yian.db")
runner = AgentRunner(store, SandboxExecutor())


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "yian-local-agent-api"}


@app.get("/api/agents")
def list_agents():
    enriched_agents = []
    for agent in catalog.list():
        payload = agent.model_dump()
        payload["command_reviews"] = [review.model_dump() for review in scan_commands(agent.commands).reviews]
        enriched_agents.append(payload)
    return enriched_agents


@app.post("/api/security/scan")
def security_scan(payload: SecurityScanRequest):
    return scan_commands(payload.commands)


@app.post("/api/agents/audit", response_model=AgentAuditResult)
def audit_agent(payload: AgentAuditRequest) -> AgentAuditResult:
    return audit_agent_manifest(payload.manifest, existing_ids=[agent.id for agent in catalog.list()])


@app.get("/api/system/info")
def system_info():
    return probe_system()


@app.post("/api/agent/run", response_model=AgentRunRecord)
def run_agent(payload: AgentRunRequest, background_tasks: BackgroundTasks) -> AgentRunRecord:
    agent = catalog.get(payload.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    scan = scan_commands(agent.commands)
    if not scan.safe:
        raise HTTPException(status_code=400, detail={"message": "Dangerous command blocked", "blocked": scan.blocked})
    if not payload.dry_run and os.environ.get("YIAN_ALLOW_LIVE_EXECUTION") != "1":
        raise HTTPException(status_code=403, detail="Live execution is disabled by default. Keep dry_run=true or set YIAN_ALLOW_LIVE_EXECUTION=1.")

    record = runner.start(agent, payload.permission_mode, payload.dry_run)
    background_tasks.add_task(runner.simulate, record.id)
    return record


@app.get("/api/agent/runs/{run_id}", response_model=AgentRunRecord)
def get_run(run_id: str) -> AgentRunRecord:
    record = runner.get(run_id)
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")
    return record


@app.post("/api/agent/runs/{run_id}/approval", response_model=AgentRunRecord)
def approve_run_step(run_id: str, payload: AgentApprovalRequest, background_tasks: BackgroundTasks) -> AgentRunRecord:
    record = runner.approve_step(run_id, payload.approved, payload.note)
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")
    if payload.approved:
        background_tasks.add_task(runner.simulate, run_id)
    return record


@app.post("/api/agent/runs/{run_id}/rollback", response_model=AgentRunRecord)
def rollback_run(run_id: str) -> AgentRunRecord:
    record = runner.rollback(run_id)
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")
    return record


@app.get("/api/logs")
def list_logs():
    return store.list_runs()


@app.post("/api/diagnose", response_model=list[DiagnosisFinding])
def diagnose(payload: DiagnosisRequest):
    text = f"{payload.issue} {' '.join(payload.logs)}".lower()
    findings = [
        DiagnosisFinding(
            title="当前非管理员",
            level="权限提醒",
            detail="安装运行库或写入系统 PATH 可能需要提升权限。",
            action="仅在执行对应步骤时请求管理员授权。",
        )
    ]
    if "paddle" in text or "ocr" in text or "python" in text:
        findings.insert(
            0,
            DiagnosisFinding(
                title="PaddleOCR 安装失败",
                level="建议修复",
                detail="当前 Python 版本可能与部分 PaddleOCR 依赖不兼容。",
                action="创建 Python 3.10 虚拟环境后重装 paddlepaddle 与 paddleocr。",
            ),
        )
    if "cuda" in text or "gpu" in text:
        findings.append(
            DiagnosisFinding(
                title="GPU 环境未确认",
                level="可选优化",
                detail="未读取到 CUDA 版本时，OCR 将默认使用 CPU 推理。",
                action="检测 NVIDIA 驱动与 CUDA Toolkit 后再选择 GPU 安装方案。",
            )
        )
    return findings
