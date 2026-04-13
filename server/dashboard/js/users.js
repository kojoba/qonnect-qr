requireAuth();

const userForm = document.getElementById("userForm");
const usersList = document.getElementById("usersList");
const userSubmitBtn = document.getElementById("userSubmitBtn");
const userCancelBtn = document.getElementById("userCancelBtn");
const userSearch = document.getElementById("userSearch");
const userStatusFilter = document.getElementById("userStatusFilter");

let editingUserId = null;
let usersCache = [];

function renderStatusBadge(status) {
  const value = (status || "").toLowerCase();

  if (value === "active")
    return `<span class="badge badge-success">${status}</span>`;
  if (value === "inactive" || value === "suspended")
    return `<span class="badge badge-danger">${status}</span>`;
  return `<span class="badge badge-neutral">${status || "-"}</span>`;
}

function startEditUser(user) {
  editingUserId = user.id;

  userForm.elements.id.value = user.id;
  userForm.elements.first_name.value = user.first_name || "";
  userForm.elements.last_name.value = user.last_name || "";
  userForm.elements.email.value = user.email || "";
  userForm.elements.phone.value = user.phone || "";
  userForm.elements.job_title.value = user.job_title || "";
  userForm.elements.company_name.value = user.company_name || "";
  userForm.elements.department.value = user.department || "";
  userForm.elements.status.value = user.status || "active";

  userSubmitBtn.textContent = "Update User";
  userCancelBtn.style.display = "inline-flex";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetUserForm() {
  editingUserId = null;
  userForm.reset();
  userForm.elements.id.value = "";
  userForm.elements.status.value = "active";
  userSubmitBtn.textContent = "Create User";
  userCancelBtn.style.display = "none";
}

function deleteUserRecord(id) {
  openConfirmModal({
    title: "Delete User",
    message:
      "Are you sure you want to delete this user? This action cannot be undone.",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      const res = await fetchWithAuth(`/api/users/${id}`, { method: "DELETE" });
      if (!res) return;

      const data = await safeJson(res);

      if (!res.ok) {
        showToast(
          data?.message || "Failed to delete user",
          "error",
          "Delete Failed",
        );
        return;
      }

      showToast(
        data.message || "User deleted successfully",
        "success",
        "Deleted",
      );
      await loadUsers();

      if (editingUserId === id) resetUserForm();
    },
  });
}

function renderUserCard(user) {
  return `
    <div class="record-card">
      <div class="record-top">
        <div>
          <h3 class="record-title">${user.full_name}</h3>
          <p class="record-subtitle">${user.job_title || "No title"}${user.company_name ? ` • ${user.company_name}` : ""}</p>
        </div>
        ${renderStatusBadge(user.status)}
      </div>

      <div class="record-meta">
        <div><strong>ID:</strong> ${user.id}</div>
        <div><strong>Email:</strong> ${user.email || "-"}</div>
        <div><strong>Phone:</strong> ${user.phone || "-"}</div>
        <div><strong>Department:</strong> ${user.department || "-"}</div>
      </div>

      <div class="record-actions">
        <a class="btn btn-primary btn-sm" href="/dashboard/user-analytics.html?userId=${user.id}">View Analytics</a>
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

function applyFilters() {
  const search = (userSearch?.value || "").toLowerCase().trim();
  const status = (userStatusFilter?.value || "").toLowerCase();

  const filtered = usersCache.filter((user) => {
    const matchesSearch =
      !search ||
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.phone?.toLowerCase().includes(search);

    const matchesStatus =
      !status || (user.status || "").toLowerCase() === status;

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    usersList.innerHTML = `<div class="empty-state">No users match your search.</div>`;
    return;
  }

  usersList.innerHTML = filtered.map(renderUserCard).join("");
}

async function loadUsers() {
  const res = await fetchWithAuth("/api/users");
  if (!res) return;

  const data = await safeJson(res);
  usersCache = data?.data || [];
  applyFilters();
}

usersList.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit") {
    const user = usersCache.find((item) => Number(item.id) === id);
    if (user) startEditUser(user);
  }

  if (action === "delete") {
    if (!canDeleteRecords()) {
      showToast("You do not have permission to delete records", "error", "Forbidden");
      return;
    }
    deleteUserRecord(id);
  }
});

userForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(userForm);
  const payload = Object.fromEntries(formData.entries());
  const recordId = payload.id;
  delete payload.id;

  const isEdit = Boolean(recordId);
  const url = isEdit ? `/api/users/${recordId}` : "/api/users";
  const method = isEdit ? "PUT" : "POST";

  const res = await fetchWithAuth(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res) return;

  const data = await safeJson(res);

  if (!res.ok) {
    showToast(data?.message || "Failed to save user", "error", "Save Failed");
    return;
  }

  showToast(
    data.message ||
      (isEdit ? "User updated successfully" : "User created successfully"),
    "success",
    isEdit ? "Updated" : "Created",
  );

  resetUserForm();
  loadUsers();
});

userCancelBtn.addEventListener("click", resetUserForm);
userSearch?.addEventListener("input", applyFilters);
userStatusFilter?.addEventListener("change", applyFilters);

loadUsers();
