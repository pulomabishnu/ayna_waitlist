// ═══════════════════════════════════════════════════════════
//  Ayna Waitlist — Google Apps Script backend
//  Deploy this as a Web App (anyone can submit, no auth)
// ═══════════════════════════════════════════════════════════

const SHEET_NAME = "Waitlist";
const HEADERS = ["Timestamp", "First Name", "Last Name", "Email", "Health Concern", "How They Heard"];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet + headers on first run
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight("bold")
        .setBackground("#f3ede8");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      data.ts || new Date().toISOString(),
      data.first || "",
      data.last || "",
      data.email || "",
      data.concern || "",
      data.source || ""
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET handler (keeps the web app alive / health check)
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", app: "Ayna Waitlist" }))
    .setMimeType(ContentService.MimeType.JSON);
}
