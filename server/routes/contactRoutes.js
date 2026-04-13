const express = require("express")
const router = express.Router()
const {getContacts, createContactProfile, updateContactProfile, deleteContactProfile} = require("../controllers/contactController")
const {protect, authorize} = require("../middleware/authMiddleware")

router.get("/", protect, getContacts)
router.post("/", protect, createContactProfile)
router.put("/:id", protect, updateContactProfile)
router.delete("/:id", protect, authorize("super_admin"), deleteContactProfile)

module.exports = router