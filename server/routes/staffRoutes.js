const express = require("express");
const router = express.Router();

const {
  getStaffUsers,
  createOperator,
  updateStaffUser,
  deleteStaffUser,
} = require("../controllers/staffController");

const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/", protect, authorize("super_admin"), getStaffUsers);
router.post("/", protect, authorize("super_admin"), createOperator);
router.put("/:id", protect, authorize("super_admin"), updateStaffUser);
router.delete("/:id", protect, authorize("super_admin"), deleteStaffUser);

module.exports = router;