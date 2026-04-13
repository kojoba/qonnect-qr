const express = require("express")
const router = express.Router()
const {
    loginAdmin,
    getCurrentAdmin,
} = require("../controllers/authController")
const {protect} = require("../middleware/authMiddleware")

router.post("/login", loginAdmin)
router.get("/me", protect, getCurrentAdmin)

module.exports = router