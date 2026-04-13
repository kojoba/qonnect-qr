function cleanValue(value) {
    return (value || "").toString().trim()
}

function escapeVCard(value){
    return cleanValue(value)
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;")
}

function buildVCard(profile){
    const fullName = escapeVCard(profile.display_name || profile.full_name || "")
    const firstName = escapeVCard(profile.first_name || "")
    const lastName = escapeVCard(profile.last_name || "")
    const company = escapeVCard(profile.company_name || "")
    const title = escapeVCard(profile.job_title || "")
    const phone = escapeVCard(profile.phone_primary || profile.phone || "")
    const email = escapeVCard(profile.email_primary || profile.email || "")
    const website = escapeVCard(profile.website || "")
    const address = escapeVCard(profile.address || "")
    const city = escapeVCard(profile.city || "")
    const country = escapeVCard(profile.country || "")
    const bio = escapeVCard(profile.bio || "")

    return `BEGIN:VCARD
    VERSION:3.0
    N:${lastName};${firstName};;;
    FN:${fullName}
    ORG:${company}
    TITLE:${title}
    TEL;TYPE=CELL:${phone}
    EMAIL:${email}
    ADR:;;${address};${city};;${country};
    URL:${website}
    NOTE:${bio}
    END:VCARD`
}

module.exports = {
    buildVCard,
}