from __future__ import annotations

import re

from .models import CommandReview, DangerScanResult, RiskLevel


DANGEROUS_RULES = [
    (re.compile(r"^\s*format(?:\.com)?\b", re.IGNORECASE), "疑似格式化磁盘命令"),
    (re.compile(r"\brm\s+-rf\s+/", re.IGNORECASE), "疑似删除系统根目录"),
    (re.compile(r"Remove-Item\s+.+(?:Windows|System32).*-Recurse", re.IGNORECASE), "疑似递归删除系统目录"),
    (re.compile(r"Set-MpPreference\s+.+DisableRealtimeMonitoring", re.IGNORECASE), "疑似关闭安全防护"),
    (re.compile(r"Invoke-Expression\s*\(.*DownloadString", re.IGNORECASE), "疑似执行未知远程脚本"),
    (re.compile(r"\biex\s*\(.*DownloadString", re.IGNORECASE), "疑似执行未知远程脚本"),
    (re.compile(r"\bbcdedit\b", re.IGNORECASE), "疑似修改启动配置"),
    (re.compile(r"reg\s+delete\s+HKLM", re.IGNORECASE), "疑似删除系统注册表"),
    (re.compile(r"shutdown\s+/s", re.IGNORECASE), "疑似关机命令"),
]

LOW_RISK_PREFIXES = (
    "python --version",
    "nvidia-smi --query",
    "nvcc --version",
    "winget --version",
    "winget search",
    "code --version",
    "code --list-extensions",
    "chrome --version",
    "node --version",
    "npm --version",
    "verify extension publisher",
    "read recommended extensions",
    "echo ",
    "sqlite:",
    "dxdiag /t",
    "get-ciminstance ",
    "get-authenticodesignature ",
    "wait user confirmation",
)

MEDIUM_RISK_PREFIXES = (
    "python -m venv",
    "python -m pip install",
    "pip install",
    "winget install",
    "winget uninstall",
    "code --install-extension",
    "code --uninstall-extension",
    "start-process",
    "remove-item .yian",
)


def assess_command(command: str) -> CommandReview:
    command_text = command.strip()
    normalized = command_text.lower()

    dangerous_reasons = [reason for pattern, reason in DANGEROUS_RULES if pattern.search(command_text)]
    if dangerous_reasons:
        return CommandReview(
            command=command,
            allowed=False,
            risk="高风险",
            category="blocked",
            reasons=dangerous_reasons,
        )

    if normalized.startswith(LOW_RISK_PREFIXES):
        return _review(command, True, "低风险", "read_or_record", ["只读取信息或写入易安本地日志"])

    if normalized.startswith(MEDIUM_RISK_PREFIXES):
        return _review(command, True, "中风险", "system_change", ["可能创建环境、安装软件或启动外部程序，需权限闸门确认"])

    if "install" in normalized or "uninstall" in normalized or "start-process" in normalized:
        return _review(command, True, "中风险", "system_change", ["包含安装、卸载或启动行为，需权限闸门确认"])

    return _review(command, True, "中风险", "unknown", ["未命中白名单，保持可审计并要求授权"])


def scan_commands(commands: list[str]) -> DangerScanResult:
    reviews = [assess_command(command) for command in commands]
    blocked = [review.command for review in reviews if not review.allowed]
    return DangerScanResult(safe=not blocked, blocked=blocked, reviews=reviews)


def _review(command: str, allowed: bool, risk: RiskLevel, category: str, reasons: list[str]) -> CommandReview:
    return CommandReview(command=command, allowed=allowed, risk=risk, category=category, reasons=reasons)
