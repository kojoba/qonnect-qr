const express = require("express")
const router = express.Router()

const {
    getScanSummary, 
    getUserScanAnalytics, 
    getQRCodeAnalytics,
    exportAnalyticsCSV,
    exportUserAnalyticsCSV,
    exportQRCodeAnalyticsCSV,
    exportAnalyticsPDF,
} = require("../controllers/analyticsController")
const {protect} = require("../middleware/authMiddleware")

router.get("/summary", protect, getScanSummary)
router.get("/users/:userId", protect, getUserScanAnalytics)
router.get("/qrcodes/:qrId", protect, getQRCodeAnalytics)

router.get("/export/csv", protect, exportAnalyticsCSV)
router.get("/users/:userId/export/csv", protect, exportUserAnalyticsCSV)
router.get("/qrcodes/:qrId/export/csv", protect, exportQRCodeAnalyticsCSV)
router.get("/export/pdf", protect, exportAnalyticsPDF)

module.exports = router