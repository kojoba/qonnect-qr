require("dotenv").config()
const bcrypt = require("bcrypt")
const pool = require("../config/db")

async function createAdmin() {
    try{
        const fullName = "System Admin"
        const email = "admin@koenix.com"
        const password = "admin123"
        const role = "super_admin"

        const passwordHash = await bcrypt.hash(password, 10)

        const result = await pool.query(
            `
            INSERT INTO system_users (full_name, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (email) DO NOTHING
            RETURNING id, full_name, email, role
            `,
            [fullName, email, passwordHash, role]
        )

        if (result.rows.length > 0) {
            console.log("Admin created:", result.rows[0])
        }
        else{
            console.log("Admin already exists.")
        }

        process.exit(0)
    }

    catch(error){
        console.error("Error creating admin:", error.message)
        process.exit(1)
    }
}

createAdmin()