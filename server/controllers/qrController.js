const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/response");
const { generateShortCode } = require("../services/shortCodeService");
const { generateQrImage } = require("../services/qrService");
const { logAudit } = require("../services/auditService");

async function getQRCodes(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        q.*, 
        u.full_name, 
        c.card_number,
        t.tier_name
      FROM qr_codes q
      LEFT JOIN users u ON q.user_id = u.id
      LEFT JOIN cards c ON q.card_id = c.id
      LEFT JOIN card_tiers t ON c.tier_id = t.id
      ORDER BY q.id DESC
    `);

    return successResponse(res, "QR codes fetched successfully", result.rows);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function generateQrForUser(req, res) {
  try {
    const { user_id, card_id = null } = req.body;

    const userResult = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(res, "User not found", 404);
    }

    const user = userResult.rows[0];
    let tierName = null;

    if (card_id) {
      const cardResult = await pool.query(`
        SELECT c.id, t.tier_name
        FROM cards c
        JOIN card_tiers t ON c.tier_id = t.id
        WHERE c.id = $1
      `, [card_id]);

      if (cardResult.rows.length > 0) {
        tierName = cardResult.rows[0].tier_name;
      }
    }

    const shortCode = generateShortCode(user.full_name, user.id);

    const targetUrl =
      tierName && tierName.toLowerCase() === "elite"
        ? `${process.env.BASE_URL}/p/${shortCode}/vcard`
        : `${process.env.BASE_URL}/c/${shortCode}`;

    const imagePath = await generateQrImage(targetUrl, shortCode);

    const qrResult = await pool.query(
      `
      INSERT INTO qr_codes
      (user_id, card_id, qr_type, payload_type, payload_data, target_url, image_path, short_code, is_dynamic, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        user_id,
        card_id,
        "contact_profile",
        "url",
        targetUrl,
        targetUrl,
        imagePath,
        shortCode,
        true,
        "active",
      ]
    );

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "generate",
      entityType: "qr_code",
      entityId: qrResult.rows[0].id,
      description: `Generated QR code ${qrResult.rows[0].short_code}`,
      metadata: {
        user_id,
        card_id,
        target_url: qrResult.rows[0].target_url,
      },
    });

    return successResponse(res, "Dynamic QR generated successfully", qrResult.rows[0], 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function deleteQRCode(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM qr_codes WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, "QR code not found", 404);
    }

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "delete",
      entityType: "qr_code",
      entityId: result.rows[0].id,
      description: `Deleted QR code ${result.rows[0].short_code}`,
      metadata: {
        user_id: result.rows[0].user_id,
      },
    });

    return successResponse(res, "QR code deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

module.exports = {
  getQRCodes,
  generateQrForUser,
  deleteQRCode,
};