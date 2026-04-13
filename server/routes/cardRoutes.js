const express = require("express")
const router = express.Router()
const {getCards, createCard, updateCard, deleteCard} = require("../controllers/cardController")
const {protect, authorize} = require("../middleware/authMiddleware")

router.get("/", protect, getCards)
router.post("/", protect, createCard)
router.put("/:id", protect, updateCard)
router.delete("/:id", protect, authorize("super_admin"), deleteCard)

module.exports = router