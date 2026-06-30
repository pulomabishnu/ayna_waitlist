var SHEET_NAME = "Waitlist";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    sheet.appendRow([
      data.ts || new Date().toISOString(),
      data.first || "",
      data.last || "",
      data.email || "",
      data.phone || "",
      data.concern || "",
      data.source || ""
    ]);

    var ok = ContentService.createTextOutput('{"success":true}');
    return ok.setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var fail = ContentService.createTextOutput('{"success":false}');
    return fail.setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  var pong = ContentService.createTextOutput('{"status":"ok"}');
  return pong.setMimeType(ContentService.MimeType.JSON);
}
