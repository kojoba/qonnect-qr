requireAuth();

if (!isSuperAdmin()) {
  window.location.href = "/dashboard/index.html";
}

const staffForm = document.getElementById("staffForm");
const staffList = document.getElementById("staffList");
const staffSubmitBtn = document.getElementById("staffSubmitBtn");
const staffCancelBtn = document.getElementById("staffCancelBtn");

let staffCache = [];
let editingStaffId = null;

function renderStatusBadge(status) {
  const value = (status || "").toLowerCase();

  if (value === "active")
    return `<span class="badge badge-success">${status}</span>`;
  if (value === "inactive")
    return `<span class="badge badge-danger">${status}</span>`;
  return `<span class="badge badge-neutral">${status || "-"}</span>`;
}

function startEditStaff(user) {
  editingStaffId = user.id;

  staffForm.elements.id.value = user.id;
  staffForm.elements.full_name.value = user.full_name || "";
  staffForm.elements.email.value = user.email || "";
  staffForm.elements.password.value = "";
  staffForm.elements.role.value = user.role || "operator";
  staffForm.elements.status.value = user.status || "active";

  staffSubmitBtn.textContent = "Update Operator";
  staffCancelBtn.style.display = "inline-flex";
}

function resetStaffForm() {
  editingStaffId = null;
  staffForm.reset();
  staffForm.elements.id.value = "";
  staffForm.elements.role.value = "operator";
  staffForm.elements.status.value = "active";
  staffSubmitBtn.textContent = "Create Operator";
  staffCancelBtn.style.display = "none";
}

function renderStaffCard(user) {
  return `
    <div class="record-card">
      <div class="record-top">
        <div>
          <h3 class="record-title">${user.full_name}</h3>
          <p class="record-subtitle">${user.email}</p>
        </div>
        ${renderStatusBadge(user.status)}
      </div>

      <div class="record-meta">
        <div><strong>ID:</strong> ${user.id}</div>
        <div><strong>Role:</strong> <span class="badge ${user.role === 'super_admin' ? 'badge-warning' : 'badge-neutral'}"> ${user.role}</div>
        <div><strong>Last Login:</strong> ${user.last_login ? new Date(user.last_login).toLocaleString() : "-"}</div>
      </div>

      <div class="record-actions">
        <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${user.id}">Edit</button>
        ${
          canDeleteRecords()
            ? `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${user.id}">Delete</button>`
            : ""
        }
      </div>
    </div>
  `;
}

async function loadStaff() {
  const res = await fetchWithAuth("/api/staff");
  if (!res) return;

  const data = await safeJson(res);
  staffCache = data?.data || [];

  if (!staffCache.length) {
    staffList.innerHTML = `<div class="empty-state">No staff accounts found.</div>`;
    return;
  }

  staffList.innerHTML = staffCache.map(renderStaffCard).join("");
}

function deleteStaffRecord(id) {
  openConfirmModal({
    title: "Delete Operator",
    message: "Are you sure you want to delete this operator account?",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      const res = await fetchWithAuth(`/api/staff/${id}`, { method: "DELETE" });
      if (!res) return;

      const data = await safeJson(res);

      if (!res.ok) {
        showToast(
          data?.message || "Failed to delete operator",
          "error",
          "Delete Failed",
        );
        return;
      }

      showToast(
        data.message || "Operator deleted successfully",
        "success",
        "Deleted",
      );
      await loadStaff();

      if (editingStaffId === id) resetStaffForm();
    },
  });
}

staffList.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit") {
    const user = staffCache.find((item) => Number(item.id) === id);
    if (user) startEditStaff(user);
  }

  if (action === "delete") {
    if (!canDeleteRecords()) {
      showToast("You do not have permission to delete records", "error", "Forbidden");
      return;
    }
    deleteStaffRecord(id);
  }
});

staffForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  setButtonLoading(
    staffSubmitBtn,
    true,
    editingStaffId ? "Updating..." : "Creating...",
  );

  try {
    const formData = new FormData(staffForm);
    const payload = Object.fromEntries(formData.entries());
    const recordId = payload.id;
    delete payload.id;

    let url = "/api/staff";
    let method = "POST";

    if (recordId) {
      url = `/api/staff/${recordId}`;
      method = "PUT";

      delete payload.password;
    }

    const res = await fetchWithAuth(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res) return;

    const data = await safeJson(res);

    if (!res.ok) {
      showToast(
        data?.message || "Failed to save operator",
        "error",
        "Save Failed",
      );
      return;
    }

    showToast(
      data.message ||
        (recordId
          ? "Operator updated successfully"
          : "Operator created successfully"),
      "success",
      recordId ? "Updated" : "Created",
    );

    resetStaffForm();
    await loadStaff();
  } finally {
    setButtonLoading(staffSubmitBtn, false);
  }
});

staffCancelBtn.addEventListener("click", resetStaffForm);

loadStaff();