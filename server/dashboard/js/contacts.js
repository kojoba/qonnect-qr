requireAuth();

const contactForm = document.getElementById("contactForm");
const contactList = document.getElementById("contactList");
const contactSubmitBtn = document.getElementById("contactSubmitBtn");
const contactCancelBtn = document.getElementById("contactCancelBtn");
const contactSearch = document.getElementById("contactSearch");
const contactCountryFilter = document.getElementById("contactCountryFilter");
const contactUserSelect = document.getElementById("contactUserSelect");

let contactsCache = [];
let usersCache = [];
let editingContactId = null;

function populateUserDropdown() {
  contactUserSelect.innerHTML = `<option value="">Select user</option>` +
    usersCache.map(user => `<option value="${user.id}">${user.full_name}</option>`).join("");
}

function populateCountryFilter() {
  const countries = [...new Set(
    contactsCache
      .map(item => item.country)
      .filter(Boolean)
  )].sort();

  contactCountryFilter.innerHTML =
    `<option value="">All Countries</option>` +
    countries.map(country => `<option value="${country}">${country}</option>`).join("");
}

function startEditContact(contact) {
  editingContactId = contact.id;

  contactForm.elements.id.value = contact.id;
  contactForm.elements.user_id.value = contact.user_id || "";
  contactForm.elements.display_name.value = contact.display_name || "";
  contactForm.elements.phone_primary.value = contact.phone_primary || "";
  if (contactForm.elements.phone_secondary) contactForm.elements.phone_secondary.value = contact.phone_secondary || "";
  contactForm.elements.email_primary.value = contact.email_primary || "";
  if (contactForm.elements.email_secondary) contactForm.elements.email_secondary.value = contact.email_secondary || "";
  if (contactForm.elements.address) contactForm.elements.address.value = contact.address || "";
  contactForm.elements.website.value = contact.website || "";
  if (contactForm.elements.linkedin_url) contactForm.elements.linkedin_url.value = contact.linkedin_url || "";
  contactForm.elements.whatsapp_number.value = contact.whatsapp_number || "";
  contactForm.elements.city.value = contact.city || "";
  contactForm.elements.country.value = contact.country || "";
  if (contactForm.elements.profile_photo_url) contactForm.elements.profile_photo_url.value = contact.profile_photo_url || "";
  contactForm.elements.bio.value = contact.bio || "";

  contactSubmitBtn.textContent = "Update Contact Profile";
  contactCancelBtn.style.display = "inline-flex";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetContactForm() {
  editingContactId = null;
  contactForm.reset();
  contactForm.elements.id.value = "";
  contactSubmitBtn.textContent = "Create Contact Profile";
  contactCancelBtn.style.display = "none";
}

function deleteContactRecord(id) {
  openConfirmModal({
    title: "Delete Contact Profile",
    message: "Are you sure you want to delete this contact profile?",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      const res = await fetchWithAuth(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res) return;

      const data = await safeJson(res);

      if (!res.ok) {
        showToast(data?.message || "Failed to delete contact profile", "error", "Delete Failed");
        return;
      }

      showToast(data.message || "Contact profile deleted successfully", "success", "Deleted");
      await loadContacts();

      if (editingContactId === id) resetContactForm();
    },
  });
}

function renderContactCard(contact) {
  return `
    <div class="record-card">
      <div class="record-top">
        <div>
          <h3 class="record-title">${contact.display_name}</h3>
          <p class="record-subtitle">${contact.full_name || "Linked user not found"}</p>
        </div>
        <span class="badge badge-success">Profile #${contact.id}</span>
      </div>

      <div class="record-meta">
        <div><strong>Phone:</strong> ${contact.phone_primary || "-"}</div>
        <div><strong>Email:</strong> ${contact.email_primary || "-"}</div>
        <div><strong>Website:</strong> ${contact.website || "-"}</div>
        <div><strong>WhatsApp:</strong> ${contact.whatsapp_number || "-"}</div>
        <div><strong>Location:</strong> ${contact.city || "-"}${contact.country ? `, ${contact.country}` : ""}</div>
        <div><strong>Bio:</strong> ${contact.bio || "-"}</div>
      </div>

      <div class="record-actions">
        <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${contact.id}">Edit</button>
        ${
          canDeleteRecords()
            ? `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${contact.id}">Delete</button>`
            : ""
        }
      </div>
    </div>
  `;
}

function applyFilters() {
  const search = (contactSearch?.value || "").toLowerCase().trim();
  const country = (contactCountryFilter?.value || "").toLowerCase();

  const filtered = contactsCache.filter((contact) => {
    const matchesSearch =
      !search ||
      contact.display_name?.toLowerCase().includes(search) ||
      contact.email_primary?.toLowerCase().includes(search) ||
      contact.phone_primary?.toLowerCase().includes(search) ||
      contact.full_name?.toLowerCase().includes(search);

    const matchesCountry =
      !country || (contact.country || "").toLowerCase() === country;

    return matchesSearch && matchesCountry;
  });

  if (filtered.length === 0) {
    contactList.innerHTML = `<div class="empty-state">No contact profiles match your search.</div>`;
    return;
  }

  contactList.innerHTML = filtered.map(renderContactCard).join("");
}

async function loadUsers() {
  const res = await fetchWithAuth("/api/users");
  if (!res) return;

  const data = await safeJson(res);
  usersCache = data?.data || [];
  populateUserDropdown();
}

async function loadContacts() {
  const res = await fetchWithAuth("/api/contacts");
  if (!res) return;

  const data = await safeJson(res);
  contactsCache = data?.data || [];
  populateCountryFilter();
  applyFilters();
}

window.handleEditContact = function (id) {
  const contact = contactsCache.find((item) => item.id === id);
  if (contact) startEditContact(contact);
};

window.handleDeleteContact = function (id) {
  deleteContactRecord(id);
};

contactList.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit") {
    const contact = contactsCache.find((item) => Number(item.id) === id);
    if (contact) startEditContact(contact);
  }

  if (action === "delete") {
    if (!canDeleteRecords()) {
      showToast("You do not have permission to delete records", "error", "Forbidden");
      return;
    }
    deleteContactRecord(id);
  }
});

contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());
  const recordId = payload.id;
  delete payload.id;

  const isEdit = Boolean(recordId);
  const url = isEdit ? `/api/contacts/${recordId}` : "/api/contacts";
  const method = isEdit ? "PUT" : "POST";

  const res = await fetchWithAuth(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res) return;

  const data = await safeJson(res);

  if (!res.ok) {
    showToast(data?.message || "Failed to save contact profile", "error", "Save Failed");
    return;
  }

  showToast(data.message || "Contact profile saved successfully", "success", isEdit ? "Updated" : "Created");
  resetContactForm();
  loadContacts();
});

contactCancelBtn.addEventListener("click", resetContactForm);
contactSearch?.addEventListener("input", applyFilters);
contactCountryFilter?.addEventListener("change", applyFilters);

(async function init() {
  await loadUsers();
  await loadContacts();
})();