const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MAX_BODY_BYTES = 1024 * 1024;
const WEBHOOK_TIMEOUT_MS = 10000;
const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SCRIPT_URL || process.env.SHEETS_WEBHOOK_URL || "";
const HERO_IMAGE_PATH = process.env.HERO_IMAGE_PATH || "C:\\Users\\pulom\\.cursor\\projects\\c-Users-pulom-ayna-waitlist\\assets\\c__Users_pulom_AppData_Roaming_Cursor_User_workspaceStorage_41615ed712d4becfbf8c0419b49baaf2_images_image-647bda4a-5c10-4887-a716-f2183ca9053b.png";

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendFile(res, statusCode, filePath, contentType) {
  return fs.readFile(filePath)
    .then((buf) => {
      res.writeHead(statusCode, {
        "Content-Type": contentType,
        "Content-Length": buf.length
      });
      res.end(buf);
    })
    .catch(() => {
      sendJson(res, 404, { error: "File not found" });
    });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(payload) {
  const firstName = normalizeString(payload.firstName);
  const lastName = normalizeString(payload.lastName);
  const email = normalizeString(payload.email).toLowerCase();
  const source = normalizeString(payload.source);
  const sourceOther = normalizeString(payload.sourceOther);
  const concernOther = normalizeString(payload.concernOther);
  const concerns = Array.isArray(payload.concerns)
    ? payload.concerns.map((v) => normalizeString(v)).filter(Boolean)
    : [];

  if (!firstName) return { error: "First name is required" };
  if (!lastName) return { error: "Last name is required" };
  if (!email || !isValidEmail(email)) return { error: "Valid email is required" };
  if (!source) return { error: "Source is required" };
  if (!concerns.length) return { error: "At least one concern is required" };

  if (concerns.includes("Something else") && !concernOther) {
    return { error: "Please specify your concern" };
  }
  if (source === "Other" && !sourceOther) {
    return { error: "Please specify your source" };
  }

  return {
    value: {
      firstName,
      lastName,
      email,
      concerns,
      concernOther,
      source,
      sourceOther,
      submittedAt: new Date().toISOString()
    }
  };
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

async function sendToGoogleSheets(submission) {
  if (!SHEETS_WEBHOOK_URL) {
    throw new Error("Missing GOOGLE_SCRIPT_URL. Add it to your environment.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      const bodySnippet = text ? `: ${text.slice(0, 240)}` : "";
      throw new Error(`Google Sheets webhook failed (${response.status})${bodySnippet}`);
    }

    // Most Apps Script endpoints return plain text; if JSON is returned and includes
    // success=false, treat it as an application-level failure.
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.success === false) {
          throw new Error(parsed.error || "Google Sheets webhook returned success=false");
        }
      } catch {
        // Non-JSON response is acceptable.
      }
    }
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("Google Sheets webhook timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const reqPath = new URL(req.url, `http://${req.headers.host}`).pathname;

    if (req.method === "GET" && reqPath === "/") {
      return sendFile(res, 200, path.join(ROOT, "index.html"), "text/html; charset=utf-8");
    }

    if (req.method === "GET" && reqPath === "/hero-bg") {
      return sendFile(res, 200, HERO_IMAGE_PATH, "image/png");
    }

    if (req.method === "POST" && reqPath === "/api/waitlist") {
      const payload = await parseJsonBody(req);
      const checked = validatePayload(payload);
      if (checked.error) return sendJson(res, 400, { error: checked.error });

      await sendToGoogleSheets(checked.value);
      return sendJson(res, 201, { success: true });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error && error.message ? error.message : "Unexpected server error";
    const status = message === "Invalid JSON" || message === "Body too large" ? 400 : 500;
    return sendJson(res, status, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`Waitlist server running at http://localhost:${PORT}`);
  if (SHEETS_WEBHOOK_URL) {
    console.log("Google Sheets webhook is configured.");
  } else {
    console.log("Google Sheets webhook is NOT configured. Set GOOGLE_SCRIPT_URL.");
  }
});
