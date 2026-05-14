from __future__ import annotations

import ctypes
import platform
import shutil
import socket
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from .models import SystemCheck, SystemInfo


def _run(command: list[str], timeout: float = 3.0) -> str | None:
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=False)
    except (FileNotFoundError, subprocess.SubprocessError, OSError):
        return None
    output = (result.stdout or result.stderr).strip()
    return output or None


def _powershell(script: str) -> str | None:
    return _run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script])


def _is_admin() -> bool:
    if platform.system().lower() != "windows":
        return hasattr(ctypes, "windll") and hasattr(ctypes.windll, "shell32")
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def _network_ok() -> bool:
    try:
        with socket.create_connection(("pypi.org", 443), timeout=2):
            return True
    except OSError:
        return False


def probe_system() -> SystemInfo:
    os_name = platform.platform()
    cpu_name = _powershell("(Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name)") or platform.processor() or "未识别"
    gpu_name = _powershell("(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ', '") or "未检测到独立显卡"
    python_version = _run([sys.executable, "--version"]) or f"Python {platform.python_version()}"
    nvcc = _run(["nvcc", "--version"])
    nvidia_smi = _run(["nvidia-smi", "--query-gpu=driver_version", "--format=csv,noheader"], timeout=2)
    disk = shutil.disk_usage(Path.cwd().anchor or Path.cwd())
    free_gb = disk.free / 1024 / 1024 / 1024
    network_ok = _network_ok()
    admin = _is_admin()

    python_status = "warn" if "Python 3.12" in python_version or "Python 3.13" in python_version else "ok"
    cuda_value = "未检测到，将使用 CPU 方案"
    cuda_status = "info"
    if nvcc or nvidia_smi:
        cuda_value = (nvidia_smi or nvcc or "").splitlines()[0]
        cuda_status = "ok"

    checks = [
        SystemCheck(id="os", label="Windows 版本", value=os_name, status="ok"),
        SystemCheck(id="cpu", label="CPU 型号", value=cpu_name, status="ok"),
        SystemCheck(id="gpu", label="GPU / 驱动", value=gpu_name, status="ok" if gpu_name else "info"),
        SystemCheck(id="python", label="Python 版本", value=python_version, status=python_status, detail="PaddleOCR 推荐 Python 3.10"),
        SystemCheck(id="cuda", label="CUDA 版本", value=cuda_value, status=cuda_status),
        SystemCheck(id="network", label="网络状态", value="HTTPS 连接正常" if network_ok else "无法连接 PyPI", status="ok" if network_ok else "warn"),
        SystemCheck(id="admin", label="管理员权限", value="当前为管理员" if admin else "当前非管理员，执行时按需提升", status="ok" if admin else "info"),
        SystemCheck(id="disk", label="磁盘空间", value=f"{free_gb:.0f}GB 可用", status="ok" if free_gb >= 10 else "warn"),
    ]
    return SystemInfo(generated_at=datetime.now(), checks=checks)
