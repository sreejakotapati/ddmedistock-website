# DDMediStock — Architecture

## System overview

```mermaid
flowchart TB
    subgraph Client
      U[Customer / Vendor / Staff browser]
    end

    subgraph Next["Next.js 15 (App Router)"]
      MW[Edge middleware<br/>RBAC route guards]
      UI[Server Components + Pages]
      API[Route Handlers /api/*]
    end

    subgraph Domain["Domain services (src/lib)"]
      RBAC[rbac.ts<br/>capability matrix]
      WF[workflow.ts<br/>state machines]
      AI[ai/* parser · matching · embeddings]
      QUOTE[services/quotation.ts<br/>lifecycle + approvals]
      PDF[services/pdf<br/>customer / internal docs]
    end

    subgraph Data
      PG[(PostgreSQL 16<br/>pgvector + pg_trgm)]
      REDIS[(Redis — planned<br/>queues / cache)]
      OPENAI[(OpenAI API<br/>optional)]
    end

    U --> MW --> UI
    U --> API
    API --> RBAC
    API --> WF
    API --> QUOTE
    API --> PDF
    QUOTE --> AI
    AI -->|embeddings / LLM| OPENAI
    RBAC & WF & QUOTE & PDF & AI --> PG
    API -.planned.-> REDIS
```

## RFQ → Quotation pipeline

```mermaid
sequenceDiagram
    actor C as Customer
    participant API as /api/rfqs
    participant AI as AI layer
    participant DB as Postgres
    actor S as Admin / Procurement Mgr

    C->>API: Submit RFQ (text / CSV / file)
    API->>AI: parse line items (LLM or heuristic)
    AI->>AI: embed + hybrid match (vector + fuzzy + attrs)
    AI->>DB: persist line items + ranked matches
    Note over API,DB: RFQ → MATCHING_COMPLETED
    S->>API: Generate AI draft quotation
    Note over DB: Quotation = DRAFT (internal only)
    S->>API: Submit for approval → approve → publish
    Note over DB: PENDING_APPROVAL → APPROVED → PUBLISHED
    API-->>C: Published quotation + customer PDF
```

## Key decisions

- **Provider-portable data, native acceleration.** Embeddings are stored as
  portable JSON *and* mirrored into a native `vector(1536)` column with an HNSW
  index; fuzzy search uses `pg_trgm` GIN indexes. The app falls back to in-app
  cosine/token scoring when pgvector is unavailable.
- **Security by construction.** The customer PDF/data projection has no
  cost/margin/vendor fields at the type level, so internal pricing cannot leak
  into customer output even by mistake.
- **Capability-based RBAC.** Authorization is checked against a capability
  matrix (`can()` / `assertCan()`), not raw role strings, so nuanced rules
  (Procurement Manager approves but cannot manage users) are explicit.
- **Validated workflow.** RFQ/Quotation status changes go through state-machine
  transition checks and are logged to an append-only approval history.
- **Offline-first AI.** Every AI call is guarded by `OPENAI_API_KEY`; the
  deterministic engine keeps the whole product usable (and tests hermetic)
  without a key.

## Module map

| Path | Responsibility |
|------|----------------|
| `src/middleware.ts` | Edge RBAC route protection |
| `src/lib/rbac.ts` | Capability matrix + guards |
| `src/lib/workflow.ts` | RFQ/Quotation state machines |
| `src/lib/ai/` | RFQ parser, similarity, hybrid matching |
| `src/lib/services/` | RFQ processing, pricing, quotation lifecycle, workflow log, PDF, catalog embeddings, audit |
| `prisma/` | Schema + migrations (Postgres + pgvector + pg_trgm) |
| `k8s/`, `Dockerfile`, `docker-compose.yml` | Deployment |
```
