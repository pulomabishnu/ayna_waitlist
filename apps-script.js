var SHEET_NAME = "Waitlist";
var RAW_SHEET_NAME = "Raw Submissions";

function doPost(e) {
  var rawSheet = null;
  var rawRow = null;

  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === "adminRead") {
      return handleAdminRead(data);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var submissionId = data.submissionId || Utilities.getUuid();
    var receivedAt = new Date().toISOString();
    var timestamp = data.ts || receivedAt;

    rawSheet = getOrCreateRawSheet(ss);

    rawSheet.appendRow([
      submissionId,
      receivedAt,
      timestamp,
      data.first || "",
      data.last || "",
      data.email || "",
      data.phone || "",
      data.device || "",
      data.concern || "",
      data.source || "",
      data.agreePrerelease ? "Yes" : "No",
      data.agreeConsent ? "Yes" : "No",
      "RECEIVED",
      "PENDING",
      ""
    ]);

    rawRow = rawSheet.getLastRow();

    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error("Waitlist sheet not found");
    }

    var lastCol = sheet.getLastColumn();

    if (lastCol === 0) {
      throw new Error("Waitlist sheet has no headers");
    }

    var headers = sheet
      .getRange(1, 1, 1, lastCol)
      .getValues()[0];

    var fieldMap = {
      "timestamp": timestamp,
      "first name": data.first || "",
      "last name": data.last || "",
      "email": data.email || "",
      "phone": data.phone || "",
      "device": data.device || "",
      "health concern": data.concern || "",
      "how they heard": data.source || "",
      "pre-release ack": data.agreePrerelease ? "Yes" : "No",
      "18+ consent": data.agreeConsent ? "Yes" : "No"
    };

    var row = [];

    for (var i = 0; i < headers.length; i++) {
      var key = String(headers[i]).trim().toLowerCase();

      row.push(
        fieldMap[key] !== undefined
          ? fieldMap[key]
          : ""
      );
    }

    sheet.appendRow(row);

    rawSheet.getRange(rawRow, 13).setValue("SAVED");

    var substackResult = addToSubstack(
      data.email,
      data.first,
      data.last
    );

    rawSheet
      .getRange(rawRow, 14)
      .setValue(substackResult.success ? "SENT" : "FAILED");

    if (!substackResult.success) {
      rawSheet
        .getRange(rawRow, 15)
        .setValue(substackResult.error || "Substack failed");
    }

    return jsonResponse({
      success: true,
      submissionId: submissionId
    });

  } catch (err) {
    Logger.log("ERROR: " + err.message);

    if (rawSheet && rawRow) {
      try {
        rawSheet
          .getRange(rawRow, 13)
          .setValue("WAITLIST WRITE FAILED");

        rawSheet
          .getRange(rawRow, 15)
          .setValue(err.message);
      } catch (backupErr) {
        Logger.log(
          "Could not update backup status: " +
          backupErr.message
        );
      }
    }

    return jsonResponse({
      success: false,
      error: err.message
    });
  }
}

function getOrCreateRawSheet(ss) {
  var sheet = ss.getSheetByName(RAW_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(RAW_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "submission id",
      "received at",
      "timestamp",
      "first name",
      "last name",
      "email",
      "phone",
      "device",
      "health concern",
      "how they heard",
      "pre-release ack",
      "18+ consent",
      "waitlist status",
      "substack status",
      "error"
    ]);

    sheet.setFrozenRows(1);
  }

  return sheet;
}

function handleAdminRead(data) {
  var props = PropertiesService.getScriptProperties();
  var adminSecret = props.getProperty("ADMIN_READ_SECRET");

  if (
    !adminSecret ||
    !data.secret ||
    data.secret !== adminSecret
  ) {
    return jsonResponse({
      success: false,
      error: "Unauthorized"
    });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return jsonResponse({
      success: false,
      error: "Waitlist sheet not found"
    });
  }

  var values = sheet
    .getDataRange()
    .getDisplayValues();

  var headers =
    values.length > 0 ? values[0] : [];

  var rows =
    values.length > 1 ? values.slice(1) : [];

  return jsonResponse({
    success: true,
    count: rows.length,
    headers: headers,
    rows: rows
  });
}

function addToSubstack(email, firstName, lastName) {
  try {
    var props = PropertiesService.getScriptProperties();

    var pub = props.getProperty("SUBSTACK_PUB");
    var sid = props.getProperty("SUBSTACK_SID");

    if (!pub || !sid) {
      return {
        success: false,
        error: "Substack credentials missing"
      };
    }

    var url =
      "https://" +
      pub +
      ".substack.com/api/v1/subscriber";

    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Cookie": "substack.sid=" + sid
      },
      payload: JSON.stringify({
        email: email,
        name:
          (firstName || "") +
          " " +
          (lastName || "")
      }),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();

    if (code >= 200 && code < 300) {
      return {
        success: true
      };
    }

    return {
      success: false,
      error: "Substack returned HTTP " + code
    };

  } catch (err) {
    Logger.log("Substack error: " + err.message);

    return {
      success: false,
      error: err.message
    };
  }
}

function doGet() {
  return jsonResponse({
    status: "ok"
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
