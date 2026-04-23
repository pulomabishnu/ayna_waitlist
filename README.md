# Ayna Waitlist

Waitlist landing page + Node API that writes signups to Google Sheets (via Google Apps Script).

## 1) Create your Google Sheet

Create a sheet with this header row:

`submittedAt | firstName | lastName | email | concerns | concernOther | source | sourceOther`

## 2) Add Google Apps Script webhook

In your sheet:

1. Go to **Extensions -> Apps Script**
2. Replace code with:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.submittedAt || "",
    data.firstName || "",
    data.lastName || "",
    data.email || "",
    (data.concerns || []).join(", "),
    data.concernOther || "",
    data.source || "",
    data.sourceOther || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Deploy -> New deployment**
4. Type: **Web app**
5. Execute as: **Me**
6. Who has access: **Anyone** (or Anyone with link)
7. Copy the Web app URL

## 3) Run the app

Use Node 18+.

### PowerShell (Windows)

```powershell
$env:GOOGLE_SCRIPT_URL="PASTE_YOUR_WEB_APP_URL_HERE"
node server.js
```

Then open [http://localhost:3000](http://localhost:3000).

## What this app does

- Serves `index.html`
- Accepts signups at `POST /api/waitlist`
- Validates required fields server-side
- Sends each signup to your Google Apps Script webhook URL
