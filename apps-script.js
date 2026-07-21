var SHEET_NAME = "Waitlist";
// Substack credentials are read from Script Properties (Project Settings -> Script Properties),
// not hardcoded here, so they never end up committed to git. Keys: SUBSTACK_PUB, SUBSTACK_SID.

function doPost(e) {
  try {
    Logger.log("RAW BODY: " + e.postData.contents);

    var data = JSON.parse(e.postData.contents);
    Logger.log("PHONE VALUE: " + data.phone);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    Logger.log("HEADERS: " + JSON.stringify(headers));

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

    Logger.log("ROW TO WRITE: " + JSON.stringify(row));
    sheet.appendRow(row);
    addToSubstack(data.email, data.first, data.last);

    var ok = ContentService.createTextOutput('{"success":true}');
    return ok.setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("ERROR: " + err.message);
    var fail = ContentService.createTextOutput('{"success":false}');
    return fail.setMimeType(ContentService.MimeType.JSON);
  }
}

function addToSubstack(email, firstName, lastName) {
  try {
    var props = PropertiesService.getScriptProperties();
    var pub = props.getProperty("SUBSTACK_PUB");
    var sid = props.getProperty("SUBSTACK_SID");

    if (!pub || !sid) {
      Logger.log("Substack skipped: SUBSTACK_PUB or SUBSTACK_SID not set in Script Properties.");
      return;
    }

    var url = "https://" + pub + ".substack.com/api/v1/subscriber";
    var options = {
      method: "post",
      contentType: "application/json",
      headers: { "Cookie": "substack.sid=" + sid },
      payload: JSON.stringify({ email: email, name: firstName + " " + lastName }),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(url, options);
    Logger.log("Substack response (" + response.getResponseCode() + "): " + response.getContentText());
  } catch (err) {
    Logger.log("Substack error: " + err.message);
  }
}

function doGet() {
  var pong = ContentService.createTextOutput('{"status":"ok"}');
  return pong.setMimeType(ContentService.MimeType.JSON);
}
