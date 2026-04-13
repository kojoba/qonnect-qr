const express = require("express")
const router = express.Router()
const {getTiers, createTier, updateTier, deleteTier} = require("../controllers/tierController")
const {protect, authorize} = require("../middleware/authMiddleware")

router.get("/", protect, getTiers)
router.post("/", protect, createTier)
router.put("/:id", protect, updateTier)
router.delete("/:id", protect, authorize("super_admin"), deleteTier)

module.exports = router