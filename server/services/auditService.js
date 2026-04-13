const pool = require("../config/db");

async function logAudit({
  actorId = null,
  actorRole = null,
  action,
  entityType,
  entityId = null,
  description = "",
  metadata = null,
}) {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs
      (actor_id, actor_role, action, entity_type, entity_id, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        actorId,
        actorRole,
        action,
        entityType,
        entityId,
        description,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
}

module.exports = {
  logAudit,
};