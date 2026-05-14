# 易安本地 Agent 服务

第一阶段后端用于承载文档中的本地 AI Agent 引擎雏形：

- `GET /api/system/info`：读取系统检测项
- `GET /api/agents`：读取官方 Agent Manifest
- `POST /api/agent/run`：创建 dry-run 执行任务
- `GET /api/agent/runs/{run_id}`：查询任务进度与日志
- `POST /api/agent/runs/{run_id}/approval`：批准或拒绝当前等待授权的步骤
- `POST /api/agent/runs/{run_id}/rollback`：模拟回滚
- `POST /api/security/scan`：返回命令允许/阻断、风险等级和原因
- `GET /api/logs`：读取安装日志
- `POST /api/diagnose`：返回诊断建议

启动：

```bash
python -m pip install -r backend/requirements.txt
python backend/run.py
```

当前默认只做 dry-run，不会真实安装软件。
真实执行有硬开关保护：必须设置 `YIAN_ALLOW_LIVE_EXECUTION=1`，且 v0.4 只允许只读白名单命令进入 live sandbox。
