function generateShortCode(fullname = "", cardId = "") {
    const cleaned = fullname
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim()
        .split(" ")
        .slice(0, 2)
        .join("-")

    const randomPart = Math.floor(1000 + Math.random() * 9000)
    return `${cleaned || "user"}-${cardId || randomPart}`
}

module.exports = {
    generateShortCode,
}