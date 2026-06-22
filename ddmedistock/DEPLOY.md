# Deploying DD Medistock

This is a **Next.js (App Router) application** with a server backend — the enquiry
API (`/api/enquiry`), security middleware, and the admin/customer/vendor portal.
It therefore needs a host that runs **Node.js**.

> ⚠️ **GitHub Pages will not work** for this project — Pages only serves static
> files and cannot run the server (the form, email, Google Sheets, and portal
> would all break). Use **Vercel** or **Netlify** instead (both have free tiers).
> You still keep your code on GitHub; only the *hosting* differs.

---

## Step 1 — Push the code to GitHub

From the project folder:

```bash
git init
git add .
git commit -m "DD Medistock website"
git branch -M main
git remote add origin https://github.com/<your-username>/ddmedistock.git
git push -u origin main
```

`.env` is git-ignored, so your secrets are **not** committed (good). You'll set
them in the host's dashboard instead (Step 3).

---

## Step 2 — Deploy on Vercel (recommended)

1. Go to <https://vercel.com> → **Add New… → Project** → import your GitHub repo.
2. Vercel auto-detects Next.js. Leave the defaults:
   - Build command: `next build` (Prisma client is generated automatically via the
     `postinstall` script).
   - Output: handled by Next.js.
3. Add the environment variables (Step 3) under **Settings → Environment Variables**.
4. Click **Deploy**. You'll get a live URL like `https://ddmedistock.vercel.app`.

### Netlify alternative
1. <https://netlify.com> → **Add new site → Import an existing project** → pick the repo.
2. Build command: `next build`. Install the official **Next.js Runtime** plugin
   when prompted (Netlify suggests it automatically).
3. Add the same environment variables → **Deploy**.

---

## Step 3 — Environment variables

### To run the public website + enquiry form (the main site)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your live URL, e.g. `https://ddmedistock.vercel.app` (SEO/sitemap/OG). |
| `NOTIFY_EMAIL` | Inbox for new enquiries — `md@sarnga.co.in`. |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Google Apps Script URL that saves to the Sheet + emails. See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md). |
| `GOOGLE_SHEETS_WEBHOOK_TOKEN` | Shared secret matching the Apps Script. |
| `JWT_SECRET` | Any long random string (required by the app). |

If you skip the Google Sheets webhook, set `RESEND_API_KEY` + `EMAIL_FROM`
instead to send the email via Resend. With neither configured, enquiries are
only logged (so nothing errors, but you won't be notified).

### Only needed for the procurement portal (admin/customer/vendor)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (e.g. Vercel Postgres, Neon, Supabase). |
| `REDIS_URL` | Optional — background job queue (works inline without it). |
| `OPENAI_API_KEY` | Optional — AI matching (offline fallback without it). |

The **public marketing pages and the enquiry form do not need a database** — they
work as soon as the site deploys. The portal pages only function once
`DATABASE_URL` is set and migrations are run (`npm run setup`).

See [`.env.example`](.env.example) for the full list with comments.

---

## Step 4 — Custom domain (optional)

In Vercel/Netlify → **Domains**, add e.g. `www.ddmedistock.com` and follow the DNS
instructions. Then update `NEXT_PUBLIC_SITE_URL` to the custom domain and redeploy.

---

## Local development

```bash
npm install
cp .env.example .env   # fill in values
npm run dev            # http://localhost:3000
```

---

## What's included
- Public marketing site: Home, About, Products, Exports, Compliance, Contact.
- WhatsApp + Call integration (floating button, click-to-choose, pre-filled message).
- Enquiry form → Google Sheets + email notification (see docs/INTEGRATIONS.md).
- SEO: sitemap, robots, JSON-LD, OpenGraph.
- The existing AI procurement portal (admin/customer/vendor) — optional, needs a DB.
