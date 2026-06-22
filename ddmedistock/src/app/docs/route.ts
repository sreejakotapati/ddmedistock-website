// Swagger UI documentation page at /docs.
//
// Loads Swagger UI from jsDelivr (allowed by the docs-specific CSP set in
// middleware) and renders the spec served at /api/openapi. Served as a route
// handler so we emit raw HTML with the swagger bootstrap inline.

const SWAGGER_VERSION = "5.17.14";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DDMediStock API — Reference</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css" />
  <style>body { margin: 0 } .topbar { display: none }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.addEventListener("load", function () {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
        tryItOutEnabled: true,
      });
    });
  </script>
</body>
</html>`;

export function GET() {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
