const SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_URL_HERE";
const WEBHOOK_TIMEOUT_MS = 10000;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(payload) {
  const first = normalizeString(payload.first);
  const last = normalizeString(payload.last);
  const email = normalizeString(payload.email).toLowerCase();
  const phone = normalizeString(payload.phone);
  const source = normalizeString(payload.source);
  const concern = normalizeString(payload.concern);

  if (!first) return { error: "First name is required" };
  if (!last) return { error: "Last name is required" };
  if (!email || !isValidEmail(email)) return { error: "Valid email is required" };
  if (!phone) return { error: "Phone number is required" };
  if (!concern) return { error: "Please select at least one concern" };
  if (!source) return { error: "Please tell us how you found us" };

  return {
    value: { ts: new Date().toISOString(), first, last, email, phone, concern, source }
  };
}

async function sendToGoogleSheets(submission) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Sheets webhook failed (${response.status}): ${text.slice(0, 200)}`);
    }

    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.success === false) {
        throw new Error(parsed.error || "Sheets webhook returned success=false");
      }
    } catch {
      // non-JSON response is fine
    }
  } catch (err) {
    if (err && err.name === "AbortError") throw new Error("Sheets webhook timed out");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const checked = validatePayload(body);
    if (checked.error) return res.status(400).json({ error: checked.error });

    await sendToGoogleSheets(checked.value);
    return res.status(201).json({ success: true });
  } catch (err) {
    const message = err && err.message ? err.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
};
