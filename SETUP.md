# Ayna Waitlist — Setup Guide

## What you have

- `index.html` — the full waitlist page, ready to drop in your Cursor project
- `apps-script.js` — the Google Apps Script backend that writes to your Sheet
- This guide

---

## Step 1: Set up the Google Sheet + Apps Script backend

1. Go to [sheets.new](https://sheets.new) and create a new Google Sheet. Name it **Ayna Waitlist**.
2. In the menu, go to **Extensions → Apps Script**.
3. Delete all the default code in the editor.
4. Open `apps-script.js` from this folder, copy everything, and paste it into the Apps Script editor.
5. Click **Save** (the floppy disk icon or Cmd+S).
6. Click **Deploy → New deployment**.
7. Click the gear icon next to "Type" and select **Web app**.
8. Set:
   - **Execute as**: Me
   - **Who has access**: Anyone
9. Click **Deploy**. Authorize the permissions when prompted.
10. Copy the **Web app URL** — it looks like:
    `https://script.google.com/macros/s/ABC123.../exec`

---

## Step 2: Add the URL to your HTML page

Open `index.html` and find this line near the bottom:

```js
const SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
```

Replace `YOUR_APPS_SCRIPT_URL_HERE` with the URL you copied. Done.

---

## Step 3: Add the page to your Cursor project

Drop `index.html` into your project root (or `/public` if using Next.js/Vite).

If you're using **Next.js**, create a `/app/waitlist/page.tsx` and render the content there, or just serve `index.html` as a static file from `/public`.

If you want it at your root domain (e.g. `ayna.health`), put it in `/public/index.html`.

---

## Step 4: Deploy

Push to GitHub → Vercel picks it up automatically. The waitlist page will be live at your Vercel URL or custom domain.

---

## Notes

- Every submission lands in the **Waitlist** tab of your Google Sheet with a timestamp.
- The sheet and headers are created automatically on the first submission — you don't need to set anything up manually.
- The form uses `mode: 'no-cors'` so there are no CORS errors from the browser. The tradeoff is that the JS can't read the response body, but the write always goes through.
- To test locally before setting up the script, the page will simulate a successful submission so you can check the UI flow.
