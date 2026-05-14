from __future__ import annotations

import os
import subprocess

from .models import AgentRunStep, CommandExecutionResult


LIVE_ALLOWED_PREFIXES = (
    "python --version",
    "nvidia-smi --query",
    "winget --version",
    "winget search",
    "code --version",
    "code --list-extensions",
    "chrome --version",
)


class SandboxExecutor:
    def __init__(self) -> None:
        self._live_enabled = os.environ.get("YIAN_ALLOW_LIVE_EXECUTION") == "1"

    def execute(self, step: AgentRunStep, dry_run: bool) -> CommandExecutionResult:
        if not step.command:
            return CommandExecutionResult(status="simulated", reason="No command bound to this step.")

        if step.command_review and not step.command_review.allowed:
            return CommandExecutionResult(
                status="blocked",
                reason="Command was blocked by Yi'an command security policy.",
            )

        normalized = step.command.strip().lower()
        if dry_run:
            return CommandExecutionResult(
                status="simulated",
                reason=f"Dry-run sandbox accepted command with risk {step.command_review.risk if step.command_review else '未知'}.",
            )

        if not self._live_enabled:
            return CommandExecutionResult(
                status="blocked",
                reason="Live command execution is disabled. Set YIAN_ALLOW_LIVE_EXECUTION=1 to enable the sandbox.",
            )

        if not normalized.startswith(LIVE_ALLOWED_PREFIXES):
            return CommandExecutionResult(
                status="blocked",
                reason="Live sandbox only permits read-only commands in v0.6.",
            )

        try:
            result = subprocess.run(
                step.command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=20,
                check=False,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            return CommandExecutionResult(status="failed", reason=str(exc))

        output = (result.stdout or result.stderr).strip()
        return CommandExecutionResult(
            status="executed" if result.returncode == 0 else "failed",
            exit_code=result.returncode,
            output=output[-2000:] if output else None,
            reason="Command completed in live read-only sandbox.",
        )
