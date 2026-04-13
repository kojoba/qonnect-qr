function ensureConfirmModal() {
  let overlay = document.getElementById("confirmModalOverlay");

  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "confirmModalOverlay";
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
      <div class="modal-header">
        <h3 id="confirmModalTitle">Confirm Action</h3>
      </div>
      <div class="modal-body" id="confirmModalMessage">
        Are you sure you want to continue?
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="confirmModalCancelBtn">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmModalConfirmBtn">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeConfirmModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      closeConfirmModal();
    }
  });

  return overlay;
}

function closeConfirmModal() {
  const overlay = document.getElementById("confirmModalOverlay");
  if (!overlay) return;

  overlay.classList.remove("active");

  const confirmBtn = document.getElementById("confirmModalConfirmBtn");
  const cancelBtn = document.getElementById("confirmModalCancelBtn");

  if (confirmBtn) confirmBtn.onclick = null;
  if (cancelBtn) cancelBtn.onclick = null;
}

function openConfirmModal({
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  confirmClass = "btn-danger",
  onConfirm = null,
}) {
  const overlay = ensureConfirmModal();
  const titleEl = document.getElementById("confirmModalTitle");
  const messageEl = document.getElementById("confirmModalMessage");
  const confirmBtn = document.getElementById("confirmModalConfirmBtn");
  const cancelBtn = document.getElementById("confirmModalCancelBtn");

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;

  confirmBtn.className = `btn ${confirmClass}`;
  cancelBtn.className = "btn btn-secondary";

  cancelBtn.onclick = () => closeConfirmModal();

  confirmBtn.onclick = async () => {
    try {
      if (typeof onConfirm === "function") {
        await onConfirm();
      }
    } finally {
      closeConfirmModal();
    }
  };

  overlay.classList.add("active");
}