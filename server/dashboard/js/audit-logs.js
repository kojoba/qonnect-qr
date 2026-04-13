requireAuth();

if (!isSuperAdmin()) {
  window.location.href = "/dashboard/index.html";
}

const auditLogs = document.getElementById("auditLogs");

function renderAuditCard(log) {
  return `
    <div class="record-card">
      <div class="record-top">
        <div>
          <h3 class="record-title">${log.action.toUpperCase()} • ${log.entity_type}</h3>
          <p class="record-subtitle">${log.description || "-"}</p>
        </div>
        <span class="badge badge-success">${log.actor_role || "-"}</span>
      </div>

      <div class="record-meta">
        <div><strong>Actor:</strong> ${log.actor_name || "-"}${log.actor_email ? ` (${log.actor_email})` : ""}</div>
        <div><strong>Entity ID:</strong> ${log.entity_id || "-"}</div>
        <div><strong>Created At:</strong> ${new Date(log.created_at).toLocaleString()}</div>
      </div>
    </div>
  `;
}

async function loadAuditLogs() {
  auditLogs.innerHTML = `
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  `;

  const res = await fetchWithAuth("/api/audit-logs");
  if (!res) return;

  const data = await safeJson(res);

  if (!res.ok) {
    auditLogs.innerHTML = `<div class="empty-state">${data?.message || "Failed to load audit logs."}</div>`;
    return;
  }

  const logs = data.data || [];

  if (!logs.length) {
    auditLogs.innerHTML = `<div class="empty-state">No audit logs found.</div>`;
    return;
  }

  auditLogs.innerHTML = logs.map(renderAuditCard).join("");
}

loadAuditLogs();