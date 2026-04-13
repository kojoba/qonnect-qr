const pool = require("../config/db");
const axios = require("axios");

function detectDeviceType(userAgent = "") {
  const ua = userAgent.toLowerCase();

  if (/mobile|android|iphone|ipod|windows phone/i.test(ua)) return "Mobile";
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

function detectBrowser(userAgent = "") {
  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "Chrome";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";

  return "Unknown";
}

function detectOS(userAgent = "") {
  const ua = userAgent.toLowerCase();

  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os")) return "macOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
  if (ua.includes("linux")) return "Linux";

  return "Unknown";
}

function normalizeIp(rawIp = "") {
  if (!rawIp) return null;

  // Handle IPv6-mapped IPv4 like ::ffff:192.168.1.10
  if (rawIp.startsWith("::ffff:")) {
    return rawIp.replace("::ffff:", "");
  }

  return rawIp;
}

function isPrivateIp(ip = "") {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

async function lookupLocationFromIp(ipAddress) {
  try {
    if (!ipAddress || isPrivateIp(ipAddress)) {
      return { country: null, city: null };
    }

    // Example using ipwho.is
    const url = `https://ipwho.is/${ipAddress}`;
    const response = await axios.get(url, { timeout: 5000 });

    const data = response.data;

    if (!data || data.success === false) {
      return { country: null, city: null };
    }

    return {
      country: data.country || null,
      city: data.city || null,
    };
  } catch (error) {
    console.error("IP lookup failed:", error.message);
    return { country: null, city: null };
  }
}

async function logScan({ qrCodeId, req, scanResult = "opened" }) {
  try {
    const forwarded = req.headers["x-forwarded-for"];
    const ipAddressRaw = forwarded
      ? forwarded.split(",")[0].trim()
      : req.socket?.remoteAddress || req.ip || null;

    const ipAddress = normalizeIp(ipAddressRaw);
    const userAgent = req.headers["user-agent"] || "";
    const referrer = req.headers["referer"] || null;

    const deviceType = detectDeviceType(userAgent);
    const browser = detectBrowser(userAgent);
    const os = detectOS(userAgent);

    const { country, city } = await lookupLocationFromIp(ipAddress);

    await pool.query(
      `
      INSERT INTO scan_logs
      (
        qr_code_id,
        ip_address,
        user_agent,
        device_type,
        browser,
        os,
        country,
        city,
        referrer,
        scan_result
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        qrCodeId,
        ipAddress,
        userAgent || null,
        deviceType,
        browser,
        os,
        country,
        city,
        referrer,
        scanResult,
      ]
    );
  } catch (error) {
    console.error("Scan logging error:", error.message);
  }
}

module.exports = {
  logScan,
};