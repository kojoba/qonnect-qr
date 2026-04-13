const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/response");
const {Parser} = require("json2csv")
const PDFDocument = require("pdfkit")

async function getScanSummary(req, res) {
  try {
    const totalScansResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM scan_logs
    `);

    const scansTodayResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM scan_logs
      WHERE DATE(scanned_at) = CURRENT_DATE
    `);

    const topQRCodesResult = await pool.query(`
      SELECT 
        q.id,
        q.short_code,
        u.full_name,
        COUNT(s.id)::int AS total_scans
      FROM scan_logs s
      JOIN qr_codes q ON s.qr_code_id = q.id
      JOIN users u ON q.user_id = u.id
      GROUP BY q.id, q.short_code, u.full_name
      ORDER BY total_scans DESC
      LIMIT 10
    `);

    const deviceBreakdownResult = await pool.query(`
      SELECT 
        COALESCE(device_type, 'Unknown') AS device_type,
        COUNT(*)::int AS total
      FROM scan_logs
      GROUP BY device_type
      ORDER BY total DESC
    `);

    const recentScansResult = await pool.query(`
      SELECT
        s.id,
        s.scanned_at,
        s.device_type,
        s.browser,
        s.os,
        s.country,
        s.city,
        s.scan_result,
        q.short_code,
        u.full_name
      FROM scan_logs s
      JOIN qr_codes q ON s.qr_code_id = q.id
      JOIN users u ON q.user_id = u.id
      ORDER BY s.scanned_at DESC
      LIMIT 20
    `);

    const scansByDayResult = await pool.query(`
      SELECT
        TO_CHAR(DATE(scanned_at), 'YYYY-MM-DD') AS scan_date,
        COUNT(*)::int AS total
      FROM scan_logs
      WHERE scanned_at >= CURRENT_DATE - INTERVAL '13 days'
      GROUP BY DATE(scanned_at)
      ORDER BY DATE(scanned_at) ASC
    `);

    const locationBreakdownResult = await pool.query(`
      SELECT
        COALESCE(country, 'Unknown') AS country,
        COUNT(*)::int AS total
      FROM scan_logs
      GROUP BY country
      ORDER BY total DESC
      LIMIT 10
    `)

    return successResponse(res, "Scan analytics fetched successfully", {
      total_scans: totalScansResult.rows[0].total,
      scans_today: scansTodayResult.rows[0].total,
      top_qr_codes: topQRCodesResult.rows,
      device_breakdown: deviceBreakdownResult.rows,
      recent_scans: recentScansResult.rows,
      scans_by_day: scansByDayResult.rows,
      location_breakdown: locationBreakdownResult.rows,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function getUserScanAnalytics(req, res) {
  try {
    const { userId } = req.params;

    const userResult = await pool.query(
      `
      SELECT id, full_name, email, phone, company_name, job_title
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(res, "User not found", 404);
    }

    const user = userResult.rows[0];

    const totalScansResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM scan_logs s
      JOIN qr_codes q ON s.qr_code_id = q.id
      WHERE q.user_id = $1
      `,
      [userId]
    );

    const scansTodayResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM scan_logs s
      JOIN qr_codes q ON s.qr_code_id = q.id
      WHERE q.user_id = $1
        AND DATE(s.scanned_at) = CURRENT_DATE
      `,
      [userId]
    );

    const userQRCodesResult = await pool.query(
      `
      SELECT
        q.id,
        q.short_code,
        q.status,
        q.target_url,
        q.image_path,
        q.created_at,
        c.card_number,
        COUNT(s.id)::int AS total_scans
      FROM qr_codes q
      LEFT JOIN cards c ON q.card_id = c.id
      LEFT JOIN scan_logs s ON s.qr_code_id = q.id
      WHERE q.user_id = $1
      GROUP BY q.id, c.card_number
      ORDER BY q.created_at DESC
      `,
      [userId]
    );

    const scansByDayResult = await pool.query(
      `
      SELECT
        TO_CHAR(DATE(s.scanned_at), 'YYYY-MM-DD') AS scan_date,
        COUNT(*)::int AS total
      FROM scan_logs s
      JOIN qr_codes q ON s.qr_code_id = q.id
      WHERE q.user_id = $1
        AND s.scanned_at >= CURRENT_DATE - INTERVAL '13 days'
      GROUP BY DATE(s.scanned_at)
      ORDER BY DATE(s.scanned_at) ASC
      `,
      [userId]
    );

    const recentScansResult = await pool.query(
      `
      SELECT
        s.id,
        s.scanned_at,
        s.device_type,
        s.browser,
        s.os,
        s.country,
        s.city,
        s.scan_result,
        q.short_code
      FROM scan_logs s
      JOIN qr_codes q ON s.qr_code_id = q.id
      WHERE q.user_id = $1
      ORDER BY s.scanned_at DESC
      LIMIT 20
      `,
      [userId]
    );

    return successResponse(res, "User QR analytics fetched successfully", {
      user,
      total_scans: totalScansResult.rows[0].total,
      scans_today: scansTodayResult.rows[0].total,
      qr_codes: userQRCodesResult.rows,
      scans_by_day: scansByDayResult.rows,
      recent_scans: recentScansResult.rows,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function getQRCodeAnalytics(req, res) {
  try {
    const { qrId } = req.params;

    const qrResult = await pool.query(
      `
      SELECT
        q.id,
        q.short_code,
        q.status,
        q.target_url,
        q.image_path,
        q.created_at,
        q.payload_type,
        q.qr_type,
        u.id AS user_id,
        u.full_name,
        u.email,
        u.phone,
        u.company_name,
        u.job_title,
        c.card_number
      FROM qr_codes q
      JOIN users u ON q.user_id = u.id
      LEFT JOIN cards c ON q.card_id = c.id
      WHERE q.id = $1
      LIMIT 1
      `,
      [qrId]
    );

    if (qrResult.rows.length === 0) {
      return errorResponse(res, "QR code not found", 404);
    }

    const qr = qrResult.rows[0];

    const totalScansResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM scan_logs
      WHERE qr_code_id = $1
      `,
      [qrId]
    );

    const scansTodayResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM scan_logs
      WHERE qr_code_id = $1
        AND DATE(scanned_at) = CURRENT_DATE
      `,
      [qrId]
    );

    const scansByDayResult = await pool.query(
      `
      SELECT
        TO_CHAR(DATE(scanned_at), 'YYYY-MM-DD') AS scan_date,
        COUNT(*)::int AS total
      FROM scan_logs
      WHERE qr_code_id = $1
        AND scanned_at >= CURRENT_DATE - INTERVAL '13 days'
      GROUP BY DATE(scanned_at)
      ORDER BY DATE(scanned_at) ASC
      `,
      [qrId]
    );

    const deviceBreakdownResult = await pool.query(
      `
      SELECT
        COALESCE(device_type, 'Unknown') AS device_type,
        COUNT(*)::int AS total
      FROM scan_logs
      WHERE qr_code_id = $1
      GROUP BY device_type
      ORDER BY total DESC
      `,
      [qrId]
    );

    const locationBreakdownResult = await pool.query(
      `
      SELECT
        COALESCE(country, 'Unknown') AS country,
        COUNT(*)::int AS total
      FROM scan_logs
      WHERE qr_code_id = $1
      GROUP BY country
      ORDER BY total DESC
      LIMIT 10
      `,
      [qrId]
    );

    const recentScansResult = await pool.query(
      `
      SELECT
        id,
        scanned_at,
        device_type,
        browser,
        os,
        country,
        city,
        scan_result
      FROM scan_logs
      WHERE qr_code_id = $1
      ORDER BY scanned_at DESC
      LIMIT 20
      `,
      [qrId]
    );

    return successResponse(res, "QR analytics fetched successfully", {
      qr,
      total_scans: totalScansResult.rows[0].total,
      scans_today: scansTodayResult.rows[0].total,
      scans_by_day: scansByDayResult.rows,
      device_breakdown: deviceBreakdownResult.rows,
      location_breakdown: locationBreakdownResult.rows,
      recent_scans: recentScansResult.rows,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function exportAnalyticsCSV(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        u.full_name,
        q.short_code,
        s.device_type,
        s.browser,
        s.os,
        s.country,
        s.city,
        s.scan_result,
        s.scanned_at
      FROM scan_logs s
      JOIN qr_codes q ON s.qr_code_id = q.id
      JOIN users u ON q.user_id = u.id
      ORDER BY s.scanned_at DESC
    `);

    const rows = result.rows;

    const fields = [
      { label: "Scan ID", value: "id" },
      { label: "User", value: "full_name" },
      { label: "QR Code", value: "short_code" },
      { label: "Device Type", value: "device_type" },
      { label: "Browser", value: "browser" },
      { label: "OS", value: "os" },
      { label: "Country", value: "country" },
      { label: "City", value: "city" },
      { label: "Scan Result", value: "scan_result" },
      { label: "Scanned At", value: "scanned_at" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment("analytics-report.csv");
    return res.send(csv);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function exportUserAnalyticsCSV(req, res) {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT
        s.id,
        u.full_name,
        q.short_code,
        s.device_type,
        s.browser,
        s.os,
        s.country,
        s.city,
        s.scan_result,
        s.scanned_at
      FROM scan_logs s
      JOIN qr_codes q ON s.qr_code_id = q.id
      JOIN users u ON q.user_id = u.id
      WHERE u.id = $1
      ORDER BY s.scanned_at DESC
    `, [userId]);

    const rows = result.rows;

    const fields = [
      { label: "Scan ID", value: "id" },
      { label: "User", value: "full_name" },
      { label: "QR Code", value: "short_code" },
      { label: "Device Type", value: "device_type" },
      { label: "Browser", value: "browser" },
      { label: "OS", value: "os" },
      { label: "Country", value: "country" },
      { label: "City", value: "city" },
      { label: "Scan Result", value: "scan_result" },
      { label: "Scanned At", value: "scanned_at" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment(`user-${userId}-analytics.csv`);
    return res.send(csv);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function exportQRCodeAnalyticsCSV(req, res) {
  try {
    const { qrId } = req.params;

    const result = await pool.query(`
      SELECT
        s.id,
        q.short_code,
        u.full_name,
        s.device_type,
        s.browser,
        s.os,
        s.country,
        s.city,
        s.scan_result,
        s.scanned_at
      FROM scan_logs s
      JOIN qr_codes q ON s.qr_code_id = q.id
      JOIN users u ON q.user_id = u.id
      WHERE q.id = $1
      ORDER BY s.scanned_at DESC
    `, [qrId]);

    const rows = result.rows;

    const fields = [
      { label: "Scan ID", value: "id" },
      { label: "QR Code", value: "short_code" },
      { label: "User", value: "full_name" },
      { label: "Device Type", value: "device_type" },
      { label: "Browser", value: "browser" },
      { label: "OS", value: "os" },
      { label: "Country", value: "country" },
      { label: "City", value: "city" },
      { label: "Scan Result", value: "scan_result" },
      { label: "Scanned At", value: "scanned_at" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment(`qr-${qrId}-analytics.csv`);
    return res.send(csv);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function exportAnalyticsPDF(req, res) {
  try {
    const totalScansResult = await pool.query(`
      SELECT COUNT(*)::int AS total FROM scan_logs
    `);

    const scansTodayResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM scan_logs
      WHERE DATE(scanned_at) = CURRENT_DATE
    `);

    const topQRCodesResult = await pool.query(`
      SELECT 
        q.short_code,
        u.full_name,
        COUNT(s.id)::int AS total_scans
      FROM scan_logs s
      JOIN qr_codes q ON s.qr_code_id = q.id
      JOIN users u ON q.user_id = u.id
      GROUP BY q.short_code, u.full_name
      ORDER BY total_scans DESC
      LIMIT 10
    `);

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="analytics-report.pdf"');

    doc.pipe(res);

    doc.fontSize(20).text("QR Analytics Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(14).text(`Total Scans: ${totalScansResult.rows[0].total}`);
    doc.text(`Scans Today: ${scansTodayResult.rows[0].total}`);
    doc.moveDown();

    doc.fontSize(16).text("Top QR Codes");
    doc.moveDown(0.5);

    topQRCodesResult.rows.forEach((item, index) => {
      doc.fontSize(12).text(
        `${index + 1}. ${item.full_name} — ${item.short_code} — ${item.total_scans} scans`
      );
    });

    doc.end();
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

module.exports = {
  getScanSummary,
  getUserScanAnalytics,
  getQRCodeAnalytics,
  exportAnalyticsCSV,
  exportUserAnalyticsCSV,
  exportQRCodeAnalyticsCSV,
  exportAnalyticsPDF,
};