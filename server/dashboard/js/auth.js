function getToken() {
  return localStorage.getItem("token");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("admin");
  window.location.href = "/dashboard/login.html";
}

function requireAuth() {
  const token = getToken();

  if (!token) {
    window.location.href = "/dashboard/login.html";
  }
}

async function fetchWithAuth(url, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    logout();
    return null;
  }

  return res;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function getCurrentAdmin() {
  try {
    return JSON.parse(localStorage.getItem("admin"));
  } catch {
    return null;
  }
}

function getCurrentRole() {
  return getCurrentAdmin()?.role || null;
}

function isSuperAdmin() {
  return getCurrentRole() === "super_admin";
}

function isOperator() {
  return getCurrentRole() === "operator";
}

function canDeleteRecords() {
  return isSuperAdmin();
}