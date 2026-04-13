requireAuth();

const userId = getUserIdFromUrl();
const userCsvExportBtn = document.getElementById("userCsvExportBtn");

userCsvExportBtn?.addEventListener("click", async () => {
  if (!userId) return;
  await downloadFileWithAuth(`/api/analytics/users/${userId}/export/csv`, `user-${userId}-analytics.csv`);
});

const subtitle = document.getElementById("userAnalyticsSubtitle");
const content = document.getElementById("userAnalyticsContent");
let userScansChartInstance = null;

function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("userId");
}

function build14DaySeries(scansByDay) {
  const today = new Date();
  const map = new Map(scansByDay.map(item => [item.scan_date, item.total]));

  const labels = [];
  const values = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    const key = `${year}-${month}-${day}`;
    labels.push(`${day}/${month}`);
    values.push(map.get(key) || 0);
  }

  return { labels, values };
}

function renderUserScansChart(scansByDay) {
  const canvas = document.getElementById("userScansByDayChart");
  if (!canvas) return;

  const { labels, values } = build14DaySeries(scansByDay);

  if (userScansChartInstance) {
    userScansChartInstance.destroy();
  }

  userScansChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Scans",
          data: values,
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#ffffff",
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#b6bcc8",
          },
          grid: {
            color: "rgba(255,255,255,0.06)",
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: "#b6bcc8",
          },
          grid: {
            color: "rgba(255,255,255,0.06)",
          },
        },
      },
    },
  });
}

function renderQRCodeCard(qr) {
  return `
    <div class="record-card">
      <div class="record-top">
        <div>
          <h3 class="record-title">${qr.short_code}</h3>
          <p class="record-subtitle">${qr.card_number || "No linked card"}</p>
        </div>
        <span class="badge badge-success">${qr.total_scans} scans</span>
      </div>

      <div class="record-meta">
        <div><strong>Status:</strong> ${qr.status || "-"}</div>
        <div><strong>Created:</strong> ${new Date(qr.created_at).toLocaleString()}</div>
        <div><strong>Target URL:</strong> <a href="${qr.target_url}" target="_blank">${qr.target_url}</a></div>
      </div>

      <div style="margin-top: 14px;">
        <img class="qr-preview" src="${qr.image_path}" alt="QR Code Preview" />
      </div>
    </div>
  `;
}

function renderRecentScan(scan) {
  return `
    <tr>
      <td>${scan.short_code || "-"}</td>
      <td>${scan.device_type || "-"}</td>
      <td>${scan.browser || "-"}</td>
      <td>${scan.os || "-"}</td>
      <td>${scan.city || "-"}${scan.country ? `, ${scan.country}` : ""}</td>
      <td>${scan.scan_result || "-"}</td>
      <td>${new Date(scan.scanned_at).toLocaleString()}</td>
    </tr>
  `;
}

async function loadUserAnalytics() {
  const userId = getUserIdFromUrl();

  if (!userId) {
    content.innerHTML = `<div class="empty-state">No user selected.</div>`;
    subtitle.textContent = "User ID missing.";
    return;
  }

  const res = await fetchWithAuth(`/api/analytics/users/${userId}`);
  if (!res) return;

  const data = await safeJson(res);

  if (!res.ok) {
    subtitle.textContent = "Unable to load user analytics.";
    content.innerHTML = `<div class="empty-state">${data?.message || "Failed to load analytics."}</div>`;
    return;
  }

  const stats = data.data;
  const user = stats.user;
  const qrCodes = stats.qr_codes || [];
  const recentScans = stats.recent_scans || [];
  const scansByDay = stats.scans_by_day || [];

  subtitle.textContent = `${user.full_name} • ${user.job_title || "No title"}${user.company_name ? ` • ${user.company_name}` : ""}`;

  content.innerHTML = `
    <div class="summary-grid" style="margin-bottom: 22px;">
      <div class="summary-card">
        <h3>Total Scans</h3>
        <p>${stats.total_scans || 0}</p>
      </div>
      <div class="summary-card">
        <h3>Scans Today</h3>
        <p>${stats.scans_today || 0}</p>
      </div>
      <div class="summary-card">
        <h3>QR Codes</h3>
        <p>${qrCodes.length}</p>
      </div>
    </div>

    <section class="panel" style="margin-bottom: 22px;">
      <h2>Scans by Day</h2>
      <p class="panel-subtitle">Scan activity for this user over the last 14 days.</p>
      <div style="height: 320px;">
        <canvas id="userScansByDayChart"></canvas>
      </div>
    </section>

    <section class="panel" style="margin-bottom: 22px;">
      <h2>User QR Codes</h2>
      <p class="panel-subtitle">All QR codes assigned to this user.</p>
      <div class="records">
        ${
          qrCodes.length
            ? qrCodes.map(renderQRCodeCard).join("")
            : `<div class="empty-state">No QR codes found for this user.</div>`
        }
      </div>
    </section>

    <section class="panel">
      <h2>Recent Scans</h2>
      <p class="panel-subtitle">Latest scan activity for this user's QR codes.</p>
      ${
        recentScans.length
          ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>QR Code</th>
                    <th>Device</th>
                    <th>Browser</th>
                    <th>OS</th>
                    <th>Location</th>
                    <th>Result</th>
                    <th>Scanned At</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentScans.map(renderRecentScan).join("")}
                </tbody>
              </table>
            </div>
          `
          : `<div class="empty-state">No recent scans for this user yet.</div>`
      }
    </section>
  `;

  renderUserScansChart(scansByDay);
}

loadUserAnalytics();