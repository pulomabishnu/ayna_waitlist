const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwtriZSCupCOC8pemVhY7ktCpSbIp3T9_eFNwR6wWbabzVvw9olqoYfMsfxlqxPrmvikQ/exec";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.AYNA_ADMIN_SECRET;
  const auth = req.headers.authorization || "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adminRead",
        secret
      })
    });

    const data = await response.json();

    if (!data.success) {
      return res.status(502).json({
        error: data.error || "Could not read waitlist"
      });
    }

    return res.status(200).json({
      count: data.rows.length,
      headers: data.headers,
      rows: data.rows
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Unexpected error"
    });
  }
};
