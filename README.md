# Ayna Waitlist

Waitlist landing page + Node API that writes signups to Google Sheets (via Google Apps Script).

## 1) Create your Google Sheet

Create a "Waitlist" sheet with a header row using (a subset of) these column names, in any order:

`timestamp | first name | last name | email | phone | device | health concern | how they heard | pre-release ack | 18+ consent`

The actual Apps Script (`apps-script.js`) also maintains a "Raw Submissions" sheet as a full audit log of every request, including delivery status.

## 2) Add Google Apps Script webhook

In your sheet:

1. Go to **Extensions -> Apps Script**
2. Paste in the contents of `apps-script.js` from this repo

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
