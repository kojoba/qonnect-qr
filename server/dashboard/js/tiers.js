requireAuth();

const tierForm = document.getElementById("tierForm");
const tierList = document.getElementById("tierList");
const tierSubmitBtn = document.getElementById("tierSubmitBtn");
const tierCancelBtn = document.getElementById("tierCancelBtn");
const tierSearch = document.getElementById("tierSearch");
const tierFeatureFilter = document.getElementById("tierFeatureFilter");

let tiersCache = [];
let editingTierId = null;

function tierBadge(value) {
  return value
    ? `<span class="badge badge-success">Yes</span>`
    : `<span class="badge badge-neutral">No</span>`;
}

function startEditTier(tier) {
  editingTierId = tier.id;

  tierForm.elements.id.value = tier.id;
  tierForm.elements.tier_name.value = tier.tier_name || "";
  tierForm.elements.description.value = tier.description || "";
  tierForm.elements.material.value = tier.material || "";
  tierForm.elements.has_nfc.checked = !!tier.has_nfc;
  tierForm.elements.has_dynamic_qr.checked = !!tier.has_dynamic_qr;
  tierForm.elements.scan_analytics_enabled.checked = !!tier.scan_analytics_enabled;

  tierSubmitBtn.textContent = "Update Tier";
  tierCancelBtn.style.display = "inline-flex";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetTierForm() {
  editingTierId = null;
  tierForm.reset();
  tierForm.elements.id.value = "";
  tierForm.elements.has_dynamic_qr.checked = true;
  tierSubmitBtn.textContent = "Create Tier";
  tierCancelBtn.style.display = "none";
}

function deleteTierRecord(id) {
  openConfirmModal({
    title: "Delete Tier",
    message: "Are you sure you want to delete this tier? Cards linked to it may prevent deletion.",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      const res = await fetchWithAuth(`/api/tiers/${id}`, { method: "DELETE" });
      if (!res) return;

      const data = await safeJson(res);

      if (!res.ok) {
        showToast(data?.message || "Failed to delete tier", "error", "Delete Failed");
        return;
      }

      showToast(data.message || "Tier deleted successfully", "success", "Deleted");
      await loadTiers();

      if (editingTierId === id) resetTierForm();
    },
  });
}

function renderTierCard(tier) {
  return `
    <div class="record-card">
      <div class="record-top">
        <div>
          <h3 class="record-title">${tier.tier_name}</h3>
          <p class="record-subtitle">${tier.description || "No description provided"}</p>
        </div>
        <span class="badge badge-success">Tier #${tier.id}</span>
      </div>

      <div class="record-meta">
        <div><strong>Material:</strong> ${tier.material || "-"}</div>
        <div><strong>NFC:</strong> ${tierBadge(tier.has_nfc)}</div>
        <div><strong>Dynamic QR:</strong> ${tierBadge(tier.has_dynamic_qr)}</div>
        <div><strong>Analytics:</strong> ${tierBadge(tier.scan_analytics_enabled)}</div>
      </div>

      <div class="record-actions">
        <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${tier.id}">Edit</button>
        ${
          canDeleteRecords()
            ? `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${tier.id}">Delete</button>`
            : ""
        }
      </div>
    </div>
  `;
}

function applyFilters() {
  const search = (tierSearch?.value || "").toLowerCase().trim();
  const feature = (tierFeatureFilter?.value || "").toLowerCase();

  const filtered = tiersCache.filter((tier) => {
    const matchesSearch =
      !search ||
      tier.tier_name?.toLowerCase().includes(search) ||
      tier.material?.toLowerCase().includes(search);

    let matchesFeature = true;

    if (feature === "nfc") matchesFeature = !!tier.has_nfc;
    if (feature === "dynamic") matchesFeature = !!tier.has_dynamic_qr;
    if (feature === "analytics") matchesFeature = !!tier.scan_analytics_enabled;

    return matchesSearch && matchesFeature;
  });

  if (filtered.length === 0) {
    tierList.innerHTML = `<div class="empty-state">No tiers match your search.</div>`;
    return;
  }

  tierList.innerHTML = filtered.map(renderTierCard).join("");
}

async function loadTiers() {
  const res = await fetchWithAuth("/api/tiers");
  if (!res) return;

  const data = await safeJson(res);
  tiersCache = data?.data || [];
  applyFilters();
}

tierList.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit") {
    const tier = tiersCache.find((item) => Number(item.id) === id);
    if (tier) startEditTier(tier);
  }

  if (action === "delete") {
    if (!canDeleteRecords()) {
      showToast("You do not have permission to delete records", "error", "Forbidden");
      return;
    }
    deleteTierRecord(id);
  }
});

tierForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(tierForm);
  const recordId = formData.get("id");

  const payload = {
    tier_name: formData.get("tier_name"),
    description: formData.get("description"),
    material: formData.get("material"),
    has_nfc: formData.get("has_nfc") === "on",
    has_dynamic_qr: formData.get("has_dynamic_qr") === "on",
    scan_analytics_enabled: formData.get("scan_analytics_enabled") === "on",
  };

  const isEdit = Boolean(recordId);
  const url = isEdit ? `/api/tiers/${recordId}` : "/api/tiers";
  const method = isEdit ? "PUT" : "POST";

  const res = await fetchWithAuth(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res) return;

  const data = await safeJson(res);

  if (!res.ok) {
    showToast(data?.message || "Failed to save tier", "error", "Save Failed");
    return;
  }

  showToast(data.message || "Tier saved successfully", "success", isEdit ? "Updated" : "Created");
  resetTierForm();
  loadTiers();
});

tierCancelBtn.addEventListener("click", resetTierForm);
tierSearch?.addEventListener("input", applyFilters);
tierFeatureFilter?.addEventListener("change", applyFilters);

loadTiers();