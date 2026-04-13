const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/response");
const { logAudit } = require("../services/auditService");

async function getStaffUsers(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        email,
        role,
        status,
        last_login,
        created_at
      FROM system_users
      ORDER BY id DESC
    `);

    return successResponse(
      res,
      "Staff users fetched successfully",
      result.rows,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function createOperator(req, res) {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password) {
      return errorResponse(
        res,
        "Full name, email, and password are required",
        400,
      );
    }

    const allowedRoles = ["operator", "super_admin"];

    const finalRole = role || "operator";

    if (!allowedRoles.includes(finalRole)) {
      return errorResponse(res, "Invalid role selected", 400);
    }

    if (finalRole === "super_admin" && req.user.role !== "super_admin") {
      return errorResponse(
        res,
        "Only super admins can create other super admins",
        403,
      );
    }

    const existing = await pool.query(
      `SELECT id FROM system_users WHERE email = $1 LIMIT 1`,
      [email],
    );

    if (existing.rows.length > 0) {
      return errorResponse(
        res,
        "A staff account with this email already exists",
        409,
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO system_users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, email, role, status, created_at
      `,
      [full_name, email, passwordHash, finalRole],
    );

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "create",
      entityType: "staff",
      entityId: result.rows[0].id,
      description: `Created staff account ${result.rows[0].full_name}`,
      metadata: {
        email: result.rows[0].email,
        role: result.rows[0].role,
      },
    });

    return successResponse(
      res,
      "Operator created successfully",
      result.rows[0],
      201,
    );

  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function updateStaffUser(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, status, role } = req.body;

    const result = await pool.query(
      `
      UPDATE system_users
      SET full_name = $1,
          email = $2,
          status = $3,
          role = $4
      WHERE id = $5
      RETURNING id, full_name, email, role, status, last_login, created_at
      `,
      [full_name, email, status || "active", role || "operator" || id],
    );

    if (result.rows.length === 0) {
      return errorResponse(res, "Staff user not found", 404);
    }

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "update",
      entityType: "staff",
      entityId: result.rows[0].id,
      description: `Updated staff account ${result.rows[0].full_name}`,
      metadata: {
        email: result.rows[0].email,
        role: result.rows[0].role,
        status: result.rows[0].status,
      },
    });

    return successResponse(
      res,
      "Staff user updated successfully",
      result.rows[0],
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

async function deleteStaffUser(req, res) {
  try {
    const { id } = req.params;

    // prevent deleting yourself
    if (Number(id) === Number(req.user.id)) {
      return errorResponse(res, "You cannot delete your own account", 400);
    }

    const result = await pool.query(
      `
      DELETE FROM system_users
      WHERE id = $1
      RETURNING id, full_name, email, role
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return errorResponse(res, "Staff user not found", 404);
    }

    await logAudit({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: "delete",
      entityType: "staff",
      entityId: result.rows[0].id,
      description: `Deleted staff account ${result.rows[0].full_name}`,
      metadata: {
        email: result.rows[0].email,
        role: result.rows[0].role,
      },
    });

    return successResponse(res, "Staff user deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

module.exports = {
  getStaffUsers,
  createOperator,
  updateStaffUser,
  deleteStaffUser,
};
