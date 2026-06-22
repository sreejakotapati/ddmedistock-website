// OpenAPI 3.1 specification for the DDMediStock API.
//
// Hand-authored (the routes are Next.js route handlers without decorators) and
// kept in sync with the implementation. A unit test asserts every documented
// path maps to a real route file and every operation declares responses.
// Served at GET /api/openapi and rendered by /docs (Swagger UI).

export type OpenApiDoc = Record<string, unknown>;

const bearerError = (desc: string) => ({
  description: desc,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

const ok = (desc: string, schema?: object) => ({
  description: desc,
  ...(schema ? { content: { "application/json": { schema } } } : {}),
});

const jsonBody = (schema: object, required = true) => ({
  required,
  content: { "application/json": { schema } },
});

export const openapiSpec: OpenApiDoc = {
  openapi: "3.1.0",
  info: {
    title: "DDMediStock API",
    version: "1.0.0",
    description:
      "B2B medical procurement & RFQ platform API. Authentication is via an " +
      "httpOnly session cookie (`ddms_session`) issued by POST /api/auth/login. " +
      "State-changing requests are CSRF-protected (same-origin) and rate-limited.",
  },
  servers: [{ url: "/", description: "Same-origin" }],
  tags: [
    { name: "Auth", description: "Login, logout, registration" },
    { name: "Catalog", description: "Product catalog search" },
    { name: "RFQ", description: "Requirement requests" },
    { name: "Quotations", description: "Quotation lifecycle (staff)" },
    { name: "Admin", description: "Back-office operations (staff)" },
    { name: "Vendor", description: "Vendor self-service" },
    { name: "System", description: "Docs & monitoring" },
  ],
  paths: {
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in and receive a session cookie",
        requestBody: jsonBody({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        }),
        responses: {
          "200": ok("Logged in", {
            type: "object",
            properties: { ok: { type: "boolean" }, role: { type: "string" } },
          }),
          "401": bearerError("Invalid email or password"),
          "429": bearerError("Too many login attempts"),
        },
      },
    },
    "/api/auth/logout": {
      post: { tags: ["Auth"], summary: "Log out (clears session)", responses: { "200": ok("Logged out") } },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a customer organization + user",
        requestBody: jsonBody({
          type: "object",
          required: ["email", "password", "name", "organizationName"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            name: { type: "string" },
            organizationName: { type: "string" },
          },
        }),
        responses: { "200": ok("Registered"), "400": bearerError("Validation error") },
      },
    },
    "/api/catalog": {
      get: {
        tags: ["Catalog"],
        summary: "Search the product catalog",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Free-text query" },
        ],
        responses: {
          "200": ok("Matching products", {
            type: "array",
            items: { $ref: "#/components/schemas/Product" },
          }),
        },
      },
    },
    "/api/rfqs": {
      post: {
        tags: ["RFQ"],
        summary: "Create an RFQ (customer) — triggers AI parse + match",
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody({
          type: "object",
          required: ["title", "rawText"],
          properties: {
            title: { type: "string" },
            rawText: { type: "string", description: "Raw RFQ text / pasted requirement sheet" },
            sourceType: { type: "string", enum: ["TEXT", "CSV", "EXCEL", "PDF", "IMAGE"] },
          },
        }),
        responses: {
          "200": ok("RFQ created", { $ref: "#/components/schemas/RFQ" }),
          "401": bearerError("Unauthorized"),
        },
      },
    },
    "/api/rfqs/upload": {
      post: {
        tags: ["RFQ"],
        summary: "Upload an RFQ document (PDF/image/scanned) — OCR + AI match",
        description:
          "multipart/form-data with a `file` field (and optional `title`). " +
          "PDFs use the text layer when present; scanned PDFs and images are OCR'd.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" },
                  title: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": ok("RFQ created from document", {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              rfqId: { type: "string" },
              reference: { type: "string" },
              sourceType: { type: "string", enum: ["PDF", "IMAGE", "CSV", "EXCEL", "TEXT"] },
            },
          }),
          "400": bearerError("No file / invalid upload"),
          "401": bearerError("Unauthorized"),
          "413": bearerError("File too large (max 20 MB)"),
        },
      },
    },
    "/api/admin/rfqs/{id}/generate": {
      post: {
        tags: ["Quotations"],
        summary: "Generate an AI draft quotation for an RFQ (staff)",
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: {
          "200": ok("Draft created", {
            type: "object",
            properties: { ok: { type: "boolean" }, quotationId: { type: "string" } },
          }),
          "403": bearerError("Forbidden"),
        },
      },
    },
    "/api/admin/quotations/{id}": {
      patch: {
        tags: ["Quotations"],
        summary: "Edit a quotation's items/notes (staff, not when published)",
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: jsonBody({ $ref: "#/components/schemas/QuotationEdit" }),
        responses: {
          "200": ok("Saved"),
          "403": bearerError("Forbidden"),
          "409": bearerError("Published quotations cannot be edited"),
        },
      },
    },
    "/api/admin/quotations/{id}/approval": {
      get: {
        tags: ["Quotations"],
        summary: "Workflow & approval history",
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: { "200": ok("History"), "403": bearerError("Forbidden") },
      },
      post: {
        tags: ["Quotations"],
        summary: "Submit for approval / approve / reject (staff)",
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: jsonBody({
          type: "object",
          required: ["action"],
          properties: {
            action: { type: "string", enum: ["SUBMIT", "APPROVE", "REJECT"] },
            note: { type: "string" },
          },
        }),
        responses: {
          "200": ok("Applied"),
          "403": bearerError("Capability denied (e.g. AI/customer cannot approve)"),
          "409": bearerError("Illegal workflow transition"),
        },
      },
    },
    "/api/admin/quotations/{id}/publish": {
      post: {
        tags: ["Quotations"],
        summary: "Publish a quotation to the customer (staff)",
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: { "200": ok("Published"), "403": bearerError("Forbidden") },
      },
    },
    "/api/admin/quotations/{id}/pdf": {
      get: {
        tags: ["Quotations"],
        summary: "Internal quotation PDF (cost/margin/vendor) — staff only",
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: {
          "200": { description: "PDF document", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
          "403": bearerError("Forbidden"),
        },
      },
    },
    "/api/customer/quotations/{id}/pdf": {
      get: {
        tags: ["Quotations"],
        summary: "Customer quotation PDF (no cost/margin/vendor)",
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: {
          "200": { description: "PDF document", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
          "404": bearerError("Not found / not published / not your organization"),
        },
      },
    },
    "/api/admin/queues": {
      get: {
        tags: ["System"],
        summary: "Queue monitoring dashboard data (staff)",
        security: [{ cookieAuth: [] }],
        responses: { "200": ok("Per-queue counts + DLQ totals"), "403": bearerError("Forbidden") },
      },
    },
    "/api/openapi": {
      get: { tags: ["System"], summary: "This OpenAPI document", responses: { "200": ok("OpenAPI 3.1 spec") } },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "ddms_session" },
    },
    parameters: {
      Id: { name: "id", in: "path", required: true, schema: { type: "string" } },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          brand: { type: "string", nullable: true },
          uom: { type: "string" },
          originType: { type: "string", enum: ["DOMESTIC", "IMPORTED"] },
        },
      },
      RFQ: {
        type: "object",
        properties: {
          id: { type: "string" },
          reference: { type: "string" },
          title: { type: "string" },
          status: { type: "string" },
        },
      },
      QuotationEdit: {
        type: "object",
        required: ["items"],
        properties: {
          customerNotes: { type: "string" },
          internalNotes: { type: "string" },
          taxPct: { type: "number" },
          status: { type: "string", enum: ["DRAFT", "PENDING_APPROVAL"] },
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["description"],
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
                unitCost: { type: "number" },
                marginPct: { type: "number" },
                unitPrice: { type: "number" },
                taxPct: { type: "number" },
                originType: { type: "string", enum: ["DOMESTIC", "IMPORTED"] },
              },
            },
          },
        },
      },
    },
  },
};
