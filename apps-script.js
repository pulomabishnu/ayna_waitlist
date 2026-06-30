var SHEET_NAME = "Waitlist";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    var row = [];
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      if (h === "Timestamp")      row.push(data.ts || new Date().toISOString());
      else if (h === "First Name") row.push(data.first || "");
      else if (h === "Last Name")  row.push(data.last || "");
      else if (h === "Email")      row.push(data.email || "");
      else if (h === "Phone")      row.push(data.phone || "");
      else if (h === "Health Concern") row.push(data.concern || "");
      else if (h === "How They Heard") row.push(data.source || "");
      else row.push("");
    }

    sheet.appendRow(row);

    var ok = ContentService.createTextOutput('{"success":true}');
    return ok.setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var fail = ContentService.createTextOutput('{"success":false,"error":"' + err.message + '"}');
    return fail.setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  var pong = ContentService.createTextOutput('{"status":"ok"}');
  return pong.setMimeType(ContentService.MimeType.JSON);
}
