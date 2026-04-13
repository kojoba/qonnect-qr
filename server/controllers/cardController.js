const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/response");
const { logAudit } = require("../services/auditService");

function generateCardNumber() {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return `QQ-${year}${month}${day}-${randomPart}`;
}

async function generateUniqueCardNumber() {
  let cardNumber;
  let exists = true;

  while (exists) {
    cardNumber = generateCardNumber();

    const check = await pool.query(
      "SELECT id FROM cards WHERE card_number = $1 LIMIT 1",
      [cardNumber]
    );

    exists = check.rows.length > 0;
  }

  return cardNumber;
}

async function getCards(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        u.full_name,
        t.tier_name
      FROM cards c
      JOIN users u ON c.user_id = u.id
      JOIN card_tiers t ON c.tier_id = t.id
      ORDER BY c.id DESC
    `);

    return successResponse(res, "Cards fetched successfully", result.rows);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function createCard(req, res) {
  try {
    const {
      user_id,
      tier_id,
      card_number,
      card_label,
      issue_date,
      expiry_date,
      status,
      print_status,
    } = req.body;

    const finalCardNumber = card_number || await generateUniqueCardNumber();

    const result = await pool.query(
      `
      INSERT INTO cards
      (user_id, tier_id, card_number, card_label, issue_date, expiry_date, status, print_status)
      VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, COALESCE($7, 'active'), COALESCE($8, 'pending'))
      RETURNING *
      `,
      [
        user_id,
        tier_id,
        finalCardNumber,
        card_label || null,
        issue_date || null,
        expiry_date || null,
        status || null,
        print_status || null,
      ]
    );

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "create",
      entityType: "card",
      entityId: result.rows[0].id,
      description: `Created card ${result.rows[0].card_number}`,
      metadata: {
        user_id: result.rows[0].user_id,
        tier_id: result.rows[0].tier_id,
        status: result.rows[0].status,
      },
    });

    return successResponse(res, "Card created successfully", result.rows[0], 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function updateCard(req, res) {
  try {
    const { id } = req.params;
    const {
      user_id,
      tier_id,
      card_number,
      card_label,
      issue_date,
      expiry_date,
      status,
      print_status,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE cards
      SET user_id = $1,
          tier_id = $2,
          card_number = $3,
          card_label = $4,
          issue_date = $5,
          expiry_date = $6,
          status = $7,
          print_status = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
      `,
      [
        user_id,
        tier_id,
        card_number,
        card_label || null,
        issue_date || null,
        expiry_date || null,
        status || "active",
        print_status || "pending",
        id,
      ]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, "Card not found", 404);
    }

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "update",
      entityType: "card",
      entityId: result.rows[0].id,
      description: `Updated card ${result.rows[0].card_number}`,
      metadata: {
        user_id: result.rows[0].user_id,
        tier_id: result.rows[0].tier_id,
        status: result.rows[0].status,
      },
    });

    return successResponse(res, "Card updated successfully", result.rows[0]);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function deleteCard(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM cards WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, "Card not found", 404);
    }

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "delete",
      entityType: "card",
      entityId: result.rows[0].id,
      description: `Deleted card ${result.rows[0].card_number}`,
      metadata: {
        user_id: result.rows[0].user_id,
      },
    });

    return successResponse(res, "Card deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

module.exports = {
  getCards,
  createCard,
  updateCard,
  deleteCard,
};