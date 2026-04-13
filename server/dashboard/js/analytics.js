requireAuth();

const downloadCsvBtn = document.getElementById("downloadAnalyticsCsvBtn");
const downloadPdfBtn = document.getElementById("downloadAnalyticsPdfBtn");

downloadCsvBtn?.addEventListener("click", async () => {
  await downloadFileWithAuth("/api/analytics/export/csv", "analytics-report.csv");
});

downloadPdfBtn?.addEventListener("click", async () => {
  await downloadFileWithAuth("/api/analytics/export/pdf", "analytics-report.pdf");
});

const analytics = document.getElementById("analytics");
let scansChartInstance = null;
let deviceChartInstance = null;

function renderTopQRCard(qr) {
  return `
    <div class="record-card">
      <div class="record-top">
        <div>
          <h3 class="record-title">${qr.full_name || "Unknown User"}</h3>
          <p class="record-subtitle">QR: ${qr.short_code}</p>
        </div>
        <span class="badge badge-success">${qr.total_scans} scans</span>
      </div>
    </div>
  `;
}

function renderRecentScan(scan) {
  return `
    <tr>
      <td>${scan.full_name || "-"}</td>
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
  const canvas = document.getElementById("scansByDayChart");
  if (!canvas) return;

  const { labels, values } = build14DaySeries(scansByDay);

  if (scansChartInstance) {
    scansChartInstance.destroy();
  }

  scansChartInstance = new Chart(canvas, {
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

function renderDeviceChart(deviceBreakdown) {
  const canvas = document.getElementById("deviceBreakdownChart");
  if (!canvas) return;

  const labels = deviceBreakdown.map(item => item.device_type || "Unknown");
  const values = deviceBreakdown.map(item => item.total || 0);

  if (deviceChartInstance) {
    deviceChartInstance.destroy();
  }

  deviceChartInstance = new Chart(canvas, {
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

async function loadAnalytics() {
  const res = await fetchWithAuth("/api/analytics/summary");
  if (!res) return;

  const data = await safeJson(res);
  const stats = data?.data || {};

  const topQRCodes = stats.top_qr_codes || [];
  const deviceBreakdown = stats.device_breakdown || [];
  const recentScans = stats.recent_scans || [];
  const scansByDay = stats.scans_by_day || [];

  analytics.innerHTML = `
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
        <h3>Tracked QR Records</h3>
        <p>${topQRCodes.length}</p>
      </div>
    </div>

    <div class="layout-grid">
      <section class="panel">
        <h2>Scans by Day</h2>
        <p class="panel-subtitle">QR scan activity over the last 14 days.</p>
        <div style="height: 320px;">
          <canvas id="scansByDayChart"></canvas>
        </div>
      </section>

      <section class="panel">
        <h2>Device Breakdown</h2>
        <p class="panel-subtitle">Distribution of scans by device type.</p>
        <div style="height: 320px;">
          <canvas id="deviceBreakdownChart"></canvas>
        </div>
      </section>
    </div>

    <div style="height: 22px;"></div>

    <section class="panel" style="margin-bottom: 22px;">
      <h2>Top QR Codes</h2>
      <p class="panel-subtitle">Most scanned QR profiles.</p>
      <div class="records">
        ${
          topQRCodes.length
            ? topQRCodes.map(renderTopQRCard).join("")
            : `<div class="empty-state">No QR scan activity yet.</div>`
        }
      </div>
    </section>

    <section class="panel">
      <h2>Recent Scans</h2>
      <p class="panel-subtitle">Latest QR activity recorded by the system.</p>
      ${
        recentScans.length
          ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>User</th>
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
          : `<div class="empty-state">No recent scans yet.</div>`
      }
    </section>
  `;

  renderScansChart(scansByDay);
  renderDeviceChart(deviceBreakdown);
}

loadAnalytics();