const express = require("express")
const router = express.Router()
const {getPublicProfile, downloadVCard,} = require("../controllers/publicController")

router.get("/c/:shortCode", getPublicProfile)
router.get("/p/:shortCode/vcard", downloadVCard)

module.exports = router