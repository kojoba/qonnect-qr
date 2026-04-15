const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const pool = require("../config/db")
const {successResponse, errorResponse} = require("../utils/response")
const {logAudit} = require("../services/auditService")

function generateToken(admin){
    return jwt.sign(
        {
            id: admin.id,
            email: admin.email,
            role: admin.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "5m",
        }
    )
}

// async function loginAdmin(req, res){
//     try{
//         const {email, password} = req.body

//         if (!email || !password){
//             return errorResponse(res, "Email and password are required", 400)
//         }

//         const result = await pool.query(
//             `
//             SELECT * FROM system_users
//             WHERE email = $1 AND status = 'active'
//             LIMIT 1
//             `,
//             [email]
//         )

//         if (result.rows.length === 0){
//             return errorResponse(res, "Invalid email or password", 401)
//         }

//         const admin = result.rows[0]
//         const isMatch = await bcrypt.compare(password, admin.password_hash)

//         if (!isMatch){
//             return errorResponse(res, "Invalid email or password", 401)
//         }

//         await pool.query(
//             `
//                 UPDATE system_users
//                 SET last_login = CURRENT_TIMESTAMP
//                 WHERE id = $1
//             `,
//             [admin.id]
//         )

//         const token = generateToken(admin)

//         await logAudit({
//             actorId: admin.id,
//             actorRole: admin.role,
//             action: "login",
//             entityType: "auth",
//             entityId: admin.id,
//             description: `${admin.full_name} logged into the dashboard`,
//             metadata: {
//                 email: admin.email,
//             },
//         });

//         return successResponse(res, "Login successful", {
//             token,
//             admin: {
//                 id: admin.id,
//                 full_name: admin.full_name,
//                 email: admin.email,
//                 role: admin.role,
//             },
//         })
//     }
//     catch (error) {
//         return errorResponse(res, error.message)
//     }
// }

async function loginAdmin(req, res) {
    try {
        const { email, password } = req.body;
        console.log("LOGIN BODY:", req.body);

        if (!email || !password) {
            return errorResponse(res, "Email and password are required", 400);
        }

        const result = await pool.query(
            `
            SELECT * FROM system_users
            WHERE email = $1 AND status = 'active'
            LIMIT 1
            `,
            [email]
        );

        console.log("LOGIN QUERY ROWS:", result.rows.length);

        if (result.rows.length === 0) {
            return errorResponse(res, "Invalid email or password", 401);
        }

        const admin = result.rows[0];
        console.log("ADMIN FOUND:", {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            hasPasswordHash: !!admin.password_hash,
            status: admin.status
        });

        const isMatch = await bcrypt.compare(password, admin.password_hash);
        console.log("PASSWORD MATCH:", isMatch);

        if (!isMatch) {
            return errorResponse(res, "Invalid email or password", 401);
        }

        await pool.query(
            `
                UPDATE system_users
                SET last_login = CURRENT_TIMESTAMP
                WHERE id = $1
            `,
            [admin.id]
        );
        console.log("LAST LOGIN UPDATED");

        const token = generateToken(admin);
        console.log("TOKEN GENERATED");

        await logAudit({
            actorId: admin.id,
            actorRole: admin.role,
            action: "login",
            entityType: "auth",
            entityId: admin.id,
            description: `${admin.full_name} logged into the dashboard`,
            metadata: {
                email: admin.email,
            },
        });
        console.log("AUDIT LOG WRITTEN");

        return successResponse(res, "Login successful", {
            token,
            admin: {
                id: admin.id,
                full_name: admin.full_name,
                email: admin.email,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error("LOGIN ADMIN ERROR:", error);
        return errorResponse(res, error.message, 500);
    }
}

async function getCurrentAdmin(req, res){
    try{
        const result = await pool.query(
            `
            SELECT id, full_name, email, role, status, last_login, created_at
            FROM system_users
            WHERE id = $1
            LIMIT 1
            `,
            [req.user.id]
        )

        if (result.rows.length === 0){
            return errorResponse(res, "Admin not found", 404)
        }

        return successResponse(res, "Admin fetched successfully", result.rows[0])
    }
    catch (error){
        return errorResponse(res, error.message)
    }
}

module.exports = {
    loginAdmin,
    getCurrentAdmin,
}