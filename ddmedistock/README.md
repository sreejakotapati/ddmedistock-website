# DDMediStock — AI-Powered Medical Procurement & RFQ Platform

A modern **B2B medical procurement assistant** for hospitals, clinics and labs.
DDMediStock is **not** an e-commerce marketplace — there is no public pricing, no
add-to-cart, and no instant customer quotations. Instead it helps procurement
teams source the right products **by specification, not by product name**:

1. **Customers** upload requirement sheets (RFQs) or build one from product search.
2. The **AI engine** extracts line items + specs and matches them across the
   catalog (attribute + fuzzy + semantic), with confidence scores and
   domestic/imported alternatives.
3. The AI generates a **draft quotation visible only to staff**.
4. **Admins / Procurement Managers** review, edit pricing & sourcing, and publish.
5. **Customers** only ever see the final, approved quotation — never cost,
   margins, supplier data or AI drafts.

> AI assists procurement · Admin controls quotations · Customers see only approved quotations.

---

## Quick start

```bash
npm install
npm run setup     # prisma generate + migrate + seed demo data
npm run dev       # http://localhost:3000
```

`npm run setup` is idempotent. To reset demo data later: `npm run db:seed`.

### Demo accounts (password: `password123`)

| Role | Email | Portal |
|------|-------|--------|
| Super Admin | `superadmin@ddmedistock.com` | `/admin` (+ User Management) |
| Admin | `admin@ddmedistock.com` | `/admin` |
| Procurement Manager | `manager@ddmedistock.com` | `/admin` |
| Customer | `procurement@cityhospital.in` | `/customer` |
| Vendor | `sales@medsupply.in` | `/vendor` |

Try it: log in as the **Customer**, open **New RFQ → Use sample → Submit**, then log
in as **Admin**, open the RFQ, pick matches, **Generate draft quotation**, edit
pricing, and **Approve & publish**. Back as the Customer, the quotation appears in
the **Quotation Inbox**, downloadable as a clean PDF (print).

---

## What's implemented

A fully runnable, end-to-end vertical slice of the platform:

- **Three portals + 5-role RBAC** — Customer, Vendor, Admin, Procurement
  Manager, Super Admin. Edge middleware guards every portal; API routes use
  role guards (`requireStaff`, `requireSuperAdmin`).
- **Auth** — JWT (jose) in httpOnly cookies, bcrypt password hashing.
- **RFQ intelligence** — upload PDF / Excel / CSV / text (CSV & Excel parsed via
  SheetJS); OCR/PDF hooks stubbed. LLM parser uses OpenAI when `OPENAI_API_KEY`
  is set, with a deterministic **heuristic parser fallback** so it runs offline.
- **Hybrid Product Matching Engine** — attribute matching + fuzzy (token Dice +
  Levenshtein) + semantic (token-overlap, standing in for pgvector cosine),
  blended into a 0–100 confidence score with explainable reasons.
- **Predictive substitution** — best domestic vs. imported alternative per item.
- **AI draft quotation generator** (staff-only) + **Margin Engine** (cost →
  markup rules → customer price), never exposed to customers.
- **Admin quotation editor** — edit products, qty, cost, margin, price, tax,
  lead time, origin, supplier, notes; live internal P&L + customer total.
- **Versioning, audit logs, notifications**, organization & team views, vendor
  catalog/stock/compliance, product master, margin rules, dashboard charts.
- **Customer-safe quotation document** with print-to-PDF.

### Verified data-isolation guarantee
Customer-facing pages and APIs never serialize `unitCost`, `marginPct`,
`vendorName`, `internalNote`, or draft quotations. Only `PUBLISHED` quotations
are visible to customers, scoped to their organization.

---

## Tech stack & architecture decisions

This repo targets **runnability in a single command** while staying faithful to
the production architecture. Where a production dependency requires external
infrastructure, it is implemented behind a seam so it can be swapped in.

| Area | Implemented here | Production target |
|------|------------------|-------------------|
| Framework | **Next.js 15** (App Router) + **TypeScript** + **Tailwind v4** | same |
| UI | Hand-rolled shadcn-style components, **lucide-react**, **recharts**, **sonner** | + full Radix/shadcn |
| Backend | Next.js Route Handlers + server actions | NestJS (Swagger, class-validator) optional split |
| DB | **Prisma** + **PostgreSQL 16 + pgvector + pg_trgm** (HNSW ANN + trigram indexes, soft delete, backup/restore scripts) | managed Postgres + read replicas |
| Auth | JWT (**jose**) + **bcryptjs**, RBAC middleware | + next-auth, helmet, rate-limiter-flexible |
| AI parse/match | Pluggable OpenAI client + offline heuristics | OpenAI + **LangChain** + embeddings + pgvector |
| OCR | CSV/Excel (SheetJS); PDF/image hooks | PaddleOCR / Tesseract / PDFPlumber / PyMuPDF (FastAPI) |
| File upload | Multipart route + extractor seam | UploadThing / **AWS S3** + Multer |
| Background jobs | Synchronous processing seam (`processRfq`) | **BullMQ + Redis** workers |
| Notifications | In-app notifications table | + Resend email, FCM, Socket.IO realtime |
| PDF | Browser print of a styled document | pdf-lib / Puppeteer server render |
| Observability | Audit logs | Pino + Sentry |
| Infra | Local dev | Docker Compose / Kubernetes |

The matching and parsing logic lives in `src/lib/ai/` and the workflow
orchestration in `src/lib/services/` — these are the seams where LangChain,
pgvector, and a FastAPI OCR microservice plug in without touching the UI.

---

## Project structure

```
prisma/
  schema.prisma         # full data model (15+ tables)
  seed.ts               # demo organizations, users, vendors, products, costs
src/
  middleware.ts         # edge RBAC route protection
  lib/
    ai/                 # similarity, RFQ parser, hybrid matching engine
    services/           # rfq processing, pricing/margin, quotation lifecycle, audit
    auth.ts jwt.ts      # session (node) + edge-safe JWT
    constants.ts        # roles, statuses, labels
  app/
    page.tsx login/ register/
    customer/           # dashboard, rfqs, catalog search, quotation inbox, org
    admin/              # dashboard, rfqs, quotations editor, products, vendors,
                        # margins, audit, users (super admin)
    vendor/             # dashboard, catalog & stock, compliance
    api/                # auth, rfqs, catalog, admin/*, vendor/*
  components/           # ui primitives + portal shell + feature components
```

## Data model

`Organization, User, Vendor, Category, Product, ProductAttribute,
VendorProduct, VendorCost, MarginRule, RFQ, RFQLineItem, ProductMatch,
Quotation, QuotationItem, QuotationVersion, Notification, AuditLog`.

## Environment

See `.env.example`. Requires a PostgreSQL 16 database with the `vector` and
`pg_trgm` extensions (`createdb` + `prisma migrate deploy` + `prisma db seed`).
`OPENAI_API_KEY` is optional — when present the RFQ parser and embeddings use
OpenAI; otherwise a deterministic heuristic/offline engine runs so the app and
test suite work without a key.

Backups: `scripts/db-backup.sh` (compressed `pg_dump`, retention pruning,
optional S3) and `scripts/db-restore.sh`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run setup` | generate + migrate + seed |
| `npm run db:seed` | Reseed demo data |
| `npm run db:migrate` | Create/apply a migration |
