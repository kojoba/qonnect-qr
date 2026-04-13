const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/response");

async function getAuditLogs(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        a.*,
        s.full_name AS actor_name,
        s.email AS actor_email
      FROM audit_logs a
      LEFT JOIN system_users s ON a.actor_id = s.id
      ORDER BY a.created_at DESC
      LIMIT 200
    `);

    return successResponse(res, "Audit logs fetched successfully", result.rows);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

module.exports = {
  getAuditLogs,
};