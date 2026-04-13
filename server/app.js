const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const path = require("path")

const userRoutes = require("./routes/userRoutes")
const qrRoutes = require("./routes/qrRoutes")
const publicRoutes = require("./routes/publicRoutes")
const tierRoutes = require("./routes/tierRoutes")
const cardRoutes = require("./routes/cardRoutes")
const contactRoutes = require("./routes/contactRoutes")
const analyticsRoutes = require("./routes/analyticsRoutes")
const authRoutes = require("./routes/authRoutes")
const staffRoutes = require("./routes/staffRoutes")
const auditRoutes = require("./routes/auditRoutes")

const app = express()

const allowedOrigin = process.env.FRONTEND_URL;

app.use(cors({
    origin: allowedOrigin ? [allowedOrigin] : true,
}))
app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use("/uploads", express.static(path.join(__dirname, "uploads")))

app.use("/dashboard", express.static(path.join(__dirname, "/dashboard")))

app.use("/api/staff", staffRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/tiers", tierRoutes)
app.use("/api/cards", cardRoutes)
app.use("/api/contacts", contactRoutes)
app.use("/api/qrcodes", qrRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/audit-logs", auditRoutes)
app.use("/", publicRoutes)

app.get("/", (req, res) => {
    res.redirect("/dashboard");
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "/dashboard/index.html"))
})

app.get("/api/health", (req, res) => {
    res.json({success: true, message: "Server running..."})
})

module.exports = app