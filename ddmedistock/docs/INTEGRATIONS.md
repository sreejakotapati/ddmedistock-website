# DD Medistock — Website Integrations Guide

This covers the public marketing website's contact features: the enquiry form,
**Google Sheets** storage, **email notifications**, and **WhatsApp / Call**.

## How the enquiry flow works

When a visitor submits the enquiry form (Contact, Exports, or Vendor tabs):

1. The browser POSTs to `POST /api/enquiry` (same-origin, CSRF-checked, rate-limited).
2. The server validates the data (email + phone), rejects spam (honeypot).
3. It forwards the row to your **Google Apps Script Web App**, which:
   - appends a row to your Google Sheet, **and**
   - emails the notification to `md@sarnga.co.in`.
4. If the webhook isn't configured (or fails), it falls back to sending the email
   via **Resend**. If neither is configured, the submission is logged (dev mode).
5. The visitor sees: *"Thank you for contacting us. Our team will get back to you shortly."*

No pricing, cart, or payment is ever involved — this is a request-for-quote funnel.

---

## 1. Google Sheets setup (recommended: also sends the email)

This single Apps Script saves to the Sheet **and** emails the notification — no
separate email provider/account needed (it uses your Google/Gmail account).

### Step 1 — Create the Sheet
1. Go to <https://sheets.google.com> and create a spreadsheet, e.g. **"DD Medistock Enquiries"**.
2. (Optional) rename the first tab to `Enquiries`. The script creates the header row automatically on first submit.

### Step 2 — Add the Apps Script
1. In the Sheet: **Extensions → Apps Script**.
2. Delete any sample code and paste the script below.
3. Set `SHARED_TOKEN` to a long random string and `NOTIFY_EMAIL` to your inbox.

```javascript
// DD Medistock — enquiry intake (Google Sheets + email notification)
const SHEET_NAME   = 'Enquiries';
const NOTIFY_EMAIL = 'md@sarnga.co.in';            // who receives notifications
const SHARED_TOKEN = 'CHANGE-ME-long-random-string'; // must equal GOOGLE_SHEETS_WEBHOOK_TOKEN

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Reject forged posts.
    if (SHARED_TOKEN && data.token !== SHARED_TOKEN) {
      return json({ ok: false, error: 'unauthorized' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Date & Time', 'Name', 'Company Name', 'Email',
                       'Phone Number', 'Requirement', 'Message', 'Status']);
    }

    sheet.appendRow([
      data.timestamp || new Date(),
      data.name      || '',
      data.company   || '',
      data.email     || '',
      data.phone     || '',
      data.requirement || '',
      data.message   || '',
      data.status    || 'New',
    ]);

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'New Website Enquiry Received',
      replyTo: data.email || NOTIFY_EMAIL,
      body:
        'New ' + (data.kind || 'Website') + ' enquiry\n\n' +
        'Date & Time: ' + (data.timestamp || '') + '\n' +
        'Name:        ' + (data.name || '') + '\n' +
        'Company:     ' + (data.company || '') + '\n' +
        'Email:       ' + (data.email || '') + '\n' +
        'Phone:       ' + (data.phone || '') + '\n' +
        'Requirement: ' + (data.requirement || '') + '\n' +
        'Message:     ' + (data.message || '') + '\n',
    });

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Step 3 — Deploy as a Web App
1. **Deploy → New deployment → (gear) Web app**.
2. **Execute as:** *Me*. **Who has access:** *Anyone*.
3. Click **Deploy**, authorize when prompted, and **copy the Web app URL**
   (looks like `https://script.google.com/macros/s/AKfyc.../exec`).
4. The first run asks for Gmail/Sheets permission — approve it.

> "Anyone" makes the endpoint publicly reachable; the `SHARED_TOKEN` is what
> actually protects it. Keep the token secret.

### Step 4 — Configure the website
In your `.env` (and your hosting provider's env settings):

```bash
GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/AKfyc.../exec"
GOOGLE_SHEETS_WEBHOOK_TOKEN="CHANGE-ME-long-random-string"   # same as SHARED_TOKEN
NOTIFY_EMAIL="md@sarnga.co.in"
```

The Sheet columns will be:
`Date & Time · Name · Company Name · Email · Phone Number · Requirement · Message · Status`

---

## 2. Email notification — alternatives

The Apps Script above already emails `md@sarnga.co.in`. If you'd rather **not**
use Apps Script for email (or want a backup channel), the app also supports
**Resend**:

```bash
RESEND_API_KEY="re_xxx"
EMAIL_FROM="DD Medistock <no-reply@yourdomain.com>"
NOTIFY_EMAIL="md@sarnga.co.in"
```

Behaviour:
- `GOOGLE_SHEETS_WEBHOOK_URL` set → the script saves the row **and** emails.
- Webhook **not** set → the server emails via Resend.
- Neither set → submission is logged (useful in local dev).

Other SMTP/EmailJS/Google Workspace providers can be wired in
`src/lib/services/email.ts` (single `sendEmail()` function).

Subject line is always: **New Website Enquiry Received**.

---

## 3. WhatsApp & Call

All configured in [`src/lib/site.ts`](../src/lib/site.ts):

```ts
export const WHATSAPP = {
  number: "918838968124",          // digits only, country code, no +/spaces
  display: "+91 88389 68124",
  defaultMessage: "Hello, I would like to know more about your products and services.",
};

COMPANY.phone     // "+91 88389 68124"  (shown to users)
COMPANY.phoneHref // "tel:+918838968124" (click-to-call)
```

- **Floating WhatsApp button** appears on every page (bottom-right).
- Clicking the phone number opens **Call Now** / **Send WhatsApp Message**.
- WhatsApp links pre-fill the message above.

To change the number, edit `WHATSAPP.number`, `WHATSAPP.display`,
`COMPANY.phone`, and `COMPANY.phoneHref`.

---

## 4. Security & spam

- **Honeypot** hidden field — bot submissions are silently dropped.
- **Rate limiting** on `/api/*` (per-IP) via middleware.
- **CSRF** origin checks on all API requests (middleware).
- **Validation** — email format and phone (7–15 digits) on both client and server.
- **Shared token** authenticates the Sheets webhook.
- Strict **Content-Security-Policy** site-wide (relaxed only for fonts/maps on
  public pages).

---

## 5. SEO

- Per-page titles/descriptions, OpenGraph & Twitter cards.
- `MedicalBusiness` **JSON-LD** structured data (name, address, phone, area served).
- `sitemap.xml` and `robots.txt` generated automatically (`src/app/sitemap.ts`,
  `src/app/robots.ts`). Set `NEXT_PUBLIC_SITE_URL` to your real domain.

---

## 6. Deploy

Set the env vars from `.env.example` in your host, then:

```bash
npm install
npm run build
npm start          # or deploy to Vercel / your container platform
```

Required for the contact features in production:
`NEXT_PUBLIC_SITE_URL`, `NOTIFY_EMAIL`, and either
`GOOGLE_SHEETS_WEBHOOK_URL` (+ token) or `RESEND_API_KEY`.

### Quick test
1. Open `/contact`, submit the form.
2. Confirm a new row appears in the Google Sheet and an email arrives at
   `md@sarnga.co.in`.
3. Click the phone number → choose Call or WhatsApp. Click the floating button →
   WhatsApp opens with the pre-filled message.
