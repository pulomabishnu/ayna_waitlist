var SHEET_NAME = "Waitlist";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    var fieldMap = {
      "timestamp":      data.ts || new Date().toISOString(),
      "first name":     data.first || "",
      "last name":      data.last || "",
      "email":          data.email || "",
      "phone":          data.phone || "",
      "health concern": data.concern || "",
      "how they heard": data.source || ""
    };

    var row = [];
    for (var i = 0; i < headers.length; i++) {
      var key = String(headers[i]).trim().toLowerCase();
      row.push(fieldMap[key] !== undefined ? fieldMap[key] : "");
    }

    sheet.appendRow(row);

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
