const pool = require("../config/db");
const { buildVCard } = require("../services/vcardService");
const {logScan} = require("../services/scanService")

async function getPublicProfile(req, res) {
  try {
    const { shortCode } = req.params;

    const result = await pool.query(
      `
      SELECT 
        q.id AS qr_id,
        q.short_code,
        q.status AS qr_status,
        q.target_url,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email,
        u.phone,
        u.job_title,
        u.company_name,
        cp.display_name,
        cp.phone_primary,
        cp.phone_secondary,
        cp.email_primary,
        cp.email_secondary,
        cp.address,
        cp.city,
        cp.country,
        cp.website,
        cp.linkedin_url,
        cp.whatsapp_number,
        cp.profile_photo_url,
        cp.bio,
        c.id AS card_id,
        c.card_number,
        t.tier_name
      FROM qr_codes q
      JOIN users u ON q.user_id = u.id
      LEFT JOIN contact_profiles cp ON cp.user_id = u.id
      LEFT JOIN cards c ON q.card_id = c.id
      LEFT JOIN card_tiers t ON c.tier_id = t.id
      WHERE q.short_code = $1 AND q.status = 'active'
      LIMIT 1
      `,
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("<h1>QR profile not found</h1>");
    }

    const profile = result.rows[0];

    await logScan({
      qrCodeId: profile.qr_id,
      req,
      scanResult: "profile_opened",
    })

    // For elite/black cards, jump straight to vCard route.
    if ((profile.tier_name || "").toLowerCase() === "elite") {
      return res.redirect(`/p/${shortCode}/vcard`);
    }

    const addToContactsUrl = `/p/${shortCode}/vcard`;
    const whatsappUrl = profile.whatsapp_number
      ? `https://wa.me/${String(profile.whatsapp_number).replace(/[^\d]/g, "")}`
      : null;

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${profile.display_name || profile.full_name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f4f7fb;
            margin: 0;
            padding: 30px 16px;
          }
          .card {
            max-width: 560px;
            margin: auto;
            background: white;
            padding: 28px;
            border-radius: 18px;
            box-shadow: 0 12px 35px rgba(0,0,0,0.08);
          }
          .avatar {
            width: 88px;
            height: 88px;
            border-radius: 50%;
            object-fit: cover;
            background: #e5e7eb;
            display: block;
            margin-bottom: 16px;
          }
          h1 {
            margin: 0 0 8px;
            color: #111827;
          }
          .muted {
            color: #6b7280;
            margin: 6px 0;
          }
          .section {
            margin-top: 20px;
          }
          .btns {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 22px;
          }
          .btn {
            display: inline-block;
            text-decoration: none;
            padding: 12px 16px;
            border-radius: 10px;
            font-weight: bold;
            border: 1px solid #d1d5db;
            color: #111827;
            background: #fff;
          }
          .btn.primary {
            background: #0f766e;
            color: white;
            border-color: #0f766e;
          }
          .info p {
            margin: 8px 0;
            color: #374151;
          }
        </style>
      </head>
      <body>
        <div class="card">
          ${
            profile.profile_photo_url
              ? `<img class="avatar" src="${profile.profile_photo_url}" alt="${profile.display_name || profile.full_name}" />`
              : ""
          }

          <h1>${profile.display_name || profile.full_name}</h1>
          <p class="muted">${profile.job_title || "-"}${profile.company_name ? ` • ${profile.company_name}` : ""}</p>
          <p class="muted">Tier: ${profile.tier_name || "Standard"}</p>

          <div class="section info">
            <p><strong>Phone:</strong> ${profile.phone_primary || profile.phone || "-"}</p>
            <p><strong>Email:</strong> ${profile.email_primary || profile.email || "-"}</p>
            <p><strong>Website:</strong> ${profile.website || "-"}</p>
            <p><strong>Address:</strong> ${profile.address || "-"} ${profile.city || ""} ${profile.country || ""}</p>
            <p><strong>Bio:</strong> ${profile.bio || "-"}</p>
          </div>

          <div class="btns">
            <a class="btn primary" href="${addToContactsUrl}">Add to Contacts</a>
            ${
              profile.phone_primary || profile.phone
                ? `<a class="btn" href="tel:${profile.phone_primary || profile.phone}">Call</a>`
                : ""
            }
            ${
              profile.email_primary || profile.email
                ? `<a class="btn" href="mailto:${profile.email_primary || profile.email}">Email</a>`
                : ""
            }
            ${
              whatsappUrl
                ? `<a class="btn" href="${whatsappUrl}" target="_blank">WhatsApp</a>`
                : ""
            }
            ${
              profile.website
                ? `<a class="btn" href="${profile.website}" target="_blank">Website</a>`
                : ""
            }
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    return res.status(500).send(`<h1>Server Error</h1><p>${error.message}</p>`);
  }
}

async function downloadVCard(req, res) {
  try {
    const { shortCode } = req.params;

    const result = await pool.query(
      `
      SELECT
        q.id AS qr_id,
        q.short_code,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email,
        u.phone,
        u.job_title,
        u.company_name,
        cp.display_name,
        cp.phone_primary,
        cp.email_primary,
        cp.address,
        cp.city,
        cp.country,
        cp.website,
        cp.bio
      FROM qr_codes q
      JOIN users u ON q.user_id = u.id
      LEFT JOIN contact_profiles cp ON cp.user_id = u.id
      WHERE q.short_code = $1 AND q.status = 'active'
      LIMIT 1
      `,
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Contact not found");
    }

    const profile = result.rows[0];

    await logScan({
      qrCodeId: profile.qr_id,
      req,
      scanResult: "vcard_opened",
    })
    
    const vcard = buildVCard(profile);
    const safeName = (profile.display_name || profile.full_name || "contact")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}.vcf"`);
    return res.send(vcard);
  } catch (error) {
    return res.status(500).send(error.message);
  }
}

module.exports = {
  getPublicProfile,
  downloadVCard,
};