requireAuth();

const qrForm = document.getElementById("qrForm");
const qrList = document.getElementById("qrList");
const qrSearch = document.getElementById("qrSearch");
const qrStatusFilter = document.getElementById("qrStatusFilter");
const qrUserSelect = document.getElementById("qrUserSelect");
const qrCardSelect = document.getElementById("qrCardSelect");

let qrsCache = [];
let usersCache = [];
let cardsCache = [];

function populateUserDropdown() {
  qrUserSelect.innerHTML =
    `<option value="">Select user</option>` +
    usersCache
      .map((user) => `<option value="${user.id}">${user.full_name}</option>`)
      .join("");
}

function populateCardDropdown(filteredCards = cardsCache) {
  qrCardSelect.innerHTML =
    `<option value="">No linked card</option>` +
    filteredCards
      .map(
        (card) =>
          `<option value="${card.id}">${card.card_number} — ${card.full_name || "Unknown User"}</option>`,
      )
      .join("");
}

function filterCardsBySelectedUser() {
  const selectedUserId = qrUserSelect.value;

  if (!selectedUserId) {
    populateCardDropdown(cardsCache);
    return;
  }

  const filteredCards = cardsCache.filter(
    (card) => String(card.user_id) === String(selectedUserId),
  );

  populateCardDropdown(filteredCards);
}

function deleteQRRecord(id) {
  openConfirmModal({
    title: "Delete QR Code",
    message: "Are you sure you want to delete this QR code?",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      const res = await fetchWithAuth(`/api/qrcodes/${id}`, {
        method: "DELETE",
      });
      if (!res) return;

      const data = await safeJson(res);

      if (!res.ok) {
        showToast(
          data?.message || "Failed to delete QR code",
          "error",
          "Delete Failed",
        );
        return;
      }

      showToast(
        data.message || "QR code deleted successfully",
        "success",
        "Deleted",
      );
      await loadQRCodes();
    },
  });
}

function renderQRCard(qr) {
  return `
    <div class="record-card">
      <div class="record-top">
        <div>
          <h3 class="record-title">${qr.short_code}</h3>
          <p class="record-subtitle">
            ${qr.full_name || "Unknown User"}${qr.tier_name ? ` • ${qr.tier_name}` : ""}
            ${qr.tier_name && qr.tier_name.toLowerCase() === "elite" ? " • Direct Contact Mode" : ""}
          </p>
        </div>
        <span class="badge badge-success">${qr.status || "active"}</span>
      </div>

      <div class="record-meta">
        <div><strong>QR ID:</strong> ${qr.id}</div>
        <div><strong>Card Number:</strong> ${qr.card_number || "-"}</div>
        <div><strong>Payload Type:</strong> ${qr.payload_type || "-"}</div>
        <div><strong>Target URL:</strong> <a href="${qr.target_url}" target="_blank">${qr.target_url}</a></div>
      </div>

      <div class="metric-row">
        <div class="metric-pill">Short Code: ${qr.short_code}</div>
        <div class="metric-pill">Type: ${qr.payload_type || "-"}</div>
      </div>

      <div class="inline-actions" style="margin-top:12px;">
        <button class="copy-btn" data-copy="${qr.target_url}" type="button">Copy URL</button>
        <button class="copy-btn" data-copy="${qr.short_code}" type="button">Copy Short Code</button>
      </div>

      <div style="margin-top: 14px;">
        <img class="qr-preview" src="${qr.image_path}" alt="QR Code Preview" />
      </div>

      <div class="record-actions">
        <a class="btn btn-primary btn-sm" href="/dashboard/qr-analytics.html?qrId=${qr.id}">View Analytics</a>
        ${
          canDeleteRecords()
            ? `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${qr.id}">Delete</button>`
            : ""
        }
      </div>
    </div>
  `;
}

function applyFilters() {
  const search = (qrSearch?.value || "").toLowerCase().trim();
  const status = (qrStatusFilter?.value || "").toLowerCase();

  const filtered = qrsCache.filter((qr) => {
    const matchesSearch =
      !search ||
      qr.short_code?.toLowerCase().includes(search) ||
      qr.full_name?.toLowerCase().includes(search) ||
      qr.card_number?.toLowerCase().includes(search);

    const matchesStatus = !status || (qr.status || "").toLowerCase() === status;

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    qrList.innerHTML = `<div class="empty-state">No QR codes match your search.</div>`;
    return;
  }

  qrList.innerHTML = filtered.map(renderQRCard).join("");
}

async function loadLookups() {
  const [usersRes, cardsRes] = await Promise.all([
    fetchWithAuth("/api/users"),
    fetchWithAuth("/api/cards"),
  ]);

  if (!usersRes || !cardsRes) return;

  const usersData = await safeJson(usersRes);
  const cardsData = await safeJson(cardsRes);

  usersCache = usersData?.data || [];
  cardsCache = cardsData?.data || [];

  populateUserDropdown();
  populateCardDropdown();
}

async function loadQRCodes() {
  const res = await fetchWithAuth("/api/qrcodes");
  if (!res) return;

  const data = await safeJson(res);
  qrsCache = data?.data || [];
  applyFilters();
}

qrList.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "delete") {
    deleteQRRecord(id);
  }
});

qrList.addEventListener("click", (e) => {
  const copyBtn = e.target.closest("button[data-copy]");
  if (copyBtn) {
    copyToClipboard(copyBtn.dataset.copy, "QR number copied");
    return;
  }

  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit") {
    const qr = qrsCache.find((item) => Number(item.id) === id);
    if (qr) startEditQR(qr);
  }

  if (action === "delete") {
    if (!canDeleteRecords()) {
      showToast("You do not have permission to delete records", "error", "Forbidden");
      return;
    }
    deleteQRRecord(id);
  }
});

qrUserSelect?.addEventListener("change", filterCardsBySelectedUser);

qrForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(qrForm);
  const payload = Object.fromEntries(formData.entries());

  if (!payload.card_id) delete payload.card_id;

  const res = await fetchWithAuth("/api/qrcodes/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res) return;

  const data = await safeJson(res);

  if (!res.ok) {
    showToast(
      data?.message || "Failed to generate QR code",
      "error",
      "Generate Failed",
    );
    return;
  }

  showToast(
    data.message || "QR generated successfully",
    "success",
    "Generated",
  );
  qrForm.reset();
  populateCardDropdown(cardsCache);
  loadQRCodes();
});

qrSearch?.addEventListener("input", applyFilters);
qrStatusFilter?.addEventListener("change", applyFilters);

(async function init() {
  await loadLookups();
  await loadQRCodes();
})();
