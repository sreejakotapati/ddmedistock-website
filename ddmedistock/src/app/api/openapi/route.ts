// Serves the OpenAPI 3.1 document. Public so API consumers and Swagger UI can
// fetch it without authentication.

import { NextResponse } from "next/server";
import { openapiSpec } from "@/lib/openapi/spec";

export function GET() {
  return NextResponse.json(openapiSpec, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
