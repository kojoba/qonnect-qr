requireAuth();

const qrId = getQrIdFromUrl();
const qrCsvExportBtn = document.getElementById("qrCsvExportBtn");

qrCsvExportBtn?.addEventListener("click", async () => {
  if (!qrId) return;
  await downloadFileWithAuth(`/api/analytics/qrcodes/${qrId}/export/csv`, `qr-${qrId}-analytics.csv`);
});

const subtitle = document.getElementById("qrAnalyticsSubtitle");
const content = document.getElementById("qrAnalyticsContent");

let qrScansChartInstance = null;
let qrDeviceChartInstance = null;

function getQrIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("qrId");
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

function renderScansChart(scansByDay) {
  const canvas = document.getElementById("qrScansByDayChart");
  if (!canvas) return;

  const { labels, values } = build14DaySeries(scansByDay);

  if (qrScansChartInstance) qrScansChartInstance.destroy();

  qrScansChartInstance = new Chart(canvas, {
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
          labels: { color: "#ffffff" },
        },
      },
      scales: {
        x: {
          ticks: { color: "#b6bcc8" },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: "#b6bcc8" },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
    },
  });
}

function renderDeviceChart(deviceBreakdown) {
  const canvas = document.getElementById("qrDeviceBreakdownChart");
  if (!canvas) return;

  const labels = deviceBreakdown.map(item => item.device_type || "Unknown");
  const values = deviceBreakdown.map(item => item.total || 0);

  if (qrDeviceChartInstance) qrDeviceChartInstance.destroy();

  qrDeviceChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          label: "Devices",
          data: values,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#ffffff",
            padding: 16,
          },
        },
      },
    },
  });
}

function renderLocationCard(item) {
  return `
    <div class="record-card">
      <div class="record-top">
        <div>
          <h3 class="record-title">${item.country || "Unknown"}</h3>
          <p class="record-subtitle">Location scan count</p>
        </div>
        <span class="badge badge-success">${item.total}</span>
      </div>
    </div>
  `;
}

function renderRecentScan(scan) {
  return `
    <tr>
      <td>${scan.device_type || "-"}</td>
      <td>${scan.browser || "-"}</td>
      <td>${scan.os || "-"}</td>
      <td>${scan.city || "-"}${scan.country ? `, ${scan.country}` : ""}</td>
      <td>${scan.scan_result || "-"}</td>
      <td>${new Date(scan.scanned_at).toLocaleString()}</td>
    </tr>
  `;
}

async function loadQRAnalytics() {
  const qrId = getQrIdFromUrl();

  if (!qrId) {
    subtitle.textContent = "QR ID missing.";
    content.innerHTML = `<div class="empty-state">No QR selected.</div>`;
    return;
  }

  const res = await fetchWithAuth(`/api/analytics/qrcodes/${qrId}`);
  if (!res) return;

  const data = await safeJson(res);

  if (!res.ok) {
    subtitle.textContent = "Unable to load QR analytics.";
    content.innerHTML = `<div class="empty-state">${data?.message || "Failed to load QR analytics."}</div>`;
    return;
  }

  const stats = data.data;
  const qr = stats.qr;
  const scansByDay = stats.scans_by_day || [];
  const deviceBreakdown = stats.device_breakdown || [];
  const locationBreakdown = stats.location_breakdown || [];
  const recentScans = stats.recent_scans || [];

  subtitle.textContent = `${qr.short_code} • ${qr.full_name || "Unknown User"}${qr.card_number ? ` • ${qr.card_number}` : ""}`;

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
        <h3>Status</h3>
        <p style="font-size:20px;">${qr.status || "-"}</p>
      </div>
    </div>

    <section class="panel" style="margin-bottom: 22px;">
      <h2>QR Details</h2>
      <p class="panel-subtitle">Basic information about this QR record.</p>
      <div class="layout-grid">
        <div class="record-card">
          <div class="record-meta">
            <div><strong>Short Code:</strong> ${qr.short_code}</div>
            <div><strong>User:</strong> ${qr.full_name || "-"}</div>
            <div><strong>Email:</strong> ${qr.email || "-"}</div>
            <div><strong>Phone:</strong> ${qr.phone || "-"}</div>
            <div><strong>Company:</strong> ${qr.company_name || "-"}</div>
            <div><strong>Job Title:</strong> ${qr.job_title || "-"}</div>
            <div><strong>Card Number:</strong> ${qr.card_number || "-"}</div>
            <div><strong>Payload Type:</strong> ${qr.payload_type || "-"}</div>
            <div><strong>QR Type:</strong> ${qr.qr_type || "-"}</div>
            <div><strong>Target URL:</strong> <a href="${qr.target_url}" target="_blank">${qr.target_url}</a></div>
          </div>
        </div>

        <div class="record-card">
          <img class="qr-preview" src="${qr.image_path}" alt="QR Preview" />
        </div>
      </div>
    </section>

    <div class="layout-grid" style="margin-bottom: 22px;">
      <section class="panel">
        <h2>Scans by Day</h2>
        <p class="panel-subtitle">Daily activity for this QR code over the last 14 days.</p>
        <div style="height: 320px;">
          <canvas id="qrScansByDayChart"></canvas>
        </div>
      </section>

      <section class="panel">
        <h2>Device Breakdown</h2>
        <p class="panel-subtitle">Distribution of scans by device type.</p>
        <div style="height: 320px;">
          <canvas id="qrDeviceBreakdownChart"></canvas>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-bottom: 22px;">
      <h2>Location Breakdown</h2>
      <p class="panel-subtitle">Top countries where this QR has been scanned.</p>
      <div class="records">
        ${
          locationBreakdown.length
            ? locationBreakdown.map(renderLocationCard).join("")
            : `<div class="empty-state">No location data yet.</div>`
        }
      </div>
    </section>

    <section class="panel">
      <h2>Recent Scans</h2>
      <p class="panel-subtitle">Latest activity for this QR code.</p>
      ${
        recentScans.length
          ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
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
          : `<div class="empty-state">No recent scans for this QR yet.</div>`
      }
    </section>
  `;

  renderScansChart(scansByDay);
  renderDeviceChart(deviceBreakdown);
}

loadQRAnalytics();