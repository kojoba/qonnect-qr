const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/response");
const { logAudit } = require("../services/auditService");

async function getContacts(req, res) {
  try {
    const result = await pool.query(`
      SELECT cp.*, u.full_name
      FROM contact_profiles cp
      JOIN users u ON cp.user_id = u.id
      ORDER BY cp.id DESC
    `);

    return successResponse(res, "Contact profiles fetched successfully", result.rows);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function createContactProfile(req, res) {
  try {
    const {
      user_id,
      display_name,
      phone_primary,
      phone_secondary,
      email_primary,
      email_secondary,
      address,
      city,
      country,
      website,
      linkedin_url,
      whatsapp_number,
      profile_photo_url,
      bio,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO contact_profiles
      (
        user_id, display_name, phone_primary, phone_secondary,
        email_primary, email_secondary, address, city, country,
        website, linkedin_url, whatsapp_number, profile_photo_url, bio
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
      `,
      [
        user_id,
        display_name,
        phone_primary || null,
        phone_secondary || null,
        email_primary || null,
        email_secondary || null,
        address || null,
        city || null,
        country || null,
        website || null,
        linkedin_url || null,
        whatsapp_number || null,
        profile_photo_url || null,
        bio || null,
      ]
    );

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "create",
      entityType: "contact_profile",
      entityId: result.rows[0].id,
      description: `Created contact profile ${result.rows[0].display_name}`,
      metadata: {
        user_id: result.rows[0].user_id,
        email_primary: result.rows[0].email_primary,
      },
    });

    return successResponse(res, "Contact profile created successfully", result.rows[0], 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function updateContactProfile(req, res) {
  try {
    const { id } = req.params;
    const {
      user_id,
      display_name,
      phone_primary,
      phone_secondary,
      email_primary,
      email_secondary,
      address,
      city,
      country,
      website,
      linkedin_url,
      whatsapp_number,
      profile_photo_url,
      bio,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE contact_profiles
      SET user_id = $1,
          display_name = $2,
          phone_primary = $3,
          phone_secondary = $4,
          email_primary = $5,
          email_secondary = $6,
          address = $7,
          city = $8,
          country = $9,
          website = $10,
          linkedin_url = $11,
          whatsapp_number = $12,
          profile_photo_url = $13,
          bio = $14,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
      `,
      [
        user_id,
        display_name,
        phone_primary || null,
        phone_secondary || null,
        email_primary || null,
        email_secondary || null,
        address || null,
        city || null,
        country || null,
        website || null,
        linkedin_url || null,
        whatsapp_number || null,
        profile_photo_url || null,
        bio || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, "Contact profile not found", 404);
    }

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "update",
      entityType: "contact_profile",
      entityId: result.rows[0].id,
      description: `Updated contact profile ${result.rows[0].display_name}`,
      metadata: {
        user_id: result.rows[0].user_id,
        email_primary: result.rows[0].email_primary,
      },
    });

    return successResponse(res, "Contact profile updated successfully", result.rows[0]);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function deleteContactProfile(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM contact_profiles WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, "Contact profile not found", 404);
    }

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "delete",
      entityType: "contact_profile",
      entityId: result.rows[0].id,
      description: `Deleted contact profile ${result.rows[0].display_name}`,
      metadata: {
        user_id: result.rows[0].user_id,
      },
    });

    return successResponse(res, "Contact profile deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

module.exports = {
  getContacts,
  createContactProfile,
  updateContactProfile,
  deleteContactProfile,
};