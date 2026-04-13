function ensureToastContainer() {
  let container = document.getElementById("toastContainer");

  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  return container;
}

function showToast(message, type = "success", title = "") {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  toast.innerHTML = `
    ${title ? `<div class="toast-title">${title}</div>` : ""}
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    toast.style.transition = "0.2s ease";
  }, 2600);

  setTimeout(() => {
    toast.remove();
  }, 2900);
}

async function downloadFileWithAuth(url, filenameFallback = "download") {
  const res = await fetchWithAuth(url);

  if (!res) return;

  if (!res.ok) {
    const data = await safeJson(res);
    showToast(data?.message || "Failed to download file", "error", "Download Failed");
    return;
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;

  const disposition = res.headers.get("Content-Disposition");
  const match = disposition && disposition.match(/filename="?([^"]+)"?/);
  link.download = match ? match[1] : filenameFallback;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(blobUrl);
}

async function copyToClipboard(text, successMessage = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage, "success", "Copied");
  } catch (error) {
    showToast("Unable to copy text", "error", "Copy Failed");
  }
}

function setButtonLoading(button, isLoading, loadingText = "Saving...") {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}