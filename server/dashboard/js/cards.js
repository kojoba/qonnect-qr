requireAuth();

const cardForm = document.getElementById("cardForm");
const cardList = document.getElementById("cardList");
const cardSubmitBtn = document.getElementById("cardSubmitBtn");
const cardCancelBtn = document.getElementById("cardCancelBtn");
const cardSearch = document.getElementById("cardSearch");
const cardStatusFilter = document.getElementById("cardStatusFilter");
const cardUserSelect = document.getElementById("cardUserSelect");
const cardTierSelect = document.getElementById("cardTierSelect");

let cardsCache = [];
let usersCache = [];
let tiersCache = [];
let editingCardId = null;

function statusBadge(status) {
  const value = (status || "").toLowerCase();

  if (value === "active" || value === "printed" || value === "delivered") {
    return `<span class="badge badge-success">${status}</span>`;
  }
  if (value === "pending") {
    return `<span class="badge badge-warning">${status}</span>`;
  }
  if (value === "inactive" || value === "revoked" || value === "cancelled") {
    return `<span class="badge badge-danger">${status}</span>`;
  }
  return `<span class="badge badge-neutral">${status || "-"}</span>`;
}

function populateUserDropdown() {
  cardUserSelect.innerHTML = `<option value="">Select user</option>` +
    usersCache.map(user => `<option value="${user.id}">${user.full_name}</option>`).join("");
}

function populateTierDropdown() {
  cardTierSelect.innerHTML = `<option value="">Select tier</option>` +
    tiersCache.map(tier => `<option value="${tier.id}">${tier.tier_name}</option>`).join("");
}

function startEditCard(card) {
  editingCardId = card.id;

  cardForm.elements.id.value = card.id;
  cardForm.elements.user_id.value = card.user_id || "";
  cardForm.elements.tier_id.value = card.tier_id || "";
  cardForm.elements.card_number.value = card.card_number || "";
  cardForm.elements.card_label.value = card.card_label || "";
  cardForm.elements.issue_date.value = card.issue_date || "";
  cardForm.elements.expiry_date.value = card.expiry_date || "";
  cardForm.elements.status.value = card.status || "active";
  cardForm.elements.print_status.value = card.print_status || "pending";

  cardSubmitBtn.textContent = "Update Card";
  cardCancelBtn.style.display = "inline-flex";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetCardForm() {
  editingCardId = null;
  cardForm.reset();
  cardForm.elements.id.value = "";
  cardForm.elements.card_number.value = ""
  cardForm.elements.status.value = "active"
  cardForm.elements.print_status.value = "pending"
  cardSubmitBtn.textContent = "Create Card";
  cardCancelBtn.style.display = "none";
}

function deleteCardRecord(id) {
  openConfirmModal({
    title: "Delete Card",
    message: "Are you sure you want to delete this card? Linked QR records may be affected.",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      const res = await fetchWithAuth(`/api/cards/${id}`, { method: "DELETE" });
      if (!res) return;

      const data = await safeJson(res);

      if (!res.ok) {
        showToast(data?.message || "Failed to delete card", "error", "Delete Failed");
        return;
      }

      showToast(data.message || "Card deleted successfully", "success", "Deleted");
      await loadCards();

      if (editingCardId === id) resetCardForm();
    },
  });
}

function renderCard(card) {
  return `
    <div class="record-card">
      <div class="record-top">
        <div>
          <h3 class="record-title">${card.card_number}</h3>
          <p class="record-subtitle">
            ${card.full_name || "Unknown User"} • ${card.tier_name || "No Tier"}
            ${card.tier_name && card.tier_name.toLowerCase() === "elite" ? " • Premium Contact Flow" : ""}
          </p>
        </div>
        ${statusBadge(card.status)}
      </div>

      <div class="record-meta">
        <div><strong>Card ID:</strong> ${card.id}</div>
        <div><strong>Label:</strong> ${card.card_label || "-"}</div>
        <div><strong>Issue Date:</strong> ${card.issue_date || "-"}</div>
        <div><strong>Expiry Date:</strong> ${card.expiry_date || "-"}</div>
        <div><strong>Print Status:</strong> ${statusBadge(card.print_status)}</div>
      </div>

      <div class="inline-actions">
        <button class="copy-btn" data-copy="${card.card_number}" type="button">Copy Card Number</button>

      <div class="record-actions">
        <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${card.id}">Edit</button>
        ${
          canDeleteRecords()
            ? `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${card.id}">Delete</button>`
            : ""
        }
      </div>
    </div>
  `;
}

function applyFilters() {
  const search = (cardSearch?.value || "").toLowerCase().trim();
  const status = (cardStatusFilter?.value || "").toLowerCase();

  const filtered = cardsCache.filter((card) => {
    const matchesSearch =
      !search ||
      card.card_number?.toLowerCase().includes(search) ||
      card.full_name?.toLowerCase().includes(search) ||
      card.tier_name?.toLowerCase().includes(search);

    const matchesStatus =
      !status || (card.status || "").toLowerCase() === status;

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    cardList.innerHTML = `<div class="empty-state">No cards match your search.</div>`;
    return;
  }

  cardList.innerHTML = filtered.map(renderCard).join("");
}

async function loadLookups() {
  const [usersRes, tiersRes] = await Promise.all([
    fetchWithAuth("/api/users"),
    fetchWithAuth("/api/tiers")
  ]);

  if (!usersRes || !tiersRes) return;

  const usersData = await safeJson(usersRes);
  const tiersData = await safeJson(tiersRes);

  usersCache = usersData?.data || [];
  tiersCache = tiersData?.data || [];

  populateUserDropdown();
  populateTierDropdown();
}

async function loadCards() {
  cardList.innerHTML = `
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  `;
  const res = await fetchWithAuth("/api/cards");
  if (!res) return;

  const data = await safeJson(res);
  cardsCache = data?.data || [];
  applyFilters();
}

cardList.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit") {
    const card = cardsCache.find((item) => Number(item.id) === id);
    if (card) startEditCard(card);
  }

  if (action === "delete") {
    if (!canDeleteRecords()) {
      showToast("You do not have permission to delete records", "error", "Forbidden");
      return;
    }
    deleteCardRecord(id);
  }
});

cardList.addEventListener("click", (e) => {
  const copyBtn = e.target.closest("button[data-copy]");
  if (copyBtn) {
    copyToClipboard(copyBtn.dataset.copy, "Card number copied");
    return;
  }

  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit") {
    const card = cardsCache.find((item) => Number(item.id) === id);
    if (card) startEditCard(card);
  }

  if (action === "delete") {
    deleteCardRecord(id);
  }
});

cardForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  setButtonLoading(cardSubmitBtn, true, editingCardId ? "Updating..." : "Creating...");

  try {
    const formData = new FormData(cardForm);
    const payload = Object.fromEntries(formData.entries());
    const recordId = payload.id;
    delete payload.id;

    const isEdit = Boolean(recordId);
    const url = isEdit ? `/api/cards/${recordId}` : "/api/cards";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetchWithAuth(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res) return;

    const data = await safeJson(res);

    if (!res.ok) {
      showToast(data?.message || "Failed to save card", "error", "Save Failed");
      return;
    }

    showToast(
      `${data.message}${data?.data?.card_number ? ` (${data.data.card_number})` : ""}`,
      "success",
      isEdit ? "Updated" : "Created"
    );

    resetCardForm();
    await loadCards();
  } finally {
    setButtonLoading(cardSubmitBtn, false);
  }
});

cardCancelBtn.addEventListener("click", resetCardForm);
cardSearch?.addEventListener("input", applyFilters);
cardStatusFilter?.addEventListener("change", applyFilters);

(async function init() {
  await loadLookups();
  resetCardForm()
  await loadCards();
})();