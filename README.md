# 易安 Yian

易安是一个基于 AI Agent 的跨平台软件安装、环境配置与系统修复助手原型。

当前版本：`0.5.0`

## 功能状态

- React + Vite 前端客户端原型
- FastAPI 本地 Agent 服务
- 系统检测 API
- Agent Manifest 与市场展示
- Agent Manifest 导入审核
- dry-run 安装执行流
- 单步权限确认
- 命令风险分级与阻断
- dry-run 沙箱与日志记录

## 启动

```bash
cd yian_code
npm install
python -m pip install -r backend/requirements.txt
npm run api
npm run dev
```

默认前端地址为 `http://127.0.0.1:5173/`。如果端口被占用，Vite 会提示新的本地端口。

## 安全说明

当前默认只执行 dry-run，不会真实安装软件。真实执行需要显式设置 `YIAN_ALLOW_LIVE_EXECUTION=1`，并且 v0.5 仅允许只读白名单命令进入 live sandbox。用户上传 Agent 需先通过 Manifest 审核与命令风险扫描。
