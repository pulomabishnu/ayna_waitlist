// ═══════════════════════════════════════════════════════════
//  Ayna Waitlist — Google Apps Script backend
//  Deploy this as a Web App (anyone can submit, no auth)
// ═══════════════════════════════════════════════════════════

var SHEET_NAME = "Waitlist";
var HEADERS = ["Timestamp", "First Name", "Last Name", "Email", "Phone", "Health Concern", "How They Heard"];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#f3ede8");
      sheet.setFrozenRows(1);
    } else {
      // Sheet already exists — insert Phone column after Email if missing
      var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (existingHeaders.indexOf("Phone") === -1) {
        var emailCol = existingHeaders.indexOf("Email") + 1; // 1-based
        sheet.insertColumnAfter(emailCol);
        var phoneCell = sheet.getRange(1, emailCol + 1);
        phoneCell.setValue("Phone");
        phoneCell.setFontWeight("bold").setBackground("#f3ede8");
      }
    }

    // Write data by matching header names so column order never matters
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var fieldMap = {
      "Timestamp": data.ts || new Date().toISOString(),
      "First Name": data.first || "",
      "Last Name": data.last || "",
      "Email": data.email || "",
      "Phone": data.phone || "",
      "Health Concern": data.concern || "",
      "How They Heard": data.source || ""
    };
    var row = headers.map(function(h) { return fieldMap[h] !== undefined ? fieldMap[h] : ""; });
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", app: "Ayna Waitlist" })).setMimeType(ContentService.MimeType.JSON);
}
