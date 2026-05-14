from __future__ import annotations

import re
from collections.abc import Iterable
from typing import Any

from pydantic import ValidationError

from .models import AgentAuditFinding, AgentAuditResult, AgentManifest
from .security import scan_commands


AGENT_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,48}$")
TRUSTED_SOURCE_MARKERS = ("官方", "official", "verified", "microsoft", "python.org", "pypi", "winget")
HIGH_PRIVILEGE_MARKERS = ("registry", "firewall", "driver", "admin", "security", "system32")


def audit_agent_manifest(manifest: dict[str, Any] | list[Any], existing_ids: Iterable[str] = ()) -> AgentAuditResult:
    payload, payload_findings = _normalize_payload(manifest)
    findings = list(payload_findings)
    existing = set(existing_ids)

    if payload is None:
        return AgentAuditResult(
            verdict="rejected",
            score=0,
            summary="Manifest 不是单个 Agent JSON 对象，已拒绝进入审核。",
            findings=findings,
        )

    try:
        agent = AgentManifest.model_validate(payload)
    except ValidationError as error:
        findings.append(
            AgentAuditFinding(
                title="Manifest 结构不完整",
                level="danger",
                detail=_format_validation_error(error),
                action="补齐必填字段后重新提交审核。",
            )
        )
        return AgentAuditResult(
            verdict="rejected",
            score=0,
            summary="Manifest 未通过结构校验。",
            findings=findings,
        )

    findings.extend(_audit_identity(agent, existing))
    findings.extend(_audit_source_and_permissions(agent))
    findings.extend(_audit_execution_plan(agent))

    command_scan = scan_commands(agent.commands)
    for review in command_scan.reviews:
        if not review.allowed:
            findings.append(
                AgentAuditFinding(
                    title="危险命令已阻断",
                    level="danger",
                    detail=f"{review.command}：{'；'.join(review.reasons)}",
                    action="删除该命令，改用官方安装器、包管理器或只读检测命令。",
                )
            )

    findings.append(
        AgentAuditFinding(
            title="命令风险扫描完成",
            level="ok" if command_scan.safe else "danger",
            detail="未发现阻断命令。" if command_scan.safe else f"发现 {len(command_scan.blocked)} 条阻断命令。",
            action="保留审核记录，执行前仍需经过权限模式确认。",
        )
    )

    if agent.risk == "低风险" and any(review.risk != "低风险" for review in command_scan.reviews):
        findings.append(
            AgentAuditFinding(
                title="风险等级声明偏低",
                level="warn",
                detail="Manifest 标记为低风险，但命令包含安装、卸载、启动或未知行为。",
                action="将 risk 调整为中风险，或拆分只读检测与安装步骤。",
            )
        )

    return _build_result(agent, findings, command_scan.reviews)


def _normalize_payload(manifest: dict[str, Any] | list[Any]) -> tuple[dict[str, Any] | None, list[AgentAuditFinding]]:
    findings: list[AgentAuditFinding] = []
    if isinstance(manifest, dict):
        if "agents" in manifest and isinstance(manifest["agents"], list):
            if len(manifest["agents"]) != 1:
                findings.append(
                    AgentAuditFinding(
                        title="批量 Manifest 暂不接收",
                        level="danger",
                        detail="当前审核入口一次只处理一个 Agent。",
                        action="拆成单个 Agent JSON 后逐个提交。",
                    )
                )
                return None, findings
            findings.append(
                AgentAuditFinding(
                    title="已读取 agents 包装结构",
                    level="info",
                    detail="检测到 agents 数组，已取其中第一个 Agent 进入审核。",
                    action="后续可直接提交单个 Agent JSON 对象。",
                )
            )
            item = manifest["agents"][0]
            if isinstance(item, dict):
                return item, findings
            findings.append(
                AgentAuditFinding(
                    title="Agent 记录格式不支持",
                    level="danger",
                    detail="agents 数组中的记录不是 JSON 对象。",
                    action="提交一个完整的 Agent Manifest 对象。",
                )
            )
            return None, findings
        return manifest, findings

    if isinstance(manifest, list) and len(manifest) == 1 and isinstance(manifest[0], dict):
        findings.append(
            AgentAuditFinding(
                title="已读取数组 Manifest",
                level="info",
                detail="检测到单元素数组，已取其中第一个 Agent 进入审核。",
                action="后续可直接提交单个 Agent JSON 对象。",
            )
        )
        return manifest[0], findings

    findings.append(
        AgentAuditFinding(
            title="Manifest 格式不支持",
            level="danger",
            detail="审核入口需要单个 JSON 对象。",
            action="提交一个完整的 Agent Manifest 对象。",
        )
    )
    return None, findings


def _audit_identity(agent: AgentManifest, existing_ids: set[str]) -> list[AgentAuditFinding]:
    findings: list[AgentAuditFinding] = [
        AgentAuditFinding(
            title="Manifest 结构校验通过",
            level="ok",
            detail=f"{agent.name} / {agent.id} 已解析为标准 Agent Manifest。",
            action="继续进行命令、权限和来源审核。",
        )
    ]

    if not AGENT_ID_RE.match(agent.id):
        findings.append(
            AgentAuditFinding(
                title="Agent ID 命名不规范",
                level="warn",
                detail="ID 应使用小写字母、数字和短横线，长度控制在 3 到 49 个字符。",
                action="调整 id，避免后续同步、检索和日志关联出错。",
            )
        )

    if agent.id in existing_ids:
        findings.append(
            AgentAuditFinding(
                title="Agent ID 已存在",
                level="danger",
                detail=f"{agent.id} 与官方或已加载 Agent 冲突。",
                action="更换唯一 id 后再提交审核。",
            )
        )

    return findings


def _audit_source_and_permissions(agent: AgentManifest) -> list[AgentAuditFinding]:
    findings: list[AgentAuditFinding] = []
    source = agent.source.lower()
    if not any(marker in source for marker in TRUSTED_SOURCE_MARKERS):
        findings.append(
            AgentAuditFinding(
                title="来源需要人工复核",
                level="warn",
                detail=f"当前来源为 {agent.source}，未命中官方或可信来源标记。",
                action="补充官网、仓库、签名或包管理器来源证明。",
            )
        )

    if not agent.permissions:
        findings.append(
            AgentAuditFinding(
                title="权限声明缺失",
                level="warn",
                detail="Manifest 没有声明执行所需权限。",
                action="补充 network.download、system.install、python.pip 等最小权限集合。",
            )
        )

    high_privilege_permissions = [
        permission for permission in agent.permissions if any(marker in permission.lower() for marker in HIGH_PRIVILEGE_MARKERS)
    ]
    if high_privilege_permissions:
        findings.append(
            AgentAuditFinding(
                title="高权限能力需要复核",
                level="warn",
                detail="、".join(high_privilege_permissions),
                action="确认权限是否必要，并在步骤中说明触发时机。",
            )
        )

    return findings


def _audit_execution_plan(agent: AgentManifest) -> list[AgentAuditFinding]:
    findings: list[AgentAuditFinding] = []
    if not agent.commands:
        findings.append(
            AgentAuditFinding(
                title="执行命令为空",
                level="danger",
                detail="Agent 没有提供可审核的 commands。",
                action="补充只读检测、安装、验证和日志记录命令。",
            )
        )

    if not agent.steps:
        findings.append(
            AgentAuditFinding(
                title="步骤说明为空",
                level="danger",
                detail="Agent 没有提供用户可读的执行步骤。",
                action="补充 steps，保证权限确认时用户能理解每一步。",
            )
        )

    if agent.commands and agent.steps and abs(len(agent.commands) - len(agent.steps)) > 2:
        findings.append(
            AgentAuditFinding(
                title="步骤与命令数量不匹配",
                level="warn",
                detail=f"当前 steps 为 {len(agent.steps)} 条，commands 为 {len(agent.commands)} 条。",
                action="让每个关键命令都有对应的用户可读步骤。",
            )
        )

    if not agent.rollback:
        findings.append(
            AgentAuditFinding(
                title="回滚策略缺失",
                level="warn",
                detail="Manifest 没有声明失败或撤销时的回滚策略。",
                action="补充卸载、删除临时文件、还原环境变量或人工恢复说明。",
            )
        )

    return findings


def _build_result(agent: AgentManifest, findings: list[AgentAuditFinding], command_reviews) -> AgentAuditResult:
    danger_count = sum(1 for finding in findings if finding.level == "danger")
    warn_count = sum(1 for finding in findings if finding.level == "warn")
    score = max(0, 100 - danger_count * 35 - warn_count * 12)

    if danger_count:
        verdict = "rejected"
        summary = f"审核拒绝：发现 {danger_count} 个阻断问题，需要修改 Manifest。"
    elif warn_count:
        verdict = "needs_review"
        summary = f"进入人工复核：发现 {warn_count} 个需要确认的风险点。"
    else:
        verdict = "approved"
        summary = "自动审核通过：结构、来源、权限、命令和回滚策略均满足当前规则。"

    return AgentAuditResult(
        verdict=verdict,
        score=score,
        summary=summary,
        agent=agent,
        findings=findings,
        command_reviews=command_reviews,
    )


def _format_validation_error(error: ValidationError) -> str:
    parts = []
    for item in error.errors()[:6]:
        location = ".".join(str(part) for part in item.get("loc", []))
        parts.append(f"{location}: {item.get('msg', '字段无效')}")
    if len(error.errors()) > 6:
        parts.append("还有更多字段错误")
    return "；".join(parts)
