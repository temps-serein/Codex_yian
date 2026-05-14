import React, { useEffect, useMemo, useState } from "react";
import { yianApi } from "./src/api";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bot,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  Database,
  Download,
  Gauge,
  Globe2,
  HardDrive,
  History,
  Info,
  Laptop,
  ListChecks,
  LockKeyhole,
  MonitorCog,
  PackageCheck,
  Play,
  RotateCcw,
  Search,
  ServerCog,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Store,
  TerminalSquare,
  Wrench,
  X,
  Zap,
} from "lucide-react";

const navItems = [
  { id: "dashboard", label: "工作台", icon: Laptop },
  { id: "market", label: "Agent 市场", icon: Store },
  { id: "system", label: "系统检测", icon: MonitorCog },
  { id: "logs", label: "安装日志", icon: History },
  { id: "diagnosis", label: "问题诊断", icon: Wrench },
  { id: "settings", label: "权限设置", icon: Settings },
];

const permissionModes = [
  { id: "confirm", label: "逐步确认", desc: "每个执行步骤都需要确认" },
  { id: "auto", label: "自动低风险", desc: "低风险自动执行，高风险确认" },
  { id: "trusted", label: "完全授权", desc: "仅对可信 Agent 开启" },
];

const agents = [
  {
    id: "paddleocr",
    name: "PaddleOCR 环境安装 Agent",
    category: "AI 开发",
    source: "官方",
    risk: "中风险",
    rating: "4.8",
    downloads: "8.7k",
    platform: "Windows / Linux",
    runtime: "预计 12 分钟",
    icon: Bot,
    color: "text-cyan-700 bg-cyan-50 border-cyan-100",
    summary: "自动检测 Python、CUDA、pip 与 VC++ 运行库，安装 PaddleOCR 与 PaddlePaddle。",
    permissions: ["network.download", "python.pip", "system.env.read"],
    commands: [
      "python --version",
      "python -m venv .yian\\paddleocr",
      "pip install paddlepaddle paddleocr",
      "python -c \"from paddleocr import PaddleOCR\"",
    ],
    steps: [
      "检测 Python 与 pip",
      "检查 CUDA / CPU 推理环境",
      "创建隔离虚拟环境",
      "安装 paddlepaddle",
      "安装 paddleocr",
      "验证 PaddleOCR 导入",
      "归档安装日志",
    ],
    repair: "检测到 Python 版本不兼容时，将建议安装 Python 3.10 并重建虚拟环境。",
  },
  {
    id: "steam",
    name: "Steam 安装 Agent",
    category: "游戏娱乐",
    source: "官方",
    risk: "低风险",
    rating: "4.9",
    downloads: "12.3k",
    platform: "Windows / macOS",
    runtime: "预计 4 分钟",
    icon: Download,
    color: "text-sky-700 bg-sky-50 border-sky-100",
    summary: "下载官方安装器，处理网络异常、更新卡住和启动失败。",
    permissions: ["network.download", "system.install"],
    commands: ["winget search Valve.Steam", "winget install Valve.Steam", "Start-Process steam://open/main"],
    steps: ["检查 winget", "解析官方安装源", "下载安装包", "运行安装器", "验证启动入口", "保存安装记录"],
    repair: "如果下载失败，将切换官方备用地址并提示网络代理检查。",
  },
  {
    id: "python",
    name: "Python 开发环境 Agent",
    category: "开发环境",
    source: "官方",
    risk: "低风险",
    rating: "4.8",
    downloads: "10.5k",
    platform: "Windows / macOS / Linux",
    runtime: "预计 6 分钟",
    icon: TerminalSquare,
    color: "text-emerald-700 bg-emerald-50 border-emerald-100",
    summary: "安装 Python、pip、venv，修复环境变量与镜像源配置。",
    permissions: ["network.download", "system.env.write"],
    commands: ["winget install Python.Python.3.10", "python -m pip install --upgrade pip", "python -m venv .venv"],
    steps: ["读取现有 Python", "安装兼容版本", "升级 pip", "创建虚拟环境", "写入 PATH 建议", "执行 smoke test"],
    repair: "检测到多个 Python 路径时，将给出优先级整理方案。",
  },
  {
    id: "vscode",
    name: "VSCode 扩展安装 Agent",
    category: "开发环境",
    source: "官方",
    risk: "低风险",
    rating: "4.7",
    downloads: "6.2k",
    platform: "Windows / macOS / Linux",
    runtime: "预计 3 分钟",
    icon: Boxes,
    color: "text-indigo-700 bg-indigo-50 border-indigo-100",
    summary: "检测 VSCode CLI，安装 Python、Docker、ESLint 等常用扩展。",
    permissions: ["system.read", "extension.install"],
    commands: ["code --version", "code --install-extension ms-python.python", "code --install-extension ms-azuretools.vscode-docker"],
    steps: ["检测 VSCode CLI", "解析推荐扩展", "安装 Python 扩展", "安装 Docker 扩展", "检查扩展列表", "记录版本"],
    repair: "未检测到 code 命令时，将引导启用 Shell Command。",
  },
  {
    id: "vc-runtime",
    name: "VC++ 运行库修复 Agent",
    category: "系统工具",
    source: "官方",
    risk: "低风险",
    rating: "4.9",
    downloads: "15.8k",
    platform: "Windows",
    runtime: "预计 5 分钟",
    icon: PackageCheck,
    color: "text-amber-700 bg-amber-50 border-amber-100",
    summary: "安装 Microsoft VC++、.NET、DirectX，修复缺少 DLL 的启动错误。",
    permissions: ["network.download", "system.install", "signature.verify"],
    commands: ["winget install Microsoft.VCRedist.2015+.x64", "winget install Microsoft.DotNet.DesktopRuntime.8", "dxdiag /t yian-dxdiag.txt"],
    steps: ["读取组件版本", "校验官方签名", "安装 VC++ 运行库", "安装 .NET Runtime", "检查 DirectX", "生成修复报告"],
    repair: "如果安装器返回 1603，将提示关闭占用进程并重新执行修复。",
  },
  {
    id: "chrome-extension",
    name: "Chrome 插件安装 Agent",
    category: "浏览器插件",
    source: "官方",
    risk: "低风险",
    rating: "4.7",
    downloads: "3.1k",
    platform: "Windows / macOS",
    runtime: "预计 2 分钟",
    icon: Globe2,
    color: "text-rose-700 bg-rose-50 border-rose-100",
    summary: "检测 Chrome 版本，打开官方商店页面并校验插件来源。",
    permissions: ["browser.open", "extension.install"],
    commands: ["chrome --version", "Start-Process chrome.exe https://chromewebstore.google.com", "verify extension publisher"],
    steps: ["检测 Chrome", "打开官方插件源", "校验发布者", "等待用户确认", "记录插件版本"],
    repair: "如果 Chrome 缺失，将建议先执行 Chrome 安装 Agent。",
  },
];

const iconByAgentId = {
  paddleocr: Bot,
  steam: Download,
  python: TerminalSquare,
  vscode: Boxes,
  "vc-runtime": PackageCheck,
  "chrome-extension": Globe2,
};

const colorByAgentId = {
  paddleocr: "text-cyan-700 bg-cyan-50 border-cyan-100",
  steam: "text-sky-700 bg-sky-50 border-sky-100",
  python: "text-emerald-700 bg-emerald-50 border-emerald-100",
  vscode: "text-indigo-700 bg-indigo-50 border-indigo-100",
  "vc-runtime": "text-amber-700 bg-amber-50 border-amber-100",
  "chrome-extension": "text-rose-700 bg-rose-50 border-rose-100",
};

const iconByCheckId = {
  os: Laptop,
  cpu: Cpu,
  gpu: Gauge,
  python: TerminalSquare,
  cuda: ServerCog,
  network: Globe2,
  admin: LockKeyhole,
  disk: HardDrive,
};

const initialChecks = [
  { id: "os", label: "Windows 版本", value: "Windows 11 专业版 64 位", status: "ok", icon: Laptop },
  { id: "cpu", label: "CPU 型号", value: "Intel Core i7", status: "ok", icon: Cpu },
  { id: "gpu", label: "GPU / 驱动", value: "NVIDIA RTX / 驱动待确认", status: "warn", icon: Gauge },
  { id: "python", label: "Python 版本", value: "3.12.1，PaddleOCR 推荐 3.10", status: "warn", icon: TerminalSquare },
  { id: "cuda", label: "CUDA 版本", value: "未检测到，将使用 CPU 方案", status: "info", icon: ServerCog },
  { id: "network", label: "网络状态", value: "HTTPS 连接正常", status: "ok", icon: Globe2 },
  { id: "admin", label: "管理员权限", value: "当前非管理员", status: "warn", icon: LockKeyhole },
  { id: "disk", label: "磁盘空间", value: "256GB 可用", status: "ok", icon: HardDrive },
];

const sampleHistory = [
  { id: "log-1", name: "PaddleOCR 环境安装", status: "成功", time: "10 分钟前", risk: "中风险" },
  { id: "log-2", name: "Steam 安装", status: "成功", time: "1 小时前", risk: "低风险" },
  { id: "log-3", name: "Chrome 插件安装", status: "已取消", time: "昨天", risk: "低风险" },
];

const repairFindings = [
  {
    title: "PaddleOCR 安装失败",
    level: "建议修复",
    detail: "当前 Python 3.12 与部分 PaddleOCR 依赖兼容性较差。",
    action: "创建 Python 3.10 虚拟环境后重装 paddlepaddle 与 paddleocr。",
  },
  {
    title: "GPU 环境未确认",
    level: "可选优化",
    detail: "未读取到 CUDA 版本，OCR 将默认使用 CPU 推理。",
    action: "检测 NVIDIA 驱动与 CUDA Toolkit 后再选择 GPU 安装方案。",
  },
  {
    title: "当前非管理员",
    level: "权限提醒",
    detail: "安装运行库或写入系统 PATH 可能需要提升权限。",
    action: "仅在执行对应步骤时请求管理员授权。",
  },
];

function hydrateAgent(agent) {
  return {
    ...agent,
    icon: iconByAgentId[agent.id] || Bot,
    color: colorByAgentId[agent.id] || "text-zinc-700 bg-zinc-50 border-zinc-100",
    commandReviews: agent.commandReviews || agent.command_reviews || [],
  };
}

function hydrateCheck(check) {
  return {
    ...check,
    icon: iconByCheckId[check.id] || Info,
  };
}

function normalizeRunRecord(record, agent) {
  const runStatus = record.status === "rolled_back" ? "success" : record.status;
  const stepStates = (record.step_states || []).map((step) => ({
    index: step.index,
    label: step.label,
    command: step.command,
    status: step.status,
    approvalRequired: step.approval_required,
    approved: step.approved,
    commandReview: step.command_review,
    executionStatus: step.execution_status,
  }));
  const currentStep = record.current_step
    ? {
        index: record.current_step.index,
        label: record.current_step.label,
        command: record.current_step.command,
        status: record.current_step.status,
        approvalRequired: record.current_step.approval_required,
        commandReview: record.current_step.command_review,
      }
    : null;
  return {
    id: record.id,
    backendRunId: record.id,
    agent,
    steps: record.steps || agent.steps,
    stepStates,
    currentStep,
    progress: record.progress || 0,
    status: runStatus,
    logs: record.logs || [],
  };
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function StatusBadge({ status, children }) {
  const styles = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    running: "border-cyan-200 bg-cyan-50 text-cyan-700",
    idle: "border-zinc-200 bg-zinc-50 text-zinc-600",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span className={cx("inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold", styles[status] || styles.idle)}>
      {children}
    </span>
  );
}

function riskStatus(risk) {
  if (risk === "低风险") return "ok";
  if (risk === "中风险") return "warn";
  return "danger";
}

function IconButton({ title, children, className = "", ...props }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Panel({ children, className = "" }) {
  return <section className={cx("rounded-lg border border-zinc-200 bg-white shadow-sm", className)}>{children}</section>;
}

function PanelHeader({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
          {desc ? <p className="mt-1 text-sm text-zinc-500">{desc}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function AgentCard({ agent, onRun }) {
  const Icon = agent.icon;

  return (
    <article className="flex min-h-[238px] flex-col rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={cx("flex h-10 w-10 items-center justify-center rounded-md border", agent.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <StatusBadge status={agent.risk === "中风险" ? "warn" : "ok"}>{agent.risk}</StatusBadge>
      </div>
      <h3 className="mt-4 min-h-11 text-base font-semibold leading-6 text-zinc-950">{agent.name}</h3>
      <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-zinc-500">{agent.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
        <span className="rounded-md bg-zinc-100 px-2 py-1">{agent.category}</span>
        <span className="rounded-md bg-zinc-100 px-2 py-1">{agent.runtime}</span>
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{agent.rating} 分</span>
          <span>{agent.downloads}</span>
        </div>
        <PrimaryButton onClick={() => onRun(agent)} className="h-9 px-3">
          <Play className="h-4 w-4" />
          执行
        </PrimaryButton>
      </div>
    </article>
  );
}

function SystemCheckCard({ check }) {
  const Icon = check.icon || Info;
  const statusIcon = check.status === "ok" ? CheckCircle2 : check.status === "warn" ? AlertTriangle : Info;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900">{check.label}</div>
            <div className="mt-1 max-w-[260px] text-sm leading-5 text-zinc-500">{check.value}</div>
          </div>
        </div>
        <StatusBadge status={check.status}>
          {React.createElement(statusIcon, { className: "h-3.5 w-3.5" })}
          {check.status === "ok" ? "正常" : check.status === "warn" ? "注意" : "信息"}
        </StatusBadge>
      </div>
    </div>
  );
}

function PermissionModal({ agent, mode, onClose, onStart }) {
  if (!agent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={agent.risk === "中风险" ? "warn" : "ok"}>{agent.risk}</StatusBadge>
              <StatusBadge status="info">{permissionModes.find((item) => item.id === mode)?.label}</StatusBadge>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-zinc-950">授权执行：{agent.name}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{agent.summary}</p>
          </div>
          <IconButton title="关闭" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <LockKeyhole className="h-4 w-4" />
                权限声明
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {agent.permissions.map((permission) => (
                  <span key={permission} className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
                    {permission}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <ShieldCheck className="h-4 w-4" />
                安全策略
              </div>
              <div className="mt-3 space-y-2 text-sm text-zinc-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  仅使用官方源或可信包管理器
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  危险命令静态扫描与风险分级
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  默认 dry-run 沙箱，不真实执行安装
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-zinc-200">
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">计划命令</div>
            <div className="space-y-3 bg-zinc-950 p-4 font-mono text-sm text-zinc-100">
              {agent.commands.map((command, index) => {
                const review = agent.commandReviews?.[index];
                return (
                <div key={command} className="rounded-md border border-zinc-800 bg-zinc-900/70 p-3">
                  <div className="flex gap-3">
                    <span className="text-zinc-500">{String(index + 1).padStart(2, "0")}</span>
                    <span className="break-all">{command}</span>
                  </div>
                  {review ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 font-sans text-xs">
                      <StatusBadge status={riskStatus(review.risk)}>{review.risk}</StatusBadge>
                      <span className={review.allowed ? "text-emerald-300" : "text-rose-300"}>{review.allowed ? "允许进入沙箱" : "已阻断"}</span>
                      <span className="text-zinc-400">{review.reasons?.[0]}</span>
                    </div>
                  ) : null}
                </div>
              )})}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              失败修复策略
            </div>
            <p className="mt-1">{agent.repair}</p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={onClose}>取消</SecondaryButton>
          <PrimaryButton onClick={() => onStart(agent)}>
            <Play className="h-4 w-4" />
            授权并执行
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function RunPanel({ run, onRollback, onOpenMarket, onApproveStep, onRejectStep }) {
  if (!run) {
    return (
      <Panel className="min-h-[420px]">
        <PanelHeader
          icon={TerminalSquare}
          title="当前执行"
          desc="选择一个 Agent 后，这里会显示步骤、权限和实时日志。"
          action={
            <SecondaryButton onClick={onOpenMarket}>
              <Store className="h-4 w-4" />
              打开市场
            </SecondaryButton>
          }
        />
        <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500">
            <TerminalSquare className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-950">暂无执行中的任务</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">MVP 已按文档预留安装执行器、权限确认、日志和回滚入口。</p>
        </div>
      </Panel>
    );
  }

  const stepStates = run.stepStates?.length
    ? run.stepStates
    : run.steps.map((label, index) => ({
        index,
        label,
        status: index < run.progress ? "success" : index === run.progress && run.status === "running" ? "running" : "waiting",
      }));
  const completed = stepStates.filter((step) => step.status === "success").length;
  const percent = Math.min(100, Math.round((completed / Math.max(stepStates.length, 1)) * 100));
  const waitingApproval = run.status === "waiting_approval";
  const rejected = run.status === "rejected";
  const statusText = run.status === "success" ? "执行完成" : waitingApproval ? "等待授权" : rejected ? "已拒绝" : "正在执行";

  return (
    <Panel className="min-h-[420px]">
      <PanelHeader
        icon={TerminalSquare}
        title={run.agent.name}
        desc={`${run.agent.runtime} · ${statusText}`}
        action={
          run.status === "success" ? (
            <SecondaryButton onClick={onRollback}>
              <RotateCcw className="h-4 w-4" />
              模拟回滚
            </SecondaryButton>
          ) : waitingApproval ? (
            <StatusBadge status="warn">
              <LockKeyhole className="h-3.5 w-3.5" />
              等待授权
            </StatusBadge>
          ) : rejected ? (
            <StatusBadge status="danger">
              <AlertTriangle className="h-3.5 w-3.5" />
              已停止
            </StatusBadge>
          ) : (
            <StatusBadge status="running">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              运行中
            </StatusBadge>
          )
        }
      />

      <div className="grid gap-5 p-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold text-zinc-900">执行进度</span>
            <span className="text-zinc-500">{percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-cyan-600 transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>

          {waitingApproval && run.currentStep ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <LockKeyhole className="h-4 w-4" />
                等待授权：{run.currentStep.label}
              </div>
              {run.currentStep.commandReview ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <StatusBadge status={riskStatus(run.currentStep.commandReview.risk)}>{run.currentStep.commandReview.risk}</StatusBadge>
                  <span className="text-amber-900">{run.currentStep.commandReview.reasons?.[0]}</span>
                </div>
              ) : null}
              {run.currentStep.command ? <div className="mt-3 rounded-md bg-white p-3 font-mono text-xs text-amber-950">{run.currentStep.command}</div> : null}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <PrimaryButton onClick={onApproveStep} className="bg-emerald-700 hover:bg-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  批准继续
                </PrimaryButton>
                <SecondaryButton onClick={onRejectStep} className="border-rose-200 text-rose-700 hover:bg-rose-50">
                  <X className="h-4 w-4" />
                  拒绝停止
                </SecondaryButton>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            {stepStates.map((step) => {
              const state = step.status === "success" ? "done" : step.status === "running" ? "running" : step.status === "pending_approval" ? "approval" : step.status === "failed" ? "failed" : "waiting";
              return (
                <div key={`${step.index}-${step.label}`} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
                  <div
                    className={cx(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                      state === "done" && "bg-emerald-100 text-emerald-700",
                      state === "running" && "bg-cyan-100 text-cyan-700",
                      state === "approval" && "bg-amber-100 text-amber-700",
                      state === "failed" && "bg-rose-100 text-rose-700",
                      state === "waiting" && "bg-zinc-100 text-zinc-400",
                    )}
                  >
                    {state === "done" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : state === "running" ? (
                      <Zap className="h-4 w-4" />
                    ) : state === "approval" ? (
                      <LockKeyhole className="h-4 w-4" />
                    ) : state === "failed" ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Clock3 className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium text-zinc-800">{step.label}</div>
                      {step.commandReview ? <StatusBadge status={riskStatus(step.commandReview.risk)}>{step.commandReview.risk}</StatusBadge> : null}
                    </div>
                    {step.command ? <div className="mt-0.5 truncate font-mono text-xs text-zinc-400">{step.command}</div> : null}
                  </div>
                  <span className="text-xs text-zinc-400">{state === "done" ? "完成" : state === "running" ? "执行中" : state === "approval" ? "待授权" : state === "failed" ? "已拒绝" : "等待"}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Square className="h-3 w-3 fill-emerald-500 text-emerald-500" />
              执行日志
            </div>
            <span className="text-xs text-zinc-500">yian-agent-runner</span>
          </div>
          <div className="h-[315px] overflow-y-auto p-4 font-mono text-sm leading-6 text-zinc-200">
            {run.logs.map((line) => (
              <div key={line} className="break-words">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Dashboard({ filteredAgents, checks, activeRun, agentCount, onRun, onScan, onOpenMarket, onRollback, onApproveStep, onRejectStep }) {
  const okCount = checks.filter((item) => item.status === "ok").length;
  const warnCount = checks.filter((item) => item.status === "warn").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">系统健康</p>
              <div className="mt-2 text-2xl font-semibold text-zinc-950">{okCount}/{checks.length}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">待处理提醒</p>
              <div className="mt-2 text-2xl font-semibold text-zinc-950">{warnCount}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">官方 Agent</p>
              <div className="mt-2 text-2xl font-semibold text-zinc-950">{agentCount}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
              <Store className="h-5 w-5" />
            </div>
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">权限模式</p>
              <div className="mt-2 text-lg font-semibold text-zinc-950">自动低风险</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-rose-50 text-rose-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <RunPanel run={activeRun} onRollback={onRollback} onOpenMarket={onOpenMarket} onApproveStep={onApproveStep} onRejectStep={onRejectStep} />

        <Panel>
          <PanelHeader
            icon={Search}
            title="快速系统检测"
            desc="MVP 检测项来自开发文档 4.2。"
            action={
              <IconButton title="重新检测" onClick={onScan}>
                <RotateCcw className="h-4 w-4" />
              </IconButton>
            }
          />
          <div className="space-y-3 p-4">
            {checks.slice(0, 5).map((check) => (
              <SystemCheckCard key={check.id} check={check} />
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          icon={Sparkles}
          title="推荐 Agent"
          desc="按当前系统状态优先推荐 PaddleOCR、运行库修复与 Python 环境。"
          action={
            <SecondaryButton onClick={onOpenMarket}>
              查看全部
              <ChevronRight className="h-4 w-4" />
            </SecondaryButton>
          }
        />
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.slice(0, 3).map((agent) => (
            <AgentCard key={agent.id} agent={agent} onRun={onRun} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Market({ agents, query, setQuery, category, setCategory, filteredAgents, onRun }) {
  const categories = ["全部", ...Array.from(new Set(agents.map((agent) => agent.category)))];

  return (
    <div className="space-y-5">
      <Panel>
        <PanelHeader icon={Store} title="Agent 市场" desc="官方 Agent 优先支持第一阶段 MVP：Steam、PaddleOCR、Python、VC++ Runtime。" />
        <div className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索 Agent、分类或平台"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setCategory(item)}
                  className={cx(
                    "h-9 rounded-md border px-3 text-sm font-semibold transition",
                    category === item ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onRun={onRun} />
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function SystemView({ checks, onScan }) {
  return (
    <Panel>
      <PanelHeader
        icon={MonitorCog}
        title="系统检测"
        desc="覆盖 Windows、CPU、GPU、Python、CUDA、网络、管理员权限、磁盘空间与环境变量。"
        action={
          <PrimaryButton onClick={onScan}>
            <Search className="h-4 w-4" />
            开始检测
          </PrimaryButton>
        }
      />
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => (
          <SystemCheckCard key={check.id} check={check} />
        ))}
      </div>
    </Panel>
  );
}

function LogsView({ activeRun, onApproveStep, onRejectStep, onRollback }) {
  const activeLog = activeRun
    ? [{ id: "active", name: activeRun.agent.name, status: activeRun.status === "success" ? "成功" : "执行中", time: "刚刚", risk: activeRun.agent.risk }, ...sampleHistory]
    : sampleHistory;

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <Panel>
        <PanelHeader icon={History} title="安装历史" desc="记录 Agent、状态、风险等级与执行时间。" />
        <div className="divide-y divide-zinc-100">
          {activeLog.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-900">{log.name}</div>
                <div className="mt-1 text-xs text-zinc-500">{log.time}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={log.status === "成功" ? "ok" : log.status === "执行中" ? "running" : "idle"}>{log.status}</StatusBadge>
                <StatusBadge status={log.risk === "中风险" ? "warn" : "ok"}>{log.risk}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <RunPanel run={activeRun} onRollback={onRollback} onOpenMarket={() => {}} onApproveStep={onApproveStep} onRejectStep={onRejectStep} />
    </div>
  );
}

function DiagnosisView({ onRunPaddle }) {
  return (
    <Panel>
      <PanelHeader icon={Wrench} title="AI 问题诊断" desc="根据文档示例，先实现 PaddleOCR 安装失败的诊断闭环。" />
      <div className="grid gap-4 p-5 lg:grid-cols-3">
        {repairFindings.map((finding) => (
          <article key={finding.title} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-zinc-950">{finding.title}</h3>
              <StatusBadge status={finding.level === "建议修复" ? "warn" : "info"}>{finding.level}</StatusBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-500">{finding.detail}</p>
            <div className="mt-4 rounded-md bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">{finding.action}</div>
          </article>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-500">推荐执行 PaddleOCR Agent，由权限系统确认每一步命令。</div>
        <PrimaryButton onClick={onRunPaddle}>
          <Play className="h-4 w-4" />
          执行推荐修复
        </PrimaryButton>
      </div>
    </Panel>
  );
}

function SettingsView({ permissionMode, setPermissionMode }) {
  return (
    <div className="space-y-5">
      <Panel>
        <PanelHeader icon={ShieldCheck} title="权限模式" desc="对应开发文档中的默认模式、自动模式和完全授权模式。" />
        <div className="grid gap-3 p-5 md:grid-cols-3">
          {permissionModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setPermissionMode(mode.id)}
              className={cx(
                "rounded-lg border p-4 text-left transition",
                permissionMode === mode.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{mode.label}</span>
                {permissionMode === mode.id ? <CheckCircle2 className="h-4 w-4" /> : null}
              </div>
              <p className={cx("mt-2 text-sm leading-6", permissionMode === mode.id ? "text-zinc-300" : "text-zinc-500")}>{mode.desc}</p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader icon={AlertTriangle} title="危险命令检测" desc="MVP 先展示静态规则，后续接入本地 Agent 执行器。" />
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {["格式化磁盘", "删除系统目录", "关闭安全中心", "执行未知远程脚本"].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                <AlertTriangle className="h-4 w-4" />
                {item}
              </div>
              <StatusBadge status="danger">禁止</StatusBadge>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export default function YianLandingPage() {
  const [activeView, setActiveView] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [permissionMode, setPermissionMode] = useState("auto");
  const [agentCatalog, setAgentCatalog] = useState(agents);
  const [checks, setChecks] = useState(initialChecks);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [backendStatus, setBackendStatus] = useState("offline");

  const filteredAgents = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return agentCatalog.filter((agent) => {
      const matchesCategory = category === "全部" || agent.category === category;
      const haystack = `${agent.name} ${agent.category} ${agent.platform} ${agent.summary}`.toLowerCase();
      return matchesCategory && (!keyword || haystack.includes(keyword));
    });
  }, [agentCatalog, category, query]);

  useEffect(() => {
    let cancelled = false;

    async function loadLocalServiceData() {
      try {
        const [apiAgents, systemInfo] = await Promise.all([yianApi.agents(), yianApi.systemInfo()]);
        if (cancelled) return;
        setAgentCatalog(apiAgents.map(hydrateAgent));
        setChecks((systemInfo.checks || []).map(hydrateCheck));
        setBackendStatus("online");
      } catch {
        if (!cancelled) setBackendStatus("offline");
      }
    }

    loadLocalServiceData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeRun || !["running", "waiting_approval"].includes(activeRun.status)) return undefined;

    if (activeRun.backendRunId) {
      const timer = window.setInterval(async () => {
        try {
          const record = await yianApi.getRun(activeRun.backendRunId);
          setBackendStatus("online");
          setActiveRun((current) => {
            if (!current || current.backendRunId !== activeRun.backendRunId) return current;
            return normalizeRunRecord(record, current.agent);
          });
        } catch {
          setBackendStatus("offline");
        }
      }, 1000);

      return () => window.clearInterval(timer);
    }

    const timer = window.setInterval(() => {
      setActiveRun((current) => {
        if (!current || current.status !== "running") return current;

        const nextProgress = current.progress + 1;
        const completedStep = current.steps[current.progress];
        const nextLogs = completedStep
          ? [...current.logs, `[OK] ${completedStep}`]
          : current.logs;

        if (nextProgress >= current.steps.length) {
          return {
            ...current,
            progress: current.steps.length,
            status: "success",
            logs: [...nextLogs, "[DONE] Agent 执行完成，日志已归档。"],
          };
        }

        return {
          ...current,
          progress: nextProgress,
          logs: [...nextLogs, `[RUN] ${current.steps[nextProgress]}`],
        };
      });
    }, 1150);

    return () => window.clearInterval(timer);
  }, [activeRun]);

  const openPermission = (agent) => {
    setSelectedAgent(agent);
  };

  const startAgent = async (agent) => {
    setSelectedAgent(null);
    setActiveView("dashboard");

    try {
      const record = await yianApi.runAgent(agent.id, permissionMode);
      setBackendStatus("online");
      setActiveRun(normalizeRunRecord(record, agent));
      return;
    } catch {
      setBackendStatus("offline");
    }

    setActiveRun({
      id: `${agent.id}-${Date.now()}`,
      agent,
      steps: agent.steps,
      progress: 0,
      status: "running",
      logs: [
        `[INIT] 已加载 ${agent.name}`,
        `[MODE] 权限模式：${permissionModes.find((item) => item.id === permissionMode)?.label}`,
        `[SCAN] 命令风险扫描通过`,
        `[RUN] ${agent.steps[0]}`,
      ],
    });
  };

  const rollbackRun = async () => {
    if (!activeRun) return;
    if (activeRun.backendRunId) {
      try {
        const record = await yianApi.rollback(activeRun.backendRunId);
        setBackendStatus("online");
        setActiveRun(normalizeRunRecord(record, activeRun.agent));
        return;
      } catch {
        setBackendStatus("offline");
      }
    }
    setActiveRun({
      ...activeRun,
      status: "success",
      logs: [...activeRun.logs, "[ROLLBACK] 已模拟清理临时文件、还原环境变量并生成回滚记录。"],
    });
  };

  const decideCurrentStep = async (approved) => {
    if (!activeRun?.backendRunId) return;
    try {
      const record = await yianApi.approveStep(activeRun.backendRunId, approved, approved ? "用户在易安客户端批准继续" : "用户在易安客户端拒绝执行");
      setBackendStatus("online");
      setActiveRun(normalizeRunRecord(record, activeRun.agent));
    } catch {
      setBackendStatus("offline");
    }
  };

  const scanSystem = async () => {
    try {
      const systemInfo = await yianApi.systemInfo();
      setChecks((systemInfo.checks || []).map(hydrateCheck));
      setBackendStatus("online");
      return;
    } catch {
      setBackendStatus("offline");
    }

    setScanCount((value) => value + 1);
    setChecks((current) =>
      current.map((check) => {
        if (check.id === "gpu" && scanCount % 2 === 0) {
          return { ...check, value: "NVIDIA RTX / 驱动版本 552.44", status: "ok" };
        }
        if (check.id === "admin" && scanCount % 2 === 0) {
          return { ...check, value: "当前非管理员，执行时按需提升", status: "info" };
        }
        return check;
      }),
    );
  };

  const renderView = () => {
    if (activeView === "market") {
      return <Market agents={agentCatalog} query={query} setQuery={setQuery} category={category} setCategory={setCategory} filteredAgents={filteredAgents} onRun={openPermission} />;
    }
    if (activeView === "system") {
      return <SystemView checks={checks} onScan={scanSystem} />;
    }
    if (activeView === "logs") {
      return <LogsView activeRun={activeRun} onApproveStep={() => decideCurrentStep(true)} onRejectStep={() => decideCurrentStep(false)} onRollback={rollbackRun} />;
    }
    if (activeView === "diagnosis") {
      return <DiagnosisView onRunPaddle={() => openPermission(agentCatalog.find((agent) => agent.id === "paddleocr") || agentCatalog[0])} />;
    }
    if (activeView === "settings") {
      return <SettingsView permissionMode={permissionMode} setPermissionMode={setPermissionMode} />;
    }
    return (
      <Dashboard
        filteredAgents={filteredAgents}
        checks={checks}
        activeRun={activeRun}
        agentCount={agentCatalog.length}
        onRun={openPermission}
        onScan={scanSystem}
        onOpenMarket={() => setActiveView("market")}
        onRollback={rollbackRun}
        onApproveStep={() => decideCurrentStep(true)}
        onRejectStep={() => decideCurrentStep(false)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f4f1] text-zinc-950">
      <div className="grid min-h-screen lg:grid-cols-[248px_1fr]">
        <aside className="hidden border-r border-zinc-200 bg-white lg:block">
          <div className="flex h-16 items-center gap-3 border-b border-zinc-100 px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-lg font-bold text-white">易</div>
            <div>
              <div className="font-semibold leading-5 text-zinc-950">易安 Yian</div>
              <div className="text-xs text-zinc-500">AI 安装与修复助手</div>
            </div>
          </div>
          <nav className="space-y-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={cx(
                    "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition",
                    activeView === item.id ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mx-3 mt-4 rounded-lg border border-cyan-100 bg-cyan-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
              <BadgeCheck className="h-4 w-4" />
              MVP v0.4
            </div>
            <p className="mt-2 text-sm leading-6 text-cyan-800">已接入本地 API、单步授权、命令沙箱、风险分级与日志回滚。</p>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="lg:hidden">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-lg font-bold text-white">易</div>
                    <div>
                      <div className="font-semibold leading-5 text-zinc-950">易安 Yian</div>
                      <div className="text-xs text-zinc-500">AI 安装与修复助手</div>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <h1 className="text-lg font-semibold text-zinc-950">{navItems.find((item) => item.id === activeView)?.label}</h1>
                  <p className="mt-1 text-sm text-zinc-500">让软件安装与系统配置变得简单、安全、智能。</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={backendStatus === "online" ? "ok" : "idle"}>
                  {backendStatus === "online" ? "本地服务已连接" : "演示数据模式"}
                </StatusBadge>
                <div className="flex rounded-md border border-zinc-200 bg-zinc-50 p-1">
                  {permissionModes.map((mode) => (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setPermissionMode(mode.id)}
                      className={cx(
                        "h-8 rounded px-3 text-xs font-semibold transition",
                        permissionMode === mode.id ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <SecondaryButton onClick={scanSystem}>
                  <Search className="h-4 w-4" />
                  系统检测
                </SecondaryButton>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={cx(
                      "flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold",
                      activeView === item.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </header>

          <div className="p-4 lg:p-6">{renderView()}</div>
        </main>
      </div>

      <PermissionModal agent={selectedAgent} mode={permissionMode} onClose={() => setSelectedAgent(null)} onStart={startAgent} />
    </div>
  );
}
