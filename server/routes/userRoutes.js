const express = require("express")
const router = express.Router()
const {createUser, getUsers, updateUser, deleteUser} = require("../controllers/userController")
const {protect, authorize} = require("../middleware/authMiddleware")

router.get("/", protect, getUsers)
router.post("/", protect, createUser)
router.put("/:id", protect, updateUser)
router.delete("/:id", protect, authorize("super_admin"), deleteUser)

module.exports = router