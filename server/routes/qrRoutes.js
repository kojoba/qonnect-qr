const express = require("express");
const router = express.Router();
const {
  generateQrForUser,
  getQRCodes,
  deleteQRCode,
} = require("../controllers/qrController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/", protect, getQRCodes);
router.post("/generate", protect, generateQrForUser);
router.delete("/:id", protect, authorize("super_admin"), deleteQRCode);

module.exports = router;