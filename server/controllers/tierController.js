const pool = require("../config/db")
const {successResponse, errorResponse} = require("../utils/response")

async function getTiers(req, res){
    try{
        const result = await pool.query(
            "SELECT * FROM card_tiers ORDER BY id ASC"
        )

        return successResponse(res, "Card tiers fetched", result.rows)
    }
    catch (error){
        return errorResponse(res, error.message)
    }
}

async function createTier(req, res){
    try{
        const {
            tier_name,
            description,
            material,
            has_nfc,
            has_dynamic_qr,
            scan_analytics_enabled,
        } = req.body

        const result = await pool.query(
            `
            INSERT INTO card_tiers
            (tier_name, description, material, has_nfc, has_dynamic_qr, scan_analytics_enabled)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            `,
            [
                tier_name,
                description || null,
                material || null,
                has_nfc === true || has_nfc === "true",
                has_dynamic_qr === true || has_dynamic_qr === "true",
                scan_analytics_enabled === true || scan_analytics_enabled === "true",
            ]
        )

        return successResponse(res, "Card tier created", result.rows[0], 201);
    }
    catch (error){
        return errorResponse(res, error.message)
    }
}

async function updateTier(req, res){
    try{
        const {id} = req.params
        const {
            tier_name,
            description,
            material,
            has_nfc,
            has_dynamic_qr,
            scan_analytics_enabled,
        } = req.body

        const result = await pool.query(
            `
            UPDATE card_tiers
            SET tier_name = $1,
                description = $2,
                material = $3,
                has_nfc = $4,
                has_dynamic_qr = $5,
                scan_analytics_enabled = $6
            WHERE id = $7
            RETURNING *
            `,
            [
                tier_name,
                description || null,
                material || null,
                has_nfc == true || has_nfc === "true",
                has_dynamic_qr === true || has_dynamic_qr === "true",
                scan_analytics_enabled === true || scan_analytics_enabled === "true",
                id,
            ]
        )

        if (result.rows.length === 0){
            return errorResponse(res, "Tier not found", 404);
        }

        return successResponse(res, "Card tier updated", result.rows[0])
    }
    catch (error){
        return errorResponse(res, error.message)
    }
}

async function deleteTier(req, res){
    try{
        const {id} = req.params

        const result = await pool.query(
            "DELETE FROM card_tiers WHERE id = $1 RETURNING *",
            [id]
        )

        if (result.rows.length === 0){
            return errorResponse(res, "Tier not found", 404)
        }

        return successResponse(res, "Card tier deleted")
    }
    catch(error){
        return errorResponse(res, error.message)
    }
}

module.exports = {
    getTiers,
    createTier,
    updateTier,
    deleteTier,
}