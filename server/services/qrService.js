const path = require("path")
const fs = require("fs")
const QRCode = require("qrcode")

async function generateQrImage(url, filename) {
    const uploadDir = path.join(__dirname, "../uploads/qrcodes")

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, {recursive: true})
    }

    const filePath = path.join(uploadDir, `${filename}.png`)

    await QRCode.toFile(filePath, url, {
        width: 400,
        margin: 2,
    })

    return `/uploads/qrcodes/${filename}.png`
}

module.exports = {
    generateQrImage,
}