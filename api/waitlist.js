const { randomUUID } = require("crypto");

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwHJXzFXu-o5gwIwONZ1jMSm1KSBhF1e2aumxHxH7ZHMkOLPkq5O-gZzah24rNuUjx5WQ/exec";

const WEBHOOK_TIMEOUT_MS = 20000;

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
  const device = normalizeString(payload.device);
  const source = normalizeString(payload.source);
  const concern = normalizeString(payload.concern);
  const agreePrerelease = payload.agreePrerelease === true;
  const agreeConsent = payload.agreeConsent === true;

  if (!first) return { error: "First name is required" };
  if (!last) return { error: "Last name is required" };
  if (!email || !isValidEmail(email)) {
    return { error: "Valid email is required" };
  }
  if (!phone) return { error: "Phone number is required" };
  if (!device) return { error: "Please select your device" };
  if (!concern) {
    return { error: "Please select at least one concern" };
  }
  if (!source) {
    return { error: "Please tell us how you found us" };
  }
  if (!agreePrerelease) {
    return { error: "You must acknowledge this is a pre-release build" };
  }
  if (!agreeConsent) {
    return { error: "You must confirm you're 18+ and consent to the testing terms" };
  }

  return {
    value: {
      submissionId: randomUUID(),
      ts: new Date().toISOString(),
      first,
      last,
      email,
      phone,
      device,
      concern,
      source,
      agreePrerelease,
      agreeConsent
    }
  };
}

async function sendToGoogleSheets(submission) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(submission),
      signal: controller.signal
    });

    const text = await response.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error(
        `Sheets webhook returned invalid JSON: ${text.slice(0, 200)}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Sheets webhook failed (${response.status}): ${
          parsed.error || text.slice(0, 200)
        }`
      );
    }

    // Never acknowledge a signup unless Apps Script explicitly confirms it.
    if (parsed.success !== true) {
      throw new Error(
        parsed.error || "Sheets webhook did not confirm submission"
      );
    }

    return parsed;
  } catch (err) {
    if (err && err.name === "AbortError") {
      throw new Error("Sheets webhook timed out");
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  let checked;

  try {
    const body =
      typeof req.body === "object"
        ? req.body
        : JSON.parse(req.body || "{}");

    checked = validatePayload(body);
  } catch (err) {
    return res.status(400).json({
      error: "Invalid request body"
    });
  }

  if (checked.error) {
    return res.status(400).json({
      error: checked.error
    });
  }

  try {
    await sendToGoogleSheets(checked.value);

    return res.status(201).json({
      success: true,
      submissionId: checked.value.submissionId
    });
  } catch (err) {
    const message =
      err && err.message
        ? err.message
        : "Unable to save waitlist submission";

    // Only log the random ID, never the person's private info.
    console.error("Waitlist persistence failed", {
      submissionId: checked.value.submissionId,
      message
    });

    return res.status(502).json({
      success: false,
      submissionId: checked.value.submissionId,
      error: "We couldn't save your signup. Please try again."
    });
  }
};
