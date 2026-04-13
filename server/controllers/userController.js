const pool = require("../config/db")
const {successResponse, errorResponse} = require("../utils/response")
const {logAudit} = require("../services/auditService")

async function getUsers(req, res){
    try{
        const result = await pool.query(
            "SELECT * FROM users ORDER BY id DESC"
        )

        return successResponse(res, "Users fetched", result.rows)
    }
    catch (error){
        return errorResponse(res, error.message)
    }
}

async function createUser(req, res){
    try{
        const{
            first_name,
            last_name,
            email,
            phone,
            job_title,
            company_name,
            department
        } = req.body

        const full_name = `${first_name} ${last_name}`

        const result = await pool.query(
            `
            INSERT INTO users
            (first_name, last_name, full_name, email, phone, job_title, company_name, department)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `,
            [first_name, last_name, full_name, email, phone, job_title, company_name, department]
        )

        await logAudit({
            actorId: req.user?.id || null,
            actorRole: req.user?.role || null,
            action: "create",
            entityType: "user",
            entityId: result.rows[0].id,
            description: `Created user ${result.rows[0].full_name}`,
            metadata: {
                email: result.rows[0].email,
                phone: result.rows[0].phone,
            },
        });

        return successResponse(res, "User created", result.rows[0], 201)
    }
    catch (error){
        return errorResponse(res, error.message)
    }
}

async function updateUser(req, res){
    try{
        const {id} = req.params
        const {
            first_name,
            last_name,
            email,
            phone,
            job_title,
            company_name,
            department,
            status,
        } = req.body

        const full_name = `${first_name} ${last_name}`

        const result = await pool.query(
            `
            UPDATE users
            SET first_name = $1,
                last_name = $2,
                full_name = $3,
                email = $4,
                phone = $5,
                job_title = $6,
                company_name = $7,
                department = $8,
                status = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
            `,
            [
                first_name,
                last_name,
                full_name,
                email || null,
                phone || null,
                job_title || null,
                company_name || null,
                department || null,
                status || "active",
                id,
            ]
        )

        if (result.rows.length === 0){
            return errorResponse(res, "User not found", 404)
        }

        await logAudit({
            actorId: req.user?.id || null,
            actorRole: req.user?.role || null,
            action: "update",
            entityType: "user",
            entityId: result.rows[0].id,
            description: `Updated user ${result.rows[0].full_name}`,
            metadata: {
                email: result.rows[0].email,
                status: result.rows[0].status,
            },
        });

        return successResponse(res, "User updated", result.rows[0])
    }
    catch(error){
        return errorResponse(res, error.message)
    }
}

async function deleteUser(req, res){
    try{
        const {id} = req.params

        const result = await pool.query(
            "DELETE FROM users WHERE id = $1 RETURNING *",
            [id]
        )

        if (result.rows.length === 0){
            return errorResponse(res, "User not found", 404)
        }

        await logAudit({
            actorId: req.user?.id || null,
            actorRole: req.user?.role || null,
            action: "delete",
            entityType: "user",
            entityId: result.rows[0].id,
            description: `Deleted user ${result.rows[0].full_name}`,
            metadata: {
                email: result.rows[0].email,
            },
        });

        return successResponse(res, "User deleted")
    }
    catch (error){
        return errorResponse(res, error.message)
    }
}

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
}