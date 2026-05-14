# Changelog

## 0.6.0 - 2026-05-14

- Added local user Agent registry backed by SQLite.
- Added APIs to save approved user Agent manifests, list saved user Agents, and enable or disable them.
- Included enabled user Agents in the executable Agent catalog and protected disabled user Agents from execution.
- Added frontend user Agent management panel with save, enable, and disable actions after Manifest audit.
- Updated version copy and documentation for the user Agent market workflow.

## 0.5.0 - 2026-05-14

- Added Agent Manifest audit API for user-submitted Agent JSON.
- Added schema validation, duplicate id checks, source review, permission review, command risk scanning, and rollback policy checks.
- Added Agent marketplace audit panel for pasting Manifest JSON and reviewing score, verdict, findings, and command-level risk details.
- Updated app version copy and documentation for the v0.5 Agent review workflow.

## 0.4.0 - 2026-05-14

- Added Yi'an local FastAPI backend with system detection, Agent catalog, dry-run runner, SQLite log storage, and diagnosis endpoints.
- Added command risk assessment with low/medium/high risk labels, blocked-command detection, and security scan API.
- Added dry-run sandbox executor with live execution disabled by default.
- Added step-level permission gate with approve/reject flow.
- Updated React client to show local service status, Agent marketplace, system checks, authorization modal, command risks, run logs, rollback, and diagnosis flow.
