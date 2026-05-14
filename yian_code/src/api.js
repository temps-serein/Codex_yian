const API_BASE = import.meta.env.VITE_YIAN_API_BASE || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("application/json")) {
    throw new Error(`Yian API request failed: ${response.status}`);
  }
  return response.json();
}

export const yianApi = {
  health() {
    return request("/api/health");
  },
  agents() {
    return request("/api/agents");
  },
  userAgents() {
    return request("/api/agents/user");
  },
  systemInfo() {
    return request("/api/system/info");
  },
  auditAgent(manifest) {
    return request("/api/agents/audit", {
      method: "POST",
      body: JSON.stringify({ manifest }),
    });
  },
  saveUserAgent(manifest) {
    return request("/api/agents/user", {
      method: "POST",
      body: JSON.stringify({ manifest }),
    });
  },
  setUserAgentStatus(agentId, status) {
    return request(`/api/agents/user/${agentId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  runAgent(agentId, permissionMode) {
    return request("/api/agent/run", {
      method: "POST",
      body: JSON.stringify({
        agent_id: agentId,
        permission_mode: permissionMode,
        dry_run: true,
      }),
    });
  },
  getRun(runId) {
    return request(`/api/agent/runs/${runId}`);
  },
  approveStep(runId, approved, note = "") {
    return request(`/api/agent/runs/${runId}/approval`, {
      method: "POST",
      body: JSON.stringify({ approved, note }),
    });
  },
  rollback(runId) {
    return request(`/api/agent/runs/${runId}/rollback`, {
      method: "POST",
      body: "{}",
    });
  },
  logs() {
    return request("/api/logs");
  },
  log(runId) {
    return request(`/api/logs/${runId}`);
  },
  diagnose(issue, logs = []) {
    return request("/api/diagnose", {
      method: "POST",
      body: JSON.stringify({ issue, logs }),
    });
  },
};
